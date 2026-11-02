import { describe, expect, it } from 'vitest';

import { adaptBackgroundEstimate, diffFromBackground, evaluateGateTick } from './motion-gate';

/** Builds a grayscale RGBA sample (R=G=B, alpha ignored) the same shape sampleGateFrame produces - `values` is one entry per pixel. */
function grayscaleSample(values: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(values.length * 4);
  values.forEach((value, i) => {
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  });
  return data;
}

const THRESHOLDS = { stabilityThreshold: 6, minVariance: 350, minDiffFromBackground: 30 };

describe('evaluateGateTick', () => {
  it('does not treat a frame barely different from the background as new', () => {
    const background = new Float32Array([100, 100, 100, 100]);
    // Some per-pixel spread so hasContent isn't the thing hiding the result.
    const sample = grayscaleSample([98, 102, 101, 99]);
    const previous = grayscaleSample([98, 102, 101, 99]);

    const result = evaluateGateTick(sample, previous, background, THRESHOLDS);
    expect(result.looksNew).toBe(false);
  });

  it('treats a frame clearly different from the background as new', () => {
    const background = new Float32Array([100, 100, 100, 100]);
    const sample = grayscaleSample([200, 210, 205, 195]);
    const previous = sample;

    const result = evaluateGateTick(sample, previous, background, THRESHOLDS);
    expect(result.looksNew).toBe(true);
  });

  it('is unstable while the frame is still changing tick to tick', () => {
    const sample = grayscaleSample([50, 50, 50, 50]);
    const previous = grayscaleSample([0, 0, 0, 0]);

    const result = evaluateGateTick(sample, previous, null, THRESHOLDS);
    expect(result.isStable).toBe(false);
  });

  it('has no content in a flat (zero-variance) frame regardless of the variance threshold', () => {
    const sample = grayscaleSample([120, 120, 120, 120]);
    const result = evaluateGateTick(sample, sample, null, THRESHOLDS);
    expect(result.hasContent).toBe(false);
  });
});

describe('diffFromBackground', () => {
  it('is 0 when there is no background estimate yet', () => {
    const sample = grayscaleSample([255, 255]);
    expect(diffFromBackground(sample, 2, null)).toBe(0);
  });
});

describe('adaptBackgroundEstimate', () => {
  it('seeds a fresh estimate from the sample when there was none yet', () => {
    const sample = grayscaleSample([10, 20]);
    const result = adaptBackgroundEstimate(sample, 2, null, 0.08);
    expect(Array.from(result)).toEqual([10, 20]);
  });

  it('drifts the existing estimate toward the sample by the adapt rate, not all the way', () => {
    const background = new Float32Array([100]);
    const sample = grayscaleSample([200]);

    const result = adaptBackgroundEstimate(sample, 1, background, 0.08);
    // 100 + (200 - 100) * 0.08 = 108 - a nudge toward the new value, not a jump to it.
    expect(result[0]).toBeCloseTo(108, 5);
  });
});
