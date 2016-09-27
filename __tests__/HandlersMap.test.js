import HandlersMap from '../src/HandlersMap';

describe('HandlersMap', () => {
  it('should delete an existing handler', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const map = new HandlersMap();
    map.set('test', { handler: handler1 });
    map.set('test', { handler: handler2 });
    map.delete('test', handler1);
    expect(map.get('test').length).toBe(1);
  });

  it('should ignore deletion of a non-existing handler', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const handler3 = jest.fn();
    const map = new HandlersMap();
    map.set('test', { handler: handler1 });
    map.set('test', { handler: handler2 });
    map.delete('test', handler3);
    expect(map.get('test').length).toBe(2);
  });
});
