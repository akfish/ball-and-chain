Chainable = require('../src')
describe "Chainable", ->
  describe "should be configurable", ->
    it "in constructor", ->
      class C extends Chainable
        constructor: ->
          super()
          @config("foo", ['ready'])
            .method "foo", (next, bar) -> console.log("Foo #{bar}")
            .method "bar", (next, bar) -> console.log("Bar #{bar}")
            .config()
            .method "g", (next, f) -> console.log("g#{f}")
            .finish()

      c = new C()

      expect(c, '.foo').to.have.property('foo').that.is.a('function')
      expect(c, '.bar').to.have.property('bar').that.is.a('function')
      expect(c, '.g').to.have.property('g').that.is.a('function')

    it "in constructor (JavaScript)", ->
      C = `
      Chainable.extend({
        constructor: function() {
          this.config("foo", ['ready'])
            .method("foo", function(next, bar) { console.log("Foo #{bar}")})
            .method("bar", function(next, bar) { console.log("Bar #{bar}")})
            .config()
            .method("g", function(next, f) { console.log("g#{f}")})
            .finish()
        }
        })
      `
      c = new C()

      expect(c, '.foo').to.have.property('foo').that.is.a('function')
      expect(c, '.bar').to.have.property('bar').that.is.a('function')
      expect(c, '.g').to.have.property('g').that.is.a('function')


    it "via config()", ->
      c = new Chainable()
      handler =
        "foo": get: (next, bar) ->
        "bar": (next, bar) ->
      c.config("foo", ['ready'], handler).finish()
      expect(c, '.foo').to.have.property('foo').that.is.not.a('function')
      expect(c, '.bar').to.have.property('bar').that.is.a('function')

    it "via config().method", ->
      c = new Chainable()
      c.config("foo", ['ready'])
        .method "foo", (next, bar) -> console.log("Foo #{bar}")
        .method "bar", (next, bar) -> console.log("Bar #{bar}")
        .config()
        .method "g", (next, f) -> console.log("g#{f}")
        .finish()

      expect(c, '.foo').to.have.property('foo').that.is.a('function')
      expect(c, '.bar').to.have.property('bar').that.is.a('function')
      expect(c, '.g').to.have.property('g').that.is.a('function')

    it "via config().property", ->
      c = new Chainable()
      c.config("foo", ['ready'])
        .property("foo", get: (next) -> )
        .method("bar", (next, bar) -> )
        .config()
        .property("g", get: (next) -> )
        .finish()

      expect(c, '.foo').to.have.property('foo').that.is.not.a('function')
      expect(c, '.bar').to.have.property('bar').that.is.a('function')
      expect(c, '.g').to.have.property('g').that.is.not.a('function')

    it "only before config().finish() is called", ->
      c = new Chainable()
      c.config().finish()
      expect(-> c.config()).to.throw(Error)

  it "should chain methods", ->
    expected = [
      "Foo 123"
      "Bar 456"
    ]
    actual = []
    c = new Chainable()
    c.config("foo", ['ready'])
      .method "foo", (next, bar) -> actual.push("Foo #{bar}")
      .method "bar", (next, bar) -> actual.push("Bar #{bar}")
      .finish()

    c.foo(123).bar(456)
    expect(actual).to.deep.equal(expected)

  it "should chain property", ->
    expected = [
      "Foo"
      "Bar"
    ]
    actual = []
    c = new Chainable()
    c.config("foo", ['ready'])
      .property("foo", get: (next) -> actual.push("Foo"))
      .property("bar", get: (next) -> actual.push("Bar"))
      .finish()

    c.foo.bar
    expect(actual).to.deep.equal(expected)

  it "should break chain if needed", ->
      c = new Chainable()
      c.config("foo", ['ready'])
        .method("foo", (next, bar) ->
          next()
          bar)
        .finish()

      expect(c.foo(1), 'break chain').to.equal(1)
      expect(c._state_name, "back to ready state").to.equal("ready")
  describe "state", ->
    it "should transit when next() is called", ->
      c = new Chainable()
      c.config("foo", ['ready'])
        .method "foo", (next, bar) -> next('bar')
        .config("bar")
        .property("bar", get: (next) -> next('ready'))
        .finish()

      c.foo().bar.foo().bar
    it "should emit state_changed event", (done) ->
      c = new Chainable()
      c.on "state_changed", done
      c.config()
    it "should verify state name and deps constraints", ->
      c = new Chainable()
      c.config("foo", ['ready'])
        .method "foo", (next, bar) -> next('bar')
        .config("bar")
        .property("bar", get: (next) -> next('ready'))
        .finish()

      expect(-> c.foo().foo()).to.throw(Error)

  describe "flag", ->
    it "should get/set", ->
      c = new Chainable()
      expect(c.flag('foo'), 'undefined flag').to.be.undefined
      c.flag('foo', 'bar')
      expect(c.flag('foo'), 'set flag then get').to.equal('bar')
      c.flag('foo', 1)
      expect(c.flag('foo'), 'change flag').to.equal(1)
