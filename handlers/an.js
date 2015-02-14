/* jshint node: true */
'use strict';

var jsonparse = require('cog/jsonparse');
var extend = require('cog/extend');

module.exports = function(signaller, opts) {
  function dataAllowed(data) {
    var cloned = extend({ allow: true }, data);
    signaller('peer:filter', data.id, cloned);

    return cloned.allow;
  }

  return function(header, content, isDM) {
    var messageId = header[1];
    var fromId = header[2];
    var data = jsonparse(content);
    var srcData = {id: fromId};

    if (!isDM){
      signaller.ackPeer(messageId);
    }

    if (! dataAllowed(data) || fromId === signaller.id) {
      return;
    }

    // check to see if this is a known peer
    var peer = signaller.peers.get(data.id);

    // trigger the peer connected event to flag that we know about a
    // peer connection. The peer has passed the "filter" check but may
    // be announced / updated depending on previous connection status
    signaller('peer:connected', data.id, data);

    // if the peer is existing, then update the data
    if (peer && (! peer.inactive)) {
      // update the data
      extend(peer.data, data);

      // trigger the peer update event
      return signaller('peer:update', data, srcData);
    }

    // create a new peer
    peer = {
      id: fromId,

      // initialize the local role index
      roleIdx: [data.id, signaller.id].sort().indexOf(data.id),

      // initialize the peer data
      data: {}
    };

    // initialize the peer data
    extend(peer.data, data);

    // reset inactivity state
    clearTimeout(peer.leaveTimer);
    peer.inactive = false;

    // set the peer data
    signaller.peers.set(data.id, peer);

    // if this is an initial announce message (no vector clock attached)
    // then send a announce reply
    if (signaller.autoreply && (! isDM)) {
      signaller
        .to(data.id)
        .announce(signaller.attributes);
    }

    signaller("peer:announce", data, peer);
  };

};