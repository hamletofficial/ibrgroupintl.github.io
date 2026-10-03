(function () {
  'use strict';

  function linkedInPhoto() {
    try { return sessionStorage.getItem('linkedin_photo') || ''; } catch (error) { return ''; }
  }

  function updateProfile(user) {
    var chips = document.querySelectorAll('[data-auth-profile]');
    chips.forEach(function (chip) {
      var nameEl = chip.querySelector('[data-auth-name]');
      var photoEl = chip.querySelector('[data-auth-photo]');

      if (user) {
        if (nameEl) nameEl.textContent = user.displayName || user.email || 'Member';
        if (photoEl) {
          photoEl.referrerPolicy = 'no-referrer';
          photoEl.src = user.photoURL || linkedInPhoto() || '/160.jpg';
          photoEl.alt = (user.displayName || 'Member') + ' profile photo';
        }
        chip.style.display = 'inline-flex';
      } else {
        if (nameEl) nameEl.textContent = '';
        if (photoEl) {
          photoEl.src = '/160.jpg';
          photoEl.alt = 'Profile photo';
        }
        chip.style.display = 'none';
      }
    });
  }

  function init() {
    if (!window.firebase || !window.firebaseConfig) {
      updateProfile(null);
      return;
    }

    try { firebase.initializeApp(window.firebaseConfig); } catch (e) { }
    var auth = firebase.auth();
    auth.onAuthStateChanged(function (user) { updateProfile(user || null); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
