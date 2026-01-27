import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        // Environnement de test simulant un navigateur
        environment: 'jsdom',

        // Fichiers de setup (pour configurer les mocks globaux)
        setupFiles: ['./src/test/setup.js'],

        // Inclure les fichiers de test
        include: ['src/**/*.{test,spec}.{js,jsx}'],

        // Exclure les dossiers
        exclude: [
            'node_modules',
            'dist',
            'src-tauri',
            'worker',
        ],

        // Couverture de code
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.{js,ts}',
                '**/constants/**',
            ],
        },

        // Globals pour ne pas avoir à importer describe, it, expect
        globals: true,

        // Timeout pour les tests
        testTimeout: 10000,
    },
});
