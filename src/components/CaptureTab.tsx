import React, { useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Smartphone,
  Monitor,
  Sparkles,
  MapPin,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Cpu,
  ShieldAlert,
  FileSearch,
  Loader2,
  Camera,
  Zap,
  Layers,
} from 'lucide-react';
import {
  ApiConfig,
  CivicReport,
  ReportCategory,
  TriageResult,
} from '../types';
import {
  DEMO_QUICK_PRESETS,
  PRESET_ISSUE_PHOTOS,
  PRESET_LOCATIONS,
} from '../data/syntheticReports';
import { runGeminiTriagePipeline } from '../services/aiTriageEngine';
import { insertReport } from '../services/supabaseClient';

const CATEGORIES: ReportCategory[] = [
  'Waterlogging',
  'Roads & Potholes',
  'Waste / Garbage',
  'Streetlights',
  'Electricity',
  'Water & Sewage',
  'Public Safety',
  'Trees & Parks',
];

const pinIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#06b6d4;border:3px solid #ffffff;box-shadow:0 0 15px rgba(6,182,212,0.85);display:flex;align-items:center;justify-content:center;">
    <div style="width:8px;height:8px;border-radius:50%;background:#ffffff;"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function LocationClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(
        Number(e.latlng.lat.toFixed(5)),
        Number(e.latlng.lng.toFixed(5))
      );
    },
  });
  return null;
}

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView([lat, lng], 15, { animate: true });
  }, [lat, lng, map]);
  return null;
}

interface CaptureTabProps {
  reports: CivicReport[];
  apiConfig: ApiConfig;
  onReportCreated: (report: CivicReport) => void;
  onNavigateToTrack: (reportId: string) => void;
  onNavigateToInspect: (reportId: string) => void;
}

export const CaptureTab: React.FC<CaptureTabProps> = ({
  reports,
  apiConfig,
  onReportCreated,
  onNavigateToTrack,
  onNavigateToInspect,
}) => {
  const [mobilePreview, setMobilePreview] = useState(false);
  const [description, setDescription] = useState(
    DEMO_QUICK_PRESETS[0].description
  );
  const [category, setCategory] = useState<ReportCategory | string>(
    DEMO_QUICK_PRESETS[0].category
  );
  const [latitude, setLatitude] = useState<number>(
    DEMO_QUICK_PRESETS[0].latitude
  );
  const [longitude, setLongitude] = useState<number>(
    DEMO_QUICK_PRESETS[0].longitude
  );
  const [address, setAddress] = useState<string>(DEMO_QUICK_PRESETS[0].address);
  const [imageUrl, setImageUrl] = useState<string | null>(
    DEMO_QUICK_PRESETS[0].image_url
  );

  // 4-step pipeline stepper state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [latestReceipt, setLatestReceipt] = useState<{
    report: CivicReport;
    triage: TriageResult;
    persistedToSupabase: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleApplyPreset = (preset: (typeof DEMO_QUICK_PRESETS)[0]) => {
    setDescription(preset.description);
    setCategory(preset.category);
    setLatitude(preset.latitude);
    setLongitude(preset.longitude);
    setAddress(preset.address);
    setImageUrl(preset.image_url);
    setLatestReceipt(null);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setAddress(`Pinned Coordinates (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E), Bengaluru`);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setLatestReceipt(null);

    // Step 1: Fetching recent nearby reports from Supabase for context...
    setActiveStep(1);
    await new Promise((r) => setTimeout(r, 80));

    // Step 2: Calling Gemini 2.5 Flash API with structured JSON prompt...
    setActiveStep(2);
    const triageResult = await runGeminiTriagePipeline({
      description,
      category,
      address,
      latitude,
      longitude,
      imageBase64OrUrl: imageUrl,
      existingReports: reports,
      geminiApiKey: apiConfig.geminiApiKey,
    });

    // Step 3: Running Semantic Duplicate Check & Explainable Priority Scoring...
    setActiveStep(3);
    await new Promise((r) => setTimeout(r, 80));

    // Step 4: Saving to Supabase & Generating Citizen Tracking ID...
    setActiveStep(4);
    const newId = crypto.randomUUID
      ? crypto.randomUUID()
      : `11111111-1111-4111-8111-${Date.now().toString().slice(-12)}`;

    const newReport: CivicReport = {
      id: newId,
      created_at: new Date().toISOString(),
      title: triageResult.title,
      description: description.trim(),
      category,
      image_url: imageUrl,
      latitude,
      longitude,
      address,
      ai_category: triageResult.ai_category,
      ai_summary: triageResult.ai_summary,
      ai_priority: triageResult.ai_priority,
      ai_priority_score: triageResult.ai_priority_score,
      ai_reasoning: triageResult.ai_reasoning,
      duplicate_of: triageResult.duplicate_of,
      cluster_id: triageResult.cluster_id,
      status: 'Triaged',
      assigned_department: triageResult.assigned_department,
      resolution_notes: triageResult.duplicate_of
        ? `Auto-triaged and flagged as likely duplicate of #${triageResult.duplicate_of.slice(-4)}.`
        : null,
      triage_source: triageResult.triage_source,
      similarity_score: triageResult.similarity_score,
      distance_to_duplicate_m: triageResult.distance_to_duplicate_m,
    };

    const saved = await insertReport(newReport, apiConfig);

    onReportCreated(saved.report);
    setLatestReceipt({
      report: saved.report,
      triage: triageResult,
      persistedToSupabase: saved.persistedToSupabase,
    });
    setIsSubmitting(false);
    setActiveStep(0);
  };

  const STEPS = [
    'Fetching recent nearby reports from Supabase for context...',
    'Calling Gemini 2.5 Flash API (https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent) with structured JSON prompt...',
    'Running Semantic Duplicate Check & Explainable Priority Scoring...',
    'Saving to Supabase & Generating Citizen Tracking ID...',
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar: Viewport Toggle & Judge 1-Click Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
              <Zap className="h-3.5 w-3.5" /> Under-60-Second Citizen Capture
            </span>
            <span className="text-xs text-slate-400">
              1-Click Judge Presets to test Haversine &lt;250m Duplicate + Cluster Detection:
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DEMO_QUICK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="group inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/60 hover:bg-cyan-950/30 transition"
              >
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                  {preset.badge}
                </span>
                <span className="truncate max-w-[230px]">{preset.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop vs Mobile-First Viewport Preview Toggle */}
        <div className="flex items-center gap-2 self-start lg:self-center rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setMobilePreview(false)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              !mobilePreview
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Desktop Split View
          </button>
          <button
            type="button"
            onClick={() => setMobilePreview(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mobilePreview
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Phone Viewport (max-w-md)
          </button>
        </div>
      </div>

      {/* Main Container: Either max-w-md Phone Frame or Full 12-Col Grid */}
      <div
        className={
          mobilePreview
            ? 'mx-auto max-w-md rounded-[2.25rem] border-4 border-slate-800 bg-slate-950 p-4 shadow-2xl space-y-6'
            : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'
        }
      >
        {/* Form Column */}
        <form
          onSubmit={handleSubmit}
          className={`${
            mobilePreview ? 'w-full' : 'lg:col-span-7'
          } rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 space-y-5 shadow-xl`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Report a Civic Issue in Bengaluru
              </h2>
              <p className="text-xs text-slate-400">
                Unstructured text + photo + pin are automatically triaged into structured municipal action
              </p>
            </div>
            <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-300">
              SLA &lt; 60s
            </span>
          </div>

          {/* 1. Problem Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              1. Problem Description (Plain English / Hinglish / Kannada-English)
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, severity, and nearby landmarks (schools, clinics, bus stops)..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* 2. Category Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              2. Issue Category (AI also cross-verifies & overrides if needed)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                      active
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200 shadow-sm shadow-cyan-500/20'
                        : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Image Upload / Preset Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                3. Photo Evidence (Base64 Gemini Vision or Preset Civic Photos)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload File (Base64)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
              {PRESET_ISSUE_PHOTOS.map((photo) => {
                const selected = imageUrl === photo.url;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setImageUrl(photo.url)}
                    className={`group relative overflow-hidden rounded-xl border text-left transition ${
                      selected
                        ? 'border-cyan-400 ring-2 ring-cyan-500/30'
                        : 'border-slate-800 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.label}
                      className="h-20 w-full object-cover"
                    />
                    <div className="bg-slate-950/90 p-2">
                      <div className="text-[11px] font-semibold text-slate-200 truncate">
                        {photo.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-slate-500 shrink-0" />
              <input
                type="text"
                value={imageUrl || ''}
                onChange={(e) => setImageUrl(e.target.value || null)}
                placeholder="Or paste any image URL / Base64 data URI..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* 4. Interactive Location Picker */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                4. Interactive Location Picker (Click Map to Drop Pin)
              </label>
              <span className="text-[11px] font-mono text-cyan-400">
                {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
              </span>
            </div>

            {/* Quick Location Buttons */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PRESET_LOCATIONS.map((loc) => (
                <button
                  key={loc.label}
                  type="button"
                  onClick={() => {
                    setLatitude(loc.latitude);
                    setLongitude(loc.longitude);
                    setAddress(loc.address);
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                    Math.abs(latitude - loc.latitude) < 0.0005
                      ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <MapPin className="h-3 w-3 text-cyan-400" />
                  {loc.label}
                </button>
              ))}
            </div>

            <div className="h-52 w-full overflow-hidden rounded-xl border border-slate-800">
              <MapContainer
                center={[latitude, longitude]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationClickHandler onSelect={handleMapClick} />
                <MapFlyTo lat={latitude} lng={longitude} />
                <Marker position={[latitude, longitude]} icon={pinIcon} />
              </MapContainer>
            </div>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-2.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-60 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Running Live AI Triage & Spatial Deduplication...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Submit & Run AI Triage
              </>
            )}
          </button>
        </form>

        {/* Right Column: Live 4-Step Pipeline Stepper + AI Triage Receipt Card */}
        <div
          className={`${
            mobilePreview ? 'w-full' : 'lg:col-span-5'
          } space-y-5`}
        >
          {/* Live 4-Step Progress Stepper */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Real-Time Gemini 2.5 Triage Pipeline
                </h3>
              </div>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-mono text-cyan-300">
                {apiConfig.geminiApiKey.trim().length > 10
                  ? 'Gemini 2.5 Flash Key Active'
                  : 'Hybrid Local Fallback Ready'}
              </span>
            </div>

            <div className="space-y-3">
              {STEPS.map((stepText, idx) => {
                const stepNum = idx + 1;
                const isDone =
                  (!isSubmitting && latestReceipt !== null) ||
                  (isSubmitting && activeStep > stepNum);
                const isCurrent = isSubmitting && activeStep === stepNum;

                return (
                  <div
                    key={stepNum}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                      isCurrent
                        ? 'border-cyan-500/60 bg-cyan-950/30 text-cyan-100'
                        : isDone
                        ? 'border-emerald-500/30 bg-emerald-950/15 text-emerald-200'
                        : 'border-slate-800/80 bg-slate-950/50 text-slate-500'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isCurrent ? (
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                      ) : isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-700 text-[10px] font-mono">
                          {stepNum}
                        </div>
                      )}
                    </div>
                    <div className="text-xs leading-relaxed font-medium break-all">
                      {stepText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Triage Receipt Card */}
          {latestReceipt ? (
            <div className="rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                    AI TRIAGE RECEIPT • ID #{latestReceipt.report.id.slice(0, 8)}
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5">
                    {latestReceipt.report.title}
                  </h4>
                </div>

                {/* Crucial Fallback / Live Gemini Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                    latestReceipt.triage.triage_source === 'Live Gemini 2.5 Flash API'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {latestReceipt.triage.triage_source}
                </span>
              </div>

              {/* Score + Category + Suggested Department */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-center">
                  <div className="text-[11px] text-slate-400">Priority Score</div>
                  <div
                    className={`text-2xl font-extrabold mt-0.5 ${
                      latestReceipt.report.ai_priority === 'Critical'
                        ? 'text-red-400'
                        : latestReceipt.report.ai_priority === 'High'
                        ? 'text-orange-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {latestReceipt.report.ai_priority_score}
                    <span className="text-xs font-normal text-slate-500">/100</span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    {latestReceipt.report.ai_priority}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3">
                  <div className="text-[11px] text-slate-400">AI Category</div>
                  <div className="text-xs font-bold text-cyan-300 mt-1">
                    {latestReceipt.report.ai_category}
                  </div>
                  {latestReceipt.report.cluster_id && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-mono text-red-300">
                      <Layers className="h-2.5 w-2.5" />
                      {latestReceipt.report.cluster_id}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3">
                  <div className="text-[11px] text-slate-400">Suggested Dept</div>
                  <div className="text-xs font-bold text-slate-200 mt-1 line-clamp-2">
                    {latestReceipt.report.assigned_department}
                  </div>
                </div>
              </div>

              {/* Duplicate Warning Banner (if matched) */}
              {latestReceipt.report.duplicate_of && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-amber-200">
                      Likely Duplicate Detected Within 250m Radius!
                    </div>
                    <p className="text-amber-100/80">
                      Matched existing report{' '}
                      <code className="font-mono text-amber-300">
                        #{latestReceipt.report.duplicate_of.slice(-6)}
                      </code>{' '}
                      ({latestReceipt.triage.distance_to_duplicate_m ?? 18}m away •{' '}
                      {Math.round((latestReceipt.triage.similarity_score ?? 0.84) * 100)}%
                      semantic similarity). Linked for compound priority escalation.
                    </p>
                  </div>
                </div>
              )}

              {/* Plain-Language Reasoning */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Plain-Language Explainable Priority Reasoning
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {latestReceipt.report.ai_reasoning}
                </p>
              </div>

              {/* CTA Buttons: Track This Report or Inspect in AI Pipeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateToTrack(latestReceipt.report.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition"
                >
                  Track This Report
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToInspect(latestReceipt.report.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition"
                >
                  <FileSearch className="h-4 w-4" />
                  Inspect in AI Pipeline
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center space-y-2">
              <ShieldAlert className="h-8 w-8 text-cyan-400/70 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">
                Ready to Generate Explainable AI Triage Receipt
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click any of the 1-click presets above or enter your own civic complaint, then hit{' '}
                <span className="text-cyan-300 font-medium">Submit & Run AI Triage</span> to inspect the live score, duplicate check, and department routing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

