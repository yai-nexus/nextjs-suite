import { MiddlewareFunction } from '../core/types.js';

export interface MiddlewareDecoratorOptions {
  name?: string;
  priority?: number;
  routes?: string[];
  enabled?: boolean;
}

const middlewareMetadata = new Map<string, Map<string, {
  name: string;
  handler: MiddlewareFunction;
  options: MiddlewareDecoratorOptions;
}>>();

export function Middleware(options: MiddlewareDecoratorOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const handler = descriptor.value as MiddlewareFunction;
    
    if (!handler || typeof handler !== 'function') {
      throw new Error(`Middleware decorator can only be applied to methods`);
    }

    const className = target.constructor.name;
    const middlewareName = options.name || `${className}.${propertyKey}`;
    
    if (!middlewareMetadata.has(className)) {
      middlewareMetadata.set(className, new Map());
    }
    
    const classMiddlewares = middlewareMetadata.get(className)!;
    classMiddlewares.set(propertyKey, {
      name: middlewareName,
      handler,
      options: {
        priority: 0,
        enabled: true,
        ...options,
      },
    });

    const wrappedHandler = async function(this: any, ...args: any[]) {
      if (options.enabled === false) {
        const [request, next] = args;
        return await next();
      }

      const startTime = Date.now();
      
      try {
        const result = await handler.apply(this, args);
        
        if (process.env.NODE_ENV === 'development') {
          const executionTime = Date.now() - startTime;
          console.debug(`Middleware ${middlewareName} executed in ${executionTime}ms`);
        }
        
        return result;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Middleware ${middlewareName} error:`, error);
        }
        throw error;
      }
    };

    descriptor.value = wrappedHandler;
    return descriptor;
  };
}

export function BeforeRoute(options?: Omit<MiddlewareDecoratorOptions, 'priority'>) {
  return Middleware({ ...options, priority: 100 });
}

export function AfterRoute(options?: Omit<MiddlewareDecoratorOptions, 'priority'>) {
  return Middleware({ ...options, priority: -100 });
}

export function Auth(options?: Omit<MiddlewareDecoratorOptions, 'name'>) {
  return Middleware({ ...options, name: 'auth' });
}

export function RateLimit(options?: Omit<MiddlewareDecoratorOptions, 'name'>) {
  return Middleware({ ...options, name: 'rateLimit' });
}

export function CORS(options?: Omit<MiddlewareDecoratorOptions, 'name'>) {
  return Middleware({ ...options, name: 'cors' });
}

export function Cache(options?: Omit<MiddlewareDecoratorOptions, 'name'>) {
  return Middleware({ ...options, name: 'cache' });
}

export function Validate(options?: Omit<MiddlewareDecoratorOptions, 'name'>) {
  return Middleware({ ...options, name: 'validate' });
}

export function Log(options?: Omit<MiddlewareDecoratorOptions, 'name'>) {
  return Middleware({ ...options, name: 'log' });
}

export function getMiddlewareMetadata(targetClass: any): Map<string, {
  name: string;
  handler: MiddlewareFunction;
  options: MiddlewareDecoratorOptions;
}> {
  const className = targetClass.constructor?.name || targetClass.name;
  return middlewareMetadata.get(className) || new Map();
}

export function getMiddlewareConfig(targetClass: any): {
  name: string;
  handler: MiddlewareFunction;
  priority?: number;
  routes?: string[];
}[] {
  const middlewares = getMiddlewareMetadata(targetClass);
  const configs: any[] = [];
  
  for (const [methodName, middlewareInfo] of middlewares) {
    if (middlewareInfo.options.enabled !== false) {
      configs.push({
        name: middlewareInfo.name,
        handler: middlewareInfo.handler,
        priority: middlewareInfo.options.priority,
        routes: middlewareInfo.options.routes,
      });
    }
  }
  
  return configs.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

export function enableMiddleware(targetClass: any, methodName: string): boolean {
  const className = targetClass.constructor?.name || targetClass.name;
  const classMiddlewares = middlewareMetadata.get(className);
  
  if (!classMiddlewares) return false;
  
  const middleware = classMiddlewares.get(methodName);
  if (!middleware) return false;
  
  middleware.options.enabled = true;
  return true;
}

export function disableMiddleware(targetClass: any, methodName: string): boolean {
  const className = targetClass.constructor?.name || targetClass.name;
  const classMiddlewares = middlewareMetadata.get(className);
  
  if (!classMiddlewares) return false;
  
  const middleware = classMiddlewares.get(methodName);
  if (!middleware) return false;
  
  middleware.options.enabled = false;
  return true;
}

export function clearMiddlewareMetadata(targetClass: any): void {
  const className = targetClass.constructor?.name || targetClass.name;
  middlewareMetadata.delete(className);
}

export function getAllMiddlewareMetadata(): Map<string, Map<string, {
  name: string;
  handler: MiddlewareFunction;
  options: MiddlewareDecoratorOptions;
}>> {
  return new Map(middlewareMetadata);
}