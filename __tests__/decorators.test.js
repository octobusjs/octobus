import Octobus, { decorators } from '../src';
const {
  withDefaultParams,
  withSchema,
  withHandler,
  withMemoization,
  withLookups,
  withNamespace,
} = decorators;
import Joi from 'joi';

describe('Octobus', () => {
  let dispatcher;

  beforeEach(() => {
    dispatcher = new Octobus();
  });

  it('should validate the passed in parameters', () => {
    dispatcher.subscribe('test', withSchema(
      ({ params }) => params,
      Joi.object({
        foo: Joi.any().valid('foo'),
      }).required()
    ));

    dispatcher.on('error', (err) => {
      expect(err instanceof Error).toBeTruthy();
    });

    return dispatcher.dispatch('test').catch((err) => {
      expect(err instanceof Error).toBeTruthy();
      expect(err.isJoi).toBeTruthy();
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
      expect(result).toEqual({
        foo: 'bar',
      });
    });
  });

  it('should convert a function to a handler', () => {
    dispatcher.subscribe('math', withHandler(({ left, right }) => left + right));
    return dispatcher.dispatch('math', { left: 1, right: 2 }).then((result) => {
      expect(result).toBe(3);
    });
  });

  it('should memoize a handler', () => {
    const stub = jest.fn(() => 'it works');
    dispatcher.subscribe('test', withMemoization(stub));
    return dispatcher.dispatch('test').then(() => (
      dispatcher.dispatch('test').then(() => {
        expect(stub.mock.calls.length).toBe(1);
      })
    ));
  });

  it('should inject lookups as handler params', () => {
    dispatcher.subscribe('say.hello', ({ params: name }) => `hello ${name}!`);
    const handler = async ({ say }) => {
      const answer = await say.hello('John');
      expect(answer).toBe('hello John!');
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
      expect(answer).toBe('hello John!');
    };
    dispatcher.subscribe('test', withNamespace(handler, 'say'));

    return dispatcher.dispatch('test');
  });
});
