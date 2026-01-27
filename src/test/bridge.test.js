/**
 * Tests pour le service bridge
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { requestWorker } from '../services/bridge';

// Mock du module logger
vi.mock('../services/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        isDev: () => true,
    },
}));

describe('bridge service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('requestWorker', () => {
        it('returns parsed JSON response', async () => {
            const mockResponse = { success: true, data: 'test' };
            invoke.mockResolvedValueOnce(JSON.stringify(mockResponse));

            const result = await requestWorker('test_cmd', {});

            expect(invoke).toHaveBeenCalledWith('call_python', {
                cmd: 'test_cmd',
                payload: {},
            });
            expect(result).toEqual(mockResponse);
        });

        it('returns object response directly', async () => {
            const mockResponse = { success: true, data: 'test' };
            invoke.mockResolvedValueOnce(mockResponse);

            const result = await requestWorker('test_cmd');

            expect(result).toEqual(mockResponse);
        });

        it('handles empty response', async () => {
            invoke.mockResolvedValueOnce(null);

            const result = await requestWorker('test_cmd');

            expect(result.error).toBe(true);
            expect(result.code).toBe('EMPTY_RESPONSE');
        });

        it('handles timeout', async () => {
            // Simuler une requête qui ne répond jamais
            invoke.mockImplementationOnce(() => new Promise(() => { }));

            const result = await requestWorker('slow_cmd', {}, 100); // 100ms timeout

            expect(result.error).toBe(true);
            expect(result.code).toBe('TIMEOUT_ERROR');
        }, 5000);

        it('handles backend error response', async () => {
            const errorResponse = {
                error: true,
                code: 'BACKEND_ERROR',
                message: 'Something went wrong',
            };
            invoke.mockResolvedValueOnce(errorResponse);

            const result = await requestWorker('error_cmd');

            expect(result.error).toBe(true);
            expect(result.code).toBe('BACKEND_ERROR');
        });

        it('handles invalid JSON', async () => {
            invoke.mockResolvedValueOnce('not valid json{');

            const result = await requestWorker('test_cmd');

            expect(result.error).toBe(true);
            expect(result.code).toBe('INVALID_JSON');
        });

        it('passes payload correctly', async () => {
            const payload = { model: 'llama', prompt: 'Hello' };
            invoke.mockResolvedValueOnce({ success: true });

            await requestWorker('chat', payload);

            expect(invoke).toHaveBeenCalledWith('call_python', {
                cmd: 'chat',
                payload,
            });
        });
    });
});
