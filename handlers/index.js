/* jshint node: true */
'use strict';

/**
  ### signaller message handlers

**/

module.exports = function(signaller, opts) {
  return {
    '1': require('./v1')(signaller, opts)
  };
};
