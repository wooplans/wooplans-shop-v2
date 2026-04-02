/* analytics.js — Facebook Pixel + Microsoft Clarity (~1 KB, defer) */
(function () {
  'use strict';

  /* ── Facebook Pixel 1651374605332302 ──────────────────────────────────── */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', '1651374605332302');
  fbq('track', 'PageView');

  // Track plan view with product value
  var planPage = document.querySelector('[data-plan-price]');
  if (planPage) {
    var price = parseFloat(planPage.getAttribute('data-plan-price') || '0');
    var title = planPage.getAttribute('data-plan-title') || '';
    var planId = planPage.getAttribute('data-plan-id') || '';
    fbq('track', 'ViewContent', {
      content_name: title,
      content_ids: [planId],
      content_type: 'product',
      value: price,
      currency: 'XAF'
    });
  }

  // Re-track on turbo navigation
  document.addEventListener('turbo:navigate', function () {
    fbq('track', 'PageView');
  });

  /* ── Microsoft Clarity vxek9swtox ────────────────────────────────────── */
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window,document,'clarity','script','vxek9swtox');
})();
