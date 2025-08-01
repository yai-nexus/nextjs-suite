import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { PluginRegistry } from '../../src/core/registry.js';
import { definePlugin, PluginRegistrationError } from '../../src/core/types.js';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    // Reset registry for each test
    PluginRegistry.reset();
    registry = PluginRegistry.getInstance();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const registry1 = PluginRegistry.getInstance();
      const registry2 = PluginRegistry.getInstance();
      
      expect(registry1).toBe(registry2);
    });
  });

  describe('register', () => {
    it('should register a valid plugin', () => {
      const testPlugin = definePlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        routes: {
          '/api/test': {
            GET: async () => new NextResponse('test'),
          },
        },
      });

      expect(() => registry.register(testPlugin)).not.toThrow();
      
      const plugin = registry.getPlugin('test-plugin');
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('test-plugin');
      expect(plugin?.version).toBe('1.0.0');
    });

    it('should throw error for duplicate plugin name', () => {
      const plugin1 = definePlugin({
        name: 'duplicate-test',
        version: '1.0.0',
        routes: {
          '/api/test1': {
            GET: async () => new NextResponse('test1'),
          },
        },
      });

      const plugin2 = definePlugin({
        name: 'duplicate-test',
        version: '2.0.0',
        routes: {
          '/api/test2': {
            GET: async () => new NextResponse('test2'),
          },
        },
      });

      registry.register(plugin1);

      expect(() => registry.register(plugin2)).toThrow(PluginRegistrationError);
    });

    it('should throw error for route conflicts', () => {
      const plugin1 = definePlugin({
        name: 'plugin1',
        version: '1.0.0',
        routes: {
          '/api/conflict': {
            GET: async () => new NextResponse('plugin1'),
          },
        },
      });

      const plugin2 = definePlugin({
        name: 'plugin2',
        version: '1.0.0',
        routes: {
          '/api/conflict': {
            GET: async () => new NextResponse('plugin2'),
          },
        },
      });

      registry.register(plugin1);

      expect(() => registry.register(plugin2)).toThrow(PluginRegistrationError);
    });

    it('should allow different methods on same route', () => {
      const plugin1 = definePlugin({
        name: 'plugin1',
        version: '1.0.0',
        routes: {
          '/api/shared': {
            GET: async () => new NextResponse('get'),
          },
        },
      });

      const plugin2 = definePlugin({
        name: 'plugin2',
        version: '1.0.0',
        routes: {
          '/api/shared': {
            POST: async () => new NextResponse('post'),
          },
        },
      });

      expect(() => {
        registry.register(plugin1);
        registry.register(plugin2);
      }).not.toThrow();
    });
  });

  describe('unregister', () => {
    it('should unregister existing plugin', () => {
      const testPlugin = definePlugin({
        name: 'test-plugin',
        version: '1.0.0',
        routes: {
          '/api/test': {
            GET: async () => new NextResponse('test'),
          },
        },
      });

      registry.register(testPlugin);
      expect(registry.getPlugin('test-plugin')).toBeDefined();

      const result = registry.unregister('test-plugin');
      expect(result).toBe(true);
      expect(registry.getPlugin('test-plugin')).toBeUndefined();
    });

    it('should return false for non-existent plugin', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getHandler', () => {
    beforeEach(() => {
      const testPlugin = definePlugin({
        name: 'test-plugin',
        version: '1.0.0',
        routes: {
          '/api/test': {
            GET: async () => new NextResponse('get response'),
            POST: async () => new NextResponse('post response'),
          },
          '/api/test/:id': {
            GET: async () => new NextResponse('get by id'),
          },
        },
      });

      registry.register(testPlugin);
    });

    it('should return handler for existing route', () => {
      const match = registry.getHandler('/api/test', 'GET');
      
      expect(match).toBeDefined();
      expect(match?.plugin.name).toBe('test-plugin');
      expect(typeof match?.handler).toBe('function');
    });

    it('should return null for non-existent route', () => {
      const match = registry.getHandler('/api/nonexistent', 'GET');
      expect(match).toBeNull();
    });

    it('should return null for non-existent method', () => {
      const match = registry.getHandler('/api/test', 'DELETE');
      expect(match).toBeNull();
    });

    it('should handle path parameters', () => {
      const match = registry.getHandler('/api/test/123', 'GET');
      
      expect(match).toBeDefined();
      expect(match?.params).toEqual({ id: '123' });
    });

    it('should sanitize paths', () => {
      const match1 = registry.getHandler('/api/test/', 'GET');
      const match2 = registry.getHandler('//api//test', 'GET');
      
      expect(match1).toBeDefined();
      expect(match2).toBeDefined();
    });
  });

  describe('executeRoute', () => {
    it('should execute route handler successfully', async () => {
      const testPlugin = definePlugin({
        name: 'test-plugin',
        version: '1.0.0',
        routes: {
          '/api/test': {
            GET: async () => new NextResponse('success'),
          },
        },
      });

      registry.register(testPlugin);
      
      const match = registry.getHandler('/api/test', 'GET');
      expect(match).toBeDefined();

      const request = new NextRequest('http://localhost/api/test');
      const response = await registry.executeRoute(match!, request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(await response.text()).toBe('success');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const plugin1 = definePlugin({
        name: 'plugin1',
        version: '1.0.0',
        routes: {
          '/api/test1': {
            GET: async () => new NextResponse('test1'),
            POST: async () => new NextResponse('test1 post'),
          },
        },
      });

      const plugin2 = definePlugin({
        name: 'plugin2',
        version: '1.0.0',
        routes: {
          '/api/test2': {
            GET: async () => new NextResponse('test2'),
          },
        },
      });

      registry.register(plugin1);
      registry.register(plugin2);

      const stats = registry.getStats();
      
      expect(stats.totalPlugins).toBe(2);
      expect(stats.enabledPlugins).toBe(2);
      expect(stats.totalRoutes).toBe(3); // 2 routes from plugin1, 1 from plugin2
      expect(typeof stats.uptime).toBe('number');
      expect(stats.memoryUsage).toBeDefined();
    });
  });

  describe('enablePlugin and disablePlugin', () => {
    beforeEach(() => {
      const testPlugin = definePlugin({
        name: 'test-plugin',
        version: '1.0.0',
        routes: {
          '/api/test': {
            GET: async () => new NextResponse('test'),
          },
        },
      });

      registry.register(testPlugin);
    });

    it('should disable plugin', () => {
      const result = registry.disablePlugin('test-plugin');
      expect(result).toBe(true);

      const plugin = registry.getPlugin('test-plugin');
      expect(plugin?.enabled).toBe(false);
    });

    it('should enable plugin', () => {
      registry.disablePlugin('test-plugin');
      
      const result = registry.enablePlugin('test-plugin');
      expect(result).toBe(true);

      const plugin = registry.getPlugin('test-plugin');
      expect(plugin?.enabled).toBe(true);
    });

    it('should return false for non-existent plugin', () => {
      expect(registry.enablePlugin('non-existent')).toBe(false);
      expect(registry.disablePlugin('non-existent')).toBe(false);
    });
  });

  describe('getAllPlugins and getEnabledPlugins', () => {
    beforeEach(() => {
      const plugin1 = definePlugin({
        name: 'plugin1',
        version: '1.0.0',
        routes: {
          '/api/test1': {
            GET: async () => new NextResponse('test1'),
          },
        },
      });

      const plugin2 = definePlugin({
        name: 'plugin2',
        version: '1.0.0',
        routes: {
          '/api/test2': {
            GET: async () => new NextResponse('test2'),
          },
        },
      });

      registry.register(plugin1);
      registry.register(plugin2);
    });

    it('should return all plugins', () => {
      const plugins = registry.getAllPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins.map(p => p.name)).toContain('plugin1');
      expect(plugins.map(p => p.name)).toContain('plugin2');
    });

    it('should return only enabled plugins', () => {
      registry.disablePlugin('plugin1');
      
      const enabledPlugins = registry.getEnabledPlugins();
      expect(enabledPlugins).toHaveLength(1);
      expect(enabledPlugins[0].name).toBe('plugin2');
    });
  });
});