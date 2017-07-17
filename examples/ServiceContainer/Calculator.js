import Joi from 'joi';
import { ServiceContainer, decorators } from '../../src';

const { service, withSchema } = decorators;

class Calculator extends ServiceContainer {
  @service()
  @withSchema({
    cost: Joi.number().integer().positive().required(),
    impressions: Joi.number().integer().min(0).required()
  })
  cpm({ cost, impressions }) {
    if (impressions === 0) {
      return 0;
    }

    return cost / impressions * 1000;
  }

  @service()
  @withSchema({
    cpm: Joi.number().integer().min(0).required(),
    impressions: Joi.number().integer().min(0).required()
  })
  cost({ impressions, cpm }) {
    return cpm * impressions / 1000;
  }

  @service()
  @withSchema({
    cpm: Joi.number().integer().min(0).required(),
    cost: Joi.number().integer().min(0).required()
  })
  impressions({ cost, cpm }) {
    if (cpm === 0) {
      return 0;
    }

    return cost / cpm * 1000;
  }
}

export default Calculator;
