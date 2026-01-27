/**
 * Tests pour le service logger
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock import.meta.env
vi.stubEnv('DEV', true);
vi.stubEnv('MODE', 'development');

// On doit importer après le mock
const { logger } = await import('../services/logger');

describe('logger service', () => {
    // Sauvegarder les méthodes console originales
    const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        groupCollapsed: console.groupCollapsed,
        dir: console.dir,
        groupEnd: console.groupEnd,
        time: console.time,
        timeEnd: console.timeEnd,
    };

    beforeEach(() => {
        // Mock toutes les méthodes console
        console.log = vi.fn();
        console.info = vi.fn();
        console.warn = vi.fn();
        console.error = vi.fn();
        console.groupCollapsed = vi.fn();
        console.dir = vi.fn();
        console.groupEnd = vi.fn();
        console.time = vi.fn();
        console.timeEnd = vi.fn();
    });

    afterEach(() => {
        // Restaurer les méthodes originales
        Object.assign(console, originalConsole);
    });

    describe('logging methods', () => {
        it('logger.debug calls console.log in dev mode', () => {
            logger.debug('test message');
            expect(console.log).toHaveBeenCalled();
        });

        it('logger.info calls console.info in dev mode', () => {
            logger.info('test info');
            expect(console.info).toHaveBeenCalled();
        });

        it('logger.warn calls console.warn', () => {
            logger.warn('test warning');
            expect(console.warn).toHaveBeenCalled();
        });

        it('logger.error calls console.error', () => {
            logger.error('test error');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('utility methods', () => {
        it('logger.isDev returns true in development', () => {
            expect(logger.isDev()).toBe(true);
        });

        it('logger.devOnly logs only in dev', () => {
            logger.devOnly('dev only message');
            expect(console.log).toHaveBeenCalled();
        });

        it('logger.inspect creates grouped log', () => {
            logger.inspect('label', { key: 'value' });
            expect(console.groupCollapsed).toHaveBeenCalled();
            expect(console.dir).toHaveBeenCalled();
            expect(console.groupEnd).toHaveBeenCalled();
        });

        it('logger.time and timeEnd measure time', () => {
            logger.time('test-timer');
            logger.timeEnd('test-timer');
            expect(console.time).toHaveBeenCalled();
            expect(console.timeEnd).toHaveBeenCalled();
        });
    });

    describe('message formatting', () => {
        it('includes timestamp in warn messages', () => {
            logger.warn('formatted message');
            const call = console.warn.mock.calls[0];
            expect(call[0]).toContain('WARN');
        });

        it('includes timestamp in error messages', () => {
            logger.error('formatted error');
            const call = console.error.mock.calls[0];
            expect(call[0]).toContain('ERROR');
        });
    });
});
