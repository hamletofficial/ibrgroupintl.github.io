/* Shared Hamlet workspace navigation, search launcher and page deep-link support. */
(function(){
'use strict';
if(window.__hamletWorkspaceUX)return;
window.__hamletWorkspaceUX=true;
var routes=[
 {label:'Deal Pipeline',short:'Deals',href:'/app/hamlet/',icon:'▦',paths:['/app/hamlet','/app/hamlet/','/app/hamlet/index.html'],desc:'Find transactions and next actions.'},
 {label:'My Properties',short:'Properties',href:'/app/public/resources.html',icon:'⌂',paths:['/app/public/resources.html'],desc:'Search and manage properties you own.'},
 {label:'Live Listings',short:'Listings',href:'/app/public/live.html',icon:'▤',paths:['/app/public/live.html'],desc:'Discover active commercial property listings.'},
 {label:'Broker Dashboard',short:'Dashboard',href:'/app/public/dashboard.html',icon:'▣',paths:['/app/public/dashboard.html'],desc:'Manage your commercial property brokerage workspace.',searchable:false},
 {label:'Contacts & Directory',short:'Contacts',href:'/directory.html',icon:'♙',paths:['/directory.html'],desc:'Find members and start a conversation.'},
 {label:'Messages',short:'Messages',href:'/messages.html',icon:'✉',paths:['/messages.html'],desc:'Open your member mailbox.'},
 {label:'Social Feed',short:'Social',href:'/posts.html',icon:'◉',paths:['/posts.html'],desc:'Search community updates and posts.'},
 {label:'Archive',short:'Archive',href:'/archive.html',icon:'▱',paths:['/archive.html'],desc:'Find saved and archived communications.'},
 {label:'Account Settings',short:'Settings',href:'/settings.html',icon:'⚙',paths:['/settings.html'],desc:'Manage your profile, privacy and security.',searchable:false},
 {label:'Members Area',short:'Members',href:'/members.html',icon:'▣',paths:['/members.html'],desc:'Open member resources and account tools.'}
];
var palette=null,paletteInput=null,paletteLinks=[],paletteRouteSelect=null,paletteStatus=null,lastFocus=null,previousBodyOverflow='';
function currentPath(){return (location.pathname||'/').replace(/\/$/,'')||'/'}
function withQuery(href,q){if(!q)return href;return href+(href.indexOf('?')>=0?'&':'?')+'q='+encodeURIComponent(q)}
function make(tag,cls,text){var node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node}
function buildNav(){
 var existing=document.querySelector('nav.workspace-nav');
 if(existing){
  routes.forEach(function(r){if(r.href==='/members.html'||existing.querySelector('a[href="'+r.href+'"]'))return;var a=make('a','workspace-nav-link');a.href=r.href;a.appendChild(document.createTextNode(r.icon+' '+(r.short==='Settings'?'Settings':r.short)));if(r.paths.indexOf(currentPath())!==-1){a.setAttribute('aria-current','page');a.title=r.label}existing.appendChild(a)});
  if(!existing.querySelector('.hamlet-global-search')){var b=make('button','hamlet-global-search','Search Hamlet');b.type='button';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-label','Search Hamlet (Ctrl or Command + K)');var k=make('kbd','','Ctrl K');b.appendChild(k);b.addEventListener('click',openPalette);existing.appendChild(b)}
  return;
 }
 if(document.querySelector('.hamlet-primary-nav'))return;
 var header=document.querySelector('header.resource-nav, header.topbar, header.archive-topbar, header.legal-topbar');
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
 paletteRouteSelect=make('select','hamlet-search-route');paletteRouteSelect.setAttribute('aria-label','Choose where to search');var choose=make('option','','Choose workspace…');choose.value='';paletteRouteSelect.appendChild(choose);
 routes.filter(function(r){return r.href!=='/members.html'&&r.searchable!==false}).forEach(function(r){var option=make('option','',r.label);option.value=r.href;paletteRouteSelect.appendChild(option)});
 var submit=make('button','hamlet-search-submit','Search');submit.type='submit';form.appendChild(paletteRouteSelect);form.appendChild(submit);dialog.appendChild(form);
 paletteStatus=make('div','hamlet-search-status');paletteStatus.setAttribute('role','status');paletteStatus.setAttribute('aria-live','polite');paletteStatus.hidden=true;dialog.appendChild(paletteStatus);
 form.addEventListener('submit',function(e){e.preventDefault();var q=paletteInput.value.trim(),target=paletteRouteSelect.value;if(!target){var path=currentPath(),current=routes.find(function(r){return r.paths.indexOf(path)!==-1&&r.href!=='/members.html'});if(current&&current.href!='/messages.html'){target=current.href}else{paletteStatus.textContent='Choose a workspace below or select one from the destination menu.';paletteStatus.hidden=false;paletteRouteSelect.focus();return}}location.href=withQuery(target,q)});
 var caption=make('div','hamlet-search-caption','Choose where to search');dialog.appendChild(caption);
 var list=make('div','hamlet-search-destinations');
 routes.filter(function(r){return r.href!=='/members.html'}).forEach(function(r){
   var a=make('a','hamlet-search-destination');a.href=r.href;a.dataset.base=r.href;
   var strong=make('strong','',r.label);var desc=make('span','',r.desc);a.appendChild(strong);a.appendChild(desc);
   a.addEventListener('click',function(e){var q=paletteInput.value.trim();paletteRouteSelect.value=r.href;paletteLinks.forEach(function(link){link.classList.toggle('is-selected',link===a);link.setAttribute('aria-current',link===a?'true':'false')});if(q){e.preventDefault();location.href=withQuery(r.href,q)}});
   list.appendChild(a);paletteLinks.push(a);
 });
 dialog.appendChild(list);paletteRouteSelect.addEventListener('change',function(){paletteLinks.forEach(function(link){var selected=link.dataset.base===paletteRouteSelect.value;link.classList.toggle('is-selected',selected);if(selected)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current')})});var hint=make('div','hamlet-search-hint','Press Esc to close · Ctrl/Command + K to open');dialog.appendChild(hint);
 palette.appendChild(dialog);palette.addEventListener('click',function(e){if(e.target===palette)closePalette()});document.body.appendChild(palette);
 document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette();return}
  if(e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette();return}
  if(!palette||palette.hidden)return;
  if(e.key==='Escape'){e.preventDefault();closePalette();return}
  if(e.key==='Tab'){var items=Array.from(palette.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')).filter(function(el){return !el.hidden});if(!items.length)return;var first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 });
}
function openPalette(){buildPalette();lastFocus=document.activeElement;previousBodyOverflow=document.body.style.overflow;palette.hidden=false;paletteInput.value='';paletteRouteSelect.value='';if(paletteStatus){paletteStatus.hidden=true;paletteStatus.textContent=''}paletteLinks.forEach(function(link){link.classList.remove('is-selected');link.removeAttribute('aria-current')});updatePaletteLinks();document.body.style.overflow='hidden';paletteInput.focus()}
function closePalette(){if(!palette||palette.hidden)return;palette.hidden=true;document.body.style.overflow=previousBodyOverflow;if(lastFocus&&typeof lastFocus.focus==='function')lastFocus.focus()}
function updatePaletteLinks(){var q=paletteInput?paletteInput.value.trim():'';paletteLinks.forEach(function(a){a.href=withQuery(a.dataset.base,q)})}
function prefillSearch(){
 var params=new URLSearchParams(location.search),q=(params.get('q')||params.get('search')||'').trim().slice(0,140);if(!q)return;
 var path=currentPath(),id=null;
 if(path==='/app/hamlet'||path==='/app/hamlet/index.html')id='searchDeals';
 else if(path==='/app/public/resources.html')id='propertySearch';
 else if(path==='/app/public/live.html')id='listingSearch';
 else if(path==='/directory.html')id='directorySearchInput';
 else if(path==='/posts.html')id='postSearch';
 else if(path==='/messages.html')id='conversationSearch';
 else if(path==='/archive.html')id='archiveSearch';
 if(id){var field=document.getElementById(id);if(field){field.value=q;field.setAttribute('data-hamlet-deep-search','true');field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}))}}
}
function initialise(){buildNav();buildPalette();prefillSearch()}
initialise();
})();
