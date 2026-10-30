import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Ensure window.scrollTo and Element.scrollIntoView work in JSDOM
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

