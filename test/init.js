// Copyright 2014 mbr targeting GmbH. All Rights Reserved.

var assert = require('assert');

var gunk = require('../lib/gunk');

describe('gunk', function() {
  it('should load dependencies', function(cb) {
    gunk({
      a: function(cb) {
        cb(null, 'a');
      },
      b: ['a', function(a, cb) {
        assert.strictEqual(a, 'a');
        cb(null, 'b');
      }],
    }, ['b'], cb);
  });

  it('should work with arrays and objects', function(cb) {
    gunk({
      resource: [{
        key: gunk.Literal('value'),
      }, function(object, cb) {
        assert.strictEqual(object.key, 'value');

        cb(null, null);
      }],
    }, cb);
  });
});
