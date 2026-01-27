/**
 * Tests pour permission_service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

// Mock logger et bridge
vi.mock('../services/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        isDev: () => true,
    },
}));

vi.mock('../services/bridge', () => ({
    requestWorker: vi.fn(() => Promise.resolve({})),
}));

// Importer après les mocks
import PermissionService from '../services/permission_service';

describe('PermissionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('requestPermission', () => {
        it('calls invoke with correct parameters', async () => {
            invoke.mockResolvedValueOnce({ success: true });

            await PermissionService.requestPermission('FileRead', 'Reading file', 'For analysis');

            expect(invoke).toHaveBeenCalledWith('request_permission', {
                permission: 'FileRead',
                context: 'Reading file',
                reason: 'For analysis'
            });
        });

        it('returns true when permission granted with success object', async () => {
            invoke.mockResolvedValueOnce({ success: true });

            const result = await PermissionService.requestPermission('FileRead', 'Test', 'Reason');

            expect(result).toBe(true);
        });

        it('returns true when permission granted with boolean', async () => {
            invoke.mockResolvedValueOnce(true);

            const result = await PermissionService.requestPermission('FileRead', 'Test', 'Reason');

            expect(result).toBe(true);
        });

        it('returns false when permission denied', async () => {
            invoke.mockResolvedValueOnce({ success: false });

            const result = await PermissionService.requestPermission('FileRead', 'Test', 'Reason');

            expect(result).toBe(false);
        });

        it('returns false on error', async () => {
            invoke.mockRejectedValueOnce(new Error('Permission error'));

            const result = await PermissionService.requestPermission('FileRead', 'Test', 'Reason');

            expect(result).toBe(false);
        });
    });

    describe('requestPermissionWithScope', () => {
        it('calls invoke with scope parameters', async () => {
            invoke.mockResolvedValueOnce({ success: true });

            await PermissionService.requestPermissionWithScope('FileRead', 'Test', 'temporary', 30);

            expect(invoke).toHaveBeenCalledWith('request_permission_with_scope', {
                permission: 'FileRead',
                context: 'Test',
                scope: 'temporary',
                duration_minutes: 30,
                project_id: undefined
            });
        });

        it('supports project scope', async () => {
            invoke.mockResolvedValueOnce({ success: true });

            await PermissionService.requestPermissionWithScope('FileRead', 'Test', 'project', null, 'project-123');

            expect(invoke).toHaveBeenCalledWith('request_permission_with_scope', {
                permission: 'FileRead',
                context: 'Test',
                scope: 'project',
                duration_minutes: undefined,
                project_id: 'project-123'
            });
        });

        it('defaults to global scope', async () => {
            invoke.mockResolvedValueOnce({ success: true });

            await PermissionService.requestPermissionWithScope('FileRead', 'Test');

            const call = invoke.mock.calls[0];
            expect(call[1].scope).toBe('global');
        });
    });

    describe('hasPermission', () => {
        it('calls invoke with correct parameters', async () => {
            invoke.mockResolvedValueOnce(true);

            await PermissionService.hasPermission('NetworkAccess');

            expect(invoke).toHaveBeenCalledWith('has_permission', {
                permission: 'NetworkAccess'
            });
        });

        it('returns true when has_permission is true', async () => {
            invoke.mockResolvedValueOnce({ has_permission: true });

            const result = await PermissionService.hasPermission('NetworkAccess');

            expect(result).toBe(true);
        });

        it('returns true when hasPermission is true (camelCase)', async () => {
            invoke.mockResolvedValueOnce({ hasPermission: true });

            const result = await PermissionService.hasPermission('NetworkAccess');

            expect(result).toBe(true);
        });

        it('returns true for boolean true response', async () => {
            invoke.mockResolvedValueOnce(true);

            const result = await PermissionService.hasPermission('NetworkAccess');

            expect(result).toBe(true);
        });

        it('returns false on error', async () => {
            invoke.mockRejectedValueOnce(new Error('Error'));

            const result = await PermissionService.hasPermission('NetworkAccess');

            expect(result).toBe(false);
        });
    });

    describe('hasPermissionWithContext', () => {
        it('checks permission with project context', async () => {
            invoke.mockResolvedValueOnce({ has_permission: true });

            await PermissionService.hasPermissionWithContext('FileRead', 'project-456');

            expect(invoke).toHaveBeenCalledWith('has_permission_with_context', {
                permission: 'FileRead',
                project_id: 'project-456'
            });
        });

        it('works without project_id', async () => {
            invoke.mockResolvedValueOnce({ has_permission: false });

            const result = await PermissionService.hasPermissionWithContext('FileRead');

            expect(result).toBe(false);
        });
    });

    describe('getPermissionLogs', () => {
        it('returns logs array', async () => {
            const mockLogs = [
                { timestamp: '2024-01-01T00:00:00Z', permission: 'FileRead', granted: true },
                { timestamp: '2024-01-02T00:00:00Z', permission: 'NetworkAccess', granted: false }
            ];
            invoke.mockResolvedValueOnce(mockLogs);

            const result = await PermissionService.getPermissionLogs();

            expect(result).toEqual(mockLogs);
            expect(invoke).toHaveBeenCalledWith('get_permission_logs');
        });

        it('returns empty array on error', async () => {
            invoke.mockRejectedValueOnce(new Error('Error'));

            const result = await PermissionService.getPermissionLogs();

            expect(result).toEqual([]);
        });
    });

    describe('getParanoMode', () => {
        it('returns parano mode status (boolean)', async () => {
            invoke.mockResolvedValueOnce(true);

            const result = await PermissionService.getParanoMode();

            expect(result).toBe(true);
            expect(invoke).toHaveBeenCalledWith('get_parano_mode');
        });

        it('extracts from object response (snake_case)', async () => {
            invoke.mockResolvedValueOnce({ parano_mode: false });

            const result = await PermissionService.getParanoMode();

            expect(result).toBe(false);
        });

        it('extracts from object response (camelCase)', async () => {
            invoke.mockResolvedValueOnce({ paranoMode: true });

            const result = await PermissionService.getParanoMode();

            expect(result).toBe(true);
        });

        it('defaults to true on error', async () => {
            invoke.mockRejectedValueOnce(new Error('Error'));

            const result = await PermissionService.getParanoMode();

            expect(result).toBe(true);
        });
    });

    describe('setParanoMode', () => {
        it('sets parano mode to false', async () => {
            invoke.mockResolvedValueOnce(undefined);

            await PermissionService.setParanoMode(false);

            expect(invoke).toHaveBeenCalledWith('set_parano_mode', {
                enabled: false
            });
        });

        it('sets parano mode to true', async () => {
            invoke.mockResolvedValueOnce(undefined);

            await PermissionService.setParanoMode(true);

            expect(invoke).toHaveBeenCalledWith('set_parano_mode', {
                enabled: true
            });
        });

        it('throws on error', async () => {
            invoke.mockRejectedValueOnce(new Error('Failed'));

            await expect(PermissionService.setParanoMode(true)).rejects.toThrow('Failed');
        });
    });

    describe('clearPermissionLogs', () => {
        it('calls invoke to clear logs', async () => {
            invoke.mockResolvedValueOnce(undefined);

            await PermissionService.clearPermissionLogs();

            expect(invoke).toHaveBeenCalledWith('clear_permission_logs');
        });

        it('throws on error', async () => {
            invoke.mockRejectedValueOnce(new Error('Failed'));

            await expect(PermissionService.clearPermissionLogs()).rejects.toThrow();
        });
    });

    describe('exportPermissionLogs', () => {
        it('exports logs to specified path', async () => {
            invoke.mockResolvedValueOnce(undefined);

            await PermissionService.exportPermissionLogs('/path/to/export.json');

            expect(invoke).toHaveBeenCalledWith('export_permission_logs', {
                path: '/path/to/export.json'
            });
        });
    });

    describe('formatPermissionLog', () => {
        it('formats log with French permission name', () => {
            const log = {
                permission: 'FileRead',
                timestamp: '2024-01-15T10:30:00Z',
                granted: true
            };

            const formatted = PermissionService.formatPermissionLog(log);

            expect(formatted.formattedPermission).toBe('Lecture de fichiers');
            expect(formatted.status).toBe('Accordée');
            expect(formatted.statusClass).toBe('text-emerald-500');
        });

        it('formats denied permission', () => {
            const log = {
                permission: 'NetworkAccess',
                timestamp: '2024-01-15T10:30:00Z',
                granted: false
            };

            const formatted = PermissionService.formatPermissionLog(log);

            expect(formatted.formattedPermission).toBe('Accès réseau');
            expect(formatted.status).toBe('Refusée');
            expect(formatted.statusClass).toBe('text-red-500');
        });

        it('handles unknown permission type', () => {
            const log = {
                permission: 'UnknownPermission',
                timestamp: '2024-01-15T10:30:00Z',
                granted: true
            };

            const formatted = PermissionService.formatPermissionLog(log);

            expect(formatted.formattedPermission).toBe('UnknownPermission');
        });

        it('formats RepoAnalyze permission (V2.1)', () => {
            const log = {
                permission: 'RepoAnalyze',
                timestamp: '2024-01-15T10:30:00Z',
                granted: true
            };

            const formatted = PermissionService.formatPermissionLog(log);

            expect(formatted.formattedPermission).toBe('Analyse de repository');
        });
    });
});
