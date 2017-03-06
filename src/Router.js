import Joi from 'joi';
import identity from 'lodash/identity';

class Router {
  constructor() {
    this.routes = [];
  }

  addRoute = (route) => {
    const { pattern, to } = Joi.attempt({
      to: identity,
      ...route,
    }, {
      pattern: Joi.alternatives().try([
        Joi.string(), // User.create
        Joi.object().type(RegExp), // ^User\.
      ]).required(),
      to: Joi.alternatives().try([
        Joi.string(), // user.User.create
        Joi.func(),
      ]),
    });

    this.routes.push({ pattern, to });

    return this;
  }

  addRoutes(routes) {
    routes.forEach(this.addRoute);
  }

  test(pattern, path) {
    if (typeof pattern === 'string') {
      return pattern === path;
    }

    return pattern.test(path);
  }

  transform(transformer, path) {
    if (typeof transformer === 'string') {
      return transformer;
    }

    return transformer(path);
  }

  route(path) {
    const route = this.routes.find(({ pattern }) => this.test(pattern, path));

    if (!route) {
      return false;
    }

    return this.transform(route.to, path);
  }
}

export default Router;
