/**
 * TimeoutNotification - Notification de timeout worker (Tâche 2.2)
 * 
 * Affiche une notification quand le worker Python ne répond pas dans les délais.
 * Objectif: Améliorer l'expérience utilisateur en cas de problème de communication IPC.
 * 
 * Écoute l'événement 'worker-timeout' émis par python_bridge.rs
 */
import React, { useState, useEffect } from 'react';
import { AlertOctagon, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';

export const TimeoutNotification = ({ language = 'fr' }) => {
    const [timeouts, setTimeouts] = useState([]);

    useEffect(() => {
        // Écouter les événements de timeout depuis Rust
        const unlisten = listen('worker-timeout', (event) => {
            const { cmd, timeout_secs, timestamp, request_id } = event.payload;

            // Ajouter le nouveau timeout à la liste
            const newTimeout = {
                id: request_id || Date.now(),
                cmd,
                timeout_secs,
                timestamp,
                shown: true
            };

            setTimeouts(prev => [...prev, newTimeout]);

            // Auto-dismiss après 8 secondes
            setTimeout(() => {
                setTimeouts(prev => prev.filter(t => t.id !== newTimeout.id));
            }, 8000);
        });

        return () => {
            unlisten.then(fn => fn());
        };
    }, []);

    const dismissTimeout = (id) => {
        setTimeouts(prev => prev.filter(t => t.id !== id));
    };

    if (timeouts.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-16 right-4 z-50 space-y-2 max-w-md">
            {timeouts.map(timeout => (
                <TimeoutCard
                    key={timeout.id}
                    timeout={timeout}
                    onDismiss={() => dismissTimeout(timeout.id)}
                    language={language}
                />
            ))}
        </div>
    );
};

const TimeoutCard = ({ timeout, onDismiss, language }) => {
    const [showDetails, setShowDetails] = useState(false);

    const translations = {
        fr: {
            title: "Le worker ne répond pas",
            subtitle: "Timeout de communication détecté",
            command: "Commande",
            timeoutDuration: "Délai d'attente",
            timestamp: "Horodatage",
            dismiss: "Fermer",
            showDetails: "Détails",
            hideDetails: "Masquer",
            seconds: "secondes"
        },
        en: {
            title: "Worker not responding",
            subtitle: "Communication timeout detected",
            command: "Command",
            timeoutDuration: "Timeout duration",
            timestamp: "Timestamp",
            dismiss: "Dismiss",
            showDetails: "Details",
            hideDetails: "Hide",
            seconds: "seconds"
        }
    };

    const t = translations[language] || translations.en;

    return (
        <div className="
      bg-gradient-to-br from-orange-500/10 to-red-500/10
      backdrop-blur-md border border-orange-500/30
      rounded-xl p-4 shadow-2xl
      animate-slide-in-right
    ">
            <div className="flex items-start gap-3">
                <AlertOctagon className="text-orange-400 flex-shrink-0 mt-0.5" size={20} />

                <div className="flex-1 min-w-0">
                    {/* Titre */}
                    <h4 className="font-bold text-orange-400 text-sm mb-1">
                        {t.title}
                    </h4>

                    {/* Sous-titre */}
                    <p className="text-white/70 text-xs mb-2">
                        {t.subtitle}
                    </p>

                    {/* Commande timeout */}
                    <div className="bg-black/30 rounded-lg px-2 py-1.5 mb-3">
                        <code className="text-orange-300 text-xs font-mono">
                            {timeout.cmd}
                        </code>
                        <span className="text-white/50 text-xs ml-2">
                            ({timeout.timeout_secs} {t.seconds})
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="
                px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-white/5 hover:bg-white/10 text-white/70
                border border-white/10
                transition-all hover:scale-105 active:scale-95
                flex items-center gap-1.5
              "
                        >
                            {showDetails ? t.hideDetails : t.showDetails}
                            {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        <button
                            onClick={onDismiss}
                            className="
                px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-white/5 hover:bg-white/10 text-white/60
                transition-all hover:scale-105 active:scale-95
                flex items-center gap-1.5
              "
                        >
                            <XCircle size={12} />
                            {t.dismiss}
                        </button>
                    </div>

                    {/* Détails expandables */}
                    {showDetails && (
                        <div className="mt-3 pt-3 border-t border-orange-500/20">
                            <div className="space-y-2 text-xs text-white/60">
                                <div className="flex items-center gap-2">
                                    <Clock size={12} className="text-orange-400" />
                                    <span className="font-semibold">{t.timestamp}:</span>
                                    <span className="font-mono">
                                        {new Date(timeout.timestamp).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}
                                    </span>
                                </div>
                                <div className="bg-black/20 rounded p-2 font-mono text-[10px] text-white/50">
                                    Request ID: {timeout.id}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimeoutNotification;
