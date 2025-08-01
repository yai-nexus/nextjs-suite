import { HttpMethod, RouteHandler } from '../core/types.js';
import { PluginRegistry } from '../core/registry.js';

export interface RouteDecoratorOptions {
  middleware?: string[];
  rateLimit?: {
    windowMs?: number;
    maxRequests?: number;
  };
  auth?: boolean;
  cors?: boolean;
  cache?: {
    maxAge?: number;
    staleWhileRevalidate?: number;
  };
}

const routeMetadata = new Map<string, Map<string, {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  options?: RouteDecoratorOptions;
}>>();

export function Route(
  method: HttpMethod,
  path: string,
  options?: RouteDecoratorOptions
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const handler = descriptor.value as RouteHandler;
    
    if (!handler || typeof handler !== 'function') {
      throw new Error(`Route decorator can only be applied to methods`);
    }

    const className = target.constructor.name;
    
    if (!routeMetadata.has(className)) {
      routeMetadata.set(className, new Map());
    }
    
    const classRoutes = routeMetadata.get(className)!;
    classRoutes.set(propertyKey, {
      method,
      path,
      handler,
      options,
    });

    const wrappedHandler = async function(this: any, ...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await handler.apply(this, args);
        
        if (process.env.NODE_ENV === 'development') {
          const executionTime = Date.now() - startTime;
          console.debug(`Route ${method} ${path} executed in ${executionTime}ms`);
        }
        
        return result;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Route ${method} ${path} error:`, error);
        }
        throw error;
      }
    };

    descriptor.value = wrappedHandler;
    return descriptor;
  };
}

export function GET(path: string, options?: RouteDecoratorOptions) {
  return Route('GET', path, options);
}

export function POST(path: string, options?: RouteDecoratorOptions) {
  return Route('POST', path, options);
}

export function PUT(path: string, options?: RouteDecoratorOptions) {
  return Route('PUT', path, options);
}

export function DELETE(path: string, options?: RouteDecoratorOptions) {
  return Route('DELETE', path, options);
}

export function PATCH(path: string, options?: RouteDecoratorOptions) {
  return Route('PATCH', path, options);
}

export function HEAD(path: string, options?: RouteDecoratorOptions) {
  return Route('HEAD', path, options);
}

export function OPTIONS(path: string, options?: RouteDecoratorOptions) {
  return Route('OPTIONS', path, options);
}

export function getRouteMetadata(targetClass: any): Map<string, {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  options?: RouteDecoratorOptions;
}> {
  const className = targetClass.constructor?.name || targetClass.name;
  return routeMetadata.get(className) || new Map();
}

export function registerDecoratedRoutes(
  pluginInstance: any,
  pluginName: string,
  version: string = '1.0.0'
): void {
  const routes = getRouteMetadata(pluginInstance);
  
  if (routes.size === 0) {
    return;
  }

  const routeConfig: any = {};
  
  for (const [methodName, routeInfo] of routes) {
    const { method, path, handler } = routeInfo;
    
    if (!routeConfig[path]) {
      routeConfig[path] = {};
    }
    
    routeConfig[path][method] = handler.bind(pluginInstance);
  }

  const registry = PluginRegistry.getInstance();
  registry.register({
    name: pluginName,
    version,
    routes: routeConfig,
    createdAt: new Date(),
    enabled: true,
  });
}

export function clearRouteMetadata(targetClass: any): void {
  const className = targetClass.constructor?.name || targetClass.name;
  routeMetadata.delete(className);
}

export function getAllRouteMetadata(): Map<string, Map<string, {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  options?: RouteDecoratorOptions;
}>> {
  return new Map(routeMetadata);
}