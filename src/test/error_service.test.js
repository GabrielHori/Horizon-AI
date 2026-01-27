/**
 * Tests pour le service error_service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    ErrorTypes,
    createUserFriendlyError,
    isError,
    getUserMessage,
    handleError,
    executeWithErrorHandling,
} from '../services/error_service';

// Mock du logger
vi.mock('../services/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        isDev: () => true,
    },
}));

describe('error_service', () => {
    describe('ErrorTypes', () => {
        it('defines all error types', () => {
            expect(ErrorTypes.NETWORK).toBe('network');
            expect(ErrorTypes.TIMEOUT).toBe('timeout');
            expect(ErrorTypes.PERMISSION).toBe('permission');
            expect(ErrorTypes.VALIDATION).toBe('validation');
            expect(ErrorTypes.BACKEND).toBe('backend');
            expect(ErrorTypes.UNKNOWN).toBe('unknown');
            expect(ErrorTypes.USER).toBe('user');
        });
    });

    describe('createUserFriendlyError', () => {
        it('creates error object with default values', () => {
            const error = createUserFriendlyError({});

            expect(error.error).toBe(true);
            expect(error.type).toBe(ErrorTypes.UNKNOWN);
            expect(error.canRetry).toBe(true);
            expect(error.actions).toHaveLength(2);
        });

        it('detects network errors from code', () => {
            const error = createUserFriendlyError({ code: 'NETWORK_ERROR' });

            expect(error.type).toBe(ErrorTypes.NETWORK);
        });

        it('detects timeout errors from code', () => {
            const error = createUserFriendlyError({ code: 'TIMEOUT_ERROR' });

            expect(error.type).toBe(ErrorTypes.TIMEOUT);
        });

        it('detects backend errors from code', () => {
            const error = createUserFriendlyError({ code: 'BRIDGE_ERROR' });

            expect(error.type).toBe(ErrorTypes.BACKEND);
        });

        it('provides French messages when language is fr', () => {
            const error = createUserFriendlyError(
                { code: 'NETWORK_ERROR' },
                '',
                'fr'
            );

            expect(error.userMessage).toContain('connexion');
        });

        it('provides English messages when language is en', () => {
            const error = createUserFriendlyError(
                { code: 'NETWORK_ERROR' },
                '',
                'en'
            );

            expect(error.userMessage).toContain('connection');
        });

        it('adds context to error message', () => {
            const error = createUserFriendlyError(
                { code: 'TIMEOUT_ERROR' },
                'loading models',
                'en'
            );

            expect(error.userMessage).toContain('loading models');
        });

        it('detects permission errors from message', () => {
            const error = createUserFriendlyError(
                { message: 'Permission denied' },
                '',
                'en'
            );

            expect(error.type).toBe(ErrorTypes.PERMISSION);
        });

        it('detects validation errors from message', () => {
            const error = createUserFriendlyError(
                { message: 'Invalid input' },
                '',
                'en'
            );

            expect(error.type).toBe(ErrorTypes.VALIDATION);
        });

        it('includes technical message', () => {
            const error = createUserFriendlyError(
                { message: 'Technical details here' }
            );

            expect(error.technicalMessage).toBe('Technical details here');
        });

        it('provides retry and dismiss actions', () => {
            const error = createUserFriendlyError({}, '', 'en');

            expect(error.actions).toEqual([
                { label: 'Retry', action: 'retry', primary: true },
                { label: 'Dismiss', action: 'dismiss', primary: false }
            ]);
        });
    });

    describe('isError', () => {
        it('returns true for error objects', () => {
            expect(isError({ error: true })).toBe(true);
        });

        it('returns false for success objects', () => {
            expect(isError({ success: true })).toBe(false);
        });

        it('returns false for null/undefined', () => {
            expect(isError(null)).toBe(false);
            expect(isError(undefined)).toBe(false);
        });

        it('returns false for regular objects', () => {
            expect(isError({ data: 'test' })).toBe(false);
        });
    });

    describe('getUserMessage', () => {
        it('returns userMessage if present', () => {
            const error = { userMessage: 'Custom message' };

            expect(getUserMessage(error)).toBe('Custom message');
        });

        it('creates user-friendly message if not present', () => {
            const error = { code: 'TIMEOUT_ERROR' };

            const message = getUserMessage(error, 'en');
            expect(message).toContain('timed out');
        });

        it('returns empty string for null', () => {
            expect(getUserMessage(null)).toBe('');
        });
    });

    describe('handleError', () => {
        it('calls setError with user-friendly error', () => {
            const setError = vi.fn();
            const error = { code: 'NETWORK_ERROR' };

            handleError(error, setError, 'test context', 'en');

            expect(setError).toHaveBeenCalled();
            const calledWith = setError.mock.calls[0][0];
            expect(calledWith.type).toBe(ErrorTypes.NETWORK);
        });

        it('clears error when passed null', () => {
            const setError = vi.fn();

            handleError(null, setError);

            expect(setError).toHaveBeenCalledWith(null);
        });
    });

    describe('executeWithErrorHandling', () => {
        it('returns result on success', async () => {
            const setError = vi.fn();
            const setLoading = vi.fn();
            const operation = async () => ({ data: 'success' });

            const result = await executeWithErrorHandling(
                operation,
                setError,
                setLoading
            );

            expect(result).toEqual({ data: 'success' });
            expect(setLoading).toHaveBeenCalledWith(true);
            expect(setLoading).toHaveBeenLastCalledWith(false);
            expect(setError).toHaveBeenCalledWith(null);
        });

        it('handles error results', async () => {
            const setError = vi.fn();
            const setLoading = vi.fn();
            const operation = async () => ({ error: true, code: 'TEST_ERROR' });

            const result = await executeWithErrorHandling(
                operation,
                setError,
                setLoading
            );

            expect(result).toBeNull();
            expect(setError).toHaveBeenCalled();
        });

        it('handles thrown exceptions', async () => {
            const setError = vi.fn();
            const setLoading = vi.fn();
            const operation = async () => { throw new Error('Test exception'); };

            const result = await executeWithErrorHandling(
                operation,
                setError,
                setLoading
            );

            expect(result).toBeNull();
            expect(setError).toHaveBeenCalled();
            expect(setLoading).toHaveBeenLastCalledWith(false);
        });
    });
});
