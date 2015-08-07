_ = require('underscore')
EventEmitter = require('events').EventEmitter
Function::property = (prop, descriptor) ->
  Object.defineProperty @::, prop, descriptor

initHandler =
  config: (next, state_name, deps, handlers) ->
    # console.log "config"
    safely @, @_push_state, state_name, deps, handlers

    next('config')

configHandler =
  method: (next, name, fn) ->
    state = @_states[@flag('config:target')]
    state.handlers[name] = fn
    safely @, @_attach_handler, state.name, state.deps, name, fn
  property: (next, name, desc) ->
    state = @_states[@flag('config:target')]
    state.handlers[name] = desc
    safely @, @_attach_handler, state.name, state.deps, name, desc
  finish: (next) ->
    next('ready')

safely = (c, fn, args...) ->
  while args.length > 0
    peek = args[args.length - 1]
    if peek != undefined then break;
    args.pop()
  c._is_safe = true
  fn.apply c, args
  c._is_safe = false

class State
  constructor: (@name) ->
    @deps = []
    @handlers = {}

  addDeps: (deps) ->
    @deps = _.uniq(@deps.concat(deps))

  addHandlers: (handlers, cb) ->
    for n, f of handlers
      if n of @handlers then continue
      @handlers[n] = f
      cb(n, f)

is_prop = (h) ->
  _.isObject and _.isFunction(h['get'])


module.exports =
class Chainable extends EventEmitter
  @extend: (proto) ->
    derived = class extends @
      constructor: ->
        super()
        if proto?.hasOwnProperty 'constructor'
          proto.constructor.apply @, arguments

    if proto?
      for own key, value of proto
        derived::[key] = value

    derived::__super = ->
      derived.__super__.constructor.apply @, arguments

    return derived

  constructor: ->
    @_state_name = "init"
    @_states = {}
    @_flags = {}
    safely @, @_push_state, 'init', ['config'], initHandler
    safely @, @_push_state, 'config', configHandler

  flag: (key, value) ->
    if not value?
      return @_flags[key]
    @_flags[key] = value
    return value

  _push_state: (name, deps, handlers) ->
    # console.log arguments.length
    switch arguments.length
      when 0
        name = "*"
        deps = []
        handlers = {}
      when 1
        if _.isString(name)
          deps = []
          handlers = {}
        else if _.isArray(name)
          throw new TypeError("Global method does not have deps. Expect name or handlers.")
        else if _.isObject(name)
          handlers = name
          name = "*"
          deps = []
      when 2
        if _.isArray(deps)
          handlers = {}
        else if _.isObject(deps)
          handlers = deps
          deps = []
    @flag "config:target", name
    if not @_states[name]?
      @_states[name] = new State(name)
    state = @_states[name]
    state.addDeps(deps)
    state.addHandlers handlers, (n, fn) =>
      safely @, @_attach_handler, name, deps, n, fn

  _ensure_safe: ->
    s = new Error().stack.split('\n')
    callsite = /Chainable\._([\w_]+)/.exec(s[2])[1]
    # console.log "Safely call: #{callsite}"
    # console.log @
    if not @_is_safe then throw new Error("Internal method cannot be called from outside")

  _attach_handler: (state_name, deps, handler_name, handler)->
    @_ensure_safe()
    if _.isFunction(handler)
      @[handler_name] = @_invoke.bind @, state_name, deps, handler_name, handler
    else if is_prop(handler)
      getter = @_invoke.bind @, state_name, deps, handler_name, handler.get
      desc = get: getter
      Object.defineProperty @, handler_name, desc

  _goto: (name) ->
    @_ensure_safe()
    if not name of @_states
      throw new Error("Chainable does not contain state '#{name}'")
    @_state_name = name
    # console.log "State: #{name}"
    @emit "state_changed"

  _invoke: (state_name, deps, method_name, method, args...) ->
    # Check if method is called from desired state
    if state_name != "*" and @_state_name != state_name
      # Check if desired state is reachable from current state
      if @_state_name not in deps
        throw new Error("Method '#{method_name}' cannot be called in current state '#{@_state_name}'")
      else
        # Go to desired state
        safely @, @_goto, state_name

    next_called = false
    next_state = null
    next = (name) ->
      next_called = true
      next_state = name

    args.unshift(next)

    ret = method.apply(@, args)

    if next_called
      if next_state?
        safely @, @_goto, next_state
        return @
      # Go back to ready state
      safely @, @_goto, "ready"
      # Break chain
      return ret

    return @
