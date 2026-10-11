/* Pine Knot Gazette renderer. PKGazette.render(el, {root:'' or '../', app:true|false, compact:true|false, date:Date}) */
(function(){
var GO={ep:['audiobooks.html#jang-and-tom-radio','app/media/jang-tom-wide.jpg',{play:'ridge'}],ep2:['audiobooks.html#great-possum-caper','images/hero/hero-1.jpg',{play:'possum'}],ep3:['audiobooks.html#ice-fishin-fiasco','images/jang-tom-ice-fishin.jpg',{play:'icefish'}],ep4:['audiobooks.html#rocket-stove-rebellion','images/jang-tom-rocket-stove.jpg',{play:'rocket'}],bookworlds:['book-worlds/','book-worlds/assets/play-cover.webp'],oldman:['old-man-game/','app/media/oldman-hunt-card.jpg'],
 ispy:['i-spy.html','images/scenes/transcon-s01.jpg'],coloring:['coloring.html','coloring/campfire.png'],studio:['studio.html','coloring/campfire.png'],audiobooks:['audiobooks.html','images/the-first-pulse.jpg'],
 books:['books.html','images/jang-and-tom-wagon-masters.jpg'],club:['account.html','app/icons/icon-192.png'],play:['play.html','images/lab/born-twice-og.jpg',{go:'play'}],listen:['audiobooks.html','app/media/jang-tom-tv.jpg',{go:'listen'}],
 firstpulse:['https://fern-valley-glow-reef.grok.me/','images/first-pulse-game.jpg']};
GO.studio[1]='images/scenes/transcon-s10.jpg';
var ART=['app/media/jang-tom-wide.jpg','images/hero/hero-1.jpg','images/hero/hero-2.jpg','images/hero/hero-3.jpg','images/hero/hero-4.jpg','book-worlds/assets/play-cover.webp','images/art/transcon-s07.jpg','images/art/philly-s03.jpg','images/scenes/transcon-s21.jpg','images/art/transcon-s26.jpg'];
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function dayNum(d){return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5)}
function pick(d){var P=window.PK_GAZETTE||[],n=dayNum(d);return {i:((n%P.length)+P.length)%P.length,no:n-dayNum(new Date(2026,0,1))+1}}
function link(go,o,inner,cls){var g=GO[go]||GO.play,url=g[0],ext=/^https?:/.test(url),title=inner.replace(/<[^>]*>/g,'');
 if(o.app){var a=g[2]||{};if(a.play)return '<button class="'+cls+'" data-play="'+a.play+'">'+inner+'</button>';if(a.go)return '<button class="'+cls+'" data-go="'+a.go+'">'+inner+'</button>';
  return '<button class="'+cls+'" data-frame="'+url+'" data-title="Collier Entertainment">'+inner+'</button>'}
 return '<a class="'+cls+'" href="'+(ext?url:o.root+url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+inner+'</a>'}
function render(el,o){o=o||{};o.root=o.root||'';var d=o.date||new Date(),p=pick(d),G=(window.PK_GAZETTE||[])[p.i];if(!G||!el)return;
 var date=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
 var art=o.root+ART[p.i%ART.length];
 var h='<div class="pkg'+(o.compact?' pkg-compact':'')+'"><header class="pkg-mast"><div class="pkg-ears"><span>PRICE<br>ONE CENT</span><span>WEATHER<br>FAIR</span></div><h2 class="pkg-title">The Pine Knot Gazette</h2>'+
 '<div class="pkg-rule"><span>Vol. I \u00b7 No. '+p.no+'</span><span>'+esc(date)+'</span><span>All the News Fit to Holler</span></div></header>'+
 '<article class="pkg-lead"><h3>'+esc(G.lead.h)+'</h3><p class="pkg-dek">'+esc(G.lead.d)+'</p><figure class="pkg-cut"><img src="'+art+'" alt="" loading="lazy"><figcaption>Our artist\u2019s impression.</figcaption></figure>'+
 G.lead.b.map(function(x,i){return '<p'+(i===0?' class="pkg-drop"':'')+'>'+esc(x)+'</p>'}).join('')+'</article>'+
 '<div class="pkg-cols">'+G.shorts.map(function(s){return '<section class="pkg-short"><h4>'+esc(s.h)+'</h4><p>'+esc(s.b)+'</p></section>'}).join('')+'</div>'+
 '<div class="pkg-ads"><div class="pkg-adsh">\u2766 Advertisements \u2766</div>'+(o.compact?G.ads.slice(0,1):G.ads).map(function(a){var g=GO[a.go]||GO.play;return link(a.go,o,'<img src="'+o.root+g[1]+'" alt="" loading="lazy"><b>'+esc(a.h)+'</b><span>'+esc(a.b)+'</span><i>'+esc(a.c)+' \u261E</i>','pkg-ad')}).join('')+'</div>'+
 '<footer class="pkg-foot">Printed daily in Pine Knot. All news is made up for fun. Est. by Collier Entertainment.</footer></div>';
 el.innerHTML=h}
window.PKGazette={render:render,pick:pick};
})();
