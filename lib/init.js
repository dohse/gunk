// Copyright 2012 mbr targeting GmbH. All Rights Reserved.

var assert = require('assert');

var async = require('async');
var _ = require('underscore');

function getEnabledModules(modules, enabled, enable) {
  return enable.reduce(function(enabled, name) {
    var module = modules[name];
    var parameters = (_.isArray(module) ? module : []).slice(0, -1);
    var dependencies = getDependencies(parameters);
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

function Literal(value) {
  if (!(this instanceof Literal)) {
    return new Literal(value);
  }
  this.value = value;
}
init.Literal = Literal;

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

  var dependencies = _.uniq(getDependencies(parameters));
  return dependencies.concat(function(cb, resources) {
    process.nextTick(function() {
      var parameterValues = getParameter(resources, parameters);
      factory.apply(null, parameterValues.concat(cb));
    });
  });
}

function getDependencies(parameter) {
  if (_.isString(parameter)) {
    return [parameter];
  } else if (parameter instanceof Literal) {
    return [];
  } else if (_.isArray(parameter)) {
    return _.flatten(parameter.map(getDependencies));
  } else if (isOnlyObject(parameter)) {
    return _.flatten(_.values(parameter).map(getDependencies));
  } else {
    assert(false);
  }
}

function getParameter(resources, parameter) {
  if (_.isString(parameter)) {
    return resources[parameter];
  } else if (parameter instanceof Literal) {
    return parameter.value;
  } else if (_.isArray(parameter)) {
    return parameter.map(getParameter.bind(null, resources));
  } else if (isOnlyObject(parameter)) {
    var values = _.values(parameter).map(getParameter.bind(null, resources));
    return _.object(_.keys(parameter), values);
  } else {
    assert(false);
  }
}

function isOnlyObject(value) {
  return _.isObject(value) && !_.isArray(value) && !_.isFunction(value);
}
