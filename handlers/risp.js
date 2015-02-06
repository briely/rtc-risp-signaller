/* jshint node: true */
'use strict';

var extend = require('cog/extend');
var jsonparse = require('cog/jsonparse');

module.exports = function(signaller, opts) {

  return function(header, content) {
    signaller("risp", jsonparse(content));
  };

};