export interface Bands {
  bass: number;
  mids: number;
  highs: number;
  energy: number;
}

export interface GardenPoint {
  x: number;
  y: number;
}

export interface GardenBranch {
  points: GardenPoint[];
  weight: number;
  tip: number;
  hueRole: "moss" | "growth" | "water";
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const noise = (seed: number, index: number) => {
  const value = Math.sin(seed * 91.7 + index * 437.1) * 19731.743;
  return value - Math.floor(value);
};

export const syntheticBands = (time: number, seed: number): Bands => {
  const phase = time / 1000;
  const bass = clamp(0.34 + Math.sin(phase * 1.13 + seed) * 0.18 + Math.sin(phase * 0.27) * 0.08);
  const mids = clamp(0.42 + Math.sin(phase * 1.91 + seed * 0.4) * 0.2);
  const highs = clamp(0.3 + Math.sin(phase * 3.7 + seed * 0.9) * 0.18);
  return { bass, mids, highs, energy: clamp((bass + mids + highs) / 2.4) };
};

export const frequencyBands = (data: Uint8Array): Bands => {
  const average = (start: number, end: number) => {
    let sum = 0;
    const safeEnd = Math.min(end, data.length);
    for (let index = start; index < safeEnd; index += 1) sum += data[index];
    return safeEnd > start ? sum / (safeEnd - start) / 255 : 0;
  };
  const bass = average(0, Math.max(2, Math.floor(data.length * 0.08)));
  const mids = average(Math.floor(data.length * 0.08), Math.floor(data.length * 0.38));
  const highs = average(Math.floor(data.length * 0.38), data.length);
  return { bass, mids, highs, energy: clamp((bass * 1.2 + mids + highs * 0.8) / 2.4) };
};

export const growGarden = (
  width: number,
  height: number,
  bands: Bands,
  seed: number,
  time: number,
  complexity: number,
  reduceMotion = false,
): GardenBranch[] => {
  const branches: GardenBranch[] = [];
  const branchCount = Math.round(7 + complexity * 9);
  const swayTime = reduceMotion ? 0 : time / 2200;

  for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
    const spread = (branchIndex / Math.max(1, branchCount - 1) - 0.5) * Math.PI * 0.86;
    const randomLean = (noise(seed, branchIndex) - 0.5) * 0.32;
    const angle = -Math.PI / 2 + spread + randomLean;
    const length = height * (0.25 + bands.bass * 0.18 + noise(seed + 2, branchIndex) * 0.19);
    const segments = 13 + Math.round(complexity * 11);
    const points: GardenPoint[] = [{ x: width * 0.5, y: height * 0.88 }];
    let x = width * 0.5;
    let y = height * 0.88;

    for (let segment = 1; segment <= segments; segment += 1) {
      const progress = segment / segments;
      const bend =
        Math.sin(progress * Math.PI * (1.5 + bands.mids) + swayTime + branchIndex) *
        (7 + bands.mids * 18);
      const step = length / segments;
      x += Math.cos(angle) * step + bend * 0.05;
      y += Math.sin(angle) * step;
      points.push({ x, y });
    }

    branches.push({
      points,
      weight: 0.8 + bands.bass * 4.2 * (1 - branchIndex / (branchCount * 1.5)),
      tip: 1.4 + bands.highs * 8 + noise(seed, branchIndex + 90) * 2,
      hueRole:
        branchIndex % 7 === 0 ? "water" : branchIndex % 3 === 0 ? "growth" : "moss",
    });
  }
  return branches;
};

export const drawGarden = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  branches: GardenBranch[],
  bands: Bands,
) => {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "oklch(0.08 0 0)";
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = "screen";
  for (const branch of branches) {
    context.beginPath();
    branch.points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.lineWidth = branch.weight;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle =
      branch.hueRole === "growth"
        ? "oklch(0.92 0.17 116 / 0.82)"
        : branch.hueRole === "water"
          ? "oklch(0.80 0.12 190 / 0.66)"
          : "oklch(0.75 0.09 140 / 0.72)";
    context.stroke();

    const tip = branch.points[branch.points.length - 1];
    context.beginPath();
    context.arc(tip.x, tip.y, branch.tip, 0, Math.PI * 2);
    context.fillStyle =
      branch.hueRole === "water"
        ? "oklch(0.80 0.12 190 / 0.9)"
        : "oklch(0.92 0.17 116 / 0.92)";
    context.fill();
  }

  context.globalAlpha = 0.1 + bands.energy * 0.16;
  context.beginPath();
  context.arc(width * 0.5, height * 0.88, 28 + bands.bass * 80, 0, Math.PI * 2);
  context.fillStyle = "oklch(0.92 0.17 116)";
  context.fill();
  context.restore();
};
