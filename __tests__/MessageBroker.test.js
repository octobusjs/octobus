import { Message, MessageBroker, Handler, MessageTransport } from '../src';

describe('Octobus', () => {
  let transport;
  let broker;

  beforeEach(() => {
    transport = new MessageTransport();
    broker = new MessageBroker(transport);
  });

  describe('returning a result', () => {
    it('using an arrow function', async () => {
      const msg = new Message({ topic: 'say.hello' });

      broker.subscribe('say.hello', new Handler(
        () => 'Hello, world!',
      ));

      const result = await broker.send(msg);
      expect(result).toBe('Hello, world!');
    });

    it('using reply', async () => {
      const msg = new Message({ topic: 'say.hello' });

      broker.subscribe('say.hello', new Handler(
        ({ reply }) => {
          reply('Hello, world!');
        },
      ));

      const result = await broker.send(msg);
      expect(result).toBe('Hello, world!');
    });

    it('using async / await', async () => {
      const msg = new Message({ topic: 'say.hello' });

      broker.subscribe('say.hello', new Handler(
        async () => 'Hello, world!'
      ));

      const result = await broker.send(msg);
      expect(result).toBe('Hello, world!');
    });
  });

  describe('throwing errors', () => {
    it('when calling an unregistered service', () => {
      const msg = new Message({ topic: 'say.hello' });
      const onResolve = jest.fn();

      return broker.send(msg).then(onResolve, (err) => {
        expect(err).toBeDefined();
        expect(err.message).toBe('No subscribers registered for the say.hello topic.');
      }).then(() => {
        expect(onResolve).not.toBeCalled();
      });
    });

    it('using reply in handlers', async () => {
      const msg = new Message({ topic: 'say.hello' });

      broker.subscribe('say.hello', new Handler(
        ({ reply }) => reply(new Error('not working')),
      ));

      try {
        await broker.send(msg);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('not working');
      }
    });

    it('using throw in handlers', async () => {
      const msg = new Message({ topic: 'say.hello' });

      broker.subscribe('say.hello', new Handler(
        () => {
          throw new Error('not working');
        },
      ));

      try {
        await broker.send(msg);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('not working');
      }
    });

    it('using promises in handlers', async () => {
      const msg = new Message({ topic: 'say.hello' });

      broker.subscribe('say.hello', new Handler(
        () => Promise.reject(new Error('not working')),
      ));

      try {
        await broker.send(msg);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('not working');
      }
    });

    it('when handling a result twice', async () => {
      const msg = new Message({ topic: 'say.hello' });

      broker.subscribe('say.hello', new Handler(
        ({ reply }) => {
          reply('hello!');
          return 'hello!';
        },
      ));

      try {
        await broker.send(msg);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('The result was already handled!');
      }
    });
  });

  describe('handlers', () => {
    it('should receive the options', () => {
      const msg = new Message({ topic: 'test', acknowledge: false });

      broker.subscribe('test', new Handler(
        (params) => {
          expect(params.message).toBeDefined();
          expect(params.message instanceof Message).toBeTruthy();
          expect(typeof params.send).toBe('function');
          expect(typeof params.lookup).toBe('function');
          expect(typeof params.hasOwnProperty('next')).toBeTruthy();
          expect(typeof params.reply).toBe('function');
        },
      ));

      return broker.send(msg);
    });

    it('should receive the parameters', () => {
      const msg = new Message({ topic: 'test', data: { hello: 'world' } });

      broker.subscribe('test', new Handler(
        (params) => {
          expect(params.message.data).toEqual({ hello: 'world' });
          params.reply();
        },
      ));

      return broker.send(msg);
    });

    describe('next parameter', () => {
      it('next should be empty when there are no previously registered handlers', () => {
        const msg = new Message({ topic: 'test', data: { hello: 'world' }, acknowledge: false });

        broker.subscribe('test', new Handler(
          async ({ next }) => {
            expect(next).toBeUndefined();
          }
        ));

        return broker.send(msg);
      });

      // it('should call the previously registered handler', () => {
      //   dispatcher.subscribe('test', () => 'it works');
      //   dispatcher.subscribe('test', async ({ next }) => {
      //     expect(next).toBeDefined();
      //     try {
      //       const result = await next();
      //       expect(result).toBe('it works');
      //     } catch (err) {
      //       expect(err).toBeUndefined();
      //     }
      //   });
      //
      //   return dispatcher.dispatch('test');
      // });
    });
  });

  // describe('handling events', () => {
  //   it('should throw an error when dispatching an invalid event', () => {
  //     expect(dispatcher.dispatch).toThrowError(/is required/i);
  //     expect(() => dispatcher.dispatch('')).toThrowError(/not allowed to be empty/);
  //     expect(() => dispatcher.dispatch(Math.random())).toThrow();
  //     expect(() => dispatcher.dispatch('foo!bar')).toThrow();
  //   });
  //
  //   it('should reference the parent event', () => {
  //     dispatcher.subscribe('test', async ({ event }) => {
  //       expect(event.parent.identifier).toBe('another.test');
  //     });
  //
  //     dispatcher.subscribe('another.test', ({ dispatch }) => dispatch('test'));
  //
  //     return dispatcher.dispatch('another.test');
  //   });
  //
  //   it('should have a uid', () => {
  //     dispatcher.subscribe('test', async ({ event }) => {
  //       expect(event.uid).toBeDefined();
  //     });
  //
  //     return dispatcher.dispatch('test');
  //   });
  //
  //   it('should handle custom events with meta data', () => {
  //     dispatcher.subscribe('test', ({ event }) => event);
  //     return dispatcher.dispatch(new Event('test', null, { it: 'works' })).then((result) => {
  //       expect(result.meta.it).toBe('works');
  //     });
  //   });
  // });
  //
  // describe('before / after dispatch hooks', () => {
  //   it('should call the hooks when returning a valid result', () => {
  //     const before = jest.fn();
  //     const after = jest.fn();
  //
  //     dispatcher.subscribe('test', () => 'bar');
  //     dispatcher.onBefore('test', before);
  //     dispatcher.onAfter('test', after);
  //
  //     const promise = dispatcher.dispatch('test', 'foo');
  //     expect(before.mock.calls.length).toBe(1);
  //     expect(before.mock.calls[0][0].params).toBe('foo');
  //     return promise.then(() => {
  //       expect(after.mock.calls.length).toBe(1);
  //       expect(after.mock.calls[0][0].params).toBe('foo');
  //       expect(after.mock.calls[0][0].result).toBe('bar');
  //     });
  //   });
  //
  //   it('should call the hooks when throw an error', async () => {
  //     const before = jest.fn();
  //     const after = jest.fn();
  //
  //     dispatcher.subscribe('test', () => {
  //       throw new Error('not working');
  //     });
  //
  //     dispatcher.onBefore('test', before);
  //     dispatcher.onAfter('test', after);
  //
  //     try {
  //       await dispatcher.dispatch('test', 'foo');
  //     } catch (err) {
  //       expect(err).toBeDefined();
  //       expect(before.mock.calls.length).toBe(1);
  //       expect(before.mock.calls[0][0].params).toBe('foo');
  //       expect(after.mock.calls.length).toBe(1);
  //       expect(after.mock.calls[0][0].params).toBe('foo');
  //       expect(after.mock.calls[0][0].result).toBeUndefined();
  //       expect(after.mock.calls[0][0].error).toBeDefined();
  //       expect(after.mock.calls[0][0].error.message).toBe('not working');
  //     }
  //   });
  // });
  //
  // describe('lookup', () => {
  //   it('should lookup namespaces', () => {
  //     dispatcher.subscribe('namespace.test', () => 'it works');
  //     dispatcher.subscribe('namespace.test.secondary', () => 'it works again');
  //
  //     const ns = dispatcher.lookup('namespace');
  //     const { test } = ns;
  //
  //     return Promise.all([
  //       test().then((result) => {
  //         expect(result).toBe('it works');
  //       }),
  //       ns['test.secondary']().then((result) => {
  //         expect(result).toBe('it works again');
  //       }),
  //     ]);
  //   });
  // });
  //
  // describe('regular expressions support', () => {
  //   it('should be able to subscribe using regular expressions', () => {
  //     const pattern = /st$/;
  //
  //     dispatcher.subscribe(/^te/, () => 'works');
  //
  //     dispatcher.subscribe(pattern, async ({ next }) => `t ${await next()}`);
  //
  //     dispatcher.subscribe(pattern, async ({ next }) => `i${await next()}`);
  //
  //     return dispatcher.dispatch('test').then((result) => {
  //       expect(result).toBe('it works');
  //     });
  //   });
  // });
  //
  // describe('priorities', () => {
  //   it('should handle the subscribers using priorities', () => {
  //     dispatcher.subscribe('test', ({ next, params }) => next(`${params} 4`), 100);
  //
  //     dispatcher.subscribe('test', ({ next, params }) => next(`${params} 3`), 101);
  //
  //     dispatcher.subscribe('test',
  //       ({ next, params }) => (next ? next(`${params} 5`) : `${params} 5`), 5
  //     );
  //
  //     dispatcher.subscribe('test', ({ next, params }) => next(`${params} 2`), 1000);
  //
  //     dispatcher.subscribe('test', ({ next, params }) => next(`${params} 1`), 10000);
  //
  //     return dispatcher.dispatch('test', 0).then((result) => {
  //       expect(result.trim()).toBe('0 1 2 3 4 5');
  //     });
  //   });
  // });
  //
  // describe('subscribeTree', () => {
  //   it('should subscribe to a tree of handlers', () => {
  //     const namespace = 'some';
  //
  //     dispatcher.subscribeTree(namespace, {
  //       random: {
  //         namespace: {
  //           foo({ dispatch, params = {} }) {
  //             return dispatch(`${namespace}.random.namespace.bar`, {
  //               ...params,
  //               foo: true,
  //             });
  //           },
  //
  //           bar({ params = {} }) {
  //             return {
  //               ...params,
  //               bar: true,
  //             };
  //           },
  //         },
  //       },
  //     });
  //
  //     const Something = dispatcher.lookup(`${namespace}.random.namespace`);
  //
  //     return Something.foo().then((result) => {
  //       expect(result).toEqual({
  //         foo: true,
  //         bar: true,
  //       });
  //     });
  //   });
  // });
  //
  // describe('unsubscribing', () => {
  //   it('should unsubscribe all handlers of a specific event', () => {
  //     const subscriber1 = jest.fn(() => true);
  //     const subscriber2 = jest.fn(() => true);
  //
  //     dispatcher.subscribe('test', subscriber1);
  //     const unsubscriber2 = dispatcher.subscribe(/test/, subscriber2);
  //
  //     dispatcher.unsubscribe('test');
  //     unsubscriber2();
  //
  //     return dispatcher.dispatch('test').then(() => {
  //       expect(subscriber1).not.toBeCalled();
  //       expect(subscriber2).not.toBeCalled();
  //     }, (err) => {
  //       expect(err).toBeDefined();
  //       expect(err.message).toMatch(/No handlers registered/);
  //     });
  //   });
  //
  //   it('should unsubscribe a single handler', () => {
  //     const subscriber1 = jest.fn(({ next }) => (next ? next() : false));
  //     const subscriber2 = jest.fn(({ next }) => (next ? next() : false));
  //
  //     dispatcher.subscribe('test', subscriber1);
  //     dispatcher.subscribe('test', subscriber2);
  //
  //     dispatcher.unsubscribe('test', subscriber1);
  //
  //     return dispatcher.dispatch('test').then(() => {
  //       expect(subscriber1).not.toBeCalled();
  //       expect(subscriber2).toBeCalled();
  //     });
  //   });
  //
  //   it('should return false when unsubscribing nonexistent event', () => {
  //     expect(dispatcher.unsubscribe('test')).toBeFalsy();
  //   });
  //
  //   it('should unsubscribe a regex', () => {
  //     dispatcher.subscribe(/^test$/, () => 'it works');
  //     return dispatcher.dispatch('test').then((result) => {
  //       expect(result).toBe('it works');
  //
  //       dispatcher.unsubscribe(/^test$/);
  //
  //       return dispatcher.dispatch('test').catch((err) => {
  //         expect(err instanceof Error).toBeTruthy();
  //         expect(err.message).toMatch(/No handlers/);
  //       });
  //     });
  //   });
  // });
  //
  // xit('stress test', () => {
  //   for (let i = 0; i < 1000; i++) {
  //     dispatcher.subscribe(`test${i}`, ({ dispatch }) => dispatch(`test${i + 1}`));
  //   }
  //   dispatcher.subscribe('test1000', () => 'it works');
  //
  //   return dispatcher.dispatch('test0').then((result) => {
  //     expect(result).toBe('it works');
  //   });
  // });
  //
  // describe('publish', () => {
  //   it('should publish to multiple subscribers at the same time', () => {
  //     const handler1 = jest.fn(({ params }) => `${params} - handler1`);
  //     const handler2 = jest.fn(({ params }) => `${params} - handler2`);
  //     dispatcher.subscribe('test', handler1);
  //     dispatcher.subscribe('test', handler2);
  //
  //     return dispatcher.publish('test', 'it works').then((result) => {
  //       expect(result[0]).toBe('it works - handler2');
  //       expect(result[1]).toBe('it works - handler1');
  //       expect(handler1.mock.calls.length).toBe(1);
  //       expect(handler2.mock.calls.length).toBe(1);
  //     });
  //   });
  // });
});
