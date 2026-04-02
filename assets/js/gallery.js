/* gallery.js — Plan page image gallery (~3 KB, defer) */
(function () {
  'use strict';

  var images = window.__GALLERY_IMAGES__;
  if (!images || !images.length) return;

  var mainImg = document.getElementById('gallery-img');
  var counter = document.getElementById('gal-counter');
  var thumbsEl = document.getElementById('gal-thumbs');
  var prevBtn = document.getElementById('gal-prev');
  var nextBtn = document.getElementById('gal-next');
  if (!mainImg) return;

  var current = 0;
  var total = images.length;

  function goto(idx) {
    current = (idx + total) % total;
    mainImg.src = images[current];
    mainImg.alt = mainImg.alt.replace(/\d+/, current + 1);
    if (counter) counter.textContent = (current + 1) + ' / ' + total;

    var thumbs = thumbsEl ? thumbsEl.querySelectorAll('.gal-thumb') : [];
    thumbs.forEach(function (t, i) {
      t.classList.toggle('active', i === current);
    });
    // Scroll thumb into view
    if (thumbs[current]) {
      thumbs[current].scrollIntoView({inline: 'nearest', behavior: 'smooth'});
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { goto(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goto(current + 1); });

  // Thumbs
  if (thumbsEl) {
    thumbsEl.querySelectorAll('.gal-thumb').forEach(function (thumb, i) {
      thumb.addEventListener('click', function () { goto(i); });
    });
  }

  // Keyboard
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') goto(current - 1);
    if (e.key === 'ArrowRight') goto(current + 1);
  });

  // Touch swipe
  var touchStartX = 0;
  var mainEl = document.getElementById('gallery-main');
  if (mainEl) {
    mainEl.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
    }, {passive: true});
    mainEl.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) {
        goto(dx < 0 ? current + 1 : current - 1);
      }
    }, {passive: true});
  }
})();
