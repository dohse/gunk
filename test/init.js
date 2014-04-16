// Copyright 2014 mbr targeting GmbH. All Rights Reserved.

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
    }, ['a'], cb);
  });
});
