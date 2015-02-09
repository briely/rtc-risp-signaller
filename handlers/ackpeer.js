/* jshint node: true */
'use strict';

module.exports = function(signaller, opts) {

  return function(header, content) {
    signaller("ack:peer", header);
    signaller("ap:"+header[1]);
  };

};