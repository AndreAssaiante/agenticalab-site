// Cloudflare Pages Function: GET /api/config
// Diz ao popup do diagnóstico qual forma de entrada do lead está ligada.
//
// Chave no Cloudflare Pages (Settings → Variables and Secrets, Production), tipo Text:
//   ENTRADA_LEAD = contato   o qualificado recebe "vamos chamar você no WhatsApp" (padrão, também quando a variável não existe)
//   ENTRADA_LEAD = agenda    o qualificado já escolhe o horário na agenda (agenda.agenticalab.com.br)
// Depois de trocar o valor, faça um novo deploy (Deployments → último → Retry deployment) para valer.
export function onRequestGet({ env }) {
  const entrada = String(env.ENTRADA_LEAD || '').trim().toLowerCase() === 'agenda' ? 'agenda' : 'contato';
  return new Response(JSON.stringify({ entrada }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
