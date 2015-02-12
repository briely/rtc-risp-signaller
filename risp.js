/* jshint node: true */
'use strict';
var uuid = require('cuid');
var messenger1 = require('rtc-switchboard-messenger')("ws://localhost:9000");
var room = uuid();
var signaller1 = require("./")(messenger1, {room: room, autoReply: true});

signaller1.on("rawdata", function(d){
  console.log('1 <-- ' + d);
});

signaller1.on('send', function(d){
  console.log('1 --> ' + d);
});

signaller1.on("joined", function(){
  signaller1.announce({help: true});
});

signaller1.on("ack:announce", function(){
  console.log("Announce acknowledged");
});

signaller1.on("message:test", function(d, from){
  signaller1.to(from.id).send("/test", {test: "abcdef"});
});

signaller1.on("peer:announce", function(d, from){
  signaller1.to(from.id).send("/test", {test: "abcdef"});
});

signaller1.on("error", function(e){
  console.log("Error");
  console.log(e);
});

var messenger2 = require('rtc-switchboard-messenger')("ws://localhost:9001");

var signaller2 = require("./")(messenger2, {room: room, autoReply: true});

signaller2.on('send', function(d){
  console.log('2 --> ' + d);
});

signaller2.on("peer:announce", function(d, from){
  signaller2.to(from.id).send("/test", {test: "abcdef"});
});

signaller2.on("peer:announce", function(d, from){
  console.log("Response announce received");
});

signaller2.on("rawdata", function(d){
  console.log('2 <-- ' + d);
});

signaller2.on("message:test", function(d, from){
  signaller2.to(from.id).send("/test", {test: "abcdef"});
});

setTimeout(function(){}, 5000)