/* Cartoon stage for The Rusty Stack. One clip is requested at a time, and only when it plays. */
window.RCAClip=(function(){
  var v, still, muted=false;
  function clip(id){return 'media/rusty-cyoa/clips/'+id+'.mp4?v=1'}
  function poster(id){return 'media/rusty-cyoa/posters/'+id+'.jpg?v=1'}
  function init(video,posterImg){
    v=video;still=posterImg;
    v.preload='none';
    v.controls=false;
    v.playsInline=true;
    v.setAttribute('playsinline','');
    v.setAttribute('webkit-playsinline','');
    v.disablePictureInPicture=true;
    v.addEventListener('playing',function(){v.classList.add('is-on')});
    v.addEventListener('emptied',function(){v.classList.remove('is-on')});
  }
  function arm(id){
    if(v.getAttribute('data-id')!==id){
      v.pause();
      v.classList.remove('is-on');
      v.removeAttribute('data-loaded');
      v.setAttribute('data-id',id);
    }
    var src=poster(id);
    v.poster=src;
    if(still)still.src=src;
  }
  /* Sets the file URL and starts playback. Call from a tap so sound is allowed. */
  function play(){
    var id=v.getAttribute('data-id');
    if(v.getAttribute('data-loaded')!==id){
      v.preload='none';
      v.src=clip(id);
      v.setAttribute('data-loaded',id);
    }else{
      try{v.currentTime=0}catch(e){}
    }
    v.muted=muted;
    v.volume=1;
    return v.play();
  }
  function pause(){try{v.pause()}catch(e){}}
  function mute(m){muted=!!m;if(v)v.muted=muted;return muted}
  function isMuted(){return muted}
  function el(){return v}
  function on(ev,fn){v.addEventListener(ev,fn)}
  return {init:init,arm:arm,play:play,pause:pause,mute:mute,isMuted:isMuted,poster:poster,el:el,on:on};
})();
