import { Message } from '../src';

describe('Message', () => {
  it('creates a message', () => {
    const msg = new Message({ topic: 'it.works' });
    expect(msg.timestamp).toBeDefined();
    expect(msg.id).toBeDefined();
    expect(msg.topic).toBe('it.works');
  });

  it('can\'t be instantiated without a topic', () => {
    try {
      new Message(); // eslint-disable-line
    } catch (err) {
      expect(err.name).toBe('ValidationError');
      expect(err.details[0].message).toBe('"topic" is required');
    }
  });

  it('fork creates a child message', () => {
    const parent = new Message({ topic: 'it.works' });
    const child = parent.fork();
    expect(child.topic).toBe(parent.topic);
    expect(child.parentId).toBe(parent.id);
    expect(child.timestamp).toBeGreaterThanOrEqual(parent.timestamp);
  });
});
