import { OctobusWithLogger } from '../src';

describe('Octobus', () => {
  let dispatcher;
  const logger = [];

  beforeEach(() => {
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
});
