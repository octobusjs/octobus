# Octobus.js

[![travis build](https://img.shields.io/travis/viczam/octobus.svg)](https://travis-ci.org/viczam/octobus)


Octobus is a javascript library that helps you keep your code modular by creating services that communicate with each other through messages.

## Install

```
npm install octobus.js
```

## Key principles:
- functions with named arguments are preferred to functions with positional arguments
- promises are better than callbacks (they help you get rid of callback hell)
- async / await calls are better than promises alone and will make you code more readable and manageable
- service functions (handlers) as first class citizens
- inheritance is great when used with good care; composition is even better.

Requirements:
- octobus.js requires node >= 6 because of its Proxy use, node 7 is recommended.

## How to use it:

1) First we need to create a ServiceBus instance. We use it to send message to services.

```js
import { ServiceBus } from 'octobus.js';
const serviceBus = new ServiceBus();
```

2) We create a plugin and connect it to our ServiceBus instance. Plugins are meant to handle bits of our business logic.

```js
import { Plugin } from 'octobus.js';
const plugin = new Plugin();
plugin.connect(serviceBus);
```

2) We create services, which are functions that can listen and act on a specific topic.

```js
plugin.subscribe('say.hello', ({ message }) => `Hello, ${message.data.name}!`);
```

3) Now we are able to send message to be handled by the services we previously defined.

```js
plugin.send('say.hello', { name: 'John' }).then((result) => {
  console.log(result); // should output "Hello, John!"
});
```
