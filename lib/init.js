// Copyright 2012 mbr targeting GmbH. All Rights Reserved.

var async = require('async');
var _ = require('underscore');

function init(modules, cb) {
  var moduleObject = {};
  Object.keys(modules).forEach(function(module) {
    var args = modules[module];
    var injectionArgs = _.isArray(args) ? args : [args];
    moduleObject[module] = injectDependencies.apply(null, injectionArgs);
  });
  async.auto(moduleObject, cb);
}
module.exports = init;

init.construct = function(C /* , *additionalParameters */) {
  var additionalParameters = [].slice.call(arguments, 1);

  function create(/* *parameters, cb */) {
    var args = [].slice.call(arguments);
    var parameters = args.slice(0, -1);
    var cb = args.slice(-1)[0];

    var object = Object.create(C.prototype);
    try {
      C.apply(object, parameters);
      cb(null, object);
    } catch (e) {
      cb(e);
    }
  }

  return additionalParameters.length ? additionalParameters.concat(create) :
                                       create;
};

init.sync = function(f) {
  return function(/* *parameters, cb */) {
    var args = [].slice.call(arguments);
    var parameters = args.slice(0, -1);
    var cb = args.slice(-1)[0];

    try {
      cb(null, f.apply(null, parameters));
    } catch (e) {
      cb(e);
    }
  };
};

function injectDependencies(/* *parameters, factory */) {
  var args = [].slice.call(arguments);
  var parameters = args.slice(0, -1);
  var factory = args.slice(-1)[0];

  var dependencies = parameters.filter(_.isString);
  return dependencies.concat(function(cb, resources) {
    process.nextTick(function() {
      var parameterValues = parameters.map(function(parameter) {
        return _.isString(parameter) ? resources[parameter] : parameter[0];
      });
      factory.apply(null, parameterValues.concat(cb));
    });
  });
}
