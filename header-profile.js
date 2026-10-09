(function () {
  'use strict';

  if (window.__ibrHeaderProfileInitialized) return;
  window.__ibrHeaderProfileInitialized = true;

  var firestoreSdkPromise;

  function setFallbackPhoto(photoEl) {
    if (!photoEl) return;
    photoEl.src = '/100.png';
    photoEl.alt = 'Profile photo';
  }

  function ensureFirestoreCompat() {
    if (window.firebase && firebase.firestore) return Promise.resolve();
    if (firestoreSdkPromise) return firestoreSdkPromise;
    firestoreSdkPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-ibr-firestore-compat]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        if (window.firebase && firebase.firestore) resolve();
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js';
      script.async = true;
      script.dataset.ibrFirestoreCompat = 'true';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return firestoreSdkPromise;
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

      var initialName = user.displayName || user.email || 'Member';
      if (nameEl) nameEl.textContent = initialName;
      if (photoEl) {
        photoEl.referrerPolicy = 'no-referrer';
        photoEl.alt = initialName + ' profile photo';
        photoEl.onerror = function () {
          if (photoEl.src.indexOf('/100.png') === -1) {
            photoEl.onerror = null;
            setFallbackPhoto(photoEl);
          }
        };
        photoEl.src = user.photoURL || '/160.jpg';
      }
      chip.style.display = 'inline-flex';
    });

    if (!user || !window.firebase || !firebase.firestore) {
      if (user) {
        ensureFirestoreCompat().then(function () {
          return loadSavedProfile(user);
        }).catch(function (error) {
          console.warn('Unable to load the signed-in member profile for the header:', error);
        });
      }
      return;
    }
    loadSavedProfile(user);
  }

  function loadSavedProfile(user) {
    if (!user || !window.firebase || !firebase.firestore) return Promise.resolve();
    return firebase.firestore().collection('publicProfiles').doc(user.uid).get().then(function (snapshot) {
      if (!snapshot.exists) return;
      var data = snapshot.data() || {};
      var firstName = String(data.firstName || '').trim();
      var lastName = String(data.lastName || '').trim();
      var savedName = (firstName + ' ' + lastName).trim()
        || String(data.displayName || data.name || '').trim()
        || user.displayName
        || user.email
        || 'Member';
      var savedPhoto = data.imageDataUrl || data.photoURL || data.photoUrl || data.photoURLData || user.photoURL || '';

      document.querySelectorAll('[data-auth-profile]').forEach(function (chip) {
        var nameEl = chip.querySelector('[data-auth-name]');
        var photoEl = chip.querySelector('[data-auth-photo]');
        if (nameEl) nameEl.textContent = savedName;
        if (photoEl && savedPhoto) {
          photoEl.alt = savedName + ' profile photo';
          photoEl.src = savedPhoto;
        }
      });
    }).catch(function (error) {
      console.warn('Unable to load the signed-in member profile for the header:', error);
    });
  }

  function init() {
    if (!window.firebase || !window.firebase.auth || !window.firebaseConfig) {
      updateProfile(null);
      return;
    }

    try {
      if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
    } catch (error) {
      // Another page-level script may already have initialized Firebase.
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
