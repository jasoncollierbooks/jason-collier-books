/* "Add to Home Screen" for the Collier app.
   CEA2HS.mount(el) puts a small gold pill (with a dismiss ×) into el, unless the app already runs from the home screen
   or the visitor dismissed it. Android/Chrome: one tap opens the install prompt. iPhone Safari: a 2-step picture guide. */
(function(){
var KEY='ce-a2hs',deferred=null,ua=navigator.userAgent||'';
var ios=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
var ipad=/ipad/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
var inApp=/FBAN|FBAV|FB_IAB|Instagram|Twitter|TwitterAndroid|Line\/|LinkedInApp|Snapchat|TikTok|GSA\//i.test(ua);
var iosOther=ios&&/CriOS|FxiOS|EdgiOS/i.test(ua);
function standalone(){return navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){}}
var pills=[];
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;pills.forEach(function(p){p.hidden=false})});
window.addEventListener('appinstalled',function(){ls(KEY,'installed');pills.forEach(function(p){p.remove()});close()});
var sheet=null;
function close(){if(sheet){sheet.remove();sheet=null;document.removeEventListener('keydown',esc,true)}}
function esc(e){if(e.key==='Escape')close()}
var SHARE='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
var PLUS='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function open(){close();var body;
 if(inApp)body='<h3>Open in Safari first</h3><p>This app can\u2019t be added from inside another app\u2019s browser.</p><ol class="a2-steps"><li><span class="a2-ico">\u22EF</span><span>Tap the <b>\u22EF</b> or <b>Share</b> menu and choose <b>Open in '+(ios?'Safari':'browser')+'</b>.</span></li><li><span class="a2-ico">'+PLUS+'</span><span>Then come back here and tap <b>Add to Home Screen</b>.</span></li></ol>';
 else if(ios)body='<h3>Add Collier to your Home Screen</h3><ol class="a2-steps"><li><span class="a2-ico">'+SHARE+'</span><span>Tap the <b>Share</b> button '+(ipad?'at the <b>top right</b>':'at the <b>bottom</b>')+' of '+(iosOther?'your browser':'Safari')+'.</span></li><li><span class="a2-ico">'+PLUS+'</span><span>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</span></li></ol><p class="a2-note">It opens full screen like an app, and shows keep playing with the screen locked.</p>';
 else body='<h3>Add Collier to your Home Screen</h3><ol class="a2-steps"><li><span class="a2-ico">\u22EE</span><span>Open your browser menu <b>\u22EE</b>.</span></li><li><span class="a2-ico">'+PLUS+'</span><span>Tap <b>Install app</b> or <b>Add to Home screen</b>.</span></li></ol>';
 sheet=document.createElement('div');sheet.className='a2-sheet'+(ios&&!ipad&&!inApp?' a2-bottom':'')+(ipad&&!inApp?' a2-top':'');
 sheet.innerHTML='<div class="a2-card" role="dialog" aria-modal="true" aria-label="Add to Home Screen"><button class="a2-x" aria-label="Close">\u2715</button><img class="a2-icon" src="'+ICON+'" alt="">'+body+'<button class="a2-ok">Got it</button></div>'+(ios&&!inApp?'<div class="a2-arrow" aria-hidden="true">\u2B07</div>':'');
 sheet.addEventListener('click',function(e){if(e.target===sheet||e.target.closest('.a2-x,.a2-ok'))close()});
 document.body.appendChild(sheet);document.addEventListener('keydown',esc,true);sheet.querySelector('.a2-x').focus()}
var ICON='/app/icons/icon-180.png';
function tap(){if(deferred){var d=deferred;deferred=null;d.prompt();(d.userChoice||Promise.resolve({})).then(function(c){if(c.outcome==='accepted')ls(KEY,'installed')});return}open()}
function mount(el,opt){opt=opt||{};if(!el||standalone()||ls(KEY))return null;
 var w=document.createElement('span');w.className='a2-pill-wrap';
 w.innerHTML='<button class="a2-pill" type="button">'+PLUS+'<span>'+(opt.label||'Add to Home Screen')+'</span></button><button class="a2-dismiss" type="button" aria-label="Don\u2019t show again">\u2715</button>';
 w.querySelector('.a2-pill').onclick=tap;
 w.querySelector('.a2-dismiss').onclick=function(){ls(KEY,'x');w.remove()};
 if(!ios&&!deferred&&opt.needPrompt)w.hidden=true; // non-iOS: show only once the browser says it can install
 el.appendChild(w);pills.push(w);return w}
window.CEA2HS={mount:mount,open:open,standalone:standalone};
})();
