export type ReportPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type ReportStatus =
  | 'Submitted'
  | 'Triaged'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved';

export type ReportCategory =
  | 'Waterlogging'
  | 'Roads & Potholes'
  | 'Waste / Garbage'
  | 'Streetlights'
  | 'Electricity'
  | 'Water & Sewage'
  | 'Public Safety'
  | 'Trees & Parks';

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
  // Client-side metadata for transparency & UI display
  triage_source?: 'Live Gemini 2.5 Flash API' | 'Deterministic Hybrid Fallback' | 'Baseline Synthetic Seed';
  similarity_score?: number;
  distance_to_duplicate_m?: number;
}

export interface ApiConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey: string;
}

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
  factor_breakdown: {
    safety_risk: number;
    vulnerable_proximity: number;
    arterial_traffic_impact: number;
    compound_cluster_factor: number;
  };
}

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

export interface ClusterMetadata {
  cluster_id: string;
  name: string;
  zone: string;
  center: [number, number];
  radius_m: number;
  color: string;
  summary_tagline: string;
}

