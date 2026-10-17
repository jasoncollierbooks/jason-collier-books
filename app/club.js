/* Club perks are retired. The Oil Studio and offline downloads are free for everyone.
   If an old copy of the app still loads this file, it must not lock those features
   or interrupt a station break with a Club spot. */
(function(){
var CE=window.CE;
if(!CE)return;
CE.clubSpot=function(){return false};
CE.memberNote=function(){};
})();
