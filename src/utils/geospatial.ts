/**
 * @fileoverview Geospatial Haversine distance, TF cosine similarity,
 * multi-category cluster detection, and explainable 4-factor priority calculation.
 */

import {
  CivicReport,
  PriorityFactorBreakdown,
  SpatialMatchAnalysis,
} from '../types/civic';
import { ACTIVE_CLUSTERS } from '../data/syntheticReports';

/**
 * Calculates the exact great-circle Haversine distance in meters between two WGS84 coordinates.
 *
 * @param lat1 - Latitude of point 1 in decimal degrees.
 * @param lon1 - Longitude of point 1 in decimal degrees.
 * @param lat2 - Latitude of point 2 in decimal degrees.
 * @param lon2 - Longitude of point 2 in decimal degrees.
 * @returns Distance in meters rounded to the nearest integer.
 */
export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const STOP_WORDS = new Set<string>([
  'the', 'and', 'for', 'near', 'with', 'from', 'that', 'this', 'have', 'has',
  'are', 'was', 'were', 'been', 'into', 'onto', 'right', 'next', 'very', 'just',
  'road', 'street', 'bengaluru', 'bangalore', 'block', 'main', 'cross', 'area',
]);

const SYNONYM_MAP: Record<string, string> = {
  crater: 'pothole',
  potholes: 'pothole',
  trench: 'pothole',
  hole: 'pothole',
  flooded: 'waterlogging',
  flood: 'waterlogging',
  flooding: 'waterlogging',
  inundated: 'waterlogging',
  submerged: 'waterlogging',
  waterlogged: 'waterlogging',
  sparking: 'sparks',
  arcing: 'sparks',
  wires: 'wire',
  cables: 'wire',
  cable: 'wire',
  transformer: 'pole',
  electric: 'electricity',
  electrical: 'electricity',
  garbage: 'waste',
  trash: 'waste',
  dump: 'waste',
  leachate: 'sewage',
  manhole: 'sewage',
  drain: 'sewage',
  sanitary: 'sewage',
};

/**
 * Tokenizes and normalizes civic complaint text using domain synonym canonicalization.
 *
 * @param text - Input text to tokenize.
 * @returns Array of normalized domain tokens.
 */
export function tokenizeAndNormalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .map((w) => SYNONYM_MAP[w] || w);
}

/**
 * Computes the semantic Term-Frequency (TF) cosine similarity between two civic complaint texts.
 *
 * @param textA - First complaint text.
 * @param textB - Second complaint text.
 * @returns Cosine similarity score in `[0, 1]` rounded to 2 decimal places.
 */
export function calculateCosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenizeAndNormalize(textA);
  const tokensB = tokenizeAndNormalize(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const freqA: Record<string, number> = {};
  const freqB: Record<string, number> = {};
  const vocab = new Set<string>();

  for (const t of tokensA) {
    freqA[t] = (freqA[t] || 0) + 1;
    vocab.add(t);
  }
  for (const t of tokensB) {
    freqB[t] = (freqB[t] || 0) + 1;
    vocab.add(t);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  vocab.forEach((word) => {
    const a = freqA[word] || 0;
    const b = freqB[word] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  });

  if (normA === 0 || normB === 0) return 0;
  return Number((dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))).toFixed(2));
}

/**
 * Analyzes spatial proximity (`<250m` duplicate check and `<300m` cluster membership)
 * and semantic similarity against existing reports.
 *
 * @param description - Incoming citizen description.
 * @param category - Incoming citizen category.
 * @param latitude - Report latitude.
 * @param longitude - Report longitude.
 * @param existingReports - Active reports from Supabase/store.
 * @returns Spatial and semantic match analysis result.
 */
export function analyzeSpatialAndSemanticContext(
  description: string,
  category: string,
  latitude: number,
  longitude: number,
  existingReports: CivicReport[]
): SpatialMatchAnalysis {
  let bestDuplicate: CivicReport | null = null;
  let bestScore = 0;
  let bestDist: number | null = null;
  const nearbyWithin300m: CivicReport[] = [];

  for (const rep of existingReports) {
    const dist = calculateHaversineMeters(
      latitude,
      longitude,
      rep.latitude,
      rep.longitude
    );

    if (dist <= 300) {
      nearbyWithin300m.push(rep);
    }

    // Duplicate detection within 250m radius
    if (dist <= 250 && !rep.duplicate_of) {
      const textSim = calculateCosineSimilarity(
        `${category} ${description}`,
        `${rep.category} ${rep.title} ${rep.description}`
      );
      const categoryBonus =
        rep.category.toLowerCase() === category.toLowerCase() ||
        rep.ai_category?.toLowerCase() === category.toLowerCase()
          ? 0.22
          : 0;
      const combinedSim = Math.min(0.98, Number((textSim + categoryBonus).toFixed(2)));

      if (combinedSim >= 0.36 && combinedSim > bestScore) {
        bestScore = combinedSim;
        bestDuplicate = rep;
        bestDist = dist;
      }
    }
  }

  let detectedClusterId: string | null = null;
  for (const cluster of ACTIVE_CLUSTERS) {
    const distToCluster = calculateHaversineMeters(
      latitude,
      longitude,
      cluster.center[0],
      cluster.center[1]
    );
    if (distToCluster <= cluster.radius_m) {
      detectedClusterId = cluster.cluster_id;
      break;
    }
  }

  if (!detectedClusterId) {
    const clusterNeighbor = nearbyWithin300m.find((r) => r.cluster_id);
    if (clusterNeighbor) {
      detectedClusterId = clusterNeighbor.cluster_id;
    }
  }

  return {
    duplicateCandidate: bestDuplicate,
    distanceMeters: bestDist,
    similarityScore: bestScore,
    detectedClusterId,
    nearbyReportsWithin300m: nearbyWithin300m,
  };
}

/**
 * Parses or deterministically computes the 4-factor explainable priority breakdown
 * (`Safety Risk` /40, `Vulnerable Proximity` /20, `Arterial Traffic` /20, `Compound Cluster` /20).
 *
 * @param report - Civic report record.
 * @returns Structured 4-pillar priority breakdown.
 */
export function parseOrComputeFactorBreakdown(
  report: CivicReport
): PriorityFactorBreakdown {
  const reasoning = report.ai_reasoning || '';
  const safetyMatch = reasoning.match(/Safety Risk\s*\((\d+)\/40\)/i);
  const vulnMatch = reasoning.match(/Vulnerable Proximity\s*\((\d+)\/20\)/i);
  const trafficMatch = reasoning.match(/Arterial Traffic\s*\((\d+)\/20\)/i);
  const clusterMatch = reasoning.match(/Compound Cluster\s*\((\d+)\/20\)/i);

  if (safetyMatch && vulnMatch && trafficMatch && clusterMatch) {
    return {
      safety_risk: Math.min(40, Number(safetyMatch[1])),
      vulnerable_proximity: Math.min(20, Number(vulnMatch[1])),
      arterial_traffic_impact: Math.min(20, Number(trafficMatch[1])),
      compound_cluster_factor: Math.min(20, Number(clusterMatch[1])),
    };
  }

  const total = report.ai_priority_score || 70;
  const hasCluster = Boolean(report.cluster_id);
  const compound = hasCluster
    ? Math.min(20, Math.round(total * 0.21))
    : Math.min(16, Math.round(total * 0.16));
  const safety = Math.min(40, Math.round(total * 0.41));
  const vuln = Math.min(20, Math.round(total * 0.2));
  const traffic = Math.max(4, Math.min(20, total - (safety + vuln + compound)));

  return {
    safety_risk: safety,
    vulnerable_proximity: vuln,
    arterial_traffic_impact: traffic,
    compound_cluster_factor: compound,
  };
}

