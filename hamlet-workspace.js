/* Shared Hamlet workspace navigation, search launcher and page deep-link support. */
(function(){
'use strict';
if(window.__hamletWorkspaceUX)return;
window.__hamletWorkspaceUX=true;
var routes=[
 {label:'Deal Pipeline',short:'Deals',href:'/app/hamlet/',icon:'▦',paths:['/app/hamlet','/app/hamlet/','/app/hamlet/index.html'],desc:'Find transactions and next actions.'},
 {label:'My Properties',short:'Properties',href:'/app/public/resources.html',icon:'⌂',paths:['/app/public/resources.html'],desc:'Search and manage properties you own.'},
 {label:'Live Listings',short:'Listings',href:'/app/public/live.html',icon:'▤',paths:['/app/public/live.html'],desc:'Discover active commercial property listings.'},
 {label:'Contacts & Directory',short:'Contacts',href:'/directory.html',icon:'♙',paths:['/directory.html'],desc:'Find members and start a conversation.'},
 {label:'Messages',short:'Messages',href:'/messages.html',icon:'✉',paths:['/messages.html'],desc:'Open your member mailbox.'},
 {label:'Social Feed',short:'Social',href:'/posts.html',icon:'◉',paths:['/posts.html'],desc:'Search community updates and posts.'},
 {label:'Members Area',short:'Members',href:'/members.html',icon:'▣',paths:['/members.html'],desc:'Open member resources and account tools.'}
];
var palette=null,paletteInput=null,paletteLinks=[],lastFocus=null;
function currentPath(){return (location.pathname||'/').replace(/\/$/,'')||'/'}
function withQuery(href,q){if(!q)return href;return href+(href.indexOf('?')>=0?'&':'?')+'q='+encodeURIComponent(q)}
function make(tag,cls,text){var node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node}
function buildNav(){
 var existing=document.querySelector('nav.workspace-nav');
 if(existing){
  routes.forEach(function(r){if(!existing.querySelector('a[href="'+r.href+'"]')&&r.href==='/app/public/live.html'){var a=make('a','workspace-nav-link','▤ Live Listings');a.href=r.href;existing.appendChild(a)}});
  if(!existing.querySelector('.hamlet-global-search')){var b=make('button','hamlet-global-search','Search Hamlet');b.type='button';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-label','Search Hamlet (Ctrl or Command + K)');var k=make('kbd','','Ctrl K');b.appendChild(k);b.addEventListener('click',openPalette);existing.appendChild(b)}
  return;
 }
 if(document.querySelector('.hamlet-primary-nav'))return;
 var header=document.querySelector('header.resource-nav, header.topbar');
 var nav=make('nav','hamlet-primary-nav');nav.setAttribute('aria-label','Hamlet workspace');
 var path=currentPath();
 routes.forEach(function(r){
   var a=make('a','hamlet-nav-link');a.href=r.href;
   var icon=make('span','',r.icon);icon.setAttribute('aria-hidden','true');a.appendChild(icon);a.appendChild(document.createTextNode(' '+r.short));
   if(r.paths.indexOf(path)!==-1){a.setAttribute('aria-current','page');a.title=r.label}
   else a.title=r.label;
   nav.appendChild(a);
 });
 var search=make('button','hamlet-global-search','Search Hamlet');search.type='button';search.setAttribute('aria-haspopup','dialog');search.setAttribute('aria-label','Search Hamlet (Ctrl or Command + K)');var key=make('kbd','','Ctrl K');search.appendChild(key);search.addEventListener('click',openPalette);nav.appendChild(search);
 if(header&&header.parentNode)header.parentNode.insertBefore(nav,header.nextSibling);else{var wrapper=document.querySelector('.page-wrapper')||document.body;wrapper.insertBefore(nav,wrapper.firstChild)}
}
function buildPalette(){
 if(palette)return;
 palette=make('div','hamlet-search-overlay');palette.hidden=true;palette.setAttribute('role','presentation');
 var dialog=make('section','hamlet-search-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','hamletSearchTitle');
 var head=make('div','hamlet-search-heading');var title=make('strong','','Search across Hamlet');title.id='hamletSearchTitle';head.appendChild(title);
 var close=make('button','hamlet-search-close','×');close.type='button';close.setAttribute('aria-label','Close search');close.addEventListener('click',closePalette);head.appendChild(close);dialog.appendChild(head);
 var form=make('form','hamlet-search-form');form.setAttribute('role','search');paletteInput=make('input','hamlet-search-input');paletteInput.type='search';paletteInput.maxLength=140;paletteInput.placeholder='Property, location, member, deal or post…';paletteInput.setAttribute('aria-label','Search term');form.appendChild(paletteInput);
 var submit=make('button','hamlet-search-submit','Go');submit.type='submit';form.appendChild(submit);dialog.appendChild(form);
 form.addEventListener('submit',function(e){e.preventDefault();var q=paletteInput.value.trim();var destination=paletteLinks[0];if(destination)location.href=withQuery(destination.dataset.base,q)});
 var caption=make('div','hamlet-search-caption','Choose where to search');dialog.appendChild(caption);
 var list=make('div','hamlet-search-destinations');
 routes.filter(function(r){return r.href!=='/members.html'}).forEach(function(r){
   var a=make('a','hamlet-search-destination');a.href=r.href;a.dataset.base=r.href;
   var strong=make('strong','',r.label);var desc=make('span','',r.desc);a.appendChild(strong);a.appendChild(desc);
   a.addEventListener('click',function(e){var q=paletteInput.value.trim();if(q){e.preventDefault();location.href=withQuery(r.href,q)}});
   list.appendChild(a);paletteLinks.push(a);
 });
 dialog.appendChild(list);var hint=make('div','hamlet-search-hint','Press Esc to close · Ctrl/Command + K to open');dialog.appendChild(hint);
 palette.appendChild(dialog);palette.addEventListener('click',function(e){if(e.target===palette)closePalette()});document.body.appendChild(palette);
 document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette();return}
  if(e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette();return}
  if(e.key==='Escape'&&palette&&!palette.hidden)closePalette();
 });
}
function openPalette(){buildPalette();lastFocus=document.activeElement;palette.hidden=false;paletteInput.value='';updatePaletteLinks();document.body.style.overflow='hidden';paletteInput.focus()}
function closePalette(){if(!palette||palette.hidden)return;palette.hidden=true;document.body.style.overflow='';if(lastFocus&&typeof lastFocus.focus==='function')lastFocus.focus()}
function updatePaletteLinks(){var q=paletteInput?paletteInput.value.trim():'';paletteLinks.forEach(function(a){a.href=withQuery(a.dataset.base,q)})}
function prefillSearch(){
 var params=new URLSearchParams(location.search),q=(params.get('q')||params.get('search')||'').trim().slice(0,140);if(!q)return;
 var path=currentPath(),id=null;
 if(path==='/app/hamlet'||path==='/app/hamlet/index.html')id='searchDeals';
 else if(path==='/app/public/resources.html')id='propertySearch';
 else if(path==='/app/public/live.html')id='listingSearch';
 else if(path==='/directory.html')id='directorySearchInput';
 else if(path==='/posts.html')id='postSearch';
 if(id){var input=document.getElementById(id);if(input){input.value=q;input.setAttribute('data-hamlet-deep-search','true')}}
 if(id){var field=document.getElementById(id);if(field){field.value=q;field.setAttribute('data-hamlet-deep-search','true');field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}))}}
}
function initialise(){buildNav();buildPalette();prefillSearch()}
initialise();
})();
