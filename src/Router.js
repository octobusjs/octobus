import Joi from 'joi';

class Router {
  constructor() {
    this.routes = [];
  }

  addRoute = (route) => {
    const { pattern, to } = Joi.attempt({
      to: (message) => message.toJSON(),
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

  matches(message) {
    return this.routes.find(({ pattern }) => this.test(pattern, message.topic));
  }

  transform(message) {
    const route = this.routes.find(({ pattern }) => this.test(pattern, message.topic));

    if (!route) {
      throw new Error(`No matching route for ${JSON.stringify(message.toJSON())}!`);
    }

    if (typeof route.to === 'string') {
      return Object.assign(message, {
        topic: route.to,
      });
    }

    return message.clone(route.to(message));
  }
}

export default Router;
