import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ApiConfig, CivicReport } from '../types';
import { INITIAL_SYNTHETIC_REPORTS } from '../data/syntheticReports';

const STORAGE_CONFIG_KEY = 'civicpulse_api_config_v1';
const STORAGE_REPORTS_KEY = 'civicpulse_local_reports_v1';

export function getStoredConfig(): ApiConfig {
  const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        supabaseUrl: parsed.supabaseUrl || envSupabaseUrl,
        supabaseAnonKey: parsed.supabaseAnonKey || envSupabaseAnonKey,
        geminiApiKey: parsed.geminiApiKey || envGeminiKey,
      };
    }
  } catch (e) {
    console.warn('Failed to parse stored API config:', e);
  }

  return {
    supabaseUrl: envSupabaseUrl,
    supabaseAnonKey: envSupabaseAnonKey,
    geminiApiKey: envGeminiKey,
  };
}

export function saveStoredConfig(config: ApiConfig): void {
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
}

export function getSupabaseClient(config?: ApiConfig): SupabaseClient | null {
  const active = config || getStoredConfig();
  if (
    active.supabaseUrl &&
    active.supabaseAnonKey &&
    active.supabaseUrl.startsWith('http')
  ) {
    try {
      return createClient(active.supabaseUrl.trim(), active.supabaseAnonKey.trim());
    } catch (e) {
      console.error('Invalid Supabase URL or Key:', e);
      return null;
    }
  }
  return null;
}

export function getLocalCacheReports(): CivicReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_REPORTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local reports cache:', e);
  }
  localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(INITIAL_SYNTHETIC_REPORTS));
  return [...INITIAL_SYNTHETIC_REPORTS];
}

export function saveLocalCacheReports(reports: CivicReport[]): void {
  localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(reports));
}

export interface FetchReportsResponse {
  reports: CivicReport[];
  mode: 'live-supabase' | 'local-mirrored';
  error?: string;
}

const DB_COLUMNS = [
  'id',
  'created_at',
  'title',
  'description',
  'category',
  'image_url',
  'latitude',
  'longitude',
  'address',
  'ai_category',
  'ai_summary',
  'ai_priority',
  'ai_priority_score',
  'ai_reasoning',
  'duplicate_of',
  'cluster_id',
  'status',
  'assigned_department',
  'resolution_notes',
];

function sanitizeForSupabase(report: Partial<CivicReport>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const key of DB_COLUMNS) {
    if (key in report && report[key as keyof CivicReport] !== undefined) {
      clean[key] = report[key as keyof CivicReport];
    }
  }
  return clean;
}

export async function fetchAllReports(config?: ApiConfig): Promise<FetchReportsResponse> {
  const client = getSupabaseClient(config);
  if (!client) {
    return {
      reports: getLocalCacheReports(),
      mode: 'local-mirrored',
    };
  }

  try {
    const { data, error } = await client
      .from('reports')
      .select('*')
      .order('ai_priority_score', { ascending: false });

    if (error) {
      return {
        reports: getLocalCacheReports(),
        mode: 'local-mirrored',
        error: `Supabase query note: ${error.message} (using synced local store)`,
      };
    }

    if (!data || data.length === 0) {
      // Automatically seed the empty public.reports table with our 30 baseline reports
      const seedPayload = INITIAL_SYNTHETIC_REPORTS.map((r) => sanitizeForSupabase(r));
      const { data: seededData, error: seedError } = await client
        .from('reports')
        .upsert(seedPayload, { onConflict: 'id' })
        .select('*');

      if (!seedError && seededData && seededData.length > 0) {
        saveLocalCacheReports(seededData as CivicReport[]);
        return {
          reports: seededData as CivicReport[],
          mode: 'live-supabase',
        };
      }
      return {
        reports: getLocalCacheReports(),
        mode: 'local-mirrored',
      };
    }

    saveLocalCacheReports(data as CivicReport[]);
    return {
      reports: data as CivicReport[],
      mode: 'live-supabase',
    };
  } catch (err: any) {
    return {
      reports: getLocalCacheReports(),
      mode: 'local-mirrored',
      error: err?.message || 'Network error connecting to Supabase',
    };
  }
}

export async function insertReport(
  newReport: CivicReport,
  config?: ApiConfig
): Promise<{ report: CivicReport; persistedToSupabase: boolean; error?: string }> {
  // Always update local cache immediately for instant UI responsiveness
  const currentLocal = getLocalCacheReports();
  const updatedLocal = [newReport, ...currentLocal];
  saveLocalCacheReports(updatedLocal);

  const client = getSupabaseClient(config);
  if (!client) {
    return { report: newReport, persistedToSupabase: false };
  }

  try {
    const dbRow = sanitizeForSupabase(newReport);
    const { data, error } = await client
      .from('reports')
      .insert([dbRow])
      .select('*')
      .single();

    if (error) {
      return {
        report: newReport,
        persistedToSupabase: false,
        error: error.message,
      };
    }

    const savedReport: CivicReport = {
      ...(data as CivicReport),
      triage_source: newReport.triage_source,
      similarity_score: newReport.similarity_score,
      distance_to_duplicate_m: newReport.distance_to_duplicate_m,
    };

    const syncedLocal = updatedLocal.map((r) => (r.id === newReport.id ? savedReport : r));
    saveLocalCacheReports(syncedLocal);

    return { report: savedReport, persistedToSupabase: true };
  } catch (err: any) {
    return {
      report: newReport,
      persistedToSupabase: false,
      error: err?.message || 'Supabase insert error',
    };
  }
}

export async function updateReportInDb(
  id: string,
  updates: Partial<CivicReport>,
  config?: ApiConfig
): Promise<{ persistedToSupabase: boolean; error?: string }> {
  const currentLocal = getLocalCacheReports();
  const updatedLocal = currentLocal.map((r) => (r.id === id ? { ...r, ...updates } : r));
  saveLocalCacheReports(updatedLocal);

  const client = getSupabaseClient(config);
  if (!client) {
    return { persistedToSupabase: false };
  }

  try {
    const dbUpdates = sanitizeForSupabase(updates);
    const { error } = await client.from('reports').update(dbUpdates).eq('id', id);
    if (error) {
      return { persistedToSupabase: false, error: error.message };
    }
    return { persistedToSupabase: true };
  } catch (err: any) {
    return { persistedToSupabase: false, error: err?.message };
  }
}

export async function resetOrSeedBaselineDataset(
  config?: ApiConfig
): Promise<{ reports: CivicReport[]; mode: 'live-supabase' | 'local-mirrored' }> {
  saveLocalCacheReports([...INITIAL_SYNTHETIC_REPORTS]);
  const client = getSupabaseClient(config);
  if (!client) {
    return { reports: [...INITIAL_SYNTHETIC_REPORTS], mode: 'local-mirrored' };
  }

  try {
    const seedPayload = INITIAL_SYNTHETIC_REPORTS.map((r) => sanitizeForSupabase(r));
    const { data, error } = await client
      .from('reports')
      .upsert(seedPayload, { onConflict: 'id' })
      .select('*');

    if (!error && data) {
      return { reports: data as CivicReport[], mode: 'live-supabase' };
    }
  } catch (e) {
    console.warn('Reset seed fallback to local:', e);
  }
  return { reports: [...INITIAL_SYNTHETIC_REPORTS], mode: 'local-mirrored' };
}

