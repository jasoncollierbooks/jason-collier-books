(function(){
var CE=window.CE,$=function(s,r){return (r||document).querySelector(s)},R='../';
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){}}
function el(h){var d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild}
// ---------- sound + haptics ----------
var AC=null;function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,d,type,vol,when){var c=ac();if(!c)return;var o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.value=f;var t=c.currentTime+(when||0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol||.08,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(c.destination);o.start(t);o.stop(t+d+.02)}
function click(){if(ls('ce-sfx')==='0')return;tone(1800,.03,'square',.03);tone(240,.05,'triangle',.05)}
function buzz(n){try{navigator.vibrate&&navigator.vibrate(n||8)}catch(e){}}
function chime(){[523,659,784,1047].forEach(function(f,i){tone(f,.6,'sine',.07,i*.12)})}
function staticBurst(d){var c=ac();if(!c)return;var b=c.createBuffer(1,c.sampleRate*d,c.sampleRate),x=b.getChannelData(0);for(var i=0;i<x.length;i++)x[i]=(Math.random()*2-1)*(1-i/x.length);var s=c.createBufferSource(),g=c.createGain();g.gain.value=.06;s.buffer=b;s.connect(g).connect(c.destination);s.start()}
document.addEventListener('click',function(e){if(e.target.closest('button,a,.poster'))click()},true);
document.querySelectorAll('.tabs button').forEach(function(b){b.addEventListener('click',function(){buzz(6)})});
// ---------- boot: TV switch-on ----------
if(!sessionStorage.getItem('ce-booted')&&!RM){sessionStorage.setItem('ce-booted','1');var sp=document.getElementById('splash');if(sp)sp.remove();
 var bt=el('<div id="boot"><canvas></canvas><div class="b-line"></div><div class="b-id"><img src="icons/icon-512.png" alt=""><b>COLLIER</b><span>ENTERTAINMENT</span><em>Tap to tune in</em></div></div>');document.body.appendChild(bt);
 var cv=bt.querySelector('canvas'),cx=cv.getContext('2d');cv.width=120;cv.height=220;var run=true;(function n(){if(!run)return;var im=cx.createImageData(120,220);for(var i=0;i<im.data.length;i+=4){var v=Math.random()*255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}cx.putImageData(im,0,0);requestAnimationFrame(n)})();
 setTimeout(function(){bt.classList.add('on')},150);setTimeout(function(){bt.classList.add('id');run=false},1300);
 var end=function(){bt.classList.add('out');setTimeout(function(){bt.remove()},500)};
 bt.addEventListener('click',function(){if(bt.classList.contains('id')){staticBurst(.25);setTimeout(chime,200);buzz([10,40,10]);end()}else{bt.classList.add('id');run=false}});
 setTimeout(function(){if(document.body.contains(bt))end()},4200)}
// ---------- film grain ----------
document.body.appendChild(el('<div id="grain" aria-hidden="true"></div>'));
// ---------- tilt ----------
if(!RM)document.addEventListener('pointermove',function(e){var p=e.target.closest&&e.target.closest('.poster img,.paint,.tv');if(!p||e.pointerType==='mouse'&&!e.buttons)return;var r=p.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;p.style.transform='perspective(600px) rotateY('+x*8+'deg) rotateX('+(-y*8)+'deg) scale(.98)'},{passive:true});
document.addEventListener('pointerup',function(){document.querySelectorAll('.poster img,.paint,.tv').forEach(function(p){p.style.transform=''})});
document.addEventListener('pointercancel',function(){document.querySelectorAll('.poster img,.paint,.tv').forEach(function(p){p.style.transform=''})});
// ---------- badges ----------
var BADGES={tuned:['📻','Tuned In','Played your first show'],nails:['🔩','Three Rusty Nails','Stayed up the ridge to count the treasure'],ridge:['⛰️',"Miller's Ridge",'Finished the whole episode'],hog:['🐾','Groundhog Wrangler','Caught the groundhog 3 times'],painter:['🎨','Painter','Opened the Oil Studio'],hunter:['🦌','Hunter','Went up the mountain in the Old Man hunt'],explorer:['🗺️','World Walker','Stepped into Book Worlds'],guide:['📺','Channel Surfer','Checked the channel guide']};
function got(){try{return JSON.parse(ls('ce-badges')||'{}')}catch(e){return {}}}
function award(k){var g=got();if(g[k])return;g[k]=Date.now();ls('ce-badges',JSON.stringify(g));var b=BADGES[k];var t=el('<div class="badge-pop"><i>'+b[0]+'</i><div><small>BADGE EARNED</small><b>'+b[1]+'</b></div></div>');document.body.appendChild(t);[784,988,1175].forEach(function(f,i){tone(f,.3,'triangle',.06,i*.08)});buzz([15,30,15]);setTimeout(function(){t.classList.add('out')},2600);setTimeout(function(){t.remove()},3200);renderBadges()}
CE.award=award;
var home=$('#home'),paint=$('.paint',home);
home.insertBefore(el('<div class="shelf" id="contShelf" hidden><h3>Continue</h3><div class="rail" id="contRail"></div></div>'),$('.shelf',home));
home.insertBefore(el('<div class="gazette" id="gazette"></div>'),paint);
$('.club-cta',home).insertAdjacentElement('beforebegin',el('<div class="shelf"><h3>Your badges</h3><div class="rail" id="badgeRail"></div></div>'));
function renderBadges(){var g=got();$('#badgeRail').innerHTML=Object.keys(BADGES).map(function(k){var b=BADGES[k];return '<div class="bdg'+(g[k]?' on':'')+'"><i>'+(g[k]?b[0]:'🔒')+'</i><b>'+b[1]+'</b><span>'+b[2]+'</span></div>'}).join('')}
renderBadges();
document.addEventListener('click',function(e){var f=e.target.closest('[data-frame]');if(!f)return;var u=f.dataset.frame;if(/studio/.test(u))award('painter');if(/old-man-game/.test(u))award('hunter');if(/book-worlds/.test(u))award('explorer')});
$('#openStudio').addEventListener('click',function(){award('painter')});
// ---------- continue ----------
function renderCont(){var h='';Object.keys(CE.TRACKS).forEach(function(k){var p=+(ls('ce-pos-'+k)||0),d=+(ls('ce-dur-'+k)||0),t=CE.TRACKS[k];if(p>5&&d&&p<d-10)h+='<button class="poster wide cont" data-play="'+k+'"><img src="'+t.art+'" alt=""><i class="bar"><u style="width:'+(p/d*100)+'%"></u></i><b>'+t.t+'</b><span>'+Math.round((d-p)/60)+' min left</span></button>'});$('#contRail').innerHTML=h;$('#contShelf').hidden=!h}
renderCont();
var au=CE.au,lastSave=0;
au.addEventListener('timeupdate',function(){var k=CE.cur();if(!k)return;if(Date.now()-lastSave>3000){lastSave=Date.now();ls('ce-pos-'+k,au.currentTime);ls('ce-dur-'+k,au.duration||0)}if(k==='ridge'&&au.currentTime>847)award('nails');sync()});
au.addEventListener('play',function(){award('tuned')});
au.addEventListener('ended',function(){var k=CE.cur();ls('ce-pos-'+k,0);if(k==='ridge')award('ridge');renderCont();if(live)nextLive()});
au.addEventListener('pause',renderCont);
// ---------- gazette ----------
var Q=[["Nobody makes the best ribs in the county.","Tom"],["When I stand, it's supervising. Supervising is a job.","Jang"],["Leaning is the worst kind of loafing there is.","Jang"],["A groundhog threw dirt at me.","Jang"],["Jang, I think this treasure was a barn.","Tom"],["You could patch a roof with this coffee. I did last spring.","Tom"],["That's the beauty of management, Tom.","Jang"],["He's very old, Tom. He was probably there.","Jang"],["Reckon that's the only kind of treasure we ever find, anyhow.","Tom"],["Pirates used whatever they had handy.","Jang"],["Six holes, three rusty nails, one very angry groundhog, and half a hubcap.","Narrator"],["He always sighs, but he always goes.","Narrator"]];
var day=Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5),q=Q[day%Q.length];
$('#gazette').innerHTML='<div class="gz-head"><b>THE PINE KNOT GAZETTE</b><span>'+new Date().toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'})+'</span></div><blockquote>“'+q[0]+'”</blockquote><cite>— '+q[1]+", The Treasure of Miller's Ridge</cite>";
// ---------- groundhog ----------
var HOG=["A groundhog threw dirt at me!","Nobody makes the best ribs in the county.","Something down here don't want to be found.","Treasure can't growl, Tom.","He's got a shovel. How has he got a shovel?","Six holes, Tom. We'll dig six holes if we have to."],hogN=0;
var hog=el('<button id="hog" aria-label="A groundhog popped up"><svg viewBox="0 0 80 80"><ellipse cx="40" cy="70" rx="34" ry="10" fill="#4a3018"/><path d="M14 72 Q14 30 40 26 Q66 30 66 72Z" fill="#8a5a2b"/><circle cx="26" cy="30" r="6" fill="#6b4220"/><circle cx="54" cy="30" r="6" fill="#6b4220"/><ellipse cx="40" cy="50" rx="12" ry="9" fill="#c9965a"/><circle cx="31" cy="40" r="3.5" fill="#111"/><circle cx="49" cy="40" r="3.5" fill="#111"/><circle cx="32" cy="39" r="1" fill="#fff"/><circle cx="50" cy="39" r="1" fill="#fff"/><ellipse cx="40" cy="47" rx="4" ry="3" fill="#2a1a0c"/><rect x="36" y="53" width="3.5" height="5" fill="#fff"/><rect x="40.5" y="53" width="3.5" height="5" fill="#fff"/></svg></button>');
document.body.appendChild(hog);
function popHog(){if(!$('#frame').hidden||!$('#player').hidden||document.querySelector('.jc-break'))return;hog.classList.add('up');setTimeout(function(){hog.classList.remove('up')},5000)}
setTimeout(popHog,25000);setInterval(popHog,95000);
hog.onclick=function(){hogN++;tone(330,.08,'square',.05);tone(220,.12,'square',.05,.08);buzz(20);CE.toast('🐾 '+HOG[hogN%HOG.length]);hog.classList.remove('up');if(hogN>=3)award('hog')};
CE.popHog=popHog;
// ---------- player: chapters, captions, cast ----------
var pl=$('#player');pl.classList.add('rich');
var extra=el('<div class="pl-extra"><div class="cast" id="cast"><div data-s="jang"><i>J</i><b>Jang</b></div><div data-s="tom"><i>T</i><b>Tom</b></div><div data-s="narrator"><i>📻</i><b>Narrator</b></div><div data-s="jenkins"><i>OJ</i><b>Jenkins</b></div></div><p class="cap" id="cap" aria-live="off"></p><div class="chap-now" id="chapNow"></div><details class="chaps"><summary>Chapters</summary><ol id="chapList"></ol></details><p class="credit" id="credit"></p></div>');
pl.appendChild(extra);
var CAP=[];fetch('captions.json').then(function(r){return r.json()}).then(function(j){CAP=j}).catch(function(){});
var curInfo=null;
CE.onTrack=function(k,t){curInfo=t;var on=!!t.ch;extra.classList.toggle('has',on);$('#credit').textContent=t.credit||'';$('#chapList').innerHTML=(t.ch||[]).map(function(c){return '<li><button data-t="'+c[0]+'"><span>'+Math.floor(c[0]/60)+':'+('0'+c[0]%60).slice(-2)+'</span>'+c[1]+'</button></li>'}).join('');$('#cap').textContent='';drawMarks()};
$('#chapList').addEventListener('click',function(e){var b=e.target.closest('[data-t]');if(b){au.currentTime=+b.dataset.t;au.play()}});
function drawMarks(){var s=$('#seek'),t=curInfo;if(!t||!t.ch||!au.duration){s.style.background='';return}var g=t.ch.map(function(c){var p=c[0]/au.duration*100;return 'linear-gradient(90deg,transparent calc('+p+'% - 1px),#d4af37 calc('+p+'% - 1px),#d4af37 calc('+p+'% + 1px),transparent calc('+p+'% + 1px))'});s.style.backgroundImage=g.join(',')}
au.addEventListener('loadedmetadata',drawMarks);
function sync(){if(!curInfo||!curInfo.ch)return;var t=au.currentTime,c=null,i;for(i=0;i<curInfo.ch.length;i++)if(curInfo.ch[i][0]<=t)c=curInfo.ch[i];$('#chapNow').textContent=c?'Chapter: '+c[1]:'';
 var L=null;for(i=0;i<CAP.length;i++){if(CAP[i][0]<=t)L=CAP[i];else break}
 var sp=L?L[1]:'';if(/^Sponsor/.test(c&&c[1]||''))sp='narrator';
 if(L&&$('#cap').textContent!==L[2])$('#cap').textContent=L[2];
 document.querySelectorAll('#cast [data-s]').forEach(function(d){d.classList.toggle('lit',d.dataset.s===sp&&!au.paused)})}
au.addEventListener('pause',sync);
// ---------- live channel + guide ----------
var SCHED=[{k:'ridge',t:"Jang & Tom: The Treasure of Miller's Ridge",d:1009},{k:'spot1',t:'Station break',d:14,src:R+'audio/commercials/jangtom.mp3',art:R+'images/jang-and-tom-wagon-masters.jpg'},{k:'oldman',t:'Old Man On The Mountain · Part 1',d:741},{k:'spot2',t:'Station break',d:12,src:R+'audio/commercials/worlds.mp3',art:R+'book-worlds/assets/play-cover.webp'},{k:'pineknot',t:'Jang & Tom in Pine Knot (Preview)',d:261},{k:'spot3',t:'Station break',d:12,src:R+'audio/commercials/pulse.mp3',art:R+'images/the-first-pulse.jpg'}];
SCHED.forEach(function(s){if(s.src)CE.TRACKS[s.k]={t:s.t,s:'Collier Entertainment · station break',src:s.src,art:s.art}});
var CYC=SCHED.reduce(function(a,s){return a+s.d},0);
function nowSlot(at){var d=new Date(at||Date.now()),sec=(d-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/1000,o=sec%CYC,st=at||Date.now();for(var i=0;i<SCHED.length;i++){if(o<SCHED[i].d)return {i:i,off:o,start:st-o*1000};o-=SCHED[i].d}}
function fmtT(ms){return new Date(ms).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}
var live=false;
function tune(){var n=nowSlot();live=true;CE.load(SCHED[n.i].k,true,Math.floor(n.off));CE.toast('📺 Tuned in to Collier Entertainment')}
function nextLive(){var n=nowSlot();CE.load(SCHED[n.i].k,false,Math.floor(n.off))}
au.addEventListener('pause',function(){if(document.querySelector('.jc-break'))return;});
var gs=el('<section class="screen" id="guide"><header class="top"><button class="back" data-go="home">‹</button><h2>Channel Guide</h2><span class="onair sm"><i></i>LIVE</span></header><div class="dial-row"><div class="dial" id="dial"><span></span></div><div><b>CE-1 · Collier Entertainment</b><p>One station, always on. Tune in and it plays like the radio: shows, audiobooks and station breaks back to back.</p></div></div><button class="btn wide" id="tuneBtn">📻 Tune in now</button><ol class="sched" id="sched"></ol><p class="fine">Schedule runs on your local time and repeats through the day.</p></section>');
$('#app').appendChild(gs);
function renderGuide(){var n=nowSlot(),h='',t=n.start;for(var j=0;j<8;j++){var s=SCHED[(n.i+j)%SCHED.length];var cls=j===0?'now':'';var pct=j===0?Math.round(n.off/s.d*100):0;h+='<li class="'+cls+'"><time>'+(j===0?'NOW':fmtT(t))+'</time><div><b>'+s.t+'</b><span>'+Math.round(s.d/60)+' min'+(s.src?' · sponsor':'')+'</span>'+(j===0?'<i class="bar"><u style="width:'+pct+'%"></u></i>':'')+'</div></li>';t+=s.d*1000}
 $('#sched').innerHTML=h;var nx=SCHED[(n.i+1)%SCHED.length];$('#gNow').textContent=SCHED[n.i].t;$('#gNext').textContent=nx.t+' · '+fmtT(n.start+SCHED[n.i].d*1000)}
renderGuide();setInterval(renderGuide,20000);
$('#tuneBtn').onclick=function(){staticBurst(.3);tune()};
document.addEventListener('click',function(e){if(e.target.closest('[data-go=guide]')){award('guide');renderGuide()}});
var dial=$('#dial'),ang=0;dial.addEventListener('click',function(){ang+=60;dial.style.transform='rotate('+ang+'deg)';staticBurst(.15);buzz(10);var tabs=['home','listen','play','studio','read'];CE.go(tabs[(ang/60)%tabs.length]);});
// ---------- coming soon ----------
document.addEventListener('click',function(e){if(e.target.closest('[data-soon]'))CE.toast("🦝 The Great Possum Caper is coming soon. Mrs. Whitaker's prize possum is on the loose.")});
// SFX toggle in club
var cl=$('#club');cl.appendChild(el('<label class="sub sfx"><input type="checkbox" id="sfxT"> Button sounds &amp; haptics</label>'));var sx=$('#sfxT');sx.checked=ls('ce-sfx')!=='0';sx.onchange=function(){ls('ce-sfx',sx.checked?'1':'0')};
})();
