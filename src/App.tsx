import React, { useState, useEffect } from 'react';
import {
  Send,
  BrainCircuit,
  Radar,
  CheckSquare,
  ShieldCheck,
  KeyRound,
  Activity,
  Database,
  Sparkles,
  AlertOctagon,
  GitMerge,
  Layers,
} from 'lucide-react';
import { ApiConfig, CivicReport } from './types/civic';
import {
  fetchAllReports,
  getStoredConfig,
  resetOrSeedBaselineDataset,
  saveStoredConfig,
} from './services/supabaseClient';
import { JudgeConfigModal } from './components/JudgeConfigModal';
import { CaptureTab } from './components/CaptureTab';
import { UnderstandTab } from './components/UnderstandTab';
import { RevealTab } from './components/RevealTab';
import { ActTab } from './components/ActTab';
import { HonestyTab } from './components/HonestyTab';

type NavTabId = 'capture' | 'understand' | 'reveal' | 'act' | 'honesty';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('capture');
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() =>
    getStoredConfig()
  );
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [dbMode, setDbMode] = useState<'live-supabase' | 'local-mirrored'>(
    'local-mirrored'
  );
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Cross-tab deep linking states
  const [highlightedUnderstandId, setHighlightedUnderstandId] = useState<
    string | null
  >(null);
  const [focusedClusterId, setFocusedClusterId] = useState<string | null>(null);
  const [trackedReportId, setTrackedReportId] = useState<string | null>(null);
  const [actInitialMode, setActInitialMode] = useState<'AUTHORITY' | 'CITIZEN'>(
    'AUTHORITY'
  );

  useEffect(() => {
    let mounted = true;
    fetchAllReports(apiConfig).then((res) => {
      if (!mounted) return;
      setReports(res.reports);
      setDbMode(res.mode);
    });
    return () => {
      mounted = false;
    };
  }, [apiConfig]);

  const handleSaveConfig = (newConfig: ApiConfig): void => {
    saveStoredConfig(newConfig);
    setApiConfig(newConfig);
  };

  const handleResetDataset = async (): Promise<void> => {
    const res = await resetOrSeedBaselineDataset(apiConfig);
    setReports(res.reports);
    setDbMode(res.mode);
  };

  const handleReportCreated = (newReport: CivicReport): void => {
    setReports((prev) => [
      newReport,
      ...prev.filter((r) => r.id !== newReport.id),
    ]);
  };

  const criticalCount = reports.filter(
    (r) => r.ai_priority === 'Critical'
  ).length;
  const duplicateCount = reports.filter((r) => r.duplicate_of !== null).length;

  const NAV_TABS: {
    id: NavTabId;
    step: string;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'capture',
      step: '01',
      label: 'Capture',
      subtitle: 'Citizen Report Form (<60s)',
      icon: <Send className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'understand',
      step: '02',
      label: 'Understand',
      subtitle: 'AI Triage & Pipeline Inspector',
      icon: <BrainCircuit className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'reveal',
      step: '03',
      label: 'Reveal',
      subtitle: 'Hotspot Map & AI Action Briefs',
      icon: <Radar className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'act',
      step: '04',
      label: 'Act',
      subtitle: 'Workflow & Citizen Tracker',
      icon: <CheckSquare className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'honesty',
      step: '05',
      label: 'Honesty & Architecture',
      subtitle: "Judge's Rubric Note",
      icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Visible-on-focus WCAG AA Skip to Main Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10000] focus:rounded-xl focus:bg-cyan-400 focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-slate-950 focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Sleek Command-Center Header */}
      <header
        role="banner"
        className="sticky top-0 z-50 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3.5 gap-3">
            {/* Brand Identity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25"
                  aria-hidden="true"
                >
                  <Activity className="h-6 w-6 text-white" aria-hidden="true" />
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                      CivicPulse <span className="text-cyan-400">AI</span>
                    </h1>
                    <span className="hidden sm:inline-block rounded-md bg-cyan-500/15 px-2 py-0.5 text-[11px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                      From Complaints to Action
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Bengaluru Municipal Decision-Intelligence, Explainable Triage & Compound Hotspot Synthesis
                  </p>
                </div>
              </div>

              {/* Mobile Judge Settings Button */}
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                aria-label="Open API Configuration and Judge Settings modal"
                className="lg:hidden inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-300"
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Judge Settings
              </button>
            </div>

            {/* Live Telemetry Pills + API Configuration / Judge Settings Button */}
            <div
              className="flex flex-wrap items-center gap-2.5"
              role="status"
              aria-live="polite"
              aria-label="Live municipal telemetry summary"
            >
              {/* Telemetry Pill 1: Critical Alerts */}
              <div className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-1.5 text-xs">
                <AlertOctagon
                  className="h-3.5 w-3.5 text-red-400"
                  aria-hidden="true"
                />
                <span className="text-slate-200">Critical:</span>
                <span className="font-mono font-bold text-red-300">
                  {criticalCount}
                </span>
              </div>

              {/* Telemetry Pill 2: Active Clusters */}
              <div className="flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-950/20 px-3 py-1.5 text-xs">
                <Layers
                  className="h-3.5 w-3.5 text-orange-400"
                  aria-hidden="true"
                />
                <span className="text-slate-200">Clusters:</span>
                <span className="font-mono font-bold text-orange-300">3</span>
              </div>

              {/* Telemetry Pill 3: Duplicates Caught */}
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-1.5 text-xs">
                <GitMerge
                  className="h-3.5 w-3.5 text-amber-400"
                  aria-hidden="true"
                />
                <span className="text-slate-200">Duplicates:</span>
                <span className="font-mono font-bold text-amber-300">
                  {duplicateCount}
                </span>
              </div>

              {/* DB & AI Status Pill */}
              <div className="hidden xl:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs">
                <Database
                  className="h-3.5 w-3.5 text-cyan-400"
                  aria-hidden="true"
                />
                <span className="text-slate-200 font-medium">
                  {dbMode === 'live-supabase'
                    ? 'Supabase Live'
                    : `Synced Store (${reports.length})`}
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  |
                </span>
                <Sparkles
                  className="h-3.5 w-3.5 text-amber-400"
                  aria-hidden="true"
                />
                <span className="text-cyan-300 font-medium">
                  {apiConfig.geminiApiKey.trim().length > 10
                    ? 'Gemini 2.5 Live'
                    : 'Hybrid Fallback'}
                </span>
              </div>

              {/* API Configuration / Judge Settings Modal Trigger */}
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                aria-label="Open API Configuration and Judge Settings modal"
                className="hidden lg:inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/70 to-slate-900 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:border-cyan-400 hover:bg-cyan-950 transition shadow-sm"
              >
                <KeyRound
                  className="h-3.5 w-3.5 text-cyan-400"
                  aria-hidden="true"
                />
                API Configuration / Judge Settings
              </button>
            </div>
          </div>

          {/* 5 Core Navigation Tabs */}
          <nav
            aria-label="Primary Civic Lifecycle Navigation"
            className="border-t border-slate-900"
          >
            <div
              role="tablist"
              aria-label="CivicPulse AI 5-Stage Lifecycle Tabs"
              className="flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar"
            >
              {NAV_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    aria-label={`${tab.step} ${tab.label}: ${tab.subtitle}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-left transition shrink-0 border ${
                      isActive
                        ? 'border-cyan-500/60 bg-cyan-500/15 text-white shadow-md shadow-cyan-500/10'
                        : 'border-transparent bg-slate-900/50 text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 group-hover:text-white'
                      }`}
                    >
                      {tab.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-cyan-300 font-bold">
                          {tab.step}
                        </span>
                        <span className="text-xs font-bold tracking-tight">
                          {tab.label}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 hidden sm:block">
                        {tab.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main
        id="main-content"
        role="main"
        className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6"
      >
        {activeTab === 'capture' && (
          <div
            id="panel-capture"
            role="tabpanel"
            aria-labelledby="tab-capture"
          >
            <CaptureTab
              reports={reports}
              apiConfig={apiConfig}
              onReportCreated={handleReportCreated}
              onNavigateToTrack={(reportId) => {
                setTrackedReportId(reportId);
                setActInitialMode('CITIZEN');
                setActiveTab('act');
              }}
              onNavigateToInspect={(reportId) => {
                setHighlightedUnderstandId(reportId);
                setActiveTab('understand');
              }}
            />
          </div>
        )}

        {activeTab === 'understand' && (
          <div
            id="panel-understand"
            role="tabpanel"
            aria-labelledby="tab-understand"
          >
            <UnderstandTab
              reports={reports}
              apiConfig={apiConfig}
              highlightedReportId={highlightedUnderstandId}
              onUpdateReports={setReports}
              onNavigateToClusterMap={(clusterId) => {
                setFocusedClusterId(clusterId);
                setActiveTab('reveal');
              }}
            />
          </div>
        )}

        {activeTab === 'reveal' && (
          <div
            id="panel-reveal"
            role="tabpanel"
            aria-labelledby="tab-reveal"
          >
            <RevealTab
              reports={reports}
              apiConfig={apiConfig}
              initialClusterId={focusedClusterId}
              onSelectReportForAct={(reportId) => {
                setTrackedReportId(reportId);
                setActInitialMode('AUTHORITY');
                setActiveTab('act');
              }}
            />
          </div>
        )}

        {activeTab === 'act' && (
          <div id="panel-act" role="tabpanel" aria-labelledby="tab-act">
            <ActTab
              reports={reports}
              apiConfig={apiConfig}
              initialTrackedReportId={trackedReportId}
              initialViewMode={actInitialMode}
              onUpdateReports={setReports}
            />
          </div>
        )}

        {activeTab === 'honesty' && (
          <div
            id="panel-honesty"
            role="tabpanel"
            aria-labelledby="tab-honesty"
          >
            <HonestyTab
              apiConfig={apiConfig}
              dbMode={dbMode}
              totalReports={reports.length}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        role="contentinfo"
        className="border-t border-slate-900 bg-slate-950/90 py-4 px-4 sm:px-6 lg:px-8 mt-10"
      >
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-300">
          <div>
            CivicPulse AI: From Complaints to Action • Built with React, Tailwind CSS, Leaflet, Supabase & Gemini 2.5 Flash
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('honesty')}
              aria-label="View Section 7 and 8 Honesty and Failure Mode Disclosure"
              className="text-cyan-300 hover:underline font-medium"
            >
              Section 7 & 8 Honesty & Failure Mode Disclosure
            </button>
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              aria-label="Open API Configuration Settings"
              className="text-slate-200 hover:text-white"
            >
              Configure API Keys
            </button>
          </div>
        </div>
      </footer>

      {/* Judge Settings / API Configuration Modal */}
      <JudgeConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={apiConfig}
        onSaveConfig={handleSaveConfig}
        onResetDataset={handleResetDataset}
        dbMode={dbMode}
      />
    </div>
  );
}
export default App;
