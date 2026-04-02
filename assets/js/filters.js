/* filters.js — Homepage plan grid filters (~2 KB, defer) */
(function () {
  'use strict';

  var btns = document.querySelectorAll('.filter-btn');
  var items = document.querySelectorAll('[data-filter-item]');
  if (!btns.length || !items.length) return;

  function applyFilter(type) {
    items.forEach(function (item) {
      var itemType = item.getAttribute('data-type');
      var show = type === 'all' || itemType === type;
      item.classList.toggle('hidden', !show);
    });

    btns.forEach(function (btn) {
      var active = btn.getAttribute('data-filter') === type;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFilter(btn.getAttribute('data-filter') || 'all');
    });
  });
})();
