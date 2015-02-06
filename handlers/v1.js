/* jshint node: true */
'use strict';

var extend = require('cog/extend');

module.exports = function(signaller, opts) {

  var handlers = {
    RISP: require('./risp')(signaller, opts)
  };

  return function(data) {

    var data = data.split('/').splice(1).join('/');
    var header = data.split('.')[0].split('|');
    var content = data.split('.').splice(1).join('.');
    var handler = handlers[header[0]];
    if (typeof handler == 'function') {
      handler(header, content);
    } else {
      console.warn("No handler for RISP1 message " + data);
    }
  }
};