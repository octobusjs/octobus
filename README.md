# Octobus.js

[![travis build](https://img.shields.io/travis/viczam/octobus.svg)](https://travis-ci.org/viczam/octobus)


Octobus is a javascript library that helps you keep your code modular by creating services that communicate with each other through messages.

## Install

```
npm install octobus.js
```

It is built on top of node's EventEmitter and it respects the open / closed principle.

## Key principles:
- functions with named arguments are preferred to functions with positional arguments
- promises are better than callbacks (they help you get rid of callback hell)
- async / await calls are better than promises alone and will make you code more readable and manageable
- service functions (handlers) as first class citizens
- inheritance is great when used with good care; composition is even better.

Requirements:
- octobus.js requires node >= 6 because of its Proxy use

## How to use it:

1) First you need to create a ServiceBus instance. We use it to send message between publishers and subscribers.

```js
import { ServiceBus } from 'octobus';
const serviceBus = new ServiceBus();
```

2) We create plugins and connect them to the serviceBus instance.

```js
import { Plugin } from 'octobus';
const plugin = new Plugin();
plugin.connect(serviceBus);
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

Things are getting better when you start to leverage the new features ES6 provides (promises, async / await, arrow functions etc.).

The same functionality from above can be written like this:

```javascript
const { dispatch, subscribe } = new Octobus();

subscribe('foo', ({ params: name }) => `Hello ${name}!`);

dispatch('foo', 'world').then((result) => {
  console.log(result); // Hello world!
});
```
