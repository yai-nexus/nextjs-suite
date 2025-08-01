import { PluginConfig, HttpMethod, PluginValidationError } from '../core/types.js';

export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T) => boolean | string;
  message?: string;
}

export class Validator {
  private rules: Map<string, ValidationRule[]> = new Map();

  addRule<T>(field: string, rule: ValidationRule<T>): void {
    const fieldRules = this.rules.get(field) || [];
    fieldRules.push(rule);
    this.rules.set(field, fieldRules);
  }

  validate<T extends Record<string, any>>(
    data: T,
    context?: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [field, rules] of this.rules) {
      const value = data[field];
      
      for (const rule of rules) {
        const result = rule.validate(value);
        
        if (result !== true) {
          const message = typeof result === 'string' 
            ? result 
            : rule.message || `Validation failed for field '${field}'`;
          
          errors.push(`${context ? `${context}: ` : ''}${message}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const VALID_HTTP_METHODS: HttpMethod[] = [
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
];

export function validatePluginName(name: string): boolean | string {
  if (!name || typeof name !== 'string') {
    return 'Plugin name must be a non-empty string';
  }

  if (name.length < 3 || name.length > 50) {
    return 'Plugin name must be between 3 and 50 characters';
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    return 'Plugin name can only contain letters, numbers, hyphens, and underscores';
  }

  return true;
}

export function validatePluginVersion(version: string): boolean | string {
  if (!version || typeof version !== 'string') {
    return 'Plugin version must be a non-empty string';
  }

  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;
  
  if (!semverRegex.test(version)) {
    return 'Plugin version must follow semantic versioning (e.g., 1.0.0)';
  }

  return true;
}

export function validateRouteConfig(routes: any): boolean | string {
  if (!routes || typeof routes !== 'object') {
    return 'Routes configuration must be an object';
  }

  for (const [path, methods] of Object.entries(routes)) {
    if (!path.startsWith('/')) {
      return `Route path '${path}' must start with '/'`;
    }

    if (!methods || typeof methods !== 'object') {
      return `Route methods for '${path}' must be an object`;
    }

    for (const [method, handler] of Object.entries(methods as any)) {
      if (!VALID_HTTP_METHODS.includes(method as HttpMethod)) {
        return `Invalid HTTP method '${method}' for route '${path}'`;
      }

      if (typeof handler !== 'function') {
        return `Handler for '${method} ${path}' must be a function`;
      }
    }
  }

  return true;
}

export function validateMiddlewareConfig(middlewares: any[]): boolean | string {
  if (!Array.isArray(middlewares)) {
    return 'Middlewares must be an array';
  }

  for (let i = 0; i < middlewares.length; i++) {
    const middleware = middlewares[i];
    
    if (!middleware.name || typeof middleware.name !== 'string') {
      return `Middleware at index ${i} must have a valid name`;
    }

    if (typeof middleware.handler !== 'function') {
      return `Middleware '${middleware.name}' must have a handler function`;
    }

    if (middleware.priority !== undefined && 
        (typeof middleware.priority !== 'number' || middleware.priority < 0)) {
      return `Middleware '${middleware.name}' priority must be a non-negative number`;
    }

    if (middleware.routes !== undefined && !Array.isArray(middleware.routes)) {
      return `Middleware '${middleware.name}' routes must be an array`;
    }
  }

  return true;
}

export function validateHooks(hooks: any): boolean | string {
  if (!hooks) return true;
  
  if (typeof hooks !== 'object') {
    return 'Hooks must be an object';
  }

  const validHooks = [
    'onInit', 'onDestroy', 'onRouteRegister', 'onRouteUnregister',
    'onRequest', 'onResponse', 'onError'
  ];

  for (const [hookName, hookFn] of Object.entries(hooks)) {
    if (!validHooks.includes(hookName)) {
      return `Invalid hook name '${hookName}'`;
    }

    if (typeof hookFn !== 'function') {
      return `Hook '${hookName}' must be a function`;
    }
  }

  return true;
}

export function validatePluginConfig(config: PluginConfig): void {
  const validator = new Validator();

  validator.addRule('name', {
    name: 'validateName',
    validate: validatePluginName,
  });

  validator.addRule('version', {
    name: 'validateVersion',
    validate: validatePluginVersion,
  });

  validator.addRule('routes', {
    name: 'validateRoutes',
    validate: validateRouteConfig,
  });

  if (config.middlewares) {
    validator.addRule('middlewares', {
      name: 'validateMiddlewares',
      validate: validateMiddlewareConfig,
    });
  }

  if (config.hooks) {
    validator.addRule('hooks', {
      name: 'validateHooks',
      validate: validateHooks,
    });
  }

  const result = validator.validate(config, `Plugin '${config.name}'`);
  
  if (!result.isValid) {
    throw new PluginValidationError(
      config.name,
      `Plugin validation failed:\n${result.errors.join('\n')}`,
      'PLUGIN_VALIDATION_ERROR'
    );
  }
}

export function sanitizePath(path: string): string {
  return path
    .replace(/\/+/g, '/') // Replace multiple slashes with single slash
    .replace(/\/$/, '') // Remove trailing slash
    .replace(/^(?!\/)/, '/'); // Ensure leading slash
}

export function isValidPath(path: string): boolean {
  try {
    const sanitized = sanitizePath(path);
    return sanitized.length > 0 && sanitized.startsWith('/');
  } catch {
    return false;
  }
}