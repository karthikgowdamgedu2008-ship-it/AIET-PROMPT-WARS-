/**
 * @fileoverview Strict TypeScript interfaces for CivicPulse AI: From Complaints to Action.
 * Zero `any` types are used across these core domain contracts.
 */

/** Priority classification levels assigned by the AI Triage Engine. */
export type ReportPriority = 'Critical' | 'High' | 'Medium' | 'Low';

/** Five-stage municipal lifecycle status for a civic report. */
export type ReportStatus =
  | 'Submitted'
  | 'Triaged'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved';

/** Standard municipal issue categories supported by CivicPulse AI. */
export type ReportCategory =
  | 'Waterlogging'
  | 'Roads & Potholes'
  | 'Waste / Garbage'
  | 'Streetlights'
  | 'Electricity'
  | 'Water & Sewage'
  | 'Public Safety'
  | 'Trees & Parks';

/**
 * Four-pillar explainable prioritization breakdown summing to `ai_priority_score` (0–100).
 */
export interface PriorityFactorBreakdown {
  /** Immediate physical/human life hazard score (0 to 40). */
  safety_risk: number;
  /** Proximity to schools, pediatric clinics, hospitals, or transit hubs (0 to 20). */
  vulnerable_proximity: number;
  /** Disruption to major arterial corridors or emergency lanes (0 to 20). */
  arterial_traffic_impact: number;
  /** Multi-category compounding effect within a 300m geographic cluster (0 to 20). */
  compound_cluster_factor: number;
}

/**
 * Core database record representing a row in `public.reports` in Supabase.
 */
export interface CivicReport {
  id: string;
  created_at: string;
  title: string;
  description: string;
  category: ReportCategory | string;
  image_url: string | null;
  latitude: number;
  longitude: number;
  address: string;
  ai_category: string | null;
  ai_summary: string | null;
  ai_priority: ReportPriority;
  ai_priority_score: number;
  ai_reasoning: string | null;
  duplicate_of: string | null;
  cluster_id: string | null;
  status: ReportStatus;
  assigned_department: string | null;
  resolution_notes: string | null;
  /** Client-side provenance badge indicating Live Gemini 2.5 Flash or Hybrid Fallback. */
  triage_source?:
    | 'Live Gemini 2.5 Flash API'
    | 'Deterministic Hybrid Fallback'
    | 'Baseline Synthetic Seed';
  /** Cosine similarity score (0..1) if matched to a parent report within 250m. */
  similarity_score?: number;
  /** Haversine distance in meters to the parent report if flagged as a duplicate. */
  distance_to_duplicate_m?: number;
}

/**
 * Runtime API configuration allowing judge override of Supabase and Gemini keys.
 */
export interface ApiConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey: string;
}

/**
 * Output payload returned by the AI Triage & Spatial Deduplication Pipeline.
 */
export interface TriageResult {
  title: string;
  ai_category: ReportCategory | string;
  ai_summary: string;
  ai_priority: ReportPriority;
  ai_priority_score: number;
  ai_reasoning: string;
  duplicate_of: string | null;
  cluster_id: string | null;
  assigned_department: string;
  triage_source: 'Live Gemini 2.5 Flash API' | 'Deterministic Hybrid Fallback';
  similarity_score?: number;
  distance_to_duplicate_m?: number;
  factor_breakdown: PriorityFactorBreakdown;
}

/**
 * Structured 60-Second Executive Action Brief synthesized across a cluster or the entire city.
 */
export interface ExecutiveActionBrief {
  target_id: string;
  target_name: string;
  generated_at: string;
  source: 'Live Gemini 2.5 Flash API' | 'Deterministic Hybrid Fallback';
  root_cause_hypothesis: string;
  immediate_first_response: string;
  departments_to_coordinate: string[];
  risk_if_ignored_24h: string;
  total_reports_analyzed: number;
  compound_severity_score: number;
}

/**
 * Geographic metadata for active multi-category civic crisis clusters.
 */
export interface ClusterMetadata {
  cluster_id: string;
  name: string;
  zone: string;
  center: [number, number];
  radius_m: number;
  color: string;
  summary_tagline: string;
}

/**
 * Spatial & semantic match analysis output for a candidate report location.
 */
export interface SpatialMatchAnalysis {
  duplicateCandidate: CivicReport | null;
  distanceMeters: number | null;
  similarityScore: number;
  detectedClusterId: string | null;
  nearbyReportsWithin300m: CivicReport[];
}

