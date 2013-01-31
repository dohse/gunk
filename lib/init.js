// Copyright 2012 mbr targeting GmbH. All Rights Reserved.

var assert = require('assert');

var async = require('async');
var _ = require('underscore');

function getEnabledModules(modules, enabled, enable) {
  return enable.reduce(function(enabled, name) {
    var module = modules[name];
    var dependencies = (_.isArray(module) ? module : []).filter(_.isString);
    var next = _.difference(dependencies, enabled);
    return _.union(enabled, [name], getEnabledModules(modules, enabled, next));
  }, enabled);
}

function init(modules, enabledComponents_, cb_) {
  var enabledComponents, cb;
  if (cb_) {
    enabledComponents = enabledComponents_;
    cb = cb_;
  } else {
    enabledComponents = null;
    cb = enabledComponents_;
  }

  var activeModules = enabledComponents ?
    getEnabledModules(modules, [], enabledComponents) :
    Object.keys(modules);

  var moduleObject = {};
  activeModules.forEach(function(module) {
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

  var dependencies = _.uniq(_.flatten(parameters.map(getDependencies)));
  return dependencies.concat(function(cb, resources) {
    process.nextTick(function() {
      var parameterGet = getParameter.bind(null, resources);
      var parameterValues = parameters.map(parameterGet);
      factory.apply(null, parameterValues.concat(cb));
    });
  });
}

function getDependencies(parameter) {
  return _.isString(parameter) ? [parameter] : [];
}

function getParameter(resources, parameter) {
  if (_.isString(parameter)) {
    return resources[parameter];
  } else if (_.isArray(parameter)) {
    return parameter[0];
  } else {
    assert(false);
  }
}
