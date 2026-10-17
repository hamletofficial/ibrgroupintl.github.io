(function () {
  'use strict';

  if (window.__ibrHeaderProfileInitialized) return;
  window.__ibrHeaderProfileInitialized = true;

  var firestoreSdkPromise;
  var profileServicePromise;
  var profileUnsubscribers = [];
  var activeUid = null;

  function ensureProfileService() {
    if (window.ibrProfileService) return Promise.resolve();
    if (profileServicePromise) return profileServicePromise;
    profileServicePromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = '/profile-service.js?v=20261010-2';
      script.async = true;
      script.onload = function () {
        if (window.ibrProfileService) resolve();
        else reject(new Error('Profile service did not initialise.'));
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return profileServicePromise;
  }

  function stopProfileListeners() {
    profileUnsubscribers.forEach(function (unsubscribe) {
      if (typeof unsubscribe === 'function') unsubscribe();
    });
    profileUnsubscribers = [];
  }

  function setFallbackPhoto(photoEl) {
    if (!photoEl) return;
    photoEl.onerror = null;
    photoEl.src = '/assets/images/dark-hamlet.png';
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

  function ensureHeaderIdentity(chip) {
    var nameEl = chip.querySelector('[data-auth-name]');
    if (!nameEl) return { nameEl: null, badge: null };

    if (nameEl.tagName.toLowerCase() !== 'a') {
      var link = document.createElement('a');
      link.className = nameEl.className || 'auth-profile-name';
      link.setAttribute('data-auth-name', '');
      link.href = '/editprofile.html';
      link.textContent = nameEl.textContent || '';
      nameEl.parentNode.replaceChild(link, nameEl);
      nameEl = link;
    } else {
      nameEl.href = '/editprofile.html';
    }
    nameEl.classList.add('auth-profile-name-link');

    var badge = chip.querySelector('[data-auth-verified-badge]');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'auth-profile-verified-badge';
      badge.setAttribute('data-auth-verified-badge', '');
      badge.setAttribute('role', 'img');
      badge.setAttribute('aria-label', 'Entrust identity verified');
      badge.title = 'Entrust identity verified';
      badge.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="verified-rosette" d="M12 1.5l2.1 1.7 2.7-.2 1.1 2.5 2.5 1.1-.2 2.7 1.7 2.1-1.7 2.1.2 2.7-2.5 1.1-1.1 2.5-2.7-.2-2.1 1.7-2.1-1.7-2.7.2-1.1-2.5-2.5-1.1.2-2.7L2.1 12l1.7-2.1-.2-2.7 2.5-1.1 1.1-2.5 2.7.2z"/><path class="verified-check" d="M7.4 12.2l3 3 6.4-6.4"/></svg>';
      nameEl.insertAdjacentElement('afterend', badge);
    }

    return { nameEl: nameEl, badge: badge };
  }

  function ensureHeaderIdentityStyles() {
    if (document.getElementById('ibr-header-identity-styles')) return;
    var style = document.createElement('style');
    style.id = 'ibr-header-identity-styles';
    style.textContent = [
      '.auth-profile-chip .auth-profile-name-link, .auth-profile-chip .auth-profile-name-link:hover, .auth-profile-chip .auth-profile-name-link:focus, .auth-profile-chip .auth-profile-name-link:focus-visible { color: inherit; text-decoration: none !important; }',
      '.auth-profile-chip .auth-profile-name-link { cursor: pointer; }',
      '.auth-profile-verified-badge { display: inline-flex; width: 17px; height: 17px; flex: 0 0 17px; align-items: center; justify-content: center; margin-inline-start: 5px; vertical-align: middle; }',
      '.auth-profile-verified-badge svg { display: block; width: 100%; height: 100%; }',
      '.auth-profile-verified-badge .verified-rosette { fill: #1d9bf0; }',
      '.auth-profile-verified-badge .verified-check { fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }'
    ].join('\\n');
    document.head.appendChild(style);
  }

  function updateProfile(user) {
    stopProfileListeners();
    activeUid = user ? user.uid : null;
    ensureHeaderIdentityStyles();\n    var chips = document.querySelectorAll('[data-auth-profile]');

    chips.forEach(function (chip) {
      var nameEl = chip.querySelector('[data-auth-name]');
      var photoEl = chip.querySelector('[data-auth-photo]');

      if (!user) {
        if (nameEl) nameEl.textContent = '';
        setFallbackPhoto(photoEl);
        chip.style.display = 'none';
        return;
      }

      // Do not flash a stale Firebase Auth displayName before the saved profile loads.
      if (nameEl) nameEl.textContent = 'Loading profile…';
      if (photoEl) {
        photoEl.referrerPolicy = 'no-referrer';
        photoEl.alt = 'Profile photo';
        photoEl.onerror = function () {
          photoEl.onerror = null;
          setFallbackPhoto(photoEl);
        };
        photoEl.src = '/assets/images/dark-hamlet.png';
      }
      chip.style.display = 'inline-flex';
    });

    if (!user) return;

    ensureFirestoreCompat().then(ensureProfileService).then(function () {
      if (activeUid !== user.uid || !window.firebase || !firebase.firestore || !window.ibrProfileService) return;
      var unsubscribe = window.ibrProfileService.watchProfile(user.uid, function (result) {
        if (activeUid !== user.uid) return;
        var data = result && result.data ? result.data : {};
        var savedName = data.displayName || user.displayName || user.email || 'Member';
        var savedPhoto = data.imageDataUrl
          || String(data.photoURL || data.photoUrl || data.photoURLData || user.photoURL || '').trim();

        document.querySelectorAll('[data-auth-profile]').forEach(function (chip) {
          var identity = ensureHeaderIdentity(chip);
          var nameEl = identity.nameEl;
          var photoEl = chip.querySelector('[data-auth-photo]');
          if (nameEl) nameEl.textContent = savedName;
          if (identity.badge) identity.badge.hidden = data.onfidoVerified !== true;
          if (photoEl) {
            photoEl.alt = savedName + ' profile photo';
            photoEl.onerror = function () { photoEl.onerror = null; setFallbackPhoto(photoEl); };
            photoEl.src = savedPhoto || '/assets/images/dark-hamlet.png';
          }
        });
      }, function (error) {
        if (activeUid !== user.uid) return;
        console.warn('Unable to watch the signed-in member profile for the header:', error);
        document.querySelectorAll('[data-auth-profile]').forEach(function (chip) {
          var nameEl = chip.querySelector('[data-auth-name]');
          if (nameEl) nameEl.textContent = user.displayName || user.email || 'Member';
        });
      });
      profileUnsubscribers.push(unsubscribe);
    }).catch(function (error) {
      if (activeUid !== user.uid) return;
      console.warn('Unable to load the signed-in member profile for the header:', error);
      document.querySelectorAll('[data-auth-profile]').forEach(function (chip) {
        var nameEl = chip.querySelector('[data-auth-name]');
        if (nameEl) nameEl.textContent = user.displayName || user.email || 'Member';
      });
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
