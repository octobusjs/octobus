# Octobus.js

[![travis build](https://img.shields.io/travis/viczam/octobus.svg)](https://travis-ci.org/viczam/octobus)


Octobus is a javascript library that helps you keep your code modular by creating services that communicate with each other through well-defined messages.

# Install

```
npm install octobus.js
```

It is built on top of node's EventEmitter and it respects the open / closed principle.

Key principles:
- functions with named arguments are preferred to functions with positional arguments
- promises are better than callbacks (they help you get rid of callback hell)
- async / await calls are better than promises alone and will make you code more readable and manageable
- service functions (handlers) as first class citizens
- inheritance is great when used with good care; composition is even better.

Requirements:
- octobus.js requires node 6 because of its Proxy use

# How to use it:

1) First you need to create a shareable instance of Octobus. You'll use it whenever you want to call a previously defined service.
It's up to you how to name it, but here are some suggestions: dispatcher, eventDispatcher, eventBus, serviceLocator etc.

```js
import Octobus from 'octobus.js';
const dispatcher = new Octobus();
```

2) You create your subscriptions. These are functions stored under a specific namespace (event name).
The namespace matters, since you're going to use it when you call the function (service).

```js
dispatcher.subscribe('foo', function(options, cb) {
  var name = options.params;
  cb(null, "Hello " + name + '!');
});
```

3) Then you'll start dispatching events:

```js
dispatcher.dispatch('foo', 'world', (err, result) => {
  console.log(result); // Hello world!
});
```

Things are getting better when you start to leverage the new features ES6 provides (promises, async / await, arrow functions etc.):
The same functionality from above can be written like this:

```javascript
const { dispatch, subscribe } = new Octobus();

subscribe('foo', ({ params: name }) => `Hello ${name}!`);

dispatch('foo', 'world').then((result) => {
  console.log(result); // Hello world!
});
```

# Extensions

- https://github.com/viczam/octobus-mongodb
- https://github.com/viczam/hapi-octobus
- https://github.com/viczam/octobus-rethinkdb
- https://github.com/viczam/octobus-memory-store
- https://github.com/viczam/hb-user
