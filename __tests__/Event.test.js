import { Event } from '../src';

describe('Event', () => {
  it('should allow creating valid events', () => {
    expect(() => new Event('test')).not.toThrow();
    expect(() => new Event('it.works')).not.toThrow();
    expect(() => new Event('namespace1.test2')).not.toThrow();
  });

  it('shouldn\'t allow creating events with reserved identifiers', () => {
    expect(() => new Event('error')).toThrow();
    expect(() => new Event('subscribe')).toThrow();
    expect(() => new Event('unsubscribe')).toThrow();
  });

  it('shouldn\'t allow creating events with invalid identifiers', () => {
    expect(() => new Event('test!')).toThrow();
    expect(() => new Event('it..works')).toThrow();
    expect(() => new Event('it-works')).toThrow();
  });

  it('should get assigned a unique id', () => {
    const ev = new Event('test');
    expect(ev.uid).toBeDefined();
  });

  it('toString should return the identifier', () => {
    const ev = new Event('my.event');
    expect(ev.toString()).toBe('my.event');
  });

  it('should allow cloning an event', () => {
    const ev = new Event('my.event', 'some parent', { meta: 'data' });
    ev.selfCalls.push('something');
    const clone = ev.clone();
    expect(clone instanceof Event).toBeTruthy();
    expect(clone.uid).toBeDefined();
    expect(clone.uid).not.toBe(ev.uid);
    expect(clone.meta).toBe(ev.meta);
    expect(clone.parent).toBe(ev.parent);
  });

  it('should extend meta when creating an event from another one', () => {
    const ev = Event.from(
      new Event('my.event', 'parent1', {
        meta: 'data',
      }),
      'parent2',
      {
        more: true,
      }
    );

    expect(ev instanceof Event).toBeTruthy();
    expect(ev.parent).toBe('parent2');
    expect(ev.meta).toEqual({
      meta: 'data',
      more: true,
    });
  });
});
