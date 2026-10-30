import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  UserCheck,
  Building2,
  CheckCircle2,
  Clock,
  Save,
  Search,
  Sparkles,
  FileText,
  ArrowRight,
  ShieldCheck,
  Filter,
  MapPin,
} from 'lucide-react';
import {
  ApiConfig,
  CivicReport,
  ReportPriority,
  ReportStatus,
} from '../types';
import { updateReportInDb } from '../services/supabaseClient';
import { parseOrComputeFactorBreakdown } from '../services/aiTriageEngine';

const STATUS_STEPS: ReportStatus[] = [
  'Submitted',
  'Triaged',
  'Assigned',
  'In Progress',
  'Resolved',
];

const MUNICIPAL_DEPARTMENTS = [
  'BBMP Road Infrastructure & Rapid Response',
  'BBMP Storm Water Drain (SWD) Cell',
  'BWSSB Sanitary & Storm Engineering',
  'BESCOM Emergency Vigilance & O&M East',
  'Bengaluru Solid Waste Management Ltd (BSWML)',
  'BBMP Forest Cell & BESCOM Joint Squad',
  'BBMP Electrical & BTP Signal Automation',
  'Bengaluru Traffic Police & BBMP Projects',
  'BDA Structural Engineering & NHAI',
];

interface ActTabProps {
  reports: CivicReport[];
  apiConfig: ApiConfig;
  initialTrackedReportId: string | null;
  initialViewMode?: 'AUTHORITY' | 'CITIZEN';
  onUpdateReports: (updated: CivicReport[]) => void;
}

export const ActTab: React.FC<ActTabProps> = ({
  reports,
  apiConfig,
  initialTrackedReportId,
  initialViewMode = 'AUTHORITY',
  onUpdateReports,
}) => {
  const [viewMode, setViewMode] = useState<'AUTHORITY' | 'CITIZEN'>(
    initialViewMode
  );
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [clusterFilter, setClusterFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Authority inline editor states
  const [editingDrafts, setEditingDrafts] = useState<
    Record<
      string,
      {
        status: ReportStatus;
        assigned_department: string;
        resolution_notes: string;
      }
    >
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedToastId, setSavedToastId] = useState<string | null>(null);

  // Citizen Tracker state
  const [selectedCitizenReportId, setSelectedCitizenReportId] = useState<string>(
    initialTrackedReportId || (reports[0]?.id ?? '')
  );
  const [citizenSearch, setCitizenSearch] = useState('');

  useEffect(() => {
    if (initialTrackedReportId) {
      setSelectedCitizenReportId(initialTrackedReportId);
      setViewMode(initialViewMode);
    }
  }, [initialTrackedReportId, initialViewMode]);

  const getDraft = (report: CivicReport) => {
    return (
      editingDrafts[report.id] || {
        status: report.status,
        assigned_department:
          report.assigned_department || MUNICIPAL_DEPARTMENTS[0],
        resolution_notes: report.resolution_notes || '',
      }
    );
  };

  const handleDraftChange = (
    report: CivicReport,
    field: 'status' | 'assigned_department' | 'resolution_notes',
    value: string
  ) => {
    const current = getDraft(report);
    setEditingDrafts((prev) => ({
      ...prev,
      [report.id]: {
        ...current,
        [field]: value,
      },
    }));
  };

  const handlePersistReportUpdate = async (report: CivicReport) => {
    const draft = getDraft(report);
    setSavingId(report.id);

    await updateReportInDb(
      report.id,
      {
        status: draft.status,
        assigned_department: draft.assigned_department,
        resolution_notes: draft.resolution_notes,
      },
      apiConfig
    );

    const nextReports = reports.map((r) =>
      r.id === report.id
        ? {
            ...r,
            status: draft.status,
            assigned_department: draft.assigned_department,
            resolution_notes: draft.resolution_notes,
          }
        : r
    );
    onUpdateReports(nextReports);
    setSavingId(null);
    setSavedToastId(report.id);
    setTimeout(() => setSavedToastId(null), 2200);
  };

  const filteredAuthorityReports = [...reports]
    .sort((a, b) => (b.ai_priority_score || 0) - (a.ai_priority_score || 0))
    .filter((r) => {
      if (priorityFilter !== 'ALL' && r.ai_priority !== priorityFilter)
        return false;
      if (clusterFilter !== 'ALL') {
        if (clusterFilter === 'NONE' && r.cluster_id !== null) return false;
        if (clusterFilter !== 'NONE' && r.cluster_id !== clusterFilter)
          return false;
      }
      if (
        deptFilter !== 'ALL' &&
        !(r.assigned_department || '')
          .toLowerCase()
          .includes(deptFilter.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

  const activeCitizenReport =
    reports.find((r) => r.id === selectedCitizenReportId) || reports[0];
  const citizenFactors = activeCitizenReport
    ? parseOrComputeFactorBreakdown(activeCitizenReport)
    : null;

  const matchingCitizenLookupList = reports.filter((r) => {
    if (!citizenSearch.trim()) return true;
    const q = citizenSearch.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Switcher Bar: Authority Command Workflow vs Citizen Live Status Tracker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-cyan-400" />
            Decision-Maker Workflow & Citizen Live Progress Tracker
          </h2>
          <p className="text-xs text-slate-400">
            All department dispatches, status transitions, and resolution notes persist directly to <code className="text-cyan-300">public.reports</code> and sync with the Citizen Tracker.
          </p>
        </div>

        <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setViewMode('AUTHORITY')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              viewMode === 'AUTHORITY'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Authority Command Workflow
          </button>
          <button
            type="button"
            onClick={() => setViewMode('CITIZEN')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              viewMode === 'CITIZEN'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Citizen Live Status Tracker
          </button>
        </div>
      </div>

      {viewMode === 'AUTHORITY' ? (
        <div className="space-y-5">
          {/* Filters + Status Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="lg:col-span-7 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Filter className="h-3.5 w-3.5 text-cyan-400" />
                Filters:
              </span>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="Critical">Critical Only</option>
                <option value="High">High Only</option>
                <option value="Medium">Medium Only</option>
                <option value="Low">Low Only</option>
              </select>

              <select
                value={clusterFilter}
                onChange={(e) => setClusterFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Clusters & Standalone</option>
                <option value="CLUSTER-MG-DRAIN">CLUSTER-MG-DRAIN (MG Road)</option>
                <option value="CLUSTER-IND-POWER">CLUSTER-IND-POWER (Indiranagar)</option>
                <option value="CLUSTER-KOR-WASTE">CLUSTER-KOR-WASTE (Koramangala)</option>
                <option value="NONE">Standalone Tickets</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Municipal Agencies</option>
                <option value="BBMP">BBMP Wings</option>
                <option value="BESCOM">BESCOM (Electricity)</option>
                <option value="BWSSB">BWSSB (Water & Sewage)</option>
                <option value="BSWML">BSWML (Solid Waste)</option>
              </select>
            </div>

            {/* Pipeline Stage Counter Pills */}
            <div className="lg:col-span-5 flex flex-wrap justify-end gap-2">
              {STATUS_STEPS.map((st) => {
                const count = reports.filter((r) => r.status === st).length;
                return (
                  <div
                    key={st}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1 text-center"
                  >
                    <div className="text-[10px] text-slate-400">{st}</div>
                    <div className="text-xs font-extrabold text-cyan-300">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Authority Command Workflow Cards */}
          <div className="space-y-3.5">
            {filteredAuthorityReports.map((report) => {
              const draft = getDraft(report);
              const isSaving = savingId === report.id;
              const isSaved = savedToastId === report.id;

              return (
                <div
                  key={report.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-slate-700"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Ticket Context (5 Cols) */}
                    <div className="lg:col-span-5 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-xs font-black ${
                            report.ai_priority === 'Critical'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : report.ai_priority === 'High'
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              : 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                          }`}
                        >
                          {report.ai_priority} • {report.ai_priority_score}/100
                        </span>
                        <span className="rounded bg-slate-950 px-2 py-0.5 text-[11px] font-mono text-slate-400 border border-slate-800">
                          #{report.id.slice(-6)}
                        </span>
                        {report.cluster_id && (
                          <span className="rounded bg-red-500/15 px-2 py-0.5 text-[11px] font-mono text-red-300 border border-red-500/30">
                            {report.cluster_id}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white">
                        {report.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {report.ai_summary || report.description}
                      </p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{report.address}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCitizenReportId(report.id);
                          setViewMode('CITIZEN');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 pt-1"
                      >
                        Open in Citizen Live Tracker <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Editable Workflow Controls (7 Cols) */}
                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 rounded-xl p-4 border border-slate-800/90">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Workflow Status Stage
                        </label>
                        <select
                          value={draft.status}
                          onChange={(e) =>
                            handleDraftChange(
                              report,
                              'status',
                              e.target.value as ReportStatus
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-cyan-300 focus:border-cyan-500 focus:outline-none"
                        >
                          {STATUS_STEPS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Assigned Municipal Department
                        </label>
                        <input
                          type="text"
                          list={`dept-list-${report.id}`}
                          value={draft.assigned_department}
                          onChange={(e) =>
                            handleDraftChange(
                              report,
                              'assigned_department',
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                        />
                        <datalist id={`dept-list-${report.id}`}>
                          {MUNICIPAL_DEPARTMENTS.map((d) => (
                            <option key={d} value={d} />
                          ))}
                        </datalist>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Official Field Resolution / Dispatch Notes
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={draft.resolution_notes}
                            onChange={(e) =>
                              handleDraftChange(
                                report,
                                'resolution_notes',
                                e.target.value
                              )
                            }
                            placeholder="Add field verification, crew dispatch ETA, or engineering resolution notes..."
                            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handlePersistReportUpdate(report)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition shrink-0"
                          >
                            {isSaved ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Saved to DB!
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                {isSaving ? 'Saving...' : 'Update & Persist'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ====================================================================
           CITIZEN LIVE STATUS TRACKER VIEW (5-Step Visual Timeline)
           ==================================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Citizen Ticket Lookup Selector (4 Cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Select or Search Citizen Report ID
            </div>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={citizenSearch}
                onChange={(e) => setCitizenSearch(e.target.value)}
                placeholder="Search by Tracking ID, Road, or Issue..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {matchingCitizenLookupList.map((rep) => {
                const selected = rep.id === activeCitizenReport?.id;
                return (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => setSelectedCitizenReportId(rep.id)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      selected
                        ? 'border-cyan-400 bg-cyan-950/30'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-cyan-400 font-bold">
                        #{rep.id.slice(-8)}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">
                        {rep.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1 line-clamp-1">
                      {rep.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {rep.address}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Visual 5-Step Progress Timeline & Explainability Card (8 Cols) */}
          {activeCitizenReport && (
            <div className="lg:col-span-8 rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-6 space-y-6 shadow-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/30">
                    CITIZEN TRACKING ID: #{activeCitizenReport.id}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2">
                    {activeCitizenReport.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    📍 {activeCitizenReport.address} • Submitted{' '}
                    {new Date(activeCitizenReport.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">
                    AI Priority Score
                  </div>
                  <div className="text-2xl font-black text-cyan-400">
                    {activeCitizenReport.ai_priority_score}/100
                  </div>
                  <div className="text-[10px] font-bold uppercase text-slate-300">
                    {activeCitizenReport.ai_priority} Priority
                  </div>
                </div>
              </div>

              {/* 5-Step Progress Timeline: Submitted → AI Triaged → Assigned to Dept → Work in Progress → Resolved */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live 5-Stage Resolution Progress Timeline
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {[
                    { key: 'Submitted', label: '1. Submitted' },
                    { key: 'Triaged', label: '2. AI Triaged' },
                    { key: 'Assigned', label: '3. Assigned to Dept' },
                    { key: 'In Progress', label: '4. Work in Progress' },
                    { key: 'Resolved', label: '5. Resolved' },
                  ].map((step, idx) => {
                    const currentIdx = STATUS_STEPS.indexOf(
                      activeCitizenReport.status
                    );
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div
                        key={step.key}
                        className={`rounded-xl border p-3 flex flex-col justify-between transition ${
                          isCurrent
                            ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/15'
                            : isCompleted
                            ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-200'
                            : 'border-slate-800 bg-slate-950/60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold">
                            {step.label}
                          </span>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-slate-600 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] mt-2 font-medium">
                          {isCurrent
                            ? 'Current Active Stage'
                            : isCompleted
                            ? 'Verified Complete'
                            : 'Pending'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Plain-English AI Explanation of How Their Issue Was Prioritized */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  <Sparkles className="h-4 w-4" />
                  How CivicPulse AI Prioritized Your Report
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {activeCitizenReport.ai_reasoning}
                </p>

                {citizenFactors && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Safety Risk</div>
                      <div className="text-sm font-bold text-red-300">
                        {citizenFactors.safety_risk}/40
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800">
                      <div className="text-[10px] text-slate-400">
                        Vulnerable Proximity
                      </div>
                      <div className="text-sm font-bold text-amber-300">
                        {citizenFactors.vulnerable_proximity}/20
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800">
                      <div className="text-[10px] text-slate-400">
                        Arterial Traffic
                      </div>
                      <div className="text-sm font-bold text-cyan-300">
                        {citizenFactors.arterial_traffic_impact}/20
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800">
                      <div className="text-[10px] text-slate-400">
                        Cluster Compounding
                      </div>
                      <div className="text-sm font-bold text-purple-300">
                        {citizenFactors.compound_cluster_factor}/20
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Official Department & Resolution Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Assigned Municipal Agency
                  </div>
                  <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-cyan-400 shrink-0" />
                    {activeCitizenReport.assigned_department ||
                      'Pending Department Assignment'}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Official Field Resolution Notes
                  </div>
                  <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                    {activeCitizenReport.resolution_notes ||
                      'Field engineering team notified. Updates will appear here as work progresses.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

