# ball-and-chain

Chainable API builder with state transition.

## Install

```bash
npm install --save ball-and-chain
```

## Quick Examples

```coffee
Chainable = require 'ball-and-chain'

c = new Chainable()

# Config methods/properties for state "foo", which is reachable from
# "ready" or "bar" state
c.config("foo", ['ready', 'bar'])
  .method("a", (next, num) ->
    # `num` is a user argument
    console.log(num)
    # Transit to "bar" state
    next("bar")
    )
  # "bar" state
  .config("bar")
  .property("done", get: (next) ->
    # Call next without a state name will break the chain
    next()
    # Return value will be used instead of this
    return 1
  )
  # Methods/properties that can be called from any states
  .config()
  .method("whatever", (next) ->)
  # Finish config and goto "ready" state
  .finish()

# c is now in `ready` state
# throw error. `done` is in "bar" state, which is not reachable from "ready"
c.done
# OK. `whatever` has no state constraints
c.whatever('dude')
# OK. `a` is in "foo" state, which is reachable from "ready"
# User arguments are pased after `next`
c.a(1)
# Now in "bar" state, done can be called
# Break chain, return 1, back to "ready" state
ret = c.done
# Or chained together
ret = c.whatever('dude').a(1).done
# output "1"
console.log ret
```

One can also inherit `Chainable` class
```coffee
class C extends Chainable
  constructor: ->
    # Call `super` before config
    super()
    @config()
      #...
      .finish()

c = new C()
```

In JavaScript:

```js
var C = Chainable.extends({
  constructor: function() {
    // super is called internally

    this.config()
      //...
      .finish()
  }
});

var c = new C()
```

## API

### `config([state], [deps], [handlers])`

Configure chainable object.

State | Reachable From | Transits To
----- | -------------- | ----------
`'init'`| `'config'`     | `'config'`

Argument | Type | Description
-------- | --------| -----------------
`state` | `string` | State name (optional)
`deps` | `Array<string>` | State names (optional)
`handlers` | `object` | Handlers (optional)

#### State and deps

A chainable object has internal states. When `state` is specified, the methods and properties attached with `handlers` or consequent `method`/`property` calls can only be accessible when the chainable object is in that state.

When current state is one of the states in `deps` (if specified), the chainable object will transit to `state` first (thus make the methods/properties accessible).

If `state` and `deps` are not provided, the methods and properties attached can be accessed all the time.

There are 3 built in states:

> **init** ===`this.config()`===> **config** ===`this.finish()`===> **ready**

You should make sure one of your state's `deps` contains `'ready'`.


#### Handlers

`handlers` is a key-value map that contains methods or properties to be attached. The keys are method/property names and the values are corresponding function body.

```coffee
handlers =
  name: handler
  # others
```

There are 2 kinds of handlers:

* method_handler(next, args...)

* prop_handler = {get: getter(next)}

Their `this` context are binded to the chainable instances.

`next([next_state_name: string])` is a callback function for state transition. Any user arguments are passed in order after `next`.

Normally you won't need to return any thing since the chianable class will return `this` by default (thus making it chainable). If `next` is called without the name of next state, the return value of that handler will be used (thus break the chain).

### `method(name, method_handler)`

Attach a method to current state.

State | Reachable From | Transits To
----- | -------------- | ----------
`'config'`|    |

### `property(name, prop_handler)`

Attach a property to current state.

State | Reachable From | Transits To
----- | -------------- | ----------
`'config'`|    |

### `finish()`

Finish configuration.

This method must be called after all configuration is done to 'seal' the chianable object to prevent the user from alter it at run-time.

State | Reachable From | Transits To
----- | -------------- | ----------
`'config'`|    |  `'ready'`

### `this.flag(key, [value])`

Get/set a flag.

This method is used to store and pass internal state along the call chain.

Argument | Type | Description
-------- | --------| -----------------
`key` | `string` | Key
`value` | `object` | Value (optional). If specified, sets the value. Otherwise gets the value.

### `Chinable.extend(proto)`

Helper for pure JavaScript usage that creates derived class.
