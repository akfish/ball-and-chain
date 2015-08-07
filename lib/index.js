var Chainable, EventEmitter, State, _, configHandler, initHandler, is_prop, safely,
  slice = [].slice,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require('underscore');

EventEmitter = require('events').EventEmitter;

Function.prototype.property = function(prop, descriptor) {
  return Object.defineProperty(this.prototype, prop, descriptor);
};

initHandler = {
  config: function(next, state_name, deps, handlers) {
    safely(this, this._push_state, state_name, deps, handlers);
    return next('config');
  }
};

configHandler = {
  method: function(next, name, fn) {
    var state;
    state = this._states[this.flag('config:target')];
    state.handlers[name] = fn;
    return safely(this, this._attach_handler, state.name, state.deps, name, fn);
  },
  property: function(next, name, desc) {
    var state;
    state = this._states[this.flag('config:target')];
    state.handlers[name] = desc;
    return safely(this, this._attach_handler, state.name, state.deps, name, desc);
  },
  finish: function(next) {
    return next('ready');
  }
};

safely = function() {
  var args, c, fn, peek;
  c = arguments[0], fn = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
  while (args.length > 0) {
    peek = args[args.length - 1];
    if (peek !== void 0) {
      break;
    }
    args.pop();
  }
  c._is_safe = true;
  fn.apply(c, args);
  return c._is_safe = false;
};

State = (function() {
  function State(name1) {
    this.name = name1;
    this.deps = [];
    this.handlers = {};
  }

  State.prototype.addDeps = function(deps) {
    return this.deps = _.uniq(this.deps.concat(deps));
  };

  State.prototype.addHandlers = function(handlers, cb) {
    var f, n, results;
    results = [];
    for (n in handlers) {
      f = handlers[n];
      if (n in this.handlers) {
        continue;
      }
      this.handlers[n] = f;
      results.push(cb(n, f));
    }
    return results;
  };

  return State;

})();

is_prop = function(h) {
  return _.isObject && _.isFunction(h['get']);
};

module.exports = Chainable = (function(superClass) {
  extend(Chainable, superClass);

  Chainable.extend = function(proto) {
    var derived, key, value;
    derived = (function(superClass1) {
      extend(_Class, superClass1);

      function _Class() {
        _Class.__super__.constructor.call(this);
        if (proto != null ? proto.hasOwnProperty('constructor') : void 0) {
          proto.constructor.apply(this, arguments);
        }
      }

      return _Class;

    })(this);
    if (proto != null) {
      for (key in proto) {
        if (!hasProp.call(proto, key)) continue;
        value = proto[key];
        derived.prototype[key] = value;
      }
    }
    derived.prototype.__super = function() {
      return derived.__super__.constructor.apply(this, arguments);
    };
    return derived;
  };

  function Chainable() {
    this._state_name = "init";
    this._states = {};
    this._flags = {};
    safely(this, this._push_state, 'init', ['config'], initHandler);
    safely(this, this._push_state, 'config', configHandler);
  }

  Chainable.prototype.flag = function(key, value) {
    if (value == null) {
      return this._flags[key];
    }
    this._flags[key] = value;
    return value;
  };

  Chainable.prototype._push_state = function(name, deps, handlers) {
    var state;
    switch (arguments.length) {
      case 0:
        name = "*";
        deps = [];
        handlers = {};
        break;
      case 1:
        if (_.isString(name)) {
          deps = [];
          handlers = {};
        } else if (_.isArray(name)) {
          throw new TypeError("Global method does not have deps. Expect name or handlers.");
        } else if (_.isObject(name)) {
          handlers = name;
          name = "*";
          deps = [];
        }
        break;
      case 2:
        if (_.isArray(deps)) {
          handlers = {};
        } else if (_.isObject(deps)) {
          handlers = deps;
          deps = [];
        }
    }
    this.flag("config:target", name);
    if (this._states[name] == null) {
      this._states[name] = new State(name);
    }
    state = this._states[name];
    state.addDeps(deps);
    return state.addHandlers(handlers, (function(_this) {
      return function(n, fn) {
        return safely(_this, _this._attach_handler, name, deps, n, fn);
      };
    })(this));
  };

  Chainable.prototype._ensure_safe = function() {
    var callsite, s;
    s = new Error().stack.split('\n');
    callsite = /Chainable\._([\w_]+)/.exec(s[2])[1];
    if (!this._is_safe) {
      throw new Error("Internal method cannot be called from outside");
    }
  };

  Chainable.prototype._attach_handler = function(state_name, deps, handler_name, handler) {
    var desc, getter;
    this._ensure_safe();
    if (_.isFunction(handler)) {
      return this[handler_name] = this._invoke.bind(this, state_name, deps, handler_name, handler);
    } else if (is_prop(handler)) {
      getter = this._invoke.bind(this, state_name, deps, handler_name, handler.get);
      desc = {
        get: getter
      };
      return Object.defineProperty(this, handler_name, desc);
    }
  };

  Chainable.prototype._goto = function(name) {
    this._ensure_safe();
    if (!name in this._states) {
      throw new Error("Chainable does not contain state '" + name + "'");
    }
    this._state_name = name;
    return this.emit("state_changed");
  };

  Chainable.prototype._invoke = function() {
    var args, deps, method, method_name, next, next_called, next_state, ref, ret, state_name;
    state_name = arguments[0], deps = arguments[1], method_name = arguments[2], method = arguments[3], args = 5 <= arguments.length ? slice.call(arguments, 4) : [];
    if (state_name !== "*" && this._state_name !== state_name) {
      if (ref = this._state_name, indexOf.call(deps, ref) < 0) {
        throw new Error("Method '" + method_name + "' cannot be called in current state '" + this._state_name + "'");
      } else {
        safely(this, this._goto, state_name);
      }
    }
    next_called = false;
    next_state = null;
    next = function(name) {
      next_called = true;
      return next_state = name;
    };
    args.unshift(next);
    ret = method.apply(this, args);
    if (next_called) {
      if (next_state != null) {
        safely(this, this._goto, next_state);
        return this;
      }
      safely(this, this._goto, "ready");
      return ret;
    }
    return this;
  };

  return Chainable;

})(EventEmitter);

//# sourceMappingURL=data:application/json;base64,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Ozs7O0dBckZhIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKVxuRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyXG5GdW5jdGlvbjo6cHJvcGVydHkgPSAocHJvcCwgZGVzY3JpcHRvcikgLT5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5IEA6OiwgcHJvcCwgZGVzY3JpcHRvclxuXG5pbml0SGFuZGxlciA9XG4gIGNvbmZpZzogKG5leHQsIHN0YXRlX25hbWUsIGRlcHMsIGhhbmRsZXJzKSAtPlxuICAgICMgY29uc29sZS5sb2cgXCJjb25maWdcIlxuICAgIHNhZmVseSBALCBAX3B1c2hfc3RhdGUsIHN0YXRlX25hbWUsIGRlcHMsIGhhbmRsZXJzXG5cbiAgICBuZXh0KCdjb25maWcnKVxuXG5jb25maWdIYW5kbGVyID1cbiAgbWV0aG9kOiAobmV4dCwgbmFtZSwgZm4pIC0+XG4gICAgc3RhdGUgPSBAX3N0YXRlc1tAZmxhZygnY29uZmlnOnRhcmdldCcpXVxuICAgIHN0YXRlLmhhbmRsZXJzW25hbWVdID0gZm5cbiAgICBzYWZlbHkgQCwgQF9hdHRhY2hfaGFuZGxlciwgc3RhdGUubmFtZSwgc3RhdGUuZGVwcywgbmFtZSwgZm5cbiAgcHJvcGVydHk6IChuZXh0LCBuYW1lLCBkZXNjKSAtPlxuICAgIHN0YXRlID0gQF9zdGF0ZXNbQGZsYWcoJ2NvbmZpZzp0YXJnZXQnKV1cbiAgICBzdGF0ZS5oYW5kbGVyc1tuYW1lXSA9IGRlc2NcbiAgICBzYWZlbHkgQCwgQF9hdHRhY2hfaGFuZGxlciwgc3RhdGUubmFtZSwgc3RhdGUuZGVwcywgbmFtZSwgZGVzY1xuICBmaW5pc2g6IChuZXh0KSAtPlxuICAgIG5leHQoJ3JlYWR5Jylcblxuc2FmZWx5ID0gKGMsIGZuLCBhcmdzLi4uKSAtPlxuICB3aGlsZSBhcmdzLmxlbmd0aCA+IDBcbiAgICBwZWVrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdXG4gICAgaWYgcGVlayAhPSB1bmRlZmluZWQgdGhlbiBicmVhaztcbiAgICBhcmdzLnBvcCgpXG4gIGMuX2lzX3NhZmUgPSB0cnVlXG4gIGZuLmFwcGx5IGMsIGFyZ3NcbiAgYy5faXNfc2FmZSA9IGZhbHNlXG5cbmNsYXNzIFN0YXRlXG4gIGNvbnN0cnVjdG9yOiAoQG5hbWUpIC0+XG4gICAgQGRlcHMgPSBbXVxuICAgIEBoYW5kbGVycyA9IHt9XG5cbiAgYWRkRGVwczogKGRlcHMpIC0+XG4gICAgQGRlcHMgPSBfLnVuaXEoQGRlcHMuY29uY2F0KGRlcHMpKVxuXG4gIGFkZEhhbmRsZXJzOiAoaGFuZGxlcnMsIGNiKSAtPlxuICAgIGZvciBuLCBmIG9mIGhhbmRsZXJzXG4gICAgICBpZiBuIG9mIEBoYW5kbGVycyB0aGVuIGNvbnRpbnVlXG4gICAgICBAaGFuZGxlcnNbbl0gPSBmXG4gICAgICBjYihuLCBmKVxuXG5pc19wcm9wID0gKGgpIC0+XG4gIF8uaXNPYmplY3QgYW5kIF8uaXNGdW5jdGlvbihoWydnZXQnXSlcblxuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBDaGFpbmFibGUgZXh0ZW5kcyBFdmVudEVtaXR0ZXJcbiAgQGV4dGVuZDogKHByb3RvKSAtPlxuICAgIGRlcml2ZWQgPSBjbGFzcyBleHRlbmRzIEBcbiAgICAgIGNvbnN0cnVjdG9yOiAtPlxuICAgICAgICBzdXBlcigpXG4gICAgICAgIGlmIHByb3RvPy5oYXNPd25Qcm9wZXJ0eSAnY29uc3RydWN0b3InXG4gICAgICAgICAgcHJvdG8uY29uc3RydWN0b3IuYXBwbHkgQCwgYXJndW1lbnRzXG5cbiAgICBpZiBwcm90bz9cbiAgICAgIGZvciBvd24ga2V5LCB2YWx1ZSBvZiBwcm90b1xuICAgICAgICBkZXJpdmVkOjpba2V5XSA9IHZhbHVlXG5cbiAgICBkZXJpdmVkOjpfX3N1cGVyID0gLT5cbiAgICAgIGRlcml2ZWQuX19zdXBlcl9fLmNvbnN0cnVjdG9yLmFwcGx5IEAsIGFyZ3VtZW50c1xuXG4gICAgcmV0dXJuIGRlcml2ZWRcblxuICBjb25zdHJ1Y3RvcjogLT5cbiAgICBAX3N0YXRlX25hbWUgPSBcImluaXRcIlxuICAgIEBfc3RhdGVzID0ge31cbiAgICBAX2ZsYWdzID0ge31cbiAgICBzYWZlbHkgQCwgQF9wdXNoX3N0YXRlLCAnaW5pdCcsIFsnY29uZmlnJ10sIGluaXRIYW5kbGVyXG4gICAgc2FmZWx5IEAsIEBfcHVzaF9zdGF0ZSwgJ2NvbmZpZycsIGNvbmZpZ0hhbmRsZXJcblxuICBmbGFnOiAoa2V5LCB2YWx1ZSkgLT5cbiAgICBpZiBub3QgdmFsdWU/XG4gICAgICByZXR1cm4gQF9mbGFnc1trZXldXG4gICAgQF9mbGFnc1trZXldID0gdmFsdWVcbiAgICByZXR1cm4gdmFsdWVcblxuICBfcHVzaF9zdGF0ZTogKG5hbWUsIGRlcHMsIGhhbmRsZXJzKSAtPlxuICAgICMgY29uc29sZS5sb2cgYXJndW1lbnRzLmxlbmd0aFxuICAgIHN3aXRjaCBhcmd1bWVudHMubGVuZ3RoXG4gICAgICB3aGVuIDBcbiAgICAgICAgbmFtZSA9IFwiKlwiXG4gICAgICAgIGRlcHMgPSBbXVxuICAgICAgICBoYW5kbGVycyA9IHt9XG4gICAgICB3aGVuIDFcbiAgICAgICAgaWYgXy5pc1N0cmluZyhuYW1lKVxuICAgICAgICAgIGRlcHMgPSBbXVxuICAgICAgICAgIGhhbmRsZXJzID0ge31cbiAgICAgICAgZWxzZSBpZiBfLmlzQXJyYXkobmFtZSlcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2xvYmFsIG1ldGhvZCBkb2VzIG5vdCBoYXZlIGRlcHMuIEV4cGVjdCBuYW1lIG9yIGhhbmRsZXJzLlwiKVxuICAgICAgICBlbHNlIGlmIF8uaXNPYmplY3QobmFtZSlcbiAgICAgICAgICBoYW5kbGVycyA9IG5hbWVcbiAgICAgICAgICBuYW1lID0gXCIqXCJcbiAgICAgICAgICBkZXBzID0gW11cbiAgICAgIHdoZW4gMlxuICAgICAgICBpZiBfLmlzQXJyYXkoZGVwcylcbiAgICAgICAgICBoYW5kbGVycyA9IHt9XG4gICAgICAgIGVsc2UgaWYgXy5pc09iamVjdChkZXBzKVxuICAgICAgICAgIGhhbmRsZXJzID0gZGVwc1xuICAgICAgICAgIGRlcHMgPSBbXVxuICAgIEBmbGFnIFwiY29uZmlnOnRhcmdldFwiLCBuYW1lXG4gICAgaWYgbm90IEBfc3RhdGVzW25hbWVdP1xuICAgICAgQF9zdGF0ZXNbbmFtZV0gPSBuZXcgU3RhdGUobmFtZSlcbiAgICBzdGF0ZSA9IEBfc3RhdGVzW25hbWVdXG4gICAgc3RhdGUuYWRkRGVwcyhkZXBzKVxuICAgIHN0YXRlLmFkZEhhbmRsZXJzIGhhbmRsZXJzLCAobiwgZm4pID0+XG4gICAgICBzYWZlbHkgQCwgQF9hdHRhY2hfaGFuZGxlciwgbmFtZSwgZGVwcywgbiwgZm5cblxuICBfZW5zdXJlX3NhZmU6IC0+XG4gICAgcyA9IG5ldyBFcnJvcigpLnN0YWNrLnNwbGl0KCdcXG4nKVxuICAgIGNhbGxzaXRlID0gL0NoYWluYWJsZVxcLl8oW1xcd19dKykvLmV4ZWMoc1syXSlbMV1cbiAgICAjIGNvbnNvbGUubG9nIFwiU2FmZWx5IGNhbGw6ICN7Y2FsbHNpdGV9XCJcbiAgICAjIGNvbnNvbGUubG9nIEBcbiAgICBpZiBub3QgQF9pc19zYWZlIHRoZW4gdGhyb3cgbmV3IEVycm9yKFwiSW50ZXJuYWwgbWV0aG9kIGNhbm5vdCBiZSBjYWxsZWQgZnJvbSBvdXRzaWRlXCIpXG5cbiAgX2F0dGFjaF9oYW5kbGVyOiAoc3RhdGVfbmFtZSwgZGVwcywgaGFuZGxlcl9uYW1lLCBoYW5kbGVyKS0+XG4gICAgQF9lbnN1cmVfc2FmZSgpXG4gICAgaWYgXy5pc0Z1bmN0aW9uKGhhbmRsZXIpXG4gICAgICBAW2hhbmRsZXJfbmFtZV0gPSBAX2ludm9rZS5iaW5kIEAsIHN0YXRlX25hbWUsIGRlcHMsIGhhbmRsZXJfbmFtZSwgaGFuZGxlclxuICAgIGVsc2UgaWYgaXNfcHJvcChoYW5kbGVyKVxuICAgICAgZ2V0dGVyID0gQF9pbnZva2UuYmluZCBALCBzdGF0ZV9uYW1lLCBkZXBzLCBoYW5kbGVyX25hbWUsIGhhbmRsZXIuZ2V0XG4gICAgICBkZXNjID0gZ2V0OiBnZXR0ZXJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBALCBoYW5kbGVyX25hbWUsIGRlc2NcblxuICBfZ290bzogKG5hbWUpIC0+XG4gICAgQF9lbnN1cmVfc2FmZSgpXG4gICAgaWYgbm90IG5hbWUgb2YgQF9zdGF0ZXNcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNoYWluYWJsZSBkb2VzIG5vdCBjb250YWluIHN0YXRlICcje25hbWV9J1wiKVxuICAgIEBfc3RhdGVfbmFtZSA9IG5hbWVcbiAgICAjIGNvbnNvbGUubG9nIFwiU3RhdGU6ICN7bmFtZX1cIlxuICAgIEBlbWl0IFwic3RhdGVfY2hhbmdlZFwiXG5cbiAgX2ludm9rZTogKHN0YXRlX25hbWUsIGRlcHMsIG1ldGhvZF9uYW1lLCBtZXRob2QsIGFyZ3MuLi4pIC0+XG4gICAgIyBDaGVjayBpZiBtZXRob2QgaXMgY2FsbGVkIGZyb20gZGVzaXJlZCBzdGF0ZVxuICAgIGlmIHN0YXRlX25hbWUgIT0gXCIqXCIgYW5kIEBfc3RhdGVfbmFtZSAhPSBzdGF0ZV9uYW1lXG4gICAgICAjIENoZWNrIGlmIGRlc2lyZWQgc3RhdGUgaXMgcmVhY2hhYmxlIGZyb20gY3VycmVudCBzdGF0ZVxuICAgICAgaWYgQF9zdGF0ZV9uYW1lIG5vdCBpbiBkZXBzXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCAnI3ttZXRob2RfbmFtZX0nIGNhbm5vdCBiZSBjYWxsZWQgaW4gY3VycmVudCBzdGF0ZSAnI3tAX3N0YXRlX25hbWV9J1wiKVxuICAgICAgZWxzZVxuICAgICAgICAjIEdvIHRvIGRlc2lyZWQgc3RhdGVcbiAgICAgICAgc2FmZWx5IEAsIEBfZ290bywgc3RhdGVfbmFtZVxuXG4gICAgbmV4dF9jYWxsZWQgPSBmYWxzZVxuICAgIG5leHRfc3RhdGUgPSBudWxsXG4gICAgbmV4dCA9IChuYW1lKSAtPlxuICAgICAgbmV4dF9jYWxsZWQgPSB0cnVlXG4gICAgICBuZXh0X3N0YXRlID0gbmFtZVxuXG4gICAgYXJncy51bnNoaWZ0KG5leHQpXG5cbiAgICByZXQgPSBtZXRob2QuYXBwbHkoQCwgYXJncylcblxuICAgIGlmIG5leHRfY2FsbGVkXG4gICAgICBpZiBuZXh0X3N0YXRlP1xuICAgICAgICBzYWZlbHkgQCwgQF9nb3RvLCBuZXh0X3N0YXRlXG4gICAgICAgIHJldHVybiBAXG4gICAgICAjIEdvIGJhY2sgdG8gcmVhZHkgc3RhdGVcbiAgICAgIHNhZmVseSBALCBAX2dvdG8sIFwicmVhZHlcIlxuICAgICAgIyBCcmVhayBjaGFpblxuICAgICAgcmV0dXJuIHJldFxuXG4gICAgcmV0dXJuIEBcbiJdfQ==