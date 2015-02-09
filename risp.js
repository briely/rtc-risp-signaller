/* jshint node: true */
'use strict';

var messenger = require('rtc-switchboard-messenger')("ws://localhost:9000");
var signaller1 = require("./")(messenger, {room: "testRoom"});
var signaller2 = require("./")(messenger, {room: "testRoom"});

signaller1.on("rawdata", function(d){
  console.log('1 <-- ' + d);
});

signaller1.on('send', function(d){
  console.log('1 --> ' + d);
});

signaller2.on("rawdata", function(d){
  console.log('2 <-- ' + d);
});

signaller2.on('send', function(d){
  console.log('2 --> ' + d);
});

signaller1.on("joined", function(){
  signaller1.announce({help: true});
});

signaller1.on("ack:announce", function(){
  console.log("Announce acknowledged");
});

signaller1.on("message:test", function(d){
  console.log("Received DM with test message " + d.test);
});

signaller2.on("peer:announce", function(d, from){
  signaller2.to(from.id).send("/test", {test: "abcdef"});
});

signaller2.on("peer:announce", function(d, from){
  console.log("Response announce received");
});

setInterval(function(){
}, 5000);