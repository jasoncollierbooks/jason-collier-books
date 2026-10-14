/* Share, Like (heart) and star Rating for the Collier app.
   Server: CollierAuth.API  GET /reactions?ids=  POST /like {id,on}  POST /rate {id,stars}  (sign-in required to count).
   If the server isn't there yet (404/offline), likes and ratings are saved on this phone only and no public counts are shown. */
(function(){
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return (r||document).querySelectorAll(s)};
var SITE='https://collierentertainment.com/',A=window.CollierAuth,API=A&&A.API;
var ITEMS={ // key = data-play / data-frame value
 'ridge':{id:'ep-millers-ridge',t:"The Treasure of Miller's Ridge",u:SITE+'audiobooks.html#jang-and-tom-radio',rate:1},
 'possum':{id:'ep-possum-caper',t:'The Great Possum Caper',u:SITE+'audiobooks.html#great-possum-caper',rate:1},
 'icefish':{id:'ep-ice-fishin',t:"The Ice Fishin' Fiasco",u:SITE+'audiobooks.html#ice-fishin-fiasco',rate:1},
 'xmas':{id:'ep-xmas',t:'The Christmas Spectacle',u:SITE+'audiobooks.html#christmas-spectacle',rate:1},
 'checkers':{id:'ep-checkers',t:'The Checkers Championship',u:SITE+'audiobooks.html#checkers-championship',rate:1},
 'rocket':{id:'ep-rocket-stove',t:'The Rocket Stove Rebellion',u:SITE+'audiobooks.html#rocket-stove-rebellion',rate:1},
 'dogs':{id:'ab-dogs',t:'Dogs That Chose Me',u:SITE+'audiobooks.html#dogs-that-chose-me',rate:1},
 'oldman':{id:'ab-old-man',t:'Old Man On The Mountain (audiobook)',u:SITE+'audiobooks.html#old-man-audiobook',rate:1},
 'audiobooks.html#jang-and-tom':{id:'ab-jang-tom',t:'Jang & Tom audiobooks',u:SITE+'audiobooks.html#jang-and-tom',rate:1},
 'audiobooks.html#philadelphia-follies':{id:'ab-philly',t:'Jang & Tom: Philadelphia Follies',u:SITE+'audiobooks.html#philadelphia-follies',rate:1},
 'audiobooks.html#transcontinental':{id:'ab-transcon',t:'Jang & Tom: Transcontinental',u:SITE+'audiobooks.html#transcontinental',rate:1},
 'audiobooks.html#first-pulse':{id:'ab-first-pulse',t:'The First Pulse (audiobook)',u:SITE+'audiobooks.html#first-pulse',rate:1},
 'rusty-adventure.html':{id:'ab-rusty-adventure',t:'The Rusty Stack: Choose Your Own Adventure Audiobook',u:SITE+'rusty-adventure.html',rate:1},
 'past-inspirations.html':{id:'ep-past-inspirations',t:'Past Inspirations',u:SITE+'past-inspirations.html',rate:1},
 'old-man-game/':{id:'game-old-man-hunt',t:'Old Man Hunt',u:SITE+'old-man-game/',rate:1},
 'book-worlds/':{id:'game-book-worlds',t:'Book Worlds',u:SITE+'book-worlds/',rate:1},
 'i-spy.html':{id:'game-i-spy',t:'I Spy',u:SITE+'i-spy.html',rate:1},
 'https://kite-bolt-fleet-honey.grok.me/':{id:'game-jang-tom-hub',t:'Jang & Tom and The Rusty Stack games',u:SITE+'play.html',rate:1},
 'https://delta-branch-breeze-daisy.grok.me/':{id:'game-born-twice',t:'Born Twice',u:SITE+'thorne-lab.html',rate:1},
 'https://fern-valley-glow-reef.grok.me/':{id:'game-first-pulse',t:'The First Pulse game',u:SITE+'first-pulse.html',rate:1},
 'coloring.html':{id:'game-coloring',t:'Coloring',u:SITE+'coloring.html',rate:1}};
(window.CE_GAMES||[]).concat(window.CE_GAMES_MORE||[]).forEach(function(g){var ext=/^https?:/.test(g.url);ITEMS['game:'+g.id]=(!ext&&ITEMS[g.url])||{id:'game-'+g.id,t:g.t,u:ext?SITE+'play.html':SITE+g.url,rate:1}});
// Every shared link opens the APP (deep link /app/?open=...); without the app installed it still opens /app in the browser with the item open.
function appLink(o){return SITE+'app/'+(o?'?open='+encodeURIComponent(o):'')}
var GBYURL={};(window.CE_GAMES||[]).concat(window.CE_GAMES_MORE||[]).forEach(function(g){if(!GBYURL[g.url])GBYURL[g.url]=g.id});
Object.keys(ITEMS).forEach(function(k){ITEMS[k].u=appLink(k==='rusty-adventure.html'?'adventure:rusty':/^(ridge|possum|icefish|rocket|checkers|xmas|dogs|oldman)$/.test(k)?'play:'+k:/^game:/.test(k)?k:GBYURL[k]?'game:'+GBYURL[k]:'frame:'+k)});
var APP={id:'app',t:'Collier Entertainment',u:appLink(''),rate:1};
var BYID={};function reg(it){BYID[it.id]=it;return it}reg(APP);Object.keys(ITEMS).forEach(function(k){reg(ITEMS[k])});
var srv=null,data={},signedIn=function(){return !!(A&&A.status==='in')};
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){}}
function toast(m){window.CE&&CE.toast?CE.toast(m):0}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
// ---- state
function liked(id){var d=data[id];return srv&&signedIn()&&d?!!d.liked:ls('ce-like-'+id)==='1'}
function myStars(id){var d=data[id];return srv&&signedIn()&&d&&d.mine?d.mine:+(ls('ce-rate-'+id)||0)}
function likeCount(id){return srv&&data[id]?data[id].likes:null}
function rateInfo(id){return srv&&data[id]&&data[id].ratings?data[id]:null}
function fetchAll(){if(!API)return Promise.resolve();var ids=Object.keys(BYID);
 if(+(ls('ce-rx-off')||0)>Date.now()){srv=false;return Promise.resolve()}
 return fetch(API+'/reactions?ids='+ids.join(','),{credentials:'include',headers:A.headers?A.headers():{}}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){srv=true;data=j||{}}).catch(function(){srv=false;ls('ce-rx-off',Date.now()+6*3600e3)})}
function post(path,body){return fetch(API+path,{method:'POST',credentials:'include',headers:A.headers?A.headers({'Content-Type':'application/json'}):{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw r.status;return r.json()})}
function hint(){if(srv&&!signedIn())toast('Saved on this phone. Sign in to count your vote.');else if(!srv)toast('Saved on this phone.')}
function toggleLike(id){var on=!liked(id);ls('ce-like-'+id,on?'1':null);
 if(srv&&signedIn()){var d=data[id]=data[id]||{likes:0};d.liked=on;d.likes=Math.max(0,(d.likes||0)+(on?1:-1));paint();post('/like',{id:id,on:on}).then(function(j){d.likes=j.likes;d.liked=j.liked;paint()}).catch(function(){toast('Couldn\u2019t reach the server. Saved on this phone.')})}
 else{paint();if(on)hint()}}
function setRate(id,n){ls('ce-rate-'+id,String(n));
 if(srv&&signedIn()){post('/rate',{id:id,stars:n}).then(function(j){data[id]=Object.assign(data[id]||{},j);paint();toast('Thanks for rating!')}).catch(function(){toast('Saved on this phone.')})}
 else{paint();if(srv)toast('Thanks! Saved on this phone. Sign in to count your vote.');else toast('Thanks! Your rating is saved on this phone.')}}
// ---- share
function shareText(it){var v=it.id==='app'?'Watch':/^(ep|ab)-/.test(it.id)?'Listen to':/^game-/.test(it.id)?'Play':it.id==='studio'?'Paint in':/^art-/.test(it.id)?'See':'Check out';return it.id==='app'?'Watch Jang & Tom on Collier Entertainment':v+' '+it.t+' on Collier Entertainment'}
function share(it){var d={title:it.t,text:shareText(it),url:it.u};
 if(navigator.share){navigator.share(d).catch(function(){});return}
 var done=function(){toast('Link copied')};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(it.u).then(done,function(){fallback(it.u)&&done()});else if(fallback(it.u))done();else toast(it.u)}
function fallback(t){try{var x=document.createElement('textarea');x.value=t;x.setAttribute('readonly','');x.style.position='fixed';x.style.opacity='0';document.body.appendChild(x);x.select();var ok=document.execCommand('copy');x.remove();return ok}catch(e){return false}}
// ---- ui bits
function heartHTML(id){return '<span class="rx-heart" role="button" tabindex="0" data-rx-like="'+id+'" aria-label="Like"></span>'}
function starsHTML(id){var h='<span class="rx-stars" data-rx-stars="'+id+'" role="group" aria-label="Rate 1 to 5 stars">';for(var i=1;i<=5;i++)h+='<span role="button" tabindex="0" data-rx-star="'+i+'" aria-label="'+i+' star'+(i>1?'s':'')+'">\u2605</span>';return h+'</span><small class="rx-avg" data-rx-avg="'+id+'"></small>'}
function paint(){
 $$('[data-rx-like]').forEach(function(e){var id=e.dataset.rxLike,on=liked(id),c=likeCount(id);e.classList.toggle('on',on);e.setAttribute('aria-pressed',on);e.innerHTML='<i>'+(on?'\u2665':'\u2661')+'</i>'+(c!=null?'<b>'+c+'</b>':'')});
 $$('[data-rx-stars]').forEach(function(e){var m=myStars(e.dataset.rxStars);$$('[data-rx-star]',e).forEach(function(s){s.classList.toggle('on',+s.dataset.rxStar<=m)})});
 $$('[data-rx-avg]').forEach(function(e){var r=rateInfo(e.dataset.rxAvg),m=myStars(e.dataset.rxAvg);e.textContent=r?'\u2605 '+r.avg.toFixed(1)+' \u00b7 '+r.ratings+(r.ratings===1?' rating':' ratings'):(m?'Your rating':'Tap to rate')});
 $$('[data-rx-chip]').forEach(function(e){var id=e.dataset.rxChip,r=rateInfo(id),m=myStars(id);e.textContent=r?'\u2605 '+r.avg.toFixed(1)+' ('+r.ratings+')':(m?'\u2605 '+m:'\u2606 Rate')});}
// rows on posters, list items and cards
function decorate(){
 $$('[data-play],[data-frame]').forEach(function(b){if(b.dataset.rxDone||!b.matches('.poster,.item,.card,.gcard'))return;var key=b.dataset.rxKey||b.dataset.play||b.dataset.frame,it=ITEMS[key],art=null;
  if(!it&&b.closest('#art')){var im=$('img',b),n=(im&&im.getAttribute('src')||'').replace(/.*\/|-thumb\.jpg$/g,'');if(!n)return;it=reg({id:'art-'+n,t:(im.alt||n),u:appLink('frame:art.html')});art=1}
  if(!it)return;b.dataset.rxDone=1;
  var row='<span class="rx-row">'+heartHTML(it.id)+(it.rate?'<span class="rx-chip" role="button" tabindex="0" data-rx-open="'+it.id+'" data-rx-chip="'+it.id+'"></span>':'')+'<span class="rx-share" role="button" tabindex="0" data-rx-share="'+it.id+'" aria-label="Share">\u2934 Share</span></span>';
  var host=b.matches('.item,.gcard')?$('div',b):b;host.insertAdjacentHTML('beforeend',row)})}
// detail sheet (rating + like + share)
var sheet=document.createElement('div');sheet.id='rxSheet';sheet.className='rx-sheet';sheet.hidden=true;document.body.appendChild(sheet);
function openSheet(id,opts){var it=BYID[id];if(!it)return;opts=opts||{};
 sheet.innerHTML='<div class="rx-card" role="dialog" aria-modal="true" aria-label="Rate '+esc(it.t)+'"><button class="rx-x" data-rx-close aria-label="Close">\u2715</button><small class="rx-kicker">'+(opts.kicker||'RATE &amp; SHARE')+'</small><h3>'+esc(it.t)+'</h3>'+(opts.msg?'<p>'+opts.msg+'</p>':'')+'<div class="rx-big">'+starsHTML(id)+'</div><div class="rx-acts">'+(id==='app'?'':heartHTML(id))+'<button class="rx-btn" data-rx-share="'+id+'">\u2934 Share</button></div>'+
 (srv===true&&!signedIn()?'<p class="rx-note">Your vote is saved on this phone. <button class="rx-link" data-frame="account.html" data-title="Account" data-rx-close>Sign in</button> to count it.</p>':(srv===false?'<p class="rx-note">Saved on this phone for now. Saved on this phone.</p>':''))+
 (opts.later?'<div class="rx-later"><button class="rx-btn ghost" data-rx-close>Not now</button><button class="rx-btn ghost" data-rx-never>Don\u2019t ask again</button></div>':'')+'</div>';
 sheet.hidden=false;paint()}
function closeSheet(){sheet.hidden=true;sheet.innerHTML=''}
// player row
function playerRow(){var c=$('#player .ctl2');if(!c||$('#rxPl'))return;c.insertAdjacentHTML('afterend','<div class="rx-pl" id="rxPl"></div>')}
function playerSet(k){playerRow();var it=ITEMS[k],r=$('#rxPl');if(!r)return;if(!it){r.innerHTML='';return}r.innerHTML=heartHTML(it.id)+'<span class="rx-plstars">'+starsHTML(it.id)+'</span><span class="rx-share" role="button" tabindex="0" data-rx-share="'+it.id+'" aria-label="Share">\u2934 Share</span>';paint()}
// home share + studio share
function extras(){var cta=$('.club-cta');if(cta&&!$('#rxApp'))cta.insertAdjacentHTML('beforebegin','<div class="rx-appbar" id="rxApp"><div><b>Enjoying Collier Entertainment?</b><span>Tell a friend or leave a rating.</span></div><button class="rx-btn" data-rx-share="app">\u2934 Share app</button><button class="rx-btn ghost" data-rx-open="app">\u2606 Rate</button></div>');
 var sc=$('#studio .studio-card');if(sc&&!$('#rxStudio')){reg({id:'studio',t:'the Collier Oil Studio',u:appLink('tab:studio')});reg({id:'art-painting-lighthouse-at-dusk',t:'Lighthouse at Dusk by Jason Collier',u:appLink('frame:art.html')});
  $('#openStudio',sc).insertAdjacentHTML('afterend','<div class="rx-row big" id="rxStudio">'+heartHTML('art-painting-lighthouse-at-dusk')+'<span class="rx-share" role="button" tabindex="0" data-rx-share="studio">\u2934 Share the studio</span></div>')}}
// events (capture, so the card itself doesn't open)
function act(e){var t=e.target.closest&&e.target.closest('[data-rx-like],[data-rx-star],[data-rx-share],[data-rx-open],[data-rx-close],[data-rx-never]');
 if(!t){if(e.target===sheet)closeSheet();return}
 if(t.hasAttribute('data-rx-close')&&t.dataset.frame){closeSheet();return} // let the app open sign-in
 e.preventDefault();e.stopPropagation();
 if(t.dataset.rxLike)toggleLike(t.dataset.rxLike);
 else if(t.dataset.rxStar){var g=t.closest('[data-rx-stars]').dataset.rxStars;setRate(g,+t.dataset.rxStar);if(g==='app'){ls('ce-rateapp','done');if(!sheet.hidden)setTimeout(closeSheet,900)}}
 else if(t.dataset.rxShare)share(BYID[t.dataset.rxShare]);
 else if(t.dataset.rxOpen)openSheet(t.dataset.rxOpen);
 else if(t.hasAttribute('data-rx-never')){ls('ce-rateapp','never');closeSheet()}
 else if(t.hasAttribute('data-rx-close')){if(sheet.querySelector('.rx-later'))ls('ce-rateapp-snooze',String(visits+10));closeSheet()}}
document.addEventListener('click',act,true);
document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[role=button][data-rx-like],[role=button][data-rx-star],[role=button][data-rx-share],[role=button][data-rx-open]')){act(e)}if(e.key==='Escape'&&!sheet.hidden)closeSheet()},true);
// "Rate this app" prompt: after finishing an episode or on the 3rd visit; never twice in one visit, snoozes 10 visits, "Don't ask again" is final
var visits=+(ls('ce-visits')||0)+1;ls('ce-visits',String(visits));var asked=false;
function maybeAsk(why){var s=ls('ce-rateapp');if(asked||s==='done'||s==='never'||visits<+(ls('ce-rateapp-snooze')||0))return;if(why!=='ended'&&visits<3)return;
 if(!$('#player').hidden&&why!=='ended')return;if(document.querySelector('.jc-break'))return;asked=true;openSheet('app',{kicker:'RATE THIS APP',msg:'Having fun in Pine Knot? A quick star rating helps a lot.',later:1})}
if(window.CE&&CE.au)CE.au.addEventListener('ended',function(){setTimeout(function(){maybeAsk('ended')},1500)});
setTimeout(function(){if($('#frame').hidden)maybeAsk('visit')},45000);
// hook player track changes
if(window.CE){var ot=CE.onTrack;CE.onTrack=function(k,t){ot&&ot.apply(this,arguments);playerSet(k)};var c=CE.cur&&CE.cur();if(c)playerSet(c)}
decorate();extras();paint();
new MutationObserver(function(){decorate()}).observe($('#app'),{childList:true,subtree:true});
fetchAll().then(paint);
if(A&&A.onChange)A.onChange(function(){if(srv)fetchAll().then(paint);else paint()});
window.CESocial={appLink:appLink,items:BYID,shareText:shareText,share:share,openSheet:openSheet,state:function(){return {server:srv,data:data}}};
})();
