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

    const fullScale = frequencyBands(new Uint8Array(128).fill(255));
    expect(fullScale.bass).toBe(1);
    expect(fullScale.mids).toBe(1);
    expect(fullScale.highs).toBe(1);
    expect(fullScale.energy).toBe(1);
  });

  it("grows deterministic stems, offshoots, and roots from the same frame", () => {
    const bands = syntheticBands(2000, 4);
    const first = growGarden(900, 600, bands, 4, 2000, 0.6);
    const second = growGarden(900, 600, bands, 4, 2000, 0.6);
    expect(first).toEqual(second);
    expect(first.filter((branch) => branch.kind === "stem").length).toBeGreaterThan(7);
    expect(first.some((branch) => branch.kind === "offshoot")).toBe(true);
    expect(first.some((branch) => branch.kind === "root")).toBe(true);
  });
});
