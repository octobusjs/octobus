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
import { applyDecorators } from '../src/utils';

describe('Octobus', () => {
  let dispatcher;

  beforeEach(() => {
    dispatcher = new Octobus();
  });

  it('should fail when the params are invalid', () => {
    dispatcher.subscribe('test', withSchema(
      Joi.object({
        foo: Joi.any().valid('foo'),
      }).required()
    )(({ params }) => params));

    dispatcher.on('error', (err) => {
      expect(err instanceof Error).toBeTruthy();
    });

    return dispatcher.dispatch('test').catch((err) => {
      expect(err instanceof Error).toBeTruthy();
      expect(err.isJoi).toBeTruthy();
    });
  });

  it('should pass when the params are valid', () => {
    dispatcher.subscribe('test', withSchema(
      Joi.object({
        foo: Joi.any().valid('foo'),
      }).required()
    )(({ params }) => params));

    return dispatcher.dispatch('test', { foo: 'foo' }).then((result) => {
      expect(result).toEqual({ foo: 'foo' });
    });
  });

  it('should use the default parameters', () => {
    dispatcher.subscribe('test', withDefaultParams(
      {
        foo: 'bar',
      }
    )(({ params }) => params));

    return dispatcher.dispatch('test').then((result) => {
      expect(result).toEqual({
        foo: 'bar',
      });
    });
  });

  it('should use the actual parameters', () => {
    dispatcher.subscribe('test', withDefaultParams(false)(({ params }) => params));

    return dispatcher.dispatch('test', true).then((result) => {
      expect(result).toBeTruthy();
    });
  });

  it('should merge the default parameters', () => {
    dispatcher.subscribe('test', withDefaultParams(
      {
        foo: 'bar',
      }
    )(({ params }) => params));

    return dispatcher.dispatch('test', { bar: 'baz' }).then((result) => {
      expect(result).toEqual({
        foo: 'bar',
        bar: 'baz',
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
    dispatcher.subscribe('test', withLookups({
      say: 'say',
    })(handler));

    return dispatcher.dispatch('test');
  });

  it('should bind dispatch calls to a namespace', () => {
    dispatcher.subscribe('say.hello', ({ params: name }) => `hello ${name}!`);
    dispatcher.subscribe('say', ({ params: something }) => something);
    const handler = async ({ dispatch }) => {
      const answer = await dispatch('hello', 'John');
      const something = await dispatch(null, 'it works');
      expect(answer).toBe('hello John!');
      expect(something).toBe('it works');
    };
    dispatcher.subscribe('test', withNamespace('say')(handler));

    return dispatcher.dispatch('test');
  });

  it('should be composable', () => {
    const handler = applyDecorators([
      withDefaultParams({ name: 'Victor' }),
      withHandler,
    ], ({ name }) => `hello ${name}!`);

    dispatcher.subscribe('say.hello', handler);
    return dispatcher.dispatch('say.hello').then((result) => {
      expect(result).toBe('hello Victor!');
    });
  });
});
