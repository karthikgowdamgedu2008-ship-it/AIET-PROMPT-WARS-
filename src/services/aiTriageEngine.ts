import {
  CivicReport,
  ExecutiveActionBrief,
  ReportCategory,
  ReportPriority,
  TriageResult,
} from '../types';
import { ACTIVE_CLUSTERS } from '../data/syntheticReports';

// ============================================================================
// 1. GEOSPATIAL HAVERSINE DISTANCE ENGINE (Exact meters)
// ============================================================================
export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
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

// ============================================================================
// 2. SEMANTIC KEYWORD COSINE SIMILARITY ENGINE
// ============================================================================
const STOP_WORDS = new Set([
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

function tokenizeAndNormalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .map((w) => SYNONYM_MAP[w] || w);
}

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

// ============================================================================
// 3. SPATIAL + SEMANTIC DUPLICATE & CLUSTER FINDER (<250m & <300m)
// ============================================================================
export interface SpatialMatchAnalysis {
  duplicateCandidate: CivicReport | null;
  distanceMeters: number | null;
  similarityScore: number;
  detectedClusterId: string | null;
  nearbyReportsWithin300m: CivicReport[];
}

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

  // Determine cluster_id: check active clusters within 300m or inherit from nearby reports
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

// ============================================================================
// 4. EXPLAINABLE FACTOR BREAKDOWN PARSER & GENERATOR
// ============================================================================
export function parseOrComputeFactorBreakdown(report: CivicReport): {
  safety_risk: number;
  vulnerable_proximity: number;
  arterial_traffic_impact: number;
  compound_cluster_factor: number;
} {
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

  // Deterministic proportional synthesis summing to ai_priority_score
  const total = report.ai_priority_score || 70;
  const hasCluster = Boolean(report.cluster_id);
  const compound = hasCluster ? Math.min(20, Math.round(total * 0.21)) : Math.min(16, Math.round(total * 0.16));
  const safety = Math.min(40, Math.round(total * 0.41));
  const vuln = Math.min(20, Math.round(total * 0.20));
  const traffic = Math.max(4, Math.min(20, total - (safety + vuln + compound)));

  return {
    safety_risk: safety,
    vulnerable_proximity: vuln,
    arterial_traffic_impact: traffic,
    compound_cluster_factor: compound,
  };
}

const DEPARTMENT_BY_CATEGORY: Record<string, string> = {
  'Waterlogging': 'BBMP Storm Water Drain (SWD) Cell',
  'Roads & Potholes': 'BBMP Road Infrastructure & Rapid Response',
  'Waste / Garbage': 'Bengaluru Solid Waste Management Ltd (BSWML)',
  'Streetlights': 'BBMP Electrical Division',
  'Electricity': 'BESCOM Emergency Vigilance & O&M',
  'Water & Sewage': 'BWSSB Sanitary & Storm Engineering',
  'Public Safety': 'BBMP Disaster Management & Traffic Police',
  'Trees & Parks': 'BBMP Forest Cell & Horticulture',
};

// ============================================================================
// 5. DETERMINISTIC HYBRID FALLBACK TRIAGE ALGORITHM
// ============================================================================
export function runDeterministicFallbackTriage(
  description: string,
  userCategory: ReportCategory | string,
  address: string,
  latitude: number,
  longitude: number,
  existingReports: CivicReport[]
): TriageResult {
  const spatial = analyzeSpatialAndSemanticContext(
    description,
    userCategory,
    latitude,
    longitude,
    existingReports
  );

  const lower = `${description} ${address}`.toLowerCase();

  // Infer AI category
  let aiCategory = userCategory;
  if (lower.includes('spark') || lower.includes('transformer') || lower.includes('shock') || lower.includes('bescom')) {
    aiCategory = 'Electricity';
  } else if (lower.includes('manhole') || lower.includes('sewage') || lower.includes('bwssb')) {
    aiCategory = 'Water & Sewage';
  } else if (lower.includes('pothole') || lower.includes('crater') || lower.includes('asphalt')) {
    aiCategory = 'Roads & Potholes';
  } else if (lower.includes('flood') || lower.includes('waterlog') || lower.includes('knee-deep')) {
    aiCategory = 'Waterlogging';
  } else if (lower.includes('garbage') || lower.includes('leachate') || lower.includes('waste')) {
    aiCategory = 'Waste / Garbage';
  }

  // Factor 1: Safety Risk (0-40)
  let safety = 22;
  if (/(spark|live wire|electrocution|open manhole|submerged|crash|skid|fell|ambulance|fire|toxic|sewage)/i.test(lower)) {
    safety = 38;
  } else if (/(deep|flood|hazard|broken|dark|fallen|hanging)/i.test(lower)) {
    safety = 31;
  }

  // Factor 2: Vulnerable Proximity (0-20)
  let vuln = 12;
  if (/(school|hospital|clinic|bus stand|bus stop|metro|children|senior|pedestrian)/i.test(lower)) {
    vuln = 19;
  }

  // Factor 3: Arterial Traffic Impact (0-20)
  let traffic = 13;
  if (/(mg road|100ft|80ft|pillar 42|indiranagar|koramangala|hebbal|silk board|whitefield|flyover)/i.test(lower)) {
    traffic = 19;
  }

  // Factor 4: Compound Cluster Factor (0-20)
  let compound = spatial.detectedClusterId ? 19 : Math.min(15, 8 + spatial.nearbyReportsWithin300m.length * 2);

  const totalScore = Math.min(99, Math.max(25, safety + vuln + traffic + compound));

  let priority: ReportPriority = 'Medium';
  if (totalScore >= 88) priority = 'Critical';
  else if (totalScore >= 75) priority = 'High';
  else if (totalScore >= 50) priority = 'Medium';
  else priority = 'Low';

  const cleanSnippet = description.trim().replace(/\s+/g, ' ');
  const generatedTitle =
    cleanSnippet.length <= 68
      ? cleanSnippet
      : `${cleanSnippet.slice(0, 65).trim()}...`;

  const dupClause = spatial.duplicateCandidate
    ? ` Semantic & Spatial Duplicate (${spatial.distanceMeters}m from Report #${spatial.duplicateCandidate.id.slice(-4)}, ${Math.round(
        spatial.similarityScore * 100
      )}% similarity).`
    : '';

  const reasoning = `Safety Risk (${safety}/40): Immediate physical hazard assessment from report telemetry. Vulnerable Proximity (${vuln}/20): Proximity to transit hubs, schools, or clinics. Arterial Traffic (${traffic}/20): Corridor disruption impact. Compound Cluster (${compound}/20): ${
    spatial.detectedClusterId
      ? `Active multi-ticket hotspot ${spatial.detectedClusterId} (${spatial.nearbyReportsWithin300m.length} reports within 300m).`
      : `${spatial.nearbyReportsWithin300m.length} nearby tickets within 300m.`
  }${dupClause}`;

  return {
    title: generatedTitle,
    ai_category: aiCategory,
    ai_summary: `AI Triage (${aiCategory}): ${cleanSnippet.slice(0, 125)}${
      cleanSnippet.length > 125 ? '...' : ''
    }`,
    ai_priority: priority,
    ai_priority_score: totalScore,
    ai_reasoning: reasoning,
    duplicate_of: spatial.duplicateCandidate ? spatial.duplicateCandidate.id : null,
    cluster_id: spatial.detectedClusterId,
    assigned_department:
      DEPARTMENT_BY_CATEGORY[aiCategory] || 'BBMP Central Command & Rapid Response',
    triage_source: 'Deterministic Hybrid Fallback',
    similarity_score: spatial.similarityScore || undefined,
    distance_to_duplicate_m: spatial.distanceMeters ?? undefined,
    factor_breakdown: {
      safety_risk: safety,
      vulnerable_proximity: vuln,
      arterial_traffic_impact: traffic,
      compound_cluster_factor: compound,
    },
  };
}

// Helper: Call Gemini 2.5 Flash first, with automatic backup to gemini-2.0-flash on 404/400, and strip ```json fences
async function callGeminiWithBackupAndCleanJson(
  apiKey: string,
  parts: any[],
  temperature = 0.15
): Promise<any | null> {
  const cleanKey = apiKey.trim();
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature,
            responseMimeType: 'application/json',
          },
        }),
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          continue; // Try backup model
        }
        return null;
      }

      const resultJson = await response.json();
      const rawText: string | undefined =
        resultJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleanedText = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      return JSON.parse(cleanedText);
    } catch (err) {
      console.warn(`Gemini model ${model} attempt failed:`, err);
    }
  }
  return null;
}

// ============================================================================
// 6. LIVE GEMINI 2.5 FLASH MULTIMODAL / JSON TRIAGE PIPELINE
// ============================================================================
export async function runGeminiTriagePipeline(params: {
  description: string;
  category: ReportCategory | string;
  address: string;
  latitude: number;
  longitude: number;
  imageBase64OrUrl: string | null;
  existingReports: CivicReport[];
  geminiApiKey: string;
}): Promise<TriageResult> {
  const {
    description,
    category,
    address,
    latitude,
    longitude,
    imageBase64OrUrl,
    existingReports,
    geminiApiKey,
  } = params;

  const spatial = analyzeSpatialAndSemanticContext(
    description,
    category,
    latitude,
    longitude,
    existingReports
  );

  const fallbackResult = runDeterministicFallbackTriage(
    description,
    category,
    address,
    latitude,
    longitude,
    existingReports
  );

  if (!geminiApiKey || geminiApiKey.trim().length < 10) {
    return fallbackResult;
  }

  try {
    const nearbyContextJson = spatial.nearbyReportsWithin300m.slice(0, 8).map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      distance_meters: calculateHaversineMeters(latitude, longitude, r.latitude, r.longitude),
      cluster_id: r.cluster_id,
      priority_score: r.ai_priority_score,
    }));

    const promptText = `You are CivicPulse AI, Bengaluru's Municipal Decision-Intelligence Triage Engine.
Analyze this incoming citizen complaint and nearby reports within 300m from Supabase.

NEW CITIZEN REPORT:
- User Category: "${category}"
- Description: "${description}"
- Location Address: "${address}" (Lat: ${latitude}, Lng: ${longitude})
- Pre-computed Spatial Duplicate Candidate (<250m): ${
      spatial.duplicateCandidate
        ? JSON.stringify({
            id: spatial.duplicateCandidate.id,
            title: spatial.duplicateCandidate.title,
            distance_m: spatial.distanceMeters,
            cosine_similarity: spatial.similarityScore,
          })
        : 'None'
    }
- Detected Geographic Cluster (<300m): ${spatial.detectedClusterId || 'None'}
- Nearby Reports within 300m: ${JSON.stringify(nearbyContextJson)}

Return ONLY valid JSON with these exact keys:
{
  "title": "Concise 6-10 word actionable headline",
  "ai_category": "One of: Waterlogging | Roads & Potholes | Waste / Garbage | Streetlights | Electricity | Water & Sewage | Public Safety | Trees & Parks",
  "ai_summary": "1-sentence executive summary of the civic risk and impact",
  "safety_risk": number (0 to 40),
  "vulnerable_proximity": number (0 to 20),
  "arterial_traffic_impact": number (0 to 20),
  "compound_cluster_factor": number (0 to 20),
  "ai_priority": "One of: Critical | High | Medium | Low",
  "ai_priority_score": number (sum of the 4 factors, 0 to 100),
  "ai_reasoning": "Must start with: Safety Risk (X/40): ... Vulnerable Proximity (Y/20): ... Arterial Traffic (Z/20): ... Compound Cluster (W/20): ...",
  "duplicate_of": "UUID string of matching nearby report if duplicate (<250m and same issue), else null",
  "cluster_id": "CLUSTER-MG-DRAIN | CLUSTER-IND-POWER | CLUSTER-KOR-WASTE | null",
  "assigned_department": "Specific Bengaluru agency (e.g., BESCOM Emergency Vigilance, BBMP SWD Cell, BWSSB Sanitary Engineering, BSWML)"
}`;

    const parts: any[] = [{ text: promptText }];

    // Pass base64 image to Gemini Vision if uploaded as data URL
    if (imageBase64OrUrl && imageBase64OrUrl.startsWith('data:image/')) {
      const match = imageBase64OrUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inline_data: {
            mime_type: match[1],
            data: match[2],
          },
        });
      }
    }

    const parsed = await callGeminiWithBackupAndCleanJson(geminiApiKey, parts, 0.15);
    if (!parsed) {
      return fallbackResult;
    }

    const safety = Math.min(40, Math.max(0, Number(parsed.safety_risk ?? fallbackResult.factor_breakdown.safety_risk)));
    const vuln = Math.min(20, Math.max(0, Number(parsed.vulnerable_proximity ?? fallbackResult.factor_breakdown.vulnerable_proximity)));
    const traffic = Math.min(20, Math.max(0, Number(parsed.arterial_traffic_impact ?? fallbackResult.factor_breakdown.arterial_traffic_impact)));
    const compound = Math.min(20, Math.max(0, Number(parsed.compound_cluster_factor ?? fallbackResult.factor_breakdown.compound_cluster_factor)));
    const score = Math.min(100, Math.max(10, Number(parsed.ai_priority_score || safety + vuln + traffic + compound)));

    return {
      title: parsed.title || fallbackResult.title,
      ai_category: parsed.ai_category || fallbackResult.ai_category,
      ai_summary: parsed.ai_summary || fallbackResult.ai_summary,
      ai_priority: (['Critical', 'High', 'Medium', 'Low'].includes(parsed.ai_priority)
        ? parsed.ai_priority
        : fallbackResult.ai_priority) as ReportPriority,
      ai_priority_score: score,
      ai_reasoning: parsed.ai_reasoning || fallbackResult.ai_reasoning,
      duplicate_of:
        parsed.duplicate_of ||
        (spatial.duplicateCandidate ? spatial.duplicateCandidate.id : null),
      cluster_id: parsed.cluster_id || spatial.detectedClusterId,
      assigned_department: parsed.assigned_department || fallbackResult.assigned_department,
      triage_source: 'Live Gemini 2.5 Flash API',
      similarity_score: spatial.similarityScore || undefined,
      distance_to_duplicate_m: spatial.distanceMeters ?? undefined,
      factor_breakdown: {
        safety_risk: safety,
        vulnerable_proximity: vuln,
        arterial_traffic_impact: traffic,
        compound_cluster_factor: compound,
      },
    };
  } catch (err) {
    console.warn('Gemini API exception, falling back to deterministic engine:', err);
    return fallbackResult;
  }
}

// ============================================================================
// 7. 60-SECOND EXECUTIVE ACTION BRIEF GENERATOR (CLUSTER OR CITY-WIDE)
// ============================================================================
const FALLBACK_ACTION_BRIEFS: Record<string, Omit<ExecutiveActionBrief, 'generated_at' | 'source' | 'total_reports_analyzed' | 'compound_severity_score'>> = {
  'CLUSTER-MG-DRAIN': {
    target_id: 'CLUSTER-MG-DRAIN',
    target_name: 'MG Road Pillar 42 Compound Flood & Crater Crisis',
    root_cause_hypothesis:
      'Illegal construction silt and plastic waste have cemented shut the primary storm-water inlet gratings at MG Road Pillar 40 (#0005), causing 2.5ft arterial surface ponding (#0003) that conceals a 2ft deep asphalt crater (#0001, #0004) and has hydraulically popped open a BWSSB cast-iron manhole cover (#0002).',
    immediate_first_response:
      '1. Deploy BTP & BBMP steel barricades and solar blinkers around Pillar 42 crater and open manhole at Pillar 43 within 15 minutes. 2. Position 50HP mobile dewatering pump at Pillar 41 and use JCB suction jetting to clear Pillar 40 storm grate before laying cold-mix asphalt.',
    departments_to_coordinate: [
      'BBMP Storm Water Drain (SWD) Cell',
      'BWSSB Sanitary & Storm Engineering',
      'BBMP Road Infrastructure & Rapid Response',
      'Bengaluru Traffic Police (CBD East)',
    ],
    risk_if_ignored_24h:
      'High probability of fatal two-wheeler overturn or pedestrian drowning in the submerged open manhole shaft during evening peak metro dispersal, plus complete paralysis of the MG Road–Trinity hospital ambulance corridor.',
  },
  'CLUSTER-IND-POWER': {
    target_id: 'CLUSTER-IND-POWER',
    target_name: 'Indiranagar 100ft Rd Grid & Transformer Hazard',
    root_cause_hypothesis:
      'Monsoon wind-throw snapped a heavy Gulmohar limb onto energized BESCOM 11kV/LT overhead conductors at 12th Main (#0008), inducing mechanical tension, insulator failure, and active high-voltage arcing next to the crowded 100ft Road bus shelter (#0007, #0009) while tripping the CMH junction signal feeder (#0010).',
    immediate_first_response:
      '1. Immediately isolate 11kV Feeder F-14 from HAL 2nd Stage Substation and cordon a 25m exclusion zone around Indiranagar bus stand. 2. Dispatch joint BESCOM O&M + BBMP Forest chainsaw squad to clear the 12th Main tree limb and secure the exposed 415V footpath feeder box (#0011).',
    departments_to_coordinate: [
      'BESCOM Emergency Vigilance & O&M East',
      'BBMP Forest Cell (East Zone)',
      'Bengaluru Traffic Police (Indiranagar Signal Control)',
      'BBMP Streetlight Electrical Division',
    ],
    risk_if_ignored_24h:
      'Imminent risk of fatal step-potential electrocution on wet footpath pavement during school dispersal hours and multi-vehicle night collisions at the unlit CMH–100ft Road 4-way intersection.',
  },
  'CLUSTER-KOR-WASTE': {
    target_id: 'CLUSTER-KOR-WASTE',
    target_name: 'Koramangala 4th Block Leachate & Sewage Contamination',
    root_cause_hypothesis:
      'A 4-day uncollected 15-ton municipal & clinic waste black-spot on 80ft Road (#0013, #0014) has washed solid plastic into the 7th Cross culvert (#0015), while surcharging BWSSB sanitary mains are mixing with toxic garbage leachate and seeping into residential underground potable water sumps outside the pediatric clinic (#0012).',
    immediate_first_response:
      '1. Issue immediate potable water boil/tanker advisory for 4th Block 80ft Rd residents and super-chlorinate affected sumps. 2. Deploy BSWML 14-ton compactors for total waste lifting simultaneously with BWSSB high-pressure sewer jetting at Sony World trunk line.',
    departments_to_coordinate: [
      'BWSSB Sanitary Maintenance & Water Quality Lab',
      'Bengaluru Solid Waste Management Ltd (BSWML)',
      'BBMP Public Health & Vector Control',
      'BBMP Animal Husbandry Cell',
    ],
    risk_if_ignored_24h:
      'Acute waterborne gastroenteritis/cholera outbreak among pediatric clinic patients and residents due to cross-contamination of drinking water sumps, compounded by dengue vector proliferation.',
  },
  'CITY-OVERALL': {
    target_id: 'CITY-OVERALL',
    target_name: 'Bengaluru City-Wide Command Synthesis (All Active Clusters)',
    root_cause_hypothesis:
      'Monsoon precipitation interacting with three multi-agency bottlenecks: (1) SWD inlet siltation causing submerged road craters & manhole displacement on MG Road, (2) Unpruned canopy failures snapping live BESCOM feeders in Indiranagar, and (3) Delayed solid-waste compaction choking storm/sewer drains in Koramangala.',
    immediate_first_response:
      'Prioritize life-safety dispatches to the top 4 Critical >92-score incidents: isolate Indiranagar Feeder F-14 (#0007), barricade & cover MG Road Pillar 42/43 crater and open shaft (#0001/#0002), and deploy BWSSB jetting + chlorination units to Koramangala 4th Block (#0012).',
    departments_to_coordinate: [
      'BBMP Central Command & Disaster Management',
      'BESCOM 24x7 Vigilance Control Room',
      'BWSSB Emergency Jetting & Water Quality Wing',
      'Bengaluru Traffic Police & BSWML Operations',
    ],
    risk_if_ignored_24h:
      'Cascading failure across 3 primary commercial/transit zones affecting 180,000+ daily commuters, with severe liability for preventable electrocution, submerged vehicle crashes, and potable water contamination.',
  },
};

export async function generateExecutiveActionBrief(params: {
  targetId: string; // 'CLUSTER-MG-DRAIN' | 'CLUSTER-IND-POWER' | 'CLUSTER-KOR-WASTE' | 'CITY-OVERALL'
  reports: CivicReport[];
  geminiApiKey: string;
}): Promise<ExecutiveActionBrief> {
  const { targetId, reports, geminiApiKey } = params;

  const relevantReports =
    targetId === 'CITY-OVERALL'
      ? reports.slice(0, 18)
      : reports.filter((r) => r.cluster_id === targetId);

  const avgScore =
    relevantReports.length > 0
      ? Math.round(
          relevantReports.reduce((acc, r) => acc + (r.ai_priority_score || 75), 0) /
            relevantReports.length
        )
      : 88;

  const preset =
    FALLBACK_ACTION_BRIEFS[targetId] || FALLBACK_ACTION_BRIEFS['CITY-OVERALL'];

  const fallbackBrief: ExecutiveActionBrief = {
    ...preset,
    generated_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    source: 'Deterministic Hybrid Fallback',
    total_reports_analyzed: relevantReports.length,
    compound_severity_score: Math.min(99, avgScore + 5),
  };

  if (!geminiApiKey || geminiApiKey.trim().length < 10) {
    return fallbackBrief;
  }

  try {
    const condensedTickets = relevantReports.map((r) => ({
      id: r.id.slice(-4),
      category: r.ai_category || r.category,
      title: r.title,
      priority_score: r.ai_priority_score,
      address: r.address,
      duplicate_of: r.duplicate_of ? r.duplicate_of.slice(-4) : null,
    }));

    const prompt = `You are the Chief Municipal AI Advisor for Bengaluru Command Center.
Synthesize these ${relevantReports.length} clustered citizen complaints (${preset.target_name}) into a crisp 60-Second Executive Action Brief.
Instead of treating tickets in isolation, reveal how they form a compound root-cause crisis.

CLUSTER TICKETS:
${JSON.stringify(condensedTickets)}

Return ONLY valid JSON with these exact keys:
{
  "root_cause_hypothesis": "2-3 crisp sentences explaining the causal chain linking these multi-category tickets",
  "immediate_first_response": "Numbered 1-2 immediate field actions within the next 30 minutes",
  "departments_to_coordinate": ["Array of 3 to 4 specific Bengaluru civic departments"],
  "risk_if_ignored_24h": "1-2 sentences detailing concrete human safety, health, or arterial gridlock consequences if ignored for 24 hours"
}`;

    const parsed = await callGeminiWithBackupAndCleanJson(
      geminiApiKey,
      [{ text: prompt }],
      0.2
    );
    if (!parsed) return fallbackBrief;

    return {
      target_id: targetId,
      target_name: preset.target_name,
      generated_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      source: 'Live Gemini 2.5 Flash API',
      root_cause_hypothesis:
        parsed.root_cause_hypothesis || fallbackBrief.root_cause_hypothesis,
      immediate_first_response:
        parsed.immediate_first_response || fallbackBrief.immediate_first_response,
      departments_to_coordinate: Array.isArray(parsed.departments_to_coordinate)
        ? parsed.departments_to_coordinate
        : fallbackBrief.departments_to_coordinate,
      risk_if_ignored_24h:
        parsed.risk_if_ignored_24h || fallbackBrief.risk_if_ignored_24h,
      total_reports_analyzed: relevantReports.length,
      compound_severity_score: Math.min(99, avgScore + 5),
    };
  } catch (e) {
    console.warn('Gemini Action Brief fallback triggered:', e);
    return fallbackBrief;
  }
}

