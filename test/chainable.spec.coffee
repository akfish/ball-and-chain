Chainable = require('../src')
describe "Chainable", ->
  describe "could be created", ->
    it "by constructor"
  describe "should be configurable", ->
    it "via config()", ->
      c = new Chainable()
      c.config()
    it "via config().method", ->
      c = new Chainable()
      c.config("foo", ['ready'])
        .method "foo", (next, bar) -> console.log("Foo #{bar}")
        .finish()

      c.foo(1)
    it "via config().property"
    it "only before config().finish() is called"
  it "should chain methods"
  it "should chain property"
  it "should break chain if needed"
  describe "state", ->
    it "should transit"
    it "should emit state_changed event"
    it "should verify state name and deps constraints"
  describe "flag", ->
    it "should get/set global flags"
    it "should get/set local flags"
