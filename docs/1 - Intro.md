Let's write a simple function that calculates the CPM out of a price and a nr of impressions by the formula `CPM = (cost / impressions) * 1000`.

```js
function cpm(cost, impressions) {
  return (cost / impressions) * 1000;
}
```

Let's make it look nicer using arrow functions:

```js
const cpm = (cost, impressions) => {
  return (cost / impressions) * 1000;
};
```

...and shorter with implicit return:

```js
const cpm = (cost, impressions) => (cost / impressions) * 1000;
```

If you are like me, you'll always forget the position of the parameters (does the cost argument come first?).

PHP knows it better - http://phpsadness.com/sad/9 - positional parameters suck, so let's simulate named parameters:

```js
const cpm = ({ cost, impressions }) => (cost / impressions) * 1000;
```

Cool, now let's say we published a library featuring our CPM calculator. We get feedback about receiving bad values (infinite CPMs).
After a quick look we realize that it happens when we have zero impressions - the returned CPM should be zero as well.
Whoever is using our library decides to fix this issue by creating a wrapper over our existing service function.

```js
import { cpm } from 'cpm-calculator';

export default ({ cost, impressions }) => impressions === 0 ? 0 : cpm({ cost, impressions });
```

Now he just needs to replace all existing calls with his wrapping service.

But there's more to it. The cost and impressions can't be negative numbers and the returned result has to be a number.

Let's see how we can mitigate all these issues with octobus.

First we need a MessageBus instance, which will act as a central dispatcher of the messages we're about to send.

```js
import { MessageBus } from 'octobus.js';
const messageBus = new MessageBus();
```

While you can send messages through the messageBus directly, you'll want to use a ServiceBus most of the time especially because it gives you more control over the type of messages you can send, but it also provides a nicer way to subscribe and react to different messages.

```js
import { ServiceBus } from 'octobus.js';
const serviceBus = new ServiceBus();
```

The serviceBus needs to be connected to the messageBus instance to be able to send / receive messages.

```js
serviceBus.connect(messageBus);
```

Now we can subscribe to message topics:

```js
serviceBus.subscribe('say.hello', () => 'Hello, world!');
```

Let's try to send a message and see what happens:

```js
serviceBus.send('say.hello').then((result) => {
  assert.equal(result, 'Hello, world!')
});
```

Great, it worked.
Now let's use use what we learned for our cpm calculation logic.
First we need to be able to get access to the passed arguments. The handler receives the message (along with its data payload) in a special `message` named argument:

```js
serviceBus.subscribe('calculator.cpm', ({ message }) => {
  const { data } = message; // data is the actual payload that gets sent with the message
  return (data.cost / data.impressions) * 1000;
});
```

And this is how you can send a message with a payload:

```js
serviceBus.send('calculator.cpm', { cost: 22, impressions: 100 }).then(result => {
  assert.equal(result, 220);
});
```

Now let's say you want to get 0 as a result when the impressions number is 0. You can overwrite the previously defined service by creating another one under the same topic:

```js
serviceBus.subscribe('calculator.cpm', ({ message }) => {
  const { cost, impressions } = message.data;

  if (impressions === 0) {
    return 0;
  }

  return (cost / impressions) * 1000;
});
```

But you might want to call the previously defined service, instead of copy-pasting the code. You do that with a `next` function call, similar to `super` calls from class inheritance.
```js
serviceBus.subscribe('calculator.cpm', ({ message, next }) => {
  const { cost, impressions } = message.data;

  if (impressions === 0) {
    return 0;
  }

  return next({ cost, impressions });
});
```

The destructuring under the `params` parameter looks confusing. Would be nice if we could have the parameters under the main object argument, like this:
```js
const handler = ({ cost, impressions, next }) => impressions === 0 ? 0 : next({ cost, impressions });
```

You can actually do that using one of the available high-order functions for service handlers. These act as middlewares between dispatching and event and executing the handler's logic.

```js
import { hof } from 'octobus.js';

const { withData } = hof;

// same as above
serviceBus.subscribe(
  'calculator.cpm',
  withData(({ cost, impressions, next }) => (impressions === 0 ? 0 : next({ cost, impressions })))
);
```

Let's also make sure the cost and impressions are natural numbers. We'll use the awesome [Joi](https://github.com/hapijs/joi) validation library for that.

Make sure you install the module first:
```
npm install joi
```

Now let's import the library and the `withSchema` high-order function that allows us to validate the parameters:

```js
import Joi from 'joi';
import { MessageBus, ServiceBus, hof } from 'octobus.js';
import assert from 'assert';

const { withData, withSchema } = hof;
const messageBus = new MessageBus();
const serviceBus = new ServiceBus('calculator'); // we set the namespace to 'calculator'

serviceBus.connect(messageBus);

serviceBus.subscribe('cpm', ({ message }) => {
  const { data } = message;
  return data.cost / data.impressions * 1000;
});

const schema = { // actual schema
  cost: Joi.number().integer().positive().required(),
  impressions: Joi.number().integer().min(0).required(),
};

serviceBus.subscribe(
  'cpm',
  withSchema(schema)(
    withData(({ cost, impressions, next }) => (impressions === 0 ? 0 : next({ cost, impressions })))
  )
);

Promise.all([
  serviceBus.send('cpm', { cost: 22, impressions: 0 }),
  serviceBus.send('cpm', { cost: 22, impressions: 100 }),
])
  .then(results => {
    assert.equal(results[0], 0);
    assert.equal(results[1], 220);
  })
  .catch(err => console.log(err));
```

Let's also validate the result to make sure we always get a number greater than or equal to 0.

```js
const { withData, withSchema, withResultSchema } = hof;

serviceBus.subscribe(
  'cpm',
  withResultSchema(Joi.number().min(0))(
    withSchema({
      cost: Joi.number().integer().positive().required(),
      impressions: Joi.number().integer().min(0).required(),
    })(
      withData(
        ({ cost, impressions, next }) => (impressions === 0 ? 0 : next({ cost, impressions }))
      )
    )
  )
);
```

If all these function calls look confusing, there's a way to make them more readable. In the end, it's just functions composition and that means we can use the `flow` helper from lodash for that, but octobus already comes with its own version of it.

```js
import { hof, compose } from 'octobus.js';

const { withData, withSchema, withResultSchema } = hof;

const decorate = compose(
  withSchema(schema),
  withResultSchema(Joi.number().min(0)),
  withData
);

const finalHandler = decorate(handler);
```