(function () {
  'use strict';

  if (window.__ibrHeaderProfileInitialized) return;
  window.__ibrHeaderProfileInitialized = true;

  function linkedInPhoto() {
    try {
      return sessionStorage.getItem('linkedin_photo') || '';
    } catch (error) {
      return '';
    }
  }

  function setFallbackPhoto(photoEl) {
    if (!photoEl) return;
    photoEl.src = '/100.png';
    photoEl.alt = 'Profile photo';
  }

  function updateProfile(user) {
    var chips = document.querySelectorAll('[data-auth-profile]');

    chips.forEach(function (chip) {
      var nameEl = chip.querySelector('[data-auth-name]');
      var photoEl = chip.querySelector('[data-auth-photo]');

      if (!user) {
        if (nameEl) nameEl.textContent = '';
        setFallbackPhoto(photoEl);
        chip.style.display = 'none';
        return;
      }

      var displayName = user.displayName || user.email || 'Member';
      var photoUrl = user.photoURL || linkedInPhoto() || '/100.png';

      if (nameEl) {
        nameEl.textContent = displayName;
      }

      if (photoEl) {
        photoEl.referrerPolicy = 'no-referrer';
        photoEl.alt = displayName + ' profile photo';
        photoEl.onerror = function () {
          if (photoEl.src.indexOf('/100.png') === -1) {
            photoEl.onerror = null;
            setFallbackPhoto(photoEl);
          }
        };
        photoEl.src = photoUrl;
      }

      chip.style.display = 'inline-flex';
    });
  }

  function init() {
    if (!window.firebase || !window.firebase.auth || !window.firebaseConfig) {
      updateProfile(null);
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
      }
    } catch (error) {
      // A page-level auth script may already have initialized Firebase.
    }

    try {
      firebase.auth().onAuthStateChanged(function (user) {
        updateProfile(user || null);
      });
    } catch (error) {
      updateProfile(null);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
