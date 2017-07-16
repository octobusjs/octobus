import flow from 'lodash/flow';

export const applyDecorators = (decorators, handler) => flow(decorators.reverse())(handler);
export const compose = (...decorators) => flow(decorators.reverse());
