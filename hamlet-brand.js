/* Universal fixed Hamlet wordmark for pages that do not load the workspace bundle. */
(function(){
  'use strict';
  function addBrand(){
    if(!document.body || document.getElementById('hamlet-fixed-brand')) return;
    var style=document.createElement('style');
    style.textContent='.hamlet-fixed-brand{position:fixed!important;top:10px!important;left:14px!important;z-index:100002!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:34px!important;padding:5px 11px!important;border:1px solid rgba(191,219,254,.38)!important;border-radius:8px!important;background:#071d4a!important;color:#fff!important;font:800 19px/1 "DM Sans","Segoe UI",Arial,sans-serif!important;letter-spacing:-.055em!important;text-decoration:none!important;box-shadow:0 3px 12px rgba(0,0,0,.24)!important;isolation:isolate!important}.hamlet-fixed-brand:hover,.hamlet-fixed-brand:focus-visible{background:#0b2a6f!important;color:#fff!important;outline:2px solid #93c5fd!important;outline-offset:2px!important}@media(max-width:760px){.hamlet-fixed-brand{top:8px!important;left:10px!important;min-height:32px!important;padding:5px 9px!important;font-size:18px!important}}';
    document.head.appendChild(style);
    var a=document.createElement('a');
    a.id='hamlet-fixed-brand';a.className='hamlet-fixed-brand';a.href='/index.html';a.textContent='hamlet';a.title='hamlet home';a.setAttribute('aria-label','hamlet home');
    document.body.appendChild(a);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addBrand,{once:true}); else addBrand();
})();