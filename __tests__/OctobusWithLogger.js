import { OctobusWithLogger } from '../src';

describe('Octobus', () => {
  let dispatcher;
  let logger;

  beforeEach(() => {
    logger = [];
    dispatcher = new OctobusWithLogger({
      log(msg) {
        logger.push(msg);
      },
    });
  });

  it('log service calls', () => {
    dispatcher.subscribe('another.test', ({ next }) => next({ first: 1 }), 1000);
    dispatcher.subscribe('test', ({ event }) => event.parent.identifier);
    dispatcher.subscribe('another.test', ({ next }) => next(), 9);
    dispatcher.subscribe('another.test',
      ({ dispatch, params }) => dispatch('test', { ...params, third: 3 }), 10
    );
    dispatcher.subscribe('another.test', ({ next, params }) => next({ ...params, second: 2 }), 100);

    return dispatcher.dispatch('another.test', {}).then(() => {
      expect(logger[0]).toMatch(/^- another.test\(3\) \[\d+(\.\d+)?ms\]$/);
      expect(logger[4]).toMatch(/^- - test\(1\) \[\d+(\.\d+)?ms\]$/);
    });
  });

  it('should publish to multiple subscribers at the same time', () => {
    const handler1 = jest.fn(({ params }) => `${params} - handler1`);
    const handler2 = jest.fn(({ params }) => `${params} - handler2`);
    dispatcher.subscribe('test', handler1);
    dispatcher.subscribe('test', handler2);

    return dispatcher.publish('test', 'it works').then(() => {
      expect(logger.length).toBe(3);
      expect(logger[0]).toMatch(/^- test\(2\) \[\d+(\.\d+)?ms\]$/);
    });
  });
});
