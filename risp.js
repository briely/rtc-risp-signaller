/* jshint node: true */
'use strict';
var uuid = require('cuid');


var count = 0;
var start = new Date().getTime();
var pairs = 0;

function startPair(){
  var messenger1 = require('rtc-switchboard-messenger')("ws://crisp-staging-lb-1724386141.ap-southeast-2.elb.amazonaws.com");
  var room = uuid();
  var signaller1 = require("./")(messenger1, {room: room, autoReply: true});

  // signaller1.on("rawdata", function(d){
  //   console.log('1 <-- ' + d);
  // });

  // signaller1.on('send', function(d){
  //   console.log('1 --> ' + d);
  // });

  pairs++;
  signaller1.on("joined", function(){
    console.log("Joined");
  });

  signaller1.on("ack:announce", function(){
    console.log("Announce acknowledged");
  });

  signaller1.on("local:announce", function(){
    console.log("Local announce")
  });

  signaller1.on("message:test", function(d, from){
    signaller1.to(from.id).send("/test", {test: "abcdef"});
    count++;
  });

  signaller1.on("peer:announce", function(d, from){
    signaller1.to(from.id).send("/test", {test: "abcdef"});
  });

  signaller1.on("error", function(e){
    console.log("Error");
    console.log(e);
  });

  setTimeout(function(){
    var messenger2 = require('rtc-switchboard-messenger')("ws://crisp-staging-lb-1724386141.ap-southeast-2.elb.amazonaws.com");

    var signaller2 = require("./")(messenger2, {room: room, autoReply: true});


    signaller2.on("joined", function(){
      console.log("Joined");
    });

    signaller2.on("ack:announce", function(){
      console.log("Announce acknowledged");
    });


    signaller2.on("local:announce", function(){
      console.log("Local announce")
    });

    signaller2.on("peer:announce", function(d, from){
      signaller2.to(from.id).send("/test", {test: "abcdef"});
    });

    signaller2.on("peer:announce", function(d, from){
      console.log("Response announce received");
    });

    signaller2.on("message:test", function(d, from){
      signaller2.to(from.id).send("/test", {test: "abcdef"});
      count++;
    });
  }, 1000);
}
setInterval(function(){
  var end = new Date().getTime();
  console.log((count / ((end - start)/1000)) + " message per second by " + pairs + " pairs");
  start = end;
  count = 0;
  if (pairs < 1) {
    startPair();
  }
}, 5000)