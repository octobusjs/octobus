import { MessageBus, Message } from '../src';

describe('Octobus', () => {
  let messageBus;

  beforeEach(() => {
    messageBus = new MessageBus();
  });

  it('can send a message', () => {
    const msg = new Message({ topic: 'it works' });
    messageBus.onMessage((data) => {
      expect(data.id).toBe(msg.id);
      expect(data.topic).toBe('it works');
    });
    messageBus.send(msg);
  });
});
