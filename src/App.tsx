import { useCallback, useEffect, useRef, useState } from "react";
import {
  drawGarden,
  frequencyBands,
  growGarden,
  syntheticBands,
  type Bands,
} from "./garden";
import { audioFileValidationError } from "./audio-security";

type SourceMode = "synthetic" | "microphone" | "file";

const INITIAL_BANDS: Bands = { bass: 0.42, mids: 0.46, highs: 0.3, energy: 0.49 };

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<SourceMode>("synthetic");
  const [audioName, setAudioName] = useState("");
  const [running, setRunning] = useState(true);
  const [complexity, setComplexity] = useState(0.64);
  const [sensitivity, setSensitivity] = useState(1);
  const [seed, setSeed] = useState(17);
  const [bands, setBands] = useState<Bands>(INITIAL_BANDS);
  const bandsRef = useRef<Bands>(INITIAL_BANDS);
  const [notice, setNotice] = useState("Synthetic tide is growing");
  const stateRef = useRef({ mode, running, complexity, sensitivity, seed });

  useEffect(() => {
    stateRef.current = { mode, running, complexity, sensitivity, seed };
  }, [mode, running, complexity, sensitivity, seed]);

  const stopAudio = useCallback(() => {
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {
        // The source may have already ended.
      }
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    analyserRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  useEffect(() => stopAudio, [stopAudio]);

  const useMicrophone = async () => {
    try {
      stopAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
      context.createMediaStreamSource(stream).connect(analyser);
      microphoneStreamRef.current = stream;
      analyserRef.current = analyser;
      setMode("microphone");
      setRunning(true);
      setNotice("Microphone connected. Nothing is recorded or uploaded.");
    } catch {
      stopAudio();
      setMode("synthetic");
      setNotice("Microphone unavailable. Synthetic tide is still running.");
    }
  };

  const useAudioFile = async (file: File) => {
    const validationError = audioFileValidationError(file);
    if (validationError) {
      setNotice(validationError);
      return;
    }

    try {
      stopAudio();
      const context = new AudioContext();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
      const audioBuffer = await context.decodeAudioData(await file.arrayBuffer());
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;
      source.connect(analyser);
      analyser.connect(context.destination);
      await context.resume();
      source.start();
      audioSourceRef.current = source;
      analyserRef.current = analyser;
      const safeName = file.name.slice(0, 120) || "Local audio";
      setAudioName(safeName);
      setMode("file");
      setRunning(true);
      setNotice(`Growing from ${safeName}. The track stays on this device.`);
    } catch {
      stopAudio();
      setMode("synthetic");
      setNotice("That audio file could not be decoded. Synthetic tide is still running.");
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let frame = 0;
    let lastSummary = 0;
    const frequencyData = new Uint8Array(256);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.floor(rect.width * dpr));
      const pixelHeight = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const current = stateRef.current;
      let nextBands = bandsRef.current;
      if (current.running) {
        if (current.mode !== "synthetic" && analyserRef.current) {
          analyserRef.current.getByteFrequencyData(frequencyData);
          nextBands = frequencyBands(frequencyData);
        } else {
          nextBands = syntheticBands(time, current.seed);
        }
        nextBands = {
          bass: Math.min(1, nextBands.bass * current.sensitivity),
          mids: Math.min(1, nextBands.mids * current.sensitivity),
          highs: Math.min(1, nextBands.highs * current.sensitivity),
          energy: Math.min(1, nextBands.energy * current.sensitivity),
        };
      }

      const branches = growGarden(
        rect.width,
        rect.height,
        nextBands,
        current.seed,
        time,
        current.complexity,
        reduceMotion || !current.running,
      );
      drawGarden(
        context,
        rect.width,
        rect.height,
        branches,
        nextBands,
        reduceMotion || !current.running ? 0 : time,
      );

      if (time - lastSummary > 300) {
        bandsRef.current = nextBands;
        setBands(nextBands);
        lastSummary = time;
      }
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  const exportFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportContext = exportCanvas.getContext("2d");
    if (!exportContext) return;
    exportContext.drawImage(canvas, 0, 0);

    const signature = "SIGNAL GARDEN / KubaOpoczka";
    const fontSize = Math.max(18, Math.round(exportCanvas.width * 0.018));
    const padding = Math.max(12, Math.round(fontSize * 0.7));
    exportContext.font = `600 ${fontSize}px "IBM Plex Mono", monospace`;
    const signatureWidth = exportContext.measureText(signature).width;
    const plateWidth = signatureWidth + padding * 2;
    const plateHeight = fontSize + padding * 1.6;
    exportContext.fillStyle = "rgba(8, 12, 8, 0.82)";
    exportContext.fillRect(
      exportCanvas.width - plateWidth - padding,
      exportCanvas.height - plateHeight - padding,
      plateWidth,
      plateHeight,
    );
    exportContext.fillStyle = "#d9ff4d";
    exportContext.textBaseline = "middle";
    exportContext.fillText(
      signature,
      exportCanvas.width - plateWidth,
      exportCanvas.height - padding - plateHeight / 2,
    );

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `signal-garden-${seed}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setNotice("Current garden exported with the KubaOpoczka signature");
    }, "image/png");
  };

  const chooseSynthetic = () => {
    stopAudio();
    setMode("synthetic");
    setRunning(true);
    setNotice("Synthetic tide is growing");
  };

  const sourceLabel =
    mode === "microphone" ? "Live microphone" : mode === "file" ? audioName : "Synthetic tide";

  return (
    <main className="instrument">
      <a className="skip-link" href="#controls">
        Skip to instrument controls
      </a>

      <header>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            S/G
          </span>
          <div>
            <strong>Signal Garden</strong>
            <small>Audio-reactive growth instrument · KubaOpoczka</small>
          </div>
        </div>
        <p className="privacy-note">
          Local signal only. <span>Nothing leaves this browser.</span>
        </p>
        <button className="export-top" onClick={exportFrame}>
          Export frame <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="canvas-room" aria-labelledby="garden-title">
        <div className="title-stack">
          <p>Sound becomes structure</p>
          <h1 id="garden-title">
            Grow what
            <br />
            you can’t see.
          </h1>
        </div>

        <canvas ref={canvasRef} aria-hidden="true" />

        <div className="source-plate">
          <span aria-hidden="true" />
          <p>Listening to</p>
          <strong title={sourceLabel}>{sourceLabel}</strong>
        </div>

        <div className="band-readout" aria-label="Current frequency levels">
          <div>
            <span>Bass / roots</span>
            <i>
              <b style={{ transform: `scaleX(${bands.bass})` }} />
            </i>
            <output>{Math.round(bands.bass * 100)}</output>
          </div>
          <div>
            <span>Mids / bend</span>
            <i>
              <b style={{ transform: `scaleX(${bands.mids})` }} />
            </i>
            <output>{Math.round(bands.mids * 100)}</output>
          </div>
          <div>
            <span>Highs / bloom</span>
            <i>
              <b style={{ transform: `scaleX(${bands.highs})` }} />
            </i>
            <output>{Math.round(bands.highs * 100)}</output>
          </div>
        </div>

        <p className="visual-summary">
          The current garden has {Math.round(7 + complexity * 9)} main branches. Root mass is{" "}
          {bands.bass > 0.62 ? "dense" : bands.bass > 0.35 ? "balanced" : "light"}, stems are{" "}
          {bands.mids > 0.58 ? "strongly bent" : "gently bent"}, and tip bloom is{" "}
          {bands.highs > 0.55 ? "open" : "contained"}.
        </p>
      </section>

      <section id="controls" className="control-deck" aria-label="Signal Garden controls">
        <fieldset className="source-picker">
          <legend>Signal source</legend>
          <div className="source-actions">
            <button
              aria-pressed={mode === "synthetic"}
              className={mode === "synthetic" ? "active" : ""}
              onClick={chooseSynthetic}
            >
              Synthetic tide
            </button>
            <button
              aria-pressed={mode === "microphone"}
              className={mode === "microphone" ? "active" : ""}
              onClick={() => void useMicrophone()}
            >
              Live microphone
            </button>
            <label className={mode === "file" ? "file-source active" : "file-source"}>
              <input
                type="file"
                name="audio-file"
                accept="audio/*"
                onChange={(event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (file) void useAudioFile(file).finally(() => (input.value = ""));
                }}
              />
              Choose a track
            </label>
          </div>
        </fieldset>

        <label className="range-control">
          <span>
            Sensitivity <output>{sensitivity.toFixed(1)}×</output>
          </span>
          <input
            type="range"
            name="sensitivity"
            autoComplete="off"
            min="0.5"
            max="1.8"
            step="0.1"
            value={sensitivity}
            onChange={(event) => setSensitivity(Number(event.target.value))}
          />
        </label>

        <label className="range-control">
          <span>
            Branching <output>{Math.round(complexity * 100)}%</output>
          </span>
          <input
            type="range"
            name="branching"
            autoComplete="off"
            min="0.2"
            max="1"
            step="0.01"
            value={complexity}
            onChange={(event) => setComplexity(Number(event.target.value))}
          />
        </label>

        <div className="transport">
          <button
            className="pause"
            aria-pressed={!running}
            onClick={() => {
              setRunning((current) => {
                setNotice(current ? "Growth paused" : "Growth resumed");
                return !current;
              });
            }}
          >
            <span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span>
            {running ? "Hold growth" : "Resume growth"}
          </button>
          <button
            className="reseed"
            onClick={() => {
              setSeed((current) => current + 1);
              setNotice(`New specimen generated from seed ${seed + 1}`);
            }}
          >
            New specimen
          </button>
        </div>
      </section>

      <div className="notice" aria-live="polite">
        <span aria-hidden="true" />
        {notice}
      </div>
    </main>
  );
}
