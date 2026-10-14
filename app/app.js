(function(){
var $=function(s){return document.querySelector(s)},$$=function(s){return document.querySelectorAll(s)};
var R='../';
var BOOKS=[
 {t:'Jang & Tom: Wagon Masters',img:'images/jang-and-tom-wagon-masters.jpg',buy:'https://www.amazon.com/dp/B0HFCF11YP',page:'jang-and-tom.html'},
 {t:'The First Pulse',img:'images/the-first-pulse.jpg',buy:'https://www.amazon.com/dp/B0GD4W3159',page:'first-pulse.html'},
 {t:'Old Man On The Mountain',img:'images/old-man-on-the-mountain.jpg',buy:'https://www.amazon.com/dp/B0HDJWYNNJ',page:'old-man-on-the-mountain.html'},
 {t:'The Rusty Stack',img:'images/the-rusty-stack.jpg',page:'rusty-stack.html',soon:1}];
var ART=['painting-lighthouse-at-dusk','painting-autumn-hillside','painting-wildflower-meadow','sketch-longhorn-in-the-grass','sketch-the-raven','sketch-the-wanderer'];
// ===== EPISODE 1 AUDIO SLOT =====
// When the fixed Episode 1 ("Jang" / "Collier" fixes) is ready, change ONLY these values:
//   src  = path to the new mp3, len = its length as m:ss, secs = its length in seconds.
// Everything on the page (hero, cards, Listen list, channel guide) reads from here.
// If the new cut moves things around, also update the chapter times (ch) below and app/captions.json.
var EP1={src:R+'media/jang-tom-millers-ridge.mp3',len:'16:49',secs:1009};
window.CE_EP1=EP1;
var TRACKS={
 ridge:{t:"The Treasure of Miller's Ridge",s:'Jang & Tom · radio show · '+EP1.len,src:EP1.src,art:R+'images/jang-tom-millers-ridge.jpg',ep:1,
  credit:'Music by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0',
  ch:[[0,'Cold open'],[30,'Pine Knot intro'],[114,'Sponsor: I Spy'],[144,'The napkin map & Over Yonder'],[218,'Hugh / Nobody cooks'],[335,"Up Miller's Ridge"],[461,'Loafing'],[527,'The groundhog'],[585,'Old Man Jenkins'],[701,'Sponsor break'],[842,'Treasure on the log'],[888,'Sponsor: The First Pulse'],[935,'Goodnight, Pine Knot']]},
 possum:(function(){var e=CE_SHOWS.jangtom.episodes[1];return {t:e.t,s:'Jang & Tom · radio show · Episode 2 · '+e.len,src:R+e.src,art:R+e.art,ep:2,credit:CE_SHOWS.jangtom.credit,ch:e.ch}})(),
 icefish:(function(){var e=CE_SHOWS.jangtom.episodes[2];return {t:e.t,s:'Jang & Tom · radio show · Episode 3 · '+e.len,src:R+e.src,art:R+e.art,ep:3,credit:CE_SHOWS.jangtom.credit,ch:e.ch}})(),
 checkers:(function(){var e=CE_SHOWS.jangtom.episodes[4];return {t:e.t,s:'Jang & Tom · radio show · Episode 5 · '+e.len,src:R+e.src,art:R+e.art,ep:5,credit:CE_SHOWS.jangtom.credit,ch:e.ch}})(),
 xmas:(function(){var e=CE_SHOWS.jangtom.episodes[5];return {t:e.t,s:'Jang & Tom · radio show · Episode 6 · '+e.len,src:R+e.src,art:R+e.art,ep:6,credit:CE_SHOWS.jangtom.credit,ch:e.ch}})(),
 rocket:(function(){var e=CE_SHOWS.jangtom.episodes[3];return {t:e.t,s:'Jang & Tom · radio show · Episode 4 · '+e.len,src:R+e.src,art:R+e.art,ep:4,credit:CE_SHOWS.jangtom.credit,ch:e.ch}})(),
 dogs:{t:CE_DOGS.t,s:'Audiobook · Jason Collier · '+CE_DOGS.len,src:R+CE_DOGS.src,art:R+CE_DOGS.art,ch:CE_DOGS.ch},
 thorne:{t:"Thorne's Lab Journal",s:'Dr. Thorne reads the research log · 54:48',src:R+'media/thorne-lab-journal.mp3',art:R+'images/lab/born-twice-og.jpg'},
 oldman:{t:'Old Man On The Mountain',s:'Audiobook · Part 1',src:R+'old-man-audiobook/audio/om01.m4a',art:R+'images/old-man-on-the-mountain.jpg'}};
var esc=function(s){return s.replace(/&/g,'&amp;')};
// Books + art
document.querySelectorAll('.ep1-len').forEach(function(e){e.textContent=EP1.len});
$('#books').innerHTML=BOOKS.map(function(b){return b.soon?'<span class="bk"><img src="'+R+b.img+'" alt="">'+esc(b.t)+'</span>':'<a class="bk" target="_blank" rel="noopener" href="'+b.buy+'"><img loading="lazy" src="'+R+b.img+'" alt="">'+esc(b.t)+'</a>'}).join('');
$('#art').innerHTML=ART.map(function(a){return '<button class="poster sq" data-frame="art.html" data-title="Art"><img loading="lazy" src="'+R+'images/jason-art/'+a+'-thumb.jpg" alt="'+a.replace(/^(painting|sketch)-/,'').replace(/-/g,' ')+' by Jason Collier"><b>'+a.replace(/^(painting|sketch)-/,'').replace(/-/g,' ')+'</b></button>'}).join('');
function item(img,t,s,attrs){return '<button class="item" '+attrs+'><img loading="lazy" src="'+img+'" alt=""><div><b>'+esc(t)+'</b><span>'+s+'</span></div><span class="go">›</span></button>'}
$('#listenList').innerHTML=
 item(R+'images/jang-tom-millers-ridge.jpg',"The Treasure of Miller's Ridge",'Jang & Tom radio show · '+EP1.len+' · chapters & listen-along','data-play="ridge"')+
 item(R+'images/jang-tom-possum-caper.jpg','The Great Possum Caper','Jang & Tom radio show · Episode 2 · 18:21 · chapters','data-play="possum"')+
 item(R+'images/jang-tom-ice-fishin.jpg',"The Ice Fishin' Fiasco",'Jang & Tom radio show · Episode 3 · 14:02 · chapters','data-play="icefish"')+
 item(R+'images/jang-tom-rocket-stove.jpg','The Rocket Stove Rebellion','Jang & Tom radio show · Episode 4 · 13:36 · chapters','data-play="rocket"')+
 item(R+'images/jang-tom-checkers.jpg','The Checkers Championship','Jang & Tom radio show · Episode 5 · 13:34 · chapters','data-play="checkers"')+
 item(R+'images/jang-tom-christmas-spectacle.jpg','The Christmas Spectacle','Jang & Tom radio show · Episode 6 · 13:28 · new · chapters','data-play="xmas"')+
 item('media/jang-tom-tv.jpg','Jang & Tom Radio Hour','All episodes · the Collier Radio Hour','data-go="jangtom"')+
 item(R+'images/the-rusty-stack.jpg','The Rusty Stack: Choose Your Own Adventure','Audiobook · you choose what happens next · 8 endings','data-frame="rusty-adventure.html" data-title="The Rusty Stack Adventure"')+
 item(R+'images/dogs/cover-thumb.jpg','Dogs That Chose Me','Audiobook · a short story by Jason Collier · 9:33 · chapters','data-play="dogs"')+
 item(R+'images/old-man-on-the-mountain.jpg','Old Man On The Mountain','Audiobook · app player','data-play="oldman"')+
 item(R+'images/lab/born-twice-og.jpg',"Thorne's Lab Journal",'Dr. Thorne reads all 8 entries · 54:48','data-play="thorne"')+
 item(R+'images/jang-and-tom-wagon-masters.jpg','Jang & Tom audiobooks','Wagon Masters, Philadelphia Follies, Transcontinental','data-frame="audiobooks.html#jang-and-tom" data-title="Jang & Tom"')+
 item(R+'images/the-first-pulse.jpg','The First Pulse','Audiobook · Chapters One & Two in seven parts','data-frame="audiobooks.html#first-pulse" data-title="The First Pulse"')+
 item(R+'images/art/philly-s01.jpg','Past Inspirations','Old-time radio and inspirations','data-frame="past-inspirations.html" data-title="Past Inspirations"');
function card(img,t,s,f){return '<button class="card" data-frame="'+f+'" data-title="'+esc(t)+'"><img loading="lazy" src="'+img+'" alt=""><b>'+esc(t)+'</b><span>'+s+'</span></button>'}
// Play tab: the same games as the website's Play page, read from ../games.js (CE_GAMES + the More row)
var PLAY=(window.CE_GAMES||[]).map(function(g){return [g.t,g.k,g.url,R+'images/games/'+g.id+'.jpg',g.d,g.id]}).concat((window.CE_GAMES_MORE||[]).map(function(g){return [g.t,g.k,g.url,R+g.img,g.d,g.id]}));
$('#playList').innerHTML=PLAY.map(function(g){return '<button class="gcard" data-rx-key="game:'+g[5]+'" data-frame="'+g[2]+'" data-title="'+esc(g[0])+'"><img loading="lazy" src="'+g[3]+'" alt=""><div><small>'+esc(g[1])+'</small><b>'+esc(g[0])+'</b><span>'+esc(g[4])+'</span><i class="gplay">\u25B6 '+(/short/.test(g[5])?'Watch':/studio|lab/.test(g[5])?'Open':'Play')+'</i></div></button>'}).join('');
$('#playList').className='glist';
// Home Play row: the same full list and order as the Play tab, then See all
(function(){var hp=document.getElementById('homePlay');if(!hp)return;hp.innerHTML=PLAY.map(function(g){return '<button class="poster wide" data-rx-key="game:'+g[5]+'" data-frame="'+g[2]+'" data-title="'+esc(g[0])+'"><img loading="lazy" src="'+g[3]+'" alt=""><b>'+esc(g[0])+'</b><span>'+esc(g[1])+'</span></button>'}).join('')+'<button class="poster wide seeall" data-go="play"><b>See all \u203A</b><span>'+PLAY.length+' games &amp; more</span></button>'})();
$('#readList').innerHTML=BOOKS.map(function(b){return item(R+b.img,b.t,b.page==='rusty-stack.html'?'About the book & the adventure audiobook':'Book page, chapters & audiobook','data-frame="'+b.page+'" data-title="'+esc(b.t)+'"')+(b.page==='rusty-stack.html'?item(R+'images/rusty-cyoa/s01.jpg?v=3','The Rusty Stack: Choose Your Own Adventure','Audiobook · you choose what happens next · 8 endings','data-frame="rusty-adventure.html" data-title="The Rusty Stack Adventure"'):'')}).join('')+item(R+'images/icons/typewriter.svg','The Novel','The multi-mind novel, read in the app','data-frame="novel.html" data-title="The Novel"');
// tabs
var cur='home';
function go(id){if(!document.getElementById(id))return;$$('.screen').forEach(function(s){s.classList.toggle('active',s.id===id)});$$('.tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.go===id)});cur=id;history.replaceState(null,'','#'+id)}
// frame
var fr=$('#fr');
// in-app pages get ?app=1 so app-mode.js opens outside links in the browser and hides the Venmo tip
function appUrl(u){var i=u.indexOf('#'),h=i<0?'':u.slice(i),p=i<0?u:u.slice(0,i);return p+(p.indexOf('?')<0?'?':'&')+'app=1'+h}
function openFrame(u,t){fr.src=/^https?:\/\//.test(u)?u:R+appUrl(u);$('#fTitle').textContent=t||'';$('#fSave').hidden=u.indexOf('studio')!==0;$('#frame').hidden=false;if(!au.paused)au.pause()}
$('#fClose').onclick=function(){$('#frame').hidden=true;fr.src='about:blank'};
var FULLK='ce-full-studio-day';function today(){return new Date().toDateString()}
function fullStudio(){return isSub()||localStorage.getItem(FULLK)===today()}
function tierUI(){var t=$('#studioTier');if(isSub())t.innerHTML='<b>Pine Knot Club:</b> full studio unlocked.';else if(fullStudio())t.innerHTML='<b>Free taste:</b> full studio unlocked for today.';else t.innerHTML='<b>Free:</b> basic brushes and the starter palette. Half-mix, the hand drawer, 72 colors and Save to Photos come with the Pine Knot Club, free with sign-in.<br><button id="tryFull">Try the full studio free today</button> <button data-frame="account.html" data-title="Account">Join free</button>';var tb=$('#tryFull');if(tb)tb.onclick=function(){localStorage.setItem(FULLK,today());tierUI();toast('Full studio unlocked for today');openFrame('studio.html','Oil Studio')}}
$('#openStudio').onclick=function(){openFrame('studio.html','Oil Studio')};
fr.addEventListener('load',function(){try{var d=fr.contentDocument;if(!d||!d.getElementById('studio-canvas')||fullStudio())return;var st=d.createElement('style');st.textContent='.ce-club{position:relative;opacity:.55}.ce-club::after{content:"CLUB";position:absolute;top:-6px;right:-4px;background:#c9a227;color:#1a140d;font:800 9px sans-serif;padding:2px 4px;border-radius:4px;opacity:1}';d.head.appendChild(st);
var sel=['#studio-half','#studio-colors-open','#studio-hand > summary'];sel.forEach(function(q){var x=d.querySelector(q);if(x)x.classList.add('ce-club')});
d.addEventListener('click',function(ev){if(ev.target.closest&&ev.target.closest('.ce-club')){ev.preventDefault();ev.stopPropagation();$('#frame').hidden=true;fr.src='about:blank';go('club');toast('Pine Knot Club feature: join free, just sign in')}},true)}catch(e){}});
$('#fSave').onclick=function(){if(!fullStudio()){toast('Save to Photos comes with the Pine Knot Club, free with sign-in. Try the full studio free today.');return}try{var c=fr.contentDocument.getElementById('studio-canvas');c.toBlob(function(bl){var f=new File([bl],'my-oil-painting.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:'My oil painting'}).catch(function(){})}else{var a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=f.name;a.click();toast('Painting saved')}})}catch(e){toast('Open a painting first')}};
document.addEventListener('click',function(e){var el=e.target.closest('[data-club],[data-go],[data-play],[data-frame]');if(!el)return;if(el.dataset.club||el.dataset.frame==='#club'){go('club');return}
 if(el.dataset.go)go(el.dataset.go);else if(el.dataset.play)load(el.dataset.play,true);else openFrame(el.dataset.frame,el.dataset.title)});
// toast
var tt;function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show')},2400)}

// player
var au=$('#au'),curT=null,speeds=[1,1.25,1.5,2,0.75],si=0;
function fmt(s){s=Math.floor(s||0);return Math.floor(s/60)+':'+('0'+s%60).slice(-2)}
function load(k,open,off){var t=TRACKS[k];if(curT!==k){var pos=+(localStorage.getItem('ce-pos-'+k)||0);au.addEventListener('loadedmetadata',function f(){au.removeEventListener('loadedmetadata',f);if(off!=null)au.currentTime=off;else if(pos>5&&pos<au.duration-10)au.currentTime=pos},{once:true});curT=k;au.src=t.src;au.playbackRate=speeds[si];$('#plTitle').textContent=$('#miniT').textContent=t.t;$('#plSub').textContent=$('#miniS').textContent=t.s;$('#plArt').src=$('#mini img').src=t.art;window.CE&&CE.onTrack&&CE.onTrack(k,t);
 if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:t.t,artist:'Collier Entertainment',album:t.s,artwork:[{src:new URL(t.art,location).href,sizes:'512x512',type:'image/jpeg'}]})}dlState()}
 else if(off!=null)au.currentTime=off;$('#mini').hidden=false;if(open)$('#player').hidden=false;au.play().catch(function(){})}
function pp(){au.paused?au.play():au.pause()}
$('#pp').onclick=pp;$('#miniPP').onclick=pp;$('#mini').addEventListener('click',function(e){if(e.target.id!=='miniPP')$('#player').hidden=false});
$('#plClose').onclick=function(){$('#player').hidden=true};
function skip(d){au.currentTime=Math.max(0,Math.min((au.duration||0),au.currentTime+d))}
$('#b15').onclick=function(){skip(-15)};$('#f30').onclick=function(){skip(30)};
$('#speed').onclick=function(){si=(si+1)%speeds.length;au.playbackRate=speeds[si];this.textContent=speeds[si]+'×'};
var seeking=false;$('#seek').oninput=function(){seeking=true;$('#tCur').textContent=fmt(this.value/1000*au.duration)};$('#seek').onchange=function(){au.currentTime=this.value/1000*(au.duration||0);seeking=false};
au.ontimeupdate=function(){if(!seeking&&au.duration){$('#seek').value=au.currentTime/au.duration*1000;$('#tCur').textContent=fmt(au.currentTime)}};
au.onloadedmetadata=function(){$('#tDur').textContent=fmt(au.duration)};
au.onplay=au.onpause=function(){var s=au.paused?'▶':'❚❚';$('#pp').textContent=$('#miniPP').textContent=s};
if('mediaSession' in navigator){var ms=navigator.mediaSession;ms.setActionHandler('play',function(){au.play()});ms.setActionHandler('pause',function(){au.pause()});ms.setActionHandler('seekbackward',function(){skip(-15)});ms.setActionHandler('seekforward',function(){skip(30)});try{ms.setActionHandler('seekto',function(d){au.currentTime=d.seekTime})}catch(e){}}
// offline download
var AC='collier-audio-v1';
function dlState(){var b=$('#dl');if(!('caches' in window)){b.hidden=true;return}caches.open(AC).then(function(c){return c.match(new URL(TRACKS[curT].src,location).href)}).then(function(r){b.innerHTML=r?'✓ Downloaded':(isSub()?'⬇ Download for offline':'⬇ Download <em class="lockhint">🔒 free with sign-in</em>')})}
$('#dl').onclick=function(){if(!isSub()){$('#player').hidden=true;go('club');toast('Offline downloads come with the Pine Knot Club. Join free, just sign in.');return}var b=this,u=new URL(TRACKS[curT].src,location).href;b.textContent='Downloading…';caches.open(AC).then(function(c){return c.add(u)}).then(function(){b.textContent='✓ Downloaded';toast('Saved for offline listening')}).catch(function(){b.textContent='⬇ Download for offline';toast('Download failed')})};
// commercials (free tier): reuse the site's break system; Club preview turns it off
var SUBK='ce-app-subscriber';try{var qd=new URLSearchParams(location.search).get('dev');if(qd==='1')localStorage.setItem('ce-dev','1');else if(qd==='0'){localStorage.removeItem('ce-dev');localStorage.removeItem(SUBK)}}catch(e){}
function isDev(){try{return localStorage.getItem('ce-dev')==='1'}catch(e){return false}}
// Pine Knot Club is free: signed in = member. (Dev-only test toggle behind ?dev=1.)
function isSub(){var A=window.CollierAuth;if(A&&A.status==='in')return true;try{if(isDev()&&localStorage.getItem(SUBK)==='1')return true;if((!A||A.status==='loading')&&+(localStorage.getItem('ce-member')||0)>Date.now())return true}catch(e){}return false}
var st=$('#subToggle');$('#devToggle').hidden=!isDev();st.checked=isDev()&&localStorage.getItem(SUBK)==='1';st.onchange=function(){try{localStorage.setItem(SUBK,st.checked?'1':'0')}catch(e){}toast(st.checked?'Dev: member mode':'Dev: free mode');if(!st.checked)loadBreaks();tierUI()};
function loadBreaks(){if(window.JCBreaks||document.getElementById('cbjs'))return;var s=document.createElement('script');s.id='cbjs';s.src='../commercials.js?v=56';document.body.appendChild(s)}
function breakNow(){if(window.CE&&CE.clubSpot&&CE.clubSpot())return true;if(!window.JCBreaks)return false;var ids=Object.keys(JCBreaks.spots);var was=!au.paused;au.pause();var fw=null,fm=[];try{if(!$('#frame').hidden){fw=fr.contentWindow;if(fw.__oldman)fw.__oldman.holdSim(true);fw.document.querySelectorAll('audio,video').forEach(function(m){if(!m.paused){m.pause();fm.push(m)}})}}catch(e){}JCBreaks.open(ids[Math.floor(Math.random()*ids.length)]);var w=setInterval(function(){if(!window.__jcBreakHold&&!document.querySelector('.jc-break, [class*=break-overlay]')){clearInterval(w);try{if(fw&&fw.__oldman)fw.__oldman.holdSim(false);fm.forEach(function(m){m.play().catch(function(){})})}catch(e){}if(was)au.play().catch(function(){})}},700);setTimeout(function(){},0);return true}
// Club members (signed in): a break about every 8-10 min; free: every 5-6 min
function gap(){return isSub()?480000+Math.random()*120000:300000+Math.random()*60000}
var useMs=0,nextAt=gap(),lastT=Date.now();
setInterval(function(){var n=Date.now(),busy=true;if(busy&&document.visibilityState==='visible')useMs+=n-lastT;if(isSub()&&nextAt<480000)nextAt=gap();else if(!isSub()&&nextAt>=480000)nextAt=gap();lastT=n;if(useMs>=nextAt){if(breakNow()){useMs=0;nextAt=gap()}}},1000);
au.addEventListener('ended',function(){if(!isSub())breakNow()});
var _load=load;load=function(k,o,f){if(curT&&curT!==k&&!au.paused){au.pause()}_load(k,o,f)};
loadBreaks();window.__ceBreak=breakNow;tierUI();
function clubRefresh(){tierUI();document.documentElement.classList.toggle('ce-member',isSub());window.CE&&CE.onClub&&CE.onClub()}
if(window.CollierAuth)CollierAuth.onChange(clubRefresh);
window.CE={au:au,load:load,go:go,toast:toast,isSub:isSub,TRACKS:TRACKS,cur:function(){return curT},frame:openFrame};
// boot
// SW: check for a new version on every load; when a new one takes over, reload once so fresh CSS/JS are used
if('serviceWorker' in navigator){var hadSW=!!navigator.serviceWorker.controller,swReloaded=false;
 navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).then(function(reg){try{reg.update()}catch(e){}}).catch(function(){});
 navigator.serviceWorker.addEventListener('controllerchange',function(){if(!hadSW||swReloaded)return;swReloaded=true;location.reload()})}
if(window.CEShow){CEShow.render(document.getElementById('jtShow'),{show:'jangtom',root:R,app:true});CEShow.banner(document.getElementById('jtBannerHome'));CEShow.banner(document.getElementById('jtBannerListen'))}
var h=location.hash.slice(1);if(h)go(h);
setTimeout(function(){var s=$('#splash');s&&s.classList.add('out')},700);
})();
// keep every same-site link inside the app (iframe pages): site nav maps to app tabs, other pages open in the frame, only truly outside links leave
(function(){var $=function(s){return document.querySelector(s)},fr=document.querySelector('#frame iframe'),go=function(id){window.CE.go(id)},openFrame=function(a,b){window.CE.frame(a,b)};var TAB={'':'home','index.html':'home','books.html':'read','audiobooks.html':'listen','listen.html':'listen','play.html':'play','studio.html':'studio','art.html':'home','live.html':'guide','jang-tom.html':'jangtom'};
function route(u){var p=u.pathname.replace(/^\//,'');if(p==='app/'||p.indexOf('app/')===0){$('#frame').hidden=true;fr.src='about:blank';go('home');return}
 if(TAB[p]&&!u.hash&&p!=='studio.html'&&p!=='art.html'){$('#frame').hidden=true;fr.src='about:blank';go(TAB[p]);return}
 var s=p+u.search.replace(/[?&]app=1/,'').replace(/^&/,'?')+u.hash;openFrame(s||'index.html',$('#fTitle').textContent)}
fr.addEventListener('load',function(){try{var w=fr.contentWindow,d=fr.contentDocument;if(!d||!d.head)return;
 var st=d.createElement('style');st.textContent='#nav,header.nav,#site-nav,.end-nav,footer nav{display:none!important}a.ce-out::after{content:" \u2197";font-size:.8em;opacity:.7}.ce-outnote{font-size:.7em;opacity:.7}';d.head.appendChild(st);
 function mark(){d.querySelectorAll('a[href]').forEach(function(a){try{var u=new URL(a.getAttribute('href'),w.location.href);if(/^(https?|mailto|tel):$/.test(u.protocol)&&u.origin!==location.origin&&!a.classList.contains('ce-out')){a.classList.add('ce-out');a.title='Opens in browser'}}catch(e){}})}
 mark();new w.MutationObserver(mark).observe(d.body,{childList:true,subtree:true});
 d.addEventListener('click',function(ev){if(ev.defaultPrevented)return;var a=ev.target.closest&&ev.target.closest('a[href]');if(!a||a.hasAttribute('download'))return;var h=a.getAttribute('href');if(!h||h.charAt(0)==='#'||/^javascript:/i.test(h))return;var u;try{u=new URL(h,w.location.href)}catch(e){return}
  if(u.origin!==location.origin){ev.preventDefault();window.open(u.href,'_blank','noopener');return}
  if(u.pathname===w.location.pathname&&u.search===w.location.search&&u.hash)return;
  if(/\.(mp3|m4a|pdf|zip|png|jpe?g)$/i.test(u.pathname))return;
  ev.preventDefault();route(u)},false);
 w.open=(function(o){return function(x,t,f){try{var u=new URL(x,w.location.href);if(u.origin===location.origin){route(u);return null}}catch(e){}return window.open(x,'_blank','noopener')}})(w.open);
}catch(e){}});})();
window.addEventListener('message',function(e){if(e.origin===location.origin&&e.data&&e.data.ce==='home'){var f=document.getElementById('frame');if(f)f.hidden=true;var i=document.querySelector('#frame iframe');if(i)i.src='about:blank';var t=document.querySelector('.tabs button[data-go="home"]');if(t)t.click()}});
// signed in inside the app frame (6-digit code): re-check sign-in, close the frame, welcome
window.addEventListener('message',function(e){if(e.origin!==location.origin||!e.data||e.data.ce!=='signedin')return;var A=window.CollierAuth;var f=document.getElementById('frame'),i=document.querySelector('#frame iframe');if(f)f.hidden=true;if(i)i.src='about:blank';(A&&A.refresh?A.refresh():Promise.resolve()).then(function(){window.CE&&CE.memberNote&&CE.memberNote()})});
