import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
    // Ignorer les dossiers de build et dépendances
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            'src-tauri/target/**',
            'worker/.venv/**',
            'worker/__pycache__/**',
            'worker/dist/**',
            'worker/build/**',
            '.venv/**',
            '*.config.js',
            'vite.config.js',
            'tailwind.config.js',
        ],
    },

    // Configuration pour les fichiers JS/JSX
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2021,
                process: 'readonly',
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            // Règles ESLint de base
            ...js.configs.recommended.rules,

            // Règles React Hooks
            ...reactHooks.configs.recommended.rules,

            // React Refresh
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],

            // Règles personnalisées pour Horizon AI
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }],
            'no-console': ['warn', {
                allow: ['warn', 'error']
            }],
            'prefer-const': 'warn',
            'no-var': 'error',
            'eqeqeq': ['warn', 'smart'],
            'curly': ['warn', 'multi-line'],

            // Désactiver les règles trop strictes pour les composants React
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
];
