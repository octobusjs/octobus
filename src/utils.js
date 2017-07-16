import flow from 'lodash/flow';

export const compose = (...decorators) => flow(decorators.reverse());
export const applyDecorators = (decorators, handler) => compose(decorators)(handler);
