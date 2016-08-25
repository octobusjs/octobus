import Joi from 'joi';
import { expect } from 'chai';
import sinon from 'sinon';
import { createEventDispatcher, decorators } from '../src';
const {
  withDefaultParams,
  withSchema,
  withHandler,
  withMemoization,
  withLookups,
  withNamespace,
} = decorators;
import EmitterDebug from '../src/EmitterDebug';
import Event from '../src/Event';

describe('createEventDispatcher', () => {
  let dispatcher;
  let logger;

  beforeEach(() => {
    logger = [];
    dispatcher = createEventDispatcher({
      emitter: new EmitterDebug((msg) => logger.push(msg)),
    });
  });

  describe('handling results', () => {
    describe('that are valid', () => {
      it('should return the result', () => {
        dispatcher.subscribe('test', () => 'it works');

        return dispatcher.dispatch('test').then((result) => {
          expect(result).to.equal('it works');
        });
      });
    });

    describe('should throw an error when handling a result twice', () => {
      it('when returning a value and calling the callback', () => {
        dispatcher.subscribe('test', ({}, cb) => cb(null, 'it works') || true);
        expect(() => dispatcher.dispatch('test')).to.throw(/already handled/);
      });

      it('when returning a value and calling reply', () => {
        dispatcher.subscribe('test', ({ reply }) => reply('it works') || true);
        expect(() => dispatcher.dispatch('test')).to.throw(/already handled/);
      });

      it('when calling reply and the callback', () => {
        dispatcher.subscribe('test', ({ reply }, cb) => {
          reply('it works');
          cb(null, 'it works');
        });

        expect(() => dispatcher.dispatch('test')).to.throw(/already handled/);
      });
    });
  });

  it('should throw an error when dispatching an invalid event', () => {
    expect(dispatcher.dispatch).to.throw(/is required/i);
    expect(() => dispatcher.dispatch('')).to.throw(/not allowed to be empty/);
    expect(() => dispatcher.dispatch(Math.random())).to.throw();
    expect(() => dispatcher.dispatch('foo!bar')).to.throw();
  });

  it('should throw an error when calling an unregistered service', () => {
    const onResolve = sinon.spy();
    return dispatcher.dispatch('foo.bar').then(onResolve, (err) => {
      expect(err).to.exist();
      expect(err.message).to.equal('No handlers registered for the foo.bar event.');
    }).then(() => {
      expect(onResolve).to.not.have.been.called();
    });
  });

  it('should call the hooks', () => {
    const before = sinon.spy();
    const after = sinon.spy();

    dispatcher.subscribe('test', () => 'bar');
    dispatcher.onBefore('test', before);
    dispatcher.onAfter('test', after);

    const promise = dispatcher.dispatch('test', 'foo');
    expect(before).to.have.been.calledOnce();
    expect(before).to.have.been.calledWithMatch({ params: 'foo' });
    return promise.then(() => {
      expect(after).to.have.been.calledOnce();
      expect(after).to.have.been.calledWithMatch({ params: 'foo', result: 'bar' });
    });
  });

  it('should handle async / await', () => {
    dispatcher.subscribe('test2', () => 'works');

    dispatcher.subscribe('test1', async ({ dispatch }) => {
      const word = await dispatch('test2');
      return `it ${word}`;
    });

    return dispatcher.dispatch('test1').then((result) => {
      expect(result).to.equal('it works');
    });
  });

  it('should handle async / await errors', () => {
    dispatcher.subscribe('test', () => 'it works');

    dispatcher.subscribe('test', () => {
      throw new Error('not working');
    });

    dispatcher.subscribe('test', ({ next }) => next());

    return dispatcher.dispatch('test').catch((err) => {
      expect(err).to.exist();
      expect(err.message).to.equal('not working');
    });
  });

  it('should call the passed callbacks', () => {
    dispatcher.subscribe('test', (ev, cb) => {
      cb(null, 'it works');
    });

    return dispatcher.dispatch('test').then((result) => {
      expect(result).to.equal('it works');
    });
  });

  it('should call the dispatch callback with the thrown error', () => {
    dispatcher.subscribe('test', () => {
      throw new Error('not working');
    });

    dispatcher.subscribe('test', ({ params, next }) => next(params));

    return dispatcher.dispatch('test', {}, (err) => {
      expect(err).to.exist();
      expect(err.message).to.equal('not working');
    });
  });

  it('should be able to return a valid result using reply', () => {
    dispatcher.subscribe('test', ({ reply }) => reply('it works'));

    return dispatcher.dispatch('test').then((result) => {
      expect(result).to.equal('it works');
    });
  });

  it('should be able to return an error using reply', () => {
    dispatcher.subscribe('test', ({ reply }) => reply(new Error('nope, doesn\'t work!')));

    return dispatcher.dispatch('test').catch((err) => {
      expect(err.message).to.equal('nope, doesn\'t work!');
    });
  });

  it('should lookup namespaces', () => {
    dispatcher.subscribe('namespace.test', () => 'it works');
    dispatcher.subscribe('namespace.test.secondary', () => 'it works again');

    const ns = dispatcher.lookup('namespace');
    const { test } = ns;

    return Promise.all([
      test().then((result) => {
        expect(result).to.equal('it works');
      }),
      ns['test.secondary']().then((result) => {
        expect(result).to.equal('it works again');
      }),
    ]);
  });

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

  it('should send the parameters', () => {
    dispatcher.subscribe('test', ({ params }) => params);

    return dispatcher.dispatch('test', { hello: 'world' }).then((result) => {
      expect(result).to.deep.equal({ hello: 'world' });
    });
  });

  it('should validate the passed in parameters', () => {
    dispatcher.subscribe('test', withSchema(
      ({ params }) => params,
      Joi.object({
        foo: Joi.any().valid('foo'),
      }).required()
    ));

    dispatcher.on('error', (err) => {
      expect(err).to.be.an.instanceof(Error);
    });

    return dispatcher.dispatch('test').catch((err) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err.isJoi).to.be.true();
    });
  });

  it('should take into consideration the default parameters', () => {
    dispatcher.subscribe('test', withDefaultParams(
      ({ params }) => params,
      {
        foo: 'bar',
      },
    ));

    return dispatcher.dispatch('test').then((result) => {
      expect(result).to.deep.equal({
        foo: 'bar',
      });
    });
  });

  it('should be able to subscribe using regular expressions', () => {
    const pattern = /st$/;

    dispatcher.subscribe(/^te/, () => 'works');

    dispatcher.subscribe(pattern, async ({ next }) => `t ${await next()}`);

    dispatcher.subscribe(pattern, async ({ next }) => `i${await next()}`);

    return dispatcher.dispatch('test').then((result) => {
      expect(result).to.equal('it works');
    });
  });

  it('should handle the subscribers using priorities', () => {
    dispatcher.subscribe('test', ({ next, params }) => next(`${params} 4`), 100);

    dispatcher.subscribe('test', ({ next, params }) => next(`${params} 3`));

    dispatcher.subscribe('test', ({ next, params }) => next(`${params} 5`), 5);

    dispatcher.subscribe('test', ({ next, params }) => next(`${params} 2`), 1000);

    dispatcher.subscribe('test', ({ next, params }) => next(`${params} 1`), 10000);

    return dispatcher.dispatch('test', 0).then((result) => {
      expect(result.trim()).to.equal('0 1 2 3 4 5');
    });
  });

  it('should subscribe to a map of handlers', () => {
    const namespace = 'some.random.namespace';

    dispatcher.subscribeMap(`${namespace}.Something`, {
      foo({ dispatch, params = {} }) {
        return dispatch(`${namespace}.Something.bar`, Object.assign({}, params, {
          foo: true,
        }));
      },

      bar({ params = {} }) {
        return Object.assign({}, params, {
          bar: true,
        });
      },
    });

    const Something = dispatcher.lookup(`${namespace}.Something`);

    return Something.foo().then((result) => {
      expect(result).to.deep.equal({
        foo: true,
        bar: true,
      });
    });
  });

  it('should throw an error when subscribing with invalid handler', () => {
    const fn = () => {
      dispatcher.subscribe('test', 'not a function');
    };

    expect(fn).to.throw(/has to be a function/);
  });

  it('should unsubscribe all handlers for a specific event', () => {
    const subscriber1 = sinon.stub();
    const subscriber2 = sinon.stub();
    subscriber1.onCall(0).returns(true);
    subscriber2.onCall(0).returns(true);

    dispatcher.subscribe('test', subscriber1);
    const unsubscriber2 = dispatcher.subscribe(/test/, subscriber2);

    dispatcher.unsubscribe('test');
    unsubscriber2();

    return dispatcher.dispatch('test').then(() => {
      expect(subscriber1).to.not.have.been.called();
      expect(subscriber2).to.not.have.been.called();
    }, (err) => {
      expect(err).to.exist();
      expect(err.message).to.match(/No handlers registered/);
    });
  });

  it('should be able to unsubscribe using the object returned by subscribeMap', () => {
    const unsubscribe = dispatcher.subscribeMap('Something', {
      foo() {
        return 'it works';
      },
    });

    const Something = dispatcher.lookup('Something');

    return Something.foo().then((result) => {
      expect(result).to.equal('it works');
      unsubscribe.foo();

      return Something.foo().catch((err) => {
        expect(err).to.exist();
        expect(err.message).to.match(/No handlers registered/);
      });
    });
  });

  it('dispatch can work with callbacks', (done) => {
    dispatcher.subscribe('test', () => 'it works');

    dispatcher.dispatch('test', {}, (err, result) => {
      expect(err).to.be.null();
      expect(result).to.equal('it works');
      done();
    });
  });

  it('dispatch can handle callback errors', (done) => {
    dispatcher.subscribe('test', () => {
      throw new Error('meh');
    });

    dispatcher.subscribe('test', ({ next }) => next());

    dispatcher.dispatch('test', {}, (err) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.equal('meh');
      done();
    });
  });

  xit('should handle multiple regular expressions quite fast', () => {
    dispatcher.subscribe('test', () => 'it works');
    for (let i = 0; i < 1000; i++) {
      dispatcher.subscribe(/test/, ({ next }) => next());
      dispatcher.subscribe('test', ({ next }) => next());
    }

    dispatcher.dispatch('test').then((result) => {
      expect(result).to.equal('it works');
    });
  });

  it('should convert a function to a handler', () => {
    dispatcher.subscribe('math', withHandler(({ left, right }) => left + right));
    return dispatcher.dispatch('math', { left: 1, right: 2 }).then((result) => {
      expect(result).to.equal(3);
    });
  });

  it('should memoize a handler', () => {
    const stub = sinon.stub().returns('it works');
    dispatcher.subscribe('test', withMemoization(stub));
    return dispatcher.dispatch('test').then(() => (
      dispatcher.dispatch('test').then(() => {
        expect(stub).to.have.been.calledOnce();
      })
    ));
  });

  it('should inject lookups as handler params', () => {
    dispatcher.subscribe('say.hello', ({ params: name }) => `hello ${name}!`);
    const handler = async ({ say }) => {
      const answer = await say.hello('John');
      expect(answer).to.equal('hello John!');
    };
    dispatcher.subscribe('test', withLookups(handler, {
      say: 'say',
    }));

    return dispatcher.dispatch('test');
  });

  it('should bind dispatch calls to a namespace', () => {
    dispatcher.subscribe('say.hello', ({ params: name }) => `hello ${name}!`);
    const handler = async ({ dispatch }) => {
      const answer = await dispatch('hello', 'John');
      expect(answer).to.equal('hello John!');
    };
    dispatcher.subscribe('test', withNamespace(handler, 'say'));

    return dispatcher.dispatch('test');
  });

  it('should reference the parent event', () => {
    dispatcher.subscribe('test', ({ event }) => event.parent.identifier);
    dispatcher.subscribe('another.test', ({ dispatch }) => dispatch('test'));
    return dispatcher.dispatch('another.test').then((result) => {
      expect(result).to.equal('another.test');
    });
  });

  it('log service calls', () => {
    dispatcher.subscribe('test', ({ event }) => event.parent.identifier);
    dispatcher.subscribe('another.test', ({ dispatch }) => dispatch('test'));
    return dispatcher.dispatch('another.test').then(() => {
      expect(logger[0]).to.match(/^- another.test \[\d+(\.\d+)?ms\]$/);
      expect(logger[1]).to.match(/^- - test \[\d+(\.\d+)?ms\]$/);
    });
  });

  it('should handle custom events with meta data', () => {
    dispatcher.subscribe('test', ({ event }) => event);
    return dispatcher.dispatch(new Event('test', null, { it: 'works' })).then((result) => {
      expect(result.uid).to.exist();
      expect(result.meta.it).to.equal('works');
    });
  });
});
