/* Site player for the CE-1 live broadcast (same 12-hour loop and clock sync as the app). CELive.render(el,{root:''}) */
(function(){
function e(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function build(R){var JT=(window.CE_SHOWS&&CE_SHOWS.jangtom.episodes)||[];
 var SP=(window.CE_LIVE_SPOTS||[]).map(function(s){return {t:'Station break',d:s.d,src:R+s.src,art:R+s.art,spot:1}});
 var S=[];CE_LIVE.programs.forEach(function(p,i){var x;
  if(p.k==='dogs'&&window.CE_DOGS)x={t:'Dogs That Chose Me · audiobook',d:CE_DOGS.secs,src:R+CE_DOGS.src,art:R+CE_DOGS.art};
  else if(p.k==='oldman')x={t:'Old Man On The Mountain · Part 1',d:741,src:R+'old-man-audiobook/audio/om01.m4a',art:R+'images/old-man-on-the-mountain.jpg'};
  else if(p.src)x={t:p.t,d:p.d,src:R+p.src,art:R+p.art};
  else{var ep=JT.filter(function(j){return j.key===p.k})[0];x={t:'Jang & Tom: '+ep.t,d:ep.secs,src:R+ep.src,art:R+ep.art}}
  S.push(x,SP[i%SP.length])});return S}
function render(el,o){o=o||{};var R=o.root||'',S=build(R),CYC=S.reduce(function(a,s){return a+s.d},0),au=new Audio(),on=false,cur=-1;au.preload='none';
 function slot(at){var st=at||Date.now(),off=(st/1000)%CYC;for(var i=0;i<S.length;i++){if(off<S[i].d)return {i:i,off:off,start:st-off*1000};off-=S[i].d}}
 function fmt(ms){return new Date(ms).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
 el.innerHTML='<div class="rshow"><div class="rs-cab"><div class="rs-top"><span class="rs-kicker">CE-1 · The Collier Radio Hour</span><span class="rs-air"><i></i>ON THE AIR</span></div>'+
  '<div class="rs-dial"><h2>Live Radio</h2><p>One station, always on: Jang &amp; Tom and Jason Collier\u2019s audiobooks, live for everyone at the same moment.</p><span class="rs-season" id="lvNow">…</span></div><div class="rs-grille"></div>'+
  '<div class="rs-tonight"><small>Now Playing</small><b id="lvT">…</b><p id="lvS"></p><button class="rs-play" id="lvBtn">\u25B6 Tune in</button><img id="lvA" alt=""></div>'+
  '<div class="rs-list"><h3>The Schedule</h3><div id="lvList"></div></div><p class="rs-credit">All programs and station breaks are Collier Entertainment originals. Jang &amp; Tom music by Kevin MacLeod (incompetech.com), licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> \u00b7 <a href="credits.html">Credits</a>. Times are in your time zone.</p></div></div>';
 var $=function(id){return el.querySelector('#'+id)};
 function guide(){var n=slot(),t=n.start,h='',c=0;for(var j=0;c<16;j++){var s=S[(n.i+j)%S.length];if(s.spot&&j){t+=s.d*1000;continue}
  h+='<div class="rs-ep"><span class="rs-n" style="font-size:14px">'+(j?fmt(t):'NOW')+'</span><div><b>'+e(s.t)+'</b><span>'+(s.spot?'Station break':Math.round(s.d/60)+' min')+'</span></div><span></span></div>';t+=s.d*1000;c++}
  $('lvList').innerHTML=h;var s0=S[n.i];$('lvT').textContent=s0.t;$('lvS').textContent=(s0.spot?'Station break':Math.round(s0.d/60)+' min')+' · ends '+fmt(n.start+s0.d*1000);$('lvA').src=s0.art;$('lvNow').textContent='Now: '+s0.t}
 function play(){var n=slot();cur=n.i;var s=S[n.i];au.src=s.src;au.addEventListener('loadedmetadata',function f(){au.removeEventListener('loadedmetadata',f);try{au.currentTime=Math.floor(n.off)}catch(x){}},{once:true});au.play().catch(function(){});guide()}
 var tries=0,bad={};
 function playIdx(i,off){cur=i;var s=S[i];tries=0;au.src=s.src;au.addEventListener('loadedmetadata',function f(){au.removeEventListener('loadedmetadata',f);try{au.currentTime=Math.floor(off)}catch(x){}},{once:true});au.play().catch(function(){});guide()}
 au.addEventListener('ended',function(){if(!on)return;var n=slot();if(bad[n.i]&&Date.now()-bad[n.i]<9e5){for(var j=1;j<S.length;j++){var k=(n.i+j)%S.length;if(!bad[k]){playIdx(k,0);return}}}play()});
 // a stream failed: retry twice, then skip to the next program
 au.addEventListener('error',function(){if(!on||cur<0)return;tries++;if(tries<=2){var t=au.currentTime;setTimeout(function(){au.load();au.addEventListener('loadedmetadata',function f(){au.removeEventListener('loadedmetadata',f);try{au.currentTime=t||Math.floor(slot().off)}catch(x){}},{once:true});au.play().catch(function(){})},1500*tries);return}
  bad[cur]=Date.now();for(var j=1;j<S.length;j++){var k=(cur+j)%S.length;if(!bad[k]){playIdx(k,0);return}}});
 $('lvBtn').onclick=function(){on=!on;if(on){play();this.textContent='\u275A\u275A Stop'}else{au.pause();this.textContent='\u25B6 Tune in'}};
 guide();setInterval(guide,20000);window.CELiveAudio=au}
window.CELive={render:render};
})();
