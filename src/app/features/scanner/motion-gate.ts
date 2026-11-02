/**
 * Pure pixel-math pieces of the scanner's "is there actually a new card in
 * frame" gate (see Scanner.updateGeminiGate) and of its Gemini-input
 * contrast stretch - split out of scanner.ts so this arithmetic (especially
 * the gate's stability/variance/background thresholds) can be unit-tested
 * without mocking a `<video>` element, camera permissions, or the Gemini
 * call. Nothing in this file touches the DOM.
 */

/**
 * Percentile-clipped linear contrast stretch (a "levels"/auto-contrast
 * adjustment), applied in place to a crop's own pixel data. Does NOT
 * greyscale or binarize - it keeps full color, just remaps the crop's own
 * (often compressed) luminance range to span the full 0-255 - so Gemini
 * still gets a color image, but one where e.g. black print-code text on a
 * dark blue card frame (near-identical luminance, easy to read for a human
 * who sees the hue difference, hard for a compressed/downsampled photo) is
 * pulled apart instead of crushed together. Clipping to the 1st/99th
 * percentile (rather than the crop's literal min/max) keeps a single stray
 * bright/dark pixel from skewing the whole remap.
 */
export function applyContrastStretch(data: Uint8ClampedArray): void {
  const pixelCount = data.length / 4;
  if (pixelCount === 0) return;

  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[luminance]++;
  }

  const clipCount = pixelCount * 0.01;
  let low = 0;
  let cumulative = 0;
  for (; low < 255; low++) {
    cumulative += histogram[low];
    if (cumulative >= clipCount) break;
  }
  let high = 255;
  cumulative = 0;
  for (; high > 0; high--) {
    cumulative += histogram[high];
    if (cumulative >= clipCount) break;
  }
  // Crop is already near-flat (blank/solid) - stretching further would just
  // amplify noise, not reveal text that isn't there.
  if (high <= low) return;

  const scale = 255 / (high - low);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, (data[i] - low) * scale));
    data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - low) * scale));
    data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - low) * scale));
  }
}

/** Seeds a running background estimate from a gate sample's red channel (same indexing diffFromBackground/adaptBackgroundEstimate use - the sample is already grayscale, so every channel is equal). */
export function sampleToBackgroundArray(sample: Uint8ClampedArray, pixelCount: number): Float32Array {
  const background = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) background[i] = sample[i * 4];
  return background;
}

/** Mean absolute per-pixel difference between the current sample and the running background estimate - 0 when there's no estimate yet (nothing to call "new" against). */
export function diffFromBackground(
  sample: Uint8ClampedArray,
  pixelCount: number,
  backgroundEstimate: Float32Array | null,
): number {
  if (!backgroundEstimate) return 0;
  let diffSum = 0;
  for (let i = 0; i < pixelCount; i++) diffSum += Math.abs(sample[i * 4] - backgroundEstimate[i]);
  return diffSum / pixelCount;
}

/** Drifts `backgroundEstimate` toward `sample` at `adaptRate`, seeding it from scratch if there's nothing to drift yet. Mutates and returns the same array when one was passed in, so callers that already hold a reference don't need to re-assign - only the null-seed case returns a new one. */
export function adaptBackgroundEstimate(
  sample: Uint8ClampedArray,
  pixelCount: number,
  backgroundEstimate: Float32Array | null,
  adaptRate: number,
): Float32Array {
  if (!backgroundEstimate) return sampleToBackgroundArray(sample, pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    backgroundEstimate[i] += (sample[i * 4] - backgroundEstimate[i]) * adaptRate;
  }
  return backgroundEstimate;
}

export interface GateThresholds {
  stabilityThreshold: number;
  minVariance: number;
  minDiffFromBackground: number;
}

export interface GateTickResult {
  /** Low tick-to-tick diff - the image has stopped changing (a card was just placed and is being held still, not swapped or in motion). */
  isStable: boolean;
  /** High variance - there's actual detail in view, not a blank hand/table/background. */
  hasContent: boolean;
  /** Meaningful difference from the running background estimate - that detail is something NEW, not just the desk/hand/clutter that was already there. */
  looksNew: boolean;
}

/**
 * The gate's three independent per-tick signals (see Scanner.updateGeminiGate's
 * own doc for why all three are needed) - pure function of this tick's
 * sample against the previous tick's sample and the running background
 * estimate, no class state. Callers still own the stable-tick counter,
 * background-estimate mutation, and Gemini-call decision themselves.
 */
export function evaluateGateTick(
  sample: Uint8ClampedArray,
  previous: Uint8ClampedArray,
  backgroundEstimate: Float32Array | null,
  thresholds: GateThresholds,
): GateTickResult {
  const pixelCount = sample.length / 4;

  let mean = 0;
  for (let i = 0; i < sample.length; i += 4) mean += sample[i];
  mean /= pixelCount;

  let variance = 0;
  for (let i = 0; i < sample.length; i += 4) variance += (sample[i] - mean) ** 2;
  const hasContent = variance / pixelCount > thresholds.minVariance;

  let diffSum = 0;
  for (let i = 0; i < sample.length; i += 4) diffSum += Math.abs(sample[i] - previous[i]);
  const isStable = diffSum / pixelCount < thresholds.stabilityThreshold;

  const looksNew = diffFromBackground(sample, pixelCount, backgroundEstimate) > thresholds.minDiffFromBackground;

  return { isStable, hasContent, looksNew };
}
