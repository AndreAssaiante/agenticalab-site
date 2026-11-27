// Cadastro pelo balão do Noah: node tests/lead-chat.mjs
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/lead.js';
const calls = [];
globalThis.fetch = async (url, options) => { calls.push([url, JSON.parse(options.body)]); return new Response('{}', { status: 200 }); };
const env = { CRM_API_URL: 'https://crm.invalid/api/v1', CRM_API_KEY: 'mock-only' };
const post = (body, e = env) => onRequestPost({ env: e, request: new Request('https://agenticalab.com.br/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
const base = { origem: 'chat-site', nome: 'Rita Lopes', email: 'Rita@Exemplo.com', whatsapp: '(11) 98888-7777', aceite: true, assunto: 'comercial', pagina: '/solucoes/<x>', utm_source: 'meta', utm_campaign: 'teste' };

// sem aceite não grava
assert.equal((await post({ ...base, aceite: false })).status, 422);
assert.equal(calls.length, 0);
// campos inválidos
assert.equal((await post({ ...base, whatsapp: '123' })).status, 422);
// robô (campo escondido) finge sucesso e não grava
assert.equal((await (await post({ ...base, empresa_site: 'x' })).json()).ok, true);
assert.equal(calls.length, 0);

const r = await post(base);
assert.equal(r.status, 200);
assert.deepEqual(await r.json(), { ok: true, salvo: true });
const contato = calls.find(c => c[0].endsWith('/contacts'))[1];
assert.equal(contato.email, 'rita@exemplo.com');
assert.equal(contato.firstName, 'Rita');
assert.equal(contato.source, 'site-chat');
assert.deepEqual(contato.tags, ['site-chat', 'lead-site', 'assunto-comercial']);
assert.equal(contato.fields.chat_utm_source, 'meta');
assert.equal(contato.fields.chat_pagina, '/solucoes/x');
assert.match(contato.fields.chat_aceite, /^\d{4}-\d\d-\d\dT/);
const negocio = calls.find(c => c[0].endsWith('/deals'))[1];
assert.equal(negocio.title, 'Novo lead · Rita Lopes');
assert.equal(calls.find(c => c[0].endsWith('/events'))[1].name, 'chat_site');

// assunto fora da lista é ignorado
calls.length = 0;
await post({ ...base, assunto: 'qualquer' });
assert.deepEqual(calls.find(c => c[0].endsWith('/contacts'))[1].tags, ['site-chat', 'lead-site']);

// sem CRM configurado: não quebra o balão
assert.deepEqual(await (await post(base, {})).json(), { ok: true, salvo: false });
console.log('lead-chat ok');

// API de Conversões da Meta: só com token e com o "pixel" que o navegador manda depois do aceite
calls.length = 0;
const envMeta = { ...env, META_CAPI_TOKEN: 'mock-token' };
await post({ ...base, pixel: { event_id: 'abc12345-evento', fbp: 'fb.1.1.2', url: 'https://agenticalab.com.br/', info: { content_name: 'balao-noah' } } }, envMeta);
const meta = calls.find(c => c[0].includes('graph.facebook.com'));
assert.ok(meta, 'manda para a Meta');
assert.match(meta[0], /\/896432615417080\/events\?access_token=mock-token$/);
const ev = meta[1].data[0];
assert.equal(ev.event_name, 'Lead'); assert.equal(ev.event_id, 'abc12345-evento'); assert.equal(ev.action_source, 'website');
assert.match(ev.user_data.em[0], /^[0-9a-f]{64}$/); assert.notEqual(ev.user_data.em[0], 'rita@exemplo.com');
assert.equal(ev.custom_data.content_name, 'balao-noah');
// sem aceite de cookies (sem "pixel") ou sem token: nada vai para a Meta
calls.length = 0; await post(base, envMeta); assert.ok(!calls.some(c => c[0].includes('facebook')));
calls.length = 0; await post({ ...base, pixel: { event_id: 'abc12345-evento' } }); assert.ok(!calls.some(c => c[0].includes('facebook')));
console.log('meta capi ok');
