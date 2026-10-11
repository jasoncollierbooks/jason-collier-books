/* CEShow.render(el,{show:'jangtom',root:'',app:false}): old-time radio hour show page from window.CE_SHOWS. */
(function(){
function e(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function render(el,o){o=o||{};var S=(window.CE_SHOWS||{})[o.show||'jangtom'];if(!el||!S)return;var R=o.root||'';
 var eps=S.episodes.filter(function(x){return x.src}),last=eps[eps.length-1];
 function btn(x,label){return o.app?'<button class="rs-play" data-play="'+x.key+'">\u25B6 '+label+'</button>':'<a class="rs-play" href="#ep-'+x.n+'" data-rs-play="'+x.n+'">\u25B6 '+label+'</a>'}
 var h='<div class="rshow"><div class="rs-cab"><div class="rs-top"><span class="rs-kicker">'+e(S.kicker)+'</span><span class="rs-air"><i></i>ON THE AIR</span></div>'+
 '<div class="rs-dial"><h2>'+e(S.name)+'</h2><p>'+e(S.tagline)+'</p><span class="rs-season">'+e(S.season)+'</span></div><div class="rs-grille"></div>';
 if(last)h+='<div class="rs-tonight"><small>Tonight\u2019s Broadcast \u00b7 Episode '+last.n+'</small><b>'+e(last.t)+'</b><p>'+e(last.d)+'</p>'+btn(last,'Listen now \u00b7 '+last.len)+'<img src="'+R+last.art+'" alt="" loading="lazy"></div>';
 h+='<div class="rs-list"><h3>The Program \u00b7 '+e(S.season)+'</h3>'+eps.map(function(x){
  return '<div class="rs-ep" id="ep-'+x.n+'"><span class="rs-n">'+x.n+'</span><div><b>'+e(x.t)+'</b><span>Episode '+x.n+' \u00b7 '+x.len+'. '+e(x.d)+'</span></div>'+btn(x,'Play')+(o.app?'':'<audio controls preload="none" src="'+R+x.src+'" aria-label="'+e(S.name+': '+x.t)+'"></audio>')+'</div>'}).join('')+'</div>'+
 '<p class="rs-credit">'+e(S.credit)+'</p></div></div>';
 el.innerHTML=h;
 if(!o.app)el.addEventListener('click',function(ev){var a=ev.target.closest('[data-rs-play]');if(!a)return;ev.preventDefault();var au=el.querySelector('#ep-'+a.dataset.rsPlay+' audio');el.querySelectorAll('audio').forEach(function(x){if(x!==au)x.pause()});au.scrollIntoView({behavior:'smooth',block:'center'});au.play().catch(function(){})})}
window.CEShow={render:render};
})();
