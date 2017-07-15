# Octobus.js

[![travis build](https://img.shields.io/travis/viczam/octobus.svg)](https://travis-ci.org/viczam/octobus)


Octobus is a javascript library that helps you keep your code modular and extensible by creating services that respond to messages.

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

## Motivation:
- promotes high decoupling between the sender and the receiver of the message
- logging and introspection of the messages
- microservices friendly

Requirements:
- octobus.js requires node >= 6 because of its Proxy use.

## How to use it:

1) First we need to create a MessageBus instance. We use it to send message to services.

```js
import { MessageBus } from 'octobus.js';
const messageBus = new MessageBus();
```

2) We create a ServiceBus and connect it to our MessageBus instance. This service bus will proxy the message sending to the message bus and its main use is to group together handlers of a specific area of the business logic.

```js
import { ServiceBus } from 'octobus.js';
const serviceBus = new ServiceBus();
serviceBus.connect(messageBus);
```

2) We create services, which are functions that can listen and act on a specific topic.

```js
serviceBus.subscribe('say.hello', ({ message }) => `Hello, ${message.data.name}!`);
```

3) Now we are able to send message to be handled by the services we previously defined.

```js
serviceBus.send('say.hello', { name: 'John' }).then((result) => {
  console.log(result); // should output "Hello, John!"
});
```
