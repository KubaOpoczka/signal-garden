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
  kind: "stem" | "offshoot" | "root";
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
  const origin = { x: width * 0.5, y: height * 0.88 };

  for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
    const spread = (branchIndex / Math.max(1, branchCount - 1) - 0.5) * Math.PI * 0.86;
    const randomLean = (noise(seed, branchIndex) - 0.5) * 0.32;
    const angle = -Math.PI / 2 + spread + randomLean;
    const length = height * (0.25 + bands.bass * 0.18 + noise(seed + 2, branchIndex) * 0.19);
    const segments = 13 + Math.round(complexity * 11);
    const points: GardenPoint[] = [origin];
    let x = origin.x;
    let y = origin.y;

    for (let segment = 1; segment <= segments; segment += 1) {
      const progress = segment / segments;
      const bendAngle =
        Math.sin(progress * Math.PI * (1.5 + bands.mids) + swayTime + branchIndex) *
        (0.05 + bands.mids * 0.17);
      const irregularity =
        (noise(seed + branchIndex * 13, segment) - 0.5) * 0.07 * progress;
      const step = length / segments;
      x += Math.cos(angle + bendAngle + irregularity) * step;
      y += Math.sin(angle + bendAngle + irregularity) * step;
      points.push({ x, y });
    }

    branches.push({
      points,
      weight: 0.8 + bands.bass * 4.2 * (1 - branchIndex / (branchCount * 1.5)),
      tip: 1.4 + bands.highs * 8 + noise(seed, branchIndex + 90) * 2,
      hueRole:
        branchIndex % 7 === 0 ? "water" : branchIndex % 3 === 0 ? "growth" : "moss",
      kind: "stem",
    });

    const offshootCount = Math.round(complexity * (1 + bands.highs * 3));
    for (let offshootIndex = 0; offshootIndex < offshootCount; offshootIndex += 1) {
      const pointIndex = Math.min(
        points.length - 2,
        Math.round(points.length * (0.42 + offshootIndex * 0.13)),
      );
      const base = points[pointIndex];
      const previous = points[Math.max(0, pointIndex - 1)];
      const parentAngle = Math.atan2(base.y - previous.y, base.x - previous.x);
      const side = (branchIndex + offshootIndex) % 2 === 0 ? -1 : 1;
      const branchAngle =
        parentAngle +
        side * (0.48 + noise(seed + branchIndex, offshootIndex + 180) * 0.55);
      const branchLength =
        length *
        (0.1 + bands.highs * 0.13) *
        (0.72 + noise(seed + offshootIndex, branchIndex + 240) * 0.48);
      const branchSegments = 5 + Math.round(complexity * 4);
      const offshootPoints: GardenPoint[] = [base];
      let branchX = base.x;
      let branchY = base.y;

      for (let segment = 1; segment <= branchSegments; segment += 1) {
        const progress = segment / branchSegments;
        const curl =
          Math.sin(progress * Math.PI + swayTime + offshootIndex) *
          side *
          (0.04 + bands.mids * 0.12);
        const step = branchLength / branchSegments;
        branchX += Math.cos(branchAngle + curl) * step;
        branchY += Math.sin(branchAngle + curl) * step;
        offshootPoints.push({ x: branchX, y: branchY });
      }

      branches.push({
        points: offshootPoints,
        weight: 0.45 + bands.bass * 1.15,
        tip: 0.9 + bands.highs * 5.4,
        hueRole: offshootIndex % 3 === 0 ? "growth" : "moss",
        kind: "offshoot",
      });
    }
  }

  const rootCount = Math.round(4 + bands.bass * 8);
  for (let rootIndex = 0; rootIndex < rootCount; rootIndex += 1) {
    const direction =
      Math.PI / 2 +
      (rootIndex / Math.max(1, rootCount - 1) - 0.5) * Math.PI * 0.94 +
      (noise(seed + 311, rootIndex) - 0.5) * 0.22;
    const length = height * (0.06 + bands.bass * 0.1) * (0.7 + noise(seed, rootIndex + 420) * 0.5);
    const points: GardenPoint[] = [origin];
    for (let segment = 1; segment <= 8; segment += 1) {
      const progress = segment / 8;
      const fork = Math.sin(progress * Math.PI * 1.5 + rootIndex) * 0.12;
      points.push({
        x: origin.x + Math.cos(direction + fork) * length * progress,
        y: origin.y + Math.sin(direction + fork) * length * progress,
      });
    }
    branches.push({
      points,
      weight: 0.6 + bands.bass * 2.5 * (1 - rootIndex / (rootCount * 1.7)),
      tip: 0,
      hueRole: rootIndex % 4 === 0 ? "water" : "moss",
      kind: "root",
    });
  }
  return branches;
};

const traceCurve = (context: CanvasRenderingContext2D, points: GardenPoint[]) => {
  if (points.length === 0) return;
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  const finalPoint = points[points.length - 1];
  context.lineTo(finalPoint.x, finalPoint.y);
};

export const drawGarden = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  branches: GardenBranch[],
  bands: Bands,
  time = 0,
) => {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "oklch(0.08 0 0)";
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = "screen";
  for (const branch of branches) {
    context.beginPath();
    traceCurve(context, branch.points);
    context.lineWidth = branch.weight;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle =
      branch.hueRole === "growth"
        ? "oklch(0.92 0.17 116 / 0.82)"
        : branch.hueRole === "water"
          ? "oklch(0.80 0.12 190 / 0.66)"
          : "oklch(0.75 0.09 140 / 0.72)";
    context.globalAlpha = branch.kind === "root" ? 0.52 : branch.kind === "offshoot" ? 0.76 : 1;
    context.stroke();

    const tip = branch.points[branch.points.length - 1];
    if (branch.tip > 0) {
      const previous = branch.points[Math.max(0, branch.points.length - 2)];
      const tipAngle = Math.atan2(tip.y - previous.y, tip.x - previous.x);
      context.save();
      context.translate(tip.x, tip.y);
      context.rotate(tipAngle);
      context.beginPath();
      context.ellipse(0, 0, branch.tip * 1.45, Math.max(1, branch.tip * 0.58), 0, 0, Math.PI * 2);
      context.fillStyle =
        branch.hueRole === "water"
          ? "oklch(0.80 0.12 190 / 0.9)"
          : "oklch(0.92 0.17 116 / 0.92)";
      context.fill();
      context.restore();
    }
  }

  context.globalAlpha = 0.1 + bands.energy * 0.16;
  context.beginPath();
  context.arc(width * 0.5, height * 0.88, 28 + bands.bass * 80, 0, Math.PI * 2);
  context.fillStyle = "oklch(0.92 0.17 116)";
  context.fill();

  const pulse = (time / 2200) % 1;
  context.globalAlpha = (0.05 + bands.energy * 0.2) * (1 - pulse);
  context.beginPath();
  context.arc(width * 0.5, height * 0.88, 30 + pulse * (70 + bands.bass * 120), 0, Math.PI * 2);
  context.strokeStyle = "oklch(0.80 0.12 190)";
  context.lineWidth = 1;
  context.stroke();
  context.restore();
};
