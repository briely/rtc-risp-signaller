var messenger = require('rtc-switchboard-messenger')("ws://localhost:9000");
var signaller = require("./")(messenger, {room: "testRoom"});

signaller.on("rawdata", function(d) {
  console.log(d);
});

setInterval(function(){
}, 5000);