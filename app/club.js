/* Pine Knot Club (free with sign-in): small Home banner, hints on locked features, and for signed-out
   visitors the FIRST break of a session is a Club spot ("We interrupt this program..."). Gone once signed in. */
(function(){
var CE=window.CE,A=window.CollierAuth,$=function(s,r){return (r||document).querySelector(s)};
function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v)}catch(e){}}
function member(){return CE&&CE.isSub()}
function signIn(){CE.frame('account.html','Join the Club')}
// 1. Home banner (small, dismissible for the session)
var bar=document.createElement('div');bar.className='joinbar';bar.id='joinBar';bar.hidden=true;
bar.innerHTML='<button class="joinbar-x" aria-label="Hide for now">\u2715</button><small>PINE KNOT CLUB</small><b>Sign in free for full access</b><span>Fewer commercials, the full studio, downloads &amp; more.</span><button class="joinbar-go">Sign in</button>';
var home=$('#home'),tv=$('.tv',home);tv.parentNode.insertBefore(bar,tv);
$('.joinbar-x',bar).onclick=function(){ss('ce-joinbar-x','1');bar.hidden=true};
$('.joinbar-go',bar).onclick=signIn;
// 2. hints on locked features
var dl=$('#dl');
function hints(){var m=member(),out=!m&&A&&A.status!=='offline';
 bar.hidden=!out||ss('ce-joinbar-x')==='1';
 document.documentElement.classList.toggle('ce-guest',!!out);
 if(dl&&out&&dl.textContent.indexOf('Downloaded')<0)dl.innerHTML='\u2B07 Download <em class="lockhint">\uD83D\uDD12 free with sign-in</em>';
 else if(dl&&!out&&dl.querySelector('.lockhint'))dl.textContent='\u2B07 Download for offline';
 var sc=$('#studio .studio-card');if(sc){var h=$('#studioLock');if(out&&!h){sc.insertAdjacentHTML('beforeend','<button class="lockline" id="studioLock">\uD83D\uDD12 Full studio, Half-mix &amp; Save to Photos: <u>sign in free</u></button>');$('#studioLock').onclick=signIn}else if(!out&&h)h.remove()}
 if(!out){var p=$('#clubSpot');if(p)p.remove()}}
// 3. Club spot as the first break of the session (signed out only)
var au=CE.au;
CE.clubSpot=function(){if(member()||!(A&&A.status==='out')||ss('ce-club-spot'))return false;ss('ce-club-spot','1');
 var was=au&&!au.paused;if(was)au.pause();
 var fm=[];try{var fw=$('#frame').hidden?null:$('#fr').contentWindow;if(fw){if(fw.__oldman)fw.__oldman.holdSim(true);fw.document.querySelectorAll('audio,video').forEach(function(m){if(!m.paused){m.pause();fm.push(m)}})}}catch(e){}
 var o=document.createElement('div');o.className='clubspot';o.id='clubSpot';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','A message from the Pine Knot Club');
 o.innerHTML='<div class="cs-tv"><div class="cs-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'+
  '<p class="cs-int">WE INTERRUPT THIS PROGRAM</p><div class="cs-card"><small>A MESSAGE FROM THE</small><h2>Pine Knot Club</h2>'+
  '<p>Sign in free and unlock:</p><ul><li>\uD83D\uDCFB Fewer commercials</li><li>\uD83C\uDFA8 The full Oil Studio</li><li>\u2B07\uFE0F Offline downloads</li><li>\u2B50 Club extras</li></ul>'+
  '<p class="cs-free">No cost. Just your email.</p><button class="cs-go">Sign in free</button><button class="cs-later">Maybe later</button>'+
  '<button class="cs-mute" aria-label="Mute announcer">\uD83D\uDD0A</button></div></div>';
 document.body.appendChild(o);
 var vo=new Audio('media/club-spot.mp3');vo.volume=.9;vo.play().catch(function(){});
 $('.cs-mute',o).onclick=function(){vo.muted=!vo.muted;this.textContent=vo.muted?'\uD83D\uDD07':'\uD83D\uDD0A'};
 function done(go){vo.pause();o.remove();try{var w=$('#fr').contentWindow;if(w&&w.__oldman)w.__oldman.holdSim(false)}catch(e){}
  if(go)signIn();else{fm.forEach(function(m){m.play().catch(function(){})});if(was)au.play().catch(function(){})}}
 $('.cs-go',o).onclick=function(){done(true)};$('.cs-later',o).onclick=function(){done(false)};
 return true};
if(A)A.onChange(hints);hints();
var oc=CE.onClub;CE.onClub=function(){oc&&oc();hints()};
})();
