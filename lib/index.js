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
      return ret;
    }
    return this;
  };

  return Chainable;

})(EventEmitter);

//# sourceMappingURL=data:application/json;base64,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QVcsV0FBWCxHQUF1Qix1Q0FBdkIsR0FBOEQsSUFBQyxDQUFBLFdBQS9ELEdBQTJFLEdBQWpGLEVBRFo7T0FBQSxNQUFBO1FBSUUsTUFBQSxDQUFPLElBQVAsRUFBVSxJQUFDLENBQUEsS0FBWCxFQUFrQixVQUFsQixFQUpGO09BRkY7O0lBUUEsV0FBQSxHQUFjO0lBQ2QsVUFBQSxHQUFhO0lBQ2IsSUFBQSxHQUFPLFNBQUMsSUFBRDtNQUNMLFdBQUEsR0FBYzthQUNkLFVBQUEsR0FBYTtJQUZSO0lBSVAsSUFBSSxDQUFDLE9BQUwsQ0FBYSxJQUFiO0lBRUEsR0FBQSxHQUFNLE1BQU0sQ0FBQyxLQUFQLENBQWEsSUFBYixFQUFnQixJQUFoQjtJQUVOLElBQUcsV0FBSDtNQUNFLElBQUcsa0JBQUg7UUFDRSxNQUFBLENBQU8sSUFBUCxFQUFVLElBQUMsQ0FBQSxLQUFYLEVBQWtCLFVBQWxCO0FBQ0EsZUFBTyxLQUZUOztBQUlBLGFBQU8sSUFMVDs7QUFPQSxXQUFPO0VBM0JBOzs7O0dBckVhIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKVxuRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyXG5GdW5jdGlvbjo6cHJvcGVydHkgPSAocHJvcCwgZGVzY3JpcHRvcikgLT5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5IEA6OiwgcHJvcCwgZGVzY3JpcHRvclxuXG5pbml0SGFuZGxlciA9XG4gIGNvbmZpZzogKG5leHQsIHN0YXRlX25hbWUsIGRlcHMsIGhhbmRsZXJzKSAtPlxuICAgICMgY29uc29sZS5sb2cgXCJjb25maWdcIlxuICAgIHNhZmVseSBALCBAX3B1c2hfc3RhdGUsIHN0YXRlX25hbWUsIGRlcHMsIGhhbmRsZXJzXG5cbiAgICBuZXh0KCdjb25maWcnKVxuXG5jb25maWdIYW5kbGVyID1cbiAgbWV0aG9kOiAobmV4dCwgbmFtZSwgZm4pIC0+XG4gICAgc3RhdGUgPSBAX3N0YXRlc1tAZmxhZygnY29uZmlnOnRhcmdldCcpXVxuICAgIHN0YXRlLmhhbmRsZXJzW25hbWVdID0gZm5cbiAgICBzYWZlbHkgQCwgQF9hdHRhY2hfaGFuZGxlciwgc3RhdGUubmFtZSwgc3RhdGUuZGVwcywgbmFtZSwgZm5cbiAgcHJvcGVydHk6IChuZXh0LCBuYW1lLCBkZXNjKSAtPlxuICAgIHN0YXRlID0gQF9zdGF0ZXNbQGZsYWcoJ2NvbmZpZzp0YXJnZXQnKV1cbiAgICBzdGF0ZS5oYW5kbGVyc1tuYW1lXSA9IGRlc2NcbiAgICBzYWZlbHkgQCwgQF9hdHRhY2hfaGFuZGxlciwgc3RhdGUubmFtZSwgc3RhdGUuZGVwcywgbmFtZSwgZGVzY1xuICBmaW5pc2g6IChuZXh0KSAtPlxuICAgIG5leHQoJ3JlYWR5Jylcblxuc2FmZWx5ID0gKGMsIGZuLCBhcmdzLi4uKSAtPlxuICB3aGlsZSBhcmdzLmxlbmd0aCA+IDBcbiAgICBwZWVrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdXG4gICAgaWYgcGVlayAhPSB1bmRlZmluZWQgdGhlbiBicmVhaztcbiAgICBhcmdzLnBvcCgpXG4gIGMuX2lzX3NhZmUgPSB0cnVlXG4gIGZuLmFwcGx5IGMsIGFyZ3NcbiAgYy5faXNfc2FmZSA9IGZhbHNlXG5cbmNsYXNzIFN0YXRlXG4gIGNvbnN0cnVjdG9yOiAoQG5hbWUpIC0+XG4gICAgQGRlcHMgPSBbXVxuICAgIEBoYW5kbGVycyA9IHt9XG5cbiAgYWRkRGVwczogKGRlcHMpIC0+XG4gICAgQGRlcHMgPSBfLnVuaXEoQGRlcHMuY29uY2F0KGRlcHMpKVxuXG4gIGFkZEhhbmRsZXJzOiAoaGFuZGxlcnMsIGNiKSAtPlxuICAgIGZvciBuLCBmIG9mIGhhbmRsZXJzXG4gICAgICBpZiBuIG9mIEBoYW5kbGVycyB0aGVuIGNvbnRpbnVlXG4gICAgICBAaGFuZGxlcnNbbl0gPSBmXG4gICAgICBjYihuLCBmKVxuXG5pc19wcm9wID0gKGgpIC0+XG4gIF8uaXNPYmplY3QgYW5kIF8uaXNGdW5jdGlvbihoWydnZXQnXSlcblxuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBDaGFpbmFibGUgZXh0ZW5kcyBFdmVudEVtaXR0ZXJcbiAgY29uc3RydWN0b3I6IC0+XG4gICAgQF9zdGF0ZV9uYW1lID0gXCJpbml0XCJcbiAgICBAX3N0YXRlcyA9IHt9XG4gICAgQF9mbGFncyA9IHt9XG4gICAgc2FmZWx5IEAsIEBfcHVzaF9zdGF0ZSwgJ2luaXQnLCBbJ2NvbmZpZyddLCBpbml0SGFuZGxlclxuICAgIHNhZmVseSBALCBAX3B1c2hfc3RhdGUsICdjb25maWcnLCBjb25maWdIYW5kbGVyXG5cbiAgZmxhZzogKGtleSwgdmFsdWUpIC0+XG4gICAgaWYgbm90IHZhbHVlP1xuICAgICAgcmV0dXJuIEBfZmxhZ3Nba2V5XVxuICAgIEBfZmxhZ3Nba2V5XSA9IHZhbHVlXG4gICAgcmV0dXJuIHZhbHVlXG5cbiAgX3B1c2hfc3RhdGU6IChuYW1lLCBkZXBzLCBoYW5kbGVycykgLT5cbiAgICAjIGNvbnNvbGUubG9nIGFyZ3VtZW50cy5sZW5ndGhcbiAgICBzd2l0Y2ggYXJndW1lbnRzLmxlbmd0aFxuICAgICAgd2hlbiAwXG4gICAgICAgIG5hbWUgPSBcIipcIlxuICAgICAgICBkZXBzID0gW11cbiAgICAgICAgaGFuZGxlcnMgPSB7fVxuICAgICAgd2hlbiAxXG4gICAgICAgIGlmIF8uaXNTdHJpbmcobmFtZSlcbiAgICAgICAgICBkZXBzID0gW11cbiAgICAgICAgICBoYW5kbGVycyA9IHt9XG4gICAgICAgIGVsc2UgaWYgXy5pc0FycmF5KG5hbWUpXG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdsb2JhbCBtZXRob2QgZG9lcyBub3QgaGF2ZSBkZXBzLiBFeHBlY3QgbmFtZSBvciBoYW5kbGVycy5cIilcbiAgICAgICAgZWxzZSBpZiBfLmlzT2JqZWN0KG5hbWUpXG4gICAgICAgICAgaGFuZGxlcnMgPSBuYW1lXG4gICAgICAgICAgbmFtZSA9IFwiKlwiXG4gICAgICAgICAgZGVwcyA9IFtdXG4gICAgICB3aGVuIDJcbiAgICAgICAgaWYgXy5pc0FycmF5KGRlcHMpXG4gICAgICAgICAgaGFuZGxlcnMgPSB7fVxuICAgICAgICBlbHNlIGlmIF8uaXNPYmplY3QoZGVwcylcbiAgICAgICAgICBoYW5kbGVycyA9IGRlcHNcbiAgICAgICAgICBkZXBzID0gW11cbiAgICBAZmxhZyBcImNvbmZpZzp0YXJnZXRcIiwgbmFtZVxuICAgIGlmIG5vdCBAX3N0YXRlc1tuYW1lXT9cbiAgICAgIEBfc3RhdGVzW25hbWVdID0gbmV3IFN0YXRlKG5hbWUpXG4gICAgc3RhdGUgPSBAX3N0YXRlc1tuYW1lXVxuICAgIHN0YXRlLmFkZERlcHMoZGVwcylcbiAgICBzdGF0ZS5hZGRIYW5kbGVycyBoYW5kbGVycywgKG4sIGZuKSA9PlxuICAgICAgc2FmZWx5IEAsIEBfYXR0YWNoX2hhbmRsZXIsIG5hbWUsIGRlcHMsIG4sIGZuXG5cbiAgX2Vuc3VyZV9zYWZlOiAtPlxuICAgIHMgPSBuZXcgRXJyb3IoKS5zdGFjay5zcGxpdCgnXFxuJylcbiAgICBjYWxsc2l0ZSA9IC9DaGFpbmFibGVcXC5fKFtcXHdfXSspLy5leGVjKHNbMl0pWzFdXG4gICAgIyBjb25zb2xlLmxvZyBcIlNhZmVseSBjYWxsOiAje2NhbGxzaXRlfVwiXG4gICAgIyBjb25zb2xlLmxvZyBAXG4gICAgaWYgbm90IEBfaXNfc2FmZSB0aGVuIHRocm93IG5ldyBFcnJvcihcIkludGVybmFsIG1ldGhvZCBjYW5ub3QgYmUgY2FsbGVkIGZyb20gb3V0c2lkZVwiKVxuXG4gIF9hdHRhY2hfaGFuZGxlcjogKHN0YXRlX25hbWUsIGRlcHMsIGhhbmRsZXJfbmFtZSwgaGFuZGxlciktPlxuICAgIEBfZW5zdXJlX3NhZmUoKVxuICAgIGlmIF8uaXNGdW5jdGlvbihoYW5kbGVyKVxuICAgICAgQFtoYW5kbGVyX25hbWVdID0gQF9pbnZva2UuYmluZCBALCBzdGF0ZV9uYW1lLCBkZXBzLCBoYW5kbGVyX25hbWUsIGhhbmRsZXJcbiAgICBlbHNlIGlmIGlzX3Byb3AoaGFuZGxlcilcbiAgICAgIGdldHRlciA9IEBfaW52b2tlLmJpbmQgQCwgc3RhdGVfbmFtZSwgZGVwcywgaGFuZGxlcl9uYW1lLCBoYW5kbGVyLmdldFxuICAgICAgZGVzYyA9IGdldDogZ2V0dGVyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkgQCwgaGFuZGxlcl9uYW1lLCBkZXNjXG5cbiAgX2dvdG86IChuYW1lKSAtPlxuICAgIEBfZW5zdXJlX3NhZmUoKVxuICAgIGlmIG5vdCBuYW1lIG9mIEBfc3RhdGVzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDaGFpbmFibGUgZG9lcyBub3QgY29udGFpbiBzdGF0ZSAnI3tuYW1lfSdcIilcbiAgICBAX3N0YXRlX25hbWUgPSBuYW1lXG4gICAgIyBjb25zb2xlLmxvZyBcIlN0YXRlOiAje25hbWV9XCJcbiAgICBAZW1pdCBcInN0YXRlX2NoYW5nZWRcIlxuXG4gIF9pbnZva2U6IChzdGF0ZV9uYW1lLCBkZXBzLCBtZXRob2RfbmFtZSwgbWV0aG9kLCBhcmdzLi4uKSAtPlxuICAgICMgQ2hlY2sgaWYgbWV0aG9kIGlzIGNhbGxlZCBmcm9tIGRlc2lyZWQgc3RhdGVcbiAgICBpZiBzdGF0ZV9uYW1lICE9IFwiKlwiIGFuZCBAX3N0YXRlX25hbWUgIT0gc3RhdGVfbmFtZVxuICAgICAgIyBDaGVjayBpZiBkZXNpcmVkIHN0YXRlIGlzIHJlYWNoYWJsZSBmcm9tIGN1cnJlbnQgc3RhdGVcbiAgICAgIGlmIEBfc3RhdGVfbmFtZSBub3QgaW4gZGVwc1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2QgJyN7bWV0aG9kX25hbWV9JyBjYW5ub3QgYmUgY2FsbGVkIGluIGN1cnJlbnQgc3RhdGUgJyN7QF9zdGF0ZV9uYW1lfSdcIilcbiAgICAgIGVsc2VcbiAgICAgICAgIyBHbyB0byBkZXNpcmVkIHN0YXRlXG4gICAgICAgIHNhZmVseSBALCBAX2dvdG8sIHN0YXRlX25hbWVcblxuICAgIG5leHRfY2FsbGVkID0gZmFsc2VcbiAgICBuZXh0X3N0YXRlID0gbnVsbFxuICAgIG5leHQgPSAobmFtZSkgLT5cbiAgICAgIG5leHRfY2FsbGVkID0gdHJ1ZVxuICAgICAgbmV4dF9zdGF0ZSA9IG5hbWVcblxuICAgIGFyZ3MudW5zaGlmdChuZXh0KVxuXG4gICAgcmV0ID0gbWV0aG9kLmFwcGx5KEAsIGFyZ3MpXG5cbiAgICBpZiBuZXh0X2NhbGxlZFxuICAgICAgaWYgbmV4dF9zdGF0ZT9cbiAgICAgICAgc2FmZWx5IEAsIEBfZ290bywgbmV4dF9zdGF0ZVxuICAgICAgICByZXR1cm4gQFxuICAgICAgIyBCcmVhayBjaGFpblxuICAgICAgcmV0dXJuIHJldFxuXG4gICAgcmV0dXJuIEBcbiJdfQ==