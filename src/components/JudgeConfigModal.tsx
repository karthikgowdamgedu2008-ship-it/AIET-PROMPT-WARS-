import React, { useState } from 'react';
import {
  KeyRound,
  Database,
  Sparkles,
  CheckCircle2,
  X,
  RotateCcw,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ApiConfig } from '../types/civic';
import { sanitizeInput } from '../utils/security';

interface JudgeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSaveConfig: (newConfig: ApiConfig) => void;
  onResetDataset: () => Promise<void>;
  dbMode: 'live-supabase' | 'local-mirrored';
}

export const JudgeConfigModal: React.FC<JudgeConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetDataset,
  dbMode,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState(config.supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(config.supabaseAnonKey);
  const [geminiApiKey, setGeminiApiKey] = useState(config.geminiApiKey);
  const [showSecrets, setShowSecrets] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent): void => {
    e.preventDefault();
    onSaveConfig({
      supabaseUrl: sanitizeInput(supabaseUrl.trim(), 300),
      supabaseAnonKey: sanitizeInput(supabaseAnonKey.trim(), 500),
      geminiApiKey: sanitizeInput(geminiApiKey.trim(), 300),
    });
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  const handleReset = async (): Promise<void> => {
    setResetting(true);
    await onResetDataset();
    setResetting(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judge-config-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
              aria-hidden="true"
            >
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="judge-config-modal-title"
                className="text-lg font-bold text-white flex items-center gap-2"
              >
                API Configuration / Judge Settings
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-medium text-cyan-300 border border-cyan-500/30">
                  Live Override Ready
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Override <code className="text-cyan-300">VITE_GEMINI_API_KEY</code> or Supabase credentials at runtime without rebuilding
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close API Configuration Modal"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Status Banner */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            role="status"
            aria-live="polite"
          >
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex items-start gap-3">
              <Sparkles
                className="h-5 w-5 text-amber-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-200">
                  Gemini 2.5 Flash Engine
                </div>
                <div className="text-slate-300 mt-0.5">
                  {geminiApiKey.trim().length > 10 ? (
                    <span className="text-emerald-400 font-medium">
                      Active API Key Configured (Live Multimodal/JSON)
                    </span>
                  ) : (
                    <span className="text-amber-300">
                      No Key Entered — Using Deterministic Hybrid NLP/Haversine Fallback
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex items-start gap-3">
              <Database
                className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-200">
                  Supabase Persistence (`public.reports`)
                </div>
                <div className="text-slate-300 mt-0.5">
                  {dbMode === 'live-supabase' ? (
                    <span className="text-emerald-400 font-medium">
                      Connected to Live Supabase PostgreSQL
                    </span>
                  ) : (
                    <span className="text-cyan-300">
                      Synced Local Mirror + Ready for Supabase URL/Key
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Toggle visibility */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-300">
              Runtime Environment Credentials
            </span>
            <button
              type="button"
              onClick={() => setShowSecrets(!showSecrets)}
              aria-pressed={showSecrets}
              aria-label={showSecrets ? 'Hide API keys' : 'Show API keys'}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200"
            >
              {showSecrets ? (
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {showSecrets ? 'Hide Keys' : 'Show Keys'}
            </button>
          </div>

          {/* Gemini Key */}
          <div>
            <label
              htmlFor="judge-gemini-key-input"
              className="block text-xs font-semibold text-slate-200 mb-1.5"
            >
              Google Gemini API Key (<code className="text-amber-300">VITE_GEMINI_API_KEY</code>)
            </label>
            <input
              id="judge-gemini-key-input"
              type={showSecrets ? 'text' : 'password'}
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              aria-required="false"
              aria-describedby="judge-gemini-key-help"
              placeholder="AIzaSy... (Leave blank to test Deterministic Hybrid Fallback)"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none font-mono"
            />
            <p id="judge-gemini-key-help" className="mt-1 text-[11px] text-slate-300">
              Calls <code className="text-slate-200">https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent</code> with structured JSON schema & base64 Vision.
            </p>
          </div>

          {/* Supabase URL & Anon Key */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="judge-supabase-url-input"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                Supabase Project URL (<code className="text-cyan-300">VITE_SUPABASE_URL</code>)
              </label>
              <input
                id="judge-supabase-url-input"
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                aria-required="false"
                aria-describedby="judge-supabase-url-help"
                placeholder="https://xyzcompany.supabase.co"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none font-mono"
              />
              <span id="judge-supabase-url-help" className="sr-only">
                Enter your Supabase project URL
              </span>
            </div>

            <div>
              <label
                htmlFor="judge-supabase-key-input"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                Supabase Anon Key (<code className="text-cyan-300">VITE_SUPABASE_ANON_KEY</code>)
              </label>
              <input
                id="judge-supabase-key-input"
                type={showSecrets ? 'text' : 'password'}
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                aria-required="false"
                aria-describedby="judge-supabase-key-help"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none font-mono"
              />
              <span id="judge-supabase-key-help" className="sr-only">
                Enter your Supabase anonymous public key
              </span>
            </div>
          </div>

          {/* Judge Safety Note */}
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5">
            <ShieldCheck
              className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <span className="font-semibold">Zero-Failure Judging Guarantee:</span> If a Gemini API key is omitted or hits rate limits, CivicPulse AI automatically executes its local Haversine (<code className="text-emerald-300">&lt;250m</code>) + Cosine Similarity NLP fallback and explicitly badges every output card with its exact execution source.
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              aria-label="Reset and re-seed 30 baseline Bengaluru civic reports"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {resetting
                ? 'Restoring 30 Baseline Reports...'
                : 'Reset / Re-Seed 30 Baseline Reports'}
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Cancel configuration changes"
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                aria-label="Save and apply API configuration"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {savedNotice ? 'Configuration Saved!' : 'Save & Apply Configuration'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
