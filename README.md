# Octobus.js

[![travis build](https://img.shields.io/travis/viczam/octobus.svg)](https://travis-ci.org/viczam/octobus)

Octobus is a service locator for javascript that implements the Publish / Subscribe pattern.
It lets you run your event handlers in a controlled environment, without forcing you to use a specific async-handling style: you can use promises, callbacks, async await, simple functions that return a result or a req/reply interface similar to hapi.js.

------------
# How it works

First you have to create a new instance of an event dispatcher:
```javascript
const dispatcher = createEventDispatcher();
```

Then you can start subscribing to events:
```javascript
dispatcher.subscribe('foo', () => 'bar');
```

You call subscribe with 2 parameters - an event name and a handler.

The events are simple strings containing alphanumeric characters separated by dot.
The range of alphanumeric characters is called a segment.
You can think of events as actions prefixed by a namespace, or as channel you can use to send out messages.

Example of event names:
- `doSomething`
- `Math.sum`
- `entity.Opportunity.getFloorPrice`

Let's build a simple service that sums up 2 numbers:
```javascript
dispatcher.subscribe('math.sum', ({ params }, cb) => (
  cb(null, params.left + params.right);
));
```

The handlers has 2 parameters: the first one is an options object and the second one is the callback you need to call when you want to return the result.

One of the properties of the options object is a `params` object - a container of the actual message.

But since our handler is a function that doesn't do any async processing, you can simply return the result and it will work the same way:
```javascript
dispatcher.subscribe('math.sum', ({ params }) => (
  return params.left + params.right;
));
```

You can call this service by dispatching an event with the same name you registered the subscriber and by passing the right parameters:
```javascript
dispatcher.dispatch('math.sum', {
  left: 1,
  right: 2,
}, (err, result) => {
  expect(result).to.equal(3);
});
```

You call the dispatch function with 3 parameters:
1. the event name
2. the additional parameters that should go with the event
3. a callback which is the result handler

Since the dispatch call return a promise, you can handle the result without using a callback:
```javascript
dispatcher.dispatch('math.sum', {
  left: 1,
  right: 2,
}).then((result) => {
  expect(result).to.equal(3);
}, (err) => {
  expect(err).to.not.exist();
});
```

Great. Now I want to be able to able to pass an additional flag so I can tell the service to convert the parameters I'm passing to integer numbers before doing the sum. While you can go and change the existing handler, there's a change that you don't own that code (it's coming from an external library). Well, you can intercept the call and prepare the parameters yourself:
```javascript
dispatcher.subscribe('math.sum', ({ params }) => (
  return params.left + params.right;
));

dispatcher.subscribe('math.sum', ({ params, next }) => {
  if (params.integer) {
    return next({
      left: Math.floor(params.left),
      right: Math.floor(params.right),
    });
  }

  return next(params);
});
```
Here you'll notice I asked for an additional property of the options object called `next` - I can use it to call the next handler down the chain of handlers.

Then I can dispatch an event like this:
```javascript
return dispatcher.dispatch('math.sum', {
  left: 1.5,
  right: 2,
  integer: true,
}).then((result) => {
  expect(result).to.equal(3);
});
```

Let's create a service that handles the product of 2 numbers:
```javascript
dispatcher.subscribe('math.product', ({ params }) => (
  return params.left * params.right;
));
```

Since those 2 events are under the same namespace (`math`), you can lookup this namespace:
```javascript
const math = dispatcher.lookup('math');
```
And you can call the handler as what they are - namespaced functions:
```javascript
math.sum({ left: 1, right: 2 });
math.product({ left: 2, right: 3 });
```
With destructuring assignment it looks even nicer:
```javascript
const { sum product } = dispatcher.lookup('math');
sum({ left: 1, right: 2 });
```

But probably you want to validate the input to make sure you get the right parameters.
```javascript
dispatcher.subscribe('math.sum', ({ params }) => params.left * params.right, {
  schema: Joi.object({
    left: Joi.number().required(),
    right: Joi.number().required(),
  }).required()
});
```

What I did was to pass a third argument to the subscribe call, which is a configuration object. One of the options of it is a Joi schema object.

--------

Let's try to build a in-memory store for seneca. It should generate some CRUD services when called with a specific namespace.

We'll start with the tests:

```javascript
describe('generateCRUDServices', () => {
  let dispatcher;
  let store;

  beforeEach(() => {
    dispatcher = createEventDispatcher();

    dispatcher.subscribeMap('entity.User', generateCRUDServices());
  });
});
```

We used a method called `subscribeMap`. This method let's you to subscribe to a plain javascript object.
Here's how to use it:
```javascript
dispatcher.subscribeMap(`some.namespace.Something`, {
  foo() {
    return 'foo works!';
  },

  bar() {
    return 'bar works too!';
  },
});
```

Then you can do this:
```javascript
dispatcher.dispatch('some.namespace.Something.foo').then((result) => {
  expect(result).to.equal('foo works!');
});
```

Getting back to our tests, it looks like we need to have a method called `generateCRUDServices` that will return a POJO that contains our handlers.
```javascript
const generateCRUDServices = () => {
  return {};
};
```

Let's add a test for a service to create a new record:
```javascript
it('should create a new record', () => (
  dispatcher.dispatch('entity.User.create', {
    firstName: 'John',
  }).then((result) => {
    expect(result.id).to.exist();
    expect(result).to.deep.equal({
      firstName: 'John',
      id: 1,
    });
  })
));
```

And make the test pass:
```javascript
const generateCRUDServices = () => {
  const counter = 1;
  const store = {};

  return {
    create({ params }) {
      const id = counter++;
      store[id] = params;
      return {
        id,
        ...params,
      }
    }
  };
};
```

But it looks hackish, so let's implement an external store:
```javascript
import _ from 'lodash';

export default class {
  constructor(engine = new Map()) {
    this.counter = 1;
    this.engine = engine;
  }

  insert(record) {
    const id = this.counter++;
    this.engine.set(id, record);

    return this.get(id);
  }

  get(id) {
    if (!this.engine.has(id)) {
      return undefined;
    }

    return {
      ...this.engine.get(id),
      id,
    };
  }
}

```

And the our services generator will use the store (and we'll extract it into another file):
```javascript
export default () => {
  const store = new Store();

  const map = {
    getStore() {
      return store;
    },

    create({ params }) {
      return store.insert(params);
    },
  };

  return map;
};

```

Cool. Now the tests are passing. Let's add another test for creating multiple records at once:
```javascript
it('should create multiple records', () => (
  dispatcher.dispatch('entity.User.create', [{
    firstName: 'John1',
  }, {
    firstName: 'John2',
  }, {
    firstName: 'John3',
  }]).then((result) => {
    expect(result).to.have.lengthOf(3);
  })
));
```

We need to amend the create service in the services generator:
```javascript
create({ params }) {
  if (Array.isArray(params)) {
    return params.map((item) => store.insert(item));
  }

  return store.insert(params);
},
```

Now let's add a service to find a record by an id:
```javascript
it('should find a record by id', () => (
  dispatcher.dispatch('entity.User.create', {
    firstName: 'John',
  }).then(({ id }) => (
    dispatcher.dispatch('entity.User.findById', id).then((user) => {
      expect(user.firstName).to.equal('John');
    })
  ))
));
```

And the related service:
```javascript
findById({ params }) {
  return store.get(params);
},
```

I will share the implementation of some other tests along with the implementation of the services:
`test/generateCRUDServices.js`
```javascript
import Joi from 'joi';
import { expect } from 'chai';
import sinon from 'sinon';
import { createEventDispatcher } from 'octobus.js';
import { generateCRUDServices } from '../src';
import Store from '../src/Store';

const userSchema = {
  id: Joi.number().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string(),
  email: Joi.string().email(),
  role: Joi.string(),
  age: Joi.number(),
  birthdate: {
    year: Joi.number(),
    day: Joi.number(),
  },
  hobbies: Joi.array().items(Joi.string()),
};

describe('generateCRUDServices', () => {
  let dispatcher;
  let store;

  beforeEach(() => {
    store = new Store();
    dispatcher = createEventDispatcher();

    dispatcher.subscribeMap('entity.User', generateCRUDServices({ store }));
  });

  it('should create a new record', () => (
    dispatcher.dispatch('entity.User.create', {
      firstName: 'Victor',
    }).then((result) => {
      expect(result.id).to.exist();
      expect(result).to.deep.equal({
        firstName: 'Victor',
        id: 1,
      });
    })
  ));

  it('should create multiple records', () => (
    dispatcher.dispatch('entity.User.create', [{
      firstName: 'John1',
    }, {
      firstName: 'John2',
    }, {
      firstName: 'John3',
    }]).then((result) => {
      expect(result).to.have.lengthOf(3);
    })
  ));

  it('should find a record by id', () => (
    dispatcher.dispatch('entity.User.create', {
      firstName: 'Victor',
    }).then(({ id }) => (
      dispatcher.dispatch('entity.User.findById', id).then((user) => {
        expect(user.firstName).to.equal('Victor');
      })
    ))
  ));

  it('should find a record by filters', () => (
    dispatcher.dispatch('entity.User.create', [{
      firstName: 'John1',
      lastName: 'Doe',
      age: 22,
      role: 'admin',
    }, {
      firstName: 'John2',
      lastName: 'Donovan',
      age: 22,
      role: 'superadmin',
    }, {
      firstName: 'John3',
      lastName: 'Doe',
      age: 23,
      role: 'admin',
    }]).then(() => (
      dispatcher.dispatch('entity.User.findMany', {
        lastName: 'Doe',
        role: 'admin',
      }).then((users) => {
        expect(users).to.have.lengthOf(2);
        expect(users[0].age).to.equal(22);
        expect(users[1].firstName).to.equal('John3');
      })
    ))
  ));

  it('should find multiple records by filters', () => (
    dispatcher.dispatch('entity.User.create', [{
      firstName: 'John1',
      age: 21,
    }, {
      firstName: 'John2',
      age: 22,
    }, {
      firstName: 'John3',
      age: 23,
    }]).then(() => (
      dispatcher.dispatch('entity.User.findOne', {
        age: 22,
      }).then((user) => {
        expect(user.firstName).to.equal('John2');
      })
    ))
  ));

  it('should replace a record', () => (
    dispatcher.dispatch('entity.User.create', {
      firstName: 'Victor',
    }).then((createdUser) => (
      dispatcher.dispatch('entity.User.replaceOne', {
        ...createdUser,
        firstName: 'John',
      }).then((user) => {
        expect(user.firstName).to.equal('John');
      })
    ))
  ));

  it('should update one record', () => (
    dispatcher.dispatch('entity.User.create', {
      firstName: 'John',
      lastName: 'Doe',
    }).then((createdUser) => (
      dispatcher.dispatch('entity.User.updateOne', {
        query: {
          firstName: 'John',
        },
        update: {
          lastName: 'Donovan',
        },
      }).then(() => (
        dispatcher.dispatch('entity.User.findById', createdUser.id).then((foundUser) => {
          expect(foundUser).to.exist();
          expect(foundUser.firstName).to.equal('John');
          expect(foundUser.lastName).to.equal('Donovan');
        })
      ))
    ))
  ));
});
```

`src/generateCRUDServices.js`
```javascript
import Store from './Store';

export default ({
  schema,
  store = new Store(),
}) => {
  const map = {
    getStore() {
      return store;
    },

    create({ params }) {
      if (Array.isArray(params)) {
        return params.map((item) => store.insert(item));
      }

      return store.insert(params);
    },

    findById({ params }) {
      return store.get(params);
    },

    findOne({ params }) {
      return store.findOne(params);
    },

    findMany({ params }) {
      return store.findMany(params);
    },

    replaceOne({ params }) {
      if (!params.id) {
        throw new Error('The id is required!');
      }

      return store.replace(params.id, params);
    },

    updateOne({ params }) {
      return store.updateOne(params.query, params.update);
    },

    updateMany({ params }) {
      return store.updateMany(params.query, params.update);
    },

    removeOne({ params }) {
      return this.store.removeOne(params);
    },

    removeMany({ params }) {
      if (!params) {
        store.clear();

        return true;
      }

      return this.store.removeMany(params);
    },
  };

  return map;
};
```

`src/Store.js`
```javascript
import _ from 'lodash';

export default class {
  constructor(engine = new Map()) {
    this.counter = 1;
    this.engine = engine;
  }

  insert(record) {
    const id = this.counter++;
    this.engine.set(id, record);

    return this.get(id);
  }

  get(id) {
    if (!this.engine.has(id)) {
      return undefined;
    }

    return {
      ...this.engine.get(id),
      id,
    };
  }

  findOne(match = {}) {
    for (const item of this.engine) {
      const [id, record] = item;
      if (_.isMatch(record, match)) {
        return {
          id,
          ...record,
        };
      }
    }

    return undefined;
  }

  findMany(match = {}) {
    const items = [];
    this.engine.forEach((record, id) => {
      if (_.isMatch(record, match)) {
        items.push({
          id,
          ...record,
        });
      }
    });

    return items;
  }

  replace(id, data) {
    if (!this.engine.has(id)) {
      throw new Error(`Couldn't find item with id ${id}.`);
    }

    this.engine.set(id, _.omit(data, ['id']));

    return this.get(id);
  }

  updateOne(match = {}, update) {
    const item = this.findOne(match);
    this.engine.set(item.id, {
      ...item,
      ...update,
    });

    return this.get(item.id);
  }

  updateMany(match = {}, update) {
    const items = this.findMany(match);
    items.forEach((item) => {
      Object.assign(item, {
        update,
      });

      this.engine.set(item.id, item);
    });

    return items;
  }

  removeOne(match = {}) {
    const item = this.findOne(match);
    if (item) {
      this.engine.delete(item.id);
      return item;
    }

    return undefined;
  }

  removeMany(match = {}) {
    const items = this.findMany(match);
    items.forEach(({ id }) => {
      this.engine.delete(id);
    });

    return items;
  }

  clear() {
    this.engine.clear();

    return this;
  }

  toJSON() {
    return Array.from(this.engine.entries()).reduce(
      (acc, [id, item]) => ({
        ...acc,
        [id]: item,
      }), {}
    );
  }
}
```

Now let's say we want to add some timestamps every time we create or update a record.
Let's to that first for the create function:
```javascript
it('should add timestamps', () => {
  dispatcher.subscribe(/entity\.User\.create/, ({ params, next }) => (
    next({
      ...params,
      createdAt: new Date(),
    })
  ));

  return dispatcher.dispatch('entity.User.create', {
    firstName: 'John',
    lastName: 'Doe',
  }).then((result) => {
    console.log(result);
    expect(result.createdAt).to.exist();
    expect(result.createdAt).to.be.an.instanceof(Date);
  });
});
```

You'll notice I use subscribe with a regular expression. That will take precedence over any subscribe calls with string events made afterwards.

Here's a test explaining that:
```javascript
it('should respect the order of regular expressions based susbcribers', () => {
  dispatcher.subscribe(/test/, ({ next, params }) => next(`${params} 3`));
  dispatcher.subscribe(/^test$/, ({ next, params }) => next(`${params} 2`));
  dispatcher.subscribe('test', ({ next, params }) => next(`${params} 5`));
  dispatcher.subscribe(/test/, ({ next, params }) => next(`${params} 1`));
  dispatcher.subscribe('test', ({ next, params }) => next(`${params} 4`));

  return dispatcher.dispatch('test', 0).then((result) => {
    expect(result.trim()).to.equal('0 1 2 3 4 5');
  });
});
```

But the timestamps generation feature is not complete. Let's do that for the `replaceOne` service as well.
```javascript
it('should add timestamps', () => {
  dispatcher.subscribe(/entity\.User\.(create|replaceOne)/, ({ params, next }) => {
    const nextParams = { ...params };

    if (!nextParams.id) {
      nextParams.createdAt = new Date();
    } else {
      nextParams.updatedAt = new Date();
    }

    return next(nextParams);
  });

  return dispatcher.dispatch('entity.User.create', {
    firstName: 'John',
    lastName: 'Doe',
  }).then((user) => {
    expect(user.createdAt).to.exist();
    expect(user.createdAt).to.be.an.instanceof(Date);

    dispatcher.dispatch('entity.User.replaceOne', {
      ...user,
      lastName: 'Donovan',
    }).then((replacedUser) => {
      expect(replacedUser.updatedAt).to.exist();
      expect(replacedUser.updatedAt).to.be.an.instanceof(Date);
    });
  });
});
```

We can do the same thing for the `updateOne` and `updateMany`, where we can add the timestamp to the update payload.

Now let's say we have a new requirement to send an email whenever a user gets created:
```javascript
dispatcher.subscribe('entity.User.create', async ({ params, next, dispatch }) => {
  const result = await next(params);
  dispatch('my.email.service.sendUserCreatedEmail', result);
  return result;
});
```

Notice that your handler can be an async function.
But this again looks hackish. Why can't we add another handler to `observe` the user creation event, without interfering
with the chain of handlers for that event.

Well, we can do that:
```javascript
dispatcher.onAfter('entity.User.create', (result, { dispatch }) => {
  dispatch('my.email.service.sendUserCreatedEmail', result);
});
```
And we can be sure that this event handler will get executed whenever a user is created successfully. You can also do stuff before something happens by subscribing to the `onBefore` event.

# Error handling
Error handling with octobus is easy. If an error occurred in a handler, you get access to it in the dispatch call (remember, you can use either promises or pass a callback to the dispatch call).
But there's more than that - you can listen for an `error` event on the dispatcher, to act outside the dispatch calls (this way you can log the errors, or call some other service to react to it etc.).
```javascript
it('should handle errors', () => {
  dispatcher.subscribe('test', (ev, cb) => {
    cb(new Error('it doesn\'t work!'), 'it works');
  });

  dispatcher.on('error', (err) => {
    expect(err).to.be.an.instanceof(Error);
  });

  return dispatcher.dispatch('test').catch((err) => {
    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal('it doesn\'t work!');
  });
});
```

That's it. You can read the tests [here](https://github.com/viczam/octobus/blob/master/test/createEventDispatcher.test.js) - to get a feeling of the complete API of octobus. Here's more you can do:
- have default parameters for your handlers
- unsubscribe events
- proxying events and much more.

-----

Here's are some octobus related libraries:
- https://github.com/viczam/octobus-mongodb
- https://github.com/viczam/hapi-octobus
- https://github.com/viczam/octobus-rethinkdb
