/* Shared appearance preference: dark by default, persisted locally and to the signed-in Firebase profile. */
(function () {
  "use strict";
  var STORAGE_KEY = "ibr-appearance-v2";
  var DARK = "dark";
  var LIGHT = "light";
  var signedInUser = null;
  var profileWriteQueue = Promise.resolve();

  function normalize(value) {
    return value === LIGHT ? LIGHT : DARK;
  }

  function readPreference() {
    try {
      return normalize(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return DARK;
    }
  }

  function writeLocalPreference(value) {
    var mode = normalize(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      /* Appearance still applies for this page when storage is unavailable. */
    }
    return mode;
  }

  function saveAccountPreference(mode) {
    if (!signedInUser || !window.firebase || typeof window.firebase.firestore !== "function") return;
    var user = signedInUser;
    profileWriteQueue = profileWriteQueue.then(function () {
      return window.firebase.firestore().collection("publicProfiles").doc(user.uid).get().then(function (snapshot) {
        if (!snapshot.exists) return;
        return snapshot.ref.update({ appearanceMode: normalize(mode) });
      });
    }).catch(function (error) {
      console.warn("Unable to save appearance preference to Firebase:", error);
    });
  }

  function applyAppearance(value, persistLocally) {
    var mode = normalize(value);
    var isDark = mode === DARK;
    if (persistLocally !== false) writeLocalPreference(mode);
    document.documentElement.setAttribute("data-appearance", mode);

    document.querySelectorAll("[data-appearance-toggle]").forEach(function (toggle) {
      toggle.checked = isDark;
      toggle.setAttribute("aria-checked", String(isDark));
    });

    document.querySelectorAll("[data-appearance-label]").forEach(function (label) {
      label.textContent = isDark ? "Dark mode is on" : "Light mode is on";
    });

    return mode;
  }

  function syncControls() {
    applyAppearance(readPreference(), false);
  }

  function connectFirebasePreference() {
    if (!window.firebase || !window.firebaseConfig ||
        typeof window.firebase.auth !== "function" ||
        typeof window.firebase.firestore !== "function") return;
    try {
      if (!window.firebase.apps || !window.firebase.apps.length) {
        window.firebase.initializeApp(window.firebaseConfig);
      }
      window.firebase.auth().onAuthStateChanged(function (user) {
        signedInUser = user || null;
        if (!user) return;
        window.firebase.firestore().collection("publicProfiles").doc(user.uid).get()
          .then(function (snapshot) {
            var savedMode = snapshot.exists && snapshot.data()
              ? snapshot.data().appearanceMode
              : null;
            var mode = savedMode === LIGHT || savedMode === DARK ? savedMode : DARK;
            applyAppearance(mode, true);
            if (savedMode !== mode && snapshot.exists) saveAccountPreference(mode);
          })
          .catch(function (error) {
            console.warn("Unable to load account appearance preference from Firebase:", error);
            /* Keep the safe dark default when the account preference cannot be read. */
            applyAppearance(readPreference(), false);
          });
      });
    } catch (error) {
      console.warn("Firebase appearance synchronisation is unavailable:", error);
    }
  }

  /* Ignore older browser-only preferences and start every new session in dark mode. */
  writeLocalPreference(DARK);
  applyAppearance(DARK, false);

  function bindControls() {
    document.querySelectorAll("[data-appearance-toggle]").forEach(function (toggle) {
      if (toggle.dataset.ibrAppearanceBound === "true") return;
      toggle.dataset.ibrAppearanceBound = "true";
      toggle.addEventListener("change", function () {
        var mode = applyAppearance(toggle.checked ? DARK : LIGHT, true);
        saveAccountPreference(mode);
      });
    });
    syncControls();
    connectFirebasePreference();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindControls, { once: true });
  } else {
    bindControls();
  }

  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY || event.key === null) syncControls();
  });

  window.IBRAppearance = {
    set: function (value) {
      var mode = applyAppearance(value, true);
      saveAccountPreference(mode);
    },
    get: readPreference
  };
})();