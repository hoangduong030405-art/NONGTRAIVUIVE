import Phaser from 'phaser';
import type { SceneryLayout } from './SceneryManager';

export function computeWorldLayout(
  width: number,
  height: number,
  gridX: number,
  gridY: number,
  gridCols: number,
  gridRows: number,
  cellSize: number,
): SceneryLayout {
  const isMobile = width < 768;
  const isPortrait = height > width;

  const gridW = gridCols * cellSize;
  const gridH = gridRows * cellSize;

  const fenceSegments: Array<{ x: number; y: number; w: number; h: number }> = [];
  const cobblePaths: Array<{ x: number; y: number }> = [];
  const natureProps: Array<{ key: string; x: number; y: number; scale?: number }> = [];

  // 1. Surrounding Crop Fence with Top & Bottom Gateways
  const pad = 12;
  const fx = gridX - pad;
  const fy = gridY - pad;
  const fw = gridW + pad * 2;
  const fh = gridH + pad * 2;

  // Top fence with gap in middle for walking path
  const halfW = (fw - 60) / 2;
  fenceSegments.push({ x: fx, y: fy, w: halfW, h: 20 });
  fenceSegments.push({ x: fx + halfW + 60, y: fy, w: halfW, h: 20 });

  // Bottom fence with gap
  fenceSegments.push({ x: fx, y: fy + fh - 20, w: halfW, h: 20 });
  fenceSegments.push({ x: fx + halfW + 60, y: fy + fh - 20, w: halfW, h: 20 });

  // Left & Right full fences
  fenceSegments.push({ x: fx, y: fy, w: 20, h: fh });
  fenceSegments.push({ x: fx + fw - 20, y: fy, w: 20, h: fh });

  // 2. Cobblestone walking path: from Top (House) down into Crops
  const centerX = gridX + gridW / 2;
  const pathStartY = Math.max(70, fy - 60);
  for (let y = pathStartY; y <= fy + 20; y += 16) {
    cobblePaths.push({ x: centerX + (Math.random() - 0.5) * 8, y });
  }

  // 3. House & Windmill Positioning
  let housePos = { x: 0, y: 0, scale: 0.85, visible: true };
  let bakeryPos = { x: 0, y: 0, scale: 0.8, visible: true };
  let windmillPos = { x: 0, y: 0, scale: 0.8, visible: true };
  let pondPos = { x: 0, y: 0, scale: 0.85, visible: true };
  let pastureBounds = new Phaser.Geom.Rectangle(0, 0, 100, 100);

  if (!isPortrait) {
    // DESKTOP LANDSCAPE
    // Top-left: Farmhouse
    const houseX = Math.max(140, gridX - 160);
    const houseY = Math.max(120, gridY + 20);
    housePos = { x: houseX, y: houseY, scale: 0.85, visible: true };

    // Next to Farmhouse: Bakery Kitchen
    const bakeryX = houseX + 115;
    const bakeryY = houseY + 35;
    bakeryPos = { x: bakeryX, y: bakeryY, scale: 0.75, visible: true };

    // Top-right: Windmill
    const windX = Math.min(width - 120, gridX + gridW + 140);
    const windY = houseY + 10;
    windmillPos = { x: windX, y: windY, scale: 0.8, visible: true };

    // Bottom-left: Pond
    pondPos = { x: Math.max(130, gridX - 150), y: Math.min(height - 130, gridY + gridH - 10), scale: 0.85, visible: true };

    // Bottom-right: Animal Pasture
    const pastX = Math.min(width - 240, gridX + gridW + 40);
    const pastY = Math.min(height - 180, gridY + gridH - 160);
    const pastW = Math.max(180, width - pastX - 25);
    const pastH = 150;
    pastureBounds = new Phaser.Geom.Rectangle(pastX, pastY, pastW, pastH);

    // Fence around animal pasture
    fenceSegments.push({ x: pastX, y: pastY, w: pastW, h: 18 });
    fenceSegments.push({ x: pastX, y: pastY + pastH - 18, w: pastW, h: 18 });
    fenceSegments.push({ x: pastX, y: pastY, w: 18, h: pastH });
    fenceSegments.push({ x: pastX + pastW - 18, y: pastY, w: 18, h: pastH });

    // Path connecting house to crop field
    for (let x = houseX + 30; x <= gridX - pad; x += 18) {
      cobblePaths.push({ x, y: gridY + 30 + (Math.random() - 0.5) * 6 });
    }

    // Trees & Nature around perimeter
    natureProps.push({ key: 'tree', x: houseX - 85, y: houseY + 40, scale: 0.9 });
    natureProps.push({ key: 'pine', x: windX + 70, y: windY + 20, scale: 0.85 });
    natureProps.push({ key: 'pine', x: windX - 60, y: windY - 30, scale: 0.75 });
    natureProps.push({ key: 'bush', x: fx - 16, y: fy + 40 });
    natureProps.push({ key: 'bush', x: fx + fw + 8, y: fy + 60 });
    natureProps.push({ key: 'flower-red', x: fx + 20, y: fy - 10 });
    natureProps.push({ key: 'flower-yellow', x: fx + fw - 30, y: fy - 10 });
    natureProps.push({ key: 'flower-purple', x: pondPos.x + 80, y: pondPos.y - 40 });
    natureProps.push({ key: 'tuft', x: pastX + 30, y: pastY + 40 });
    natureProps.push({ key: 'tuft', x: pastX + 110, y: pastY + 80 });
  } else {
    // MOBILE PORTRAIT
    // Top area above crops: Small cozy Farmhouse & Windmill side-by-side if height allows
    const topSpace = gridY - 110;
    if (topSpace > 90) {
      const scale = Math.min(0.65, topSpace / 200);
      housePos = { x: width * 0.32, y: gridY - 20, scale, visible: true };
      bakeryPos = { x: width * 0.55, y: gridY - 15, scale: scale * 0.85, visible: true };
      windmillPos = { x: width * 0.82, y: gridY - 15, scale: scale * 0.95, visible: true };
    } else {
      housePos = { x: width * 0.35, y: gridY - 15, scale: 0.55, visible: true };
      bakeryPos = { x: width * 0.75, y: gridY - 15, scale: 0.5, visible: true };
      windmillPos = { x: 0, y: 0, scale: 0, visible: false };
    }

    // Bottom area below crops / sides: Pasture
    const botSpace = height - (gridY + gridH) - 130;
    if (botSpace > 90) {
      const pastH = Math.min(130, botSpace - 10);
      pastureBounds = new Phaser.Geom.Rectangle(20, gridY + gridH + 15, width - 40, pastH);
      fenceSegments.push({ x: 20, y: gridY + gridH + 15, w: width - 40, h: 16 });
      fenceSegments.push({ x: 20, y: gridY + gridH + 15 + pastH - 16, w: width - 40, h: 16 });
      fenceSegments.push({ x: 20, y: gridY + gridH + 15, w: 16, h: pastH });
      fenceSegments.push({ x: width - 36, y: gridY + gridH + 15, w: 16, h: pastH });
      pondPos = { x: width - 60, y: gridY + gridH + pastH + 50, scale: 0.6, visible: false };
    } else {
      // Pasture tucked on sides or compact
      pastureBounds = new Phaser.Geom.Rectangle(15, gridY + 20, 60, gridH - 40);
      pondPos = { x: 0, y: 0, scale: 0, visible: false };
    }

    natureProps.push({ key: 'bush', x: fx - 6, y: fy + 30, scale: 0.8 });
    natureProps.push({ key: 'bush', x: fx + fw + 6, y: fy + 30, scale: 0.8 });
    natureProps.push({ key: 'flower-yellow', x: fx + 16, y: fy - 6, scale: 0.8 });
    natureProps.push({ key: 'flower-red', x: fx + fw - 20, y: fy - 6, scale: 0.8 });
  }

  return {
    isMobile,
    isPortrait,
    housePos,
    bakeryPos,
    windmillPos,
    pondPos,
    pastureBounds,
    fenceSegments,
    cobblePaths,
    natureProps,
  };
}
