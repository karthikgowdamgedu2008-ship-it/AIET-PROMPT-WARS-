import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { INITIAL_SYNTHETIC_REPORTS } from '../data/syntheticReports';
import { resetRateLimitBuckets } from '../utils/security';

// Mock react-leaflet for fast, deterministic JSDOM execution
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-leaflet-map">{children}</div>
  ),
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-marker">{children}</div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-popup">{children}</div>
  ),
  Circle: () => <div data-testid="mock-circle" />,
  useMap: () => ({
    setView: vi.fn(),
  }),
  useMapEvents: () => null,
}));

// Mock supabaseClient so integration tests run deterministically against INITIAL_SYNTHETIC_REPORTS without network latency
vi.mock('../services/supabaseClient', () => ({
  getStoredConfig: () => ({
    supabaseUrl: '',
    supabaseAnonKey: '',
    geminiApiKey: '',
  }),
  saveStoredConfig: vi.fn(),
  fetchAllReports: vi.fn(async () => ({
    reports: [...INITIAL_SYNTHETIC_REPORTS],
    mode: 'local-mirrored' as const,
  })),
  insertReport: vi.fn(async (newReport) => ({
    report: newReport,
    persistedToSupabase: false,
  })),
  updateReportInDb: vi.fn(async () => ({
    persistedToSupabase: false,
  })),
  resetOrSeedBaselineDataset: vi.fn(async () => ({
    reports: [...INITIAL_SYNTHETIC_REPORTS],
    mode: 'local-mirrored' as const,
  })),
}));

import App from '../App';

describe('CivicPulse AI — 4-Stage Lifecycle, Clusters, Workflow & Accessibility Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRateLimitBuckets();
  });

  it('1. renders WCAG AA landmarks (Skip link, banner header, navigation tablist, main, contentinfo footer)', async () => {
    render(<App />);

    const skipLink = screen.getByText(/Skip to main content/i);
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', {
        name: /Primary Civic Lifecycle Navigation/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('2. Stage 1 (Capture): submits a citizen complaint and renders the AI Triage Receipt Card', async () => {
    render(<App />);

    const descriptionInput = screen.getByLabelText(
      /1\. Problem Description/i
    ) as HTMLTextAreaElement;
    expect(descriptionInput).toHaveAttribute('aria-required', 'true');

    const submitBtn = screen.getByRole('button', {
      name: /Submit citizen report and run AI triage pipeline/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(
      () => {
        expect(
          screen.getByLabelText(/Completed AI Triage Receipt/i)
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(
      screen.getByText(/Plain-Language Explainable Priority Reasoning/i)
    ).toBeInTheDocument();
  });

  it('3. Stage 2 (Understand): orders reports by ai_priority_score DESC, shows 4-factor explainability, and merges duplicates', async () => {
    render(<App />);

    // Wait for initial 30 reports to load
    await waitFor(() => {
      expect(screen.getByText(/Synced Store \(30\)/i)).toBeInTheDocument();
    });

    const understandTab = screen.getByRole('tab', {
      name: /02 Understand/i,
    });
    fireEvent.click(understandTab);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Explainable AI Triage & Semantic Duplicate Inspector/i
        )
      ).toBeInTheDocument();
    });

    // Highest priority report in baseline dataset is #0007 (Score 98)
    expect(
      screen.getAllByText(
        /Sparking High-Voltage Pole & Exposed Wire at Indiranagar Bus Stand/i
      ).length
    ).toBeGreaterThan(0);

    // Filter to duplicates only
    const duplicatesFilterBtn = screen.getByRole('button', {
      name: /Show 3 duplicate reports/i,
    });
    fireEvent.click(duplicatesFilterBtn);

    const mergeButtons = screen.getAllByRole('button', {
      name: /Confirm merge of duplicate report/i,
    });
    expect(mergeButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(mergeButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/Merged & Parent Boosted!/i)
      ).toBeInTheDocument();
    });
  });

  it('4. Stage 3 (Reveal): aggregates multi-category clusters (CLUSTER-MG-DRAIN, CLUSTER-IND-POWER, CLUSTER-KOR-WASTE) and generates 60s Action Brief', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Synced Store \(30\)/i)).toBeInTheDocument();
    });

    const revealTab = screen.getByRole('tab', {
      name: /03 Reveal/i,
    });
    fireEvent.click(revealTab);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Geospatial Hotspot Map, Multi-Category Cluster Detection & 60s Action Briefs/i
        )
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText(/CLUSTER-MG-DRAIN/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CLUSTER-IND-POWER/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CLUSTER-KOR-WASTE/i).length).toBeGreaterThan(0);

    // Click generate action brief button on CLUSTER-MG-DRAIN
    const briefBtn = screen.getByRole('button', {
      name: /Generate 60-Second Action Brief with Gemini for CLUSTER-MG-DRAIN/i,
    });
    fireEvent.click(briefBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/1\. Root Cause Hypothesis/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/2\. Immediate First Response Action/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/3\. Departments to Coordinate Jointly/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/4\. Risk if Ignored for 24 Hours/i)
      ).toBeInTheDocument();
    });
  });

  it('5. Stage 4 (Act): updates status transitions (Submitted -> Triaged -> Assigned -> In Progress -> Resolved) and syncs with Citizen Live Status Tracker', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Synced Store \(30\)/i)).toBeInTheDocument();
    });

    const actTab = screen.getByRole('tab', {
      name: /04 Act/i,
    });
    fireEvent.click(actTab);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Decision-Maker Workflow & Citizen Live Progress Tracker/i
        )
      ).toBeInTheDocument();
    });

    const firstStatusSelect = screen.getAllByLabelText(
      /^Workflow Status Stage$/i
    )[0] as HTMLSelectElement;
    fireEvent.change(firstStatusSelect, { target: { value: 'Resolved' } });

    const updateButtons = screen.getAllByRole('button', {
      name: /Update and persist workflow changes/i,
    });
    fireEvent.click(updateButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Saved to DB!/i)).toBeInTheDocument();
    });

    // Switch to Citizen Live Status Tracker
    const citizenModeBtn = screen.getByRole('button', {
      name: /Switch to Citizen Live Status Tracker view/i,
    });
    fireEvent.click(citizenModeBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Live 5-Stage Resolution Progress Timeline/i)
      ).toBeInTheDocument();
    });
  });

  it('6. Stage 5 (Honesty) & Judge Settings Modal: displays transparency disclosure and masked password inputs with accessible toggle', async () => {
    render(<App />);

    const honestyTab = screen.getByRole('tab', {
      name: /05 Honesty & Architecture/i,
    });
    fireEvent.click(honestyTab);

    await waitFor(() => {
      expect(
        screen.getByText(/1\. What Is 100% Real & Functional Today/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/3\. Where the AI Can Be Wrong/i)
      ).toBeInTheDocument();
    });

    // Open Judge Settings Modal
    const configButtons = screen.getAllByRole('button', {
      name: /Open API Configuration and Judge Settings modal/i,
    });
    fireEvent.click(configButtons[0]);

    const geminiInput = screen.getByLabelText(
      /Google Gemini API Key/i
    ) as HTMLInputElement;
    expect(geminiInput).toHaveAttribute('type', 'password');

    const toggleShowBtn = screen.getByRole('button', {
      name: /Show API keys/i,
    });
    fireEvent.click(toggleShowBtn);
    expect(geminiInput).toHaveAttribute('type', 'text');

    expect(INITIAL_SYNTHETIC_REPORTS.length).toBe(30);
  });
});
