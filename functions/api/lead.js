// Cloudflare Pages Function: POST /api/lead
// Recebe as respostas do diagnóstico e grava no Delegra CRM (crm.agenticalab.com.br) pela API v1.
//
// Variáveis no Cloudflare Pages (Settings → Variables and Secrets, Production):
//   CRM_API_URL      ex.: https://crm.agenticalab.com.br/api/v1
//   CRM_API_KEY      chave de Integração da conta AgenticaLab, escopos: contacts:write, deals:write, events:write (Secret)
//   CRM_PIPELINE_ID  opcional: funil onde entram os qualificados (sem ele, usa o funil padrão)
//   CRM_STAGE_ID     opcional: etapa de entrada dos qualificados (sem ela, a primeira etapa)
//
// O que acontece em cada envio:
//   1. Contato criado ou atualizado pelo e-mail (sem duplicar), com as respostas em campos e tags.
//   2. Se veio "qualificado" (ou do Form Simples): negócio no funil.
//   Tags pelo formulário usado: form-simples, form-qualificacao ou form-qualificacao-agenda.
//   3. Evento "diagnostico_site" na linha do tempo, que pode disparar automações (ex.: avisar a equipe).
//   4. Se a pessoa aceitou os cookies e a API de Conversões está ligada no CRM: o CRM manda o "Lead" à Meta
//      com o mesmo evento_id do pixel do navegador (deduplicação). O token da Meta fica só no CRM.
const ANSWERS = ['negocio', 'papel', 'faturamento', 'area', 'tarefas', 'prazo', 'nota', 'status', 'entrada', 'pagina',
  'instagram', 'site', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const clip = v => Array.isArray(v) ? v.map(x => String(x).slice(0, 80)).slice(0, 4) : String(v).slice(0, 200);

export async function onRequestPost({ request, env, waitUntil }) {
  let b; try { b = await request.json(); } catch { return json({ ok: false, erro: 'json' }, 400); }
  if (b.empresa_site) return json({ ok: true }); // robô preencheu o campo escondido
  const nome = String(b.nome || '').trim().slice(0, 120), email = String(b.email || '').trim().toLowerCase().slice(0, 160);
  const whatsapp = String(b.whatsapp || '').replace(/[^\d+]/g, '').slice(0, 20);
  if (!nome || !/^\S+@\S+\.\S+$/.test(email) || whatsapp.replace(/\D/g, '').length < 10) return json({ ok: false, erro: 'campos' }, 422);

  const respostas = {}; for (const k of ANSWERS) if (b[k] != null && b[k] !== '') respostas[k] = clip(b[k]);
  const qualificado = respostas.status === 'qualificado';

  if (!env.CRM_API_URL || !env.CRM_API_KEY) { console.log('LEAD sem CRM configurado', JSON.stringify({ nome, email, whatsapp, ...respostas })); return json({ ok: true, salvo: false }); }
  const api = (path, body) => fetch(env.CRM_API_URL.replace(/\/$/, '') + path, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CRM_API_KEY}` }, body: JSON.stringify(body) });

  const [firstName, ...resto] = nome.split(/\s+/);
  const simples = respostas.status === 'simples';
  const FORM = { simples: 'form-simples', contato: 'form-qualificacao', agenda: 'form-qualificacao-agenda' };
  const tags = ['site-diagnostico', FORM[respostas.entrada] || 'form-qualificacao'];
  if (!simples) tags.push(qualificado ? 'lead-qualificado' : 'lead-nutrir');
  if (respostas.area) tags.push(`area-${respostas.area}`);
  if (respostas.negocio) tags.push(`segmento-${respostas.negocio}`);

  const c = await api('/contacts', { email, firstName, lastName: resto.join(' ') || undefined, phone: whatsapp, source: 'site-diagnostico', fields: Object.fromEntries(Object.entries(respostas).map(([k, v]) => [`diagnostico_${k}`, Array.isArray(v) ? v.join(', ') : v])), tags });
  if (!c.ok) { console.log('CRM contato falhou', c.status, await c.text()); return json({ ok: false, salvo: false }, 502); }

  if (qualificado || simples) { // Form Simples: todo mundo vai para o funil, a equipe liga para todos
    const notes = Object.entries(respostas).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
    const d = await api('/deals', { title: `${simples ? 'Contato' : 'Diagnóstico'} · ${nome}`, contactEmail: email, pipelineId: env.CRM_PIPELINE_ID || undefined, stageId: env.CRM_STAGE_ID || undefined, tagNames: ['site-diagnostico'], notes });
    if (!d.ok) console.log('CRM negócio falhou', d.status, await d.text());
  }
  const e = await api('/events', { email, name: 'diagnostico_site', data: respostas });
  if (!e.ok) console.log('CRM evento falhou', e.status, await e.text());

  const eventId = String(b.evento_id || '');
  if (b.consentimento === true && /^lead-[\w-]{8,80}$/.test(eventId)) {
    const origem = new URL(request.url).origin, pagina = String(respostas.pagina || '/');
    const conv = api('/conversions', {
      event: 'Lead', eventId, email, phone: whatsapp, firstName, lastName: resto.join(' ') || undefined,
      ip: request.headers.get('cf-connecting-ip') || undefined, userAgent: (request.headers.get('user-agent') || '').slice(0, 500) || undefined,
      fbp: typeof b.fbp === 'string' && b.fbp ? b.fbp.slice(0, 200) : undefined, fbc: typeof b.fbc === 'string' && b.fbc ? b.fbc.slice(0, 500) : undefined,
      sourceUrl: pagina.startsWith('/') ? origem + pagina : undefined,
      customData: { lead_status: String(respostas.status || ''), formulario: tags[1] },
    }).then(async r => { const t = await r.text(); if (!r.ok || !t.includes('"sent":true')) console.log('API de Conversões não enviou', r.status, t.slice(0, 300)); })
      .catch(err => console.log('API de Conversões erro', String(err)));
    if (waitUntil) waitUntil(conv); else await conv;
  }
  return json({ ok: true, salvo: true });
}
