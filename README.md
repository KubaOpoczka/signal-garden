# Signal Garden

An audio-reactive generative instrument built with Web Audio, Canvas, React, and TypeScript.

Signal Garden maps frequency roles to a polar growth system. Bass controls a root network, mid frequencies bend stems, and high frequencies open offshoots and leaf-like tips. It can listen to a microphone, play a local audio file, or run from a deterministic synthetic tide, then export the current composition as a PNG.

![Signal Garden audio-reactive instrument](./output/playwright/signal-garden-desktop.png)

## Why this exists

Most audio visualizers decorate amplitude. Signal Garden uses a readable mapping between sound and structure, so the image explains what it heard.

## Technical highlights

- Web Audio `AnalyserNode` with frequency-band aggregation
- Local audio-file decoding and looped playback with no upload
- Deterministic generative geometry with reproducible seeds
- Curved primary stems, high-frequency offshoots, bass roots, and an energy pulse
- Device-pixel-ratio-aware Canvas renderer
- `requestAnimationFrame` render loop with React state sampled at a lower frequency
- Microphone privacy: the stream stays local and stops when the source changes
- Exportable PNG frames
- Textual equivalent of the current visual state
- Reduced-motion rendering and keyboard-complete controls

## Run it

```bash
npm install
npm run dev
```

Microphone access requires localhost or HTTPS. Local tracks are decoded in memory and never uploaded. If microphone permission is declined or a file cannot be decoded, the synthetic signal remains fully functional.

## Verify it

```bash
npm test
npm run build
```

Production Lighthouse: **99 performance · 100 accessibility · 100 best practices · 100 SEO**.

## Security and privacy

Signal Garden is static and client-only. Microphone and track data stay in the browser, microphone tracks are stopped when the source changes, and local files are size- and type-checked before decoding. Production builds enforce a restrictive Content Security Policy, disable public source maps, and run tests, dependency auditing, and CodeQL in CI. See [SECURITY.md](./SECURITY.md) for reporting.

## Architecture

`src/garden.ts` is a pure signal-to-geometry pipeline. `src/App.tsx` owns browser audio and the Canvas lifecycle. This split makes the mapping deterministic and testable without a browser audio device.

## Portfolio talking point

The visual metaphor is not applied after signal processing. It is the signal-processing model: three frequency regions control three biologically legible properties of the rendered organism.

## Authorship

Original concept, design, and engineering by **Kuba Opoczka (KubaOpoczka)**. © 2026. Exported specimens carry the KubaOpoczka signature, and the MIT license requires this copyright notice to remain with substantial copies.
