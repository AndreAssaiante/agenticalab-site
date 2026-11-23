// Cloudflare Pages Function: POST /api/agendamento
// Recebe os webhooks da agenda (Cal.diy em agenda.agenticalab.com.br) e avisa o Delegra CRM.
//
// Variáveis no Cloudflare Pages (Settings → Variables and Secrets, Production):
//   CRM_API_URL, CRM_API_KEY   as mesmas do /api/lead (precisam de contacts:write e events:write)
//   CAL_WEBHOOK_SECRET         o mesmo "Secret" cadastrado no webhook da agenda (Secret)
//
// Na agenda: Settings → Developer → Webhooks → New
//   URL: https://agenticalab.com.br/api/agendamento
//   Eventos: Booking created, Booking rescheduled, Booking cancelled
//   Secret: um texto aleatório, igual ao CAL_WEBHOOK_SECRET
//
// O que acontece em cada aviso:
//   1. Contato garantido pelo e-mail de quem agendou (cria se a pessoa agendou sem passar pelo popup).
//      Só manda e-mail e nome, para não sobrescrever as respostas e tags que o /api/lead já gravou.
//   2. Evento na linha do tempo do contato (diagnostico_agendado, _remarcado ou _cancelado), que pode disparar
//      automações no CRM, como mover o negócio para "Diagnóstico agendado". Data, link do Meet e status vão no evento.
//   3. Reunião nova marcada pelo popup, com cookies aceitos: o CRM manda o "Schedule" à API de Conversões da Meta
//      com o mesmo evento_id do pixel do navegador (vem nos metadados da reunião).
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const MOMENTO = {
  BOOKING_CREATED: ['agendado', 'diagnostico_agendado'],
  BOOKING_RESCHEDULED: ['remarcado', 'diagnostico_remarcado'],
  BOOKING_CANCELLED: ['cancelado', 'diagnostico_cancelado'],
};

async function assinaturaOk(secret, raw, recebida) {
  if (!recebida) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const hex = [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== recebida.length) return false;
  let diff = 0; for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ recebida.charCodeAt(i);
  return diff === 0;
}

export async function onRequestPost({ request, env, waitUntil }) {
  const raw = await request.text();
  if (!env.CAL_WEBHOOK_SECRET) return json({ ok: false, erro: 'sem segredo configurado' }, 503);
  if (!(await assinaturaOk(env.CAL_WEBHOOK_SECRET, raw, request.headers.get('x-cal-signature-256')))) return json({ ok: false, erro: 'assinatura' }, 401);

  let b; try { b = JSON.parse(raw); } catch { return json({ ok: false, erro: 'json' }, 400); }
  const momento = MOMENTO[b.triggerEvent];
  if (!momento) return json({ ok: true, ignorado: b.triggerEvent || 'ping' }); // teste do botão "Ping" e outros eventos
  const p = b.payload || {}, quem = (p.attendees || [])[0] || {};
  const email = String(quem.email || p.responses?.email?.value || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ ok: false, erro: 'sem e-mail' }, 422);
  const nome = String(quem.name || p.responses?.name?.value || '').trim();
  const [status, evento] = momento;
  const dados = {
    agenda_status: status,
    agenda_data: p.startTime || '',
    agenda_fim: p.endTime || '',
    agenda_link: p.metadata?.videoCallUrl || p.videoCallData?.url || (typeof p.location === 'string' && p.location.startsWith('http') ? p.location : ''),
    agenda_titulo: String(p.title || '').slice(0, 160),
    agenda_id: p.uid || '',
    agenda_origem: p.metadata?.origem || '',
    agenda_motivo: String(p.cancellationReason || '').slice(0, 300),
  };
  for (const k of Object.keys(dados)) if (!dados[k]) delete dados[k];

  if (!env.CRM_API_URL || !env.CRM_API_KEY) { console.log('AGENDAMENTO sem CRM configurado', JSON.stringify({ email, nome, ...dados })); return json({ ok: true, salvo: false }); }
  const api = (path, body) => fetch(env.CRM_API_URL.replace(/\/$/, '') + path, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CRM_API_KEY}` }, body: JSON.stringify(body) });

  const [firstName, ...resto] = nome.split(/\s+/);
  const c = await api('/contacts', { email, firstName: firstName || undefined, lastName: resto.join(' ') || undefined });
  if (!c.ok) { console.log('CRM contato falhou', c.status, await c.text()); return json({ ok: false }, 502); }
  const e = await api('/events', { email, name: evento, data: dados });
  if (!e.ok) console.log('CRM evento falhou', e.status, await e.text());

  const m = p.metadata || {}, eventId = String(m.evento_id || '');
  if (b.triggerEvent === 'BOOKING_CREATED' && m.consentimento === '1' && /^agenda-[\w-]{8,80}$/.test(eventId)) {
    const tel = String(quem.phoneNumber || p.responses?.attendeePhoneNumber?.value || '');
    const conv = api('/conversions', {
      event: 'Schedule', eventId, email, firstName: firstName || undefined, lastName: resto.join(' ') || undefined, phone: tel || undefined,
      fbp: typeof m.fbp === 'string' && m.fbp ? m.fbp.slice(0, 200) : undefined, fbc: typeof m.fbc === 'string' && m.fbc ? m.fbc.slice(0, 500) : undefined,
      sourceUrl: new URL(request.url).origin + '/',
    }).then(async r => { const t = await r.text(); if (!r.ok || !t.includes('"sent":true')) console.log('API de Conversões não enviou', r.status, t.slice(0, 300)); })
      .catch(err => console.log('API de Conversões erro', String(err)));
    if (waitUntil) waitUntil(conv); else await conv;
  }
  return json({ ok: true, salvo: true });
}
