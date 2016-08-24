# Octobus.js

[![travis build](https://img.shields.io/travis/viczam/octobus.svg)](https://travis-ci.org/viczam/octobus)

Octobus is a service locator for javascript that implements the Publish / Subscribe pattern.
You can use it to define services that communicate with each other through messages.

# Install

```
npm install octobus.js
```

# Extensions

- https://github.com/viczam/octobus-mongodb
- https://github.com/viczam/hapi-octobus
- https://github.com/viczam/octobus-rethinkdb
- https://github.com/viczam/octobus-memory-store

------------
# How it works

First you have to create a new instance of an event dispatcher:
```javascript
const dispatcher = createEventDispatcher();
```

Then you can start subscribing to events:
```javascript
dispatcher.subscribe('foo', function(options, cb) {
  var name = options.params;
  cb(null, "Hello " + name + '!');
});
```

And after that you can dispatch `foo` events with a `name` parameter:
```javascript
dispatcher.dispatch('foo', 'world', (err, result) => {
  console.log(result); // Hello world!
});
```

By leveraging ES6 and async / await with promises, the experience is much better.
You can write the example above like this:

```javascript
const { dispatch, subscribe } = dispatcher;

subscribe('foo', ({ params: name }) => `Hello ${name}!`);

dispatch('foo', 'world').then((result) => {
  console.log(result); // Hello world!
});
```
