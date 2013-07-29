/*jshint node:true*/

'use strict';

var EventEmitter = require('events').EventEmitter;
var pull = require('pull-stream');
var pushable = require('pull-pushable');
var util = require('util');

/**
  # rtc-signaller

  The `rtc-signaller` package provides a simple interface for WebRTC 
  Signalling that is protocol independent.  Rather than tie the 
  implementation specifically to Websockets, XHR, etc. the signaller package
  allows you to implement signalling in your application and then `pipe` it 
  to the appropriate output interface.

  This in turn reduces the overall effort required to implement WebRTC
  signalling over different protocols and also means that your application
  code is able to include different underlying transports with relative ease.

  [
  ![Build Status]
  (https://travis-ci.org/rtc-io/rtc-signaller.png?branch=master)
  ](https://travis-ci.org/rtc-io/rtc-signaller)

  ## Getting Started (Client)

  ### Creating a Signaller and Associating a Transport

  The first thing you will need to do is to include the `rtc-signaller`
  package in your application, and provide it a channel name that it will use
  to communicate with its peers.

  ```js
  var signaller = require('rtc-signaller');
  var channel = signaller('channel-name');
  ```

  The next thing to do is to tell the signaller which transport it is
  going to be using:

  ```js
  channel.setTransport(require('rtc-signaller-ws')({ host: 'rtc.io' }));
  ```

  ### Handling Events

  At the point at which the transport is associated, the channel will attempt
  to connect. Once this connection is established, the signaller will become
  aware of other peers (if any) that are currently connected to the room:

  ```js
  // wait for ready event
  channel.once('ready', function() {
    console.log('connected to ' + channel.name);
  });
  ```

  In addition to the `ready` event, the channel will also trigger a
  `peer:discover` event to signal the discovery of a new peer in the channel:

  ```js
  channel.on('peer:discover', function(peer) {
    console.log('discovered a new peer in the channel');
  });
  ```

  ### Peers vs Peer Connections

  When working with WebRTC and signalling concepts, it's important to
  differentiate between peers and actual `RTCPeerConnection` instances.
  From a signalling perspective, a peer is someone (or something) out there
  that we can potentially connect with.

  It is completely reasonable to have 0..n `RTCPeerConnection` instances
  associated with each of the peers that we have knowledge of.

  ### Connecting to a Peer

  So once we know about other peers in the current channel, we should probably
  look at how we can start connecting with them.  To do this we need to start
  the offer-answer negotiation process.

  In an application where we want to automatically connect to every other
  known peer in the channel, we could implement code similar to that shown
  below:

  ```js
  channel.on('peer:discover', function(peer) {
    var connection = channel.connect(peer);

    // add a stream to the connection
    connection.addStream(media.stream);
  });
  ```

  In the example above, once a peer is discovered our application will
  automatically attempt to connect with the peer by creating an offer
  and then sending that offer using the signaller transport.

  Now in most circumstances using code like the sample above will result in
  two peers creating offers for each other and duplicating the connection
  requests.  In this situation, the signaller will coordinate the connection
  requests and make sure that peers find each other correctly.

  Once two peers have established a working connection, the channel
  will let you know:

  ```js
  channel.on('peer:connect', function(connection) {
  });
  ```
**/

/**
  ## Signaller reference

  The Signaller constructor accepts an `opts` object, with the option
  of simply providing a channel name.

  For example:

  ```js
  var Signaller = require('rtc-signaller');
  var signaller;

  // create a signaller for channel, using rtc.io as the signalling endpoint
  signaller = new Signaller('test');

  // or, create a signaller with an alternative signalling server
  signaller = new Signaller({
    channel: 'test',
    host: 'http://anotherserver.com'
  });
  ```
**/
function Signaller(opts) {
  if (! (this instanceof Signaller)) {
    return new Signaller(opts);
  }

  EventEmitter.call(this);

  // if opts is a string, then we have a channel name
  if (typeof opts == 'string' || (opts instanceof String)) {
    opts = {
      channel: opts
    };
  }

  // initialise the messages queue
  this._outboundMessages = pushable();

  // ensure we have an opts hash
  this.opts = opts = opts || {};

  // ensure we have a transport creator
  this.transport = opts.transport ||
    opts.transportCreator ||
    require('./transport-socket');

  // initialise members
  this.debug = opts.debug && typeof console.log == 'function';

  // initialise the channel name
  this.channel = '';

  // if the autoconnect option is not false, and we have a transport
  // connect on next tick
  if (typeof opts.autoConnect == 'undefined' || opts.autoConnect) {
    process.nextTick(this._autoConnect.bind(this, opts));
  }
}

util.inherits(Signaller, EventEmitter);
module.exports = Signaller;

/**
  ### connect(callback)
**/
Signaller.prototype.connect = function(callback) {
  var signaller = this;
  var proxy;

  // create a default callback
  // TODO: make the default callback useful
  callback = callback || function() {};

  // if we don't have a transport, return an error
  if (! this.transport) {
    return callback(new Error('A transport is required to connect'));
  }

  // when we receive the connect:ok event trigger the callback
  this.once('connect:ok', function(id) {
    // update the signaller id
    signaller.id = id;

    // trigger the callback
    callback(null, id);
  });

  // create the new peer proxy
  proxy = this.transport(this.opts);

  // pipe signaller messages to the peer proxy
  signaller.outbound().pipe(proxy.inbound());

  // listen for messages from the peer proxy and parse those messages
  proxy.outbound().pipe(signaller.inbound());
};

/**
  ### inbound()

  Return a pull-stream sink for messages generated by the transport
**/
Signaller.prototype.inbound = function() {
  return pull.drain(createMessageParser(this));
};

/**
  ### join(name, callback)

  Send a join command to the signalling server, indicating that you would like 
  to join the current room.  In the current implementation of the rtc.io suite
  it is only possible for the signalling client to exist in one room at one
  particular time, so joining a new channel will automatically mean leaving the
  existing one if already joined.
**/
Signaller.prototype.join = function(name, callback) {
  var signaller = this;

  // handle the pre:join:ok handler and update the channel name
  this.once('pre:join:ok', function(newChannel) {
    signaller.channel = newChannel;
  });

  if (callback) {
    this.once('join:ok', callback);
  }

  return this.send('/join', name);
};

/**
  ### negotiate(targetId, sdp, callId, type)

  The negotiate function handles the process of sending an updated Session
  Description Protocol (SDP) description to the specified target signalling
  peer.  If this is an established connection, then a callId will be used to 
  ensure the sdp is deliver to the correct RTCPeerConnection instance
**/
Signaller.prototype.negotiate = function(targetId, sdp, callId, type) {
  return this.send('/negotiate', targetId, sdp, callId || '', type);
};

/**
  ### outbound()

  Return a pull-stream source that can write messages to a transport
**/
Signaller.prototype.outbound = function() {
  return this._outboundMessages;
};

/**
  ### send(data)

  Send data across the line
**/
Signaller.prototype.send = function() {
  // get the args and jsonify as required
  var data = [].slice.call(arguments).map(function(arg) {
    return typeof arg == 'object' ? JSON.stringify(arg) : arg;
  }).join('|');

  if (this.debug) {
    console.log('--> ' + data);
  }

  this._outboundMessages.push(data);

  // chainable
  return this;
};

/* internals */

/**
  ### _autoConnect(opts)
**/
Signaller.prototype._autoConnect = function(opts) {
  // if we have no transport, abort
  if (! this.transport) { return; }

  // connect
  this.connect();

  // if a channel has been specified, then update the channel name
  if (opts.channel) {
    this.join(opts.channel);
  }
};

/**
  ## Helper Functions (Not Exported)
**/

/**
  ### createMessageParser(signaller)

  This is used to create a function handler that will operate more quickly that 
  when using bind.  The parser will pull apart a message into parts (splitting 
  on the pipe character), parsing those parts where appropriate and then
  triggering the relevant event.
**/
function createMessageParser(signaller) {
  return function(data) {
    var parts = (data || '').split('|');
    var evtName = (parts[0] || '').toLowerCase();
    var args = parts.slice(1).map(function(arg) {
      // if it looks like JSON then parse it
      return ['{', '['].indexOf(arg.charAt(0)) >= 0 ?JSON.parse(arg) : arg;
    });

    if (signaller.debug) {
      console.log('<-- ' + data);
    }

    // trigger the event
    if (evtName) {
      // trigger the message pre-processor
      signaller.emit.apply(signaller, ['pre:' + evtName].concat(args));

      // trigger the main processor
      if (! signaller.emit.apply(signaller, [evtName].concat(args))) {
        // if not handled by a specific message parser then emit
        // as a raw message for something else to handle (potentially)
        signaller.emit('message', data);
      }

      // TODO: emit a data message for the 
    }
  };
}
