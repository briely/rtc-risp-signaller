/* jshint node: true */
'use strict';

var jsonparse = require('cog/jsonparse');

module.exports = function(signaller, opts) {

  return function(header, content) {
    signaller("ack:announce", header);
    signaller("aa:"+header[1]);
  };

};