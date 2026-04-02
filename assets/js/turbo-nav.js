/* turbo-nav.js — Fast navigation via prefetch + main swap (~3 KB, defer) */
(function () {
  'use strict';

  var cache = {};
  var prefetched = new Set();

  function prefetch(href) {
    if (prefetched.has(href)) return;
    prefetched.add(href);
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    document.head.appendChild(link);
  }

  function loadPage(href) {
    if (cache[href]) return Promise.resolve(cache[href]);
    return fetch(href, {credentials: 'same-origin'})
      .then(function (r) { return r.text(); })
      .then(function (html) {
        cache[href] = html;
        return html;
      });
  }

  function extractMain(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var main = doc.getElementById('main-content');
    return main ? main.innerHTML : null;
  }

  function extractTitle(html) {
    var match = html.match(/<title>([^<]+)<\/title>/);
    return match ? match[1] : null;
  }

  function navigate(href) {
    loadPage(href).then(function (html) {
      var newMain = extractMain(html);
      var newTitle = extractTitle(html);
      if (!newMain) { location.href = href; return; }

      var mainEl = document.getElementById('main-content');
      if (!mainEl) { location.href = href; return; }

      mainEl.style.opacity = '0';
      mainEl.style.transition = 'opacity .15s';

      setTimeout(function () {
        mainEl.innerHTML = newMain;
        if (newTitle) document.title = newTitle;
        history.pushState({href: href}, newTitle || '', href);
        window.scrollTo({top: 0, behavior: 'instant'});
        mainEl.style.opacity = '1';

        // Re-run page-specific scripts
        var scripts = mainEl.querySelectorAll('script');
        scripts.forEach(function (s) {
          var ns = document.createElement('script');
          if (s.src) { ns.src = s.src; ns.defer = true; }
          else { ns.textContent = s.textContent; }
          document.body.appendChild(ns);
        });

        // Dispatch navigation event
        document.dispatchEvent(new CustomEvent('turbo:navigate', {detail: {href: href}}));
      }, 80);
    }).catch(function () {
      location.href = href;
    });
  }

  // Intercept plan card clicks and internal links
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel') || a.hasAttribute('target')) return;
    if (a.closest('.plan-card') || href.startsWith('/plans/')) {
      e.preventDefault();
      navigate(href);
    }
  });

  // Prefetch on hover
  document.addEventListener('mouseover', function (e) {
    var a = e.target.closest('a.plan-card, a[href^="/plans/"]');
    if (a) {
      var href = a.getAttribute('href');
      if (href && !href.startsWith('http')) prefetch(href);
    }
  }, {passive: true});

  // Prefetch on touchstart
  document.addEventListener('touchstart', function (e) {
    var a = e.target.closest('a.plan-card, a[href^="/plans/"]');
    if (a) {
      var href = a.getAttribute('href');
      if (href && !href.startsWith('http')) prefetch(href);
    }
  }, {passive: true});

  // Handle browser back/forward
  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.href) navigate(e.state.href);
    else location.reload();
  });
})();
