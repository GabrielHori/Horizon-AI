import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, Clock, WifiOff, Shield, KeyRound } from "lucide-react";
import { useAnimeMotion } from "../hooks/useAnimeMotion";
import {
  activateLicense,
  defaultLicenseState,
  fetchLicenseStatus,
  getReduceAnimationsPref,
  refreshLicense,
  setReduceAnimationsPref,
} from "../state/licenseStore";

const stateLabel = {
  free: { text: "Free", tone: "text-gray-500" },
  active: { text: "Pro actif", tone: "text-emerald-500" },
  grace: { text: "Grace offline", tone: "text-amber-500" },
  expired: { text: "Expiré", tone: "text-red-500" },
  error: { text: "Erreur licence", tone: "text-red-500" },
};

export default function LicensePage() {
  const [license, setLicense] = useState(defaultLicenseState);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [reduceAnimations, setReduceAnimations] = useState(getReduceAnimationsPref());
  const [statusMessage, setStatusMessage] = useState(null);

  const refs = {
    card: useRef(null),
    panel: useRef(null),
    badge: useRef(null),
    cta: useRef(null),
    check: useRef(null),
  };

  const visualState = useMemo(() => {
    if (license.error) return "error";
    if (license.state === "grace") return "grace";
    if (license.state === "expired") return "expired";
    if (license.plan && license.plan.startsWith("pro")) return "success";
    return license.state || "free";
  }, [license]);

  useAnimeMotion(visualState, refs, reduceAnimations);

  useEffect(() => {
    const load = async () => {
      const status = await fetchLicenseStatus();
      setLicense(status);
      setLoading(false);
    };
    load();
  }, []);

  const handleActivate = async () => {
    setActivating(true);
    const status = await activateLicense(licenseKey.trim());
    setLicense(status);
    setActivating(false);
    setStatusMessage(status.error ? "Activation échouée" : "Licence activée (mock local)");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const status = await refreshLicense();
    setLicense(status);
    setRefreshing(false);
    setStatusMessage(status.error ? "Rafraîchissement échoué" : "Statut rafraîchi (mock local)");
  };

  const toggleReduceAnimations = () => {
    const next = !reduceAnimations;
    setReduceAnimations(next);
    setReduceAnimationsPref(next);
  };

  const stateInfo = stateLabel[license.state] || stateLabel.free;

  return (
    <div className="p-6 w-full h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Horizon AI</p>
            <h1 className="text-3xl font-black tracking-tight">Licence & Activation</h1>
            <p className="text-sm text-gray-500">Mode local-first avec grâce offline et vérification cryptographique.</p>
          </div>
          <button
            type="button"
            onClick={toggleReduceAnimations}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition"
          >
            {reduceAnimations ? "Animations réduites" : "Animations actives"}
          </button>
        </header>

        <div
          ref={refs.card}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4"
        >
          {statusMessage && (
            <div className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
              {statusMessage}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gray-100">
                <Shield size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Statut</p>
                <div className="flex items-center gap-2">
                  <strong className="text-lg">{stateInfo.text}</strong>
                  <span
                    ref={refs.badge}
                    className={`text-xs font-semibold px-2 py-1 rounded-md ${stateInfo.tone} bg-gray-100`}
                  >
                    {license.plan}
                  </span>
                </div>
              </div>
            </div>
            {visualState === "success" && (
              <CheckCircle2 ref={refs.check} size={24} className="text-emerald-500" />
            )}
            {visualState === "error" && (
              <AlertTriangle size={24} className="text-red-500" />
            )}
          </div>

          <div ref={refs.panel} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <InfoItem label="Plan" value={license.plan || "free"} />
            <InfoItem label="Expiration" value={license.expires_at || "n/a"} />
            <InfoItem label="Dernière vérif." value={license.last_verified_at || "n/a"} />
            <InfoItem label="Grace (jours)" value={license.grace_days ?? "n/a"} />
            <InfoItem label="Fingerprint" value={license.device_fingerprint || "non lié"} />
            <InfoItem label="État" value={license.state || "free"} />
          </div>

          {license.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{license.error}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <KeyRound size={18} /> Activer une licence
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="AAAA-BBBB-CCCC-DDDD"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              disabled={activating}
            />
            <button
              type="button"
              onClick={handleActivate}
              disabled={!licenseKey || activating}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50"
            >
              {activating ? "Activation..." : "Activer"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={<RefreshCw size={14} />}
              label="Rafraîchir"
              onClick={handleRefresh}
              busy={refreshing}
            />
            <ActionButton icon={<WifiOff size={14} />} label="Mode offline / Grace" onClick={() => {}} />
            <ActionButton icon={<Clock size={14} />} label="Restaurer" onClick={() => {}} />
            <ActionButton icon={<AlertTriangle size={14} />} label="Désactiver" onClick={() => {}} tone="danger" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-2 text-sm text-gray-600">
          <p>Modes supportés :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Free : fonctionnalités limitées, aucune clé requise.</li>
            <li>Pro Mensuel : vérification périodique, mode grace offline.</li>
            <li>Pro À vie : activation unique, vérification rare.</li>
          </ul>
        </div>

        {loading && (
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin" /> Chargement du statut...
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-800 break-all">{value}</p>
    </div>
  );
}

function ActionButton({ icon, label, onClick, busy, tone = "default" }) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 text-red-600 hover:border-red-300"
      : "border-gray-200 text-gray-700 hover:border-gray-300";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition ${toneClass} disabled:opacity-50`}
    >
      {busy ? <RefreshCw size={12} className="animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  );
}
