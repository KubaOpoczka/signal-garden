import { describe, expect, it } from "vitest";
import { frequencyBands, growGarden, syntheticBands } from "./garden";

describe("signal garden model", () => {
  it("generates deterministic synthetic signal bands", () => {
    expect(syntheticBands(1234, 9)).toEqual(syntheticBands(1234, 9));
  });

  it("maps frequency bins into normalized bands", () => {
    const bands = frequencyBands(new Uint8Array([0, 64, 128, 255, 255, 64, 0, 32]));
    expect(bands.bass).toBeGreaterThanOrEqual(0);
    expect(bands.highs).toBeLessThanOrEqual(1);
    expect(bands.energy).toBeLessThanOrEqual(1);
  });

  it("grows the same geometry from the same frame", () => {
    const bands = syntheticBands(2000, 4);
    const first = growGarden(900, 600, bands, 4, 2000, 0.6);
    const second = growGarden(900, 600, bands, 4, 2000, 0.6);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(7);
  });
});
