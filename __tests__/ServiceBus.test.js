import { Message, ServiceBus, Handler, MessageBus } from '../src';

describe('Octobus', () => {
  let messageBus;
  let serviceBus;

  beforeEach(() => {
    messageBus = new MessageBus();
    serviceBus = new ServiceBus();
    serviceBus.connect(messageBus);
  });

  describe('returning a result', () => {
    it('using an arrow function', async () => {
      serviceBus.subscribe('say.hello', () => 'Hello, world!');

      const result = await serviceBus.send('say.hello');
      expect(result).toBe('Hello, world!');
    });

    it('using reply', async () => {
      const msg = new Message({ topic: 'say.hello' });

      serviceBus.subscribe('say.hello', new Handler(
        ({ reply }) => {
          reply('Hello, world!');
        },
      ));

      const result = await serviceBus.send(msg);
      expect(result).toBe('Hello, world!');
    });

    it('using async / await', async () => {
      const msg = new Message({ topic: 'say.hello' });

      serviceBus.subscribe('say.hello', new Handler(
        async () => 'Hello, world!'
      ));

      const result = await serviceBus.send(msg);
      expect(result).toBe('Hello, world!');
    });
  });

  describe('throwing errors', () => {
    it('when calling an unregistered service', () => {
      const msg = new Message({ topic: 'say.hello' });

      try {
        serviceBus.send(msg);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('Can\'t handle "say.hello" topic!');
      }
    });

    it('using reply in handlers', async () => {
      const msg = new Message({ topic: 'say.hello' });

      serviceBus.subscribe('say.hello', new Handler(
        ({ reply }) => reply(new Error('not working')),
      ));

      try {
        await serviceBus.send(msg);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('not working');
      }
    });

    it('using throw in handlers', async () => {
      const msg = new Message({ topic: 'say.hello' });

      serviceBus.subscribe('say.hello', new Handler(
        () => {
          throw new Error('not working');
        },
      ));

      try {
        await serviceBus.send(msg);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('not working');
      }
    });

    it('using promises in handlers', async () => {
      const msg = new Message({ topic: 'say.hello' });

      serviceBus.subscribe('say.hello', new Handler(
        () => Promise.reject(new Error('not working')),
      ));

      try {
        await serviceBus.send(msg);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('not working');
      }
    });

    it('when handling a result twice', async () => {
      const msg = new Message({ topic: 'say.hello' });

      serviceBus.subscribe('say.hello', new Handler(
        ({ reply }) => {
          reply('hello!');
          return 'hello!';
        },
      ));

      try {
        await serviceBus.send(msg);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toBe('The result was already handled!');
      }
    });
  });

  describe('handlers', () => {
    it('should receive the options', () => {
      const msg = new Message({ topic: 'test', acknowledge: false });

      serviceBus.subscribe('test', new Handler(
        (params) => {
          expect(params.message).toBeDefined();
          expect(params.message instanceof Message).toBeTruthy();
          expect(typeof params.send).toBe('function');
          expect(typeof params.extract).toBe('function');
          expect(typeof params.hasOwnProperty('next')).toBeTruthy();
          expect(typeof params.reply).toBe('function');
        },
      ));

      return serviceBus.send(msg);
    });

    it('should receive the parameters', () => {
      const msg = new Message({ topic: 'test', data: { hello: 'world' } });

      serviceBus.subscribe('test', new Handler(
        (params) => {
          expect(params.message.data).toEqual({ hello: 'world' });
          params.reply();
        },
      ));

      return serviceBus.send(msg);
    });

    describe('next parameter', () => {
      it('next should be empty when there are no previously registered handlers', () => {
        const msg = new Message({ topic: 'test', data: { hello: 'world' }, acknowledge: false });

        serviceBus.subscribe('test', new Handler(
          async ({ next }) => {
            expect(next).toBeUndefined();
          }
        ));

        return serviceBus.send(msg);
      });

      it('should call the previously registered handler', async () => {
        const msg = new Message({ topic: 'hello', data: { name: 'John' } });

        serviceBus.subscribe('hello', new Handler(
          async ({ reply, message }) => reply(`*${message.data.msg}`),
        ));

        serviceBus.subscribe('hello', new Handler(
          async ({ message, next }) => next({ msg: `${message.data}!` }),
        ));

        serviceBus.subscribe('hello', new Handler(
          async ({ next, message }) => next(`Hello, ${message.data.name}`),
        ));

        const result = await serviceBus.send(msg);
        expect(result).toBe('*Hello, John!');
      });
    });
  });


  describe('extract', () => {
    it('should extract namespaces', () => {
      serviceBus.subscribe('ns.test1', new Handler(() => 'works1'));
      serviceBus.subscribe('ns.test2', new Handler(() => 'works2'));

      const ns = serviceBus.extract('ns');

      return Promise.all([
        ns.test1().then((result) => {
          expect(result).toBe('works1');
        }),
        ns.test2().then((result) => {
          expect(result).toBe('works2');
        }),
      ]);
    });
  });

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
});
