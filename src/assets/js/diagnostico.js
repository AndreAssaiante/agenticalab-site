/* Popup de entrada do lead. Abre em qualquer link para #contato ou [data-diag].
   Três formulários, escolhidos no CRM (Configurações → Site), lidos em /api/config:
   - "simples": Form Simples, só nome, WhatsApp e e-mail.
   - "contato" (padrão): Form Qualificação; a equipe pode entrar em contato pelo e-mail informado.
   - "agenda": Form Qualificação + Agenda; o qualificado já escolhe o horário (Cal.diy), com nome e e-mail preenchidos.
   Para testar um modo sem mexer no CRM: ?entrada=simples, ?entrada=contato ou ?entrada=agenda no endereço da página. */
(() => {
  const AGENDA = { origin: 'https://agenda.agenticalab.com.br', link: 'agenticalab/diagnostico-gratis' };
  // Atendimento prioritário: quem fatura a partir de R$ 50 mil vê, no fim, o botão do WhatsApp com a mensagem pronta.
  // A pessoa manda o primeiro "oi" (no WhatsApp por QR code o agente só responde quem escreveu primeiro: protege o número).
  const WHATSAPP = '551151073939'; // número agenticalab (+55 11 5107-3939), o mesmo do balão do Noah
  const PRIORIDADE = ['50-100k', '100-300k', '300-500k', '500k+'];
  const TAREFAS = {
    marketing: ['Posts e conteúdo', 'Anúncios', 'Páginas e textos', 'Relatórios e números'],
    comercial: ['Responder quem chega', 'Propostas e orçamentos', 'Follow-up', 'Pós-venda'],
    escritorio: ['Agenda e prazos', 'Documentos e contratos', 'Cobranças', 'Atendimento a clientes'],
    'nao-sei': ['Atendimento', 'Propostas', 'Documentos', 'Conteúdo e redes'] };
  const FASES = ['Empresa', 'Necessidade', 'Momento', 'Contato'];
  const STEPS = [
    { k: 'negocio', f: 0, tag: 'Segmento', q: 'Qual é o seu negócio?', sub: 'Escolha a opção que mais se parece com a sua empresa.', o: [
      ['advocacia', 'Advocacia', 2], ['engenharia-arquitetura', 'Engenharia ou arquitetura', 2], ['agencia-viagens', 'Agência de viagens', 2],
      ['clinica', 'Clínica ou consultório', 2], ['loja-ecommerce', 'Loja ou e-commerce', 2], ['outro', 'Outro', 1]] },
    { k: 'papel', f: 0, tag: 'Perfil', q: 'Qual é o seu papel no negócio?', sub: 'Assim a conversa já começa com a pessoa certa.', o: [
      ['dono', 'Sócio ou dono', 3], ['gestor', 'Gerente ou líder', 2], ['autonomo', 'Autônomo', 2], ['colaborador', 'Colaborador', 0]] },
    { k: 'faturamento', f: 0, tag: 'Faturamento', q: 'Quanto o negócio fatura por mês, em média?', sub: 'Serve só para indicar o tamanho certo de solução.', cols: 1, o: [
      ['ate-30k', 'Até R$ 30 mil', 0], ['30-50k', 'R$ 30 mil a R$ 50 mil', 2], ['50-100k', 'R$ 50 mil a R$ 100 mil', 3],
      ['100-300k', 'R$ 100 mil a R$ 300 mil', 3], ['300-500k', 'R$ 300 mil a R$ 500 mil', 3], ['500k+', 'Acima de R$ 500 mil', 3]] },
    { k: 'area', f: 1, tag: 'Área', q: 'Qual área mais toma o seu tempo hoje?', sub: 'É por ela que o seu time de IA começa.', o: [
      ['marketing', 'Marketing', 2], ['comercial', 'Comercial e vendas', 2], ['escritorio', 'Escritório e operações', 2], ['nao-sei', 'Ainda não sei', 1]] },
    { k: 'tarefas', f: 1, tag: 'Tarefas', multi: 2, q: 'O que você mais quer tirar das suas mãos?', sub: 'Escolha até 2.', o: s => TAREFAS[s.area || 'nao-sei'].map(t => [t, t, 0]) },
    { k: 'prazo', f: 2, tag: 'Momento', q: 'Quando você quer começar?', sub: 'Sem pressão: é só para organizarmos a agenda.', cols: 1, o: [
      ['agora', 'O quanto antes', 3], ['3-meses', 'Nos próximos 3 meses', 2], ['pesquisando', 'Só estou pesquisando', 0]] },
    { k: 'contato', f: 3, tag: 'Contato', q: 'Para onde mandamos o próximo passo?', form: true }];

  const MODOS = ['simples', 'contato', 'agenda'];
  const s = {}, pts = {}; let i = 0, dlg, body, modo = 'contato', steps = STEPS;
  const forcado = new URLSearchParams(location.search).get('entrada');
  const modoPronto = fetch('/api/config?' + new URLSearchParams({ p: location.pathname }), { cache: 'no-store' }).then(r => r.json()).catch(() => ({}))
    .then(c => { if (c.agendaLink) AGENDA.link = c.agendaLink; modo = MODOS.includes(forcado) ? forcado : MODOS.includes(c.entrada) ? c.entrada : 'contato'; });
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const score = () => Object.values(pts).reduce((a, b) => a + b, 0);

  function build() {
    dlg = document.createElement('dialog'); dlg.className = 'dg'; dlg.setAttribute('aria-label', 'Diagnóstico gratuito');
    dlg.innerHTML = `<div class="dg-box">
      <header class="dg-hd">
        <img class="dg-av" src="/assets/img/noah-chat.jpg" alt="Noah, assistente virtual da AgenticaLab" width="48" height="48">
        <div class="dg-who"><b>Noah</b><small><i class="dg-on"></i>Assistente virtual · AgenticaLab</small></div>
        <button class="dg-x" type="button" aria-label="Fechar">×</button>
        <ol class="dg-steps">${FASES.map((f, n) => `<li><span>${n + 1}</span>${f}</li>`).join('')}</ol>
        <div class="dg-meta"><span class="dg-count"></span><span>cerca de 1 minuto</span></div>
      </header>
      <div class="dg-body" aria-live="polite"></div>
      <footer class="dg-ft"><span>Sem compromisso</span><span>Nossa equipe recebe seu pedido</span><span>Seus dados ficam só com a gente</span></footer>
    </div>`;
    document.body.appendChild(dlg);
    body = dlg.querySelector('.dg-body');
    dlg.querySelector('.dg-x').onclick = () => dlg.close();
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  }

  function chrome(st) {
    dlg.classList.toggle('dg-simples', modo === 'simples');
    const f = st ? st.f : FASES.length;
    dlg.querySelectorAll('.dg-steps li').forEach((li, n) => { li.className = n < f ? 'done' : n === f ? 'on' : ''; });
    dlg.style.setProperty('--prog', (st ? (i + 1) / steps.length : 1) * 100 + '%');
    dlg.querySelector('.dg-count').textContent = st ? (steps.length > 1 ? `Passo ${i + 1} de ${steps.length}` : '') : 'Concluído';
  }
  const head = st => `<p class="dg-kick">${steps.length > 1 ? `Passo ${i + 1} de ${steps.length} · ` : ''}${st.tag}</p><h3 class="dg-q">${esc(st.q)}</h3>${st.sub ? `<p class="dg-sub">${esc(st.sub)}</p>` : ''}`;
  const back = () => i > 0 ? `<button type="button" class="dg-back">← Voltar</button>` : '';

  function render() {
    const st = steps[i]; chrome(st);
    if (st.form) return contactForm(st);
    const opts = typeof st.o === 'function' ? st.o(s) : st.o;
    const sel = new Set(st.multi ? (s[st.k] || []) : [s[st.k]]);
    body.innerHTML = head(st) + `<div class="dg-opts${st.cols === 1 ? ' one' : ''}" role="${st.multi ? 'group' : 'radiogroup'}">` +
      opts.map(([v, t]) => `<button type="button" class="dg-opt${sel.has(v) ? ' on' : ''}${st.multi ? ' multi' : ''}" data-v="${esc(v)}" aria-pressed="${sel.has(v)}"><i></i>${esc(t)}</button>`).join('') +
      `</div><div class="dg-nav">${back()}${st.multi ? `<button type="button" class="btn dg-go"${sel.size && s[st.k] ? '' : ' disabled'}>Continuar →</button>` : ''}</div>`;
    body.querySelectorAll('.dg-opt').forEach(b => b.onclick = () => {
      const v = b.dataset.v, o = opts.find(x => x[0] === v);
      if (!st.multi) { s[st.k] = v; pts[st.k] = o[2]; b.classList.add('on'); return setTimeout(next, 180); }
      const cur = new Set(s[st.k] || []); cur.has(v) ? cur.delete(v) : cur.size < st.multi && cur.add(v);
      s[st.k] = [...cur]; pts[st.k] = cur.size ? 1 : 0;
      body.querySelectorAll('.dg-opt').forEach(x => { const on = cur.has(x.dataset.v); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      body.querySelector('.dg-go').disabled = !cur.size;
    });
    body.querySelector('.dg-go')?.addEventListener('click', next);
    body.querySelector('.dg-back')?.addEventListener('click', prev);
    body.querySelector('.dg-opt')?.focus({ preventScroll: true });
  }
  const next = () => { i++; if (steps[i]?.k === 'tarefas' && s.tarefas && !s.tarefas.every(t => TAREFAS[s.area || 'nao-sei'].includes(t))) delete s.tarefas; render(); body.scrollTop = 0; };
  const prev = () => { i--; render(); };

  function contactForm(st) {
    body.innerHTML = head(st) + `<div class="dg-note"><b>O que acontece agora:</b> ${modo === 'agenda' ? 'se o seu caso tiver a ver com o que fazemos, você já escolhe o horário da conversa de 30 minutos na tela seguinte.' : 'nossa equipe recebe suas respostas e pode entrar em contato pelo e-mail informado para combinar o próximo passo.'} Sem spam.</div>
      <form class="dg-form" novalidate>
        <label>Nome<input name="nome" autocomplete="name" placeholder="Seu nome" required value="${esc(s.nome || '')}"></label>
        <label>Telefone com DDD<input name="whatsapp" type="tel" autocomplete="tel" placeholder="(11) 90000-0000" required value="${esc(s.whatsapp || '')}"></label>
        <label>E-mail<input name="email" type="email" autocomplete="email" placeholder="voce@empresa.com.br" required value="${esc(s.email || '')}"></label>
        ${modo === 'simples' ? '' : `<div class="dg-row">
          <label><span>Instagram <em>(opcional)</em></span><input name="instagram" autocomplete="off" placeholder="@suaempresa" value="${esc(s.instagram || '')}"></label>
          <label><span>Site <em>(opcional)</em></span><input name="site" type="url" inputmode="url" autocomplete="url" placeholder="suaempresa.com.br" value="${esc(s.site || '')}"></label>
        </div>`}
        <input name="empresa_site" class="dg-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="dg-err" hidden></p>
        <div class="dg-nav">${back()}<button class="btn dg-go" type="submit">Enviar →</button></div>
      </form>`;
    const f = body.querySelector('form');
    body.querySelector('.dg-back')?.addEventListener('click', () => { Object.assign(s, Object.fromEntries(new FormData(f))); prev(); });
    f.nome.focus({ preventScroll: true });
    f.onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f)), err = f.querySelector('.dg-err');
      if (!d.nome.trim() || d.whatsapp.replace(/\D/g, '').length < 10 || !/^\S+@\S+\.\S+$/.test(d.email)) { err.textContent = 'Confira o nome, o telefone com DDD e o e-mail.'; err.hidden = false; return; }
      const simples = modo === 'simples', nota = score(), qualificado = !simples && s.prazo !== 'pesquisando' && s.faturamento !== 'ate-30k' && nota >= 9;
      const q = new URLSearchParams(location.search), utm = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => q.get(k) && (utm[k] = q.get(k)));
      const { nome: _n, whatsapp: _w, email: _e, instagram: _i, site: _s, ...resp } = s;
      const btn = f.querySelector('.dg-go'); btn.disabled = true; btn.textContent = 'Enviando…';
      const pixel = window.alPixelLead?.() || undefined, leadInfo = { content_name: 'diagnostico', status: simples ? 'simples' : qualificado ? 'qualificado' : 'nutrir' };
      if (pixel) pixel.info = leadInfo;
      try { await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...resp, ...d, ...(simples ? { status: 'simples' } : { nota, status: qualificado ? 'qualificado' : 'nutrir' }), entrada: modo, pagina: location.pathname, ...utm, pixel }) }); } catch (_) {}
      window.alPixel?.('Lead', leadInfo, pixel?.event_id);
      done(d.nome.split(' ')[0], qualificado || simples, d, !simples && PRIORIDADE.includes(s.faturamento));
    };
  }

  function done(nome, ok, d, prioridade) {
    chrome(null);
    const comAgenda = ok && modo === 'agenda';
    const url = `${AGENDA.origin}/${AGENDA.link}?` + new URLSearchParams({ name: d.nome.trim(), email: d.email.trim() });
    const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Oi! Sou ${d.nome.trim().slice(0, 80)}, acabei de fazer o diagnóstico no site da AgenticaLab e quero o atendimento prioritário.`)}`;
    const vip = prioridade ? `<div class="dg-vip"><p class="dg-vip-tag">Atendimento prioritário</p>
      <p>${comAgenda ? 'Prefere adiantar a conversa? Pelo tamanho do seu negócio, você pode' : 'Pelo tamanho do seu negócio, você pode'} pular a fila e falar agora com o Noah, nosso assistente, no WhatsApp.</p>
      <a class="btn dg-wa" href="${esc(wa)}" target="_blank" rel="noopener">Quero atendimento prioritário no WhatsApp</a>
      <small>Abre o WhatsApp com a mensagem pronta. É só tocar em enviar.</small></div>` : '';
    body.innerHTML = `<div class="dg-done"><span class="dg-check" aria-hidden="true">✓</span>
      <h3 class="dg-q">${modo === 'simples' ? `Recebemos seu contato, ${esc(nome)}.` : ok ? `Tudo certo, ${esc(nome)}. Seu caso tem tudo a ver com o que fazemos.` : `Obrigado, ${esc(nome)}!`}</h3>
      <p class="dg-sub">${comAgenda ? 'Escolha agora o melhor horário para a conversa de 30 minutos, por Google Meet. A confirmação chega no seu e-mail.' : ok ? 'Recebemos suas respostas. Se for preciso conversar, nossa equipe pode entrar em contato pelo e-mail informado para combinar o próximo passo.' : 'Recebemos suas respostas. Se houver um próximo passo, nossa equipe pode entrar em contato pelo e-mail informado.'}</p>
      ${comAgenda ? `<div class="dg-cal" id="dg-cal"><p class="dg-cal-load">Carregando a agenda…</p></div>
      <p class="dg-cal-alt">A agenda não abriu? <a href="${esc(url)}" target="_blank" rel="noopener">Abra numa nova aba</a> para escolher o horário.</p>${vip}` : vip || '<button type="button" class="btn dg-go">Fechar</button>'}</div>`;
    body.querySelector('.dg-go')?.addEventListener('click', () => dlg.close());
    if (comAgenda) { dlg.classList.add('dg-wide'); agenda(d); }
  }

  // Agenda embutida: script oficial do próprio Cal.diy, com as cores e o acabamento do site (tema escuro da marca).
  // Também usada pela página /agendar/ (window.agenticaAgenda.montar).
  const TEMA = { // variáveis do Cal.diy → paleta do brandbook (chumbo, painel, roxo, laranja, off-white)
    '--cal-bg': '#18181F', '--cal-bg-muted': '#1E1E25', '--cal-bg-subtle': '#22212B', '--cal-bg-emphasis': '#34323F',
    '--cal-bg-inverted': '#F4F2F7', '--cal-border': '#34323F', '--cal-border-subtle': '#2A2833', '--cal-border-emphasis': '#4A4757',
    '--cal-border-booker': '#34323F', '--cal-text': '#F4F2F7', '--cal-text-emphasis': '#FFFFFF', '--cal-text-subtle': '#B7AAC4',
    '--cal-text-muted': '#8E849C', '--cal-text-inverted': '#1E1E25', '--cal-brand': '#FF6B2C', '--cal-brand-emphasis': '#FF8F5A',
    '--cal-brand-text': '#1E1E25', '--cal-brand-subtle': '#3A2A2A',
    '--cal-radius': '0px', '--cal-radius-sm': '0px', '--cal-radius-md': '0px', '--cal-radius-lg': '0px', '--cal-radius-xl': '0px', '--cal-radius-2xl': '0px', '--cal-radius-full': '0px' };
  function carregarCal() {
    (function (C, A, L) { const p = (a, ar) => a.q.push(ar), doc = C.document; C.Cal = C.Cal || function () { const cal = C.Cal, ar = arguments;
      if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; doc.head.appendChild(doc.createElement('script')).src = A; cal.loaded = true; }
      if (ar[0] === L) { const api = function () { p(api, arguments); }, ns = ar[1]; api.q = api.q || [];
        if (typeof ns === 'string') { cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ['initNamespace', ns]); } else p(cal, ar); return; }
      p(cal, ar); }; })(window, AGENDA.origin + '/embed/embed.js', 'init');
  }
  // Monta a agenda num elemento. ns: nome único por agenda na página; extra: nome/e-mail/origem; aoMarcar: callback.
  function montar(sel, ns, extra = {}, aoMarcar) {
    carregarCal();
    Cal('init', ns, { origin: AGENDA.origin });
    Cal.ns[ns]('inline', { elementOrSelector: sel, calLink: AGENDA.link, config: { layout: 'month_view', theme: 'dark', ...extra } });
    Cal.ns[ns]('ui', { theme: 'dark', hideEventTypeDetails: false, layout: 'month_view', cssVarsPerTheme: { dark: TEMA, light: TEMA }, styles: { branding: { brandColor: '#FF6B2C' } } });
    Cal.ns[ns]('on', { action: 'linkReady', callback: () => { const l = document.querySelector(sel + ' .dg-cal-load'); if (l) l.remove(); } });
    if (aoMarcar) Cal.ns[ns]('on', { action: 'bookingSuccessful', callback: aoMarcar });
  }
  window.agenticaAgenda = { montar, pronto: () => modoPronto.then(() => AGENDA) };

  function agenda(d) {
    montar('#dg-cal', 'dg', { name: d.nome.trim(), email: d.email.trim(), 'metadata[origem]': 'site-diagnostico' },
      () => { const alt = body.querySelector('.dg-cal-alt'); if (alt) alt.textContent = 'Reunião marcada. O convite com o link do Google Meet foi para o seu e-mail.'; });
  }

  async function open(e) {
    e?.preventDefault();
    if (!dlg) build();
    if (dlg.open) return;
    await Promise.race([modoPronto, new Promise(r => setTimeout(r, 1500))]); // a escolha do CRM normalmente já chegou
    steps = modo === 'simples' ? [{ ...STEPS[STEPS.length - 1], f: 0, tag: 'Fale com a gente', q: 'Deixe seu contato e falamos com você' }] : STEPS;
    dlg.classList.remove('dg-wide'); Object.keys(s).forEach(k => delete s[k]); Object.keys(pts).forEach(k => delete pts[k]); i = 0;
    // Home: o botão do Noah pode chegar com o negócio já escolhido (data-negocio); aí começa no passo 2.
    const pre = e?.target?.closest?.('[data-negocio]')?.dataset.negocio, op = pre && steps[0].k === 'negocio' && steps[0].o.find(x => x[0] === pre);
    if (op) { s.negocio = op[0]; pts.negocio = op[2]; i = 1; }
    render(); dlg.showModal();
  }
  document.addEventListener('click', e => { const a = e.target.closest('a[href$="#contato"],[data-diag]'); if (a) open(e); });
  if (location.hash === '#diagnostico') open();
})();
