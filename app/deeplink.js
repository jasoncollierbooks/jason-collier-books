/* Deep links: /app/?open=<id> opens the right thing inside the app.
   tab:home|listen|play|studio|read|club   play:<track key>   game:<games.js id>   gazette   frame:<site page[#anchor]>
   A bare tab name or games.js id also works. The ?open= is removed from the address bar afterwards. */
(function(){var CE=window.CE;if(!CE)return;var q;try{q=new URLSearchParams(location.search).get('open')}catch(e){}if(!q)return;
var TABS=['home','listen','play','studio','read','club','jangtom','guide'],G={};(window.CE_GAMES||[]).concat(window.CE_GAMES_MORE||[]).forEach(function(g){G[g.id]=g});
var TITLES={'gazette.html':'Pine Knot Gazette','art.html':'Art','studio.html':'Oil Studio','audiobooks.html':'Audiobooks','books.html':'Books','play.html':'Play','account.html':'Account','jang-tom.html':'Jang & Tom','live.html':'Live Radio','past-inspirations.html':'Past Inspirations','coloring.html':'Coloring','i-spy.html':'I Spy'};
var m=/^([a-z]+):(.*)$/.exec(q)||[null,'',q],kind=m[1],v=m[2];
if(!kind){if(TABS.indexOf(v)>=0)kind='tab';else if(G[v])kind='game';else if(v==='gazette')kind='gazette';else if(CE.TRACKS&&CE.TRACKS[v])kind='play'}
function clean(){try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}}
function frame(u,t,tab){if(tab)CE.go(tab);CE.frame(u,t||TITLES[u.split('#')[0]]||'Collier Entertainment')}
if(kind==='tab'&&TABS.indexOf(v)>=0)CE.go(v);
else if(kind==='play'&&CE.TRACKS&&CE.TRACKS[v]){CE.go('listen');CE.load(v,true)}
else if(kind==='game'&&G[v])frame(G[v].url,G[v].t,'play');
else if(kind==='gazette')frame('gazette.html','Pine Knot Gazette','home');
else if(kind==='frame'&&/^[a-z0-9][a-z0-9\-\/_.]*(#[a-z0-9\-_]*)?$/i.test(v)&&v.indexOf('..')<0)frame(v);
clean();window.CEDeepLink={open:q,kind:kind,value:v}})();
