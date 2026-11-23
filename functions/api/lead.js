// Cloudflare Pages Function: POST /api/lead
// Recebe as respostas do diagnóstico e repassa ao CRM.
// Variáveis no painel do Cloudflare Pages: LEAD_WEBHOOK_URL (obrigatória para salvar) e LEAD_WEBHOOK_TOKEN (opcional, vai no header Authorization).
const FIELDS = ['area', 'negocio', 'equipe', 'tarefas', 'prazo', 'nome', 'whatsapp', 'email', 'nota', 'status', 'pagina',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return json({ ok: false, erro: 'json' }, 400); }
  if (body.empresa_site) return json({ ok: true }); // robô preencheu o campo escondido
  const lead = {}; for (const k of FIELDS) if (body[k] != null) lead[k] = Array.isArray(body[k]) ? body[k].map(String).slice(0, 4) : String(body[k]).slice(0, 300);
  if (!lead.nome || !lead.email || !lead.whatsapp) return json({ ok: false, erro: 'campos' }, 422);
  lead.recebido_em = new Date().toISOString();
  lead.origem = 'site-diagnostico';
  if (!env.LEAD_WEBHOOK_URL) { console.log('LEAD sem destino configurado', JSON.stringify(lead)); return json({ ok: true, salvo: false }); }
  const r = await fetch(env.LEAD_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json', ...(env.LEAD_WEBHOOK_TOKEN ? { authorization: `Bearer ${env.LEAD_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify(lead) });
  return json({ ok: r.ok, salvo: r.ok }, r.ok ? 200 : 502);
}
