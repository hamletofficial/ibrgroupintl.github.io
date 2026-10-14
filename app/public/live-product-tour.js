/* Hamlet Live Listings product tour. Opens once per authenticated member/browser and can be replayed. */
(function () {
  'use strict';
  var KEY_PREFIX = 'hamlet-live-tour-v1:';
  var uid = null, index = 0, overlay = null, activeTarget = null;
  var steps = [
    { title: 'Welcome to Live Listings', body: 'Explore commercial property opportunities shared by authenticated Hamlet members. This guided tour explains the listing tools without changing your records.', target: '.hero' },
    { title: 'Search the property market', body: 'Search across property names, locations, sizes and descriptions. Multiple search terms can be used together to narrow the results.', target: '#listingSearch' },
    { title: 'Refine and sort results', body: 'Filter by property type, availability and listing status, then sort by newest, property name, location or type.', target: '.listing-filters' },
    { title: 'Save properties and searches', body: 'Save individual properties on this device, view saved properties only, and save named combinations of search terms and filters for later.', target: '.listing-tools-actions' },
    { title: 'Review the live listings', body: 'Each property card summarises the type, location, availability, size and description. Depending on the listing, you can open an external listing, contact the broker or add the property to your Hamlet Deal Pipeline.', target: '#listingList' },
    { title: 'Export your filtered view', body: 'Use Export filtered CSV to download the properties currently visible after your search and filters. Clear filters restores the full listing view.', target: '#exportListingsBtn' },
    { title: 'Broker reviews and ratings', body: 'Read community feedback and the average rating. Signed-in members can submit a review of up to 3,000 characters and select a one-to-five-star rating.', target: '#reviewPanel' },
    { title: 'Identity, policy and support', body: 'The page header shows your member identity and Entrust verification status. Use the listing policy for guidance, manage your own resources, advertise a property through the approved workflow, or report suspected fraud.', target: '.hero-actions' }
  ];
  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text != null) node.textContent = text;
    return node;
  }
  function completed() { try { return localStorage.getItem(KEY_PREFIX + uid) === 'done' || localStorage.getItem(KEY_PREFIX + uid) === 'skipped'; } catch (e) { return false; } }
  function remember(value) { try { localStorage.setItem(KEY_PREFIX + uid, value); } catch (e) {} }
  function clearHighlight() { if (activeTarget) { activeTarget.classList.remove('hamlet-live-tour-target'); activeTarget.removeAttribute('data-hamlet-tour-target'); } activeTarget = null; }
  function close() { clearHighlight(); if (overlay) overlay.hidden = true; }
  function highlight(selector) {
    clearHighlight();
    var target = selector && document.querySelector(selector);
    if (!target || target.hidden) return;
    activeTarget = target; target.classList.add('hamlet-live-tour-target'); target.setAttribute('data-hamlet-tour-target', 'true');
    try { target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center', inline: 'nearest' }); } catch (e) {}
  }
  function finish(status) { remember(status); close(); }
  function render() {
    if (!overlay) return;
    var step = steps[index];
    overlay.querySelector('.hamlet-live-tour-count').textContent = 'STEP ' + (index + 1) + ' OF ' + steps.length;
    overlay.querySelector('.hamlet-live-tour-title').textContent = step.title;
    overlay.querySelector('.hamlet-live-tour-body').textContent = step.body;
    overlay.querySelector('.hamlet-live-tour-progress').style.width = (((index + 1) / steps.length) * 100) + '%';
    overlay.querySelector('.hamlet-live-tour-back').disabled = index === 0;
    overlay.querySelector('.hamlet-live-tour-next').textContent = index === steps.length - 1 ? 'Finish tour' : 'Next';
    highlight(step.target);
  }
  function move(delta) {
    if (index + delta < 0) return;
    if (index + delta >= steps.length) { finish('done'); return; }
    index += delta; render();
  }
  function build() {
    if (overlay) return;
    var style = el('style', { id: 'hamletLiveTourStyles' });
    style.textContent = '#hamletLiveTourOverlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(3,12,29,.72);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}#hamletLiveTourOverlay[hidden]{display:none!important}.hamlet-live-tour-card{width:min(510px,100%);overflow:hidden;border:1px solid #365982;border-radius:18px;background:linear-gradient(145deg,#fff,#f3f8ff);color:#092a4b;box-shadow:0 26px 80px #02081799;font-family:"Open Sans",Arial,sans-serif}.hamlet-live-tour-top{padding:22px 24px 0}.hamlet-live-tour-eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;color:#0369a1}.hamlet-live-tour-title{margin:8px 0 10px;font-size:22px;line-height:1.25;color:#071d4a}.hamlet-live-tour-body{padding:0 24px 20px;margin:0;color:#334155;font-size:14px;line-height:1.7}.hamlet-live-tour-progress-track{height:4px;background:#dbeafe}.hamlet-live-tour-progress{height:100%;width:0;background:linear-gradient(90deg,#0284c7,#1d4ed8);transition:width .2s ease}.hamlet-live-tour-controls{display:flex;align-items:center;gap:8px;padding:14px 20px 18px;border-top:1px solid #dbe3ee}.hamlet-live-tour-controls button{border:1px solid #cbd5e1;border-radius:9px;padding:9px 12px;background:#fff;color:#173b5d;font:700 12px "Open Sans",Arial,sans-serif;cursor:pointer}.hamlet-live-tour-controls .hamlet-live-tour-next{margin-left:auto;background:#0754a6;color:#fff;border-color:#0754a6}.hamlet-live-tour-controls button:disabled{opacity:.4;cursor:default}.hamlet-live-tour-skip{border:0!important;background:transparent!important;color:#64748b!important}.hamlet-live-tour-target{position:relative!important;z-index:100001!important;outline:3px solid #38bdf8!important;outline-offset:4px!important;box-shadow:0 0 0 7px rgba(2,132,199,.18)!important;border-radius:10px!important;scroll-margin:22px!important}.hamlet-live-tour-launch{background:#e0f2fe!important;color:#073b70!important;border-color:#7dd3fc!important}.hamlet-live-tour-launch:focus-visible,.hamlet-live-tour-controls button:focus-visible{outline:3px solid #0284c7;outline-offset:3px}@media(max-width:520px){#hamletLiveTourOverlay{padding:12px;align-items:flex-end}.hamlet-live-tour-card{border-radius:16px}.hamlet-live-tour-top{padding:19px 18px 0}.hamlet-live-tour-title{font-size:20px}.hamlet-live-tour-body{padding:0 18px 18px;font-size:13px}.hamlet-live-tour-controls{padding:12px;gap:6px}.hamlet-live-tour-controls button{padding:9px 10px;font-size:11px}}@media(prefers-reduced-motion:reduce){.hamlet-live-tour-progress{transition:none}}';
    document.head.appendChild(style);
    overlay = el('div', { id: 'hamletLiveTourOverlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hamletLiveTourTitle', 'aria-describedby': 'hamletLiveTourBody', hidden: 'hidden' });
    var card = el('section', { 'class': 'hamlet-live-tour-card' });
    var top = el('div', { 'class': 'hamlet-live-tour-top' });
    top.appendChild(el('div', { 'class': 'hamlet-live-tour-eyebrow hamlet-live-tour-count' }, 'STEP 1 OF ' + steps.length));
    top.appendChild(el('h2', { id: 'hamletLiveTourTitle', 'class': 'hamlet-live-tour-title' }, 'Welcome to Live Listings'));
    var body = el('p', { id: 'hamletLiveTourBody', 'class': 'hamlet-live-tour-body' }, '');
    var track = el('div', { 'class': 'hamlet-live-tour-progress-track', 'aria-hidden': 'true' });
    track.appendChild(el('div', { 'class': 'hamlet-live-tour-progress' }));
    var controls = el('div', { 'class': 'hamlet-live-tour-controls' });
    var skip = el('button', { type: 'button', 'class': 'hamlet-live-tour-skip' }, 'Skip tour');
    var back = el('button', { type: 'button', 'class': 'hamlet-live-tour-back' }, 'Back');
    var next = el('button', { type: 'button', 'class': 'hamlet-live-tour-next' }, 'Next');
    skip.addEventListener('click', function () { finish('skipped'); });
    back.addEventListener('click', function () { move(-1); });
    next.addEventListener('click', function () { move(1); });
    controls.append(skip, back, next);
    card.append(top, body, track, controls); overlay.appendChild(card); document.body.appendChild(overlay);
    overlay.addEventListener('click', function (event) { if (event.target === overlay) finish('skipped'); });
    document.addEventListener('keydown', function (event) {
      if (!overlay || overlay.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); finish('skipped'); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    });
  }
  function open() { if (!uid) return; build(); index = 0; overlay.hidden = false; render(); var next = overlay.querySelector('.hamlet-live-tour-next'); if (next) next.focus(); }
  function addButton() {
    var actions = document.querySelector('.hero-actions');
    if (!actions || document.getElementById('hamletLiveTourButton')) return;
    var button = el('button', { id: 'hamletLiveTourButton', type: 'button', 'class': 'btn hamlet-live-tour-launch', 'aria-label': 'Replay Live Listings product tour' }, '◎ Product tour');
    button.addEventListener('click', open);
    actions.insertBefore(button, actions.firstChild);
  }
  function init() {
    if (!window.firebase || !window.firebaseConfig) return;
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
      firebase.auth().onAuthStateChanged(function (user) {
        if (!user) {
          uid = null; close();
          var button = document.getElementById('hamletLiveTourButton');
          if (button) button.remove();
          return;
        }
        uid = user.uid;
        addButton();
        if (!completed()) open();
      }, function (error) { console.warn('Live Listings tour could not confirm sign-in:', error); });
    } catch (error) { console.warn('Live Listings tour could not initialise:', error); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();