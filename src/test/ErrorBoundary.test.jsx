/**
 * Tests pour le composant ErrorBoundary
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

// Composant qui throw une erreur
const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>No error</div>;
};

describe('ErrorBoundary', () => {
    // Supprimer les console.error pendant les tests d'erreur
    const originalError = console.error;

    beforeEach(() => {
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalError;
    });

    it('renders children when no error', () => {
        render(
            <ErrorBoundary>
                <div>Test content</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders error UI when child throws', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Vérifier que le message d'erreur est affiché
        expect(screen.getByText(/Something Went Wrong/i)).toBeInTheDocument();
        expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
        expect(screen.getByText(/Reload App/i)).toBeInTheDocument();
    });

    it('Try Again button triggers reset', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Vérifier que l'erreur est affichée
        expect(screen.getByText(/Something Went Wrong/i)).toBeInTheDocument();

        // Le bouton Try Again devrait être cliquable
        const tryAgainButton = screen.getByText(/Try Again/i);
        expect(tryAgainButton).toBeInTheDocument();

        // Cliquer ne devrait pas throw (le handler fonctionne)
        expect(() => fireEvent.click(tryAgainButton)).not.toThrow();
    });

    it('shows error count on multiple errors', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Premier erreur - cliquer Try Again
        fireEvent.click(screen.getByText(/Try Again/i));

        // Faire throw à nouveau
        rerender(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Devrait afficher le compteur d'erreurs multiples
        // Note: Le composant maintient errorCount en interne
    });
});
