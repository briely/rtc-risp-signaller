/* jshint node: true */
'use strict';

module.exports = function(signaller, opts) {

  return function(header, content) {
    signaller("room:update", content.split(','));
  };

};