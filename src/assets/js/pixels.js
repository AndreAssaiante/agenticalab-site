/* Pixels e conversões. Os IDs ficam no CRM (Integrações e API → Pixels e conversões) e chegam por /api/config.
   Instala só o que estiver preenchido lá: Google Tag Manager, Google Analytics 4, Google Ads, Pixel da Meta,
   Microsoft Clarity e Hotjar. Nenhum ID ou token fica neste arquivo.

   LGPD: com o aviso ligado no CRM, nada é carregado antes do "Aceitar". A escolha fica salva neste navegador
   e pode ser mudada pelo link "Cookies" do rodapé (qualquer elemento com data-cookies).

   Marcações (chamadas pelo popup do diagnóstico):
     alPixels.track('lead', { eventId, status, formulario })   → Meta Lead · GA4 generate_lead · Google Ads (rótulo de lead) · GTM "lead"
     alPixels.track('agendamento', { eventId })                → Meta Schedule · GA4 agendamento · Google Ads (rótulo de agendamento) · GTM "agendamento"
   O eventId é o mesmo que o servidor manda à API de Conversões da Meta: a Meta junta os dois e conta uma vez só. */
(() => {
  const CHAVE = 'al-cookies';
  window.AL_CONFIG = window.AL_CONFIG || fetch('/api/config?' + new URLSearchParams({ p: location.pathname }), { cache: 'no-store' })
    .then(r => r.json()).catch(() => ({}));

  let px = null, escolha = null, carregado = false;
  const fila = [];
  const ler = () => { try { return localStorage.getItem(CHAVE); } catch (_) { return null; } };
  const salvar = v => { try { localStorage.setItem(CHAVE, v); } catch (_) {} };
  const temAlgum = p => p && (p.gtm || p.ga4 || p.meta || p.googleAds || p.clarity || p.hotjar);
  const script = (src, attrs = {}) => { const s = document.createElement('script'); s.async = true; s.src = src; Object.assign(s, attrs); document.head.appendChild(s); };
  const cookie = n => (document.cookie.match('(?:^|; )' + n + '=([^;]*)') || [])[1] || '';

  function carregar() {
    if (carregado || !temAlgum(px)) return;
    carregado = true;
    window.dataLayer = window.dataLayer || [];
    if (px.gtm) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      script('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(px.gtm));
    }
    if (px.ga4 || px.googleAds) {
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      gtag('js', new Date());
      if (px.ga4) gtag('config', px.ga4);
      if (px.googleAds) gtag('config', px.googleAds.id);
      script('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(px.ga4 || px.googleAds.id));
    }
    if (px.meta) {
      /* código oficial do Pixel da Meta */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', px.meta);
      fbq('track', 'PageView');
    }
    if (px.clarity) {
      /* código oficial do Microsoft Clarity */
      (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y); })(window, document, 'clarity', 'script', px.clarity);
    }
    if (px.hotjar) {
      /* código oficial do Hotjar */
      window.hj = window.hj || function () { (window.hj.q = window.hj.q || []).push(arguments); };
      window._hjSettings = { hjid: Number(px.hotjar), hjsv: 6 };
      script('https://static.hotjar.com/c/hotjar-' + px.hotjar + '.js?sv=6');
    }
    fila.splice(0).forEach(([n, d]) => marcar(n, d));
  }

  function marcar(nome, d = {}) {
    const id = d.eventId;
    if (nome === 'lead') {
      const extra = { lead_status: d.status || '', formulario: d.formulario || '' };
      window.dataLayer.push({ event: 'lead', event_id: id, ...extra });
      if (px.meta) fbq('track', 'Lead', { content_name: extra.formulario, content_category: extra.lead_status }, { eventID: id });
      if (px.ga4) gtag('event', 'generate_lead', { event_id: id, ...extra });
      if (px.googleAds?.lead) gtag('event', 'conversion', { send_to: px.googleAds.id + '/' + px.googleAds.lead, transaction_id: id });
    }
    if (nome === 'agendamento') {
      window.dataLayer.push({ event: 'agendamento', event_id: id });
      if (px.meta) fbq('track', 'Schedule', {}, { eventID: id });
      if (px.ga4) gtag('event', 'agendamento', { event_id: id });
      if (px.googleAds?.agenda) gtag('event', 'conversion', { send_to: px.googleAds.id + '/' + px.googleAds.agenda, transaction_id: id });
    }
  }

  function aviso() {
    if (document.querySelector('.al-ck')) return;
    const el = document.createElement('div');
    el.className = 'al-ck'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Cookies');
    el.innerHTML = `<p>Usamos cookies para medir as visitas e os resultados dos nossos anúncios. Você escolhe. <a href="/privacidade/#cookies">Saiba mais</a></p>
      <div><button type="button" class="al-ck-nao">Recusar</button><button type="button" class="btn al-ck-sim">Aceitar</button></div>`;
    document.body.appendChild(el);
    el.querySelector('.al-ck-sim').onclick = () => { escolha = 'sim'; salvar('sim'); el.remove(); carregar(); };
    el.querySelector('.al-ck-nao').onclick = () => { const antes = escolha; escolha = 'nao'; salvar('nao'); el.remove(); if (antes === 'sim' && carregado) location.reload(); };
  }

  window.alPixels = {
    /** pode medir? (aceitou o aviso, ou o aviso está desligado no CRM) */
    permitido: () => Boolean(temAlgum(px) && (!px.consentimento || escolha === 'sim')),
    /** dados que o servidor repassa à API de Conversões da Meta, junto com o mesmo eventId */
    capi() {
      if (!this.permitido() || !px.capi) return {};
      let fbc = cookie('_fbc');
      const clid = new URLSearchParams(location.search).get('fbclid');
      if (!fbc && clid) fbc = `fb.1.${Date.now()}.${clid}`;
      return { consentimento: true, fbp: cookie('_fbp'), fbc };
    },
    novoId: prefixo => prefixo + '-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
    track(nome, d) {
      if (!px) { fila.push([nome, d]); return; }
      if (!this.permitido()) return;
      if (!carregado) { fila.push([nome, d]); return; }
      marcar(nome, d);
    },
  };

  window.AL_CONFIG.then(c => {
    const p = c && c.pixels;
    px = p && typeof p === 'object' ? p : {};
    if (!temAlgum(px)) { fila.length = 0; return; }
    escolha = ler();
    if (!px.consentimento || escolha === 'sim') carregar();
    else { fila.length = 0; if (!escolha) aviso(); }
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-cookies]')) { e.preventDefault(); if (temAlgum(px) && px.consentimento) aviso(); } });
})();
