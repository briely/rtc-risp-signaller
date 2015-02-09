/* jshint node: true */
'use strict';

var extend = require('cog/extend');

module.exports = function(signaller, opts) {
  function handler(data, isDM) {

    var data = data.split('/').splice(1).join('/');
    var header = data.split('.')[0].split('|');
    var content = data.split('.').splice(1).join('.');
    var handler = handlers[header[0]];
    if (typeof handler == 'function') {
      handler(header, content, isDM);
      return true;
    } else {
      console.warn("No handler for RISP1 message " + data);
      return false;
    }
  }

  var handlers = {
    RISP: require('./risp')(signaller, opts),
    AN: require('./an')(signaller, opts),
    AS: require('./ackserver')(signaller, opts),
    AA: require('./ackannounce')(signaller, opts),
    TO: require('./to')(signaller, opts, handler),
    AP: require('./ackpeer')(signaller, opts)
  };

  return handler;
};