# CivicPulse AI: From Complaints to Action

**PromptWars x ASTRA Submission — Bengaluru Municipal Decision-Intelligence, Explainable AI Triage & Compound Hotspot Synthesis Platform**

Built with **React 18**, **TypeScript**, **Tailwind CSS**, **Lucide Icons**, **Leaflet (`react-leaflet`)**, **Supabase (`@supabase/supabase-js`)**, **Google Gemini 2.5 Flash**, and **Vitest + React Testing Library**.

---

## 1. Problem Statement Alignment (PromptWars x ASTRA Rubric)

Municipal command centers in fast-growing Indian cities receive thousands of unstructured, duplicate, and multi-departmental complaints daily. Treating tickets in isolation causes critical compound crises to go unnoticed while citizens remain in the dark.

**CivicPulse AI** implements the complete 4-Stage Civic Impact Lifecycle (**Capture → Understand → Reveal → Act**) plus a dedicated **Section 7 & 8 Honesty & Architecture** disclosure tab:

### Stage 1: Capture (`src/components/CaptureTab.tsx`)
- **Under-60-Second Mobile & Desktop Submission**: Toggleable between a full desktop split-screen and a `max-w-md` mobile viewport frame.
- **Multimodal Inputs**: Plain-English/Hinglish problem description, 8 municipal issue categories, Base64/URL photo upload for Gemini Vision (plus 3 realistic preset civic photos), and an interactive Leaflet pin-drop map with un-watermarked dark-filtered OpenStreetMap tiles and 1-click Bengaluru landmark buttons.
- **1-Click Judge Presets**: Pre-configured test buttons (*"Sparking electric pole near Indiranagar bus stand"*, *"Deep flooded pothole on MG Road Pillar 42"*, *"Overflowing garbage & sewage backflow near Koramangala clinic"*) so judges can verify duplicate detection and cluster synthesis in 1 click.
- **Live 4-Step Triage Stepper & Receipt Card**: Displays real-time progress and immediately renders the **AI Triage Receipt Card** showing the Priority Score (0–100), Plain-Language Reasoning, Duplicate Warning, Suggested Department, and an explicit badge indicating **`Live Gemini 2.5 Flash API`** or **`Deterministic Hybrid Fallback`**.

### Stage 2: Understand (`src/components/UnderstandTab.tsx`)
- **Explainable 4-Factor Priority Scoring (`0–100`)**: Orders all reports by `ai_priority_score DESC` and visually breaks down why each ticket outranks others across 4 transparent civic risk pillars:
  1. **Safety Risk (`0–40`)**: Immediate human life/injury hazard (e.g., live sparking wires, submerged open manholes).
  2. **Vulnerable Proximity (`0–20`)**: Proximity to schools, pediatric clinics, hospitals, or crowded bus/metro hubs.
  3. **Arterial Traffic Impact (`0–20`)**: Disruption to high-volume corridors or emergency ambulance lanes.
  4. **Compound Cluster Factor (`0–20`)**: Multi-ticket interaction within a `300m` radius.
- **Haversine (`<250m`) + Semantic Cosine Similarity Duplicate Detection & Merge UI**: Highlights duplicate reports (`duplicate_of !== null`) with an amber badge linking to the parent report and provides a 1-click **"Merge / Link Duplicate (+Boost Parent)"** action that confirms the merge and escalates the parent ticket's score.

### Stage 3: Reveal (`src/components/RevealTab.tsx`)
- **Interactive Geospatial Hotspot Map**: Plots all reports with custom priority markers (`Critical` = pulsing red, `High` = orange, `Medium` = yellow, `Low` = blue) and draws `300m` dashed highlight circles around active geographic clusters.
- **Multi-Category Compound Cluster Detection**: Automatically groups tickets sharing a `cluster_id` or within a `300m` radius across interlocking categories (e.g., showing how *Blocked Storm Grate + Knee-Deep Waterlogging + Submerged Pothole + Dislodged Manhole Cover* on MG Road form a single compound crisis rather than 4 isolated tickets).
- **1-Click 60-Second Executive Action Brief Generator**: Synthesizes unstructured cluster reports via Gemini 2.5 Flash (with instant deterministic fallback) into:
  1. **Root Cause Hypothesis**
  2. **Immediate First Response Action (Next 30 Mins)**
  3. **Departments to Coordinate Jointly**
  4. **Risk if Ignored for 24 Hours**

### Stage 4: Act (`src/components/ActTab.tsx`)
- **Authority Command Workflow**: Filter by Priority, Cluster, or Municipal Agency. Decision-makers can transition status (`Submitted` → `Triaged` → `Assigned` → `In Progress` → `Resolved`), assign departments (`BBMP`, `BESCOM`, `BWSSB`, `BSWML`, `BTP`), and persist official `resolution_notes` directly to Supabase `public.reports`.
- **Citizen Live Status Tracker**: A transparent citizen lookup view displaying a **5-Stage Resolution Progress Timeline**, plain-English AI explanation of how their report was prioritized, assigned agency, and field engineering notes.

---

## 2. Synthetic Dataset Documentation (`src/data/syntheticReports.ts`)

Per Hackathon Rule #6, the repository includes a richly structured baseline dataset of **30 Bengaluru civic reports** (explicitly labelled `Baseline Synthetic Seed`) engineered to test every edge case:
- **Multi-Category Coverage**: Spans all 8 categories (*Waterlogging*, *Roads & Potholes*, *Waste / Garbage*, *Streetlights*, *Electricity*, *Water & Sewage*, *Public Safety*, *Trees & Parks*).
- **3 Active Geographic Clusters (`<300m` radius)**:
  1. `CLUSTER-MG-DRAIN` (*MG Road Metro Pillar 42 Compound Flood & Crater Crisis* — 6 interlocking reports).
  2. `CLUSTER-IND-POWER` (*Indiranagar 100ft Rd Grid, Fallen Tree & Transformer Hazard* — 5 interlocking reports).
  3. `CLUSTER-KOR-WASTE` (*Koramangala 4th Block Leachate & Potable Water Contamination* — 5 interlocking reports).
- **Deliberate Spatial + Semantic Duplicates (`<250m` radius)**:
  - Report `#0004` duplicates `#0001` (`14m` apart on MG Road Pillar 42, `82%` similarity).
  - Report `#0009` duplicates `#0007` (`15m` apart at Indiranagar 100ft Rd bus stand, `86%` similarity).
  - Report `#0014` duplicates `#0013` (`16m` apart on Koramangala 80ft Rd, `81%` similarity).
- **14 Standalone City-Wide Reports**: Spanning Hebbal Flyover, Silk Board, Jayanagar, Whitefield ITPL, Malleswaram, HSR Layout, BTM Layout, St. Martha's Hospital, Bellandur Lake, Rajajinagar, Banashankari, JP Nagar, Yelahanka, and Cubbon Park.

---

## 3. Mandatory Section 7 & 8 Disclosure: Limitations & Honesty Note

### What Is Real
- **Live Supabase PostgreSQL Persistence (`public.reports`)**: Full CRUD persistence (`select`, `insert`, `update`, `upsert`) via `@supabase/supabase-js` paired with automatic `localStorage` mirroring for zero-downtime offline resilience.
- **Real-Time Gemini 2.5 Flash Multimodal / JSON Pipeline**: Live REST calls to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` (with automatic retry on `gemini-2.0-flash` if `404`/`400`), markdown fence stripping before `JSON.parse()`, and Base64 image vision support.
- **Geospatial & Semantic Math (`src/utils/geospatial.ts`)**: Exact spherical Haversine distance (`<250m` / `<300m`) and synonym-normalized TF cosine similarity computed against live records.
- **Security & Input Sanitization (`src/utils/security.ts` & `vercel.json`)**: Strict XSS/HTML/SQL sanitization (`sanitizeInput`), WGS84 coordinate bounds validation (`-90..90`, `-180..180`), client-side sliding-window rate limiting, and strict HTTP security headers (`CSP`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).

### What Is Synthetic / Simulated
- **Baseline 30 Bengaluru Reports**: Pre-loaded and badged as `Baseline Synthetic Seed` for immediate judge evaluation.
- **External Field Vehicle Radio/SMS Dispatches**: Database updates are real in Supabase `public.reports`, while downstream SMS/radio dispatches to physical BBMP/BESCOM vans are simulated in the UI.

### Where the AI Can Be Wrong (Failure Modes & Guardrails)
1. **Hyperbole / Dramatic Phrasing Bias**: Citizens using exaggerated language ("deadly crater of doom" for a minor surface patch) can cause pure LLMs to over-score Safety Risk. *Mitigation:* Multi-report cluster corroboration (`<300m`) and human-in-the-loop verification in the Understand/Act tabs.
2. **Pin-Drop vs. Text Address Drift (`>2km`)**: If a citizen submits a report from home in Whitefield about an issue on MG Road without moving the map pin, the strict `<250m` Haversine filter will miss the spatial duplicate.
3. **Ambiguous Nighttime / Rain-Blurred Photos**: Specular reflection on wet asphalt at night can cause vision models to misclassify shallow puddles as deep structural craters.

### What We Would Build Next
- **PostGIS + `pgvector` Hybrid Indexing**: Sub-5ms spatial + semantic duplicate search across 1M+ rows via Supabase RPC (`ST_DWithin` + HNSW cosine index).
- **Multilingual WhatsApp Voice-Note & Live Location Bot**: Direct ingestion of Kannada/Hindi/Tamil voice notes and WhatsApp location pins.
- **Automated SLA Escalation Timers & Proof-of-Fix Vision Check**: Requiring geo-fenced "after" repair photos verified by Gemini Vision before marking Critical tickets `Resolved`.

---

## 4. Setup, Testing & Build Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional — Can Also Be Configured Live in UI)
Copy `.env.example` to `.env` or use the **"API Configuration / Judge Settings"** modal in the top navigation bar:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
```

### 3. Run Unit & Integration Tests (Vitest + React Testing Library)
```bash
npm test
```

### 4. Start Development Server or Production Build
```bash
npm run dev
npm run build
```

---

## 5. Modular Codebase Structure
```text
├── src/
│   ├── __tests__/
│   │   ├── aiPipeline.test.ts            # 8 unit tests for Haversine, Cosine Similarity, 4-Factor Scoring & Security
│   │   └── workflowAndClusters.test.tsx  # 6 integration tests for Capture, Understand, Reveal, Act & WCAG AA
│   ├── components/
│   │   ├── CaptureTab.tsx                # Stage 1: Mobile-first <60s citizen capture & live 4-step stepper
│   │   ├── UnderstandTab.tsx             # Stage 2: Explainable 4-factor breakdown & duplicate merge UI
│   │   ├── RevealTab.tsx                 # Stage 3: Leaflet hotspot map, 300m clusters & 60s Action Briefs
│   │   ├── ActTab.tsx                    # Stage 4: Authority command workflow & Citizen 5-step tracker
│   │   ├── HonestyTab.tsx                # Stage 5: Mandatory Section 7 & 8 transparency & failure modes
│   │   ├── JudgeConfigModal.tsx          # Runtime API key override & dataset reset modal
│   │   └── ErrorBoundary.tsx             # Graceful React Error Boundary
│   ├── data/
│   │   └── syntheticReports.ts           # 30 baseline Bengaluru reports, 3 clusters & demo presets
│   ├── services/
│   │   ├── aiTriageEngine.ts             # Gemini 2.5 Flash + 2.0 Flash backup & deterministic hybrid engine
│   │   └── supabaseClient.ts             # Supabase CRUD persistence + localStorage mirror
│   ├── types/
│   │   └── civic.ts                      # Strict TypeScript interfaces with JSDoc documentation
│   └── utils/
│       ├── geospatial.ts                 # Haversine distance, TF cosine similarity & factor breakdown
│       └── security.ts                   # XSS/SQL input sanitization, coordinate bounds & rate limiting
├── supabase_schema.sql                   # PostgreSQL DDL & RLS policies for public.reports
├── vercel.json                           # Strict HTTP security headers (CSP, X-Frame-Options, nosniff)
└── vitest.config.ts                      # Vitest + JSDOM test runner configuration
```
