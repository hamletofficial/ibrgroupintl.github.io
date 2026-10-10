/* Shared authenticated-member header profile loader for IBR pages.
   publicProfiles/{uid} is the source of truth for the saved name and photo.
   A Firestore listener keeps the header in sync if the member edits their profile. */
(function (window) {
  'use strict';
  const subscriptions = new WeakMap();

  function stop(nameElement) {
    if (!nameElement) return;
    const unsubscribe = subscriptions.get(nameElement);
    if (typeof unsubscribe === 'function') unsubscribe();
    subscriptions.delete(nameElement);
  }

  function loadMemberHeader(options) {
    const user = options && options.user;
    const db = options && options.db;
    const nameElement = options && options.nameElement;
    const photoElement = options && options.photoElement;
    const isCurrentUser = options && options.isCurrentUser;
    if (!user || !db || !nameElement || !photoElement) return;

    stop(nameElement);
    const stillCurrent = typeof isCurrentUser === 'function' ? isCurrentUser : function () { return true; };
    const fallbackName = user.displayName || user.email || 'Member';
    const fallbackPhoto = user.photoURL || '/160.jpg';

    // Do not briefly show an obsolete Firebase Auth displayName while Firestore loads.
    nameElement.textContent = 'Loading profile…';
    photoElement.onerror = function () {
      photoElement.onerror = null;
      photoElement.src = '/160.jpg';
    };
    photoElement.src = '/160.jpg';

    const applyProfile = function (snapshot) {
      if (!stillCurrent()) return;
      const profile = snapshot && snapshot.exists ? (snapshot.data() || {}) : {};
      const fullName = [profile.firstName, profile.lastName]
        .filter(function (part) { return typeof part === 'string' && part.trim(); })
        .map(function (part) { return part.trim(); })
        .join(' ');
      nameElement.textContent = fullName || fallbackName;

      const savedPhoto = typeof profile.imageDataUrl === 'string' ? profile.imageDataUrl.trim() : '';
      photoElement.onerror = function () {
        photoElement.onerror = null;
        photoElement.src = '/160.jpg';
      };
      photoElement.src = savedPhoto || fallbackPhoto;
    };

    try {
      const unsubscribe = db.collection('publicProfiles').doc(user.uid).onSnapshot(
        applyProfile,
        function (error) {
          if (!stillCurrent()) return;
          console.warn('Could not watch the saved member profile for the header:', error);
          nameElement.textContent = fallbackName;
          photoElement.src = fallbackPhoto;
        }
      );
      subscriptions.set(nameElement, unsubscribe);
    } catch (error) {
      console.warn('Could not initialize the member header profile listener:', error);
      if (stillCurrent()) {
        nameElement.textContent = fallbackName;
        photoElement.src = fallbackPhoto;
      }
    }
  }

  window.IBRMemberHeader = Object.freeze({
    load: loadMemberHeader,
    clear: function (nameElement, photoElement) {
      stop(nameElement);
      if (nameElement) nameElement.textContent = '';
      if (photoElement) {
        photoElement.onerror = null;
        photoElement.src = '/160.jpg';
      }
    }
  });
})(window);
