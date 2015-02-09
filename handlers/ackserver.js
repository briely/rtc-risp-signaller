/* jshint node: true */
'use strict';

module.exports = function(signaller, opts) {

  return function(header, content) {
    signaller("ack:server", header);
    signaller("as:"+header[1]);
  };

};