import React, { useState } from 'react';
import {
  BrainCircuit,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Hospital,
  Car,
  Layers,
  Search,
  Sparkles,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';
import { ApiConfig, CivicReport } from '../types';
import {
  calculateHaversineMeters,
  parseOrComputeFactorBreakdown,
} from '../services/aiTriageEngine';
import { updateReportInDb } from '../services/supabaseClient';

interface UnderstandTabProps {
  reports: CivicReport[];
  apiConfig: ApiConfig;
  highlightedReportId: string | null;
  onUpdateReports: (updated: CivicReport[]) => void;
  onNavigateToClusterMap: (clusterId: string | null) => void;
}

export const UnderstandTab: React.FC<UnderstandTabProps> = ({
  reports,
  apiConfig,
  highlightedReportId,
  onUpdateReports,
  onNavigateToClusterMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'DUPLICATES' | 'CRITICAL'>('ALL');
  const [mergedIds, setMergedIds] = useState<Record<string, boolean>>({});
  const [mergingId, setMergingId] = useState<string | null>(null);

  // Always order by ai_priority_score DESC per specification
  const sortedReports = [...reports]
    .sort((a, b) => (b.ai_priority_score || 0) - (a.ai_priority_score || 0))
    .filter((r) => {
      if (filterMode === 'DUPLICATES' && !r.duplicate_of) return false;
      if (filterMode === 'CRITICAL' && r.ai_priority !== 'Critical') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.cluster_id && r.cluster_id.toLowerCase().includes(q))
        );
      }
      return true;
    });

  const handleConfirmMergeAndBoost = async (childReport: CivicReport) => {
    if (!childReport.duplicate_of) return;
    const parentReport = reports.find((r) => r.id === childReport.duplicate_of);
    if (!parentReport) return;

    setMergingId(childReport.id);

    const boostedScore = Math.min(100, (parentReport.ai_priority_score || 85) + 3);
    const boostedPriority = boostedScore >= 88 ? 'Critical' : parentReport.ai_priority;
    const updatedParentReasoning = `${parentReport.ai_reasoning || ''} [Merged +Corroborated with Duplicate Report #${childReport.id.slice(-4)} → Priority Score boosted to ${boostedScore}/100]`;
    const updatedChildNotes = `Confirmed Duplicate Merge into Parent Ticket #${parentReport.id.slice(-4)} by Decision-Maker. Parent priority boosted to ${boostedScore}/100.`;

    await updateReportInDb(
      parentReport.id,
      {
        ai_priority_score: boostedScore,
        ai_priority: boostedPriority,
        ai_reasoning: updatedParentReasoning,
      },
      apiConfig
    );

    await updateReportInDb(
      childReport.id,
      {
        status: 'Resolved',
        resolution_notes: updatedChildNotes,
      },
      apiConfig
    );

    const nextReports = reports.map((r) => {
      if (r.id === parentReport.id) {
        return {
          ...r,
          ai_priority_score: boostedScore,
          ai_priority: boostedPriority,
          ai_reasoning: updatedParentReasoning,
        };
      }
      if (r.id === childReport.id) {
        return {
          ...r,
          status: 'Resolved' as const,
          resolution_notes: updatedChildNotes,
        };
      }
      return r;
    });

    onUpdateReports(nextReports);
    setMergedIds((prev) => ({ ...prev, [childReport.id]: true }));
    setMergingId(null);
  };

  const scrollToReportCard = (targetId: string) => {
    const el = document.getElementById(`report-card-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const duplicateCount = reports.filter((r) => r.duplicate_of !== null).length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">
              Explainable AI Triage & Semantic Duplicate Inspector
            </h2>
            <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-mono text-cyan-300 border border-cyan-500/30">
              Ordered by ai_priority_score DESC
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Every ticket’s priority score (0–100) is decomposed into 4 transparent civic risk pillars so decision-makers see <span className="text-slate-200 font-medium">why</span> one issue outranks another.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, pillar, cluster..."
              className="rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterMode === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({reports.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('CRITICAL')}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterMode === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Critical Only
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('DUPLICATES')}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterMode === 'DUPLICATES'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Duplicates ({duplicateCount})
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {sortedReports.map((report, index) => {
          const factors = parseOrComputeFactorBreakdown(report);
          const parentReport = report.duplicate_of
            ? reports.find((r) => r.id === report.duplicate_of)
            : null;
          const distMeters =
            parentReport
              ? calculateHaversineMeters(
                  report.latitude,
                  report.longitude,
                  parentReport.latitude,
                  parentReport.longitude
                )
              : report.distance_to_duplicate_m || 15;

          const isHighlighted = highlightedReportId === report.id;
          const isMerged =
            mergedIds[report.id] ||
            (report.duplicate_of &&
              report.resolution_notes?.includes('Confirmed Duplicate Merge'));

          return (
            <div
              id={`report-card-${report.id}`}
              key={report.id}
              className={`rounded-2xl border transition p-5 ${
                isHighlighted
                  ? 'border-cyan-400 bg-cyan-950/20 ring-2 ring-cyan-500/40'
                  : report.duplicate_of
                  ? 'border-amber-500/40 bg-slate-900/90'
                  : 'border-slate-800 bg-slate-900/75 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Left Info */}
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-slate-300">
                      Rank #{index + 1}
                    </span>
                    <span className="rounded-lg bg-slate-950 px-2 py-0.5 text-[11px] font-mono text-slate-400 border border-slate-800">
                      ID: #{report.id.slice(-6)}
                    </span>
                    <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
                      AI Category: {report.ai_category || report.category}
                    </span>

                    {report.cluster_id && (
                      <button
                        type="button"
                        onClick={() => onNavigateToClusterMap(report.cluster_id)}
                        className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-mono font-semibold text-red-300 border border-red-500/30 hover:bg-red-500/25 transition"
                      >
                        <Layers className="h-3 w-3" />
                        {report.cluster_id}
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}

                    {/* Amber Likely Duplicate Badge */}
                    {report.duplicate_of && (
                      <button
                        type="button"
                        onClick={() => scrollToReportCard(report.duplicate_of!)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        Likely Duplicate Detected → Parent #{report.duplicate_of.slice(-4)} ({distMeters}m away)
                      </button>
                    )}

                    {report.triage_source && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/90 px-2.5 py-0.5 text-[11px] text-slate-300">
                        <Sparkles className="h-3 w-3 text-cyan-400" />
                        {report.triage_source}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white">{report.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {report.description}
                  </p>

                  {report.ai_summary && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-xs text-cyan-200">
                      <span className="font-bold text-cyan-400">AI Executive Summary: </span>
                      {report.ai_summary}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span>📍 {report.address}</span>
                    <span>🏛️ Assigned: <strong className="text-slate-200">{report.assigned_department || 'Unassigned'}</strong></span>
                    <span>📌 Status: <strong className="text-cyan-300">{report.status}</strong></span>
                  </div>
                </div>

                {/* Right Score Badge */}
                <div className="flex lg:flex-col items-center justify-between lg:justify-center rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3.5 shrink-0 min-w-[145px]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    AI Priority Score
                  </div>
                  <div
                    className={`text-3xl font-black my-0.5 ${
                      report.ai_priority === 'Critical'
                        ? 'text-red-400'
                        : report.ai_priority === 'High'
                        ? 'text-orange-400'
                        : report.ai_priority === 'Medium'
                        ? 'text-amber-300'
                        : 'text-blue-400'
                    }`}
                  >
                    {report.ai_priority_score}
                    <span className="text-xs font-normal text-slate-500">/100</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      report.ai_priority === 'Critical'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : report.ai_priority === 'High'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        : report.ai_priority === 'Medium'
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {report.ai_priority}
                  </span>
                </div>
              </div>

              {/* Explainable Prioritization Breakdown (4 Pillars) */}
              <div className="mt-4 pt-4 border-t border-slate-800/90 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Why This Report Outranks Others (Explainable 4-Factor Breakdown)</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {factors.safety_risk} + {factors.vulnerable_proximity} + {factors.arterial_traffic_impact} + {factors.compound_cluster_factor} = {report.ai_priority_score}/100
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Factor 1: Safety Risk */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                        Safety Risk
                      </span>
                      <span className="font-mono text-red-300">{factors.safety_risk}/40</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${(factors.safety_risk / 40) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Factor 2: Vulnerable Proximity */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Hospital className="h-3.5 w-3.5 text-amber-400" />
                        Schools / Clinics
                      </span>
                      <span className="font-mono text-amber-300">{factors.vulnerable_proximity}/20</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${(factors.vulnerable_proximity / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Factor 3: Arterial Traffic Impact */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 text-cyan-400" />
                        Arterial Traffic
                      </span>
                      <span className="font-mono text-cyan-300">{factors.arterial_traffic_impact}/20</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${(factors.arterial_traffic_impact / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Factor 4: Compound Cluster Factor */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-purple-400" />
                        Compound Cluster
                      </span>
                      <span className="font-mono text-purple-300">{factors.compound_cluster_factor}/20</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${(factors.compound_cluster_factor / 20) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Plain-English Reasoning Text */}
                <p className="text-xs text-slate-300 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 font-mono leading-relaxed">
                  {report.ai_reasoning}
                </p>

                {/* Duplicate Detection & Merge UI */}
                {report.duplicate_of && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-amber-200 flex items-center gap-2">
                        <GitMerge className="h-4 w-4 text-amber-400" />
                        Semantic & Spatial Duplicate of Report #{report.duplicate_of.slice(-6)}
                        {parentReport && (
                          <span className="text-amber-300/90 font-normal">
                            (“{parentReport.title}” — Score {parentReport.ai_priority_score}/100)
                          </span>
                        )}
                      </div>
                      <p className="text-amber-100/80">
                        Haversine GPS Distance: <strong>{distMeters}m</strong> (&lt;250m threshold) • Cosine Similarity:{' '}
                        <strong>{Math.round((report.similarity_score || 0.83) * 100)}%</strong>. Confirming merge links citizen tracking to the parent ticket and boosts parent priority score.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => scrollToReportCard(report.duplicate_of!)}
                        className="inline-flex items-center gap-1 rounded-xl border border-amber-500/40 bg-slate-950 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-950/60 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Jump to Parent
                      </button>

                      {isMerged ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-2 text-xs font-bold text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          Merged & Parent Boosted!
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={mergingId === report.id}
                          onClick={() => handleConfirmMergeAndBoost(report)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-md"
                        >
                          <GitMerge className="h-4 w-4" />
                          {mergingId === report.id
                            ? 'Merging & Boosting...'
                            : 'Merge / Link Duplicate (+Boost Parent)'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

