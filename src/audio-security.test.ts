import { describe, expect, it } from "vitest";
import { audioFileValidationError, MAX_AUDIO_BYTES } from "./audio-security";

const file = (name: string, type: string, size: number) => ({ name, type, size });

describe("audio file validation", () => {
  it("allows supported browser audio types", () => {
    expect(audioFileValidationError(file("specimen.mp3", "audio/mpeg", 2_048))).toBeNull();
  });

  it("allows a known extension when the browser omits the MIME type", () => {
    expect(audioFileValidationError(file("specimen.flac", "", 2_048))).toBeNull();
  });

  it("rejects non-audio content even if selected programmatically", () => {
    expect(audioFileValidationError(file("payload.svg", "image/svg+xml", 2_048))).toMatch(
      /supported audio format/,
    );
  });

  it("rejects empty and oversized files before decoding", () => {
    expect(audioFileValidationError(file("empty.wav", "audio/wav", 0))).toMatch(/empty/);
    expect(
      audioFileValidationError(file("oversized.wav", "audio/wav", MAX_AUDIO_BYTES + 1)),
    ).toMatch(/over 50 MB/);
  });
});
