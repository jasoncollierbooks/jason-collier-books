/* Rusty Stack CYOA "living art": camera moves per narrated paragraph, depth parallax, ambient fx, hidden gags. */
(function(){
var S=window.RCA_STAGE||{s:{},gagInfo:{}},RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var GKEY='rca-gags',GOT={};try{GOT=JSON.parse(localStorage.getItem(GKEY))||{}}catch(e){}
var TOTAL=Object.keys(S.gagInfo).length;
var st,frame,world,PL=[],IM=[],HZ=[],cv,cx,gl,flashEl,toast,cap,lens,lx,W=960,H=540,LW=480,LH=270;
var DEPTH=window.RCA_DEPTH||{},NP=1,PD=[0,.42,.72,1];  /* plane depth: 0 sky/far, .42 subject, .72 near props, 1 lens-side */
var id=null,cfg=null,fx=[],lfx=[],tgt={x:.5,y:.5,z:1.06},cur={x:.5,y:.5,z:1.06},T=0,last=0,raf=0,visible=true,sway=false,lowFx=false;
var VID=null,SD=!!(navigator.connection&&navigator.connection.saveData),MOTION=!RM&&!SD,VV=1;
var GL=[],focusK=1,gyro={on:false,x:0,y:0},push=0;
function el(t,c,p){var e=document.createElement(t);if(c)e.className=c;if(p)p.appendChild(e);return e}
function src(i,k){return 'images/rusty-cyoa/'+i+'-L'+k+(k?'.webp':'.jpg')}
function build(host){
  st=el('div','rs-stage');frame=el('div','rs-frame',st);world=el('div','rs-world',frame);
  for(var k=0;k<NP;k++){
    
    var pl=el('div','rs-pl rs-pl'+k,world),im=el('img','',pl);im.alt='';im.decoding='async';
    im.onerror=(function(k){return function(){this.onerror=null;if(k===0)this.src='images/the-rusty-stack.jpg';else this.style.display='none'}})(k);
    PL.push(pl);IM.push(im);
    if(k===0){VID=el('video','rs-vid',pl);VID.muted=true;VID.defaultMuted=true;VID.loop=true;VID.playsInline=true;VID.setAttribute('playsinline','');VID.setAttribute('muted','');VID.setAttribute('aria-hidden','true');VID.preload='auto';VID.disablePictureInPicture=true;
      VID.addEventListener('playing',function(){VID.classList.add('on')});VID.addEventListener('error',function(){VID.classList.remove('on')});
      cv=el('canvas','rs-fx',pl)}GL.push(el('div','rs-gags',pl))
  }
  lens=el('canvas','rs-lens',frame);flashEl=el('div','rs-flash',frame);
  cap=el('div','rs-cap',frame);toast=el('div','rs-toast',frame);
  var tb=el('div','rs-tbar',frame);
  
  var pp=el('button','rs-btn rs-pp',tb);pp.type='button';pp.setAttribute('aria-label','Play or pause');pp.textContent='▶';
  var fs=el('button','rs-btn rs-fs',tb);fs.type='button';fs.setAttribute('aria-label','Theater mode');fs.textContent='⛶';
  pp.onclick=function(e){e.stopPropagation();var b=document.getElementById('rcaPlay');if(b)b.click()};
  fs.onclick=function(e){e.stopPropagation();theater(!st.classList.contains('theater'))};
  
  host.innerHTML='';host.appendChild(st);
  lowFx=(navigator.hardwareConcurrency||4)<=4||Math.min(screen.width,screen.height)<500;
  if(lowFx){W=640;H=360;LW=320;LH=180;st.classList.add('low')}cv.width=W;cv.height=H;cx=cv.getContext('2d');lens.width=LW;lens.height=LH;lx=lens.getContext('2d');
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){visible=es[0].isIntersecting;kick();vsync()}).observe(st);
  document.addEventListener('visibilitychange',function(){kick();vsync()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')theater(false)});
}
function onTilt(e){if(e.gamma==null)return;gyro.x=clamp(e.gamma/25,-1,1);gyro.y=clamp((e.beta-45)/25,-1,1)}
function toggleGyro(b){
  if(gyro.on){gyro.on=false;gyro.x=gyro.y=0;window.removeEventListener('deviceorientation',onTilt);b.classList.remove('on');return}
  function go(){gyro.on=true;window.addEventListener('deviceorientation',onTilt);b.classList.add('on')}
  var D=window.DeviceOrientationEvent;
  if(D&&typeof D.requestPermission==='function')D.requestPermission().then(function(r){if(r==='granted')go()}).catch(function(){});else go();
}
var home;function theater(on){if(on===st.classList.contains('theater'))return;if(on){home=st.parentNode;document.body.appendChild(st)}else if(home)home.appendChild(st);st.classList.toggle('theater',on);document.documentElement.classList.toggle('rs-lock',on);
  st.querySelector('.rs-fs').textContent=on?'✕':'⛶';st.querySelector('.rs-fs').setAttribute('aria-label',on?'Close theater':'Theater mode')}
/* ---------- camera ---------- */
function clamp(v,a,b){return v<a?a:v>b?b:v}
function planeAt(x,y,mx){var m=(DEPTH[id]||{}).map;if(!m)return 1;var c={},best=1,bn=0;
  for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var X=clamp(Math.round(x*48-.5)+dx,0,47),Y=clamp(Math.round(y*27-.5)+dy,0,26),v=+m[Y*48+X];c[v]=(c[v]||0)+1;if(c[v]>bn){bn=c[v];best=v}if(mx&&v>mx.v)mx.v=v}
  return mx?mx.v:best}
function setFocus(k){focusK=k;return;focusK=k;for(var i=0;i<NP;i++){var b=Math.abs(i-k)*(lowFx?.9:1.25);if(i===0&&k>=1)b=Math.max(b,.8);
  PL[i].style.filter=b>.2?'blur('+b.toFixed(2)+'px)':'none'}
  HZ.forEach(function(h,j){h.style.opacity=(j?.1:.16)})}
function setCam(c,snap){tgt={x:c[0],y:c[1],z:RM?1.04:c[2]};if(RM){tgt.x=.5;tgt.y=.5}push=0;if(snap||RM)cur={x:tgt.x,y:tgt.y,z:tgt.z}
  setFocus(RM?1:(c[3]!=null?c[3]:planeAt(c[0],c[1])))}
var ox=0,oy=0;
function apply(){for(var k=0;k<NP;k++){PL[k].style.transform='none';PL[k].style.filter='none'}world.style.transform='';return;
  var x=cur.x,y=cur.y,rot=0;
  /* orbit: the eye circles slowly around the focal point, so planes slide past each other */
  var tox=0,toy=0;if(!RM){tox=Math.sin(T*.23)*.9+Math.sin(T*.071)*.4;toy=Math.cos(T*.17)*.5;if(sway)rot=Math.sin(T*.55)*.4}
  tox+=gyro.x*1.6;toy+=gyro.y*1.2;ox+=(tox-ox)*.08;oy+=(toy-oy)*.08;
  var pf=PD[focusK]||.42,travel=(cur.x-.5);
  for(var k=0;k<NP;k++){
    var d=PD[k]-pf;
    var s=1.1+.04*PD[k];                                  /* fixed framing: only enough overscan for the planes to slide */
    var tx=.5-x*s,ty=.5-y*s;
    tx+=-(ox*.03+travel*.07)*d*(1+PD[k]);ty+=-oy*.02*d*(1+PD[k]);  /* parallax around the focus plane */
    if(k===0){tx=clamp(tx,1-s,0);ty=clamp(ty,1-s,0)}else{tx=clamp(tx,1-s-.03,.03);ty=clamp(ty,1-s-.02,.02)}
    PL[k].style.transform='translate3d('+(tx*100).toFixed(3)+'%,'+(ty*100).toFixed(3)+'%,0) scale('+s.toFixed(4)+')'+(rot&&k>1?' rotate('+(rot*(1+d)).toFixed(3)+'deg)':'');
  }
  world.style.transform=rot?'rotate('+(rot*.5).toFixed(3)+'deg)':'';
}

/* ---------- ambient fx ---------- */
function R(a,b){return a+Math.random()*(b-a)}
function rgba(h,a){var n=parseInt(h.slice(1),16);if(h.length===4){n=parseInt(h.slice(1).split('').map(function(c){return c+c}).join(''),16)}return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a.toFixed(3)+')'}
function puffs(x,y,col,rate,size,rise,life){var ps=[],acc=0;return{u:function(dt){acc+=dt;while(acc>rate){acc-=rate;ps.push({x:x*W+R(-6,6),y:y*H,r:size*R(.6,1),a:0,t:0,vx:R(4,14),l:life*R(.8,1.2)})}
  for(var i=ps.length-1;i>=0;i--){var p=ps[i];p.t+=dt;p.x+=p.vx*dt;p.y-=rise*dt;p.r+=size*.9*dt;if(p.t>p.l)ps.splice(i,1)}},
  d:function(c){for(var i=0;i<ps.length;i++){var p=ps[i],k=p.t/p.l,a=(k<.15?k/.15:1-k)*.42;var g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);g.addColorStop(0,rgba(col,a));g.addColorStop(1,rgba(col,0));c.fillStyle=g;c.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2)}}}}
var FX={
 clouds:function(){var cs=[];for(var i=0;i<(lowFx?4:6);i++)cs.push({x:R(0,W),y:R(0,H*.55),r:R(60,150)*W/960,v:R(5,14)*W/960,a:R(.05,.12)});
  return{u:function(dt){cs.forEach(function(c){c.x+=c.v*dt;if(c.x-c.r>W)c.x=-c.r})},d:function(c){cs.forEach(function(k){var g=c.createRadialGradient(k.x,k.y,0,k.x,k.y,k.r);g.addColorStop(0,'rgba(255,250,240,'+k.a+')');g.addColorStop(1,'rgba(255,250,240,0)');c.fillStyle=g;c.fillRect(k.x-k.r,k.y-k.r*.6,k.r*2,k.r*1.2)})}}},
 smoke:function(x,y,col){return puffs(x,y,col||'#8a8580',.22,18*W/960,26*H/540,3.2)},
 steam:function(x,y){return puffs(x,y,'#f4f1ea',.18,8*W/960,34*H/540,1.6)},
 glow:function(x,y,r,col){return{d:function(c){var a=.22+.12*Math.sin(T*2.1+x*9),rr=r*W,g=c.createRadialGradient(x*W,y*H,0,x*W,y*H,rr);g.addColorStop(0,rgba(col,a));g.addColorStop(1,rgba(col,0));c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(x*W-rr,y*H-rr,rr*2,rr*2);c.globalCompositeOperation='source-over'}}},
 flicker:function(x,y,r,col){col=col||'#ffb050';var a=.3;return{u:function(){a+=(R(.15,.5)-a)*.35},d:function(c){var rr=r*W*(1+a*.15),g=c.createRadialGradient(x*W,y*H,0,x*W,y*H,rr);g.addColorStop(0,rgba(col,a));g.addColorStop(1,rgba(col,0));c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(x*W-rr,y*H-rr,rr*2,rr*2);c.globalCompositeOperation='source-over'}}},
 sway:function(){return{}},
 flash:function(x,y,col){var t=R(1,3),on=0;return{C:function(){on=.18},u:function(dt){t-=dt;if(t<0){t=R(2,4.5);if(!synced())on=.14}on=Math.max(0,on-dt)},d:function(c){if(on<=0)return;var rr=40*W/960,g=c.createRadialGradient(x*W,y*H,0,x*W,y*H,rr);g.addColorStop(0,'rgba(255,255,230,.95)');g.addColorStop(.4,rgba(col,.7));g.addColorStop(1,rgba(col,0));c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(x*W-rr,y*H-rr,rr*2,rr*2);c.globalCompositeOperation='source-over'}}},
 sparks:function(x,y,col){col=col||'#ffcc66';var ps=[],t=R(.5,2);return{u:function(dt){t-=dt;if(t<0){t=R(1.5,3.5);for(var i=0;i<14;i++)ps.push({x:x*W,y:y*H,vx:R(-90,90),vy:R(-120,-10),l:R(.4,.9),t:0})}
  for(var i=ps.length-1;i>=0;i--){var p=ps[i];p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;if(p.t>p.l)ps.splice(i,1)}},
  d:function(c){c.strokeStyle=col;c.lineWidth=1.4;c.beginPath();ps.forEach(function(p){c.globalAlpha=1-p.t/p.l;c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.03,p.y-p.vy*.03)});c.stroke();c.globalAlpha=1}}},
 eyes:function(list){var tw=list.map(function(){return R(0,6)});return{u:function(dt){for(var i=0;i<tw.length;i++){tw[i]-=dt;if(tw[i]<-.35)tw[i]=R(1.5,6)}},
  d:function(c){c.globalCompositeOperation='lighter';list.forEach(function(e,i){var X=e[0]*W,Y=e[1]*H,a=.35+.15*Math.sin(T*3+i),s=tw[i]<0?1-Math.abs(tw[i]+.175)/.175:0,r=5*W/960;
   var g=c.createRadialGradient(X,Y,0,X,Y,r*2.5);g.addColorStop(0,'rgba(255,40,30,'+(a+s*.5)+')');g.addColorStop(1,'rgba(255,0,0,0)');c.fillStyle=g;c.fillRect(X-r*3,Y-r*3,r*6,r*6);
   if(s>0){c.strokeStyle='rgba(255,230,220,'+s+')';c.lineWidth=1;c.beginPath();c.moveTo(X-r*3*s,Y);c.lineTo(X+r*3*s,Y);c.moveTo(X,Y-r*3*s);c.lineTo(X,Y+r*3*s);c.stroke()}});c.globalCompositeOperation='source-over'}}},
 drip:function(x,y){var ds=[],t=0;return{u:function(dt){t-=dt;if(t<0){t=R(1,2.5);ds.push({x:x*W+R(-15,15),y:y*H,v:0,l:0})}ds.forEach(function(d){d.l=Math.min(d.l+dt*8,14);if(d.l>=14){d.v+=200*dt;d.y+=d.v*dt}});ds=ds.filter(function(d){return d.y<H})},
  d:function(c){c.fillStyle='rgba(20,30,15,.85)';ds.forEach(function(d){c.beginPath();c.ellipse(d.x,d.y+d.l*.5,2.2,2+d.l*.45,0,0,7);c.fill();c.fillStyle='rgba(120,255,90,.35)';c.fillRect(d.x-.6,d.y+d.l*.3,1.2,2);c.fillStyle='rgba(20,30,15,.85)'})}}},
 dust:function(){var ms=[];for(var i=0;i<(lowFx?14:28);i++)ms.push({x:R(0,W),y:R(0,H),v:R(3,10),p:R(0,7),r:R(.6,1.8)});
  return{u:function(dt){ms.forEach(function(m){m.y-=m.v*dt*.4;m.x+=Math.sin(T*.5+m.p)*m.v*dt*.5;if(m.y<0)m.y=H})},d:function(c){c.fillStyle='rgba(255,236,190,.5)';ms.forEach(function(m){c.globalAlpha=.3+.3*Math.sin(T+m.p);c.fillRect(m.x,m.y,m.r,m.r)});c.globalAlpha=1}}},
 rain:function(){var n=lowFx?60:120,rs=[];for(var i=0;i<n;i++)rs.push({x:R(0,W),y:R(0,H),v:R(500,800)});
  return{u:function(dt){rs.forEach(function(r){r.y+=r.v*dt;r.x-=r.v*dt*.25;if(r.y>H){r.y=-20;r.x=R(0,W*1.2)}})},d:function(c){c.strokeStyle='rgba(200,215,235,.28)';c.lineWidth=1;c.beginPath();rs.forEach(function(r){c.moveTo(r.x,r.y);c.lineTo(r.x+4,r.y-16)});c.stroke()}}},
 lightning:function(col){col=col||'#dde6ff';var t=R(1.5,4),on=0,bolt=[];function fire(){on=.22;var x=R(.1,.9)*W,y=0;bolt=[[x,y]];while(y<H*.6){x+=R(-30,30);y+=R(15,35);bolt.push([x,y])}if(!RM)flash()}
  return{L:fire,u:function(dt){t-=dt;if(t<0){t=R(4,8);if(!synced())fire()}on=Math.max(0,on-dt)},
  d:function(c){if(on<=0)return;c.strokeStyle=rgba(col,Math.min(1,on*6));c.lineWidth=2.2;c.shadowColor=col;c.shadowBlur=12;c.beginPath();bolt.forEach(function(p,i){i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])});c.stroke();c.shadowBlur=0}}},
 arc:function(x,y,r){return{d:function(c){if(Math.random()<.3)return;c.strokeStyle='rgba(140,200,255,.85)';c.lineWidth=1.3;c.shadowColor='#6cf';c.shadowBlur=8;c.beginPath();
  for(var k=0;k<3;k++){var a=R(0,6.3),X=x*W,Y=y*H;c.moveTo(X,Y);for(var s=1;s<=5;s++)c.lineTo(X+Math.cos(a)*r*W*s/5+R(-6,6),Y+Math.sin(a)*r*H*s/5+R(-6,6))}c.stroke();c.shadowBlur=0}}},
 prop:function(x,y,r){return{d:function(c){c.save();c.translate(x*W,y*H);c.rotate(T*9);c.fillStyle='rgba(230,225,210,.13)';for(var i=0;i<3;i++){c.rotate(2.094);c.beginPath();c.moveTo(0,0);c.arc(0,0,r*W,0,.5);c.fill()}c.restore()}}},
 vortex:function(x,y){return{d:function(c){c.save();c.translate(x*W,y*H);c.strokeStyle='rgba(220,220,240,.12)';c.lineWidth=3;for(var i=0;i<5;i++){c.beginPath();c.arc(0,0,(30+i*28)*W/960,T*(1.2-i*.15)+i,T*(1.2-i*.15)+i+2.2);c.stroke()}c.restore()}}},
 debris:function(x,y){var ps=[];return{u:function(dt){if(Math.random()<dt*5)ps.push({x:x*W+R(-60,60),y:y*H+R(-20,20),vx:R(-40,40),vy:R(-30,10),a:R(0,6),va:R(-6,6),t:0,s:R(2,5)});
  ps.forEach(function(p){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;p.a+=p.va*dt});ps=ps.filter(function(p){return p.t<3})},
  d:function(c){c.fillStyle='rgba(40,30,25,.85)';ps.forEach(function(p){c.save();c.translate(p.x,p.y);c.rotate(p.a);c.fillRect(-p.s,-p.s/2,p.s*2,p.s);c.restore()})}}},
 embers:function(){var ps=[];return{u:function(dt){if(Math.random()<dt*12)ps.push({x:R(0,W),y:H,v:R(20,50),p:R(0,7),t:0,l:R(3,6)});ps.forEach(function(p){p.t+=dt;p.y-=p.v*dt;p.x+=Math.sin(T*2+p.p)*.4});ps=ps.filter(function(p){return p.t<p.l})},
  d:function(c){c.globalCompositeOperation='lighter';ps.forEach(function(p){c.fillStyle='rgba(255,'+(120+((p.p*20)|0))+',40,'+(1-p.t/p.l)*.8+')';c.fillRect(p.x,p.y,2,2)});c.globalCompositeOperation='source-over'}}},
 bob:function(){var bs=[],t=R(1,3),cols=['#d9342b','#e8b23a','#c46a2f'];return{u:function(dt){t-=dt;if(t<0){t=R(5,9);bs.push({x:R(.15,.85)*W,y:H+20,v:R(14,22),c:cols[(Math.random()*3)|0],p:R(0,6)})}bs.forEach(function(b){b.y-=b.v*dt});bs=bs.filter(function(b){return b.y>-40})},
  d:function(c){bs.forEach(function(b){var x=b.x+Math.sin(T*.8+b.p)*8,s=9*W/960;c.strokeStyle='rgba(60,40,30,.6)';c.lineWidth=1;c.beginPath();c.moveTo(x,b.y+s);c.quadraticCurveTo(x+4,b.y+s*2.5,x-2,b.y+s*4);c.stroke();c.fillStyle=b.c;c.beginPath();c.ellipse(x,b.y,s*.8,s,0,0,7);c.fill();c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(x-s*.3,b.y-s*.35,s*.2,s*.3,0,0,7);c.fill()})}}}
};
var AU=null,EV=[],evT=0;function synced(){return AU&&!AU.paused&&EV.length}
function sfxTick(){if(!AU||AU.paused)return;var t=AU.currentTime;if(t<evT-.5)evT=t;EV.forEach(function(e){if(e[0]>evT&&e[0]<=t)fx.forEach(function(f){if(f[e[1]])f[e[1]]()})});evT=t}
function flash(){flashEl.classList.remove('on');void flashEl.offsetWidth;flashEl.classList.add('on')}
function frameFx(dt){cx.clearRect(0,0,W,H);for(var i=0;i<fx.length;i++){var f=fx[i];if(f.u&&!RM)f.u(Math.min(dt,.1));if(f.d)f.d(cx)}}
/* ---------- things drifting right in front of the lens (drawn small, upscaled = soft focus) ---------- */
function lensFx(list){if(RM)return [];var has={};list.forEach(function(f){has[f[0]]=1});var out=[],warm=has.flicker||has.embers||has.flash||has.sparks;
 out.push((function(){var os=[];for(var i=0;i<(lowFx?4:7);i++)os.push({x:R(0,LW),y:R(0,LH),r:R(8,26),v:R(-6,6),w:R(-4,2),p:R(0,6)});var col=warm?'255,190,110':'210,225,255';
  return function(c,dt){os.forEach(function(o){o.x+=o.v*dt;o.y+=o.w*dt;if(o.x<-30)o.x=LW+30;if(o.x>LW+30)o.x=-30;if(o.y<-30)o.y=LH+30;if(o.y>LH+30)o.y=-30;
   var a=.07+.05*Math.sin(T*.7+o.p),g=c.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);g.addColorStop(0,'rgba('+col+','+a+')');g.addColorStop(.7,'rgba('+col+','+a*.6+')');g.addColorStop(1,'rgba('+col+',0)');c.fillStyle=g;c.beginPath();c.arc(o.x,o.y,o.r,0,7);c.fill()})}})());
 if(has.clouds||has.smoke||has.steam)out.push((function(){var w=null,t=R(2,5),col=has.clouds?'245,242,235':'150,145,140';return function(c,dt){t-=dt;if(!w&&t<0){w={x:-180,y:R(.2,.9)*LH,v:R(45,70),r:R(110,170)}}
  if(w){w.x+=w.v*dt;for(var j=0;j<3;j++){var X=w.x+j*w.r*.6,Y=w.y+Math.sin(j*2)*20,g=c.createRadialGradient(X,Y,0,X,Y,w.r);g.addColorStop(0,'rgba('+col+',.42)');g.addColorStop(1,'rgba('+col+',0)');c.fillStyle=g;c.fillRect(X-w.r,Y-w.r,w.r*2,w.r*2)}
   if(w.x>LW+200){w=null;t=R(6,12)}}}})());
 if(has.sway)out.push(function(c){var a=Math.sin(T*.55)*.08;c.strokeStyle='rgba(22,15,9,.78)';c.lineCap='round';
  c.lineWidth=9;c.beginPath();c.moveTo(-20,-10);c.quadraticCurveTo(LW*.18+a*200,LH*.35,LW*.06+a*120,LH+20);c.stroke();
  c.lineWidth=5;c.beginPath();c.moveTo(LW*.75,-10);c.quadraticCurveTo(LW*.9+a*160,LH*.2,LW+20,LH*.45+a*60);c.stroke()});
 if(has.rain)out.push((function(){var ds=[];for(var i=0;i<14;i++)ds.push({x:R(0,LW),y:R(0,LH),v:R(380,520)});return function(c,dt){c.strokeStyle='rgba(220,230,245,.22)';c.lineWidth=2.5;c.beginPath();
  ds.forEach(function(d){d.y+=d.v*dt;d.x-=d.v*dt*.25;if(d.y>LH+40){d.y=-40;d.x=R(0,LW*1.2)}c.moveTo(d.x,d.y);c.lineTo(d.x+10,d.y-40)});c.stroke()}})());
 if(has.embers||has.sparks||has.flash||has.lightning)out.push((function(){var es=[];return function(c,dt){if(Math.random()<dt*1.5)es.push({x:R(0,LW),y:LH+10,v:R(30,60),r:R(3,7),t:0,p:R(0,6)});
  c.globalCompositeOperation='lighter';es.forEach(function(e){e.t+=dt;e.y-=e.v*dt;e.x+=Math.sin(T*1.5+e.p)*.6;var g=c.createRadialGradient(e.x,e.y,0,e.x,e.y,e.r*2);g.addColorStop(0,'rgba(255,170,70,.55)');g.addColorStop(1,'rgba(255,120,30,0)');c.fillStyle=g;c.fillRect(e.x-e.r*2,e.y-e.r*2,e.r*4,e.r*4)});
  c.globalCompositeOperation='source-over';es=es.filter(function(e){return e.y>-20})}})());
 return out}
function lensFrame(dt){lx.clearRect(0,0,LW,LH);var d=Math.min(dt,.1);
  lx.save();for(var i=0;i<lfx.length;i++)lfx[i](lx,d);lx.restore()}
/* ---------- loop ---------- */
function loop(now){raf=0;var dt=last?(now-last)/1000:0;last=now;
  if(dt>0&&dt<.025){raf=requestAnimationFrame(loop);last=now-dt*1000;return} /* cap ~30-40fps to save battery */
  T+=Math.min(dt,.1);var k=1-Math.exp(-Math.min(dt,.1)/.85);cur.x+=(tgt.x-cur.x)*k;cur.y+=(tgt.y-cur.y)*k;cur.z+=(tgt.z-cur.z)*k;
  sfxTick();apply();frameFx(dt);lensFrame(dt);kick()}
/* the moving picture: play only while the page is on screen and visible */
function vsync(){if(!VID||!VID.getAttribute('src'))return;if(document.hidden||!visible){VID.pause();return}var p=VID.play();if(p&&p.catch)p.catch(function(){})}
function kick(){if(raf||RM)return;if(document.hidden||!visible){last=0;return}raf=requestAnimationFrame(loop)}
/* ---------- gags ---------- */
var ACX;function ac(){if(!ACX){var C=window.AudioContext||window.webkitAudioContext;if(C)ACX=new C}if(ACX&&ACX.state==='suspended')ACX.resume();return ACX}
function tone(type,f0,f1,dur,vol,delay,vib){var a=ac();if(!a)return;var t=a.currentTime+(delay||0),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  if(vib){var l=a.createOscillator(),lg=a.createGain();l.frequency.value=vib[0];lg.gain.value=vib[1];l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur)}
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.02)}
function noise(dur,f,q,vol,delay){var a=ac();if(!a)return;var t=a.currentTime+(delay||0),b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate),d=b.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  var s=a.createBufferSource(),bp=a.createBiquadFilter(),g=a.createGain();s.buffer=b;bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(bp);bp.connect(g);g.connect(a.destination);s.start(t)}
var SND={bleat:function(){tone('sawtooth',420,360,.55,.12,0,[8,30]);tone('sawtooth',400,330,.4,.08,.5,[9,30])},
 whirr:function(){tone('square',60,140,.9,.06);noise(.9,900,2,.25)},page:function(){noise(.25,3000,1,.3);noise(.2,2200,1,.2,.12)},
 pop:function(){tone('sine',700,120,.18,.25);noise(.08,2000,1,.3)},squawk:function(){tone('square',900,1500,.12,.08);tone('square',1300,700,.15,.08,.15)},
 whistle:function(){tone('sine',1700,1900,1,.08,0,[6,40])},chime:function(){[880,1320,1760].forEach(function(f,i){tone('sine',f,f,1.1,.09,i*.07)})},
 tweet:function(){for(var i=0;i<3;i++)tone('sine',2600,4200,.09,.1,i*.13)},clink:function(){tone('sine',2400,2350,.4,.1);tone('sine',3150,3100,.3,.07,.01)},
 squelch:function(){noise(.35,380,3,.6);tone('sine',180,70,.3,.15)}};
function gagCount(){var n=Object.keys(GOT).filter(function(k){return S.gagInfo[k]}).length,e=document.getElementById('rsGagCount');if(e)e.textContent=n+'/'+TOTAL;return n}
function hit(g,btn){var gl=btn.parentNode,pk=GL.indexOf(gl),fk=focusK;if(pk>=0&&!RM){setFocus(pk);clearTimeout(hit.f);hit.f=setTimeout(function(){setFocus(fk)},1900)}var info=S.gagInfo[g[0]];if(!info)return;var first=!GOT[g[0]];GOT[g[0]]=1;try{localStorage.setItem(GKEY,JSON.stringify(GOT))}catch(e){}
  try{SND[info[2]]()}catch(e){}
  var r=g[3],p=el('div','rs-pop '+info[3],gl),x=g[1],y=g[2],ar=H/W;
  p.style.left=((x-r)*100)+'%';p.style.top=((y-r/ar)*100)+'%';p.style.width=(r*200)+'%';p.style.height=(r*200/ar)+'%';
  p.style.backgroundImage='url(images/rusty-cyoa/'+id+'.jpg)';p.style.backgroundSize=(100/(2*r))+'% auto';
  p.style.backgroundPosition=((x-r)/(1-2*r)*100)+'% '+(((y*ar)-r)/(ar-2*r)*100)+'%';
  var ring=el('div','rs-ring',gl);ring.style.left=(x*100)+'%';ring.style.top=(y*100)+'%';
  setTimeout(function(){p.remove();ring.remove()},1700);
  btn.classList.add('found');
  toast.textContent=info[0]+' '+(first?'Found: ':'')+info[1]+' · '+gagCount()+'/'+TOTAL+' gags';toast.classList.remove('on');void toast.offsetWidth;toast.classList.add('on');clearTimeout(hit.t);hit.t=setTimeout(function(){toast.classList.remove('on')},2700);
}
function gags(){st.querySelectorAll('.rs-gag').forEach(function(b){b.remove()});(cfg.gags||[]).forEach(function(g){var gl=GL[0];var b=el('button','rs-gag'+(GOT[g[0]]?' found':''),gl);b.type='button';
  b.setAttribute('aria-label','Hidden gag: '+(S.gagInfo[g[0]]||['',''])[1]);b.style.left=(g[1]*100)+'%';b.style.top=(g[2]*100)+'%';b.style.width='calc('+(g[3]*200)+'% + 24px)';
  b.addEventListener('click',function(e){e.stopPropagation();hit(g,b)})})}
/* ---------- public ---------- */
window.RStage={
 mount:function(host){build(host);gagCount()},
 audio:function(a){AU=a},
 load:function(sid){id=sid;EV=(window.RCA_SFX||{})[sid]||[];evT=0;cfg=S.s[sid]||{cam:[],fx:[],gags:[]};sway=false;
  IM.forEach(function(im,k){if(k){im.removeAttribute('src');PL[k].style.display='none'}else im.src='images/rusty-cyoa/'+sid+'.jpg?v=3'});
  if(VID){VID.classList.remove('on');VID.pause();if(MOTION){VID.src='media/rusty-cyoa/living/'+sid+'.mp4?v='+VV;VID.load();vsync()}else VID.removeAttribute('src')}var dp=DEPTH[sid]||{};HZ.forEach(function(h){h.style.setProperty('--hz',dp.haze||'#b8b0a0')});lfx=[]; /* no soft lens blobs over the painting */
  fx=(cfg.fx||[]).map(function(f){var fn=FX[f[0]];return fn?fn.apply(null,f.slice(1)):{}});
  setCam([.5,.5,RM?1.04:1.14],true);setTimeout(function(){if(id===sid)setCam([.5,.5,1.06])},50);
  gags();cap.textContent='';apply();if(RM){frameFx(0)}kick()},
 para:function(k,text){if(!cfg)return;var c=k>=0&&cfg.cam[k]?cfg.cam[k]:[.5,.5,1.06];setCam(c);cap.textContent=text||'';cap.classList.toggle('on',!!text)},
 play:function(on){st&&st.querySelector('.rs-pp')&&(st.querySelector('.rs-pp').textContent=on?'❚❚':'▶')},
 closeTheater:function(){if(st)theater(false)},
 preload:function(ids){ids.forEach(function(i){for(var k=0;k<NP;k++)k||(new Image().src='images/rusty-cyoa/'+i+'.jpg?v=3')})},
 count:gagCount,total:TOTAL
};
})();
