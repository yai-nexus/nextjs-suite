import { describe, it, expect } from '@jest/globals';
import {
  validatePluginName,
  validatePluginVersion,
  validateRouteConfig,
  validateMiddlewareConfig,
  validateHooks,
  validatePluginConfig,
  sanitizePath,
  isValidPath,
  Validator,
} from '../../src/utils/validation.js';
import { definePlugin, PluginValidationError } from '../../src/core/types.js';
import { NextResponse } from 'next/server';

describe('Validation Utils', () => {
  describe('validatePluginName', () => {
    it('should accept valid plugin names', () => {
      expect(validatePluginName('valid-plugin')).toBe(true);
      expect(validatePluginName('plugin_name')).toBe(true);
      expect(validatePluginName('plugin123')).toBe(true);
      expect(validatePluginName('Plugin-Name')).toBe(true);
    });

    it('should reject invalid plugin names', () => {
      expect(validatePluginName('')).toContain('non-empty string');
      expect(validatePluginName('ab')).toContain('between 3 and 50 characters');
      expect(validatePluginName('a'.repeat(51))).toContain('between 3 and 50 characters');
      expect(validatePluginName('plugin with spaces')).toContain('letters, numbers, hyphens');
      expect(validatePluginName('plugin@name')).toContain('letters, numbers, hyphens');
    });

    it('should handle non-string inputs', () => {
      expect(validatePluginName(null as any)).toContain('non-empty string');
      expect(validatePluginName(undefined as any)).toContain('non-empty string');
      expect(validatePluginName(123 as any)).toContain('non-empty string');
    });
  });

  describe('validatePluginVersion', () => {
    it('should accept valid semantic versions', () => {
      expect(validatePluginVersion('1.0.0')).toBe(true);
      expect(validatePluginVersion('2.1.3')).toBe(true);
      expect(validatePluginVersion('1.0.0-alpha')).toBe(true);
      expect(validatePluginVersion('1.0.0-beta.1')).toBe(true);
      expect(validatePluginVersion('1.0.0+build.1')).toBe(true);
    });

    it('should reject invalid versions', () => {
      expect(validatePluginVersion('')).toContain('non-empty string');
      expect(validatePluginVersion('1.0')).toContain('semantic versioning');
      expect(validatePluginVersion('v1.0.0')).toContain('semantic versioning');
      expect(validatePluginVersion('1.0.0.0')).toContain('semantic versioning');
      expect(validatePluginVersion('invalid')).toContain('semantic versioning');
    });
  });

  describe('validateRouteConfig', () => {
    it('should accept valid route configuration', () => {
      const routes = {
        '/api/test': {
          GET: async () => new NextResponse('test'),
          POST: async () => new NextResponse('test'),
        },
        '/api/users/:id': {
          GET: async () => new NextResponse('user'),
        },
      };

      expect(validateRouteConfig(routes)).toBe(true);
    });

    it('should reject invalid route configurations', () => {
      expect(validateRouteConfig(null)).toContain('must be an object');
      expect(validateRouteConfig(undefined)).toContain('must be an object');
      
      const invalidPath = {
        'api/test': { // Missing leading slash
          GET: async () => new NextResponse('test'),
        },
      };
      expect(validateRouteConfig(invalidPath)).toContain('must start with');

      const invalidMethods = {
        '/api/test': null, // Invalid methods object
      };
      expect(validateRouteConfig(invalidMethods)).toContain('must be an object');

      const invalidMethod = {
        '/api/test': {
          INVALID: async () => new NextResponse('test'), // Invalid HTTP method
        },
      };
      expect(validateRouteConfig(invalidMethod)).toContain('Invalid HTTP method');

      const invalidHandler = {
        '/api/test': {
          GET: 'not a function', // Invalid handler
        },
      };
      expect(validateRouteConfig(invalidHandler)).toContain('must be a function');
    });
  });

  describe('validateMiddlewareConfig', () => {
    it('should accept valid middleware configuration', () => {
      const middlewares = [
        {
          name: 'test-middleware',
          handler: async (req: any, next: any) => await next(),
        },
        {
          name: 'auth-middleware',
          handler: async (req: any, next: any) => await next(),
          priority: 10,
          routes: ['/api/protected'],
        },
      ];

      expect(validateMiddlewareConfig(middlewares)).toBe(true);
    });

    it('should reject invalid middleware configurations', () => {
      expect(validateMiddlewareConfig('not an array' as any)).toContain('must be an array');

      const invalidName = [
        {
          handler: async (req: any, next: any) => await next(),
        },
      ];
      expect(validateMiddlewareConfig(invalidName)).toContain('must have a valid name');

      const invalidHandler = [
        {
          name: 'test',
          handler: 'not a function',
        },
      ];
      expect(validateMiddlewareConfig(invalidHandler)).toContain('must have a handler function');

      const invalidPriority = [
        {
          name: 'test',
          handler: async (req: any, next: any) => await next(),
          priority: -1,
        },
      ];
      expect(validateMiddlewareConfig(invalidPriority)).toContain('must be a non-negative number');

      const invalidRoutes = [
        {
          name: 'test',
          handler: async (req: any, next: any) => await next(),
          routes: 'not an array',
        },
      ];
      expect(validateMiddlewareConfig(invalidRoutes)).toContain('routes must be an array');
    });
  });

  describe('validateHooks', () => {
    it('should accept valid hooks', () => {
      const hooks = {
        onInit: () => {},
        onDestroy: async () => {},
        onRouteRegister: (path: string, method: string) => {},
      };

      expect(validateHooks(hooks)).toBe(true);
    });

    it('should accept undefined hooks', () => {
      expect(validateHooks(undefined)).toBe(true);
      expect(validateHooks(null)).toBe(true);
    });

    it('should reject invalid hooks', () => {
      expect(validateHooks('not an object')).toContain('must be an object');

      const invalidHookName = {
        invalidHook: () => {},
      };
      expect(validateHooks(invalidHookName)).toContain('Invalid hook name');

      const invalidHookFunction = {
        onInit: 'not a function',
      };
      expect(validateHooks(invalidHookFunction)).toContain('must be a function');
    });
  });

  describe('validatePluginConfig', () => {
    it('should validate complete plugin configuration', () => {
      const validPlugin = definePlugin({
        name: 'valid-plugin',
        version: '1.0.0',
        routes: {
          '/api/test': {
            GET: async () => new NextResponse('test'),
          },
        },
      });

      expect(() => validatePluginConfig(validPlugin)).not.toThrow();
    });

    it('should throw PluginValidationError for invalid configuration', () => {
      const invalidPlugin = definePlugin({
        name: 'ab', // Too short
        version: 'invalid', // Invalid semver
        routes: {
          'api/test': { // Missing leading slash
            GET: async () => new NextResponse('test'),
          },
        },
      });

      expect(() => validatePluginConfig(invalidPlugin)).toThrow(PluginValidationError);
    });
  });

  describe('sanitizePath', () => {
    it('should sanitize paths correctly', () => {
      expect(sanitizePath('/api/test')).toBe('/api/test');
      expect(sanitizePath('//api//test//')).toBe('/api/test');
      expect(sanitizePath('/api/test/')).toBe('/api/test');
      expect(sanitizePath('api/test')).toBe('/api/test');
      expect(sanitizePath('')).toBe('/');
    });
  });

  describe('isValidPath', () => {
    it('should validate paths correctly', () => {
      expect(isValidPath('/api/test')).toBe(true);
      expect(isValidPath('/api/test/')).toBe(true);
      expect(isValidPath('//api//test')).toBe(true);
      expect(isValidPath('api/test')).toBe(true);
      expect(isValidPath('')).toBe(true); // Empty path becomes '/'
    });
  });

  describe('Validator', () => {
    it('should validate data with custom rules', () => {
      const validator = new Validator();
      
      validator.addRule('name', {
        name: 'required',
        validate: (value) => !!value || 'Name is required',
      });

      validator.addRule('email', {
        name: 'email',
        validate: (value: string) => /\S+@\S+\.\S+/.test(value) || 'Invalid email format',
      });

      const validData = { name: 'John', email: 'john@example.com' };
      const result = validator.validate(validData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors', () => {
      const validator = new Validator();
      
      validator.addRule('name', {
        name: 'required',
        validate: (value) => !!value || 'Name is required',
      });

      const invalidData = { name: '', email: 'invalid-email' };
      const result = validator.validate(invalidData, 'User');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('User: Name is required');
    });

    it('should handle boolean validation results', () => {
      const validator = new Validator();
      
      validator.addRule('age', {
        name: 'positive',
        validate: (value: number) => value > 0,
        message: 'Age must be positive',
      });

      const invalidData = { age: -5 };
      const result = validator.validate(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Age must be positive');
    });
  });
});