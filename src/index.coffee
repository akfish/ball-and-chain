EventEmitter = require('events').EventEmitter
Function::property = (prop, descriptor) ->
  Object.defineProperty @::, prop, descriptor

initHandler =
  config: (next, state_name, deps, handlers) ->
    console.log "config"
    # Set flag for target state
    @flag "config:target", state_name
    # TODO: call push state
    safely @, @_push_state, state_name, deps, handlers

    # next('config', target: state)
    next('config')

configHandler =
  method: (next, name, fn) ->
    state = @_states[@flag('config:target')]
    state.handlers[name] = fn
    safely @, @_attach_method, state.name, state.deps, name, fn
  property: (next, name, cb) ->
    state = @local('target')
    state.addHandler name, cb
  finish: (next) ->
    next('ready')

safely = (c, fn, args...) ->
  c._is_safe = true
  fn.apply c, args
  c._is_safe = false

module.exports =
class Chainable extends EventEmitter
  constructor: ->
    @_state_name = "init"
    @_states = {}
    @_flags = {}
    safely @, @_push_state, 'init', ['config'], initHandler
    safely @, @_push_state, 'config', [], configHandler

  flag: (key, value) ->
    if not value?
      return @_flags[key]
    @_flags[key] = value
    return value

  _push_state: (name, deps, handlers = {}) ->
    # TODO: check for duplicates
    @_states[name] =
      name: name
      deps: deps
      handlers: handlers

    for n, fn of handlers
      # console.log n
      # console.log fn
      safely @, @_attach_method, name, deps, n, fn

  _ensure_safe: ->
    s = new Error().stack.split('\n')
    callsite = /C\._([\w_]+)/.exec(s[2])[1]
    console.log "Safely call: #{callsite}"
    console.log @
    if not @_is_safe then throw new Error("Internal method cannot be called from outside")

  _attach_method: (state_name, deps, method_name, method)->
    @_ensure_safe()
    @[method_name] = @_invoke.bind @, state_name, deps, method_name, method
    console.log @

  _goto: (name) ->
    @_ensure_safe()
    if not name of @_states
      throw new Error("Chainable does not contain state '#{name}'")
    @_state_name = name
    console.log "State: #{name}"
    @emit "state_changed"

  _invoke: (state_name, deps, method_name, method, args...) ->
    # Check if method is called from desired state
    if @_state_name != state_name
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
      # Break chain
      return ret

    return @
