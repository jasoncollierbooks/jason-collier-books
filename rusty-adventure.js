/* The Rusty Stack: Choose Your Own Adventure Audiobook. An open book that reads itself aloud;
   choices appear when each page's narration ends. Hold a choice to peek at the page it turns to. */
(function(){
var D=window.RUSTY_CYOA,A=window.RUSTY_CYOA_AUDIO||{},$=function(i){return document.getElementById(i)};
var PAGE={s01:1,s02:4,s03:7,e1:9,s04:10,s05:13,e2:15,s06:17,s07:20,s08:23,e3:25,s09:27,s10:30,e4:31,s11:33,s12:36,s13:40,s14:43,e5:45,s15:47,s16:50,s17:54,s18:58,s19:61,e6:63,s20:65,s21:69,s22:73,s23:77,e7:82,e8:88};
var KEY='rca-progress',EKEY='rca-endings',au=$('rcaAudio'),started=false,ended=false,busy=false;
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
if(navigator.connection&&navigator.connection.saveData)document.documentElement.classList.add('rca-still');
var ST;try{ST=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!ST||!D.nodes[ST.id])ST={id:D.start,flags:{}};
var FOUND;try{FOUND=JSON.parse(localStorage.getItem(EKEY))||{}}catch(e){FOUND={}}
RStage.mount($('rcaPlate'));RStage.audio(au);
var muted=false;try{muted=localStorage.getItem('rca-mute')==='1'}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(ST));localStorage.setItem(EKEY,JSON.stringify(FOUND))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fmt(t){t=Math.max(0,t|0);return (t/60|0)+':'+('0'+t%60).slice(-2)}
var REDO={s08:1,s13:1,s17:1,e3:1,e8:1};function img(id){return 'images/rusty-cyoa/'+id+'.jpg?v='+(REDO[id]?4:3)}
function count(){var n=Object.keys(FOUND).length+'/8';$('rcaCount').textContent=n;$('rcaCount2').textContent=n}
function flags(){var f=[];if(ST.flags.hawke)f.push('🎯 Hawke joined the crew');if(ST.flags.lena)f.push('🛩 Lena “Lucky” joined the crew');$('rcaFlags').innerHTML=f.map(function(x){return '<span class="rca-flag">'+esc(x)+'</span>'}).join('')}
function setPlay(p){$('rcaPlay').textContent=p?'❚❚':'▶';$('rcaPlay').setAttribute('aria-label',p?'Pause':'Play');RStage.play(p)}
/* where a choice really lands: a route that needs a crewmate you don't have falls through quietly */
function land(c){return (c.req&&!ST.flags[c.req])?c.fallback:c.target}

/* paper rustle, synthesized */
var AC;function rustle(n){if(muted)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
 for(var k=0;k<n;k++){var t0=AC.currentTime+k*0.07,len=0.16,b=AC.createBuffer(1,AC.sampleRate*len,AC.sampleRate),d=b.getChannelData(0);
  for(var i=0;i<d.length;i++){var x=i/d.length;d[i]=(Math.random()*2-1)*Math.pow(1-x,2)*(0.4+0.6*Math.random())*(x<0.08?x/0.08:1)}
  var s=AC.createBufferSource();s.buffer=b;var f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=2200+Math.random()*1800;f.Q.value=0.7;
  var g=AC.createGain();g.gain.value=k===n-1?0.5:0.28;s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t0)}}catch(e){}}

function showChoices(){
  ended=true;var n=D.nodes[ST.id],h='';
  if(n.ending){FOUND[ST.id]=1;save();count();
    h='<p class="rca-endtag">— '+esc(n.tag)+' —</p><button class="rca-choice" data-act="restart">↺ Start a new voyage<em>Turn back to page 1</em></button><button class="rca-choice" data-act="endings">🏆 Endings found: '+Object.keys(FOUND).length+'/8</button>';}
  else h='<p class="rca-ask">What do you do?</p>'+n.choices.map(function(c,i){return (c.req&&!ST.flags[c.req]?'<button class="rca-choice gated" data-i="'+i+'">'+esc(c.label)+'<em>Turn the page…</em></button>':'<button class="rca-choice" data-i="'+i+'">'+esc(c.label)+'<em>Turn to page '+PAGE[c.target]+'</em><span class="pk" data-peek="'+i+'" aria-label="Peek">👁</span></button>')}).join('');
  var el=$('rcaChoices');el.innerHTML=h;el.classList.add('on');RStage.closeTheater();RStage.para(-1,'');if(!n.ending)RStage.preload(n.choices.map(land));
}
function render(play){
  var n=D.nodes[ST.id],a=A[ST.id]||{};ended=false;
  RStage.load(ST.id);
  /* presentation: picture eases in on each new page; endings get a title card over the art */
  var pl=$('rcaPlate'),oc=pl.querySelector('.rca-endcard');if(oc)oc.remove();
  if(!RM){pl.classList.remove('enter');void pl.offsetWidth;pl.classList.add('enter')}
  document.body.classList.toggle('rca-is-ending',!!n.ending);
  if(n.ending){var ec=document.createElement('div');ec.className='rca-endcard';ec.setAttribute('aria-hidden','true');
    ec.innerHTML='<small>Ending '+esc(n.num.slice(1))+' of 8</small><b>'+esc(n.title)+'</b><i>'+esc(n.tag)+'</i>';pl.appendChild(ec);
    setTimeout(function(){ec.classList.add('away')},RM?6000:4200)}
  $('rcaNum').textContent=n.ending?'Ending '+n.num.slice(1):'Scene '+(+n.num);
  $('rcaTitle').textContent=n.title;
  var txt=n.text.slice();if(!n.ending&&txt[txt.length-1]==='What do you do?')txt.pop(); /* asked again above the choices */
  $('rcaText').innerHTML=txt.map(function(p,i){return '<p data-p="'+i+'">'+esc(p)+'</p>'}).join('');
  $('pnoL').textContent=PAGE[ST.id];$('pnoR').textContent=PAGE[ST.id];
  $('rcaChoices').innerHTML='';$('rcaChoices').classList.remove('on');
  flags();save();
  au.src='media/rusty-cyoa/'+ST.id+'.mp3?v=3';au.muted=muted;$('rcaBar').style.width='0';$('rcaTime').textContent='0:00 / '+fmt(a.dur||0);
  if(play&&started){var p=au.play();if(p&&p.catch)p.catch(function(){setPlay(false);showChoices()})}else setPlay(false);
}
var LK=-2;function hl(t){var a=A[ST.id];if(!a)return;var k=-1;for(var i=0;i<a.paras.length;i++)if(t>=a.paras[i]-0.05)k=i;
  var ps=$('rcaText').children;for(var j=0;j<ps.length;j++)ps[j].classList.toggle('now',j===k);if(k!==LK){LK=k;RStage.para(k,k>=0&&ps[k]?ps[k].textContent:'')}}
au.addEventListener('timeupdate',function(){var d=au.duration||1;$('rcaBar').style.width=(100*au.currentTime/d)+'%';$('rcaTime').textContent=fmt(au.currentTime)+' / '+fmt(d);hl(au.currentTime)});
au.addEventListener('play',function(){setPlay(true)});au.addEventListener('pause',function(){setPlay(false)});
au.addEventListener('ended',function(){setPlay(false);hl(-1);if(!ended)showChoices()});
au.addEventListener('error',function(){if(started&&!ended)showChoices()});

/* turning pages: riffle several leaves, more for a longer jump */
function turn(to,cb){
  var from=PAGE[ST.id]||1,dest=PAGE[to]||1,dist=Math.abs(dest-from),fwd=dest>=from,book=$('book');
  var n=Math.max(2,Math.min(7,Math.round(dist/6)+1));rustle(n);
  if(RM){cb();return}
  busy=true;var L=$('leaves');L.innerHTML='';L.style.bottom='auto';L.style.height=Math.min(innerHeight*0.85,book.offsetHeight-16)+'px';book.classList.add('turning');
  for(var i=0;i<n;i++){var lf=document.createElement('div');lf.className='leaf '+(fwd?'fwd':'back');lf.style.animationDelay=(i*70)+'ms';lf.style.zIndex=n-i;L.appendChild(lf)}
  setTimeout(cb,260);
  setTimeout(function(){L.innerHTML='';book.classList.remove('turning');busy=false},620+n*70);
}
function go(to,setFlag){
  if(busy)return;if(setFlag)ST.flags[setFlag]=true;
  var b=$('book'),top=b.getBoundingClientRect().top;
  if(top<0||top>innerHeight*0.5)window.scrollTo(0,top+scrollY-70);
  turn(to,function(){ST.id=to;render(true)});
}
$('rcaPlay').onclick=function(){started=true;if(au.paused){if(au.ended)au.currentTime=0;var p=au.play();if(p&&p.catch)p.catch(function(){showChoices()})}else au.pause()};
$('rcaSkip').onclick=function(){started=true;au.pause();hl(-1);if(!ended)showChoices()};
$('rcaMute').onclick=function(){muted=!muted;au.muted=muted;this.textContent=muted?'🔇':'🔊';try{localStorage.setItem('rca-mute',muted?'1':'0')}catch(e){}};
$('rcaMute').textContent=muted?'🔇':'🔊';
function restart(){ST.flags={};go(D.start)}
$('rcaRestart').onclick=function(){if(confirm('Start the voyage over from page 1? Endings you found stay found.'))restart()};
function endings(){var h='';Object.keys(D.nodes).filter(function(k){return D.nodes[k].ending}).forEach(function(k){var n=D.nodes[k];
  h+=FOUND[k]?'<button type="button" class="rca-g got" data-end="'+k+'"><span class="rca-g-art"><img src="'+img(k)+'" onerror="this.onerror=null;this.src=\'images/the-rusty-stack.jpg\'" alt="" loading="lazy"></span><span class="rca-g-cap"><small>Ending '+n.num.slice(1)+' · page '+PAGE[k]+'</small><b>'+esc(n.title)+'</b><em>'+esc(n.tag)+'</em></span></button>'
   :'<div class="rca-g"><span class="rca-g-art"><img src="'+img(k)+'" alt="" loading="lazy"><i>?</i></span><span class="rca-g-cap"><small>Ending '+n.num.slice(1)+'</small><b>Not found yet</b><em>Keep exploring</em></span></div>'});
  $('rcaEndList').innerHTML=h;count();$('rcaEndings').hidden=false;$('rcaEndings').scrollIntoView({behavior:RM?'auto':'smooth'})}
$('rcaEndList').addEventListener('click',function(e){var b=e.target.closest('[data-end]');if(!b)return;started=true;$('rcaEndings').hidden=true;go(b.dataset.end)});
$('rcaEndBtn').onclick=endings;$('rcaEndClose').onclick=function(){$('rcaEndings').hidden=true};

/* peek: press and hold a choice (or touch the eye) to lift the corner of the page it turns to */
var pk=$('peek'),holdT=null,peeking=false,suppress=false;
function peekOn(i){var c=D.nodes[ST.id].choices[i];if(!c)return;var t=c.target,n=D.nodes[t];
  $('peekImg').src=img(t);$('peekImg').onerror=function(){this.onerror=null;this.src='images/the-rusty-stack.jpg'};
  $('peekLine').textContent=n.text[0];$('peekNo').textContent='p. '+PAGE[t];pk.classList.add('on');peeking=true;rustle(1)}
function peekOff(){clearTimeout(holdT);if(peeking){pk.classList.remove('on');peeking=false;suppress=true;setTimeout(function(){suppress=false},350)}}
var ch=$('rcaChoices');
ch.addEventListener('pointerdown',function(e){var b=e.target.closest('[data-i]');if(!b)return;if(b.classList.contains('gated'))return;var i=+b.dataset.i;
  if(e.target.closest('[data-peek]')){e.preventDefault();peekOn(i);return}
  holdT=setTimeout(function(){peekOn(i)},380)});
['pointerup','pointercancel','pointerleave'].forEach(function(ev){ch.addEventListener(ev,peekOff)});
ch.addEventListener('contextmenu',function(e){e.preventDefault()});
ch.addEventListener('click',function(e){var b=e.target.closest('button');if(!b||suppress||e.target.closest('[data-peek]'))return;started=true;
  if(b.dataset.act==='restart')return restart();if(b.dataset.act==='endings')return endings();
  var c=D.nodes[ST.id].choices[+b.dataset.i];go(land(c),c.set)});
var cv=$('cover');
function openBook(play){if(!cv||cv.classList.contains('gone'))return;cv.classList.add('open');rustle(2);setTimeout(function(){cv.classList.add('gone');$('book').classList.remove('closed')},RM?400:1150);
  if(play){started=true;var p=au.play();if(p&&p.catch)p.catch(function(){})}}
cv.onclick=function(){openBook(true)};
$('rcaPlay').addEventListener('click',function(){openBook(false)});
count();render(false);
window.RCA={state:function(){return ST},found:function(){return FOUND},page:PAGE};
})();
