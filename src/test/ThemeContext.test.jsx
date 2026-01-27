/**
 * Tests pour ThemeContext
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

// Composant de test pour accéder au contexte
const TestConsumer = () => {
    const { isDarkMode, toggleTheme } = useTheme();
    return (
        <div>
            <span data-testid="theme-status">{isDarkMode ? 'dark' : 'light'}</span>
            <button onClick={toggleTheme}>Toggle Theme</button>
        </div>
    );
};

describe('ThemeContext', () => {
    beforeEach(() => {
        // Reset localStorage
        localStorage.clear();
        // Reset les classes du document
        document.documentElement.classList.remove('dark', 'light');
    });

    describe('ThemeProvider', () => {
        it('defaults to dark mode when no localStorage', () => {
            render(
                <ThemeProvider>
                    <TestConsumer />
                </ThemeProvider>
            );

            expect(screen.getByTestId('theme-status').textContent).toBe('dark');
        });

        it('reads initial theme from localStorage', () => {
            localStorage.setItem('horizon-theme', 'light');

            render(
                <ThemeProvider>
                    <TestConsumer />
                </ThemeProvider>
            );

            expect(screen.getByTestId('theme-status').textContent).toBe('light');
        });

        it('persists theme change to localStorage', () => {
            render(
                <ThemeProvider>
                    <TestConsumer />
                </ThemeProvider>
            );

            // Initial: dark
            expect(localStorage.getItem('horizon-theme')).toBe('dark');

            // Toggle to light
            fireEvent.click(screen.getByText('Toggle Theme'));
            expect(localStorage.getItem('horizon-theme')).toBe('light');

            // Toggle back to dark
            fireEvent.click(screen.getByText('Toggle Theme'));
            expect(localStorage.getItem('horizon-theme')).toBe('dark');
        });

        it('adds dark class to document when dark mode', () => {
            render(
                <ThemeProvider>
                    <TestConsumer />
                </ThemeProvider>
            );

            expect(document.documentElement.classList.contains('dark')).toBe(true);
            expect(document.documentElement.classList.contains('light')).toBe(false);
        });

        it('adds light class to document when light mode', () => {
            localStorage.setItem('horizon-theme', 'light');

            render(
                <ThemeProvider>
                    <TestConsumer />
                </ThemeProvider>
            );

            expect(document.documentElement.classList.contains('light')).toBe(true);
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });

        it('toggleTheme switches between modes', () => {
            render(
                <ThemeProvider>
                    <TestConsumer />
                </ThemeProvider>
            );

            expect(screen.getByTestId('theme-status').textContent).toBe('dark');

            fireEvent.click(screen.getByText('Toggle Theme'));
            expect(screen.getByTestId('theme-status').textContent).toBe('light');

            fireEvent.click(screen.getByText('Toggle Theme'));
            expect(screen.getByTestId('theme-status').textContent).toBe('dark');
        });
    });

    describe('useTheme hook', () => {
        it('throws error when used outside ThemeProvider', () => {
            // Supprimer l'erreur console pour ce test
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestConsumer />);
            }).toThrow("useTheme doit être utilisé à l'intérieur d'un ThemeProvider");

            consoleSpy.mockRestore();
        });

        it('provides isDarkMode boolean', () => {
            render(
                <ThemeProvider>
                    <TestConsumer />
                </ThemeProvider>
            );

            const status = screen.getByTestId('theme-status');
            expect(['dark', 'light']).toContain(status.textContent);
        });

        it('provides toggleTheme function', () => {
            render(
                <ThemeProvider>
                    <TestConsumer />
                </ThemeProvider>
            );

            const button = screen.getByText('Toggle Theme');
            expect(button).toBeInTheDocument();
            expect(() => fireEvent.click(button)).not.toThrow();
        });
    });
});
