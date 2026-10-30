import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateHaversineMeters,
  calculateCosineSimilarity,
  analyzeSpatialAndSemanticContext,
  parseOrComputeFactorBreakdown,
} from '../utils/geospatial';
import {
  sanitizeInput,
  validateCoordinates,
  validateImageUrl,
  checkRateLimit,
  resetRateLimitBuckets,
} from '../utils/security';
import {
  runDeterministicFallbackTriage,
  runGeminiTriagePipeline,
  generateExecutiveActionBrief,
} from '../services/aiTriageEngine';
import { INITIAL_SYNTHETIC_REPORTS } from '../data/syntheticReports';

describe('CivicPulse AI — Geospatial, Security & AI Triage Pipeline Suite', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it('1. calculates exact Haversine distance (<250m) between nearby MG Road Pillar 42 coordinates', () => {
    // Report #0001 (12.9756, 77.6066) and Report #0004 (12.9757, 77.6065)
    const dist = calculateHaversineMeters(12.9756, 77.6066, 12.9757, 77.6065);
    expect(dist).toBeGreaterThanOrEqual(10);
    expect(dist).toBeLessThan(250);

    // Distance between MG Road and Whitefield (>10km)
    const farDist = calculateHaversineMeters(12.9756, 77.6066, 12.9855, 77.7368);
    expect(farDist).toBeGreaterThan(10000);
  });

  it('2. computes synonym-normalized TF cosine similarity for duplicate civic complaints', () => {
    const textA = 'Deep flooded pothole crater on MG Road Pillar 42 causing bike crashes';
    const textB = 'Submerged crater pothole in rainwater at MG Road Metro Pillar 42';
    const sim = calculateCosineSimilarity(textA, textB);
    expect(sim).toBeGreaterThanOrEqual(0.45);

    const unrelated = 'Day-burning LED streetlights in Yelahanka New Town median';
    const lowSim = calculateCosineSimilarity(textA, unrelated);
    expect(lowSim).toBeLessThan(0.2);
  });

  it('3. detects spatial + semantic duplicates (<250m) and assigns CLUSTER-MG-DRAIN (<300m)', () => {
    const match = analyzeSpatialAndSemanticContext(
      'Deep flooded pothole on MG Road Pillar 42 causing two-wheelers to skid',
      'Roads & Potholes',
      12.9757,
      77.6067,
      INITIAL_SYNTHETIC_REPORTS
    );

    expect(match.detectedClusterId).toBe('CLUSTER-MG-DRAIN');
    expect(match.duplicateCandidate).not.toBeNull();
    expect(match.duplicateCandidate?.id).toBe('11111111-1111-4111-8111-000000000001');
    expect(match.distanceMeters).toBeLessThan(250);
    expect(match.nearbyReportsWithin300m.length).toBeGreaterThanOrEqual(4);
  });

  it('4. decomposes 4-factor explainable priority scores (Safety, Vulnerable Proximity, Arterial Traffic, Compound Cluster)', () => {
    const sampleReport = INITIAL_SYNTHETIC_REPORTS[0]; // Score 96
    const breakdown = parseOrComputeFactorBreakdown(sampleReport);

    expect(breakdown.safety_risk).toBe(38);
    expect(breakdown.vulnerable_proximity).toBe(20);
    expect(breakdown.arterial_traffic_impact).toBe(20);
    expect(breakdown.compound_cluster_factor).toBe(18);
    const sum =
      breakdown.safety_risk +
      breakdown.vulnerable_proximity +
      breakdown.arterial_traffic_impact +
      breakdown.compound_cluster_factor;
    expect(sum).toBe(sampleReport.ai_priority_score);
  });

  it('5. classifies electricity hazards and routes to BESCOM in deterministic hybrid fallback', () => {
    const result = runDeterministicFallbackTriage(
      'Sparking high-voltage transformer pole and live wire near Indiranagar bus stand and school',
      'Streetlights', // Intentionally mis-selected by citizen to verify AI override
      '100 Feet Road, Indiranagar, Bengaluru',
      12.9785,
      77.6409,
      INITIAL_SYNTHETIC_REPORTS
    );

    expect(result.ai_category).toBe('Electricity');
    expect(result.ai_priority).toBe('Critical');
    expect(result.ai_priority_score).toBeGreaterThanOrEqual(90);
    expect(result.cluster_id).toBe('CLUSTER-IND-POWER');
    expect(result.duplicate_of).toBe('11111111-1111-4111-8111-000000000007');
    expect(result.assigned_department).toContain('BESCOM');
    expect(result.triage_source).toBe('Deterministic Hybrid Fallback');
  });

  it('6. falls back deterministically when Gemini API key is omitted and returns structured receipt', async () => {
    const triage = await runGeminiTriagePipeline({
      description: 'Raw sewage overflowing outside pediatric clinic in Koramangala 4th Block',
      category: 'Water & Sewage',
      address: '80 Feet Road, Koramangala 4th Block',
      latitude: 12.9346,
      longitude: 77.6264,
      imageBase64OrUrl: null,
      existingReports: INITIAL_SYNTHETIC_REPORTS,
      geminiApiKey: '',
    });

    expect(triage.triage_source).toBe('Deterministic Hybrid Fallback');
    expect(triage.cluster_id).toBe('CLUSTER-KOR-WASTE');
    expect(triage.ai_priority_score).toBeGreaterThanOrEqual(85);
    expect(triage.ai_reasoning).toContain('Safety Risk');
  });

  it('7. synthesizes a 60-Second Executive Action Brief for CLUSTER-MG-DRAIN when offline', async () => {
    const brief = await generateExecutiveActionBrief({
      targetId: 'CLUSTER-MG-DRAIN',
      reports: INITIAL_SYNTHETIC_REPORTS,
      geminiApiKey: '',
    });

    expect(brief.target_id).toBe('CLUSTER-MG-DRAIN');
    expect(brief.source).toBe('Deterministic Hybrid Fallback');
    expect(brief.root_cause_hypothesis).toContain('Pillar 40');
    expect(brief.departments_to_coordinate.length).toBeGreaterThanOrEqual(3);
    expect(brief.risk_if_ignored_24h.length).toBeGreaterThan(20);
  });

  it('8. sanitizes XSS/SQL injection vectors, validates GPS bounds, and enforces client rate limits', () => {
    const malicious =
      '<script>alert("xss")</script>Deep pothole on MG Road; DROP TABLE reports; -- <img src=x onerror="steal()">';
    const clean = sanitizeInput(malicious);

    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('DROP TABLE');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('Deep pothole on MG Road');

    const invalidCoords = validateCoordinates(145.0, -290.0);
    expect(invalidCoords.valid).toBe(false);
    expect(invalidCoords.latitude).toBe(12.9756);

    const validCoords = validateCoordinates(12.9784, 77.6408);
    expect(validCoords.valid).toBe(true);

    expect(validateImageUrl('javascript:alert(1)')).toBeNull();
    expect(
      validateImageUrl('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7')
    ).not.toBeNull();

    expect(checkRateLimit('test_bucket', 2, 60000)).toBe(true);
    expect(checkRateLimit('test_bucket', 2, 60000)).toBe(true);
    expect(checkRateLimit('test_bucket', 2, 60000)).toBe(false);
  });
});

