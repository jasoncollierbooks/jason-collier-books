/* The Rusty Stack cartoon. Each scene plays its clip, then the choices. No script prose. */
(function(){
var D=window.RUSTY_CYOA,Clip=window.RCAClip,$=function(i){return document.getElementById(i)};
var PAGE={s01:1,s02:4,s03:7,e1:9,s04:10,s05:13,e2:15,s06:17,s07:20,s08:23,e3:25,s09:27,s10:30,e4:31,s11:33,s12:36,s13:40,s14:43,e5:45,s15:47,s16:50,s17:54,s18:58,s19:61,e6:63,s20:65,s21:69,s22:73,s23:77,e7:82,e8:88};
var KEY='rca-progress',EKEY='rca-endings',RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var ST;try{ST=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!ST||!D.nodes[ST.id])ST={id:D.start,flags:{}};
var FOUND;try{FOUND=JSON.parse(localStorage.getItem(EKEY))||{}}catch(e){FOUND={}}
var muted=false;try{muted=localStorage.getItem('rca-clip-mute')==='1'}catch(e){}
var revealed=false,playToken=0;
Clip.init($('rcaVideo'),$('rcaPoster'));
Clip.mute(muted);
function save(){try{localStorage.setItem(KEY,JSON.stringify(ST));localStorage.setItem(EKEY,JSON.stringify(FOUND))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fmt(t){t=Math.max(0,t|0);return (t/60|0)+':'+('0'+t%60).slice(-2)}
function count(){var n=Object.keys(FOUND).length+'/8';$('rcaCount').textContent=n;$('rcaCount2').textContent=n}
function flags(){var f=[];if(ST.flags.hawke)f.push('🎯 Hawke joined the crew');if(ST.flags.lena)f.push('🛩 Lena “Lucky” joined the crew');$('rcaFlags').innerHTML=f.map(function(x){return '<span class="rca-flag">'+esc(x)+'</span>'}).join('')}
function land(c){return (c.req&&!ST.flags[c.req])?c.fallback:c.target}
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
  $('rcaNum').textContent=n.ending?'Ending '+n.num.slice(1):'Scene '+(+n.num);
  $('rcaTitle').textContent=n.title;
  flags();
  document.body.classList.toggle('rca-is-ending',!!n.ending);
}
function showChoices(){
  var n=D.nodes[ST.id],h;
  if(n.ending){
    FOUND[ST.id]=1;save();count();
    h='<div class="rca-endcard"><small>Ending '+esc(n.num.slice(1))+' of 8</small><b>'+esc(n.title)+'</b><i>'+esc(n.tag)+'</i></div><button type="button" class="rca-choice" data-act="restart">↺ Start a new voyage</button><button type="button" class="rca-choice" data-act="endings">🏆 Endings found: '+Object.keys(FOUND).length+'/8</button>';
  }else{
    h=n.choices.map(function(c,i){
      return (c.req&&!ST.flags[c.req])
        ?'<button type="button" class="rca-choice gated" data-i="'+i+'">'+esc(c.label)+'<em>Turn the page…</em></button>'
        :'<button type="button" class="rca-choice" data-i="'+i+'">'+esc(c.label)+'<em>Turn to page '+PAGE[c.target]+'</em></button>';
    }).join('');
  }
  var el=$('rcaChoices');el.innerHTML=h;el.dataset.ready=ST.id;el.classList.add('on');
  $('rcaRead').hidden=false;
}
function reveal(){
  if(revealed)return;
  var v=Clip.el();
  if(v.getAttribute('data-id')!==ST.id)return;
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
  Clip.arm(ST.id);
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
function go(to,setFlag){
  if(setFlag)ST.flags[setFlag]=true;
  ST.id=to;
  ensureVisible();
  begin(true);
}
Clip.on('ended',function(){
  var v=Clip.el();
  if(!v.ended||v.getAttribute('data-loaded')!==v.getAttribute('data-id')||v.getAttribute('data-id')!==ST.id)return;
  reveal();
});
Clip.on('error',function(){
  var v=Clip.el();
  if(!v.error||v.error.code===1||!v.getAttribute('src')||v.getAttribute('data-loaded')!==ST.id||revealed)return;
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
function restart(){ST.flags={};go(D.start)}
$('rcaRestart').onclick=function(){if(confirm('Start the voyage over from page 1? Endings you found stay found.'))restart()};
function endings(){
  Clip.pause();
  var h='';
  Object.keys(D.nodes).filter(function(k){return D.nodes[k].ending}).forEach(function(k){
    var n=D.nodes[k];
    h+=FOUND[k]
      ?'<button type="button" class="rca-g got" data-end="'+k+'"><span class="rca-g-art"><img src="'+Clip.poster(k)+'" onerror="this.onerror=null;this.src=\'images/the-rusty-stack.jpg\'" alt="" loading="lazy"></span><span class="rca-g-cap"><small>Ending '+n.num.slice(1)+' · page '+PAGE[k]+'</small><b>'+esc(n.title)+'</b><em>'+esc(n.tag)+'</em></span></button>'
      :'<div class="rca-g"><span class="rca-g-art"><img src="'+Clip.poster(k)+'" alt="" loading="lazy"><i>?</i></span><span class="rca-g-cap"><small>Ending '+n.num.slice(1)+'</small><b>Not found yet</b><em>Keep exploring</em></span></div>';
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
  go(land(c),c.set);
});
paintMute();
count();
begin(false);
window.RCA={state:function(){return ST},found:function(){return FOUND},page:PAGE};
})();
