// Balão do Noah: porta de cadastro. A conversa acontece no WhatsApp, com o SDR da casa, e tudo fica no Delegra CRM.
// 1. A pessoa escolhe o assunto (opcional) e preenche nome, e-mail, WhatsApp e o aceite.
// 2. POST /api/lead (origem "chat-site"): vira contato e negócio "Novo lead" no CRM, com página e campanha (UTMs).
// 3. O balão mostra o botão do WhatsApp com a mensagem pronta. A pessoa manda o primeiro "oi" e o SDR assume.
//    (No WhatsApp por QR code o agente só responde quem escreveu primeiro: protege o número de bloqueio.)
(() => {
  const WHATSAPP = '551151073939'; // número agenticalab (+55 11 5107-3939)
  // Uma pergunta, quatro respostas: as mesmas áreas do formulário de diagnóstico (atrair → atender e vender → operar) + "não sei".
  const ASSUNTOS = { marketing: 'Atrair mais clientes', comercial: 'Atender e vender mais rápido', operacao: 'Tirar tarefas do escritório', diagnostico: 'Ainda não sei, quero um diagnóstico' };
  const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  // guarda a campanha da primeira página da visita (a pessoa pode abrir o balão em outra página)
  const q = new URLSearchParams(location.search);
  if (UTM.some(k => q.get(k))) try { sessionStorage.setItem('al_utm', JSON.stringify(Object.fromEntries(UTM.filter(k => q.get(k)).map(k => [k, q.get(k).slice(0, 120)])))); } catch (_) {}
  const utm = () => { try { return JSON.parse(sessionStorage.getItem('al_utm') || '{}'); } catch (_) { return {}; } };

  const root = document.createElement('section'); root.className = 'vc'; root.setAttribute('aria-label', 'Conversa com o Noah');
  root.innerHTML = `<button class="vc-launch" type="button" aria-expanded="false" aria-controls="vc-panel"><img src="/assets/img/noah-chat.jpg" width="42" height="42" alt=""><span>Fale com o Noah</span></button>
    <div class="vc-panel" id="vc-panel" role="dialog" aria-label="Conversa com o Noah" hidden>
      <header class="vc-header"><img src="/assets/img/noah-chat.jpg" width="48" height="48" alt=""><div><strong>Noah</strong><span>Assistente virtual da AgenticaLab</span></div><button type="button" class="vc-close" aria-label="Fechar conversa">×</button></header>
      <div class="vc-messages"><div class="vc-thread" role="log" aria-live="polite">
        <p class="vc-bubble">Oi! Sou o Noah, assistente virtual da AgenticaLab. O que você quer resolver primeiro?</p>
        <div class="vc-topics">${Object.entries(ASSUNTOS).map(([k, v]) => `<button type="button" data-assunto="${k}">${v}</button>`).join('')}</div>
        <p class="vc-bubble">Para conversarmos, deixe seu nome, e-mail e WhatsApp. A conversa continua no WhatsApp, comigo, e você não precisa repetir nada.</p>
      </div>
      <form class="vc-contact"><label>Nome<input name="nome" autocomplete="name" required maxlength="120"></label><label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="160"></label><label>WhatsApp com DDD<input name="whatsapp" type="tel" autocomplete="tel" required maxlength="20" placeholder="(11) 90000-0000"></label><label class="vc-accept"><input name="aceite" type="checkbox" required> <span>Quero que a AgenticaLab use estes dados para falar comigo sobre o meu pedido, inclusive pelo WhatsApp. <a href="/privacidade/">Política de Privacidade</a>.</span></label><input name="empresa_site" class="vc-hp" tabindex="-1" autocomplete="off" aria-hidden="true"><p class="vc-error" role="alert" hidden></p><button type="submit">Continuar no WhatsApp</button></form></div>
      <div class="vc-done" hidden><a class="vc-wa" target="_blank" rel="noopener">Abrir o WhatsApp</a></div>
      <p class="vc-note">Não envie senhas, códigos nem dados sensíveis.</p>
    </div>`;
  document.body.append(root);

  // Na Home o balão só aparece a partir da 2ª dobra (depois de rolar uma tela inteira), pra não disputar com o topo.
  // Depois que aparece, fica. Nas outras páginas aparece direto.
  if (location.pathname === '/') {
    root.classList.add('vc-oculto');
    const mostrar = () => { if (scrollY >= innerHeight) { root.classList.remove('vc-oculto'); removeEventListener('scroll', mostrar); } };
    addEventListener('scroll', mostrar, { passive: true }); mostrar();
  }

  const launch = root.querySelector('.vc-launch'), panel = root.querySelector('.vc-panel'), log = root.querySelector('.vc-thread'), box = root.querySelector('.vc-messages');
  const form = root.querySelector('.vc-contact'), done = root.querySelector('.vc-done'), wa = root.querySelector('.vc-wa'), err = root.querySelector('.vc-error');
  let assunto = '';
  const add = (text, who = '') => { const p = document.createElement('p'); p.className = 'vc-bubble ' + who; p.textContent = text; log.append(p); box.scrollTop = box.scrollHeight; };
  const close = () => { panel.hidden = true; launch.setAttribute('aria-expanded', 'false'); launch.focus(); };
  const waLink = (nome, tema) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Oi! Sou ${nome} e acabei de me cadastrar no site da AgenticaLab${tema ? ` (${tema})` : ''}.`)}`;
  const showDone = (link, texto) => { form.hidden = true; root.querySelector('.vc-topics')?.remove(); add(texto); wa.href = link; done.hidden = false; wa.focus(); };

  launch.onclick = () => {
    panel.hidden = !panel.hidden; launch.setAttribute('aria-expanded', String(!panel.hidden));
    if (panel.hidden) return;
    let salvo = null; try { salvo = JSON.parse(sessionStorage.getItem('al_chat') || 'null'); } catch (_) {}
    if (salvo?.link && done.hidden) showDone(salvo.link, `Seu cadastro já está feito, ${salvo.nome}. É só continuar no WhatsApp.`);
    (done.hidden ? form.querySelector('[name=nome]') : wa).focus();
  };
  root.querySelector('.vc-close').onclick = close;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });

  root.querySelectorAll('[data-assunto]').forEach(b => b.onclick = () => {
    assunto = b.dataset.assunto;
    root.querySelector('.vc-topics').remove();
    add(ASSUNTOS[assunto], 'vc-user');
    add(assunto === 'diagnostico' ? 'Sem problema, a gente descobre junto. Preencha seus dados abaixo e eu continuo com você no WhatsApp.' : 'Ótimo, a gente começa por aí. Preencha seus dados abaixo e eu continuo com você no WhatsApp.');
    form.querySelector('[name=nome]').focus();
  });

  form.onsubmit = async e => {
    e.preventDefault(); err.hidden = true;
    if (!form.reportValidity()) return;
    const d = Object.fromEntries(new FormData(form));
    if (!d.nome.trim() || d.whatsapp.replace(/\D/g, '').length < 10 || !/^\S+@\S+\.\S+$/.test(d.email)) { err.textContent = 'Confira o nome, o e-mail e o WhatsApp com DDD.'; err.hidden = false; return; }
    const nome = d.nome.trim().split(/\s+/)[0].slice(0, 40), link = waLink(d.nome.trim().slice(0, 80), ASSUNTOS[assunto]);
    const btn = form.querySelector('button'); btn.disabled = true;
    const pixel = window.alPixelLead?.() || undefined; if (pixel) pixel.info = { content_name: 'balao-noah' };
    try {
      const r = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ origem: 'chat-site', nome: d.nome, email: d.email, whatsapp: d.whatsapp, aceite: form.aceite.checked, empresa_site: d.empresa_site, assunto, pagina: location.pathname, ...utm(), pixel }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok || !b.ok) throw Error(b.erro || 'envio');
      window.alPixel?.('Lead', pixel?.info, pixel?.event_id);
      try { sessionStorage.setItem('al_chat', JSON.stringify({ nome, link })); } catch (_) {}
      showDone(link, `Pronto, ${nome}! Seu cadastro foi feito. Toque no botão abaixo e envie a mensagem: eu continuo com você no WhatsApp.`);
    } catch {
      // sem o cadastro, a conversa no WhatsApp ainda cria o contato no CRM
      showDone(link, 'Não consegui concluir seu cadastro agora, mas você pode falar com a gente direto pelo WhatsApp.');
    } finally { btn.disabled = false; }
  };
})();
