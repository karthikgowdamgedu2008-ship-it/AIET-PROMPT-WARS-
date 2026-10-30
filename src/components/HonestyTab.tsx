import React from 'react';
import {
  ShieldCheck,
  Database,
  AlertTriangle,
  Rocket,
  Cpu,
  Code2,
  CheckCircle2,
  Sparkles,
  Layers,
  GitBranch,
} from 'lucide-react';
import { ApiConfig } from '../types';

interface HonestyTabProps {
  apiConfig: ApiConfig;
  dbMode: 'live-supabase' | 'local-mirrored';
  totalReports: number;
}

export const HonestyTab: React.FC<HonestyTabProps> = ({
  apiConfig,
  dbMode,
  totalReports,
}) => {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-500/30">
              <ShieldCheck className="h-4 w-4" />
              Mandatory Section 7 & 8 Engineering Disclosure & Judge’s Rubric Note
            </div>
            <h2 className="text-xl font-bold text-white">
              Transparency, AI Failure Modes & System Architecture
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              CivicPulse AI is engineered with strict honesty regarding what runs live in browser/cloud, what baseline data is synthetic for hackathon reproducibility, where LLMs can fail in high-stakes municipal triage, and how our deterministic hybrid fallback protects public safety.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 text-xs font-mono">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Active DB Mode:</span>
              <span className="text-emerald-400 font-bold">
                {dbMode === 'live-supabase'
                  ? 'Live Supabase PostgreSQL'
                  : 'Local Mirrored + Supabase Ready'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Active AI Mode:</span>
              <span className="text-cyan-300 font-bold">
                {apiConfig.geminiApiKey.trim().length > 10
                  ? 'Live Gemini 2.5 Flash API'
                  : 'Deterministic Hybrid Fallback'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Records in Store:</span>
              <span className="text-white font-bold">{totalReports} Reports</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Rubric Disclosure Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. WHAT IS REAL */}
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/85 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                1. What Is 100% Real & Functional Today
              </h3>
              <p className="text-xs text-emerald-300">
                Verified end-to-end execution across database, geospatial math, and LLM API
              </p>
            </div>
          </div>

          <ul className="space-y-3 text-xs text-slate-200 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <Database className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Live Supabase PostgreSQL Persistence (<code className="text-emerald-300">public.reports</code>):</strong> Full read, insert, status transition, duplicate linking, and resolution notes persistence using <code className="text-cyan-300">@supabase/supabase-js</code> with automatic local-storage sync so the app never crashes even if offline.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Real-Time Gemini 2.5 Flash Multimodal / JSON Triage Pipeline:</strong> Direct REST calls to <code className="text-cyan-300">v1beta/models/gemini-2.5-flash:generateContent</code> with <code className="text-cyan-300">responseMimeType: "application/json"</code>, passing nearby Supabase tickets within 300m as spatial context plus optional Base64 image payloads for Gemini Vision.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <Cpu className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Haversine Geospatial Distance (&lt;250m) + Cosine Similarity Deduplication:</strong> Real spherical trigonometric distance computation in meters paired with synonym-normalized TF cosine similarity against live rows, plus 1-click duplicate merge & parent score boosting.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <Layers className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Interactive Leaflet Map & End-to-End Status Workflow:</strong> Custom pulsing priority markers, 300m cluster highlight circles, 1-click 60-Second Executive Action Brief synthesis, and real-time synchronization between the Authority Command Workflow and Citizen 5-Step Progress Tracker.
              </div>
            </li>
          </ul>
        </div>

        {/* 2. WHAT IS SYNTHETIC / MOCKED */}
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/85 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                2. What Is Synthetic / Simulated (Rule #6 Disclosure)
              </h3>
              <p className="text-xs text-cyan-300">
                Explicitly labelled baseline dataset for deterministic judge evaluation
              </p>
            </div>
          </div>

          <ul className="space-y-3 text-xs text-slate-200 leading-relaxed">
            <li className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <div className="font-bold text-cyan-300 mb-1">
                • Pre-Loaded Baseline Dataset of 30 Bengaluru Civic Reports (Synthetic Seed)
              </div>
              <p className="text-slate-300">
                To allow hackathon judges to immediately test multi-category cluster detection and &lt;250m duplicate matching on first load, we engineered 30 realistic Bengaluru civic complaints spanning <strong>CLUSTER-MG-DRAIN</strong> (MG Road Pillar 42), <strong>CLUSTER-IND-POWER</strong> (Indiranagar 100ft Rd), <strong>CLUSTER-KOR-WASTE</strong> (Koramangala 4th Block), and 14 standalone city-wide locations. Every pre-loaded row is explicitly badged as <code className="text-cyan-300">Baseline Synthetic Seed</code>.
              </p>
            </li>
            <li className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <div className="font-bold text-cyan-300 mb-1">
                • External Municipal Dispatch Integrations (BBMP / BESCOM / BWSSB ERP)
              </div>
              <p className="text-slate-300">
                While status updates, department assignments, and resolution notes persist directly to Supabase <code className="text-cyan-300">public.reports</code>, downstream SMS/radio dispatch alerts to physical BBMP Sahaaya or BESCOM 1912 field vans are simulated within the command UI.
              </p>
            </li>
          </ul>
        </div>

        {/* 3. WHERE THE AI CAN BE WRONG (FAILURE MODES) */}
        <div className="rounded-2xl border border-amber-500/35 bg-slate-900/85 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                3. Where the AI Can Be Wrong (Failure Modes & Guardrails)
              </h3>
              <p className="text-xs text-amber-300">
                Critical analysis of LLM failure modes in civic triage
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
            <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-3">
              <strong className="text-amber-300">1. Hyperbole & Dramatic Phrasing Bias:</strong> Citizens using emotionally charged words (e.g., “deadly crater of doom” for a minor 2-inch surface patch) can trick pure-LLM scorers into inflating Safety Risk scores. <em>Mitigation:</em> We require multi-report cluster corroboration (&lt;300m) and visual/human verification before dispatching scarce heavy machinery.
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-3">
              <strong className="text-amber-300">2. Pin-Drop vs. Text Address Mismatch (&gt;2km Drift):</strong> If a citizen submits a report from home in Whitefield about a pothole they saw earlier on MG Road without moving the map pin, our strict <code className="text-amber-200">&lt;250m</code> Haversine gate will miss the spatial duplicate.
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-3">
              <strong className="text-amber-300">3. Ambiguous Nighttime / Rain-Blurred Photos:</strong> Reflection on wet asphalt at night can cause vision models to misclassify shallow puddles as deep structural craters or vice-versa.
            </div>
          </div>
        </div>

        {/* 4. WHAT WE WOULD BUILD NEXT */}
        <div className="rounded-2xl border border-purple-500/35 bg-slate-900/85 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                4. What We Would Build Next (Production Scale Roadmap)
              </h3>
              <p className="text-xs text-purple-300">
                Scaling from 30 reports to 100,000+ daily metropolitan tickets
              </p>
            </div>
          </div>

          <ul className="space-y-3 text-xs text-slate-200 leading-relaxed">
            <li className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <strong className="text-purple-300">• PostGIS + pgvector Hybrid Indexing in Supabase:</strong> Replace client-side Haversine scans with a single Supabase RPC function combining <code className="text-cyan-300">ST_DWithin(geom, 250)</code> and <code className="text-cyan-300">text-embedding-004</code> HNSW cosine similarity for sub-5ms duplicate detection across 1M+ rows.
            </li>
            <li className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <strong className="text-purple-300">• Multilingual WhatsApp Voice-Note & Bot Ingestion:</strong> Allow citizens to forward a Kannada/Tamil/Hindi voice note + WhatsApp live location pin directly to a Twilio/Meta webhook that feeds the Gemini 2.5 Flash multimodal pipeline.
            </li>
            <li className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <strong className="text-purple-300">• Automated SLA Escalation Timers & Proof-of-Fix Vision Check:</strong> Auto-escalate Critical (&gt;90 score) tickets if unacknowledged after 30 minutes, and require field contractors to upload a geo-fenced “after” photo verified by Gemini Vision before marking a ticket <code className="text-emerald-300">Resolved</code>.
            </li>
          </ul>
        </div>
      </div>

      {/* End-to-End Architecture Pipeline Diagram */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <GitBranch className="h-4 w-4 text-cyan-400" />
          CivicPulse AI Dual-Engine Architecture (Zero-Downtime Hybrid Design)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <div className="text-cyan-400 font-mono font-bold">STAGE 1 • CAPTURE</div>
            <div className="font-bold text-white">Multimodal Citizen Input</div>
            <p className="text-slate-400">
              Text description + Category + Base64 Photo + Leaflet GPS Coordinates.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <div className="text-amber-400 font-mono font-bold">STAGE 2 • SPATIAL CONTEXT</div>
            <div className="font-bold text-white">Supabase &lt;300m Retrieval</div>
            <p className="text-slate-400">
              Fetches active tickets within 300m & computes Haversine (&lt;250m) + TF Cosine Similarity.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <div className="text-emerald-400 font-mono font-bold">STAGE 3 • AI TRIAGE</div>
            <div className="font-bold text-white">Gemini 2.5 Flash + Fallback</div>
            <p className="text-slate-400">
              Structured 4-pillar priority score, plain-English explainability, duplicate & cluster link.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <div className="text-purple-400 font-mono font-bold">STAGE 4 • REVEAL & ACT</div>
            <div className="font-bold text-white">60s Briefs & Live Tracker</div>
            <p className="text-slate-400">
              Synthesizes compound root causes for executives & updates 5-step citizen timeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

