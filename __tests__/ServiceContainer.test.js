import { ServiceBus, MessageBus, ServiceContainer, decorators } from '../src';

const { service } = decorators;

class Test extends ServiceContainer {
  @service()
  sayHello(name) {
    return `Hello, ${name}!`;
  }
}

describe('ServiceContainer', () => {
  let messageBus;
  let serviceBus;
  let testService;

  beforeEach(() => {
    messageBus = new MessageBus();
    serviceBus = new ServiceBus();
    serviceBus.connect(messageBus);
    testService = serviceBus.register(new Test());
  });

  describe('something', () => {
    it('should work', async () => {
      expect(await testService.sayHello('John')).toBe('Hello, John!');
      expect(await serviceBus.send('Test.sayHello', 'John')).toBe('Hello, John!');
    });
  });
});
