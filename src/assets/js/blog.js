// Página de artigo: barra de progresso da leitura, sumário recolhido no celular e seção atual marcada no sumário.
(function () {
  var barra = document.querySelector('.post-progress span');
  var conteudo = document.querySelector('.post-content');
  var toc = document.querySelector('details.post-toc');
  if (toc && window.matchMedia('(max-width:1000px)').matches) toc.removeAttribute('open');
  if (barra && conteudo) {
    var medir = function () {
      var r = conteudo.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      barra.style.transform = 'scaleX(' + p + ')';
    };
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    medir();
  }
  if (toc && 'IntersectionObserver' in window) {
    var links = {};
    toc.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting || !links[e.target.id]) return;
        Object.keys(links).forEach(function (k) { links[k].classList.remove('on'); });
        links[e.target.id].classList.add('on');
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    conteudo.querySelectorAll('h2[id]').forEach(function (h) { obs.observe(h); });
  }
})();
