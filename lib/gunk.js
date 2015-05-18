// Copyright 2012 mbr targeting GmbH. All Rights Reserved.

var assert = require('assert');

var async = require('async');
var _ = require('underscore');

function getDependency(declaration) {
  return declaration.replace(/^[?<]*/, '');
}

function isOptional(declaration) {
  return declaration.match(/^[?<]*\?/);
}

function isOrder(declaration) {
  return declaration.match(/^[?<]*</);
}

function getEnabledModules(modules, enabled, enable) {
  return enable.reduce(function(enabled, name) {
    var module = modules[name];
    var parameters = (_.isArray(module) ? module : []).slice(0, -1);
    var dependencies = getDependencies([], parameters);
    var next = _.difference(dependencies, enabled);
    return _.union(enabled, [name], getEnabledModules(modules, enabled, next));
  }, enabled);
}

function gunk(modules, enabledComponents_, cb_) {
  var enabledComponents;
  var cb;
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
    var injectionArgs = [activeModules].concat(
      _.isArray(args) ? args : [args]
    );
    moduleObject[module] = injectDependencies.apply(null, injectionArgs);
  });
  async.auto(moduleObject, cb);
}
module.exports = gunk;

function Literal(value) {
  if (!(this instanceof Literal)) {
    return new Literal(value);
  }
  this.value = value;
}
gunk.Literal = Literal;

function nConstructor(n) {
  var names = 'abcdefghijklmnopqrstuvwxyz'.split('').slice(0, n);
  var code = 'return new C(' + names.join(', ') + ');';
  return Function.apply(null, ['C'].concat(names, code));
}

gunk.construct = function(C /* , *additionalParameters */) {
  var additionalParameters = [].slice.call(arguments, 1);

  function create(/* *parameters, cb */) {
    var args = Array.apply(null, arguments);
    var parameters = args.slice(0, -1);
    var cb = args.slice(-1)[0];

    try {
      var constructor = nConstructor(parameters.length);
      var object = constructor.apply(null, [C].concat(parameters));
      cb(null, object);
    } catch (e) {
      cb(e);
    }
  }

  return additionalParameters.length ? additionalParameters.concat(create) :
                                       create;
};

gunk.sync = function(f) {
  return function(/* *parameters, cb */) {
    var args = Array.apply(null, arguments);
    var parameters = args.slice(0, -1);
    var cb = args.slice(-1)[0];

    try {
      cb(null, f.apply(null, parameters));
    } catch (e) {
      cb(e);
    }
  };
};

function injectDependencies(enabledModules /*, *parameters, factory */) {
  var args = Array.apply(null, arguments);
  var parameters = args.slice(1, -1);
  var factory = args.slice(-1)[0];

  var dependencies = _.uniq(getDependencies(enabledModules, parameters));
  return dependencies.concat(function(cb, resources) {
    process.nextTick(function() {
      if (!parameters.length && !_.isFunction(factory)) {
        return cb(null, getParameter(resources, factory));
      }
      var parameterValues = getParameter(resources, parameters);
      factory.apply(null, parameterValues.concat(cb));
    });
  });
}

function getDependencies(enabledModules, parameter) {
  return (function get(parameter) {
    if (_.isString(parameter)) {
      var dependency = getDependency(parameter);
      if (!isOptional(parameter)) {
        return [dependency];
      }

      return _.contains(enabledModules, dependency) ? [dependency] : [];
    } else if (parameter instanceof Literal) {
      return [];
    } else if (_.isArray(parameter)) {
      return _.flatten(parameter.map(get));
    } else if (isOnlyObject(parameter)) {
      return _.flatten(_.values(parameter).map(get));
    } else {
      assert(false);
    }
  })(parameter);
}

function getParameter(resources, parameter) {
  function isPresent(parameter) {
    return !_.isString(parameter) ||
           !isOrder(parameter) && (
             !isOptional(parameter) ||
             getDependency(parameter) in resources
           );
  }

  return (function get(parameter) {
    if (_.isString(parameter)) {
      return resources[getDependency(parameter)];
    } else if (parameter instanceof Literal) {
      return parameter.value;
    } else if (_.isArray(parameter)) {
      return parameter.filter(isPresent).map(get);
    } else if (isOnlyObject(parameter)) {
      return _.object(_.keys(parameter).filter(function(key) {
        return isPresent(parameter[key]);
      }).map(function(key) {
        return [key, get(parameter[key])];
      }));
    } else {
      assert(false);
    }
  })(parameter);
}

function isOnlyObject(value) {
  return _.isObject(value) && !_.isArray(value) && !_.isFunction(value);
}
