(() => {
  const root = document.createElement('section'); root.className = 'vc'; root.setAttribute('aria-label', 'Conversa com o Noah');
  root.innerHTML = `<button class="vc-launch" type="button" aria-expanded="false" aria-controls="vc-panel"><img src="/assets/img/vitoria.jpg" width="42" height="42" alt=""><span>Fale com o Noah</span></button>
    <div class="vc-panel" id="vc-panel" role="dialog" aria-label="Conversa com o Noah" hidden>
      <header class="vc-header"><img src="/assets/img/vitoria.jpg" width="48" height="48" alt=""><div><strong>Noah</strong><span>Assistente virtual da AgenticaLab</span></div><button type="button" class="vc-close" aria-label="Fechar conversa">×</button></header>
      <div class="vc-messages" role="log" aria-live="polite"><p class="vc-bubble">Oi! Sou o Noah, assistente virtual da AgenticaLab. Qual tarefa repetitiva mais toma seu tempo hoje? Posso explicar nossas soluções e te ajudar a pedir um diagnóstico gratuito.<br><br>Não envie senhas, códigos nem dados sensíveis por aqui.</p></div>
      <div class="vc-actions"><button type="button" class="vc-diagnostico">Quero um diagnóstico gratuito</button><button type="button" class="vc-contact-toggle" hidden>Deixar meu contato</button></div>
      <form class="vc-contact" hidden><p>Para responder ao seu pedido de diagnóstico, precisamos destes dados. Não serão usados para ofertas sem sua autorização. <a href="/privacidade/">Política de Privacidade</a>.</p><label>Nome<input name="nome" autocomplete="name" required maxlength="120"></label><label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="160"></label><label>Telefone com DDD<input name="whatsapp" type="tel" autocomplete="tel" required maxlength="20"></label><label class="vc-accept"><input name="aceite" type="checkbox" required> Quero que a AgenticaLab use estes dados para responder ao meu pedido de diagnóstico.</label><input name="empresa_site" class="vc-hp" tabindex="-1" autocomplete="off" aria-hidden="true"><button type="submit">Pedir diagnóstico</button></form>
      <form class="vc-compose"><label class="vc-attach" title="Anexar print à próxima mensagem"><span aria-hidden="true">⌁</span><span class="vc-sr">Anexar print</span><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Anexar print"></label><label class="vc-sr" for="vc-input">Escreva sua dúvida</label><textarea id="vc-input" name="mensagem" placeholder="Escreva a dúvida" maxlength="700" rows="2" required></textarea><input name="empresa_site" class="vc-hp" tabindex="-1" autocomplete="off" aria-hidden="true"><button type="submit">Enviar</button></form>
      <p class="vc-note">O print será enviado ao provedor de IA com sua próxima mensagem. Antes de anexar, cubra nomes, telefones, senhas, códigos e dados de terceiros. PNG, JPEG ou WebP, até 1 MB. Sem o print, descreva o erro sem dados pessoais.</p><p class="vc-file" role="status"></p>
    </div>`;
  document.body.append(root);
  const launch = root.querySelector('.vc-launch'), panel = root.querySelector('.vc-panel'), log = root.querySelector('.vc-messages');
  const compose = root.querySelector('.vc-compose'), contact = root.querySelector('.vc-contact'), diagnostic = root.querySelector('.vc-diagnostico'), toggle = root.querySelector('.vc-contact-toggle');
  let available = false;
  const add = (text, who = '') => { const p = document.createElement('p'); p.className = 'vc-bubble ' + who; p.textContent = text; log.append(p); log.scrollTop = log.scrollHeight; };
  const close = () => { panel.hidden = true; launch.setAttribute('aria-expanded', 'false'); launch.focus(); };
  launch.onclick = async () => {
    panel.hidden = !panel.hidden; launch.setAttribute('aria-expanded', String(!panel.hidden));
    if (panel.hidden) return;
    root.querySelector('.vc-close').focus();
    try { const r = await fetch('/api/chat', { cache: 'no-store' }); available = !!(await r.json()).disponivel; } catch { available = false; }
    compose.hidden = !available; toggle.hidden = !available;
    if (!available && !log.querySelector('.vc-offline')) { const p = document.createElement('p'); p.className = 'vc-bubble vc-offline'; p.textContent = 'A conversa está indisponível agora. Você pode pedir seu diagnóstico pelo formulário atual.'; log.append(p); }
  };
  root.querySelector('.vc-close').onclick = close;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
  diagnostic.onclick = () => { close(); document.querySelector('a[href$="#contato"]')?.click(); };
  toggle.onclick = () => { contact.hidden = !contact.hidden; if (!contact.hidden) contact.querySelector('[name=nome]').focus(); };
  const file = root.querySelector('input[type=file]');
  const fileStatus = root.querySelector('.vc-file');
  file.onchange = () => {
    const selected = file.files?.[0];
    if (selected && (!['image/png','image/jpeg','image/webp'].includes(selected.type) || selected.size > 1024 * 1024 || !selected.size)) {
      file.value = ''; fileStatus.textContent = 'Escolha PNG, JPEG ou WebP de até 1 MB.'; return;
    }
    fileStatus.textContent = selected ? `Print selecionado: ${selected.name.slice(0, 60)}. Será enviado com a próxima mensagem. Remova dados sensíveis antes.` : '';
  };
  const readImage = selected => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = reject;
    reader.onload = () => resolve({ type: selected.type, data: String(reader.result).split(',')[1] });
    reader.readAsDataURL(selected);
  });
  compose.onsubmit = async e => {
    e.preventDefault(); if (!available || !compose.reportValidity()) return;
    const message = compose.mensagem.value.trim(); if (!message) return;
    const honeypot = compose.empresa_site.value;
    const selected = file.files?.[0];
    if (selected && (!['image/png','image/jpeg','image/webp'].includes(selected.type) || selected.size > 1024 * 1024 || !selected.size)) { fileStatus.textContent = 'Print inválido. Escolha outra imagem.'; file.value = ''; return; }
    compose.querySelector('button').disabled = true;
    try {
      const body = { acao: 'mensagem', mensagem: message, empresa_site: honeypot };
      if (selected) body.imagem = await readImage(selected);
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const b = await r.json(); if (!r.ok || !b.ok) throw Error(b.erro || 'conversa');
      add(message + (selected ? ' [print enviado]' : ''), 'vc-user'); compose.mensagem.value = '';
      file.value = ''; fileStatus.textContent = '';
      add(b.resposta);
      if (!b.restantes) { available = false; add('Esta conversa chegou ao limite. Você pode pedir o diagnóstico gratuito.'); compose.hidden = true; }
    } catch { add('Não consegui responder agora. Você pode usar o diagnóstico gratuito.'); }
    finally { compose.querySelector('button').disabled = false; }
  };
  contact.onsubmit = async e => {
    e.preventDefault(); if (!contact.reportValidity()) return;
    const b = Object.fromEntries(new FormData(contact)); b.acao = 'contato'; b.aceite = contact.aceite.checked; b.pagina = location.pathname;
    const btn = contact.querySelector('button'); btn.disabled = true;
    try { const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); const data = await r.json(); if (!r.ok || !data.salvo) throw Error(data.erro || 'envio'); add('Recebemos seu pedido de diagnóstico.'); contact.reset(); contact.hidden = true; }
    catch { add('Não consegui confirmar seu pedido. Use o diagnóstico pelo botão acima ou tente mais tarde.'); }
    finally { btn.disabled = false; }
  };
})();
