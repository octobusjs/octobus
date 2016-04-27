import Joi from 'joi';
import { expect } from 'chai';
import sinon from 'sinon';
import createEventDispatcher from '../createEventDispatcher';

describe('eventDispatcher', () => {
  let dispatcher;

  beforeEach((done) => {
    dispatcher = createEventDispatcher();
    done();
  });

  it('it returns the result', () => {
    dispatcher.subscribe('test', () => 'it works');

    return dispatcher.dispatch('test').then((result) => {
      expect(result).to.equal('it works');
    });
  });

  it('it calls the hooks', () => {
    const before = sinon.spy();
    const after = sinon.spy();

    dispatcher.before('test', before);
    dispatcher.after('test', after);

    const promise = dispatcher.dispatch('test');
    expect(before.called).to.be.true();
    return promise.then(() => {
      expect(after.called).to.be.true();
    });
  });

  it('plays well with async / await', () => {
    dispatcher.subscribe('test2', () => 'works');

    dispatcher.subscribe('test1', async ({ dispatch }) => {
      const word = await dispatch('test2');
      return `it ${word}`;
    });

    return dispatcher.dispatch('test1').then((result) => {
      expect(result).to.equal('it works');
    });
  });

  it('can handle callbacks', () => {
    dispatcher.subscribe('test', (ev, cb) => {
      cb(null, 'it works');
    });

    return dispatcher.dispatch('test').then((result) => {
      expect(result).to.equal('it works');
    });
  });

  it('looks up namespaced function', () => {
    dispatcher.subscribe('namespace.test', () => 'it works');

    const { test } = dispatcher.lookup('namespace');

    return test().then((result) => {
      expect(result).to.equal('it works');
    });
  });

  it('can handle errors', () => {
    dispatcher.subscribe('test', (ev, cb) => {
      cb(new Error('it doesn\'t work!'), 'it works');
    });

    dispatcher.on('error', (err) => {
      expect(err).to.be.an.instanceof(Error);
    });

    return dispatcher.dispatch('test').then(() => {
    }, (err) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.equal('it doesn\'t work!');
    });
  });

  it('will send the parameters', () => {
    dispatcher.subscribe('test', ({ params }) => params);

    return dispatcher.dispatch('test', { hello: 'world' }).then((result) => {
      expect(result).to.deep.equal({ hello: 'world' });
    });
  });

  it('can validate the parameters', () => {
    dispatcher.subscribe('test', ({ params }) => params, {
      schema: Joi.object({
        foo: Joi.any().valid('foo')
      }).required()
    });

    dispatcher.on('error', (err) => {
      expect(err).to.be.an.instanceof(Error);
    });

    return dispatcher.dispatch('test').catch((err) => {
      expect(err).to.be.an.instanceof(Error);
      expect(err.isJoi).to.be.true();
    });
  });

  it('can have default parameters', () => {
    dispatcher.subscribe('test', ({ params }) => params, {
      defaultParams: {
        foo: 'bar'
      }
    });

    return dispatcher.dispatch('test').then((result) => {
      expect(result).to.deep.equal({
        foo: 'bar'
      });
    });
  });

  it('can subscribe using regular expressions', () => {
    dispatcher.subscribe(/^te/, ({ next, params }) => next(`${params} works`));

    dispatcher.subscribe(/st$/, ({ next }) => next('it'));

    return dispatcher.dispatch('test').then((result) => {
      expect(result).to.equal('it works');
    });
  });

  it('can subscribe using regular expressions with higher precendence than plain strings', () => {
    dispatcher.subscribe(/^test$/, ({ params, next }) => next(`${params || ''} first`));
    dispatcher.subscribe('test', ({ params, next }) => next(`${params || ''} second`));

    return dispatcher.dispatch('test').then((result) => {
      expect(result.trim()).to.equal('first second');
    });
  });
});
