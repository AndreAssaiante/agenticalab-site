/* Diagnóstico gratuito: popup conversacional com filtro. Abre em qualquer link para #contato ou [data-diag]. */
(() => {
  const AREAS = [
    { v: 'marketing', t: 'Marketing', p: 2 }, { v: 'comercial', t: 'Comercial e vendas', p: 2 },
    { v: 'escritorio', t: 'Escritório e operações', p: 2 }, { v: 'nao-sei', t: 'Ainda não sei', p: 1 }];
  const TAREFAS = {
    marketing: ['Posts e conteúdo', 'Anúncios', 'Páginas e textos', 'Relatórios e números'],
    comercial: ['Responder quem chega', 'Propostas e orçamentos', 'Follow-up', 'Pós-venda'],
    escritorio: ['Agenda e prazos', 'Documentos e contratos', 'Cobranças', 'Atendimento a clientes'],
    'nao-sei': ['Atendimento', 'Propostas', 'Documentos', 'Conteúdo e redes'] };
  const STEPS = [
    { k: 'area', q: 'Oi! Sou o coordenador do time de IA. Em 1 minuto entendo o seu caso. Qual área mais toma o seu tempo hoje?', o: AREAS },
    { k: 'negocio', q: 'E qual é o seu negócio?', o: [
      { v: 'advocacia', t: 'Advocacia', p: 2 }, { v: 'engenharia-arquitetura', t: 'Engenharia ou arquitetura', p: 2 },
      { v: 'agencia-viagens', t: 'Agência de viagens', p: 2 }, { v: 'clinica', t: 'Clínica ou consultório', p: 2 },
      { v: 'loja-ecommerce', t: 'Loja ou e-commerce', p: 2 }, { v: 'outro', t: 'Outro', p: 1 }] },
    { k: 'equipe', q: 'Quantas pessoas trabalham com você?', o: [
      { v: 'so-eu', t: 'Só eu', p: 1 }, { v: '2-5', t: '2 a 5', p: 3 }, { v: '6-20', t: '6 a 20', p: 3 }, { v: '20+', t: 'Mais de 20', p: 2 }] },
    { k: 'tarefas', multi: 2, q: 'O que você mais quer tirar das suas mãos? Escolha até 2.', o: s => TAREFAS[s.area || 'nao-sei'].map(t => ({ v: t, t, p: 0 })) },
    { k: 'prazo', q: 'Quando você quer começar?', o: [
      { v: 'agora', t: 'O quanto antes', p: 3 }, { v: '3-meses', t: 'Nos próximos 3 meses', p: 2 }, { v: 'pesquisando', t: 'Só estou pesquisando', p: 0 }] },
    { k: 'contato', q: 'Perfeito. Para onde mando o próximo passo?', form: true }];

  const s = {}; let i = 0, score = 0, dlg, log, foot;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function build() {
    dlg = el('dialog', 'dg');
    dlg.setAttribute('aria-label', 'Diagnóstico gratuito');
    dlg.innerHTML = `<div class="dg-box"><header class="dg-hd"><span class="dg-av" aria-hidden="true">CO</span><div><b>Coordenador · AgenticaLab</b><small>Diagnóstico gratuito · cerca de 1 minuto</small></div><button class="dg-x" type="button" aria-label="Fechar">×</button></header><div class="dg-bar"><i></i></div><div class="dg-log" aria-live="polite"></div><div class="dg-foot"></div></div>`;
    document.body.appendChild(dlg);
    log = dlg.querySelector('.dg-log'); foot = dlg.querySelector('.dg-foot');
    dlg.querySelector('.dg-x').onclick = () => dlg.close();
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  }
  const down = () => requestAnimationFrame(() => log.scrollTop = log.scrollHeight);
  const say = (html, who = 'bot') => { log.appendChild(el('div', 'dg-msg ' + who, html)); down(); };
  const progress = () => dlg.querySelector('.dg-bar i').style.width = Math.round(i / STEPS.length * 100) + '%';

  function ask() {
    progress(); foot.innerHTML = '';
    const st = STEPS[i];
    say(esc(st.q));
    if (st.form) return contactForm();
    const opts = typeof st.o === 'function' ? st.o(s) : st.o;
    const wrap = el('div', 'dg-opts'); const picked = new Set();
    opts.forEach(o => {
      const b = el('button', 'dg-opt', esc(o.t)); b.type = 'button';
      b.onclick = () => {
        if (!st.multi) return answer(st, o.v, o.t, o.p);
        picked.has(o.v) ? picked.delete(o.v) : picked.size < st.multi && picked.add(o.v);
        wrap.querySelectorAll('.dg-opt').forEach(x => x.classList.toggle('on', picked.has(x.textContent)));
        ok.disabled = !picked.size;
      };
      wrap.appendChild(b);
    });
    foot.appendChild(wrap);
    let ok; if (st.multi) { ok = el('button', 'btn dg-go', 'Continuar →'); ok.type = 'button'; ok.disabled = true; ok.onclick = () => answer(st, [...picked], [...picked].join(' e '), 1); foot.appendChild(ok); }
    wrap.querySelector('button')?.focus({ preventScroll: true }); down();
  }
  function answer(st, v, t, p) { s[st.k] = v; score += p; say(esc(t), 'me'); i++; setTimeout(ask, 350); }

  function contactForm() {
    const f = el('form', 'dg-form');
    f.innerHTML = `<label>Nome<input name="nome" autocomplete="name" required></label>
      <label>WhatsApp<input name="whatsapp" type="tel" autocomplete="tel" placeholder="(11) 90000-0000" required></label>
      <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
      <input name="empresa_site" class="dg-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn" type="submit">Ver meu próximo passo →</button><p class="dg-err" hidden></p>`;
    foot.appendChild(f); f.nome.focus({ preventScroll: true }); down();
    f.onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const err = f.querySelector('.dg-err');
      if (!d.nome.trim() || d.whatsapp.replace(/\D/g, '').length < 10 || !/^\S+@\S+\.\S+$/.test(d.email)) { err.textContent = 'Confira nome, WhatsApp com DDD e e-mail.'; err.hidden = false; return; }
      const qualificado = s.prazo !== 'pesquisando' && score >= 7;
      const q = new URLSearchParams(location.search), utm = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => q.get(k) && (utm[k] = q.get(k)));
      const payload = { ...s, ...d, nota: score, status: qualificado ? 'qualificado' : 'nutrir', pagina: location.pathname, ...utm };
      f.querySelector('button').disabled = true;
      try { await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); } catch (_) {}
      i = STEPS.length; progress(); foot.innerHTML = '';
      say(esc(d.nome.split(' ')[0]), 'me');
      say(qualificado
        ? '<b>Seu caso tem tudo a ver com o que fazemos.</b> Vamos chamar você no WhatsApp em até 1 dia útil para marcar a conversa de 30 minutos.'
        : '<b>Obrigado!</b> Vamos mandar no seu e-mail exemplos de como um time de IA assume essas tarefas. Quando fizer sentido, é só responder.');
      const c = el('button', 'btn dg-go', 'Fechar'); c.type = 'button'; c.onclick = () => dlg.close(); foot.appendChild(c); down();
    };
  }

  function open(e) {
    e?.preventDefault();
    if (!dlg) build();
    if (!dlg.open) { log.innerHTML = ''; Object.keys(s).forEach(k => delete s[k]); i = 0; score = 0; dlg.showModal(); ask(); }
  }
  document.addEventListener('click', e => { const a = e.target.closest('a[href$="#contato"],[data-diag]'); if (a) open(e); });
  if (location.hash === '#diagnostico') open();
})();
