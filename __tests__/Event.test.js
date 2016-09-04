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
});
