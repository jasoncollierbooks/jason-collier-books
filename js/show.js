/* CEShow.render(el,{show:'jangtom',root:'',app:false}): old-time radio hour show page from window.CE_SHOWS. */
(function(){
function e(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function mmss(s){return Math.floor(s/60)+':'+('0'+s%60).slice(-2)}
function banner(el,o){o=o||{};var S=(window.CE_SHOWS||{})[o.show||'jangtom'];if(!el||!S)return;var eps=S.episodes.filter(function(x){return x.src}),l=eps[eps.length-1];
 el.innerHTML='<button class="rs-banner" data-go="'+S.id+'"><span class="rs-top"><span class="rs-kicker">'+e(S.kicker)+'</span><span class="rs-air"><i></i>ON THE AIR</span></span><span class="rs-bdial"><b>'+e(S.name)+'</b><small>Tonight\u2019s Broadcast: Episode '+l.n+', '+e(l.t)+'</small></span><span class="rs-btune">'+eps.length+' episodes \u00b7 Tune in \u203a</span></button>'}
function render(el,o){o=o||{};var S=(window.CE_SHOWS||{})[o.show||'jangtom'];if(!el||!S)return;var R=o.root||'';
 var eps=S.episodes.filter(function(x){return x.src}),last=eps[eps.length-1];
 function btn(x,label){return o.app?'<button class="rs-play" data-play="'+x.key+'">\u25B6 '+label+'</button>':'<a class="rs-play" href="#ep-'+x.n+'" data-rs-play="'+x.n+'">\u25B6 '+label+'</a>'}
 var h='<div class="rshow"><div class="rs-cab"><div class="rs-top"><span class="rs-kicker">'+e(S.kicker)+'</span><span class="rs-air"><i></i>ON THE AIR</span></div>'+
 '<div class="rs-dial"><h2>'+e(S.name)+'</h2><p>'+e(S.tagline)+'</p><span class="rs-season">'+e(S.season)+'</span></div><div class="rs-grille"></div>';
 if(last)h+='<div class="rs-tonight"><small>Tonight\u2019s Broadcast \u00b7 Episode '+last.n+'</small><b>'+e(last.t)+'</b><p>'+e(last.d)+'</p>'+btn(last,'Listen now \u00b7 '+last.len)+'<img src="'+R+last.art+'" alt="" loading="lazy"></div>';
 h+='<div class="rs-list"><h3>The Program \u00b7 '+e(S.season)+'</h3>'+eps.map(function(x){
  return '<div class="rs-ep" id="ep-'+x.n+'"><span class="rs-n">'+x.n+'</span><div><b>'+e(x.t)+'</b><span>Episode '+x.n+' \u00b7 '+x.len+'. '+e(x.d)+'</span></div>'+btn(x,'Play')+(x.ch?'<details class="rs-ch"><summary>Chapters ('+x.ch.length+')</summary><ol>'+x.ch.map(function(c){return '<li><button type="button" data-rs-ch="'+x.n+'" data-key="'+x.key+'" data-t="'+c[0]+'"><i>'+mmss(c[0])+'</i> '+e(c[1])+'</button></li>'}).join('')+'</ol></details>':'')+(o.app?'':'<audio controls preload="none" src="'+R+x.src+'" aria-label="'+e(S.name+': '+x.t)+'"></audio>')+'</div>'}).join('')+'</div>'+
 '<p class="rs-credit">'+e(S.credit)+' \u00b7 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">License</a> \u00b7 <a href="'+R+'credits.html">Credits</a></p></div></div>';
 el.innerHTML=h;
 el.addEventListener('click',function(ev){var c=ev.target.closest('[data-rs-ch]');if(!c)return;ev.preventDefault();ev.stopPropagation();var t=+c.dataset.t;if(o.app){window.CE&&CE.load(c.dataset.key,true,t);return}var au=el.querySelector('#ep-'+c.dataset.rsCh+' audio');el.querySelectorAll('audio').forEach(function(x){if(x!==au)x.pause()});var go=function(){au.currentTime=t;au.play().catch(function(){})};if(au.readyState>0)go();else{au.preload='metadata';au.addEventListener('loadedmetadata',go,{once:true});au.load()}});
 if(!o.app)el.addEventListener('click',function(ev){var a=ev.target.closest('[data-rs-play]');if(!a)return;ev.preventDefault();var au=el.querySelector('#ep-'+a.dataset.rsPlay+' audio');el.querySelectorAll('audio').forEach(function(x){if(x!==au)x.pause()});au.scrollIntoView({behavior:'smooth',block:'center'});au.play().catch(function(){})})}
window.CEShow={render:render,banner:banner};
})();
