/* Shared appearance preference for root-level pages. */
(function () {
  var key = "ibr-appearance";
  function apply(value) {
    var mode = value === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-appearance", mode);
    document.querySelectorAll('[data-appearance-toggle]').forEach(function (toggle) {
      toggle.checked = mode === "dark";
      toggle.setAttribute("aria-checked", String(toggle.checked));
    });
    document.querySelectorAll('[data-appearance-label]').forEach(function (label) {
      label.textContent = mode === "dark" ? "Dark mode is on" : "Light mode is on";
    });
  }
  function current() {
    try { return localStorage.getItem(key) || "light"; } catch (e) { return "light"; }
  }
  apply(current());
  document.addEventListener("DOMContentLoaded", function () {
    apply(current());
    document.querySelectorAll('[data-appearance-toggle]').forEach(function (toggle) {
      toggle.addEventListener("change", function () {
        var value = toggle.checked ? "dark" : "light";
        try { localStorage.setItem(key, value); } catch (e) {}
        apply(value);
      });
    });
  });
  window.IBRAppearance = { set: function (value) {
    try { localStorage.setItem(key, value === "dark" ? "dark" : "light"); } catch (e) {}
    apply(value);
  }, get: current };
})();