/* jshint node: true */
'use strict';

var jsonparse = require('cog/jsonparse');

module.exports = function(signaller, opts, v1) {

  function sendEvent(parts, srcState, data) {
    // initialise the event name
    var evtName = 'message:' + parts[0].slice(1);

    // convert any valid json objects to json
    var args = parts.slice(1).map(jsonparse);

    signaller.apply(
      signaller,
      [evtName].concat(args).concat([srcState, data])
    );
  }

  return function(header, content) {
    var messageId = header[1];
    var from = header[2];
    // We need to ack the TO. If the announce handler is invoked
    // it will attempt to ack the an, which will the server
    // will ignore.
    signaller.ackPeer(messageId);

    if (v1(content, true)) {
      return true;
    }

    var peer = signaller.peers.get(from);
    sendEvent(content.split('|'), peer, content);
  };

};