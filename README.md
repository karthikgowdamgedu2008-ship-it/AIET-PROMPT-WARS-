# CivicPulse AI: From Complaints to Action

**Bengaluru Municipal Decision-Intelligence, Explainable Triage & Compound Hotspot Synthesis Platform**

Built with **React 18**, **Tailwind CSS**, **Lucide Icons**, **Leaflet (`react-leaflet`)**, **Supabase (`@supabase/supabase-js`)**, and **Google Gemini 2.5 Flash**.

---

## 1. Setup & Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation & Local Development
```bash
npm install
npm run dev
```
Open **http://localhost:5173/** in your browser.

### Environment & Runtime Judge Configuration
You can provide credentials via a `.env` file in the project root OR enter/override them live at runtime using the **"API Configuration / Judge Settings"** button in the top navigation bar:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

- **Database Schema (`public.reports`)**: Run [`supabase_schema.sql`](./supabase_schema.sql) in your Supabase SQL Editor if creating a fresh instance. If the table is empty, CivicPulse AI automatically seeds the 30 baseline Bengaluru civic reports. If no Supabase credentials are provided, the app seamlessly mirrors all reads/writes to `localStorage` so zero errors occur during offline judging.

---

## 2. System Architecture & 5-Tab Command Workflow

CivicPulse AI transforms noisy, unstructured citizen complaints into prioritized, explainable municipal action across 5 core tabs matching the problem statement:

1. **01 Capture (`src/components/CaptureTab.tsx`)**:
   - Mobile-first (`max-w-md` toggleable phone frame) and desktop split-view citizen submission in under 60 seconds.
   - Includes 1-click judge presets, 8 civic categories, Base64/URL photo upload for Gemini Vision, interactive Leaflet map pin-drop with un-watermarked dark-filtered OpenStreetMap tiles, and a live 4-step triage progress stepper.
2. **02 Understand (`src/components/UnderstandTab.tsx`)**:
   - Orders all reports by `ai_priority_score DESC` (0–100).
   - Decomposes every score into 4 transparent civic risk pillars: **Safety Risk (0–40)**, **Vulnerable Proximity (0–20)**, **Arterial Traffic Impact (0–20)**, and **Compound Cluster Factor (0–20)**.
   - Flags semantic & spatial duplicates (`duplicate_of`) with an amber badge and provides a 1-click **"Merge / Link Duplicate (+Boost Parent)"** workflow.
3. **03 Reveal (`src/components/RevealTab.tsx`)**:
   - Plots all reports with custom priority markers (`Critical` pulsing red, `High` orange, `Medium` yellow, `Low` blue) and draws `300m` dashed highlight circles around active multi-category clusters (`CLUSTER-MG-DRAIN`, `CLUSTER-IND-POWER`, `CLUSTER-KOR-WASTE`).
   - Features a 1-click **"Generate 60-Second Action Brief with Gemini"** engine per cluster and city-wide.
4. **04 Act (`src/components/ActTab.tsx`)**:
   - **Authority Command Workflow**: Filter by Priority, Cluster, or Department; update `status` (`Submitted` → `Triaged` → `Assigned` → `In Progress` → `Resolved`), assign municipal agencies, and persist `resolution_notes` directly to `public.reports`.
   - **Citizen Live Status Tracker**: Search/select any report ID to inspect its 5-stage resolution timeline, plain-English AI prioritization breakdown, and official field engineering notes.
5. **05 Honesty & Architecture (`src/components/HonestyTab.tsx`)**:
   - Dedicated engineering disclosure covering what is real, what is synthetic, AI failure modes, and our production roadmap.

---

## 3. AI Approach & Hybrid Zero-Failure Pipeline (`src/services/aiTriageEngine.ts`)

1. **Geospatial Context Retrieval (`<300m` & `<250m` Haversine Gate)**:
   - Before calling the LLM, CivicPulse AI calculates exact spherical Haversine distances in meters against existing active tickets in `public.reports`.
   - Reports within `250m` undergo synonym-normalized TF cosine similarity analysis to detect likely duplicates; reports within `300m` are grouped into multi-category geographic clusters.
2. **Live Gemini 2.5 Flash Multimodal / JSON Triage (with Automatic `gemini-2.0-flash` Backup)**:
   - Calls `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}` (and automatically retries with `gemini-2.0-flash` if `2.5-flash` returns `404`/`400`), strips any markdown ```` ```json ```` fences prior to `JSON.parse()`, and badges the resulting receipt or brief as **`Live Gemini 2.5 Flash API`**.
3. **Deterministic Hybrid Fallback**:
   - If no Gemini API key is configured or rate limits occur during judging, the pipeline automatically falls back to our deterministic local NLP + Haversine scoring engine and clearly badges the output as **`Deterministic Hybrid Fallback`**.

---

## 4. Mandatory Section 7 & 8 Disclosure: Limitations & Honesty Note

### What Is Real
- **Live Supabase PostgreSQL Persistence (`public.reports`)**: Full CRUD persistence (`select`, `insert`, `update`, `upsert`) with automatic local-storage synchronization.
- **Real-Time Gemini 2.5 Flash Triage & 60-Second Action Briefs**: Live REST integration supporting structured JSON output and Base64 image payloads.
- **Haversine Geospatial Distance (`<250m`) + Semantic Cosine Similarity**: Real mathematical duplicate and cluster detection against live rows.
- **Interactive Leaflet Map & End-to-End Status Workflow**: Real-time state propagation between Authority Command and Citizen Live Tracker.

### What Is Synthetic / Simulated (Rule #6 Compliance)
- **30 Pre-Loaded Bengaluru Civic Reports (`src/data/syntheticReports.ts`)**: Engineered and explicitly badged as `Baseline Synthetic Seed` so judges can immediately evaluate multi-category clusters (`CLUSTER-MG-DRAIN`, `CLUSTER-IND-POWER`, `CLUSTER-KOR-WASTE`) and duplicate detection on first load.
- **Downstream Field Van SMS/Radio Dispatches**: Status updates and resolution notes persist to Supabase, while external ERP radio alerts to BBMP/BESCOM field vehicles are simulated in the UI.

### Where the AI Can Be Wrong (Failure Modes)
1. **Hyperbole Bias**: Citizens using dramatic language ("deadly crater of doom" for a minor surface patch) can cause LLMs to over-score Safety Risk unless tempered by multi-report cluster corroboration.
2. **GPS Pin-Drop Drift (`>2km` away from text address)**: If a citizen reports an MG Road hazard while sitting at home in Whitefield without moving the map pin, the `<250m` Haversine gate will miss the spatial duplicate.
3. **Ambiguous Nighttime / Rain Reflection Photos**: Specular reflection on wet asphalt can cause vision models to misclassify shallow puddles as deep structural craters.

### What We Would Build Next
- **PostGIS + `pgvector` Hybrid Indexing**: Sub-5ms spatial + semantic duplicate search at 100k+ ticket scale via Supabase RPC (`ST_DWithin` + HNSW vector index).
- **Multilingual WhatsApp Voice/Location Bot**: Direct ingestion of Kannada/Hindi/English voice notes and WhatsApp location pins.
- **Automated SLA Escalation Timers & Proof-of-Fix Vision Verification**: Requiring geo-fenced "after" repair photos verified by Gemini Vision before closing Critical tickets.

