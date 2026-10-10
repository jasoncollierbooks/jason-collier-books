(function(){
var $=function(s){return document.querySelector(s)},$$=function(s){return document.querySelectorAll(s)};
var R='../';
var BOOKS=[
 {t:'Jang & Tom: Wagon Masters',img:'images/jang-and-tom-wagon-masters.jpg',buy:'https://www.amazon.com/dp/B0HFCF11YP',page:'jang-and-tom.html'},
 {t:'The First Pulse',img:'images/the-first-pulse.jpg',buy:'https://www.amazon.com/dp/B0GD4W3159',page:'first-pulse.html'},
 {t:'Old Man On The Mountain',img:'images/old-man-on-the-mountain.jpg',buy:'https://www.amazon.com/dp/B0HDJWYNNJ',page:'old-man-on-the-mountain.html'},
 {t:'The Rusty Stack',img:'images/the-rusty-stack.jpg',page:'rusty-stack.html',soon:1}];
var ART=['painting-lighthouse-at-dusk','painting-autumn-hillside','painting-wildflower-meadow','sketch-longhorn-in-the-grass','sketch-the-raven','sketch-the-wanderer'];
var TRACKS={
 ridge:{t:"The Treasure of Miller's Ridge",s:'Jang & Tom · radio show · 16:49',src:R+'media/jang-tom-millers-ridge.mp3',art:R+'images/author-as-jang.jpg',ep:1,
  credit:'Music by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0',
  ch:[[0,'Cold open'],[30,'Pine Knot intro'],[114,'Sponsor: I Spy'],[144,'The napkin map & Over Yonder'],[218,'Hugh / Nobody cooks'],[335,"Up Miller's Ridge"],[461,'Loafing'],[527,'The groundhog'],[585,'Old Man Jenkins'],[701,'Sponsor break'],[842,'Treasure on the log'],[888,'Sponsor: The First Pulse'],[935,'Goodnight, Pine Knot']]},
 pineknot:{t:'Jang & Tom in Pine Knot (Preview)',s:'Radio story preview · 4:20',src:'media/jang-tom-pine-knot.mp3',art:R+'images/jang-and-tom-wagon-masters.jpg'},
 oldman:{t:'Old Man On The Mountain',s:'Audiobook · Part 1',src:R+'old-man-audiobook/audio/om01.m4a',art:R+'images/old-man-on-the-mountain.jpg'}};
var esc=function(s){return s.replace(/&/g,'&amp;')};
// Books + art
$('#books').innerHTML=BOOKS.map(function(b){return b.soon?'<span class="bk"><img src="'+R+b.img+'" alt="">'+esc(b.t)+' · soon</span>':'<a class="bk" target="_blank" rel="noopener" href="'+b.buy+'"><img loading="lazy" src="'+R+b.img+'" alt="">'+esc(b.t)+'</a>'}).join('');
$('#art').innerHTML=ART.map(function(a){return '<button class="poster sq" data-frame="art.html" data-title="Art"><img loading="lazy" src="'+R+'images/jason-art/'+a+'-thumb.jpg" alt="'+a.replace(/^(painting|sketch)-/,'').replace(/-/g,' ')+' by Jason Collier"><b>'+a.replace(/^(painting|sketch)-/,'').replace(/-/g,' ')+'</b></button>'}).join('');
function item(img,t,s,attrs){return '<button class="item" '+attrs+'><img loading="lazy" src="'+img+'" alt=""><div><b>'+esc(t)+'</b><span>'+s+'</span></div><span class="go">›</span></button>'}
$('#listenList').innerHTML=
 item(R+'images/author-as-jang.jpg',"The Treasure of Miller's Ridge",'Jang & Tom radio show · 16:49 · chapters & listen-along','data-play="ridge"')+item(R+'images/jang-and-tom-wagon-masters.jpg','Pine Knot preview','Short preview · 4:20','data-play="pineknot"')+item(R+'images/hero/hero-1.jpg','The Great Possum Caper','Next on Jang & Tom · coming soon','data-soon="1"')+
 item(R+'images/old-man-on-the-mountain.jpg','Old Man On The Mountain','Audiobook · app player','data-play="oldman"')+
 item(R+'images/jang-and-tom-wagon-masters.jpg','Jang & Tom audiobooks','Wagon Masters, Philadelphia Follies, Transcontinental','data-frame="audiobooks.html#jang-and-tom" data-title="Jang & Tom"')+
 item(R+'images/the-first-pulse.jpg','The First Pulse','Audiobook · Chapters One & Two in seven parts','data-frame="audiobooks.html#first-pulse" data-title="The First Pulse"')+
 item(R+'images/the-rusty-stack.jpg','The Rusty Stack','Animatic preview','data-frame="audiobooks.html#rusty-stack-animatic" data-title="The Rusty Stack"')+
 item(R+'images/art/philly-s01.jpg','Past Inspirations','Old-time radio and inspirations','data-frame="past-inspirations.html" data-title="Past Inspirations"');
function card(img,t,s,f){return '<button class="card" data-frame="'+f+'" data-title="'+esc(t)+'"><img loading="lazy" src="'+img+'" alt=""><b>'+esc(t)+'</b><span>'+s+'</span></button>'}
$('#playList').innerHTML=card(R+'images/old-man-on-the-mountain.jpg','Old Man Hunt','Horror hunt on the mountain','old-man-game/')+card(R+'images/the-first-pulse.jpg','Book Worlds','Step inside the stories','book-worlds/')+card(R+'images/scenes/philly-s09.jpg','I Spy','Find the hidden things','i-spy.html')+card(R+'images/jason-art/sketch-the-raven-thumb.jpg','Coloring','Color the pages','coloring.html');
$('#listenList').insertAdjacentHTML('beforeend',item(R+'images/the-rusty-stack.jpg','Early episodes','Club members hear new radio stories first <span class=lock>CLUB</span>','data-club="1"'));
$('#playList').insertAdjacentHTML('beforeend',card(R+'images/jason-art/sketch-the-wanderer-thumb.jpg','Bonus hunt chapters','New Old Man chapters · Club','#club'));
$('#readList').innerHTML=BOOKS.map(function(b){return item(R+b.img,b.t,b.soon?'Coming soon · about the book':'Book page, chapters & audiobook','data-frame="'+b.page+'" data-title="'+esc(b.t)+'"')}).join('')+item(R+'images/old-man-on-the-mountain.jpg','Story Mode','Read along with the audiobook <span class=lock>CLUB</span>','data-club="1"')+item(R+'images/the-first-pulse.jpg','The Novel','The multi-mind novel, read in the app','data-frame="novel.html" data-title="The Novel"');
// tabs
var cur='home';
function go(id){if(!document.getElementById(id))return;$$('.screen').forEach(function(s){s.classList.toggle('active',s.id===id)});$$('.tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.go===id)});cur=id;history.replaceState(null,'','#'+id)}
// frame
var fr=$('#fr');
function openFrame(u,t){fr.src=R+u;$('#fTitle').textContent=t||'';$('#fSave').hidden=u.indexOf('studio')!==0;$('#frame').hidden=false;if(!au.paused)au.pause()}
$('#fClose').onclick=function(){$('#frame').hidden=true;fr.src='about:blank'};
var FULLK='ce-full-studio-day';function today(){return new Date().toDateString()}
function fullStudio(){return isSub()||localStorage.getItem(FULLK)===today()}
function tierUI(){var t=$('#studioTier');if(isSub())t.innerHTML='<b>Club:</b> full studio unlocked.';else if(fullStudio())t.innerHTML='<b>Free taste:</b> full studio unlocked for today.';else t.innerHTML='<b>Free:</b> basic brushes and the starter palette. Half-mix, the hand drawer, 72 colors and Save to Photos are Club features.<br><button id="tryFull">Try the full studio free today</button>';var tb=$('#tryFull');if(tb)tb.onclick=function(){localStorage.setItem(FULLK,today());tierUI();toast('Full studio unlocked for today');openFrame('studio.html','Oil Studio')}}
$('#openStudio').onclick=function(){openFrame('studio.html','Oil Studio')};
fr.addEventListener('load',function(){try{var d=fr.contentDocument;if(!d||!d.getElementById('studio-canvas')||fullStudio())return;var st=d.createElement('style');st.textContent='.ce-club{position:relative;opacity:.55}.ce-club::after{content:"CLUB";position:absolute;top:-6px;right:-4px;background:#c9a227;color:#1a140d;font:800 9px sans-serif;padding:2px 4px;border-radius:4px;opacity:1}';d.head.appendChild(st);
var sel=['#studio-half','#studio-colors-open','#studio-hand > summary'];sel.forEach(function(q){var x=d.querySelector(q);if(x)x.classList.add('ce-club')});
d.addEventListener('click',function(ev){if(ev.target.closest&&ev.target.closest('.ce-club')){ev.preventDefault();ev.stopPropagation();$('#frame').hidden=true;fr.src='about:blank';go('club');toast('Club feature. Try the full studio free once a day.')}},true)}catch(e){}});
$('#fSave').onclick=function(){if(!fullStudio()){toast('Save to Photos is a Club feature');return}try{var c=fr.contentDocument.getElementById('studio-canvas');c.toBlob(function(bl){var f=new File([bl],'my-oil-painting.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:'My oil painting'}).catch(function(){})}else{var a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=f.name;a.click();toast('Painting saved')}})}catch(e){toast('Open a painting first')}};
document.addEventListener('click',function(e){var el=e.target.closest('[data-club],[data-go],[data-play],[data-frame]');if(!el)return;if(el.dataset.club||el.dataset.frame==='#club'){if(isSub())toast('Club preview: this would open here');else{go('club');toast('That is a Pine Knot Club feature')}return}
 if(el.dataset.go)go(el.dataset.go);else if(el.dataset.play)load(el.dataset.play,true);else openFrame(el.dataset.frame,el.dataset.title)});
// toast
var tt;function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show')},2400)}
$('#joinBtn').onclick=function(){toast('Preview only, purchases are not active yet')};$('#restoreBtn').onclick=function(){toast('Preview only, nothing to restore')};
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
function dlState(){var b=$('#dl');if(!('caches' in window)){b.hidden=true;return}caches.open(AC).then(function(c){return c.match(new URL(TRACKS[curT].src,location).href)}).then(function(r){b.textContent=r?'✓ Downloaded':'⬇ Download for offline'})}
$('#dl').onclick=function(){if(!isSub()){$('#player').hidden=true;go('club');toast('Offline downloads are a Club feature');return}var b=this,u=new URL(TRACKS[curT].src,location).href;b.textContent='Downloading…';caches.open(AC).then(function(c){return c.add(u)}).then(function(){b.textContent='✓ Downloaded';toast('Saved for offline listening')}).catch(function(){b.textContent='⬇ Download for offline';toast('Download failed')})};
// commercials (free tier): reuse the site's break system; Club preview turns it off
var SUBK='ce-app-subscriber';function isSub(){try{return localStorage.getItem(SUBK)==='1'}catch(e){return false}}
var st=$('#subToggle');st.checked=isSub();st.onchange=function(){try{localStorage.setItem(SUBK,st.checked?'1':'0')}catch(e){}toast(st.checked?'Subscriber preview: no commercials':'Free tier: commercials on');if(!st.checked)loadBreaks();tierUI()};
function loadBreaks(){if(isSub()||window.JCBreaks||document.getElementById('cbjs'))return;var s=document.createElement('script');s.id='cbjs';s.src='../commercials.js';document.body.appendChild(s)}
function breakNow(){if(isSub()||!window.JCBreaks)return false;var ids=Object.keys(JCBreaks.spots);var was=!au.paused;au.pause();var fw=null,fm=[];try{if(!$('#frame').hidden){fw=fr.contentWindow;if(fw.__oldman)fw.__oldman.holdSim(true);fw.document.querySelectorAll('audio,video').forEach(function(m){if(!m.paused){m.pause();fm.push(m)}})}}catch(e){}JCBreaks.open(ids[Math.floor(Math.random()*ids.length)]);var w=setInterval(function(){if(!window.__jcBreakHold&&!document.querySelector('.jc-break, [class*=break-overlay]')){clearInterval(w);try{if(fw&&fw.__oldman)fw.__oldman.holdSim(false);fm.forEach(function(m){m.play().catch(function(){})})}catch(e){}if(was)au.play().catch(function(){})}},700);setTimeout(function(){},0);return true}
var useMs=0,nextAt=150000+Math.random()*30000,lastT=Date.now();
setInterval(function(){var n=Date.now(),busy=true;if(busy&&document.visibilityState==='visible'&&!isSub())useMs+=n-lastT;lastT=n;if(useMs>=nextAt){if(breakNow()){useMs=0;nextAt=120000+Math.random()*60000}}},1000);
au.addEventListener('ended',function(){breakNow()});
var _load=load;load=function(k,o,f){if(curT&&curT!==k&&!au.paused){au.pause()}_load(k,o,f)};
loadBreaks();window.__ceBreak=breakNow;tierUI();
window.CE={au:au,load:load,go:go,toast:toast,isSub:isSub,TRACKS:TRACKS,cur:function(){return curT},frame:openFrame};
// boot
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(function(){});
var h=location.hash.slice(1);if(h)go(h);
setTimeout(function(){var s=$('#splash');s&&s.classList.add('out')},700);
})();
