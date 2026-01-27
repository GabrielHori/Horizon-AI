/**
 * Setup de test pour Vitest
 * Configure les mocks globaux pour Tauri et autres dépendances
 */
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup automatique après chaque test
afterEach(() => {
    cleanup();
});

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => { })),
    emit: vi.fn(() => Promise.resolve()),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn(() => Promise.resolve(null)),
    save: vi.fn(() => Promise.resolve(null)),
    message: vi.fn(() => Promise.resolve()),
    ask: vi.fn(() => Promise.resolve(true)),
    confirm: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
    Command: {
        create: vi.fn(),
    },
    open: vi.fn(() => Promise.resolve()),
}));

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Variables d'environnement mock
vi.stubEnv('DEV', true);
vi.stubEnv('MODE', 'development');
