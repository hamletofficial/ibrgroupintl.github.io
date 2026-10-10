/* Shared authenticated-member header profile loader for IBR pages.
   Uses publicProfiles/{uid} as the source of truth for the member's saved name and photo. */
(function (window) {
  'use strict';

  async function loadMemberHeader(options) {
    const user = options && options.user;
    const db = options && options.db;
    const nameElement = options && options.nameElement;
    const photoElement = options && options.photoElement;
    const isCurrentUser = options && options.isCurrentUser;

    if (!user || !db || !nameElement || !photoElement) return;
    const stillCurrent = typeof isCurrentUser === 'function'
      ? isCurrentUser
      : function () { return true; };

    // Avoid briefly displaying a stale Firebase Auth displayName while Firestore loads.
    nameElement.textContent = 'Loading profile…';
    photoElement.onerror = function () {
      photoElement.onerror = null;
      photoElement.src = '/160.jpg';
    };
    photoElement.src = '/160.jpg';

    try {
      const snapshot = await db.collection('publicProfiles').doc(user.uid).get();
      if (!stillCurrent()) return;

      const profile = snapshot.exists ? (snapshot.data() || {}) : {};
      const fullName = [profile.firstName, profile.lastName]
        .filter(function (part) { return typeof part === 'string' && part.trim(); })
        .map(function (part) { return part.trim(); })
        .join(' ');

      nameElement.textContent = fullName || user.displayName || user.email || 'Member';

      const savedPhoto = typeof profile.imageDataUrl === 'string'
        ? profile.imageDataUrl.trim()
        : '';
      const photoUrl = savedPhoto || user.photoURL || '/160.jpg';
      photoElement.onerror = function () {
        photoElement.onerror = null;
        photoElement.src = '/160.jpg';
      };
      photoElement.src = photoUrl;
    } catch (error) {
      if (!stillCurrent()) return;
      console.warn('Could not load the saved member profile for the header:', error);
      nameElement.textContent = user.displayName || user.email || 'Member';
      photoElement.onerror = function () {
        photoElement.onerror = null;
        photoElement.src = '/160.jpg';
      };
      photoElement.src = user.photoURL || '/160.jpg';
    }
  }

  window.IBRMemberHeader = Object.freeze({ load: loadMemberHeader });
})(window);
