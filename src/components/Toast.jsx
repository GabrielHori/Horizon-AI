/**
 * Toast - Système de notifications centralisé
 * 
 * Responsabilités:
 * - Afficher des notifications non-intrusives (success, error, warning, info)
 * - Auto-dismiss après timeout configurable
 * - Empilage multiple de toasts
 * - Animations fluides d'entrée/sortie
 * 
 * Usage:
 * import { showToast } from './components/Toast';
 * showToast.success('Operation completed!');
 * showToast.error('Something went wrong');
 */
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// Types de toast
const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Configuration par type
const TOAST_CONFIG = {
    [TOAST_TYPES.SUCCESS]: {
        icon: CheckCircle,
        colorClass: 'bg-emerald-500',
        borderClass: 'border-emerald-500/30',
        bgClass: 'bg-emerald-500/10'
    },
    [TOAST_TYPES.ERROR]: {
        icon: XCircle,
        colorClass: 'bg-red-500',
        borderClass: 'border-red-500/30',
        bgClass: 'bg-red-500/10'
    },
    [TOAST_TYPES.WARNING]: {
        icon: AlertTriangle,
        colorClass: 'bg-orange-500',
        borderClass: 'border-orange-500/30',
        bgClass: 'bg-orange-500/10'
    },
    [TOAST_TYPES.INFO]: {
        icon: Info,
        colorClass: 'bg-blue-500',
        borderClass: 'border-blue-500/30',
        bgClass: 'bg-blue-500/10'
    }
};

// Composant Toast individuel
const Toast = ({ id, type, message, duration, onClose }) => {
    const { isDarkMode } = useTheme();
    const [isExiting, setIsExiting] = useState(false);

    const config = TOAST_CONFIG[type] || TOAST_CONFIG[TOAST_TYPES.INFO];
    const Icon = config.icon;

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose(id);
        }, 300); // Durée de l'animation de sortie
    };

    return (
        <div
            className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md
        transform transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        ${isDarkMode ? `${config.bgClass} ${config.borderClass}` : 'bg-white border-slate-200 shadow-lg'}
      `}
            style={{ minWidth: '300px', maxWidth: '500px' }}
        >
            <Icon className={`flex-shrink-0 ${config.colorClass.replace('bg-', 'text-')}`} size={20} />

            <div className="flex-1 text-sm font-medium">
                {message}
            </div>

            <button
                onClick={handleClose}
                className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                    }`}
            >
                <X size={16} className={isDarkMode ? 'text-white/60' : 'text-slate-400'} />
            </button>
        </div>
    );
};

// Container pour les toasts
const ToastContainer = forwardRef((props, ref) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (type, message, duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message, duration }]);
        return id;
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    useImperativeHandle(ref, () => ({
        success: (message, duration) => addToast(TOAST_TYPES.SUCCESS, message, duration),
        error: (message, duration) => addToast(TOAST_TYPES.ERROR, message, duration),
        warning: (message, duration) => addToast(TOAST_TYPES.WARNING, message, duration),
        info: (message, duration) => addToast(TOAST_TYPES.INFO, message, duration)
    }));

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            <div className="pointer-events-auto space-y-2">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        id={toast.id}
                        type={toast.type}
                        message={toast.message}
                        duration={toast.duration}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </div>
    );
});

ToastContainer.displayName = 'ToastContainer';

// Singleton pour gérer les toasts globalement
let toastContainerRef = null;

// Initialiser le container au chargement
if (typeof window !== 'undefined') {
    const toastElement = document.createElement('div');
    toastElement.id = 'toast-root';
    document.body.appendChild(toastElement);

    const root = createRoot(toastElement);
    root.render(<ToastContainer ref={(ref) => { toastContainerRef = ref; }} />);
}

// API publique pour afficher des toasts
export const showToast = {
    success: (message, duration = 3000) => {
        if (toastContainerRef) {
            toastContainerRef.success(message, duration);
        } else {
            console.warn('[Toast] Container not initialized, falling back to console.log');
            console.log('[SUCCESS]', message);
        }
    },
    error: (message, duration = 5000) => {
        if (toastContainerRef) {
            toastContainerRef.error(message, duration);
        } else {
            console.error('[ERROR]', message);
        }
    },
    warning: (message, duration = 4000) => {
        if (toastContainerRef) {
            toastContainerRef.warning(message, duration);
        } else {
            console.warn('[WARNING]', message);
        }
    },
    info: (message, duration = 3000) => {
        if (toastContainerRef) {
            toastContainerRef.info(message, duration);
        } else {
            console.info('[INFO]', message);
        }
    }
};

export default ToastContainer;
