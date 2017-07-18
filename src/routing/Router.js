import Joi from 'joi';

class Router {
  constructor(routes = []) {
    this.routes = [];
    this.addRoutes(routes);
  }

  addRoute(rawRoute) {
    const route = Joi.attempt(
      rawRoute,
      Joi.object()
        .keys({
          matcher: Joi.object().type(RegExp),
        })
        .unknown()
    );

    this.routes.unshift(route);

    return this;
  }

  addRoutes(routes) {
    routes.forEach(this.addRoute.bind(this));
  }

  getRoutes() {
    return this.routes;
  }

  findRoute(message) {
    if (this.routes.length === 1) {
      return this.routes[0];
    }

    return this.routes.find(({ matcher }) => matcher.test(message.topic));
  }
}

export default Router;
