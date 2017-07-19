import Joi from 'joi';
import Transport from '../transports/Base';
import Router from './Router';

class TransportRouter extends Router {
  addRoute(route) {
    return super.addRoute(
      Joi.attempt(
        route,
        Joi.object()
          .keys({
            transport: Joi.object().type(Transport),
          })
          .unknown()
      )
    );
  }
}

export default TransportRouter;
