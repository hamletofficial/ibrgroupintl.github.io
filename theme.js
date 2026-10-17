/* Hamlet is dark-only. Include /theme.css and this script in every new HTML page's
   <head> to apply the shared dark palette before the page is displayed. */
(function () {
  "use strict";

  function applyDarkTheme() {
    document.documentElement.setAttribute("data-appearance", "dark");
    document.documentElement.style.colorScheme = "dark";
  }

  /* Apply immediately to avoid a light-theme flash on first paint. */
  applyDarkTheme();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDarkTheme, { once: true });
  }

  /* Prevent page scripts from switching the site back to a light appearance. */
  if (typeof MutationObserver === "function") {
    var observer = new MutationObserver(function () {
      if (document.documentElement.getAttribute("data-appearance") !== "dark") {
        applyDarkTheme();
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-appearance"]
    });
  }

  /* Backwards-compatible API: callers may request a theme, but dark is enforced. */
  window.IBRAppearance = {
    set: function () { applyDarkTheme(); },
    get: function () { return "dark"; }
  };
})();