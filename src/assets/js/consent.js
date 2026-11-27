/* Aviso de cookies + Pixel da Meta ("Pixel - AgenticaLab").
   O pixel só carrega depois que a pessoa toca em "Aceitar". Quem recusa não é rastreado.
   A escolha fica guardada neste navegador e pode ser trocada no rodapé ("Preferências de cookies").
   Eventos: PageView em toda página; "Lead" quando um cadastro é enviado (diagnóstico ou balão do Noah);
   "Contact" quando a pessoa toca num botão que abre o WhatsApp. Os outros scripts chamam window.alPixel(evento, dados).
   O "Lead" também vai pelo servidor (API de Conversões, functions/api/lead.js) com o mesmo event_id: a Meta deduplica. */
(() => {
  const PIXEL_ID = '896432615417080';
  const CHAVE = 'al_cookies'; // 'sim' ou 'nao'
  const ler = () => { try { return localStorage.getItem(CHAVE); } catch (_) { return null; } };
  const gravar = v => { try { localStorage.setItem(CHAVE, v); } catch (_) {} };
  let ligado = false;

  function ligarPixel() {
    if (ligado) return; ligado = true;
    /* código oficial da Meta */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');
  }
  window.alPixel = (evento, dados, eventID) => { if (ligado && window.fbq) fbq('track', evento, dados || {}, eventID ? { eventID } : undefined); };
  // Para a API de Conversões (servidor): mesmo event_id do navegador, assim a Meta conta o cadastro uma vez só (deduplicação).
  // Só existe se a pessoa aceitou os cookies; sem aceite, o servidor também não manda nada.
  const cookie = n => (document.cookie.match('(^|;)\\s*' + n + '=([^;]*)') || [])[2];
  window.alPixelLead = () => {
    if (!ligado) return null;
    const id = (crypto.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2));
    let fbc = cookie('_fbc'); const clid = new URLSearchParams(location.search).get('fbclid');
    if (!fbc && clid) fbc = `fb.1.${Date.now()}.${clid}`;
    return { event_id: id, fbp: cookie('_fbp'), fbc, url: location.href.split('#')[0] };
  };

  // Toque em qualquer link do WhatsApp do site (botão prioritário, balão do Noah) = Contact
  document.addEventListener('click', e => { const a = e.target.closest?.('a[href*="wa.me/"]'); if (a) window.alPixel('Contact'); });

  function aviso() {
    if (document.querySelector('.ck')) return;
    const el = document.createElement('section'); el.className = 'ck'; el.setAttribute('aria-label', 'Aviso de cookies');
    el.innerHTML = `<p>Usamos cookies da Meta para medir de onde vêm os cadastros e melhorar nossos anúncios. Você escolhe.
      <a href="/privacidade/#cookies">Saiba mais</a>.</p>
      <div class="ck-acoes"><button type="button" class="ck-nao">Recusar</button><button type="button" class="ck-sim">Aceitar</button></div>`;
    document.body.append(el);
    el.querySelector('.ck-sim').onclick = () => { gravar('sim'); el.remove(); ligarPixel(); };
    el.querySelector('.ck-nao').onclick = () => { gravar('nao'); el.remove(); };
  }

  const escolha = ler();
  if (escolha === 'sim') ligarPixel(); else if (escolha !== 'nao') aviso();

  // Rodapé: "Preferências de cookies" reabre o aviso (quem tinha aceitado e recusa agora deixa de ser rastreado ao recarregar)
  document.addEventListener('click', e => { if (e.target.closest?.('[data-cookies]')) { e.preventDefault(); aviso(); } });
})();
