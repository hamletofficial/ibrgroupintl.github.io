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

  // Brand consistency: the homepage is intentionally excluded from this wordmark treatment.
  function applyHamletWordmarkDot() {
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') return;
    document.querySelectorAll('a.brand, a.sector-brand, a.search-brand, .brand-wordmark').forEach(el => {
      if (!/^hamlet(?:\s|$)/i.test(el.textContent.trim())) return;
      if (el.querySelector('.brand-dot')) return;

      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (/hamlet/i.test(node.nodeValue)) {
          const dot = document.createElement('span');
          dot.className = 'brand-dot';
          dot.textContent = '.';
          // Evaluate the actual wordmark text's colour, not only the parent link.
          const textColor = getComputedStyle(node.parentElement || el).color.replace(/\s/g, '').toLowerCase();
          const babyBlueColors = [
            '#bfdbfe', 'rgb(191,219,254)',
            '#7dd3fc', 'rgb(125,211,252)',
            '#93c5fd', 'rgb(147,197,253)'
          ];
          dot.style.color = babyBlueColors.includes(textColor) ? '#ffffff' : '#bfdbfe';
          node.parentNode.insertBefore(dot, node.nextSibling);
          break;
        }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyHamletWordmarkDot, { once: true });
  else applyHamletWordmarkDot();
