/* The Rusty Stack cartoon. Each scene plays its clip, then the choices. No script prose. */
(function(){
var D=window.RUSTY_CYOA,Clip=window.RCAClip,$=function(i){return document.getElementById(i)};
var KEY='rca-progress',EKEY='rs-ep02-endings',RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var TOTAL=Object.keys(D.nodes).filter(function(k){return D.nodes[k].ending}).length;
var ST;try{ST=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!ST||!D.nodes[ST.id])ST={id:D.start};
var FOUND;try{FOUND=JSON.parse(localStorage.getItem(EKEY))||{}}catch(e){FOUND={}}
var muted=false;try{muted=localStorage.getItem('rca-clip-mute')==='1'}catch(e){}
var revealed=false,playToken=0;
Clip.init($('rcaVideo'),$('rcaPoster'));
Clip.mute(muted);
function save(){try{localStorage.setItem(KEY,JSON.stringify(ST));localStorage.setItem(EKEY,JSON.stringify(FOUND))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fmt(t){t=Math.max(0,t|0);return (t/60|0)+':'+('0'+t%60).slice(-2)}
function mediaId(){var n=D.nodes[ST.id];return (n&&n.clip)||ST.id}
function foundCount(){var n=0;Object.keys(D.nodes).forEach(function(k){if(D.nodes[k].ending&&FOUND[k])n++});return n}
function tally(){return foundCount()+'/'+TOTAL}
function count(){var n=tally();$('rcaCount').textContent=n;$('rcaCount2').textContent=n}
function hideRead(){$('rcaRead').hidden=true}
function hideCard(){var c=document.querySelector('.rca-endcard');if(c)c.remove()}
function showTap(){$('rcaTap').hidden=false}
function hideTap(){$('rcaTap').hidden=true}
function armSkip(){$('rcaSkip').disabled=false}
function paintMute(){var b=$('rcaMute');b.textContent=muted?'🔇':'🔊';b.setAttribute('aria-label',muted?'Unmute':'Mute');b.setAttribute('aria-pressed',muted?'true':'false')}
function resetBar(){$('rcaBar').style.width='0';$('rcaTime').textContent='0:00'}
function onTime(){
  var v=Clip.el(),d=v.duration,cur=v.currentTime||0;
  if(!isFinite(d)||!d){$('rcaTime').textContent=fmt(cur);return}
  $('rcaBar').style.width=(100*Math.min(1,cur/d))+'%';
  $('rcaTime').textContent=fmt(cur)+' / '+fmt(d);
}
function paint(n){
  $('rcaNum').style.display='none';
  $('rcaTitle').style.display='none';
  $('rcaTitle').textContent='';
  $('rcaFlags').innerHTML='';
  document.body.classList.toggle('rca-is-ending',!!n.ending);
}
function showChoices(){
  var n=D.nodes[ST.id],h;
  if(n.ending){
    FOUND[ST.id]=1;save();count();
    h='<div class="rca-endcard"><b>'+esc(n.ending)+'</b></div><button type="button" class="rca-choice" data-act="restart">Play again</button><button type="button" class="rca-choice" data-act="endings">🏆 Endings '+tally()+'</button>';
  }else{
    h=n.choices.map(function(c,i){
      return '<button type="button" class="rca-choice" data-i="'+i+'">'+esc(c[0])+'</button>';
    }).join('');
  }
  var el=$('rcaChoices');el.innerHTML=h;el.dataset.ready=ST.id;el.classList.add('on');
  $('rcaRead').hidden=false;
}
function reveal(){
  if(revealed)return;
  var v=Clip.el();
  if(v.getAttribute('data-id')!==mediaId())return;
  revealed=true;
  hideTap();
  $('rcaSkip').disabled=true;
  showChoices();
}
function startPlayback(){
  var token=++playToken;
  hideTap();
  var p;
  try{p=Clip.play()}catch(e){if(token===playToken&&!revealed)showTap();return}
  if(p&&p.then)p.then(function(){if(token!==playToken||revealed)return;hideTap()},function(){
    if(token!==playToken||revealed)return;
    if(Clip.el().paused)showTap();
  });
}
function begin(auto){
  var n=D.nodes[ST.id];
  revealed=false;
  playToken++;
  hideRead();
  hideCard();
  $('rcaChoices').innerHTML='';
  $('rcaChoices').dataset.ready='';
  paint(n);
  Clip.arm(mediaId());
  armSkip();
  resetBar();
  save();
  if(auto)startPlayback();
  else showTap();
}
function ensureVisible(){
  var b=$('reel').getBoundingClientRect();
  if(b.top<0||b.top>innerHeight*0.45)window.scrollTo(0,b.top+scrollY-76);
}
function go(to){
  ST.id=to;
  ensureVisible();
  begin(true);
}
Clip.on('ended',function(){
  var v=Clip.el();
  if(!v.ended||v.getAttribute('data-loaded')!==v.getAttribute('data-id')||v.getAttribute('data-id')!==mediaId())return;
  reveal();
});
Clip.on('error',function(){
  var v=Clip.el();
  if(!v.error||v.error.code===1||!v.getAttribute('src')||v.getAttribute('data-loaded')!==mediaId()||revealed)return;
  reveal();
});
Clip.on('timeupdate',onTime);
Clip.on('loadedmetadata',onTime);
Clip.on('durationchange',onTime);
Clip.on('playing',function(){hideTap()});
$('rcaTap').onclick=function(){startPlayback()};
$('rcaReplay').onclick=function(){revealed=false;hideRead();hideCard();$('rcaChoices').innerHTML='';armSkip();startPlayback()};
$('rcaSkip').onclick=function(){if(revealed)return;playToken++;Clip.pause();reveal()};
$('rcaMute').onclick=function(){muted=Clip.mute(!Clip.isMuted());paintMute();try{localStorage.setItem('rca-clip-mute',muted?'1':'0')}catch(e){}};
function restart(){go(D.start)}
$('rcaRestart').onclick=function(){if(confirm('Play again from the start? Endings you found stay found.'))restart()};
function endings(){
  Clip.pause();
  var h='';
  Object.keys(D.nodes).filter(function(k){return D.nodes[k].ending}).forEach(function(k){
    var n=D.nodes[k];
    h+=FOUND[k]
      ?'<button type="button" class="rca-g got" data-end="'+k+'"><span class="rca-g-art"><img src="'+Clip.poster(k)+'" onerror="this.onerror=null;this.src=\'images/the-rusty-stack.jpg\'" alt="" loading="lazy"></span><span class="rca-g-cap"><b>'+esc(n.ending)+'</b></span></button>'
      :'<div class="rca-g"><span class="rca-g-art"><img src="'+Clip.poster(k)+'" alt="" loading="lazy"><i>?</i></span><span class="rca-g-cap"><b>Not found yet</b></span></div>';
  });
  $('rcaEndList').innerHTML=h;count();$('rcaEndings').hidden=false;
  $('rcaEndings').scrollIntoView({behavior:RM?'auto':'smooth'});
}
$('rcaEndList').addEventListener('click',function(e){var b=e.target.closest('[data-end]');if(!b)return;$('rcaEndings').hidden=true;go(b.dataset.end)});
$('rcaEndBtn').onclick=endings;
$('rcaEndClose').onclick=function(){$('rcaEndings').hidden=true};
var ch=$('rcaChoices');
ch.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.dataset.act==='restart')return restart();
  if(b.dataset.act==='endings')return endings();
  if(ch.dataset.ready!==ST.id)return;
  var c=D.nodes[ST.id].choices[+b.dataset.i];
  if(!c)return;
  ch.dataset.ready='';
  go(c[1]);
});
paintMute();
count();
begin(false);
window.RCA={state:function(){return ST},found:function(){return FOUND}};
})();
