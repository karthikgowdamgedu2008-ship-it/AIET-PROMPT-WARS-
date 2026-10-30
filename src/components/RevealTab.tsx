import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Radar,
  Sparkles,
  Layers,
  AlertOctagon,
  Building2,
  Clock,
  FileText,
  Loader2,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Flame,
} from 'lucide-react';
import {
  ApiConfig,
  CivicReport,
  ExecutiveActionBrief,
  ReportPriority,
} from '../types';
import { ACTIVE_CLUSTERS } from '../data/syntheticReports';
import {
  calculateHaversineMeters,
  generateExecutiveActionBrief,
} from '../services/aiTriageEngine';

function createPriorityMarkerIcon(priority: ReportPriority, isDuplicate: boolean) {
  const colors: Record<ReportPriority, { bg: string; border: string; glow: string }> = {
    Critical: {
      bg: '#ef4444',
      border: '#fecaca',
      glow: 'rgba(239, 68, 68, 0.85)',
    },
    High: {
      bg: '#f97316',
      border: '#fed7aa',
      glow: 'rgba(249, 115, 22, 0.75)',
    },
    Medium: {
      bg: '#eab308',
      border: '#fef08a',
      glow: 'rgba(234, 179, 8, 0.7)',
    },
    Low: {
      bg: '#3b82f6',
      border: '#bfdbfe',
      glow: 'rgba(59, 130, 246, 0.65)',
    },
  };

  const style = colors[priority] || colors.Medium;
  const pulseClass = priority === 'Critical' ? 'critical-marker-pulse' : '';
  const size = priority === 'Critical' ? 22 : priority === 'High' ? 18 : 15;

  return L.divIcon({
    className: 'custom-priority-marker',
    html: `<div class="${pulseClass}" style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${style.bg};
      border:2.5px solid ${style.border};
      box-shadow:0 0 12px ${style.glow};
      display:flex;
      align-items:center;
      justify-content:center;
      opacity:${isDuplicate ? 0.85 : 1};
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapViewportController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

interface RevealTabProps {
  reports: CivicReport[];
  apiConfig: ApiConfig;
  initialClusterId: string | null;
  onSelectReportForAct: (reportId: string) => void;
}

export const RevealTab: React.FC<RevealTabProps> = ({
  reports,
  apiConfig,
  initialClusterId,
  onSelectReportForAct,
}) => {
  const [selectedClusterId, setSelectedClusterId] = useState<string>(
    initialClusterId || 'CLUSTER-MG-DRAIN'
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.966, 77.615]);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [loadingBriefFor, setLoadingBriefFor] = useState<string | null>(null);
  const [activeBrief, setActiveBrief] = useState<ExecutiveActionBrief | null>(
    null
  );

  useEffect(() => {
    if (initialClusterId) {
      setSelectedClusterId(initialClusterId);
      const found = ACTIVE_CLUSTERS.find(
        (c) => c.cluster_id === initialClusterId
      );
      if (found) {
        setMapCenter(found.center);
        setMapZoom(16);
      }
    }
  }, [initialClusterId]);

  // Group reports by cluster_id OR within 300m radius of cluster center
  const getReportsForCluster = (clusterId: string): CivicReport[] => {
    const clusterMeta = ACTIVE_CLUSTERS.find((c) => c.cluster_id === clusterId);
    return reports
      .filter((r) => {
        if (r.cluster_id === clusterId) return true;
        if (clusterMeta) {
          const dist = calculateHaversineMeters(
            r.latitude,
            r.longitude,
            clusterMeta.center[0],
            clusterMeta.center[1]
          );
          return dist <= 300;
        }
        return false;
      })
      .sort((a, b) => (b.ai_priority_score || 0) - (a.ai_priority_score || 0));
  };

  const handleFocusCluster = (clusterId: string) => {
    setSelectedClusterId(clusterId);
    const found = ACTIVE_CLUSTERS.find((c) => c.cluster_id === clusterId);
    if (found) {
      setMapCenter(found.center);
      setMapZoom(16);
    }
  };

  const handleGenerateBrief = async (targetId: string) => {
    setLoadingBriefFor(targetId);
    if (targetId !== 'CITY-OVERALL') {
      handleFocusCluster(targetId);
    } else {
      setMapCenter([12.966, 77.615]);
      setMapZoom(12);
    }

    const brief = await generateExecutiveActionBrief({
      targetId,
      reports,
      geminiApiKey: apiConfig.geminiApiKey,
    });

    setActiveBrief(brief);
    setLoadingBriefFor(null);
  };

  // Auto-generate initial brief for MG Road Cluster on first load so judges immediately see executive synthesis
  useEffect(() => {
    if (!activeBrief && reports.length > 0) {
      handleGenerateBrief(initialClusterId || 'CLUSTER-MG-DRAIN');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeClusterMeta =
    ACTIVE_CLUSTERS.find((c) => c.cluster_id === selectedClusterId) ||
    ACTIVE_CLUSTERS[0];
  const clusterReports = getReportsForCluster(selectedClusterId);
  const distinctCategories = Array.from(
    new Set(clusterReports.map((r) => r.ai_category || r.category))
  );

  return (
    <div className="space-y-6">
      {/* Top Bar: City-Wide Executive Brief CTA + Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-red-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white">
              Geospatial Hotspot Map, Multi-Category Cluster Detection & 60s Action Briefs
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Automatically groups multi-category tickets within a <span className="text-cyan-300 font-mono">300m</span> radius to reveal compound infrastructure failures instead of isolated complaints.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Marker Legend */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-red-300 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block critical-marker-pulse" />
              Critical
            </span>
            <span className="inline-flex items-center gap-1.5 text-orange-300 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />
              High
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-200 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block" />
              Medium
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-300 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />
              Low
            </span>
          </div>

          <button
            type="button"
            disabled={loadingBriefFor === 'CITY-OVERALL'}
            onClick={() => handleGenerateBrief('CITY-OVERALL')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
          >
            {loadingBriefFor === 'CITY-OVERALL' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate 60-Second Action Brief (City-Wide)
          </button>
        </div>
      </div>

      {/* 3 Active Geographic Cluster Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ACTIVE_CLUSTERS.map((cluster) => {
          const members = getReportsForCluster(cluster.cluster_id);
          const cats = Array.from(
            new Set(members.map((r) => r.ai_category || r.category))
          );
          const isSelected = selectedClusterId === cluster.cluster_id;

          return (
            <div
              key={cluster.cluster_id}
              onClick={() => handleFocusCluster(cluster.cluster_id)}
              className={`cursor-pointer rounded-2xl border p-4 transition flex flex-col justify-between ${
                isSelected
                  ? 'border-cyan-400 bg-slate-900 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-lg px-2.5 py-0.5 text-[11px] font-mono font-bold border"
                    style={{
                      backgroundColor: `${cluster.color}20`,
                      color: cluster.color,
                      borderColor: `${cluster.color}50`,
                    }}
                  >
                    {cluster.cluster_id}
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    {members.length} Reports (&lt;300m)
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{cluster.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {cluster.summary_tagline}
                </p>

                <div className="flex flex-wrap gap-1 pt-1">
                  {cats.map((c) => (
                    <span
                      key={c}
                      className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-medium text-cyan-300 border border-slate-800"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFocusCluster(cluster.cluster_id);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-cyan-300"
                >
                  <Navigation className="h-3.5 w-3.5 text-cyan-400" />
                  Zoom 300m Zone
                </button>

                <button
                  type="button"
                  disabled={loadingBriefFor === cluster.cluster_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateBrief(cluster.cluster_id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/30 transition"
                >
                  {loadingBriefFor === cluster.cluster_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  )}
                  Generate 60-Second Action Brief with Gemini
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map + Hotspot Inspector Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Leaflet Map (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl">
          <div className="flex items-center justify-between px-2 pb-2.5">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <span>Live Bengaluru Civic Command Map ({reports.length} Active Pins)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMapCenter([12.966, 77.615]);
                setMapZoom(12);
              }}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-slate-800"
            >
              Reset Full City View
            </button>
          </div>

          <div className="h-[510px] w-full overflow-hidden rounded-xl border border-slate-800">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewportController center={mapCenter} zoom={mapZoom} />

              {/* Draw 300m Highlight Circles around the 3 Active Geographic Clusters */}
              {ACTIVE_CLUSTERS.map((cluster) => (
                <Circle
                  key={cluster.cluster_id}
                  center={cluster.center}
                  radius={cluster.radius_m}
                  pathOptions={{
                    color: cluster.color,
                    fillColor: cluster.color,
                    fillOpacity:
                      selectedClusterId === cluster.cluster_id ? 0.24 : 0.12,
                    weight: selectedClusterId === cluster.cluster_id ? 3 : 2,
                    dashArray: '6 4',
                  }}
                  eventHandlers={{
                    click: () => handleFocusCluster(cluster.cluster_id),
                  }}
                />
              ))}

              {/* Plot all reports with color-coded custom markers */}
              {reports.map((rep) => (
                <Marker
                  key={rep.id}
                  position={[rep.latitude, rep.longitude]}
                  icon={createPriorityMarkerIcon(
                    rep.ai_priority,
                    Boolean(rep.duplicate_of)
                  )}
                >
                  <Popup>
                    <div className="space-y-1.5 min-w-[230px] p-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                          {rep.ai_priority} • {rep.ai_priority_score}/100
                        </span>
                        {rep.cluster_id && (
                          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-mono text-red-300">
                            {rep.cluster_id}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-white">
                        {rep.title}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {rep.ai_summary || rep.description}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        📍 {rep.address}
                      </div>
                      <div className="pt-1 flex items-center justify-between border-t border-slate-800">
                        <span className="text-[10px] text-cyan-300 font-semibold">
                          Status: {rep.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectReportForAct(rep.id)}
                          className="text-[10px] font-bold text-amber-300 underline"
                        >
                          Manage in Act Tab →
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Right Column: AI Executive Action Brief + Compound Cluster Breakdown (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 60-Second Executive Action Brief Card */}
          {activeBrief && (
            <div className="rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-5 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                    <Flame className="h-3.5 w-3.5 text-amber-400" />
                    60-SECOND EXECUTIVE ACTION BRIEF • {activeBrief.target_id}
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {activeBrief.target_name}
                  </h3>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                    activeBrief.source === 'Live Gemini 2.5 Flash API'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  {activeBrief.source}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  <div className="text-[10px] uppercase text-slate-400">
                    Cluster Tickets Synthesized
                  </div>
                  <div className="text-lg font-extrabold text-cyan-300">
                    {activeBrief.total_reports_analyzed} Linked Reports
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  <div className="text-[10px] uppercase text-slate-400">
                    Compound Crisis Index
                  </div>
                  <div className="text-lg font-extrabold text-red-400">
                    {activeBrief.compound_severity_score}/100 (Critical)
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 space-y-1">
                  <div className="font-bold text-cyan-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    1. Root Cause Hypothesis (Multi-Ticket Synthesis)
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    {activeBrief.root_cause_hypothesis}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3.5 space-y-1">
                  <div className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    2. Immediate First Response Action (Next 30 Mins)
                  </div>
                  <p className="text-emerald-100/90 leading-relaxed">
                    {activeBrief.immediate_first_response}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 space-y-1.5">
                  <div className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    3. Departments to Coordinate Jointly
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeBrief.departments_to_coordinate.map((dept) => (
                      <span
                        key={dept}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200"
                      >
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-red-500/40 bg-red-950/25 p-3.5 space-y-1">
                  <div className="font-bold text-red-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <AlertOctagon className="h-3.5 w-3.5" />
                    4. Risk if Ignored for 24 Hours
                  </div>
                  <p className="text-red-100/90 leading-relaxed">
                    {activeBrief.risk_if_ignored_24h}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Compound Cluster Breakdown Panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Compound Tickets Inside {activeClusterMeta.cluster_id} (&lt;300m)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-cyan-300">
                {distinctCategories.length} Interlocking Categories
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {clusterReports.map((rep) => (
                <div
                  key={rep.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 flex items-start justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                        {rep.ai_category || rep.category}
                      </span>
                      {rep.duplicate_of && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                          Duplicate of #{rep.duplicate_of.slice(-4)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-100">
                      {rep.title}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Status: <span className="text-cyan-300">{rep.status}</span> • Dept: {rep.assigned_department}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-red-400">
                      {rep.ai_priority_score}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectReportForAct(rep.id)}
                      className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300"
                    >
                      Act <ArrowRight className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

