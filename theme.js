/* Shared, browser-local appearance preference for all root-level pages. */
(function () {
  "use strict";
  var STORAGE_KEY = "ibr-appearance";
  var DARK = "dark";
  var LIGHT = "light";

  function normalize(value) {
    return value === DARK ? DARK : LIGHT;
  }

  function readPreference() {
    try {
      return normalize(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return LIGHT;
    }
  }

  function writePreference(value) {
    var mode = normalize(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      /* Appearance still applies for this page when storage is unavailable. */
    }
    return mode;
  }

  function applyAppearance(value) {
    var mode = normalize(value);
    var isDark = mode === DARK;
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
    applyAppearance(readPreference());
  }

  /* Apply before first paint as this script is loaded in the document head. */
  applyAppearance(readPreference());

  function bindControls() {
    document.querySelectorAll("[data-appearance-toggle]").forEach(function (toggle) {
      if (toggle.dataset.ibrAppearanceBound === "true") return;
      toggle.dataset.ibrAppearanceBound = "true";
      toggle.addEventListener("change", function () {
        applyAppearance(writePreference(toggle.checked ? DARK : LIGHT));
      });
    });
    syncControls();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindControls, { once: true });
  } else {
    bindControls();
  }

  /* Keep already-open tabs in sync when the preference changes elsewhere. */
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY || event.key === null) syncControls();
  });

  window.IBRAppearance = {
    set: function (value) {
      applyAppearance(writePreference(value));
    },
    get: readPreference
  };
})();