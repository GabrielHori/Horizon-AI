/**
 * ErrorBoundary - Composant React pour capturer les erreurs non gérées
 * 
 * Responsabilités:
 * - Capturer les erreurs JavaScript dans les composants enfants
 * - Afficher une UI de fallback élégante
 * - Logger l'erreur pour debug
 * - Permettre à l'utilisateur de recharger ou revenir à l'accueil
 * 
 * Usage: Wrapper autour de l'application dans main.jsx
 */
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0
        };
    }

    static getDerivedStateFromError(error) {
        // Mettre à jour l'état pour afficher l'UI de fallback
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Logger l'erreur dans la console
        console.error('🔴 ErrorBoundary caught an error:', error, errorInfo);

        // Mettre à jour l'état avec les détails de l'erreur
        this.setState(prevState => ({
            error,
            errorInfo,
            errorCount: prevState.errorCount + 1
        }));

        // Optionnel : Envoyer à un service de monitoring (Sentry, etc.)
        // if (window.errorTracker) {
        //   window.errorTracker.captureException(error, { extra: errorInfo });
        // }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        this.handleReset();
        // Si vous utilisez React Router, naviguer vers la home
        // navigate('/');
    };

    render() {
        if (this.state.hasError) {
            const { error, errorInfo, errorCount } = this.state;
            const isDarkMode = document.documentElement.classList.contains('dark');

            return (
                <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-500 ${isDarkMode ? 'bg-[#0A0A0A] text-white' : 'bg-gray-50 text-slate-900'
                    }`}>
                    <div className={`max-w-2xl w-full p-8 rounded-3xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xl'
                        }`}>
                        {/* Header avec icône d'erreur */}
                        <div className="flex items-start gap-4 mb-6">
                            <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-red-500/20' : 'bg-red-50'
                                }`}>
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
                                    Oops! Something Went Wrong
                                </h1>
                                <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-600'}`}>
                                    An unexpected error occurred in the application. Don't worry, your data is safe.
                                </p>
                            </div>
                        </div>

                        {/* Détails de l'erreur (mode debug) */}
                        {process.env.NODE_ENV === 'development' && error && (
                            <div className={`p-4 rounded-xl mb-6 font-mono text-xs overflow-auto max-h-64 ${isDarkMode ? 'bg-black/40 border border-white/5' : 'bg-slate-50 border border-slate-200'
                                }`}>
                                <div className="text-red-500 font-bold mb-2">
                                    {error.toString()}
                                </div>
                                {errorInfo && (
                                    <div className={isDarkMode ? 'text-white/40' : 'text-slate-500'}>
                                        {errorInfo.componentStack}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Badge si erreurs multiples */}
                        {errorCount > 1 && (
                            <div className={`p-3 rounded-xl mb-6 text-xs ${isDarkMode ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' : 'bg-orange-50 border border-orange-200 text-orange-700'
                                }`}>
                                ⚠️ <strong>Multiple errors detected ({errorCount})</strong> - Consider reloading the application.
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={this.handleReset}
                                className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-95 ${isDarkMode
                                        ? 'bg-white/10 hover:bg-white/20 text-white'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                                    }`}
                            >
                                <Home size={16} className="inline mr-2" />
                                Try Again
                            </button>

                            <button
                                onClick={this.handleReload}
                                className="flex-1 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-95 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg"
                            >
                                <RefreshCw size={16} className="inline mr-2" />
                                Reload App
                            </button>
                        </div>

                        {/* Footer */}
                        <div className={`mt-6 pt-6 border-t text-center text-xs ${isDarkMode ? 'border-white/5 text-white/40' : 'border-slate-200 text-slate-400'
                            }`}>
                            If the problem persists, please contact support or check the console for details.
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
