/**
 * Tests pour MessageBubble component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageBubble } from '../components/AIChatPanel/components/MessageBubble';
import { ThemeProvider } from '../contexts/ThemeContext';

// Wrapper avec ThemeProvider
const renderWithTheme = (component) => {
    return render(
        <ThemeProvider>
            {component}
        </ThemeProvider>
    );
};

// Mock navigator.clipboard
const mockClipboard = {
    writeText: vi.fn(() => Promise.resolve()),
};
Object.assign(navigator, { clipboard: mockClipboard });

describe('MessageBubble', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('User messages', () => {
        it('renders user message content', () => {
            const msg = { role: 'user', content: 'Hello AI!' };

            renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                />
            );

            expect(screen.getByText('Hello AI!')).toBeInTheDocument();
        });

        it('aligns user messages to the right', () => {
            const msg = { role: 'user', content: 'User message' };

            const { container } = renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                />
            );

            const wrapper = container.firstChild;
            expect(wrapper.className).toContain('justify-end');
        });

        it('displays attached image when present', () => {
            const msg = {
                role: 'user',
                content: 'Check this image',
                image: 'data:image/png;base64,test'
            };

            renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                />
            );

            const img = screen.getByAltText('Upload');
            expect(img).toBeInTheDocument();
            expect(img.src).toContain('data:image/png');
        });
    });

    describe('Assistant messages', () => {
        it('renders assistant message content', () => {
            const msg = { role: 'assistant', content: 'Hello human!' };

            renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                />
            );

            expect(screen.getByText('Hello human!')).toBeInTheDocument();
        });

        it('aligns assistant messages to the left', () => {
            const msg = { role: 'assistant', content: 'AI response' };

            const { container } = renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                />
            );

            const wrapper = container.firstChild;
            expect(wrapper.className).toContain('justify-start');
        });

        it('displays model name when present', () => {
            const msg = {
                role: 'assistant',
                content: 'Response',
                model: 'llama3.2'
            };

            renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                />
            );

            expect(screen.getByText('llama3.2')).toBeInTheDocument();
        });

        it('renders markdown content', () => {
            const msg = {
                role: 'assistant',
                content: '**Bold text** and *italic*'
            };

            renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                />
            );

            expect(screen.getByText('Bold text')).toBeInTheDocument();
            expect(screen.getByText('italic')).toBeInTheDocument();
        });
    });

    describe('Error messages', () => {
        it('displays error styling for error messages', () => {
            const msg = {
                role: 'assistant',
                content: 'Something went wrong',
                isError: true
            };

            renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                />
            );

            expect(screen.getByText('Error')).toBeInTheDocument();
            expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        });

        it('displays French error label when language is fr', () => {
            const msg = {
                role: 'assistant',
                content: 'Erreur serveur',
                isError: true
            };

            renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="fr"
                />
            );

            expect(screen.getByText('Erreur')).toBeInTheDocument();
        });

        it('shows retry button for error messages', () => {
            const onRetry = vi.fn();
            const msg = {
                role: 'assistant',
                content: 'Error occurred',
                isError: true
            };

            renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                    onRetry={onRetry}
                />
            );

            // Le bouton retry devrait exister (même s'il est caché par défaut)
            const retryButton = screen.getByTitle('Retry');
            expect(retryButton).toBeInTheDocument();
        });
    });

    describe('Copy functionality', () => {
        it('copies message content to clipboard', async () => {
            const msg = { role: 'assistant', content: 'Copy this text' };

            renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                />
            );

            const copyButton = screen.getByTitle('Copy');
            fireEvent.click(copyButton);

            await waitFor(() => {
                expect(mockClipboard.writeText).toHaveBeenCalledWith('Copy this text');
            });
        });

        it('calls onCopy callback when provided', async () => {
            const onCopy = vi.fn();
            const msg = { role: 'assistant', content: 'Some content' };

            renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                    onCopy={onCopy}
                />
            );

            const copyButton = screen.getByTitle('Copy');
            fireEvent.click(copyButton);

            await waitFor(() => {
                expect(onCopy).toHaveBeenCalled();
            });
        });
    });

    describe('Theme support', () => {
        it('applies dark mode styles when isDarkMode is true', () => {
            const msg = { role: 'user', content: 'Dark mode message' };

            const { container } = renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={true}
                    language="en"
                />
            );

            // Le composant devrait être rendu (vérification basique)
            expect(container.firstChild).toBeInTheDocument();
        });

        it('applies light mode styles when isDarkMode is false', () => {
            const msg = { role: 'user', content: 'Light mode message' };

            const { container } = renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={0}
                    isDarkMode={false}
                    language="en"
                />
            );

            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe('Animation delay', () => {
        it('applies animation delay based on index', () => {
            const msg = { role: 'user', content: 'Delayed message' };

            const { container } = renderWithTheme(
                <MessageBubble
                    msg={msg}
                    index={5}
                    isDarkMode={true}
                    language="en"
                />
            );

            const wrapper = container.firstChild;
            expect(wrapper.style.animationDelay).toBe('250ms');
        });
    });
});
