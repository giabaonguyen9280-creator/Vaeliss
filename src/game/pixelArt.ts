// High-Resolution Dark Gothic Canvas & Transparent PNG Combat Engine (Destination-Out Limb Severing)
import type { RitualDeityType } from './mapGen';
import type { LimbMaskBox } from './config';

// ============================================================================
// HIGH-RES TRANSPARENT PNG COMBAT ENGINE + DESTINATION-OUT LIMB SEVERING
// ============================================================================

export interface CombatPngLimbEntry {
  id: string;
  severed: boolean;
  hp?: number;
  maskBox?: LimbMaskBox;
}

export interface CombatPngRenderOptions {
  combatSpriteUrl?: string;
  limbs?: CombatPngLimbEntry[];
  nowSec?: number;
  selectedLimbId?: string;
  timeMs?: number;
}

interface CachedCombatImage {
  img: HTMLImageElement;
  status: 'loading' | 'loaded' | 'error';
}

const combatImageCache = new Map<string, CachedCombatImage>();
let sharedPngMaskCanvas: HTMLCanvasElement | null = null;
let sharedPngMaskCtx: CanvasRenderingContext2D | null = null;
let sharedLimbPulseCanvas: HTMLCanvasElement | null = null;
let sharedLimbPulseCtx: CanvasRenderingContext2D | null = null;

function computeLimbTargetPulseAlpha(timeMs: number): number {
  const wave = 0.5 - 0.5 * Math.cos((timeMs / 750) * Math.PI * 2);
  return Math.max(0, Math.min(0.55, wave * 0.55));
}

function getPooledLimbPulseBuffer(w: number, h: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} | null {
  if (typeof document === 'undefined') return null;
  const cw = Math.max(16, Math.ceil(w));
  const ch = Math.max(16, Math.ceil(h));
  if (!sharedLimbPulseCanvas) {
    sharedLimbPulseCanvas = document.createElement('canvas');
    sharedLimbPulseCtx = sharedLimbPulseCanvas.getContext('2d');
  }
  if (!sharedLimbPulseCanvas || !sharedLimbPulseCtx) return null;
  if (sharedLimbPulseCanvas.width !== cw || sharedLimbPulseCanvas.height !== ch) {
    sharedLimbPulseCanvas.width = cw;
    sharedLimbPulseCanvas.height = ch;
  }
  sharedLimbPulseCtx.setTransform(1, 0, 0, 1, 0, 0);
  sharedLimbPulseCtx.clearRect(0, 0, cw, ch);
  return { canvas: sharedLimbPulseCanvas, ctx: sharedLimbPulseCtx };
}

const FALLBACK_PNG_LIMB_BOXES: Record<string, LimbMaskBox> = {
  head: { x: 0.34, y: 0.04, w: 0.32, h: 0.24 },
  left_arm: { x: 0.0, y: 0.25, w: 0.30, h: 0.45 },
  leftArm: { x: 0.0, y: 0.25, w: 0.30, h: 0.45 },
  right_arm: { x: 0.70, y: 0.25, w: 0.30, h: 0.45 },
  rightArm: { x: 0.70, y: 0.25, w: 0.30, h: 0.45 },
  left_leg: { x: 0.20, y: 0.65, w: 0.28, h: 0.35 },
  leftLeg: { x: 0.20, y: 0.65, w: 0.28, h: 0.35 },
  right_leg: { x: 0.52, y: 0.65, w: 0.28, h: 0.35 },
  rightLeg: { x: 0.52, y: 0.65, w: 0.28, h: 0.35 },
  legs: { x: 0.20, y: 0.65, w: 0.60, h: 0.35 },
  coiling_body: { x: 0.14, y: 0.56, w: 0.72, h: 0.38 },
  lashing_tail: { x: 0.64, y: 0.42, w: 0.36, h: 0.46 },
  tentacle_1: { x: 0.68, y: 0.20, w: 0.32, h: 0.38 },
  tentacle_2: { x: 0.0, y: 0.20, w: 0.32, h: 0.38 },
  tentacle_3: { x: 0.66, y: 0.54, w: 0.34, h: 0.36 },
  tentacle_4: { x: 0.0, y: 0.54, w: 0.34, h: 0.36 },
  snake_tail_head: { x: 0.02, y: 0.14, w: 0.30, h: 0.34 },
  throne_claw_left: { x: 0.0, y: 0.22, w: 0.30, h: 0.48 },
  throne_ensor_right: { x: 0.70, y: 0.22, w: 0.30, h: 0.48 },
  void_tendrils: { x: 0.18, y: 0.70, w: 0.64, h: 0.30 },
  void_conduit: { x: 0.32, y: 0.26, w: 0.14, h: 0.26 },
};

/**
 * Loads and caches a combat PNG/JPG asset asynchronously.
 * Returns the HTMLImageElement only once fully decoded with naturalWidth > 0;
 * returns null while loading or on 404 so the caller seamlessly falls back to Canvas art.
 */
export function loadCombatImage(url?: string): HTMLImageElement | null {
  if (!url || typeof Image === 'undefined') return null;
  const cached = combatImageCache.get(url);
  if (cached) {
    if (cached.status === 'loaded' && cached.img.complete && cached.img.naturalWidth > 0) {
      return cached.img;
    }
    return null;
  }

  const img = new Image();
  img.decoding = 'async';
  const entry: CachedCombatImage = { img, status: 'loading' };
  combatImageCache.set(url, entry);

  img.onload = () => {
    entry.status = img.naturalWidth > 0 ? 'loaded' : 'error';
  };
  img.onerror = () => {
    entry.status = 'error';
  };
  img.src = url;
  return null;
}

/**
 * Computes downward Y collapse & tilt when legs are severed on a PNG combat sprite.
 */
export function computePngLegDropOffset(
  severedLimbs: Set<string>,
  destH: number
): { dropY: number; tiltRad: number } {
  const lostLeftLeg = severedLimbs.has('left_leg') || severedLimbs.has('leftLeg');
  const lostRightLeg = severedLimbs.has('right_leg') || severedLimbs.has('rightLeg');
  const lostBothLegs = severedLimbs.has('legs') || (lostLeftLeg && lostRightLeg);
  if (lostBothLegs) {
    return { dropY: Math.round(destH * 0.14), tiltRad: 0 };
  }
  if (lostLeftLeg) {
    return { dropY: Math.round(destH * 0.06), tiltRad: -0.085 };
  }
  if (lostRightLeg) {
    return { dropY: Math.round(destH * 0.06), tiltRad: 0.085 };
  }
  return { dropY: 0, tiltRad: 0 };
}

/**
 * Resolves all active maskBox rectangles to cut out via `destination-out` for severed limbs.
 */
export function resolveSeveredMaskBoxes(
  severedLimbs: Set<string>,
  limbs?: CombatPngLimbEntry[]
): Array<{ id: string; box: LimbMaskBox }> {
  const seen = new Set<string>();
  const result: Array<{ id: string; box: LimbMaskBox }> = [];

  if (limbs && limbs.length > 0) {
    for (const limb of limbs) {
      const isCut = limb.severed || (typeof limb.hp === 'number' && limb.hp <= 0) || severedLimbs.has(limb.id);
      if (!isCut || limb.id === 'torso' || seen.has(limb.id)) continue;
      const box = limb.maskBox || FALLBACK_PNG_LIMB_BOXES[limb.id];
      if (box) {
        seen.add(limb.id);
        result.push({ id: limb.id, box });
      }
    }
  }

  for (const id of severedLimbs) {
    if (id === 'torso' || seen.has(id)) continue;
    const box = FALLBACK_PNG_LIMB_BOXES[id];
    if (box) {
      seen.add(id);
      result.push({ id, box });
    }
  }

  return result;
}

function getPooledMaskBuffer(w: number, h: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} | null {
  if (typeof document === 'undefined') return null;
  const cw = Math.max(16, Math.ceil(w));
  const ch = Math.max(16, Math.ceil(h));
  if (!sharedPngMaskCanvas) {
    sharedPngMaskCanvas = document.createElement('canvas');
    sharedPngMaskCtx = sharedPngMaskCanvas.getContext('2d');
  }
  if (!sharedPngMaskCanvas || !sharedPngMaskCtx) return null;
  if (sharedPngMaskCanvas.width < cw || sharedPngMaskCanvas.height < ch) {
    sharedPngMaskCanvas.width = Math.max(sharedPngMaskCanvas.width, cw);
    sharedPngMaskCanvas.height = Math.max(sharedPngMaskCanvas.height, ch);
  }
  sharedPngMaskCtx.setTransform(1, 0, 0, 1, 0, 0);
  sharedPngMaskCtx.clearRect(0, 0, sharedPngMaskCanvas.width, sharedPngMaskCanvas.height);
  return { canvas: sharedPngMaskCanvas, ctx: sharedPngMaskCtx };
}

function drawDrippingBloodAtSeam(
  bufCtx: CanvasRenderingContext2D,
  limbId: string,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  nowSec: number
): void {
  const lowerId = limbId.toLowerCase();
  const isLeftSide =
    lowerId.includes('left') || limbId === 'tentacle_2' || limbId === 'tentacle_4' || limbId === 'snake_tail_head';
  const isRightSide =
    lowerId.includes('right') || limbId === 'tentacle_1' || limbId === 'tentacle_3' || limbId === 'lashing_tail';
  const isBottom =
    lowerId.includes('leg') || limbId === 'void_tendrils' || limbId === 'coiling_body';
  const isTop = limbId === 'head';

  let seamX = rx + rw * 0.5;
  let seamY = ry + rh * 0.35;
  let woundRx = Math.max(8, rw * 0.16);
  let woundRy = Math.max(10, rh * 0.16);

  if (isBottom) {
    seamX = rx + rw * 0.5;
    seamY = ry + 4;
    woundRx = Math.max(14, rw * 0.34);
    woundRy = 8;
  } else if (isTop) {
    seamX = rx + rw * 0.5;
    seamY = ry + rh - 4;
    woundRx = Math.max(12, rw * 0.28);
    woundRy = 7;
  } else if (isLeftSide) {
    seamX = rx + rw - 3;
    seamY = ry + rh * 0.34;
    woundRx = 9;
    woundRy = Math.max(12, rh * 0.2);
  } else if (isRightSide) {
    seamX = rx + 3;
    seamY = ry + rh * 0.34;
    woundRx = 9;
    woundRy = Math.max(12, rh * 0.2);
  }

  bufCtx.save();
  bufCtx.globalCompositeOperation = 'source-over';

  // Dark coagulated arterial base
  bufCtx.fillStyle = '#3b070c';
  bufCtx.beginPath();
  bufCtx.ellipse(seamX, seamY, woundRx * 1.15, woundRy * 1.12, 0, 0, Math.PI * 2);
  bufCtx.fill();

  // Fresh crimson torn flesh edge
  bufCtx.fillStyle = '#991b1b';
  bufCtx.beginPath();
  bufCtx.ellipse(seamX, seamY, woundRx * 0.84, woundRy * 0.82, 0, 0, Math.PI * 2);
  bufCtx.fill();

  // Exposed bone tip at center of severed stump
  bufCtx.fillStyle = '#dfd8c8';
  bufCtx.strokeStyle = '#1c1917';
  bufCtx.lineWidth = 1.1;
  bufCtx.beginPath();
  bufCtx.ellipse(seamX, seamY - 1, Math.max(3, woundRx * 0.28), Math.max(2.5, woundRy * 0.26), 0.2, 0, Math.PI * 2);
  bufCtx.fill();
  bufCtx.stroke();

  bufCtx.restore();
}

/**
 * Renders a high-resolution transparent Combat PNG sprite onto a pooled offscreen canvas,
 * cuts away any severed limbs using `globalCompositeOperation = 'destination-out'`,
 * paints dripping dark-red blood stumps along each cut seam, and applies 4.5s slow breathing & hitstop recoil.
 */
export function drawCombatPngSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  severedLimbs: Set<string>,
  limbs?: CombatPngLimbEntry[],
  flashWhite: boolean = false,
  isOilCovered: boolean = false,
  isBlinded: boolean = false,
  isTelegraphing: boolean = false,
  nowSec: number = 0,
  selectedLimbId?: string,
  timeMs?: number
): boolean {
  const buf = getPooledMaskBuffer(destW, destH);
  if (!buf) return false;
  const { canvas: offCanvas, ctx: bufCtx } = buf;

  bufCtx.save();
  bufCtx.imageSmoothingEnabled = true;
  bufCtx.imageSmoothingQuality = 'high';

  // Fit PNG aspect ratio cleanly inside destW x destH
  const imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  const boxAspect = destW / Math.max(1, destH);
  let drawW = destW;
  let drawH = destH;
  if (imgAspect > boxAspect) {
    drawW = destW;
    drawH = destW / imgAspect;
  } else {
    drawH = destH;
    drawW = destH * imgAspect;
  }
  const drawX = (destW - drawW) * 0.5;
  const drawY = destH - drawH;

  // 1. Draw original high-resolution transparent PNG
  bufCtx.drawImage(img, drawX, drawY, drawW, drawH);

  // 2. Cut out severed limbs via `destination-out` maskBox
  const severedMasks = resolveSeveredMaskBoxes(severedLimbs, limbs);
  if (severedMasks.length > 0) {
    bufCtx.save();
    bufCtx.globalCompositeOperation = 'destination-out';
    bufCtx.fillStyle = '#000000';
    for (const { id, box } of severedMasks) {
      const rx = drawX + box.x * drawW;
      const ry = drawY + box.y * drawH;
      const rw = box.w * drawW;
      const rh = box.h * drawH;
      let idSeed = 0;
      for (let ci = 0; ci < id.length; ci++) idSeed = (idSeed * 31 + id.charCodeAt(ci)) % 997;
      const jagX = Math.max(2.5, Math.min(7, rw * 0.08));
      const jagY = Math.max(2.5, Math.min(7, rh * 0.08));
      const wobble = (idx: number) => Math.sin(idSeed * 0.17 + idx * 2.35);

      // Slightly organic jagged multi-point polygon along the maskBox edges
      bufCtx.beginPath();
      const segs = 5;
      bufCtx.moveTo(rx, ry);
      // Top edge
      for (let s = 1; s < segs; s++) {
        const t = s / segs;
        bufCtx.lineTo(rx + rw * t, ry + wobble(s) * jagY);
      }
      bufCtx.lineTo(rx + rw, ry);
      // Right edge
      for (let s = 1; s < segs; s++) {
        const t = s / segs;
        bufCtx.lineTo(rx + rw + wobble(s + 7) * jagX, ry + rh * t);
      }
      bufCtx.lineTo(rx + rw, ry + rh);
      // Bottom edge
      for (let s = segs - 1; s >= 1; s--) {
        const t = s / segs;
        bufCtx.lineTo(rx + rw * t, ry + rh + wobble(s + 15) * jagY);
      }
      bufCtx.lineTo(rx, ry + rh);
      // Left edge
      for (let s = segs - 1; s >= 1; s--) {
        const t = s / segs;
        bufCtx.lineTo(rx + wobble(s + 23) * jagX, ry + rh * t);
      }
      bufCtx.closePath();
      bufCtx.fill();
    }
    bufCtx.restore();

    // 3. Switch back to `source-over` and paint dark crimson dripping wounds right at the severed edges
    for (const { id, box } of severedMasks) {
      const rx = drawX + box.x * drawW;
      const ry = drawY + box.y * drawH;
      const rw = box.w * drawW;
      const rh = box.h * drawH;
      drawDrippingBloodAtSeam(bufCtx, id, rx, ry, rw, rh, nowSec);
    }
  }

  // 4. Status overlays clipped cleanly to remaining opaque PNG silhouette
  if (isOilCovered) {
    bufCtx.save();
    bufCtx.globalCompositeOperation = 'source-atop';
    bufCtx.fillStyle = 'rgba(110, 62, 16, 0.34)';
    bufCtx.fillRect(0, 0, destW, destH);
    bufCtx.restore();
  }

  if (selectedLimbId && !severedLimbs.has(selectedLimbId)) {
    const targetLimbEntry = limbs?.find((l) => l.id === selectedLimbId);
    const isTargetCut =
      Boolean(targetLimbEntry?.severed) ||
      (typeof targetLimbEntry?.hp === 'number' && targetLimbEntry.hp <= 0);
    if (!isTargetCut) {
      const targetBox =
        targetLimbEntry?.maskBox ||
        FALLBACK_PNG_LIMB_BOXES[selectedLimbId] ||
        (selectedLimbId === 'torso' ? { x: 0.24, y: 0.24, w: 0.52, h: 0.44 } : undefined);
      if (targetBox) {
        const pulseAlpha = computeLimbTargetPulseAlpha(timeMs ?? nowSec * 1000);
        if (pulseAlpha > 0.005) {
          bufCtx.save();
          bufCtx.globalCompositeOperation = 'source-atop';
          bufCtx.fillStyle = `rgba(255, 250, 235, ${pulseAlpha.toFixed(3)})`;
          bufCtx.fillRect(
            drawX + targetBox.x * drawW,
            drawY + targetBox.y * drawH,
            targetBox.w * drawW,
            targetBox.h * drawH
          );
          bufCtx.restore();
        }
      }
    }
  }

  if (flashWhite) {
    bufCtx.save();
    bufCtx.globalCompositeOperation = 'source-atop';
    bufCtx.fillStyle = 'rgba(255, 240, 232, 0.72)';
    bufCtx.fillRect(0, 0, destW, destH);
    bufCtx.restore();
  }

  if (isBlinded) {
    bufCtx.save();
    bufCtx.globalCompositeOperation = 'source-over';
    const eyeY = drawY + drawH * 0.18;
    const eyeCx = drawX + drawW * 0.5;
    const slashW = drawW * 0.22;
    bufCtx.strokeStyle = '#090507';
    bufCtx.lineWidth = 6;
    bufCtx.lineCap = 'round';
    bufCtx.beginPath();
    bufCtx.moveTo(eyeCx - slashW, eyeY - 7);
    bufCtx.lineTo(eyeCx + slashW, eyeY + 7);
    bufCtx.stroke();
    bufCtx.strokeStyle = '#dc2626';
    bufCtx.lineWidth = 3;
    bufCtx.beginPath();
    bufCtx.moveTo(eyeCx - slashW, eyeY - 7);
    bufCtx.lineTo(eyeCx + slashW, eyeY + 7);
    bufCtx.stroke();
    bufCtx.restore();
  }

  bufCtx.restore();

  // 5. Blit onto stage canvas with slow 4.5s breathing, leg-loss collapse drop, and hitstop shake
  const breathCycle = Math.sin((nowSec * Math.PI * 2) / 4.5);
  const scaleY = 1 + breathCycle * 0.016;
  const scaleX = 1 - breathCycle * 0.008;
  const { dropY, tiltRad } = computePngLegDropOffset(severedLimbs, destH);
  const hitJitterX = flashWhite ? Math.sin(nowSec * 90) * 6 : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const anchorX = destX + destW * 0.5 + hitJitterX;
  const anchorY = destY + destH + dropY;
  ctx.translate(anchorX, anchorY);
  if (tiltRad !== 0) {
    ctx.rotate(tiltRad);
  }
  ctx.scale(scaleX, scaleY);

  if (isTelegraphing) {
    ctx.shadowColor = 'rgba(220, 38, 38, 0.78)';
    ctx.shadowBlur = 20 + Math.sin(nowSec * 8) * 6;
  }

  ctx.drawImage(offCanvas, 0, 0, destW, destH, -destW * 0.5, -destH, destW, destH);
  ctx.restore();
  return true;
}

const HERO_BACK_PNG_URLS: Record<string, string> = {
  fallen_knight: '/assets/combat/player_fallen_knight.png',
  forsaken_nun: '/assets/combat/player_forsaken_nun.png',
  night_hunter: '/assets/combat/player_night_hunter.png',
};

function drawCombatBackdropImage(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  floor: 1 | 2 | 3
): boolean {
  const url = `/assets/combat/bg_floor${floor}.jpg`;
  const img = loadCombatImage(url);
  if (!img) return false;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Cover-fit floor backdrop image cleanly to canvas
  const imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  const viewAspect = w / Math.max(1, h);
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (imgAspect > viewAspect) {
    sw = img.naturalHeight * viewAspect;
    sx = (img.naturalWidth - sw) * 0.5;
  } else {
    sh = img.naturalWidth / viewAspect;
    sy = (img.naturalHeight - sh) * 0.5;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

  // Dark Gothic radial vignette so transparent PNG characters & enemies pop cleanly
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.44, w * 0.16, w * 0.5, h * 0.48, w * 0.76);
  vig.addColorStop(0, 'rgba(6, 4, 10, 0.12)');
  vig.addColorStop(0.62, 'rgba(6, 4, 10, 0.48)');
  vig.addColorStop(1, 'rgba(4, 3, 7, 0.86)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Subtle floor grounding gradient at bottom behind party silhouettes
  const floorShade = ctx.createLinearGradient(0, h * 0.68, 0, h);
  floorShade.addColorStop(0, 'rgba(5, 4, 8, 0)');
  floorShade.addColorStop(1, 'rgba(5, 4, 8, 0.72)');
  ctx.fillStyle = floorShade;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);

  ctx.restore();
  return true;
}

export type LimbZone =
  | 'head'
  | 'torso'
  | 'right_arm'
  | 'left_arm'
  | 'legs'
  | 'left_leg'
  | 'coiling_body'
  | 'lashing_tail'
  | 'tentacle_1'
  | 'tentacle_2'
  | 'tentacle_3'
  | 'tentacle_4'
  | 'snake_tail_head';

export interface ReticleAnchor {
  limbId: string;
  nx: number; // normalized 0..1 X on 640x440 combat stage canvas
  ny: number; // normalized 0..1 Y on 640x440 combat stage canvas
}

/**
 * Returns exact normalized (0..1) anatomical coordinates on the 640x440 combat canvas
 * for the 1.6x scaled monster so On-Body Reticles sit directly on each limb.
 */
export function getLimbReticlePositions(spriteKey: string): Record<string, { nx: number; ny: number }> {
  if (spriteKey === 'astral_kraken') {
    // Kẻ Gác Đền Hóa Thạch: Đầu hóa đá (head), Lồng ngực thịt đỏ (torso), Đại kiếm đá tay phải (tentacle_1), Tay trái đá (tentacle_2), Vai giáp đá (tentacle_3), Chân trụ đá (tentacle_4)
    return {
      head: { nx: 0.50, ny: 0.18 },
      torso: { nx: 0.50, ny: 0.46 },
      tentacle_1: { nx: 0.77, ny: 0.48 },
      tentacle_2: { nx: 0.25, ny: 0.44 },
      tentacle_3: { nx: 0.31, ny: 0.26 },
      tentacle_4: { nx: 0.52, ny: 0.78 },
    };
  }
  if (spriteKey === 'ouroboros_serpent') {
    // Thí Nghiệm Số 09 – Cành Cây Thịt: Quả cầu tim (head), Thân cây thịt (torso), Rễ xương máu (coiling_body), Cành bàn tay người (lashing_tail)
    return {
      head: { nx: 0.50, ny: 0.18 },
      torso: { nx: 0.50, ny: 0.46 },
      coiling_body: { nx: 0.34, ny: 0.76 },
      lashing_tail: { nx: 0.73, ny: 0.38 },
    };
  }
  if (spriteKey === 'dimensional_viper') {
    return {
      head: { nx: 0.50, ny: 0.20 },
      torso: { nx: 0.50, ny: 0.46 },
      right_arm: { nx: 0.30, ny: 0.66 },
      legs: { nx: 0.72, ny: 0.70 },
    };
  }
  if (spriteKey === 'void_chimera') {
    return {
      head: { nx: 0.50, ny: 0.18 },
      snake_tail_head: { nx: 0.74, ny: 0.38 },
      torso: { nx: 0.50, ny: 0.48 },
      right_arm: { nx: 0.25, ny: 0.50 },
      legs: { nx: 0.50, ny: 0.78 },
    };
  }
  if (spriteKey === 'demon_lord_vaelis') {
    return {
      void_conduit: { nx: 0.50, ny: 0.08 },
      head: { nx: 0.50, ny: 0.21 },
      throne_claw_left: { nx: 0.24, ny: 0.45 },
      torso: { nx: 0.50, ny: 0.44 },
      throne_ensor_right: { nx: 0.76, ny: 0.45 },
      void_tendrils: { nx: 0.50, ny: 0.79 },
    };
  }
  if (spriteKey === 'butcher_kaelgor') {
    return {
      head: { nx: 0.50, ny: 0.18 },
      left_arm: { nx: 0.25, ny: 0.46 },
      torso: { nx: 0.50, ny: 0.45 },
      right_arm: { nx: 0.76, ny: 0.44 },
      legs: { nx: 0.50, ny: 0.77 },
    };
  }
  if (spriteKey === 'dullahan_knight') {
    return {
      head: { nx: 0.50, ny: 0.18 },
      left_arm: { nx: 0.28, ny: 0.46 },
      torso: { nx: 0.52, ny: 0.46 },
      right_arm: { nx: 0.76, ny: 0.44 },
      legs: { nx: 0.50, ny: 0.77 },
    };
  }
  if (spriteKey === 'countess_carmilla') {
    return {
      head: { nx: 0.50, ny: 0.19 },
      left_arm: { nx: 0.25, ny: 0.46 },
      torso: { nx: 0.50, ny: 0.46 },
      right_arm: { nx: 0.75, ny: 0.44 },
      legs: { nx: 0.50, ny: 0.78 },
    };
  }
  if (spriteKey === 'fenrir_kin') {
    return {
      head: { nx: 0.50, ny: 0.21 },
      left_arm: { nx: 0.23, ny: 0.48 },
      torso: { nx: 0.50, ny: 0.47 },
      right_arm: { nx: 0.77, ny: 0.48 },
      legs: { nx: 0.50, ny: 0.78 },
    };
  }
  if (spriteKey === 'executioner_paladin') {
    // Hồng Y Sáp Trắng: Lư hương vàng (head), Lễ phục sáp chảy lộ mặt trẻ em (torso), 2 tay trái ôm Kinh Văn Da Người (left_arm), 2 tay phải cầm Chuông Đồng (right_arm), Dải lụa lơ lửng (legs)
    return {
      head: { nx: 0.50, ny: 0.17 },
      torso: { nx: 0.50, ny: 0.45 },
      left_arm: { nx: 0.24, ny: 0.44 },
      right_arm: { nx: 0.76, ny: 0.44 },
      legs: { nx: 0.50, ny: 0.77 },
    };
  }
  if (spriteKey === 'grand_abbess') {
    // Nữ Tu Khóc Ra Sáp: Mặt phủ sáp trắng (head), Thân trói bánh xe (torso), Hai tay khâu ngược sau lưng (left_arm), Tay phải cầm trượng sáp (right_arm), Bánh xe tra tấn gỗ mục (legs)
    return {
      head: { nx: 0.50, ny: 0.20 },
      torso: { nx: 0.50, ny: 0.46 },
      left_arm: { nx: 0.27, ny: 0.42 },
      right_arm: { nx: 0.75, ny: 0.44 },
      legs: { nx: 0.50, ny: 0.76 },
    };
  }
  if (spriteKey === 'penitent_knight') {
    // Thánh Vệ Bạch Kim: Mũ giáp rỉ máu đen (head), Giáp bạch kim (torso), Khiên Tháp Con Mắt (left_arm), Chùy Bạch Kim (right_arm), Cẳng chân trái mất giáp (left_leg), Chân phải bọc giáp (legs)
    return {
      head: { nx: 0.50, ny: 0.18 },
      torso: { nx: 0.50, ny: 0.44 },
      left_arm: { nx: 0.24, ny: 0.46 },
      right_arm: { nx: 0.76, ny: 0.44 },
      left_leg: { nx: 0.40, ny: 0.76 },
      legs: { nx: 0.60, ny: 0.76 },
    };
  }
  if (spriteKey === 'dire_hellwolf' || spriteKey === 'void_panther') {
    return {
      head: { nx: 0.34, ny: 0.34 },
      torso: { nx: 0.54, ny: 0.48 },
      left_arm: { nx: 0.30, ny: 0.68 },
      right_arm: { nx: 0.46, ny: 0.70 },
      legs: { nx: 0.70, ny: 0.68 },
    };
  }
  return {
    head: { nx: 0.50, ny: 0.19 },
    torso: { nx: 0.50, ny: 0.45 },
    left_arm: { nx: 0.27, ny: 0.44 },
    right_arm: { nx: 0.73, ny: 0.44 },
    left_leg: { nx: 0.42, ny: 0.75 },
    legs: { nx: 0.58, ny: 0.75 },
  };
}

function drawArterialStump(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  grad.addColorStop(0, '#c81e1e');
  grad.addColorStop(0.55, '#7f1d1d');
  grad.addColorStop(1, '#2b0505');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
  ctx.lineWidth = Math.max(0.85, r * 0.14);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Exposed jagged pale bone shard in center
  ctx.fillStyle = '#e6dcc8';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.35, y);
  ctx.lineTo(x, y - r * 0.45);
  ctx.lineTo(x + r * 0.35, y + r * 0.1);
  ctx.lineTo(x, y + r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Cracked armored severed stump: jagged broken steel collar + exposed bone + dripping dark crimson blood
 */
function drawArmoredSeveredStump(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, scale: number = 1) {
  ctx.save();
  // Cracked blackened steel armor cuff
  ctx.fillStyle = '#2b323d';
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = Math.max(1.6, 2 * scale);
  ctx.beginPath();
  ctx.moveTo(x - r * 1.15, y - r * 0.55);
  ctx.lineTo(x - r * 0.5, y - r * 1.05);
  ctx.lineTo(x + r * 0.65, y - r * 0.9);
  ctx.lineTo(x + r * 1.15, y - r * 0.2);
  ctx.lineTo(x + r * 0.85, y + r * 0.85);
  ctx.lineTo(x - r * 0.9, y + r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Metallic rim highlight on cracked steel lip
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.95, y - r * 0.45);
  ctx.lineTo(x - r * 0.4, y - r * 0.9);
  ctx.lineTo(x + r * 0.5, y - r * 0.78);
  ctx.stroke();

  drawArterialStump(ctx, x, y + r * 0.12, r * 0.82);
  ctx.restore();
}

/**
 * Visceral diagonal crimson slash across visor/eyes when an enemy is Blinded (extinguishes eye glow)
 */
function drawBlindedEyeSlash(ctx: CanvasRenderingContext2D, cx: number, y: number, halfSpan: number, scale: number = 1) {
  ctx.save();
  // Dark dried blood smear over eye sockets
  ctx.fillStyle = 'rgba(69, 10, 10, 0.72)';
  ctx.beginPath();
  ctx.ellipse(cx, y, halfSpan * 1.05, Math.max(2.6, 3.6 * scale), 0, 0, Math.PI * 2);
  ctx.fill();

  // Jagged diagonal laceration
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = Math.max(3, 3.6 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - halfSpan * 1.15, y - halfSpan * 0.42);
  ctx.lineTo(cx + halfSpan * 1.15, y + halfSpan * 0.42);
  ctx.stroke();

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = Math.max(1.6, 2.0 * scale);
  ctx.beginPath();
  ctx.moveTo(cx - halfSpan * 1.1, y - halfSpan * 0.38);
  ctx.lineTo(cx + halfSpan * 1.1, y + halfSpan * 0.38);
  ctx.stroke();

  // Trickling blood droplets from blinded eyes
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = Math.max(1.1, 1.3 * scale);
  for (const ox of [-halfSpan * 0.45, halfSpan * 0.45]) {
    ctx.beginPath();
    ctx.moveTo(cx + ox, y + 1.5 * scale);
    ctx.lineTo(cx + ox * 0.92, y + halfSpan * 0.95);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a compact, wrist-proportioned clenched hand/gauntlet strictly ON TOP of weapon shafts
 * so fingers cleanly wrap around the grip rather than the shaft cutting across the hand.
 */
function drawGrippingHand(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  scale: number,
  fillColor: string,
  angle: number = 0
) {
  ctx.save();
  ctx.translate(hx, hy);
  if (angle !== 0) ctx.rotate(angle);

  // Compact fist/gauntlet silhouette proportioned to forearm wrist
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = Math.max(1.2, 1.65 * scale);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.1 * scale, 3.2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Subtle curled-finger knuckle creases across the grip
  ctx.strokeStyle = 'rgba(5, 5, 5, 0.72)';
  ctx.lineWidth = Math.max(0.8, 0.95 * scale);
  ctx.beginPath();
  ctx.moveTo(-1.2 * scale, -2.1 * scale);
  ctx.lineTo(-1.2 * scale, 2.0 * scale);
  ctx.moveTo(1.2 * scale, -2.0 * scale);
  ctx.lineTo(1.2 * scale, 1.9 * scale);
  ctx.stroke();

  ctx.restore();
}

/**
 * Helper to draw distinct, recognizable dark-fantasy weapons & props in monster/hero hands
 */
function drawDetailedWeapon(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  hand: 'left' | 'right',
  hx: number,
  hy: number,
  scale: number,
  isTelegraphing: boolean = false
) {
  ctx.save();
  ctx.translate(hx, hy);

  const inkStroke = 'rgba(10, 8, 13, 0.78)';
  const thinWeaponLine = Math.max(0.8, 0.95 * scale);

  if (hand === 'left') {
    if (spriteKey === 'fanatic_zealot' || spriteKey === 'crypt_keybearer') {
      // Compact Hand Torch (short tapered ash-wood handle + wrapped rag/iron head cup + compact layered flame)
      ctx.save();
      ctx.rotate(-0.22);

      // Tapered charred ash-wood handle (narrower at grip (0, 0), wider toward top)
      const handleGrad = ctx.createLinearGradient(-3 * scale, 5 * scale, 3 * scale, -18 * scale);
      handleGrad.addColorStop(0, '#292524');
      handleGrad.addColorStop(1, '#44403c');
      ctx.fillStyle = handleGrad;
      ctx.strokeStyle = inkStroke;
      ctx.lineWidth = thinWeaponLine;
      ctx.beginPath();
      ctx.moveTo(-1.6 * scale, 6 * scale);
      ctx.lineTo(-3.2 * scale, -17 * scale);
      ctx.lineTo(3.2 * scale, -17 * scale);
      ctx.lineTo(1.6 * scale, 6 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dark wrapped-rag / iron torch head cup directly on top of handle
      ctx.fillStyle = '#2c2420';
      ctx.beginPath();
      ctx.moveTo(-4.4 * scale, -16.5 * scale);
      ctx.lineTo(-5.2 * scale, -22.5 * scale);
      ctx.lineTo(5.2 * scale, -22.5 * scale);
      ctx.lineTo(4.4 * scale, -16.5 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rag wrap highlight & thin dark iron collar band
      ctx.fillStyle = '#3f3530';
      ctx.fillRect(-4.6 * scale, -21.5 * scale, 9.2 * scale, 3 * scale);
      ctx.fillStyle = '#1f242b';
      ctx.fillRect(-4.4 * scale, -18 * scale, 8.8 * scale, 1.8 * scale);
      ctx.strokeRect(-4.4 * scale, -18 * scale, 8.8 * scale, 1.8 * scale);

      // Soft outer orange glow seated directly on torch head
      const fGrad = ctx.createRadialGradient(0, -27 * scale, 1.5 * scale, 0, -27 * scale, 11.5 * scale);
      fGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
      fGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
      fGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(0, -27 * scale, 11.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Mid warm amber flame
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-4.8 * scale, -22.2 * scale);
      ctx.quadraticCurveTo(-6.2 * scale, -30.5 * scale, 0, -35.5 * scale);
      ctx.quadraticCurveTo(6.2 * scale, -30.5 * scale, 4.8 * scale, -22.2 * scale);
      ctx.closePath();
      ctx.fill();

      // Compact bright inner core
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-2.4 * scale, -22.5 * scale);
      ctx.quadraticCurveTo(-2.8 * scale, -27.8 * scale, 0, -30.8 * scale);
      ctx.quadraticCurveTo(2.8 * scale, -27.8 * scale, 2.4 * scale, -22.5 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (spriteKey === 'crypt_keybearer') {
        // Large Iron Crypt Key Ring hanging directly from gripped hand
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = Math.max(1.2, 1.6 * scale);
        ctx.beginPath();
        ctx.arc(-1 * scale, 12 * scale, 6.5 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#a16207';
        ctx.fillRect(-2.6 * scale, 18.5 * scale, 3.6 * scale, 10.5 * scale);
      }
    } else if (spriteKey === 'rotting_priest') {
      // Tarnished Brass Soul-Bell (handle ring centered at (0, 0) grip)
      ctx.strokeStyle = '#785c18';
      ctx.lineWidth = Math.max(1.3, 1.8 * scale);
      ctx.beginPath();
      ctx.arc(0, 4.5 * scale, 5.2 * scale, Math.PI, 0);
      ctx.stroke();

      const bellGrad = ctx.createLinearGradient(-8 * scale, 6 * scale, 10 * scale, 26 * scale);
      bellGrad.addColorStop(0, '#eab308');
      bellGrad.addColorStop(0.5, '#a16207');
      bellGrad.addColorStop(1, '#3f3422');
      ctx.fillStyle = bellGrad;
      ctx.strokeStyle = inkStroke;
      ctx.lineWidth = thinWeaponLine;
      ctx.beginPath();
      ctx.moveTo(-6 * scale, 6 * scale);
      ctx.lineTo(6 * scale, 6 * scale);
      ctx.quadraticCurveTo(11 * scale, 20 * scale, 13 * scale, 25 * scale);
      ctx.lineTo(-13 * scale, 25 * scale);
      ctx.quadraticCurveTo(-11 * scale, 20 * scale, -6 * scale, 6 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 26 * scale, 3.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (spriteKey === 'executioner_paladin') {
      // Colossal Raised Cross Tower-Shield covering half of Paladin's upper body
      const shGrad = ctx.createLinearGradient(-28 * scale, -44 * scale, 10 * scale, 26 * scale);
      shGrad.addColorStop(0, '#f8fafc');
      shGrad.addColorStop(0.5, '#94a3b8');
      shGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = shGrad;
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = Math.max(1.2, 1.8 * scale);
      ctx.beginPath();
      ctx.moveTo(-26 * scale, -42 * scale);
      ctx.lineTo(10 * scale, -42 * scale);
      ctx.lineTo(10 * scale, 6 * scale);
      ctx.quadraticCurveTo(8 * scale, 24 * scale, -8 * scale, 32 * scale);
      ctx.quadraticCurveTo(-24 * scale, 24 * scale, -26 * scale, 6 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blazing Gold Cross on Greatshield
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-11 * scale, -34 * scale, 6 * scale, 54 * scale);
      ctx.fillRect(-21 * scale, -18 * scale, 26 * scale, 6 * scale);
    } else if (spriteKey === 'fallen_knight') {
      // Dark Weathered Iron & Slate-Wood Heater Shield
      const shGrad = ctx.createLinearGradient(-22 * scale, -18 * scale, 4 * scale, 24 * scale);
      shGrad.addColorStop(0, '#334155');
      shGrad.addColorStop(0.6, '#1f242b');
      shGrad.addColorStop(1, '#0f1218');
      ctx.fillStyle = shGrad;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = Math.max(1.2, 1.8 * scale);
      ctx.beginPath();
      ctx.moveTo(-22 * scale, -18 * scale);
      ctx.lineTo(4 * scale, -18 * scale);
      ctx.quadraticCurveTo(6 * scale, 10 * scale, -9 * scale, 28 * scale);
      ctx.quadraticCurveTo(-24 * scale, 10 * scale, -22 * scale, -18 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Steel Shield Boss & Cross Strips
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(1.1, 1.6 * scale);
      ctx.beginPath();
      ctx.moveTo(-9 * scale, -16 * scale);
      ctx.lineTo(-9 * scale, 24 * scale);
      ctx.moveTo(-20 * scale, -2 * scale);
      ctx.lineTo(2 * scale, -2 * scale);
      ctx.stroke();
    } else if (spriteKey === 'butcher_kaelgor') {
      // Heavy Iron Meat Hook on Chain in Left Hand
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = Math.max(1.5, 2.2 * scale);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-12 * scale, 18 * scale);
      ctx.arc(-18 * scale, 18 * scale, 7 * scale, 0, Math.PI * 1.35);
      ctx.stroke();
    } else if (spriteKey === 'countess_carmilla') {
      // Floating Ruby Blood Chalice (Ly Huyết Ngọc lơ lửng)
      const auraGrad = ctx.createRadialGradient(-10 * scale, -18 * scale, 2, -10 * scale, -18 * scale, 16 * scale);
      auraGrad.addColorStop(0, 'rgba(244, 63, 94, 0.85)');
      auraGrad.addColorStop(1, 'rgba(136, 19, 55, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(-10 * scale, -18 * scale, 16 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#eab308';
      ctx.strokeStyle = inkStroke;
      ctx.lineWidth = thinWeaponLine;
      ctx.beginPath();
      ctx.moveTo(-17 * scale, -26 * scale);
      ctx.lineTo(-3 * scale, -26 * scale);
      ctx.quadraticCurveTo(-4 * scale, -14 * scale, -10 * scale, -14 * scale);
      ctx.quadraticCurveTo(-16 * scale, -14 * scale, -17 * scale, -26 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-11.5 * scale, -14 * scale, 3 * scale, 8 * scale);
      ctx.fillRect(-15 * scale, -6 * scale, 10 * scale, 2.5 * scale);

      // Swirling blood droplet above chalice
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(-10 * scale, -31 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (spriteKey === 'dullahan_knight') {
      // Blazing Severed Skull held aloft in Left Hand
      const fireGrad = ctx.createRadialGradient(-10 * scale, -8 * scale, 2 * scale, -10 * scale, -8 * scale, 20 * scale);
      fireGrad.addColorStop(0, '#e0f2fe');
      fireGrad.addColorStop(0.45, '#38bdf8');
      fireGrad.addColorStop(0.75, '#7e22ce');
      fireGrad.addColorStop(1, 'rgba(59, 7, 100, 0)');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(-10 * scale, -8 * scale, 20 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Spectral Flame tongues rising from skull
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-18 * scale, -6 * scale);
      ctx.quadraticCurveTo(-22 * scale, -28 * scale, -10 * scale, -34 * scale);
      ctx.quadraticCurveTo(2 * scale, -26 * scale, -2 * scale, -6 * scale);
      ctx.closePath();
      ctx.fill();

      // Bone Skull
      ctx.fillStyle = '#f5ebd6';
      ctx.strokeStyle = inkStroke;
      ctx.lineWidth = thinWeaponLine;
      ctx.beginPath();
      ctx.arc(-10 * scale, -4 * scale, 9 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Cyan Eye Sockets & Jaw teeth
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(-13 * scale, -5 * scale, 2.4 * scale, 0, Math.PI * 2);
      ctx.arc(-7 * scale, -5 * scale, 2.4 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (spriteKey === 'demon_lord_vaelis') {
      // Swirling Abyssal Void Singularity Sphere (Quả Cầu Hư Vô xoáy tím đen)
      const orbRadius = (isTelegraphing ? 24 : 18) * scale;
      const orbGrad = ctx.createRadialGradient(-10 * scale, -6 * scale, 2, -10 * scale, -6 * scale, orbRadius);
      orbGrad.addColorStop(0, '#09050f');
      orbGrad.addColorStop(0.35, '#7e22ce');
      orbGrad.addColorStop(0.7, '#e879f9');
      orbGrad.addColorStop(1, 'rgba(59, 7, 100, 0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(-10 * scale, -6 * scale, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Swirling Void Vortex arcs
      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = Math.max(1, 1.4 * scale);
      for (let a = 0; a < 3; a++) {
        ctx.beginPath();
        ctx.arc(-10 * scale, -6 * scale, (8 + a * 4) * scale, a, a + Math.PI * 1.1);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // RIGHT-HAND PRIMARY WEAPONS (all shafts/hilts pass cleanly through (0, 0) grip)
  // =========================================================================
  ctx.strokeStyle = inkStroke;
  ctx.lineWidth = thinWeaponLine;

  if (spriteKey === 'night_hunter') {
    // Curved Steel Hunting Dagger (charred ash hilt centered on (0, 0))
    ctx.fillStyle = '#292524';
    ctx.fillRect(-3 * scale, -3 * scale, 6 * scale, 11 * scale);
    ctx.strokeRect(-3 * scale, -3 * scale, 6 * scale, 11 * scale);
    const bladeGrad = ctx.createLinearGradient(0, -2 * scale, 22 * scale, -36 * scale);
    bladeGrad.addColorStop(0, '#64748b');
    bladeGrad.addColorStop(0.55, '#cbd5e1');
    bladeGrad.addColorStop(1, '#f8fafc');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(2 * scale, -2 * scale);
    ctx.bezierCurveTo(22 * scale, -10 * scale, 26 * scale, -30 * scale, 8 * scale, -38 * scale);
    ctx.bezierCurveTo(16 * scale, -26 * scale, 12 * scale, -12 * scale, -2 * scale, -4 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (spriteKey === 'forsaken_nun') {
    // Flanged Steel Holy Mother Mace (shaft passes cleanly through (0, 0))
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(-3.5 * scale, 10 * scale);
    ctx.lineTo(10.5 * scale, -28 * scale);
    ctx.stroke();

    const headX = 11.5 * scale;
    const headY = -32 * scale;
    const maceGrad = ctx.createRadialGradient(headX - 2 * scale, headY - 2 * scale, 1.5, headX, headY, 10 * scale);
    maceGrad.addColorStop(0, '#e2e8f0');
    maceGrad.addColorStop(0.55, '#64748b');
    maceGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = maceGrad;
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = thinWeaponLine;
    for (let f = 0; f < 6; f++) {
      const ang = (f / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(headX + Math.cos(ang - 0.25) * 4 * scale, headY + Math.sin(ang - 0.25) * 4 * scale);
      ctx.lineTo(headX + Math.cos(ang) * 11 * scale, headY + Math.sin(ang) * 11 * scale);
      ctx.lineTo(headX + Math.cos(ang + 0.25) * 4 * scale, headY + Math.sin(ang + 0.25) * 4 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#c5a059';
    ctx.beginPath();
    ctx.arc(headX, headY, 3.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (spriteKey === 'fanatic_zealot') {
    // Tempered Steel Reaper Sickle with dark iron/ash shaft
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 2.8 * scale;
    ctx.beginPath();
    ctx.moveTo(-2.5 * scale, 7 * scale);
    ctx.lineTo(7.5 * scale, -19 * scale);
    ctx.stroke();

    // Subtle slate ferrule band
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(4.5 * scale, -11.5 * scale);
    ctx.lineTo(7.5 * scale, -19 * scale);
    ctx.stroke();

    const bladeGrad = ctx.createLinearGradient(4 * scale, -18 * scale, 24 * scale, -38 * scale);
    bladeGrad.addColorStop(0, '#64748b');
    bladeGrad.addColorStop(0.55, '#cbd5e1');
    bladeGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bladeGrad;
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = thinWeaponLine;
    ctx.beginPath();
    ctx.moveTo(6.5 * scale, -18 * scale);
    ctx.bezierCurveTo(25 * scale, -22 * scale, 25 * scale, -44 * scale, 3 * scale, -42 * scale);
    ctx.bezierCurveTo(15 * scale, -36 * scale, 15 * scale, -24 * scale, 4.5 * scale, -20 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (
    spriteKey === 'flagellant_monk' ||
    spriteKey === 'weeping_inquisitor' ||
    spriteKey === 'black_bone_skeleton'
  ) {
    // Spiked Morning Star Mace (iron handle passes cleanly through (0, 0))
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3.1 * scale;
    ctx.beginPath();
    ctx.moveTo(-3.2 * scale, 8 * scale);
    ctx.lineTo(12 * scale, -28 * scale);
    ctx.stroke();

    const ballX = 13.5 * scale;
    const ballY = -32 * scale;
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = thinWeaponLine;
    ctx.beginPath();
    ctx.arc(ballX, ballY, 8.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(ballX + Math.cos(ang - 0.25) * 7 * scale, ballY + Math.sin(ang - 0.25) * 7 * scale);
      ctx.lineTo(ballX + Math.cos(ang) * 14.5 * scale, ballY + Math.sin(ang) * 14.5 * scale);
      ctx.lineTo(ballX + Math.cos(ang + 0.25) * 7 * scale, ballY + Math.sin(ang + 0.25) * 7 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (spriteKey === 'executioner_paladin') {
    // Colossal Judgment Warhammer (dark iron haft passes through (0, 0))
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3.8 * scale;
    ctx.beginPath();
    ctx.moveTo(-4.5 * scale, 14 * scale);
    ctx.lineTo(14.5 * scale, -44 * scale);
    ctx.stroke();

    const hamGrad = ctx.createLinearGradient(0, -52 * scale, 30 * scale, -34 * scale);
    hamGrad.addColorStop(0, '#fef08a');
    hamGrad.addColorStop(0.5, '#cbd5e1');
    hamGrad.addColorStop(1, '#475569');
    ctx.fillStyle = hamGrad;
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = thinWeaponLine;
    ctx.beginPath();
    ctx.moveTo(0, -48 * scale);
    ctx.lineTo(28 * scale, -36 * scale);
    ctx.lineTo(24 * scale, -24 * scale);
    ctx.lineTo(-4 * scale, -36 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (spriteKey === 'butcher_kaelgor') {
    // Đại Phủ Chặt Đầu khổng lồ (Executioner Cleaver — ash-wood/iron haft)
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(-4 * scale, 12 * scale);
    ctx.lineTo(15 * scale, -44 * scale);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = thinWeaponLine;
    ctx.beginPath();
    ctx.moveTo(7 * scale, -18 * scale);
    ctx.lineTo(33 * scale, -54 * scale);
    ctx.lineTo(41 * scale, -24 * scale);
    ctx.lineTo(11 * scale, -6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tempered steel cleaver edge with subtle dark crimson patina
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = Math.max(1.2, 1.8 * scale);
    ctx.beginPath();
    ctx.moveTo(32 * scale, -51 * scale);
    ctx.lineTo(39 * scale, -25 * scale);
    ctx.stroke();
  } else if (spriteKey === 'grand_abbess' || spriteKey === 'rotting_priest') {
    // Glowing Holy Mother Staff (tarnished brass/slate shaft)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(-4.5 * scale, 18 * scale);
    ctx.lineTo(11 * scale, -42 * scale);
    ctx.stroke();

    const haloR = (spriteKey === 'grand_abbess' ? (isTelegraphing ? 28 : 20) : 14) * scale;
    const glow = ctx.createRadialGradient(11 * scale, -46 * scale, 2, 11 * scale, -46 * scale, haloR);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.35, '#fef08a');
    glow.addColorStop(0.7, 'rgba(234, 179, 8, 0.55)');
    glow.addColorStop(1, 'rgba(234, 179, 8, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(11 * scale, -46 * scale, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Converging Judgment Light Beams when Grand Abbess is telegraphing
    if (spriteKey === 'grand_abbess') {
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = Math.max(1, 1.4 * scale);
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI * 2) / 8;
        ctx.beginPath();
        ctx.moveTo(11 * scale + Math.cos(ang) * 9 * scale, -46 * scale + Math.sin(ang) * 9 * scale);
        ctx.lineTo(11 * scale + Math.cos(ang) * haloR, -46 * scale + Math.sin(ang) * haloR);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.6 * scale;
    ctx.beginPath();
    ctx.moveTo(11 * scale, -58 * scale);
    ctx.lineTo(11 * scale, -34 * scale);
    ctx.moveTo(2 * scale, -48 * scale);
    ctx.lineTo(20 * scale, -48 * scale);
    ctx.stroke();
  } else if (spriteKey === 'demon_lord_vaelis') {
    // World-Ending Apocalypse Greatsword (Đại Đao Diệt Thế rực lửa dung nham)
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 3.8 * scale;
    ctx.beginPath();
    ctx.moveTo(-3 * scale, 10 * scale);
    ctx.lineTo(4 * scale, -4 * scale);
    ctx.stroke();

    const bGrad = ctx.createLinearGradient(2 * scale, 0, 28 * scale, -64 * scale);
    bGrad.addColorStop(0, '#450a0a');
    bGrad.addColorStop(0.4, '#dc2626');
    bGrad.addColorStop(0.8, '#f97316');
    bGrad.addColorStop(1, '#fef08a');
    ctx.fillStyle = bGrad;
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = thinWeaponLine;
    ctx.beginPath();
    ctx.moveTo(0, -3 * scale);
    ctx.lineTo(22 * scale, -62 * scale);
    ctx.lineTo(34 * scale, -54 * scale);
    ctx.lineTo(26 * scale, -34 * scale);
    ctx.lineTo(31 * scale, -28 * scale);
    ctx.lineTo(10 * scale, 2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Horned Demon Crossguard
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(-6 * scale, -7 * scale);
    ctx.quadraticCurveTo(5 * scale, -1 * scale, 16 * scale, 2 * scale);
    ctx.stroke();
  } else {
    // Broad Iron Sword / Penitent Greatsword / Vorath Dark Greatsword (ash/iron hilt + tempered steel blade)
    const isColossal = spriteKey === 'penitent_knight' || spriteKey === 'dullahan_knight';
    const len = isColossal ? -60 : -48;
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(-3 * scale, 9 * scale);
    ctx.lineTo(3 * scale, -5 * scale);
    ctx.stroke();

    const bGrad = ctx.createLinearGradient(2 * scale, -4 * scale, 20 * scale, len * scale);
    bGrad.addColorStop(0, spriteKey === 'dullahan_knight' ? '#1e293b' : '#475569');
    bGrad.addColorStop(0.55, spriteKey === 'dullahan_knight' ? '#475569' : '#cbd5e1');
    bGrad.addColorStop(1, spriteKey === 'dullahan_knight' ? '#94a3b8' : '#e2e8f0');
    ctx.fillStyle = bGrad;
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = thinWeaponLine;
    ctx.beginPath();
    ctx.moveTo(-1 * scale, -5 * scale);
    ctx.lineTo(16 * scale, len * scale);
    ctx.lineTo(26 * scale, (len + 5) * scale);
    ctx.lineTo(8 * scale, -1 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#b49a5a';
    ctx.lineWidth = 2.6 * scale;
    ctx.beginPath();
    ctx.moveTo(-6 * scale, -7 * scale);
    ctx.lineTo(12 * scale, 1 * scale);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders Multi-Tone Layered Dark-Fantasy Vector Sprites for all 3 Playable Classes,
 * 15 Normal Enemies (with distinct quadruped/hulking/chained stances),
 * 10 Mini-Bosses, and Demon Lord Vaelis with Visual Telegraph FX.
 */
export function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  severedLimbs: Set<string> = new Set(),
  flashWhite: boolean = false,
  isOilCovered: boolean = false,
  isBlinded: boolean = false,
  isTelegraphing: boolean = false,
  animPhase: number = 0,
  floor: 1 | 2 | 3 = 2,
  combatPngOptions?: CombatPngRenderOptions
) {
  // High-Resolution Transparent PNG Combat Sprite Pipeline (with destination-out limb severing)
  // Automatically falls back to the smooth Dark Gothic Canvas renderer below when PNG is absent/loading.
  if (combatPngOptions?.combatSpriteUrl) {
    const pngImg = loadCombatImage(combatPngOptions.combatSpriteUrl);
    if (pngImg) {
      const rendered = drawCombatPngSprite(
        ctx,
        pngImg,
        destX,
        destY,
        destW,
        destH,
        severedLimbs,
        combatPngOptions.limbs,
        flashWhite,
        isOilCovered,
        isBlinded,
        isTelegraphing,
        combatPngOptions.nowSec ?? animPhase,
        combatPngOptions.selectedLimbId,
        combatPngOptions.timeMs
      );
      if (rendered) return;
    }
  }

  ctx.save();
  ctx.translate(destX, destY);

  const cx = destW * 0.5;
  const cy = destH * 0.46;
  const scale = Math.min(destW / 120, destH / 160);
  const rimLightCol =
    floor === 3 ? 'rgba(216, 180, 254, 0.85)' : floor === 1 ? 'rgba(251, 146, 60, 0.82)' : 'rgba(245, 198, 130, 0.72)';
  const rimLightSoft =
    floor === 3 ? 'rgba(168, 85, 247, 0.42)' : floor === 1 ? 'rgba(234, 88, 12, 0.38)' : 'rgba(217, 179, 108, 0.34)';
  const outlineDark = 'rgba(10, 8, 13, 0.78)';
  const selectedLimbId = combatPngOptions?.selectedLimbId;
  const timeMs = combatPngOptions?.timeMs ?? animPhase * 1000;
  const limbPulseAlpha = selectedLimbId ? computeLimbTargetPulseAlpha(timeMs) : 0;
  const withLimbHighlight = (limbId: string, drawFn: () => void) => {
    const isSelected = Boolean(selectedLimbId && limbId === selectedLimbId && !severedLimbs.has(limbId));
    if (!isSelected || limbPulseAlpha <= 0.005) {
      drawFn();
      return;
    }
    const origCtx = ctx;
    const canvasW = origCtx.canvas?.width || Math.ceil(destX + destW);
    const canvasH = origCtx.canvas?.height || Math.ceil(destY + destH);
    const buf = getPooledLimbPulseBuffer(canvasW, canvasH);
    if (!buf) {
      drawFn();
      return;
    }
    const { canvas: offCanvas, ctx: offCtx } = buf;
    offCtx.save();
    offCtx.setTransform(origCtx.getTransform());
    offCtx.imageSmoothingEnabled = origCtx.imageSmoothingEnabled;
    ctx = offCtx;
    try {
      drawFn();
    } finally {
      ctx = origCtx;
      offCtx.restore();
    }

    // Apply smooth Fear & Hunger-style white pulse strictly to the targeted limb's opaque pixels
    offCtx.save();
    offCtx.setTransform(1, 0, 0, 1, 0, 0);
    offCtx.globalCompositeOperation = 'source-atop';
    offCtx.fillStyle = `rgba(255, 250, 235, ${limbPulseAlpha.toFixed(3)})`;
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
    offCtx.restore();

    // Composite isolated pulsing limb back onto the main canvas
    origCtx.save();
    origCtx.setTransform(1, 0, 0, 1, 0, 0);
    origCtx.drawImage(offCanvas, 0, 0);
    origCtx.restore();
  };

  // Subtle floor-tinted atmospheric back-glow separating dark gothic silhouette from stage backdrop
  if (destW >= 160) {
    const backAura = ctx.createRadialGradient(cx, destH * 0.44, 10 * scale, cx, destH * 0.44, 62 * scale);
    backAura.addColorStop(0, rimLightSoft);
    backAura.addColorStop(0.55, 'rgba(10, 7, 14, 0.14)');
    backAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = backAura;
    ctx.beginPath();
    ctx.arc(cx, destH * 0.44, 62 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Per-Limb Idle Breathing Curves (sin/cos offsets per anatomical part instead of whole-sprite bounce)
  const torsoBreathY = Math.sin(animPhase) * 2.2 * scale;
  const torsoExpandX = 1 + Math.sin(animPhase) * 0.025;
  const headBobY = Math.sin(animPhase - 0.55) * 3.1 * scale;
  const headSwayX = Math.cos(animPhase * 0.7) * 1.4 * scale;
  const leftArmBobY = Math.sin(animPhase + 1.1) * 3.6 * scale;
  const leftArmSwayX = Math.cos(animPhase + 0.6) * 2.2 * scale;
  const rightArmBobY = Math.sin(animPhase + 2.3) * 3.8 * scale;
  const rightArmSwayX = Math.sin(animPhase * 0.9) * 2.4 * scale;
  const wingFlapY = Math.sin(animPhase * 1.3) * 4.5 * scale;

  // Archetype classification for Multi-Tone Material Separation
  const isPriestOrNun =
    spriteKey === 'rotting_priest' ||
    spriteKey === 'grand_abbess';
  const isCrimsonInquisitor =
    spriteKey === 'weeping_inquisitor' ||
    spriteKey === 'countess_carmilla' ||
    spriteKey === 'demon_lord_vaelis';
  const isArmoredKnight =
    spriteKey === 'penitent_knight' ||
    spriteKey === 'executioner_paladin' ||
    spriteKey === 'dullahan_knight' ||
    spriteKey === 'fallen_knight' ||
    spriteKey === 'armored_ghoul';
  const isVoidEntity =
    spriteKey.includes('void') ||
    spriteKey.includes('kraken') ||
    spriteKey.includes('ouroboros') ||
    spriteKey.includes('viper') ||
    spriteKey.includes('chimera');

  let fleshLight = isVoidEntity ? '#c084fc' : isArmoredKnight ? '#94a3b8' : '#c8ad93';
  let fleshMid = isVoidEntity ? '#6b21a8' : isArmoredKnight ? '#64748b' : '#8d6e57';
  let fleshDark = isVoidEntity ? '#2e1065' : isArmoredKnight ? '#1e293b' : '#433022';

  let garbLight = '#6e5246';
  let garbMid = '#3d2c26';
  let garbDark = '#17100e';
  let trimCol = '#c9a227';
  let eyeColor = '#ff3b30';

  if (spriteKey === 'forsaken_nun') {
    fleshLight = '#dcc6b4';
    fleshMid = '#a48774';
    fleshDark = '#523d33';
    garbLight = '#4c323d';
    garbMid = '#2c1c23';
    garbDark = '#140c10';
    trimCol = '#c5a059';
    eyeColor = '#cbd5e1';
  } else if (isPriestOrNun) {
    garbLight = '#6d28d9';
    garbMid = '#3b0764';
    garbDark = '#170529';
    trimCol = '#facc15';
    eyeColor = '#fde047';
  } else if (isCrimsonInquisitor) {
    garbLight = '#b91c1c';
    garbMid = '#650911';
    garbDark = '#260306';
    trimCol = '#f59e0b';
    eyeColor = '#ff2a2a';
  } else if (isArmoredKnight) {
    garbLight = '#94a3b8';
    garbMid = '#475569';
    garbDark = '#1e293b';
    trimCol = '#c5a059';
    eyeColor = '#94a3b8';
  } else if (spriteKey === 'night_hunter') {
    garbLight = '#3c5641';
    garbMid = '#243528';
    garbDark = '#111a13';
    trimCol = '#78350f';
    eyeColor = '#e2e8f0';
  } else if (spriteKey === 'orc_berserker' || spriteKey === 'forge_goblin') {
    fleshLight = '#65a30d';
    fleshMid = '#3f6212';
    fleshDark = '#1a2e05';
    garbLight = '#7c2d12';
    garbMid = '#451a03';
    garbDark = '#1c0a02';
    trimCol = '#ca8a04';
    eyeColor = '#f97316';
  } else if (isVoidEntity) {
    garbLight = '#9333ea';
    garbMid = '#4c1d95';
    garbDark = '#1e1b4b';
    trimCol = '#e879f9';
    eyeColor = '#facc15';
  } else {
    garbLight = '#7c2d12';
    garbMid = '#451a03';
    garbDark = '#1c0a02';
    trimCol = '#d97706';
    eyeColor = '#ef4444';
  }

  if (flashWhite) {
    fleshLight = '#ffffff';
    fleshMid = '#fecaca';
    garbLight = '#fff1f2';
    garbMid = '#fda4af';
  } else if (isOilCovered) {
    garbLight = '#3b1d5e';
    garbMid = '#1b0b2e';
    garbDark = '#09040f';
  }

  ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
  ctx.lineWidth = Math.max(0.85, 1.05 * scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Ground shadow / blood pool beneath entity
  const shadowGrad = ctx.createRadialGradient(
    cx,
    destH * 0.91,
    destW * 0.05,
    cx,
    destH * 0.91,
    destW * 0.42
  );
  shadowGrad.addColorStop(0, isTelegraphing ? 'rgba(220, 38, 38, 0.85)' : 'rgba(120, 15, 22, 0.72)');
  shadowGrad.addColorStop(0.6, 'rgba(18, 9, 14, 0.5)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, destH * 0.91, destW * 0.39, destH * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  // Telegraph Warning Aura Ring behind Boss/Enemy when charging lethal attack
  if (isTelegraphing) {
    const teleGrad = ctx.createRadialGradient(cx, cy, 10 * scale, cx, cy, destW * 0.48);
    teleGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    teleGrad.addColorStop(0.55, 'rgba(220, 38, 38, 0.28)');
    teleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = teleGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, destW * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // DEDICATED ANATOMY FOR 6 CANON NPCS & CHILD 13 (DISTINCT HEIGHTS & POSTURES)
  // =========================================================================
  if (spriteKey === 'npc_smith') {
    // 1. Kẻ Đúc Kiếm Không Đầu (Tầng 1): Hulking headless giant, charred apron, 4 massive arms + Iron Anvil
    // 1. Anvil in foreground base
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.fillRect(cx - 24 * scale, destH * 0.72, 48 * scale, 16 * scale);
    ctx.strokeRect(cx - 24 * scale, destH * 0.72, 48 * scale, 16 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 32 * scale, destH * 0.66);
    ctx.lineTo(cx + 32 * scale, destH * 0.66);
    ctx.lineTo(cx + 22 * scale, destH * 0.73);
    ctx.lineTo(cx - 22 * scale, destH * 0.73);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. 4 Massive Arms (drawn BEFORE torso so torso covers shoulder seams)
    ctx.strokeStyle = '#6b4c3b';
    ctx.lineWidth = 9 * scale;
    // Lower arms gripping anvil
    ctx.beginPath();
    ctx.moveTo(cx - 28 * scale, destH * 0.48);
    ctx.lineTo(cx - 22 * scale, destH * 0.66);
    ctx.moveTo(cx + 28 * scale, destH * 0.48);
    ctx.lineTo(cx + 22 * scale, destH * 0.66);
    // Upper arms raised with Sledgehammer & Tongs
    ctx.moveTo(cx - 28 * scale, destH * 0.34);
    ctx.lineTo(cx - 40 * scale, destH * 0.20 + leftArmBobY);
    ctx.moveTo(cx + 28 * scale, destH * 0.34);
    ctx.lineTo(cx + 40 * scale, destH * 0.20 + rightArmBobY);
    ctx.stroke();

    // 3. Hulking Torso & Charred Leather Apron with molten iron droplets
    ctx.fillStyle = '#5c4033';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.beginPath();
    ctx.ellipse(cx, destH * 0.46 + torsoBreathY, 34 * scale, 26 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#29150c';
    ctx.fillRect(cx - 24 * scale, destH * 0.34 + torsoBreathY, 48 * scale, 34 * scale);
    ctx.strokeRect(cx - 24 * scale, destH * 0.34 + torsoBreathY, 48 * scale, 34 * scale);

    // Molten iron droplets on apron
    ctx.fillStyle = '#f97316';
    for (const [mx, my] of [[-12, 0.42], [10, 0.48], [-6, 0.56], [14, 0.58]]) {
      ctx.beginPath();
      ctx.arc(cx + mx * scale, destH * my + torsoBreathY, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Heavy Blacksmith Hammer in Upper Right Hand (handle -> hammer head -> gripping hand on top)
    ctx.strokeStyle = '#5c3a21';
    ctx.lineWidth = 3.4 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + 40 * scale, destH * 0.25 + rightArmBobY);
    ctx.lineTo(cx + 40 * scale, destH * 0.14 + rightArmBobY);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.fillRect(cx + 30 * scale, destH * 0.08 + rightArmBobY, 20 * scale, 11 * scale);
    ctx.strokeRect(cx + 30 * scale, destH * 0.08 + rightArmBobY, 20 * scale, 11 * scale);
    drawGrippingHand(ctx, cx + 40 * scale, destH * 0.20 + rightArmBobY, scale, '#6b4c3b', 0.15);

    // 5. Flat Scarred Neck Stump (NO HEAD)
    ctx.fillStyle = '#3b1c1a';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.beginPath();
    ctx.ellipse(cx, destH * 0.23 + torsoBreathY, 13 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_glass_lady') {
    // 2. Quý Cô Trong Lồng Kính (Tầng 1): Suspended cylindrical glass & rusted iron cage with pale bride inside
    // Suspension chain from ceiling
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, destH * 0.12);
    ctx.stroke();

    // Pale Face with purple spiderweb veins & dark unblinking eyes (drawn BEFORE gown so neckline covers throat seam)
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.6 * scale;
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(cx, destH * 0.26 + headBobY * 0.5, 10 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Purple veins on neck/cheeks
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 1.1 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 4 * scale, destH * 0.34);
    ctx.lineTo(cx - 6 * scale, destH * 0.27);
    ctx.moveTo(cx + 4 * scale, destH * 0.34);
    ctx.lineTo(cx + 6 * scale, destH * 0.27);
    ctx.stroke();
    // Large dark unblinking eyes
    ctx.fillStyle = '#09050a';
    ctx.beginPath();
    ctx.arc(cx - 3.8 * scale, destH * 0.25, 2.2 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 3.8 * scale, destH * 0.25, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Pale Maiden in tattered ivory wedding gown inside cage
    ctx.fillStyle = '#d6d3c4';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 12 * scale, destH * 0.36);
    ctx.lineTo(cx + 12 * scale, destH * 0.36);
    ctx.lineTo(cx + 18 * scale, destH * 0.80);
    ctx.lineTo(cx - 18 * scale, destH * 0.80);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Translucent Fogged Glass Cylinder & Rusted Iron Cage Frame
    ctx.fillStyle = 'rgba(203, 213, 225, 0.22)';
    ctx.fillRect(cx - 24 * scale, destH * 0.14, 48 * scale, destH * 0.70);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.6 * scale;
    ctx.strokeRect(cx - 24 * scale, destH * 0.14, 48 * scale, destH * 0.70);
    for (const bx of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.moveTo(cx + bx * scale, destH * 0.14);
      ctx.lineTo(cx + bx * scale, destH * 0.84);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_priest') {
    // 3. Giáo Sĩ Mù (Tầng 2): Hunched, low-crouching emaciated old man (much shorter than Knight), hollow eye sockets, bone necklace, bell staff
    const py = destH * 0.22; // Shifted down for low hunched posture
    // Wax-crusted grey robe hunched over
    ctx.fillStyle = '#4b5563';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 22 * scale, py + destH * 0.66);
    ctx.quadraticCurveTo(cx - 26 * scale, py + destH * 0.26, cx, py + destH * 0.20 + torsoBreathY);
    ctx.quadraticCurveTo(cx + 24 * scale, py + destH * 0.26, cx + 20 * scale, py + destH * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Finger-bone & wax necklace
    ctx.fillStyle = '#fef3c7';
    for (let b = -3; b <= 3; b++) {
      ctx.fillRect(cx + b * 4 * scale - 1.5 * scale, py + destH * 0.33, 3 * scale, 5 * scale);
    }

    // Emaciated Head with 2 Hollow Black Eye Sockets & deep cheek scars
    ctx.fillStyle = '#d6c7b2';
    ctx.beginPath();
    ctx.arc(cx - 3 * scale, py + destH * 0.24 + headBobY, 11 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#050406';
    ctx.beginPath();
    ctx.arc(cx - 7 * scale, py + destH * 0.23 + headBobY, 2.8 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 1 * scale, py + destH * 0.23 + headBobY, 2.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    // Cheek scars from eye sockets
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 7 * scale, py + destH * 0.25 + headBobY);
    ctx.lineTo(cx - 7 * scale, py + destH * 0.31 + headBobY);
    ctx.moveTo(cx + 1 * scale, py + destH * 0.25 + headBobY);
    ctx.lineTo(cx + 1 * scale, py + destH * 0.31 + headBobY);
    ctx.stroke();

    // Forearm -> Wooden Staff with Rusted Bronze Bells -> Gripping Hand on top
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + 10 * scale, py + destH * 0.36);
    ctx.lineTo(cx + 19.5 * scale, py + destH * 0.44);
    ctx.stroke();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + 18 * scale, py + destH * 0.66);
    ctx.lineTo(cx + 22 * scale, py + destH * 0.08);
    ctx.stroke();
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.arc(cx + 26 * scale, py + destH * 0.14, 4.5 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 18 * scale, py + destH * 0.18, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    drawGrippingHand(ctx, cx + 19.5 * scale, py + destH * 0.44, scale, '#d6c7b2', 0.1);
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_child_12' || spriteKey === 'child_13') {
    // 4. Thánh Tử Thứ 12 & Thánh Tử Thứ 13: Small 8–12 year old child anatomy (much shorter & smaller than adult classes!)
    const isChild12 = spriteKey === 'npc_child_12';
    if (isChild12) {
      // Vertical Iron Extraction Frame behind Child 12
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4 * scale;
      ctx.strokeRect(cx - 20 * scale, destH * 0.22, 40 * scale, destH * 0.64);
      // Brass & Gold Extraction Tubes plugged into spine draining yellow & black fluid
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.6 * scale;
      for (const ty of [0.46, 0.54, 0.62]) {
        ctx.beginPath();
        ctx.moveTo(cx - 26 * scale, destH * (ty + 0.12));
        ctx.quadraticCurveTo(cx - 12 * scale, destH * ty, cx, destH * ty);
        ctx.lineTo(cx + 26 * scale, destH * (ty + 0.12));
        ctx.stroke();
      }
    }

    // Bare thin child legs
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 4 * scale, destH * 0.78);
    ctx.lineTo(cx - 5 * scale, destH * 0.89);
    ctx.moveTo(cx + 4 * scale, destH * 0.78);
    ctx.lineTo(cx + 5 * scale, destH * 0.89);
    ctx.stroke();

    // Small Child Head with bleached white hair (drawn BEFORE rags torso)
    const childTopY = destH * 0.44 + torsoBreathY * 0.6;
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, childTopY, 8.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Dark hollow eyes
    ctx.fillStyle = '#09050a';
    ctx.beginPath();
    ctx.arc(cx - 3 * scale, childTopY, 1.8 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 3 * scale, childTopY, 1.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Small Child Body (occupies lower-center, ~55% of adult height)
    ctx.fillStyle = '#cbd5e1'; // Tattered prisoner rags
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 9 * scale, childTopY + 10 * scale);
    ctx.lineTo(cx + 9 * scale, childTopY + 10 * scale);
    ctx.lineTo(cx + 11 * scale, destH * 0.78);
    ctx.lineTo(cx - 11 * scale, destH * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing golden seed hands for Child 13
    if (!isChild12) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.beginPath();
      ctx.arc(cx - 11 * scale, childTopY + 20 * scale, 3.5 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 11 * scale, childTopY + 20 * scale, 3.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_broken_knight') {
    // 5. Kỵ Sĩ Gãy Chân (Tầng 2): Slumped sitting helmetless knight, both legs crushed & bandaged in front, broken shield & shortblade
    const sitY = destH * 0.36;
    // Crushed bandaged legs stretched forward on the ground
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.fillRect(cx - 18 * scale, destH * 0.74, 36 * scale, 12 * scale);
    ctx.strokeRect(cx - 18 * scale, destH * 0.74, 36 * scale, 12 * scale);
    // Blood-soaked bandages on crushed legs
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(cx - 12 * scale, destH * 0.73, 24 * scale, 10 * scale);

    // Helmetless Scarred Face with matted beard (drawn BEFORE breastplate)
    ctx.fillStyle = '#d6b89c';
    ctx.beginPath();
    ctx.arc(cx, sitY + destH * 0.08 + headBobY * 0.5, 10.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#27272a'; // Beard
    ctx.fillRect(cx - 8 * scale, sitY + destH * 0.11, 16 * scale, 6 * scale);

    // Slumped Dented Breastplate
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(cx, sitY + destH * 0.26 + torsoBreathY, 20 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Forearm -> Rusted Shortblade propped in right hand -> Gripping Gauntlet on top
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 5.5 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + 14 * scale, sitY + destH * 0.24);
    ctx.lineTo(cx + 21 * scale, destH * 0.66);
    ctx.stroke();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + 20 * scale, destH * 0.63);
    ctx.lineTo(cx + 28 * scale, destH * 0.88);
    ctx.stroke();
    drawGrippingHand(ctx, cx + 21 * scale, destH * 0.66, scale, '#475569', 0.2);
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_physician') {
    // 6. Lão Thần Y Điên (Tầng 3): Sitting in crude iron-and-wood wheelchair, lower body & left arm petrified into grey limestone, cracked monocle
    // Wheelchair Wheels
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.5 * scale;
    ctx.beginPath();
    ctx.arc(cx - 20 * scale, destH * 0.72, 15 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 20 * scale, destH * 0.72, 15 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Petrified Grey Limestone Lower Body & Left Arm fused to chair
    ctx.fillStyle = '#78716c';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2 * scale;
    ctx.fillRect(cx - 16 * scale, destH * 0.54, 32 * scale, 24 * scale);
    ctx.strokeRect(cx - 16 * scale, destH * 0.54, 32 * scale, 24 * scale);

    // Wild White Hair/Beard & Cracked Monocle (drawn BEFORE torso collar)
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, destH * 0.24 + headBobY * 0.5, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#38bdf8'; // Monocle on right eye
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.arc(cx + 4 * scale, destH * 0.23 + headBobY * 0.5, 3.8 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Scholar Torso & Right Arm holding glowing Elixir Vial
    ctx.fillStyle = '#3b0764';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2 * scale;
    ctx.fillRect(cx - 14 * scale, destH * 0.34 + torsoBreathY, 28 * scale, 22 * scale);
    ctx.strokeRect(cx - 14 * scale, destH * 0.34 + torsoBreathY, 28 * scale, 22 * scale);

    // Glowing Green Elixir in right hand
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cx + 22 * scale, destH * 0.42 + rightArmBobY, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_chronicler') {
    // 8. Kẻ Chép Sử Hóa Thạch (Tầng 3 – Vực Sao): Hunched ancient scribe 80% petrified into runic limestone, holding glowing purple reconstruction scroll
    // Hunched hooded scholar head (cracked stone — drawn BEFORE stone robe collar)
    ctx.fillStyle = '#78716c';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.beginPath();
    ctx.arc(cx - 2 * scale, destH * 0.27 + headBobY * 0.3, 11.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing violet rune eyes
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(cx - 5 * scale, destH * 0.27 + headBobY * 0.3, 2 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 2 * scale, destH * 0.27 + headBobY * 0.3, 2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Petrified stone robe base fused to floor
    ctx.fillStyle = '#57534e';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 22 * scale, destH * 0.88);
    ctx.lineTo(cx - 16 * scale, destH * 0.36 + torsoBreathY * 0.3);
    ctx.lineTo(cx + 16 * scale, destH * 0.36 + torsoBreathY * 0.3);
    ctx.lineTo(cx + 24 * scale, destH * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Unfurling Reconstruction Scroll in hands
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(cx - 12 * scale, destH * 0.46, 24 * scale, 16 * scale);
    ctx.strokeRect(cx - 12 * scale, destH * 0.46, 24 * scale, 16 * scale);
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.arc(cx, destH * 0.54, 4.5 * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (spriteKey === 'npc_smuggler') {
    // 9. Tên Buôn Lậu (Tầng 2): Hooded greatcoat, iron half-mask, brass coin pouch, glowing amber storm lantern
    // Back dark greatcoat hem
    ctx.fillStyle = '#1e1b24';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 21 * scale, destH * 0.31);
    ctx.lineTo(cx - 26 * scale, destH * 0.85);
    ctx.lineTo(cx + 26 * scale, destH * 0.85);
    ctx.lineTo(cx + 21 * scale, destH * 0.31);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Boots
    ctx.fillStyle = '#291a12';
    ctx.fillRect(cx - 14 * scale, destH * 0.80, 9 * scale, destH * 0.10);
    ctx.fillRect(cx + 5 * scale, destH * 0.80, 9 * scale, destH * 0.10);
    ctx.strokeRect(cx - 14 * scale, destH * 0.80, 9 * scale, destH * 0.10);
    ctx.strokeRect(cx + 5 * scale, destH * 0.80, 9 * scale, destH * 0.10);

    // 2. Left Arm (drawn BEFORE coat torso so torso hides shoulder seam)
    const lanX = cx - 26 * scale + leftArmSwayX;
    const lanY = destH * 0.56 + leftArmBobY;
    ctx.strokeStyle = '#2b2530';
    ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 15 * scale, destH * 0.36 + torsoBreathY);
    ctx.lineTo(lanX, lanY - 4 * scale);
    ctx.stroke();

    // 3. Hood & Iron Half-Mask Head (drawn BEFORE coat torso so collar neatly covers hood hem)
    ctx.save();
    ctx.translate(headSwayX, headBobY * 0.7);
    ctx.fillStyle = '#27232d';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.beginPath();
    ctx.moveTo(cx, destH * 0.06);
    ctx.bezierCurveTo(cx + 19 * scale, destH * 0.10, cx + 20 * scale, destH * 0.28, cx + 15 * scale, destH * 0.34);
    ctx.lineTo(cx - 15 * scale, destH * 0.34);
    ctx.bezierCurveTo(cx - 20 * scale, destH * 0.28, cx - 19 * scale, destH * 0.10, cx, destH * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pale upper face & sharp eyes
    ctx.fillStyle = '#cbb9a6';
    ctx.beginPath();
    ctx.ellipse(cx, destH * 0.21, 9.5 * scale, 10.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#070509';
    ctx.fillRect(cx - 6 * scale, destH * 0.175, 4 * scale, 2.5 * scale);
    ctx.fillRect(cx + 2 * scale, destH * 0.175, 4 * scale, 2.5 * scale);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 4.8 * scale, destH * 0.18, 1.8 * scale, 1.8 * scale);
    ctx.fillRect(cx + 3.2 * scale, destH * 0.18, 1.8 * scale, 1.8 * scale);

    // Iron Half-Mask covering lower face
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(cx - 9.5 * scale, destH * 0.22);
    ctx.lineTo(cx + 9.5 * scale, destH * 0.22);
    ctx.lineTo(cx + 6.5 * scale, destH * 0.31);
    ctx.lineTo(cx, destH * 0.33);
    ctx.lineTo(cx - 6.5 * scale, destH * 0.31);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. Coat Torso & Leather Cross-Belt
    ctx.fillStyle = '#332d3b';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.fillRect(cx - 16 * scale, destH * 0.32 + torsoBreathY, 32 * scale, 36 * scale);
    ctx.strokeRect(cx - 16 * scale, destH * 0.32 + torsoBreathY, 32 * scale, 36 * scale);
    ctx.fillStyle = '#452815';
    ctx.fillRect(cx - 16 * scale, destH * 0.54 + torsoBreathY, 32 * scale, 5 * scale);

    // Brass Coin Pouch hanging on hip
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(cx + 13 * scale, destH * 0.61 + torsoBreathY, 5.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx + 11 * scale, destH * 0.57 + torsoBreathY, 4 * scale, 2 * scale);

    // 5. Glowing Storm Lantern -> Gloved Hand on top of bail
    const lanGlow = ctx.createRadialGradient(lanX, lanY + 4 * scale, 1 * scale, lanX, lanY + 4 * scale, 16 * scale);
    lanGlow.addColorStop(0, 'rgba(251, 191, 36, 0.72)');
    lanGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lanGlow;
    ctx.beginPath();
    ctx.arc(lanX, lanY + 4 * scale, 16 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.arc(lanX, lanY - 1 * scale, 3 * scale, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.fillRect(lanX - 4 * scale, lanY, 8 * scale, 10 * scale);
    ctx.strokeRect(lanX - 4 * scale, lanY, 8 * scale, 10 * scale);
    drawGrippingHand(ctx, lanX, lanY - 4 * scale, scale, '#3f3847', -0.18);

    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 3 MINIBOSS 1: KẺ GÁC ĐỀN HÓA THẠCH (`astral_kraken` — 70% Grey Limestone + 30% Bleeding Red Flesh)
  // =========================================================================
  if (spriteKey === 'astral_kraken') {
    // 1. tentacle_4: Chân trụ đá hóa thạch bám rễ xuống sàn (nx: 0.52, ny: 0.78)
    withLimbHighlight('tentacle_4', () => {
      if (!severedLimbs.has('tentacle_4')) {
        ctx.fillStyle = '#57534e';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx - 26 * scale, destH * 0.58);
        ctx.lineTo(cx + 28 * scale, destH * 0.58);
        ctx.lineTo(cx + 36 * scale, destH * 0.90);
        ctx.lineTo(cx - 34 * scale, destH * 0.90);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#070509';
        ctx.fillRect(cx - 12 * scale, destH * 0.62, 16 * scale, 26 * scale);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.6 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 22 * scale, destH * 0.64);
        ctx.lineTo(cx - 16 * scale, destH * 0.86);
        ctx.moveTo(cx + 18 * scale, destH * 0.64);
        ctx.lineTo(cx + 24 * scale, destH * 0.86);
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx, destH * 0.76, 12 * scale);
      }
    });

    // 2. tentacle_2: Cánh tay trái hóa thạch (drawn BEFORE torso)
    withLimbHighlight('tentacle_2', () => {
      if (!severedLimbs.has('tentacle_2')) {
        ctx.fillStyle = '#78716c';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx - 42 * scale, destH * 0.34);
        ctx.lineTo(cx - 16 * scale, destH * 0.38);
        ctx.lineTo(cx - 12 * scale, destH * 0.56);
        ctx.lineTo(cx - 38 * scale, destH * 0.54);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx - 34 * scale, destH * 0.38);
        ctx.lineTo(cx - 22 * scale, destH * 0.46);
        ctx.lineTo(cx - 28 * scale, destH * 0.52);
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx - 28 * scale, destH * 0.44, 9 * scale);
      }
    });

    // 3. head: Đầu chiến binh cổ đại hóa đá (drawn BEFORE torso so chest armor frames neck)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        ctx.fillStyle = '#78716c';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.arc(cx, destH * 0.18 + headBobY * 0.4, 15 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#070509';
        ctx.fillRect(cx - 10 * scale, destH * 0.16 + headBobY * 0.4, 20 * scale, 5 * scale);
        ctx.fillStyle = isBlinded ? '#450a0a' : '#ef4444';
        ctx.beginPath();
        ctx.arc(cx + 5 * scale, destH * 0.18 + headBobY * 0.4, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawArterialStump(ctx, cx, destH * 0.18, 11 * scale);
      }
    });

    // 4. torso: Lồng ngực 70% đá vôi xám nứt nẻ, 30% thịt đỏ rỉ máu (nx: 0.50, ny: 0.46)
    withLimbHighlight('torso', () => {
      ctx.save();
      ctx.translate(0, torsoBreathY * 0.4);
      ctx.fillStyle = '#78716c';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.moveTo(cx - 30 * scale, destH * 0.28);
      ctx.lineTo(cx + 30 * scale, destH * 0.28);
      ctx.lineTo(cx + 24 * scale, destH * 0.62);
      ctx.lineTo(cx - 24 * scale, destH * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.moveTo(cx + 2 * scale, destH * 0.29);
      ctx.lineTo(cx + 28 * scale, destH * 0.29);
      ctx.lineTo(cx + 23 * scale, destH * 0.61);
      ctx.lineTo(cx - 4 * scale, destH * 0.61);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(cx - 12 * scale, destH * 0.36);
      ctx.lineTo(cx + 14 * scale, destH * 0.40);
      ctx.lineTo(cx + 8 * scale, destH * 0.56);
      ctx.lineTo(cx - 14 * scale, destH * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 5. tentacle_3: Tấm giáp vai đá & tentacle_1: Đại Kiếm Đá
    withLimbHighlight('tentacle_3', () => {
      if (!severedLimbs.has('tentacle_3')) {
        ctx.fillStyle = '#a8a29e';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx - 44 * scale, destH * 0.18);
        ctx.lineTo(cx - 14 * scale, destH * 0.20);
        ctx.lineTo(cx - 18 * scale, destH * 0.36);
        ctx.lineTo(cx - 46 * scale, destH * 0.34);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx - 28 * scale, destH * 0.26, 9 * scale);
      }
    });

    withLimbHighlight('tentacle_1', () => {
      if (!severedLimbs.has('tentacle_1')) {
        ctx.save();
        ctx.translate(0, rightArmBobY * 0.5);
        ctx.fillStyle = '#a8a29e';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx + 24 * scale, destH * 0.28);
        ctx.lineTo(cx + 46 * scale, destH * 0.14);
        ctx.lineTo(cx + 56 * scale, destH * 0.84);
        ctx.lineTo(cx + 32 * scale, destH * 0.88);
        ctx.lineTo(cx + 24 * scale, destH * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(cx + 26 * scale, destH * 0.32);
        ctx.lineTo(cx + 38 * scale, destH * 0.30);
        ctx.lineTo(cx + 42 * scale, destH * 0.82);
        ctx.lineTo(cx + 32 * scale, destH * 0.86);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        drawArterialStump(ctx, cx + 30 * scale, destH * 0.42, 10 * scale);
      }
    });
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 3 MINIBOSS 2: THÍ NGHIỆM SỐ 09 – CÀNH CÂY THỊT (`ouroboros_serpent`)
  // =========================================================================
  if (spriteKey === 'ouroboros_serpent') {
    // 1. coiling_body: Rễ cây bằng xương trắng và gân máu
    withLimbHighlight('coiling_body', () => {
      if (!severedLimbs.has('coiling_body')) {
        for (const rx of [-32, -16, 0, 18, 34]) {
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 8 * scale;
          ctx.beginPath();
          ctx.moveTo(cx + rx * 0.3 * scale, destH * 0.58);
          ctx.quadraticCurveTo(cx + rx * scale, destH * 0.74, cx + rx * 1.3 * scale, destH * 0.90);
          ctx.stroke();
          ctx.strokeStyle = '#e7dcc8';
          ctx.lineWidth = 3 * scale;
          ctx.beginPath();
          ctx.moveTo(cx + rx * 0.3 * scale, destH * 0.60);
          ctx.quadraticCurveTo(cx + rx * 0.9 * scale, destH * 0.74, cx + rx * 1.2 * scale, destH * 0.88);
          ctx.stroke();
        }
      } else {
        drawArterialStump(ctx, cx - 18 * scale, destH * 0.74, 11 * scale);
      }
    });

    // 2. lashing_tail: Cành cây mọc bàn tay (drawn BEFORE torso so trunk covers branch origin)
    withLimbHighlight('lashing_tail', () => {
      if (!severedLimbs.has('lashing_tail')) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 4.5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 10 * scale, destH * 0.38);
        ctx.quadraticCurveTo(cx + 32 * scale, destH * 0.32, cx + 46 * scale, destH * 0.42 + rightArmBobY);
        ctx.stroke();
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1.8 * scale;
        for (const [hx, hy] of [[24, 0.34], [34, 0.38], [44, 0.42], [30, 0.46], [40, 0.30]]) {
          const px = cx + hx * scale;
          const py = destH * hy + rightArmBobY * 0.6;
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(px, py, 3.5 * scale, 0, Math.PI * 2);
          ctx.fill();
          for (let f = -2; f <= 2; f++) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + f * 2.2 * scale, py - 5.5 * scale);
            ctx.stroke();
          }
        }
      } else {
        drawArterialStump(ctx, cx + 24 * scale, destH * 0.38, 8 * scale);
      }
    });

    // 3. head: Các cành treo quả cầu tim (drawn BEFORE torso so trunk covers branch root)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        const pulse = 1 + Math.sin(animPhase * 2.2) * 0.12;
        for (const [bx, by] of [[-26, 0.16], [0, 0.10], [26, 0.16], [-14, 0.24], [14, 0.24]]) {
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 3.5 * scale;
          ctx.beginPath();
          ctx.moveTo(cx, destH * 0.28);
          ctx.lineTo(cx + bx * scale, destH * by + headBobY);
          ctx.stroke();

          ctx.fillStyle = '#991b1b';
          ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
          ctx.lineWidth = Math.max(0.85, 1.05 * scale);
          ctx.beginPath();
          ctx.arc(cx + bx * scale, destH * by + headBobY, 8 * scale * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        drawArterialStump(ctx, cx, destH * 0.22, 11 * scale);
      }
    });

    // 4. torso: Lồng ngực banh rộng mọc lên thân cây thịt trắng bệch
    withLimbHighlight('torso', () => {
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.moveTo(cx - 18 * scale, destH * 0.64);
      ctx.quadraticCurveTo(cx - 12 * scale, destH * 0.44, cx - 14 * scale, destH * 0.24);
      ctx.lineTo(cx + 14 * scale, destH * 0.24);
      ctx.quadraticCurveTo(cx + 12 * scale, destH * 0.44, cx + 18 * scale, destH * 0.64);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      for (const dir of [-1, 1]) {
        for (let r = 0; r < 3; r++) {
          const ry = destH * (0.44 + r * 0.06);
          ctx.beginPath();
          ctx.moveTo(cx + dir * 6 * scale, ry);
          ctx.quadraticCurveTo(cx + dir * 26 * scale, ry - 6 * scale, cx + dir * 30 * scale, ry + 4 * scale);
          ctx.stroke();
        }
      }
    });
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 3 NORMAL VIPER: MÃNG XÀ KHÔNG GIAN (`dimensional_viper`)
  // =========================================================================
  if (spriteKey === 'dimensional_viper') {
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 14 * scale;
        ctx.beginPath();
        ctx.moveTo(cx, destH * 0.64);
        ctx.bezierCurveTo(cx - 26 * scale, destH * 0.54, cx - 44 * scale, destH * 0.62, cx - 32 * scale, destH * 0.78);
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx - 22 * scale, destH * 0.66, 9 * scale);
      }
    });

    withLimbHighlight('legs', () => {
      if (!severedLimbs.has('legs')) {
        ctx.strokeStyle = '#581c87';
        ctx.lineWidth = 12 * scale;
        ctx.beginPath();
        ctx.moveTo(cx, destH * 0.64);
        ctx.bezierCurveTo(cx + 22 * scale, destH * 0.58, cx + 42 * scale, destH * 0.64, cx + 34 * scale, destH * 0.80);
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx + 22 * scale, destH * 0.70, 9 * scale);
      }
    });

    // Head drawn BEFORE torso neck
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        ctx.fillStyle = '#3b0764';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.ellipse(cx, destH * 0.20 + headBobY, 18 * scale, 12 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx - 6 * scale, destH * 0.18 + headBobY, 2.5 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 6 * scale, destH * 0.18 + headBobY, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawArterialStump(ctx, cx, destH * 0.24, 9 * scale);
      }
    });

    withLimbHighlight('torso', () => {
      ctx.strokeStyle = '#7e22ce';
      ctx.lineWidth = 11 * scale;
      ctx.beginPath();
      ctx.moveTo(cx, destH * 0.66);
      ctx.quadraticCurveTo(cx - 10 * scale, destH * 0.42, cx, destH * 0.23 + headBobY);
      ctx.stroke();
    });
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 3 BOSS: SỨ GIẢ CỦA VẾT RÁCH / HỖN MANG THÚ (`void_chimera`)
  // =========================================================================
  if (spriteKey === 'void_chimera') {
    const drawVoidStump = (bx: number, by: number, rad: number) => {
      ctx.save();
      ctx.fillStyle = '#180522';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.arc(bx, by, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawArterialStump(ctx, bx, by, rad * 0.85);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.4 * scale;
      for (let i = 0; i < 4; i++) {
        const a = i * 1.55 + 0.4;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(a) * rad * 0.4, by + Math.sin(a) * rad * 0.4);
        ctx.lineTo(bx + Math.cos(a) * rad * 1.4, by + Math.sin(a) * rad * 1.4);
        ctx.stroke();
      }
      ctx.restore();
    };

    const chimeraLegsSevered = severedLimbs.has('legs');
    withLimbHighlight('legs', () => {
      if (!chimeraLegsSevered) {
        const mistGrad = ctx.createLinearGradient(cx, destH * 0.54, cx, destH * 0.95);
        mistGrad.addColorStop(0, '#1e1038');
        mistGrad.addColorStop(0.45, 'rgba(88, 28, 135, 0.84)');
        mistGrad.addColorStop(0.8, 'rgba(30, 12, 54, 0.48)');
        mistGrad.addColorStop(1, 'rgba(5, 3, 9, 0)');
        ctx.fillStyle = mistGrad;
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx - 30 * scale, destH * 0.56);
        ctx.lineTo(cx + 30 * scale, destH * 0.56);
        ctx.lineTo(cx + 48 * scale, destH * 0.94);
        ctx.lineTo(cx + 18 * scale, destH * 0.86);
        ctx.lineTo(cx, destH * 0.96);
        ctx.lineTo(cx - 18 * scale, destH * 0.86);
        ctx.lineTo(cx - 48 * scale, destH * 0.94);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        drawVoidStump(cx, destH * 0.82, 13 * scale);
      }
    });

    ctx.save();
    if (chimeraLegsSevered) {
      ctx.translate(cx, destH * 0.64 + 19 * scale);
      ctx.rotate(0.065);
      ctx.translate(-cx, -destH * 0.64);
    }

    const drawCrystalArm = (dir: -1 | 1, limbId: string) => {
      withLimbHighlight(limbId, () => {
        if (severedLimbs.has(limbId)) {
          drawVoidStump(cx + dir * 32 * scale, destH * 0.42, 10 * scale);
          return;
        }
        const armBob = dir < 0 ? leftArmBobY : rightArmBobY;
        const elbowX = cx + dir * 49 * scale;
        const elbowY = destH * 0.47 + armBob;
        const wristX = cx + dir * 39 * scale;
        const wristY = destH * 0.69 + armBob;
        ctx.strokeStyle = outlineDark;
        ctx.lineWidth = 8.4 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + dir * 31 * scale, destH * 0.34);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(wristX, wristY);
        ctx.stroke();
        ctx.strokeStyle = '#7e22ce';
        ctx.lineWidth = 5.4 * scale;
        ctx.stroke();
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 1.6 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + dir * 30 * scale, destH * 0.33);
        ctx.lineTo(elbowX - dir * 1.2 * scale, elbowY - 1 * scale);
        ctx.lineTo(wristX - dir * 1 * scale, wristY);
        ctx.stroke();

        for (let f = -1; f <= 2; f++) {
          const knX = wristX + dir * (4 + f * 3.8) * scale;
          const knY = wristY + 6.5 * scale;
          ctx.strokeStyle = outlineDark;
          ctx.lineWidth = 4.2 * scale;
          ctx.beginPath();
          ctx.moveTo(wristX, wristY);
          ctx.lineTo(knX, knY);
          ctx.lineTo(knX + dir * 8 * scale, knY - 12 * scale);
          ctx.stroke();
          ctx.strokeStyle = '#d8b4fe';
          ctx.lineWidth = 2.0 * scale;
          ctx.stroke();
        }
      });
    };

    // 2. Arms (drawn BEFORE torso)
    drawCrystalArm(-1, 'right_arm');
    drawCrystalArm(1, 'snake_tail_head');

    // 3. head (drawn BEFORE torso so mantle collar frames neck)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        const hy = destH * 0.17 + headBobY;
        const voidHeadGrad = ctx.createRadialGradient(cx, hy, 2 * scale, cx, hy, 16 * scale);
        voidHeadGrad.addColorStop(0, '#020105');
        voidHeadGrad.addColorStop(0.7, '#1a0833');
        voidHeadGrad.addColorStop(1, '#a855f7');
        ctx.fillStyle = voidHeadGrad;
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.arc(cx, hy, 14.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.arc(cx, hy, 14.5 * scale, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();

        if (isBlinded) {
          drawBlindedEyeSlash(ctx, cx, hy, 11 * scale, scale);
        }

        for (let m = 0; m < 8; m++) {
          const ang = -animPhase * 1.05 + (m * Math.PI * 2) / 8;
          const mx = cx + Math.cos(ang) * 28 * scale;
          const my = hy + Math.sin(ang) * 10 * scale;
          ctx.fillStyle = '#181026';
          ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
          ctx.lineWidth = Math.max(0.85, 1.05 * scale);
          ctx.beginPath();
          ctx.moveTo(mx - 4.5 * scale, my - 2.2 * scale);
          ctx.lineTo(mx + 1.2 * scale, my - 5.5 * scale);
          ctx.lineTo(mx + 5.2 * scale, my + 2.2 * scale);
          ctx.lineTo(mx - 2.2 * scale, my + 4.4 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#d8b4fe';
          ctx.lineWidth = 1 * scale;
          ctx.beginPath();
          ctx.moveTo(mx - 4 * scale, my - 2 * scale);
          ctx.lineTo(mx + 1 * scale, my - 5 * scale);
          ctx.stroke();
        }
      } else {
        drawVoidStump(cx, destH * 0.17, 11 * scale);
      }
    });

    // 4. torso: Mảnh vỡ bầu trời đêm 3 sắc độ với vết nứt tinh vân và mắt không mí
    withLimbHighlight('torso', () => {
      ctx.save();
      ctx.translate(0, torsoBreathY);
      const bodyGrad = ctx.createLinearGradient(cx - 34 * scale, destH * 0.24, cx + 34 * scale, destH * 0.68);
      bodyGrad.addColorStop(0, flashWhite ? '#e9d5ff' : '#2e1065');
      bodyGrad.addColorStop(0.42, flashWhite ? '#c084fc' : '#0f071f');
      bodyGrad.addColorStop(1, '#040208');
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.moveTo(cx, destH * 0.22);
      ctx.lineTo(cx + 36 * scale, destH * 0.34);
      ctx.lineTo(cx + 27 * scale, destH * 0.67);
      ctx.lineTo(cx - 27 * scale, destH * 0.67);
      ctx.lineTo(cx - 36 * scale, destH * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#d8b4fe';
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 35 * scale, destH * 0.35);
      ctx.lineTo(cx, destH * 0.22);
      ctx.lineTo(cx + 35 * scale, destH * 0.35);
      ctx.stroke();

      for (const dir of [-1, 1]) {
        const shGrad = ctx.createLinearGradient(cx + dir * 18 * scale, destH * 0.25, cx + dir * 42 * scale, destH * 0.44);
        shGrad.addColorStop(0, '#581c87');
        shGrad.addColorStop(0.5, '#1e1038');
        shGrad.addColorStop(1, '#07030d');
        ctx.fillStyle = shGrad;
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx + dir * 18 * scale, destH * 0.27);
        ctx.lineTo(cx + dir * 44 * scale, destH * 0.29);
        ctx.lineTo(cx + dir * 36 * scale, destH * 0.43);
        ctx.lineTo(cx + dir * 20 * scale, destH * 0.39);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 1.2 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + dir * 20 * scale, destH * 0.28);
        ctx.lineTo(cx + dir * 42 * scale, destH * 0.30);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(216, 180, 254, 0.58)';
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 16 * scale, destH * 0.36);
      ctx.lineTo(cx, destH * 0.47);
      ctx.lineTo(cx + 16 * scale, destH * 0.37);
      ctx.lineTo(cx + 12 * scale, destH * 0.57);
      ctx.lineTo(cx - 13 * scale, destH * 0.55);
      ctx.closePath();
      ctx.stroke();
      for (const [ex, ey] of [[-13, 0.38], [13, 0.38], [0, 0.47], [-11, 0.56], [11, 0.56]]) {
        ctx.fillStyle = '#050209';
        ctx.beginPath();
        ctx.ellipse(cx + ex * scale, destH * ey, 5.4 * scale, 3.2 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isBlinded ? '#3b0a0a' : '#fde047';
        ctx.beginPath();
        ctx.ellipse(cx + ex * scale, destH * ey, 4.1 * scale, 2.2 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!isBlinded) {
          ctx.fillStyle = '#050505';
          ctx.beginPath();
          ctx.arc(cx + ex * scale, destH * ey, 1.4 * scale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawBlindedEyeSlash(ctx, cx + ex * scale, destH * ey, 5 * scale, scale * 0.7);
        }
      }
      ctx.restore();
    });
    ctx.restore();
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 1 BOSS: MA VƯƠNG VAELIS (`demon_lord_vaelis` — Colossal Black-Armored Corpse Pinned by Ancient Greatswords & Iron Chains on the Blood Throne)
  // =========================================================================
  if (spriteKey === 'demon_lord_vaelis') {
    const drawBlackBloodSplash = (bx: number, by: number, rad: number) => {
      ctx.save();
      ctx.fillStyle = '#09030c';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.arc(bx, by, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7 + 0.25;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(a) * rad * 0.55, by + Math.sin(a) * rad * 0.55);
        ctx.lineTo(bx + Math.cos(a) * rad * 1.65, by + Math.sin(a) * rad * 1.65);
        ctx.strokeStyle = i % 2 === 0 ? '#7f1d1d' : '#a855f7';
        ctx.lineWidth = 2.2 * scale;
        ctx.stroke();
      }
      ctx.restore();
    };

    // 1. Monumental Iron-Bone Blood Throne Backrest & Impaled Ancient Greatswords Fan
    const throneGrad = ctx.createLinearGradient(cx - 52 * scale, destH * 0.04, cx + 52 * scale, destH * 0.90);
    throneGrad.addColorStop(0, '#2a1c24');
    throneGrad.addColorStop(0.5, '#120b12');
    throneGrad.addColorStop(1, '#050307');
    ctx.fillStyle = throneGrad;
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 50 * scale, destH * 0.90);
    ctx.lineTo(cx - 44 * scale, destH * 0.14);
    ctx.lineTo(cx - 22 * scale, destH * 0.08);
    ctx.lineTo(cx, destH * 0.02);
    ctx.lineTo(cx + 22 * scale, destH * 0.08);
    ctx.lineTo(cx + 44 * scale, destH * 0.14);
    ctx.lineTo(cx + 50 * scale, destH * 0.90);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Warm torch rim light along Blood Throne top crown
    ctx.strokeStyle = rimLightCol;
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 43 * scale, destH * 0.15);
    ctx.lineTo(cx, destH * 0.025);
    ctx.lineTo(cx + 43 * scale, destH * 0.15);
    ctx.stroke();

    // Ancient greatswords impaling/fanning out behind the throne & shoulders
    const pinnedSwords: Array<[number, number, number, number]> = [
      [-46, 0.10, -14, 0.42],
      [46, 0.10, 14, 0.42],
      [-56, 0.26, -18, 0.50],
      [56, 0.26, 18, 0.50],
      [-34, 0.06, -10, 0.34],
      [34, 0.06, 10, 0.34],
    ];
    for (const [hx, hy, tx, ty] of pinnedSwords) {
      ctx.strokeStyle = outlineDark;
      ctx.lineWidth = 6.2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + hx * scale, destH * hy);
      ctx.lineTo(cx + tx * scale, destH * ty);
      ctx.stroke();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.2 * scale;
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.1 * scale;
      ctx.stroke();
      // Sword crossguard near outer hilt
      const gx = cx + (hx * 0.84 + tx * 0.16) * scale;
      const gy = destH * (hy * 0.84 + ty * 0.16);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(gx - 6 * scale, gy - 4 * scale);
      ctx.lineTo(gx + 6 * scale, gy + 4 * scale);
      ctx.stroke();
    }

    // Throne bone skulls with recessed dark eye sockets
    for (const [skX, skY] of [[-30, 0.17], [30, 0.17], [-36, 0.31], [36, 0.31], [0, 0.09]]) {
      ctx.fillStyle = '#c4bab0';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.arc(cx + skX * scale, destH * skY, 5.2 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#050505';
      ctx.fillRect(cx + (skX - 2.3) * scale, destH * skY - 1 * scale, 1.6 * scale, 1.6 * scale);
      ctx.fillRect(cx + (skX + 0.9) * scale, destH * skY - 1 * scale, 1.6 * scale, 1.6 * scale);
    }

    // 2. void_tendrils: Xúc Tu Hư Vô Đen quằn quại dưới bệ ngai (nx: 0.50, ny: 0.79)
    const vaelisTendrilsSevered = severedLimbs.has('void_tendrils');
    withLimbHighlight('void_tendrils', () => {
      if (!vaelisTendrilsSevered) {
        for (let t = -3; t <= 3; t++) {
          const sway = Math.sin(animPhase * 1.4 + t) * 5.2 * scale;
          ctx.strokeStyle = outlineDark;
          ctx.lineWidth = 7.6 * scale;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx + t * 8 * scale, destH * 0.68);
          ctx.quadraticCurveTo(cx + t * 14 * scale + sway, destH * 0.82, cx + t * 16 * scale - sway, destH * 0.94);
          ctx.stroke();
          ctx.strokeStyle = t % 2 === 0 ? '#312e81' : '#6b21a8';
          ctx.lineWidth = 4.2 * scale;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(216, 180, 254, 0.55)';
          ctx.lineWidth = 1.2 * scale;
          ctx.stroke();
        }
      } else {
        drawArmoredSeveredStump(ctx, cx, destH * 0.80, 12 * scale, scale);
      }
    });

    // 3. Motionless Seated Legs & Cracked Blackened Steel Greaves
    for (const dir of [-1, 1]) {
      const gx = cx + (dir * 17 - 9) * scale;
      if (vaelisTendrilsSevered) {
        drawArmoredSeveredStump(ctx, gx + 9 * scale, destH * 0.69, 9.5 * scale, scale);
        continue;
      }
      const gGrad = ctx.createLinearGradient(gx, destH * 0.58, gx + 18 * scale, destH * 0.84);
      gGrad.addColorStop(0, '#475569');
      gGrad.addColorStop(0.45, '#1e293b');
      gGrad.addColorStop(1, '#090d14');
      ctx.fillStyle = gGrad;
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.fillRect(gx, destH * 0.58, 18 * scale, 28 * scale);
      ctx.strokeRect(gx, destH * 0.58, 18 * scale, 28 * scale);
      ctx.strokeStyle = rimLightCol;
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.moveTo(gx + 2 * scale, destH * 0.60);
      ctx.lineTo(gx + 16 * scale, destH * 0.60);
      ctx.stroke();
    }

    ctx.save();
    if (vaelisTendrilsSevered) {
      ctx.translate(cx, destH * 0.60 + 11 * scale);
      ctx.rotate(0.055);
      ctx.translate(-cx, -destH * 0.60);
    }

    // 4a. void_conduit & Arms drawn BEFORE head & torso
    withLimbHighlight('void_conduit', () => {
      if (!severedLimbs.has('void_conduit')) {
        const pulse = 0.65 + 0.35 * Math.sin(animPhase * 2);
        for (const ox of [-11, 0, 11]) {
          ctx.strokeStyle = outlineDark;
          ctx.lineWidth = 6.2 * scale;
          ctx.beginPath();
          ctx.moveTo(cx + ox * 1.6 * scale, destH * 0.04);
          ctx.quadraticCurveTo(cx + ox * scale, destH * 0.14, cx + ox * 0.5 * scale, destH * 0.24);
          ctx.stroke();
          ctx.strokeStyle = `rgba(220, 38, 38, ${pulse})`;
          ctx.lineWidth = 3.2 * scale;
          ctx.stroke();
        }
      } else {
        drawBlackBloodSplash(cx, destH * 0.09, 10 * scale);
      }
    });

    withLimbHighlight('throne_claw_left', () => {
      if (!severedLimbs.has('throne_claw_left')) {
        const clawGrad = ctx.createLinearGradient(cx - 56 * scale, destH * 0.34, cx - 22 * scale, destH * 0.62);
        clawGrad.addColorStop(0, '#64748b');
        clawGrad.addColorStop(0.5, '#334155');
        clawGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = clawGrad;
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx - 28 * scale, destH * 0.33);
        ctx.lineTo(cx - 53 * scale, destH * 0.45);
        ctx.lineTo(cx - 46 * scale, destH * 0.62);
        ctx.lineTo(cx - 24 * scale, destH * 0.52);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = rimLightCol;
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 28 * scale, destH * 0.33);
        ctx.lineTo(cx - 52 * scale, destH * 0.45);
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        for (const cyOff of [0.42, 0.48, 0.54]) {
          ctx.beginPath();
          ctx.moveTo(cx - 47 * scale, destH * cyOff);
          ctx.lineTo(cx - 63 * scale, destH * (cyOff + 0.05));
          ctx.lineTo(cx - 46 * scale, destH * (cyOff + 0.04));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    });

    withLimbHighlight('throne_ensor_right', () => {
      if (!severedLimbs.has('throne_ensor_right')) {
        ctx.strokeStyle = outlineDark;
        ctx.lineWidth = 9.5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 28 * scale, destH * 0.34);
        ctx.lineTo(cx + 48 * scale, destH * 0.44);
        ctx.stroke();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 6 * scale;
        ctx.stroke();
        ctx.strokeStyle = rimLightCol;
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 28 * scale, destH * 0.32);
        ctx.lineTo(cx + 48 * scale, destH * 0.42);
        ctx.stroke();
      }
    });

    // 4b. head: Đầu Vua Xương Đội Mũ Giáp Nứt (drawn BEFORE torso so armor collar frames neck)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        const hy = destH * 0.205;
        const helmGrad = ctx.createLinearGradient(cx - 14 * scale, hy - 14 * scale, cx + 14 * scale, hy + 14 * scale);
        helmGrad.addColorStop(0, '#64748b');
        helmGrad.addColorStop(0.5, '#1e293b');
        helmGrad.addColorStop(1, '#090d14');
        ctx.fillStyle = helmGrad;
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.arc(cx, hy, 14 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d6d3d1';
        ctx.beginPath();
        ctx.arc(cx + 4 * scale, hy + 3 * scale, 7 * scale, -0.4, Math.PI * 0.65);
        ctx.lineTo(cx, hy + 3 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#050505';
        ctx.fillRect(cx - 10 * scale, hy - 3.5 * scale, 20 * scale, 5 * scale);

        if (!isBlinded) {
          const eyeGlow = ctx.createRadialGradient(cx, hy - 1 * scale, 1 * scale, cx, hy - 1 * scale, 12 * scale);
          eyeGlow.addColorStop(0, 'rgba(239, 68, 68, 0.72)');
          eyeGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = eyeGlow;
          ctx.beginPath();
          ctx.arc(cx, hy - 1 * scale, 12 * scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ff2e2e';
          ctx.beginPath();
          ctx.ellipse(cx - 4.8 * scale, hy - 1 * scale, 3 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
          ctx.ellipse(cx + 4.8 * scale, hy - 1 * scale, 3 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawBlindedEyeSlash(ctx, cx, hy - 1 * scale, 11 * scale, scale);
        }

        ctx.strokeStyle = outlineDark;
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 12 * scale, hy - 8 * scale);
        ctx.lineTo(cx - 22 * scale, hy - 25 * scale);
        ctx.moveTo(cx + 12 * scale, hy - 8 * scale);
        ctx.lineTo(cx + 22 * scale, hy - 25 * scale);
        ctx.stroke();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.6 * scale;
        ctx.stroke();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.1 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 11 * scale, hy - 9 * scale);
        ctx.lineTo(cx - 21 * scale, hy - 24 * scale);
        ctx.moveTo(cx + 11 * scale, hy - 9 * scale);
        ctx.lineTo(cx + 21 * scale, hy - 24 * scale);
        ctx.stroke();
      } else {
        drawArmoredSeveredStump(ctx, cx, destH * 0.21, 11 * scale, scale);
      }
    });

    // 4c. torso: Thân Thể Tử Thi Giáp Đen Nứt Toác + Xích Sắt
    withLimbHighlight('torso', () => {
      const armorGrad = ctx.createLinearGradient(cx - 32 * scale, destH * 0.26, cx + 32 * scale, destH * 0.62);
      armorGrad.addColorStop(0, flashWhite ? '#e2e8f0' : '#3f4856');
      armorGrad.addColorStop(0.42, flashWhite ? '#94a3b8' : '#1b202b');
      armorGrad.addColorStop(1, '#080a0f');
      ctx.fillStyle = armorGrad;
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.moveTo(cx - 32 * scale, destH * 0.27);
      ctx.lineTo(cx + 32 * scale, destH * 0.27);
      ctx.lineTo(cx + 24 * scale, destH * 0.61);
      ctx.lineTo(cx - 24 * scale, destH * 0.61);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const capeGrad = ctx.createLinearGradient(cx, destH * 0.26, cx, destH * 0.72);
      capeGrad.addColorStop(0, '#7f1d1d');
      capeGrad.addColorStop(1, '#260609');
      ctx.fillStyle = capeGrad;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + dir * 24 * scale, destH * 0.27);
        ctx.lineTo(cx + dir * 38 * scale, destH * 0.34);
        ctx.lineTo(cx + dir * 32 * scale, destH * 0.66);
        ctx.lineTo(cx + dir * 22 * scale, destH * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.stroke();
      }

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 19 * scale, destH * 0.31);
      ctx.lineTo(cx - 8 * scale, destH * 0.42);
      ctx.moveTo(cx + 18 * scale, destH * 0.33);
      ctx.lineTo(cx + 11 * scale, destH * 0.45);
      ctx.stroke();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2 * scale;
      for (let r = 0; r < 4; r++) {
        const ry = destH * (0.34 + r * 0.05);
        ctx.beginPath();
        ctx.moveTo(cx - 15 * scale, ry);
        ctx.quadraticCurveTo(cx, ry + 3.5 * scale, cx + 15 * scale, ry);
        ctx.stroke();
      }
      const coreGrad = ctx.createRadialGradient(cx, destH * 0.44, 1.5 * scale, cx, destH * 0.44, 9.5 * scale);
      coreGrad.addColorStop(0, '#f0abfc');
      coreGrad.addColorStop(0.5, '#9333ea');
      coreGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, destH * 0.44, 9.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      const drawPinChain = (x1: number, y1: number, x2: number, y2: number) => {
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const lx = x1 + (x2 - x1) * t;
          const ly = y1 + (y2 - y1) * t;
          ctx.strokeStyle = outlineDark;
          ctx.lineWidth = 4.2 * scale;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 4.4 * scale, 2.5 * scale, 0.55, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = i % 2 === 0 ? '#94a3b8' : '#64748b';
          ctx.lineWidth = 2.0 * scale;
          ctx.stroke();
        }
      };
      drawPinChain(cx - 42 * scale, destH * 0.30, cx + 26 * scale, destH * 0.56);
      drawPinChain(cx + 42 * scale, destH * 0.30, cx - 26 * scale, destH * 0.56);
    });

    // 5. Held Weapons/Props & Severed Shoulder Stumps (drawn AFTER torso)
    withLimbHighlight('throne_claw_left', () => {
      if (!severedLimbs.has('throne_claw_left')) {
        const swGrad = ctx.createLinearGradient(cx - 5 * scale, destH * 0.36, cx + 5 * scale, destH * 0.90);
        swGrad.addColorStop(0, '#cbd5e1');
        swGrad.addColorStop(0.5, '#64748b');
        swGrad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = swGrad;
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx - 4.5 * scale, destH * 0.46);
        ctx.lineTo(cx + 4.5 * scale, destH * 0.46);
        ctx.lineTo(cx + 3 * scale, destH * 0.87);
        ctx.lineTo(cx, destH * 0.92);
        ctx.lineTo(cx - 3 * scale, destH * 0.87);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - 14 * scale, destH * 0.44, 28 * scale, 4.5 * scale);
        ctx.strokeRect(cx - 14 * scale, destH * 0.44, 28 * scale, 4.5 * scale);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.2 * scale;
        ctx.beginPath();
        ctx.moveTo(cx, destH * 0.48);
        ctx.lineTo(cx, destH * 0.86);
        ctx.stroke();
      } else {
        drawArmoredSeveredStump(ctx, cx - 32 * scale, destH * 0.40, 11 * scale, scale);
      }
    });

    withLimbHighlight('throne_ensor_right', () => {
      if (!severedLimbs.has('throne_ensor_right')) {
        const censerX = cx + (50 + Math.sin(animPhase * 1.2) * 5) * scale;
        const censerY = destH * 0.59;
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2.2 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 48 * scale, destH * 0.44);
        ctx.lineTo(censerX, censerY);
        ctx.stroke();

        const cGrad = ctx.createRadialGradient(censerX - 2 * scale, censerY - 3 * scale, 1.5 * scale, censerX, censerY, 10.5 * scale);
        cGrad.addColorStop(0, '#fde047');
        cGrad.addColorStop(0.45, '#dc2626');
        cGrad.addColorStop(1, '#450a0a');
        ctx.fillStyle = cGrad;
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.arc(censerX, censerY, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawGrippingHand(ctx, cx + 48 * scale, destH * 0.44, scale, '#475569', 0.3);
      } else {
        drawArmoredSeveredStump(ctx, cx + 32 * scale, destH * 0.40, 11 * scale, scale);
      }
    });
    ctx.restore();
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 1 MINIBOSS 1: ĐAO PHỦ HUYẾT NGỤC – MALAKOR (`butcher_kaelgor`)
  // =========================================================================
  if (spriteKey === 'butcher_kaelgor') {
    const kLegsSevered = severedLimbs.has('legs');
    withLimbHighlight('legs', () => {
      if (!kLegsSevered) {
        for (const dir of [-1, 1]) {
          ctx.fillStyle = '#1c1917';
          ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
          ctx.lineWidth = Math.max(0.85, 1.05 * scale);
          ctx.fillRect(cx + (dir * 15 - 9) * scale, destH * 0.58, 18 * scale, 30 * scale);
          ctx.strokeRect(cx + (dir * 15 - 9) * scale, destH * 0.58, 18 * scale, 30 * scale);
        }
      } else {
        drawArmoredSeveredStump(ctx, cx, destH * 0.78, 11 * scale, scale);
      }
    });

    ctx.save();
    if (kLegsSevered) {
      ctx.translate(cx, destH * 0.62 + 19 * scale);
      ctx.rotate(0.07);
      ctx.translate(-cx, -destH * 0.62);
    }

    // 2. Arms (drawn BEFORE torso)
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.save();
        ctx.translate(leftArmSwayX, leftArmBobY);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 9 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 30 * scale, destH * 0.32);
        ctx.lineTo(cx - 40 * scale, destH * 0.52);
        ctx.stroke();
        ctx.restore();
      }
    });
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.save();
        ctx.translate(rightArmSwayX, rightArmBobY);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 9 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 30 * scale, destH * 0.32);
        ctx.lineTo(cx + 38 * scale, destH * 0.50);
        ctx.stroke();
        ctx.restore();
      }
    });

    // 3. head (drawn BEFORE torso so chest armor frames neck)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        const hy = destH * 0.18 + headBobY * 0.5;
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx - 13 * scale, hy - 12 * scale);
        ctx.lineTo(cx + 13 * scale, hy - 12 * scale);
        ctx.lineTo(cx + 11 * scale, hy + 12 * scale);
        ctx.lineTo(cx - 11 * scale, hy + 12 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (!isBlinded) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(cx - 8 * scale, hy - 2 * scale, 5 * scale, 2.5 * scale);
          ctx.fillRect(cx + 3 * scale, hy - 2 * scale, 5 * scale, 2.5 * scale);
        } else {
          drawBlindedEyeSlash(ctx, cx, hy - 1 * scale, 10 * scale, scale);
        }
      } else {
        drawArmoredSeveredStump(ctx, cx, destH * 0.22, 10 * scale, scale);
      }
    });

    // 4. torso: Thân Bọc Thép & tạp dề đồ tể đẫm máu
    withLimbHighlight('torso', () => {
      ctx.save();
      ctx.translate(0, torsoBreathY);
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.moveTo(cx - 32 * scale, destH * 0.28);
      ctx.lineTo(cx + 32 * scale, destH * 0.28);
      ctx.lineTo(cx + 28 * scale, destH * 0.64);
      ctx.lineTo(cx - 28 * scale, destH * 0.64);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(cx - 20 * scale, destH * 0.34, 40 * scale, 28 * scale);
      ctx.strokeRect(cx - 20 * scale, destH * 0.34, 40 * scale, 28 * scale);
      ctx.restore();
    });

    // 5. Weapons / Held Props & Gripping Hands
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.save();
        ctx.translate(leftArmSwayX, leftArmBobY);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.8 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 40 * scale, destH * 0.52);
        ctx.lineTo(cx - 44 * scale, destH * 0.72);
        ctx.arc(cx - 48 * scale, destH * 0.74, 7 * scale, 0, Math.PI * 1.35);
        ctx.stroke();
        drawGrippingHand(ctx, cx - 40 * scale, destH * 0.52, scale, '#78350f', -0.25);
        ctx.restore();
      } else {
        drawArmoredSeveredStump(ctx, cx - 30 * scale, destH * 0.36, 9 * scale, scale);
      }
    });

    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.save();
        ctx.translate(rightArmSwayX, rightArmBobY);
        drawDetailedWeapon(ctx, 'butcher_kaelgor', 'right', cx + 38 * scale, destH * 0.50, scale, isTelegraphing);
        drawGrippingHand(ctx, cx + 38 * scale, destH * 0.50, scale, '#78350f', 0.25);
        ctx.restore();
      } else {
        drawArmoredSeveredStump(ctx, cx + 30 * scale, destH * 0.36, 9 * scale, scale);
      }
    });
    ctx.restore();
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 1 MINIBOSS 2: KỴ SĨ TIÊN PHONG – VORATH (`dullahan_knight`)
  // =========================================================================
  if (spriteKey === 'dullahan_knight') {
    const dLegsSevered = severedLimbs.has('legs');
    withLimbHighlight('legs', () => {
      if (!dLegsSevered) {
        for (const dir of [-1, 1]) {
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
          ctx.lineWidth = Math.max(0.85, 1.05 * scale);
          ctx.fillRect(cx + (dir * 15 - 9) * scale, destH * 0.58, 18 * scale, 30 * scale);
          ctx.strokeRect(cx + (dir * 15 - 9) * scale, destH * 0.58, 18 * scale, 30 * scale);
        }
      } else {
        drawArmoredSeveredStump(ctx, cx, destH * 0.78, 11 * scale, scale);
      }
    });

    ctx.save();
    if (dLegsSevered) {
      ctx.translate(cx, destH * 0.62 + 19 * scale);
      ctx.rotate(-0.07);
      ctx.translate(-cx, -destH * 0.62);
    }

    // 2. Right Arm forearm (drawn BEFORE torso)
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.save();
        ctx.translate(rightArmSwayX, rightArmBobY);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 8 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 26 * scale, destH * 0.32);
        ctx.lineTo(cx + 38 * scale, destH * 0.50);
        ctx.stroke();
        ctx.restore();
      }
    });

    // 3. head (drawn BEFORE torso so chest armor frames neck)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        const hy = destH * 0.18 + headBobY * 0.5;
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.arc(cx, hy, 13 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(cx - 10 * scale, hy - 6 * scale);
        ctx.lineTo(cx - 20 * scale, hy - 22 * scale);
        ctx.lineTo(cx - 5 * scale, hy - 11 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 8 * scale, hy - 9 * scale);
        ctx.lineTo(cx + 14 * scale, hy - 14 * scale);
        ctx.lineTo(cx + 11 * scale, hy - 6 * scale);
        ctx.closePath();
        ctx.fill();
        if (!isBlinded) {
          ctx.fillStyle = '#f97316';
          ctx.fillRect(cx - 6 * scale, hy - 1 * scale, 12 * scale, 3 * scale);
        } else {
          drawBlindedEyeSlash(ctx, cx, hy, 9.5 * scale, scale);
        }
      } else {
        drawArmoredSeveredStump(ctx, cx, destH * 0.22, 10 * scale, scale);
      }
    });

    // 4. torso: Thân Giáp đen nặng
    withLimbHighlight('torso', () => {
      ctx.save();
      ctx.translate(0, torsoBreathY);
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.fillRect(cx - 26 * scale, destH * 0.28, 52 * scale, 34 * scale);
      ctx.strokeRect(cx - 26 * scale, destH * 0.28, 52 * scale, 34 * scale);
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(cx - 18 * scale, destH * 0.34, 36 * scale, 22 * scale);
      ctx.restore();
    });

    // 5. Weapons / Shields & Gripping Hands
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.save();
        ctx.translate(rightArmSwayX, rightArmBobY);
        drawDetailedWeapon(ctx, 'dullahan_knight', 'right', cx + 38 * scale, destH * 0.50, scale, isTelegraphing);
        drawGrippingHand(ctx, cx + 38 * scale, destH * 0.50, scale, '#334155', 0.25);
        ctx.restore();
      } else {
        drawArmoredSeveredStump(ctx, cx + 28 * scale, destH * 0.36, 9 * scale, scale);
      }
    });

    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.save();
        ctx.translate(leftArmSwayX * 0.5, leftArmBobY * 0.5);
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.fillRect(cx - 48 * scale, destH * 0.24, 30 * scale, 52 * scale);
        ctx.strokeRect(cx - 48 * scale, destH * 0.24, 30 * scale, 52 * scale);
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(cx - 43 * scale, destH * 0.32, 20 * scale, 32 * scale);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 33 * scale, destH * 0.28);
        ctx.lineTo(cx - 33 * scale, destH * 0.68);
        ctx.moveTo(cx - 44 * scale, destH * 0.44);
        ctx.lineTo(cx - 22 * scale, destH * 0.44);
        ctx.stroke();
        ctx.restore();
      } else {
        drawArmoredSeveredStump(ctx, cx - 28 * scale, destH * 0.38, 9 * scale, scale);
      }
    });
    ctx.restore();
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 1 MINIBOSS 3: NỮ TẾ HUYẾT NGHI – SERAPHINA (`countess_carmilla`)
  // =========================================================================
  if (spriteKey === 'countess_carmilla') {
    const cLegsSevered = severedLimbs.has('legs');
    withLimbHighlight('legs', () => {
      if (!cLegsSevered) {
        const mGrad = ctx.createLinearGradient(cx, destH * 0.56, cx, destH * 0.90);
        mGrad.addColorStop(0, '#581c87');
        mGrad.addColorStop(1, 'rgba(9, 5, 16, 0.2)');
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 24 * scale, destH * 0.56);
        ctx.lineTo(cx + 24 * scale, destH * 0.56);
        ctx.lineTo(cx + 38 * scale, destH * 0.90);
        ctx.lineTo(cx - 38 * scale, destH * 0.90);
        ctx.closePath();
        ctx.fill();
      } else {
        drawArterialStump(ctx, cx, destH * 0.78, 10 * scale);
      }
    });

    ctx.save();
    if (cLegsSevered) {
      ctx.translate(cx, destH * 0.62 + 18 * scale);
      ctx.rotate(0.06);
      ctx.translate(-cx, -destH * 0.62);
    }

    // 2. Arms (drawn BEFORE torso)
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.strokeStyle = '#d6b89c';
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 20 * scale, destH * 0.34);
        ctx.lineTo(cx - 36 * scale, destH * 0.48 + leftArmBobY);
        ctx.stroke();
      }
    });
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.strokeStyle = '#d6b89c';
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 20 * scale, destH * 0.34);
        ctx.lineTo(cx + 36 * scale, destH * 0.48 + rightArmBobY);
        ctx.stroke();
      }
    });

    // 3. head (drawn BEFORE torso so robe neckline covers throat seam)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        const hy = destH * 0.20 + headBobY * 0.5;
        ctx.fillStyle = '#3b0764';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 14 * scale, hy + 4 * scale);
        ctx.lineTo(cx, hy - 22 * scale);
        ctx.lineTo(cx + 14 * scale, hy + 4 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.arc(cx, hy + 2 * scale, 9 * scale, 0, Math.PI * 2);
        ctx.fill();
        if (!isBlinded) {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(cx - 5 * scale, hy, 3 * scale, 2 * scale);
          ctx.fillRect(cx + 2 * scale, hy, 3 * scale, 2 * scale);
        } else {
          drawBlindedEyeSlash(ctx, cx, hy + 1 * scale, 8 * scale, scale);
        }
      } else {
        drawArterialStump(ctx, cx, destH * 0.24, 9 * scale);
      }
    });

    // 4. torso: Lễ phục huyết tế đỏ sẫm
    withLimbHighlight('torso', () => {
      ctx.save();
      ctx.translate(0, torsoBreathY);
      ctx.fillStyle = '#7f1d1d';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.moveTo(cx - 20 * scale, destH * 0.30);
      ctx.lineTo(cx + 20 * scale, destH * 0.30);
      ctx.lineTo(cx + 26 * scale, destH * 0.62);
      ctx.lineTo(cx - 26 * scale, destH * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 5. Held Props & Staff
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        for (const [hx, hy] of [[-38, 0.46], [-44, 0.51], [-33, 0.52]]) {
          ctx.beginPath();
          ctx.arc(cx + hx * scale, destH * hy + leftArmBobY, 5.5 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        drawArterialStump(ctx, cx - 22 * scale, destH * 0.36, 8 * scale);
      }
    });

    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 3.2 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 36 * scale, destH * 0.14 + rightArmBobY);
        ctx.lineTo(cx + 36 * scale, destH * 0.80 + rightArmBobY);
        ctx.stroke();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(cx + 36 * scale, destH * 0.14 + rightArmBobY, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        drawGrippingHand(ctx, cx + 36 * scale, destH * 0.48 + rightArmBobY, scale, '#d6b89c', 0.1);
      } else {
        drawArterialStump(ctx, cx + 22 * scale, destH * 0.36, 8 * scale);
      }
    });
    ctx.restore();
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 1 MINIBOSS 4: CỰ THÚ HỘ ĐIỆN – GRENDEL (`fenrir_kin`)
  // =========================================================================
  if (spriteKey === 'fenrir_kin') {
    // 1. legs: Bướu Chướng Khí phồng rộp màu xanh lục độc
    withLimbHighlight('legs', () => {
      if (!severedLimbs.has('legs')) {
        ctx.fillStyle = '#365314';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        for (const [bx, by, r] of [[-16, 0.72, 13], [0, 0.74, 15], [16, 0.72, 13]]) {
          ctx.beginPath();
          ctx.arc(cx + bx * scale, destH * by, r * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(cx - 10 * scale, destH * 0.72, 4 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 12 * scale, destH * 0.74, 4.5 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawArterialStump(ctx, cx, destH * 0.74, 11 * scale);
      }
    });

    // 2. Left & Right Arms (drawn BEFORE head & torso so torso covers shoulder seams)
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.fillStyle = '#e7e5e4';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx - 32 * scale, destH * 0.38);
        ctx.lineTo(cx - 56 * scale, destH * 0.52 + leftArmBobY);
        ctx.lineTo(cx - 42 * scale, destH * 0.66 + leftArmBobY);
        ctx.lineTo(cx - 26 * scale, destH * 0.50);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.fillStyle = '#991b1b';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.ellipse(cx + 42 * scale, destH * 0.50 + rightArmBobY, 15 * scale, 20 * scale, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    // 3. head: Đầu Ghép Đa Mặt (drawn BEFORE torso so neck seam tucks cleanly behind chest)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        for (const [hx, hy] of [[-12, 0.22], [10, 0.20], [0, 0.26]]) {
          ctx.fillStyle = '#d6b89c';
          ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
          ctx.lineWidth = Math.max(0.85, 1.05 * scale);
          ctx.beginPath();
          ctx.arc(cx + hx * scale, destH * hy + headBobY * 0.5, 9 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#070509';
          ctx.fillRect(cx + (hx - 4) * scale, destH * hy + 1 * scale + headBobY * 0.5, 8 * scale, 4 * scale);
        }
      } else {
        drawArterialStump(ctx, cx, destH * 0.22, 11 * scale);
      }
    });

    // 4. torso: Thân Ghép Xác khổng lồ khâu chỉ sắt
    withLimbHighlight('torso', () => {
      ctx.save();
      ctx.translate(0, torsoBreathY);
      ctx.fillStyle = '#7f1d1d';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.ellipse(cx, destH * 0.46, 36 * scale, 26 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 24 * scale, destH * 0.36);
      ctx.lineTo(cx + 22 * scale, destH * 0.56);
      ctx.stroke();
      ctx.restore();
    });

    // 5. Severed Arm Stumps (drawn AFTER torso so they remain visible on shoulder seams)
    if (severedLimbs.has('left_arm')) {
      drawArterialStump(ctx, cx - 32 * scale, destH * 0.44, 9 * scale);
    }
    if (severedLimbs.has('right_arm')) {
      drawArterialStump(ctx, cx + 32 * scale, destH * 0.44, 9 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 2 BOSS: HỒNG Y SÁP TRẮNG / ĐAO PHỦ KỴ ĐOÀN (`executioner_paladin` — 3-Tone Chiaroscuro Wax Robe, Gold Censer Head & Rim Light)
  // =========================================================================
  if (spriteKey === 'executioner_paladin') {
    const paladinLegsSevered = severedLimbs.has('legs');
    // 1. legs: Dải lụa kinh văn lơ lửng 3 sắc độ (nx: 0.50, ny: 0.77)
    withLimbHighlight('legs', () => {
      if (!paladinLegsSevered) {
        for (const rx of [-26, -13, 0, 13, 26]) {
          const ribGrad = ctx.createLinearGradient(cx + rx * scale, destH * 0.60, cx + rx * scale, destH * 0.92);
          ribGrad.addColorStop(0, '#f8fafc');
          ribGrad.addColorStop(0.55, '#d6c7a5');
          ribGrad.addColorStop(1, '#574a38');
          ctx.fillStyle = ribGrad;
          ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
          ctx.lineWidth = Math.max(0.85, 1.05 * scale);
          ctx.beginPath();
          ctx.moveTo(cx + rx * scale - 4.5 * scale, destH * 0.59);
          ctx.quadraticCurveTo(
            cx + (rx + Math.sin(animPhase + rx) * 6.5) * scale,
            destH * 0.76,
            cx + rx * 1.22 * scale,
            destH * 0.91
          );
          ctx.lineTo(cx + rx * 1.22 * scale + 5.5 * scale, destH * 0.91);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else {
        drawArmoredSeveredStump(ctx, cx, destH * 0.81, 12 * scale, scale);
      }
    });

    // Collapse Boss torso downward + lean when legs are severed
    ctx.save();
    if (paladinLegsSevered) {
      ctx.translate(cx, destH * 0.65 + 21 * scale);
      ctx.rotate(-0.06);
      ctx.translate(-cx, -destH * 0.65);
    }

    // 2. Left & Right Twin Arms (drawn BEFORE head & torso so wax robe covers shoulder seams)
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.strokeStyle = outlineDark;
        ctx.lineWidth = 8 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 28 * scale, destH * 0.32);
        ctx.lineTo(cx - 44 * scale, destH * 0.40 + leftArmBobY);
        ctx.moveTo(cx - 28 * scale, destH * 0.42);
        ctx.lineTo(cx - 44 * scale, destH * 0.52 + leftArmBobY);
        ctx.stroke();
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 4.6 * scale;
        ctx.stroke();
      }
    });
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.strokeStyle = outlineDark;
        ctx.lineWidth = 8 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 28 * scale, destH * 0.32);
        ctx.lineTo(cx + 44 * scale, destH * 0.40 + rightArmBobY);
        ctx.moveTo(cx + 28 * scale, destH * 0.42);
        ctx.lineTo(cx + 44 * scale, destH * 0.52 + rightArmBobY);
        ctx.stroke();
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 4.6 * scale;
        ctx.stroke();
      }
    });

    // 3. head: Lư hương vàng khổng lồ chạm khắc Thánh Mẫu 3 sắc độ + khói máu đen (drawn BEFORE torso)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        const hy = destH * 0.17 + headBobY;
        const goldGrad = ctx.createLinearGradient(cx - 17 * scale, hy - 14 * scale, cx + 17 * scale, hy + 14 * scale);
        goldGrad.addColorStop(0, '#fef08a');
        goldGrad.addColorStop(0.48, '#d97706');
        goldGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = goldGrad;
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx, hy - 16 * scale);
        ctx.lineTo(cx + 18 * scale, hy);
        ctx.lineTo(cx, hy + 14 * scale);
        ctx.lineTo(cx - 18 * scale, hy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 16 * scale, hy);
        ctx.lineTo(cx, hy - 15 * scale);
        ctx.lineTo(cx + 16 * scale, hy);
        ctx.stroke();

        // Black-blood incense smoke plumes
        ctx.fillStyle = 'rgba(127, 29, 29, 0.58)';
        ctx.beginPath();
        ctx.arc(cx - 15 * scale, hy - 9 * scale, 8.5 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 15 * scale, hy - 9 * scale, 8.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        if (isBlinded) {
          drawBlindedEyeSlash(ctx, cx, hy, 12 * scale, scale);
        }
      } else {
        drawArmoredSeveredStump(ctx, cx, destH * 0.17, 11 * scale, scale);
      }
    });

    // 4. torso: Lễ phục giáo hoàng sáp nến nóng 3 sắc độ + vệt máu khô & khuôn mặt trẻ em (nx: 0.50, ny: 0.45)
    withLimbHighlight('torso', () => {
      ctx.save();
      ctx.translate(0, torsoBreathY);
      const waxGrad = ctx.createLinearGradient(cx - 36 * scale, destH * 0.27, cx + 36 * scale, destH * 0.65);
      waxGrad.addColorStop(0, flashWhite ? '#ffffff' : '#f5f0e4');
      waxGrad.addColorStop(0.5, '#cbd5e1');
      waxGrad.addColorStop(1, '#475569');
      ctx.fillStyle = waxGrad;
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.moveTo(cx - 30 * scale, destH * 0.27);
      ctx.lineTo(cx + 30 * scale, destH * 0.27);
      ctx.lineTo(cx + 37 * scale, destH * 0.65);
      ctx.lineTo(cx - 37 * scale, destH * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rim light on top mantle & crimson liturgical sash
      ctx.strokeStyle = rimLightCol;
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 29 * scale, destH * 0.28);
      ctx.lineTo(cx + 29 * scale, destH * 0.28);
      ctx.stroke();

      // Dried blood streaks running down melting wax folds
      ctx.strokeStyle = 'rgba(127, 29, 29, 0.78)';
      ctx.lineWidth = 2.4 * scale;
      for (const bx of [-18, -4, 14]) {
        ctx.beginPath();
        ctx.moveTo(cx + bx * scale, destH * 0.30);
        ctx.lineTo(cx + (bx + 2) * scale, destH * 0.61);
        ctx.stroke();
      }

      // Tiny children's faces pressing outward beneath translucent wax
      for (const [fx, fy] of [[-13, 0.40], [11, 0.38], [-7, 0.53], [15, 0.51], [1, 0.45]]) {
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.arc(cx + fx * scale, destH * fy, 5.8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = outlineDark;
        ctx.fillRect(cx + (fx - 2.6) * scale, destH * fy - 1 * scale, 1.6 * scale, 1.6 * scale);
        ctx.fillRect(cx + (fx + 1.4) * scale, destH * fy - 1 * scale, 1.6 * scale, 1.6 * scale);
      }
      ctx.restore();
    });

    // 5. Held Tome, Bell Staff, Gripping Hands & Severed Stumps (drawn AFTER arms & torso)
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        // Kinh Văn Da Người đóng đinh đồng
        const bookGrad = ctx.createLinearGradient(cx - 56 * scale, destH * 0.33, cx - 34 * scale, destH * 0.62);
        bookGrad.addColorStop(0, '#92400e');
        bookGrad.addColorStop(0.6, '#5c240c');
        bookGrad.addColorStop(1, '#260d04');
        ctx.fillStyle = bookGrad;
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.fillRect(cx - 55 * scale, destH * 0.33 + leftArmBobY, 22 * scale, 30 * scale);
        ctx.strokeRect(cx - 55 * scale, destH * 0.33 + leftArmBobY, 22 * scale, 30 * scale);
        // Bronze nails & crimson seal
        ctx.fillStyle = '#f59e0b';
        for (const [nx, ny] of [[-51, 0.36], [-37, 0.36], [-51, 0.59], [-37, 0.59]]) {
          ctx.beginPath();
          ctx.arc(cx + nx * scale, destH * ny + leftArmBobY, 2 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        drawArmoredSeveredStump(ctx, cx - 30 * scale, destH * 0.42, 10 * scale, scale);
      }
    });

    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        // Staff with Bloodstained Bronze Bell
        ctx.strokeStyle = outlineDark;
        ctx.lineWidth = 6 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 44 * scale, destH * 0.13 + rightArmBobY);
        ctx.lineTo(cx + 44 * scale, destH * 0.78 + rightArmBobY);
        ctx.stroke();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 3.2 * scale;
        ctx.stroke();

        const bellGrad = ctx.createRadialGradient(cx + 48 * scale, destH * 0.20 + rightArmBobY, 1.5 * scale, cx + 50 * scale, destH * 0.22 + rightArmBobY, 10 * scale);
        bellGrad.addColorStop(0, '#fef08a');
        bellGrad.addColorStop(0.55, '#ca8a04');
        bellGrad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = bellGrad;
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.arc(cx + 50 * scale, destH * 0.22 + rightArmBobY, 9 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Both pale wax hands gripping the bronze bell staff on top layer
        drawGrippingHand(ctx, cx + 44 * scale, destH * 0.40 + rightArmBobY, scale, '#f1f5f9', 0.08);
        drawGrippingHand(ctx, cx + 44 * scale, destH * 0.52 + rightArmBobY, scale, '#f1f5f9', 0.08);
      } else {
        drawArmoredSeveredStump(ctx, cx + 30 * scale, destH * 0.42, 10 * scale, scale);
      }
    });

    ctx.restore();
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 2 MINIBOSS 1: NỮ TU KHÓC RA SÁP (`grand_abbess` — Bound to Upright Wooden Torture Wheel, Stitched Back Arms, Wax-Covered Face)
  // =========================================================================
  if (spriteKey === 'grand_abbess') {
    // 1. legs: Chiếc bánh xe tra tấn bằng gỗ mục đặt dựng đứng (nx: 0.50, ny: 0.76)
    withLimbHighlight('legs', () => {
      if (!severedLimbs.has('legs')) {
        ctx.strokeStyle = '#5c3a21';
        ctx.lineWidth = 6 * scale;
        ctx.beginPath();
        ctx.arc(cx, destH * 0.52, 42 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 3 * scale;
        for (let s = 0; s < 8; s++) {
          const ang = (s * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(cx, destH * 0.52);
          ctx.lineTo(cx + Math.cos(ang) * 42 * scale, destH * 0.52 + Math.sin(ang) * 42 * scale);
          ctx.stroke();
        }
      } else {
        drawArterialStump(ctx, cx, destH * 0.76, 11 * scale);
      }
    });

    // 2. Left & Right Arms (drawn BEFORE head & torso so nun habit covers shoulder seams)
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 18 * scale, destH * 0.34);
        ctx.lineTo(cx - 32 * scale, destH * 0.44);
        ctx.lineTo(cx - 16 * scale, destH * 0.52);
        ctx.stroke();
      }
    });
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 18 * scale, destH * 0.34);
        ctx.lineTo(cx + 28 * scale, destH * 0.48);
        ctx.stroke();
      }
    });

    // 3. head: Đầu & lớp sáp phủ vùng mắt (drawn BEFORE torso so cổ áo/habit che gọn phần cổ)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.arc(cx, destH * 0.20 + headBobY * 0.4, 12 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Upper white wax covering face down to neck seam
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.moveTo(cx - 11 * scale, destH * 0.16);
        ctx.lineTo(cx + 11 * scale, destH * 0.16);
        ctx.lineTo(cx + 9 * scale, destH * 0.29);
        ctx.lineTo(cx, destH * 0.31);
        ctx.lineTo(cx - 9 * scale, destH * 0.29);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx, destH * 0.20, 9 * scale);
      }
    });

    // 4. torso: Nữ tu già nua bị trói chặt vào bánh xe gỗ + sáp nến chảy xuống ngực (nx: 0.50, ny: 0.46)
    withLimbHighlight('torso', () => {
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.moveTo(cx - 18 * scale, destH * 0.28);
      ctx.lineTo(cx + 18 * scale, destH * 0.28);
      ctx.lineTo(cx + 22 * scale, destH * 0.74);
      ctx.lineTo(cx - 22 * scale, destH * 0.74);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (!severedLimbs.has('head')) {
        // Lower white wax dripping onto chest habit
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.moveTo(cx - 9 * scale, destH * 0.28);
        ctx.lineTo(cx + 9 * scale, destH * 0.28);
        ctx.lineTo(cx + 8 * scale, destH * 0.38);
        ctx.lineTo(cx, destH * 0.44);
        ctx.lineTo(cx - 8 * scale, destH * 0.38);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });

    // 5. Held Weapon, Gripping Hand & Severed Stumps (drawn AFTER arms & torso)
    if (severedLimbs.has('left_arm')) {
      drawArterialStump(ctx, cx - 22 * scale, destH * 0.42, 8 * scale);
    }
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        drawDetailedWeapon(ctx, 'grand_abbess', 'right', cx + 28 * scale, destH * 0.48, scale, isTelegraphing);
        drawGrippingHand(ctx, cx + 28 * scale, destH * 0.48, scale, '#cbd5e1', 0.2);
      } else {
        drawArterialStump(ctx, cx + 22 * scale, destH * 0.42, 8 * scale);
      }
    });
    ctx.restore();
    return;
  }

  // =========================================================================
  // FLOOR 2 MINIBOSS 2: THÁNH VỆ BẠCH KIM BỊ THA HÓA (`penitent_knight` — Corroded Platinum Armor Oozing Black Blood, Eyeball Tower Shield, Unarmored Left Leg)
  // =========================================================================
  if (spriteKey === 'penitent_knight') {
    // 1. left_leg: Cẳng chân trái mất giáp chỉ còn khối thịt máu đen (Tử huyệt, nx: 0.40, ny: 0.76)
    withLimbHighlight('left_leg', () => {
      if (!severedLimbs.has('left_leg') && !severedLimbs.has('legs')) {
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.fillRect(cx - 20 * scale, destH * 0.58, 14 * scale, 30 * scale);
        ctx.strokeRect(cx - 20 * scale, destH * 0.58, 14 * scale, 30 * scale);
        // Black blood ooze
        ctx.fillStyle = '#09070c';
        ctx.fillRect(cx - 16 * scale, destH * 0.64, 6 * scale, 20 * scale);
      } else {
        drawArterialStump(ctx, cx - 14 * scale, destH * 0.70, 9 * scale);
      }
    });

    // legs: Chân phải bọc giáp bạch kim dày (nx: 0.60, ny: 0.76)
    withLimbHighlight('legs', () => {
      if (!severedLimbs.has('legs')) {
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.fillRect(cx + 6 * scale, destH * 0.58, 16 * scale, 30 * scale);
        ctx.strokeRect(cx + 6 * scale, destH * 0.58, 16 * scale, 30 * scale);
      } else {
        drawArterialStump(ctx, cx + 14 * scale, destH * 0.70, 9 * scale);
      }
    });

    // 2. Right Arm forearm (drawn BEFORE head & torso so platinum chestplate covers shoulder seam)
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 8 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 25 * scale, destH * 0.34 + rightArmBobY);
        ctx.lineTo(cx + 36 * scale, destH * 0.46 + rightArmBobY);
        ctx.stroke();
      }
    });

    // 3. head: Mũ giáp bạch kim rỉ máu đen (drawn BEFORE torso so cổ giáp che gọn phần cổ)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.arc(cx, destH * 0.18 + headBobY, 13 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#070509';
        ctx.fillRect(cx - 8 * scale, destH * 0.17 + headBobY, 16 * scale, 4 * scale);
      } else {
        drawArterialStump(ctx, cx, destH * 0.18, 10 * scale);
      }
    });

    // 4. torso: Giáp bạch kim khổng lồ bị ăn mòn, qua các khe khớp trào ra bùn máu đen (nx: 0.50, ny: 0.44)
    withLimbHighlight('torso', () => {
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.fillRect(cx - 26 * scale, destH * 0.28 + torsoBreathY, 52 * scale, 32 * scale);
      ctx.strokeRect(cx - 26 * scale, destH * 0.28 + torsoBreathY, 52 * scale, 32 * scale);
      // Black blood mud oozing from armor seams
      ctx.fillStyle = '#09050a';
      ctx.fillRect(cx - 18 * scale, destH * 0.36 + torsoBreathY, 36 * scale, 5 * scale);
      ctx.fillRect(cx - 4 * scale, destH * 0.36 + torsoBreathY, 8 * scale, 22 * scale);
    });

    // 5. Held Eyeball Tower Shield, Square War Mace, Gripping Hand & Severed Stumps
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.fillRect(cx - 48 * scale, destH * 0.28 + leftArmBobY, 24 * scale, 42 * scale);
        ctx.strokeRect(cx - 48 * scale, destH * 0.28 + leftArmBobY, 24 * scale, 42 * scale);
        // Giant rolling eyeball in center of shield
        ctx.fillStyle = '#fef2f2';
        ctx.beginPath();
        ctx.arc(cx - 36 * scale, destH * 0.48 + leftArmBobY, 8.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(
          cx - 36 * scale + Math.cos(animPhase * 2) * 2.5 * scale,
          destH * 0.48 + leftArmBobY + Math.sin(animPhase * 2) * 2 * scale,
          4 * scale,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else {
        drawArterialStump(ctx, cx - 30 * scale, destH * 0.42, 9 * scale);
      }
    });

    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 34.5 * scale, destH * 0.62 + rightArmBobY);
        ctx.lineTo(cx + 38 * scale, destH * 0.18 + rightArmBobY);
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.fillRect(cx + 28 * scale, destH * 0.12 + rightArmBobY, 20 * scale, 16 * scale);
        ctx.strokeRect(cx + 28 * scale, destH * 0.12 + rightArmBobY, 20 * scale, 16 * scale);
        drawGrippingHand(ctx, cx + 36 * scale, destH * 0.46 + rightArmBobY, scale, '#cbd5e1', 0.12);
      } else {
        drawArterialStump(ctx, cx + 30 * scale, destH * 0.42, 9 * scale);
      }
    });
    ctx.restore();
    return;
  }

  // =========================================================================
  // NORMAL ENEMY GROUP 1: QUÁI THÚ 4 CHÂN (`dire_hellwolf`, `void_panther`)
  // =========================================================================
  if (spriteKey === 'dire_hellwolf' || spriteKey === 'void_panther') {
    const isPanther = spriteKey === 'void_panther';
    const bodyCol = isPanther ? '#1e1b4b' : '#450a0a';
    const shadowCol = '#070509';

    // 1. legs: Hai chân sau gân guốc (nx: 0.70, ny: 0.68)
    withLimbHighlight('legs', () => {
      if (!severedLimbs.has('legs')) {
        ctx.fillStyle = bodyCol;
        ctx.strokeStyle = shadowCol;
        ctx.lineWidth = 2.4 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 16 * scale, destH * 0.48);
        ctx.lineTo(cx + 38 * scale, destH * 0.66);
        ctx.lineTo(cx + 32 * scale, destH * 0.88);
        ctx.lineTo(cx + 18 * scale, destH * 0.88);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx + 24 * scale, destH * 0.68, 9 * scale);
      }
    });

    // 2. left_arm & right_arm: Hai chân trước vồ mồi (nx: 0.30, 0.68 & 0.46, 0.70)
    for (const [limbId, ox] of [
      ['left_arm', -24],
      ['right_arm', -6],
    ] as const) {
      withLimbHighlight(limbId, () => {
        if (!severedLimbs.has(limbId)) {
          ctx.fillStyle = bodyCol;
          ctx.strokeStyle = shadowCol;
          ctx.lineWidth = 2.4 * scale;
          ctx.beginPath();
          ctx.moveTo(cx + ox * scale, destH * 0.52);
          ctx.lineTo(cx + (ox - 6) * scale, destH * 0.88);
          ctx.lineTo(cx + (ox + 6) * scale, destH * 0.88);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          drawArterialStump(ctx, cx + ox * scale, destH * 0.68, 8 * scale);
        }
      });
    }

    // 3. head: Hàm mở rộng lộ răng nanh lửa / 4 mắt tím (drawn BEFORE torso so cổ thú lồng gọn vào thân)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        const hx = cx - 22 * scale;
        const hy = destH * 0.34 + headBobY;
        ctx.fillStyle = bodyCol;
        ctx.strokeStyle = shadowCol;
        ctx.lineWidth = 2.4 * scale;
        ctx.beginPath();
        ctx.arc(hx, hy, 15 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Jaws & Fangs
        ctx.fillStyle = isPanther ? '#a855f7' : '#f97316';
        ctx.fillRect(hx - 14 * scale, hy + 2 * scale, 12 * scale, 5 * scale);
        // Eyes (4 violet eyes for void_panther, blazing red for hellwolf)
        ctx.fillStyle = isPanther ? '#e879f9' : '#ef4444';
        ctx.beginPath();
        ctx.arc(hx - 4 * scale, hy - 4 * scale, 2.2 * scale, 0, Math.PI * 2);
        ctx.arc(hx + 3 * scale, hy - 4 * scale, 2.2 * scale, 0, Math.PI * 2);
        if (isPanther) {
          ctx.arc(hx - 4 * scale, hy - 9 * scale, 1.8 * scale, 0, Math.PI * 2);
          ctx.arc(hx + 3 * scale, hy - 9 * scale, 1.8 * scale, 0, Math.PI * 2);
        }
        ctx.fill();
      } else {
        drawArterialStump(ctx, cx - 22 * scale, destH * 0.34, 10 * scale);
      }
    });

    // 4. torso: Thân thú cúi thấp lao về phía trước + Lõi tinh vân rách ở sườn (nx: 0.54, ny: 0.48)
    withLimbHighlight('torso', () => {
      ctx.fillStyle = bodyCol;
      ctx.strokeStyle = shadowCol;
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.ellipse(cx + 4 * scale, destH * 0.48 + torsoBreathY, 32 * scale, 16 * scale, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (isPanther) {
        // Torn nebula core on flank
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.ellipse(cx + 6 * scale, destH * 0.48 + torsoBreathY, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
    return;
  }

  // =========================================================================
  // NORMAL ENEMY GROUP 2: QUÁI DỊ HÌNH (`void_tentacle_cluster`, `void_leech_beast`)
  // =========================================================================
  if (spriteKey === 'void_tentacle_cluster' || spriteKey === 'void_leech_beast') {
    const isLeech = spriteKey === 'void_leech_beast';
    // 1. Writhing tentacles (left_arm & right_arm)
    for (const [limbId, dir] of [
      ['left_arm', -1],
      ['right_arm', 1],
    ] as const) {
      withLimbHighlight(limbId, () => {
        if (!severedLimbs.has(limbId)) {
          ctx.strokeStyle = isLeech ? '#881337' : '#7e22ce';
          ctx.lineWidth = 7 * scale;
          ctx.beginPath();
          ctx.moveTo(cx + dir * 20 * scale, destH * 0.48);
          ctx.quadraticCurveTo(
            cx + dir * 46 * scale,
            destH * 0.34 + rightArmBobY,
            cx + dir * 36 * scale,
            destH * 0.68
          );
          ctx.stroke();
        } else {
          drawArterialStump(ctx, cx + dir * 22 * scale, destH * 0.48, 8 * scale);
        }
      });
    }

    // 2. head (drawn BEFORE torso so central sac covers neck seam)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        const hy = destH * 0.22 + headBobY;
        ctx.fillStyle = isLeech ? '#4c0519' : '#581c87';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.arc(cx, hy, 16 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Spiral lamprey teeth maw (`void_leech_beast`) or Central Abyssal Eye (`void_tentacle_cluster`)
        ctx.fillStyle = isLeech ? '#fecdd3' : '#facc15';
        ctx.beginPath();
        ctx.arc(cx, hy, 7 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx, destH * 0.22, 10 * scale);
      }
    });

    // 3. torso: Writhing base sac
    withLimbHighlight('torso', () => {
      ctx.fillStyle = isLeech ? '#3f1d2e' : '#2e1065';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.ellipse(cx, destH * 0.52 + torsoBreathY, 30 * scale, 24 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
    return;
  }

  // =========================================================================
  // NORMAL ENEMY GROUP 3: BỘ XƯƠNG ĐEN HỒN MA (`black_bone_skeleton`)
  // =========================================================================
  if (spriteKey === 'black_bone_skeleton') {
    // Ghostly cyan-violet soul flame behind black bones
    const soulGrad = ctx.createRadialGradient(cx, destH * 0.40, 4 * scale, cx, destH * 0.40, 34 * scale);
    soulGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    soulGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = soulGrad;
    ctx.beginPath();
    ctx.arc(cx, destH * 0.40, 34 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 1. Charred black skeletal legs
    withLimbHighlight('legs', () => {
      if (!severedLimbs.has('legs')) {
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 10 * scale, destH * 0.56);
        ctx.lineTo(cx - 14 * scale, destH * 0.88);
        ctx.moveTo(cx + 10 * scale, destH * 0.56);
        ctx.lineTo(cx + 14 * scale, destH * 0.88);
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx - 10 * scale, destH * 0.58, 7 * scale);
        drawArterialStump(ctx, cx + 10 * scale, destH * 0.58, 7 * scale);
      }
    });

    // 2. Left & Right Bone Arms (drawn BEFORE head & torso ribcage)
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 16 * scale, destH * 0.34);
        ctx.lineTo(cx - 26 * scale, destH * 0.48);
        ctx.stroke();
      }
    });
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 4.2 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 16 * scale, destH * 0.34);
        ctx.lineTo(cx + 24 * scale, destH * 0.48);
        ctx.stroke();
      }
    });

    // 3. head (drawn BEFORE torso ribcage)
    withLimbHighlight('head', () => {
      if (!severedLimbs.has('head')) {
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.arc(cx, destH * 0.18 + headBobY, 12 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx - 4 * scale, destH * 0.18 + headBobY, 2.5 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 4 * scale, destH * 0.18 + headBobY, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawArterialStump(ctx, cx, destH * 0.22, 8 * scale);
      }
    });

    // 4. Charred black ribcage & spine
    withLimbHighlight('torso', () => {
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.moveTo(cx, destH * 0.26);
      ctx.lineTo(cx, destH * 0.58);
      ctx.stroke();
      ctx.lineWidth = 3 * scale;
      for (let r = 0; r < 4; r++) {
        const ry = destH * (0.32 + r * 0.055);
        ctx.beginPath();
        ctx.moveTo(cx - 16 * scale, ry);
        ctx.lineTo(cx + 16 * scale, ry);
        ctx.stroke();
      }
    });

    // 5. Held Shield / Weapon, Gripping Hand & Severed Stumps
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.beginPath();
        ctx.moveTo(cx - 35 * scale, destH * 0.38);
        ctx.lineTo(cx - 19 * scale, destH * 0.40);
        ctx.lineTo(cx - 22 * scale, destH * 0.56);
        ctx.lineTo(cx - 32 * scale, destH * 0.60);
        ctx.lineTo(cx - 37 * scale, destH * 0.50);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        drawArterialStump(ctx, cx - 18 * scale, destH * 0.36, 7 * scale);
      }
    });
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        drawDetailedWeapon(ctx, 'black_bone_skeleton', 'right', cx + 24 * scale, destH * 0.48, scale, isTelegraphing);
        drawGrippingHand(ctx, cx + 24 * scale, destH * 0.48, scale, '#27272a', 0.25);
      } else {
        drawArterialStump(ctx, cx + 18 * scale, destH * 0.36, 7 * scale);
      }
    });
    ctx.restore();
    return;
  }

  // =========================================================================
  // ALLY & NECROMANCY SUMMON OVERWORLD / PORTRAIT SPRITES
  // =========================================================================
  if (spriteKey === 'ally_kael') {
    // Kael (Tù Nhân): chân -> cánh tay -> đầu & tóc -> áo tù rách rưới -> cùm xích gãy
    ctx.fillStyle = '#44403c';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    // 1. Legs
    ctx.fillRect(cx - 12 * scale, destH * 0.58, 9 * scale, 28 * scale);
    ctx.strokeRect(cx - 12 * scale, destH * 0.58, 9 * scale, 28 * scale);
    ctx.fillRect(cx + 3 * scale, destH * 0.58, 9 * scale, 28 * scale);
    ctx.strokeRect(cx + 3 * scale, destH * 0.58, 9 * scale, 28 * scale);
    // 2. Arms (drawn BEFORE head & tunic so tunic covers shoulder seams)
    ctx.fillStyle = '#d6b89c';
    ctx.fillRect(cx - 28 * scale, destH * 0.34, 8 * scale, 22 * scale);
    ctx.strokeRect(cx - 28 * scale, destH * 0.34, 8 * scale, 22 * scale);
    ctx.fillRect(cx + 20 * scale, destH * 0.34, 8 * scale, 22 * scale);
    ctx.strokeRect(cx + 20 * scale, destH * 0.34, 8 * scale, 22 * scale);
    // 3. Face + Tousled Black Hair (drawn BEFORE tunic so cổ áo che gọn phần cổ)
    ctx.fillStyle = '#d6b89c';
    ctx.beginPath();
    ctx.arc(cx, destH * 0.21 + headBobY * 0.4, 11 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.stroke();
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.moveTo(cx - 13 * scale, destH * 0.20 + headBobY * 0.4);
    ctx.lineTo(cx - 8 * scale, destH * 0.08 + headBobY * 0.4);
    ctx.lineTo(cx - 2 * scale, destH * 0.13 + headBobY * 0.4);
    ctx.lineTo(cx + 4 * scale, destH * 0.07 + headBobY * 0.4);
    ctx.lineTo(cx + 13 * scale, destH * 0.19 + headBobY * 0.4);
    ctx.closePath();
    ctx.fill();
    // 4. Torn prison tunic
    ctx.fillStyle = '#57534e';
    ctx.beginPath();
    ctx.moveTo(cx - 20 * scale, destH * 0.30);
    ctx.lineTo(cx + 20 * scale, destH * 0.30);
    ctx.lineTo(cx + 16 * scale, destH * 0.62);
    ctx.lineTo(cx - 16 * scale, destH * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 5. Broken Iron Wrist Shackles (NO shield)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.6 * scale;
    ctx.strokeRect(cx - 29 * scale, destH * 0.50, 10 * scale, 4 * scale);
    ctx.strokeRect(cx + 19 * scale, destH * 0.50, 10 * scale, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 25 * scale, destH * 0.54);
    ctx.lineTo(cx - 30 * scale, destH * 0.66);
    ctx.moveTo(cx + 25 * scale, destH * 0.54);
    ctx.lineTo(cx + 30 * scale, destH * 0.66);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (spriteKey === 'broken_knight') {
    // Kỵ Sĩ Roland: Áo giáp xám sứt mẻ, mũ sắt không chỏm lông (chân -> cánh tay -> đầu -> thân giáp -> kiếm/găng tay)
    // 1. Legs
    withLimbHighlight('legs', () => {
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 14 * scale, destH * 0.62, 10 * scale, 26 * scale);
      ctx.strokeRect(cx - 14 * scale, destH * 0.62, 10 * scale, 26 * scale);
      ctx.fillRect(cx + 4 * scale, destH * 0.62, 10 * scale, 26 * scale);
      ctx.strokeRect(cx + 4 * scale, destH * 0.62, 10 * scale, 26 * scale);
    });
    // 2. Arms (drawn BEFORE head & torso armor)
    withLimbHighlight('left_arm', () => {
      if (!severedLimbs.has('left_arm')) {
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - 26 * scale, destH * 0.34, 8 * scale, 22 * scale);
        ctx.strokeRect(cx - 26 * scale, destH * 0.34, 8 * scale, 22 * scale);
      }
    });
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
        ctx.lineWidth = Math.max(0.85, 1.05 * scale);
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx + 18 * scale, destH * 0.34, 8 * scale, 22 * scale);
        ctx.strokeRect(cx + 18 * scale, destH * 0.34, 8 * scale, 22 * scale);
      }
    });
    // 3. Head (drawn BEFORE torso armor so cổ giáp che gọn phần cổ)
    withLimbHighlight('head', () => {
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(cx, destH * 0.20 + headBobY * 0.4, 11 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#09070c';
      ctx.fillRect(cx - 7 * scale, destH * 0.18 + headBobY * 0.4, 14 * scale, 3 * scale);
    });
    // 4. Torso armor
    withLimbHighlight('torso', () => {
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 18 * scale, destH * 0.30, 36 * scale, 32 * scale);
      ctx.strokeRect(cx - 18 * scale, destH * 0.30, 36 * scale, 32 * scale);
    });
    // 5. Held Weapon & Gripping Hand
    withLimbHighlight('right_arm', () => {
      if (!severedLimbs.has('right_arm')) {
        drawDetailedWeapon(ctx, 'broken_knight', 'right', cx + 22 * scale, destH * 0.55, scale, isTelegraphing);
        drawGrippingHand(ctx, cx + 22 * scale, destH * 0.55, scale, '#475569', 0.22);
      }
    });
    ctx.restore();
    return;
  }

  if (spriteKey === 'summon_ghoul' || spriteKey === 'summon_skeleton' || spriteKey === 'summon_wraith' || spriteKey === 'summon_child_12') {
    const auraCol = spriteKey === 'summon_wraith' ? 'rgba(168,85,247,0.45)' : spriteKey === 'summon_child_12' ? 'rgba(125,211,252,0.42)' : 'rgba(74,222,128,0.32)';
    const aura = ctx.createRadialGradient(cx, destH * 0.46, 4 * scale, cx, destH * 0.46, 32 * scale);
    aura.addColorStop(0, auraCol);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, destH * 0.46, 32 * scale, 0, Math.PI * 2);
    ctx.fill();

    if (spriteKey === 'summon_skeleton') {
      if (!severedLimbs.has('right_arm')) {
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 3.8 * scale;
        ctx.beginPath();
        ctx.moveTo(cx + 8 * scale, destH * 0.34);
        ctx.lineTo(cx + 21 * scale, destH * 0.50);
        ctx.stroke();
      }
      // Head before spine
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.arc(cx, destH * 0.19, 10 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx - 4 * scale, destH * 0.18, 2.5 * scale, 2.5 * scale);
      ctx.fillRect(cx + 1.5 * scale, destH * 0.18, 2.5 * scale, 2.5 * scale);
      // Spine & legs
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 4.5 * scale;
      ctx.beginPath();
      ctx.moveTo(cx, destH * 0.24);
      ctx.lineTo(cx, destH * 0.58);
      ctx.moveTo(cx - 8 * scale, destH * 0.58);
      ctx.lineTo(cx - 10 * scale, destH * 0.88);
      ctx.moveTo(cx + 8 * scale, destH * 0.58);
      ctx.lineTo(cx + 10 * scale, destH * 0.88);
      ctx.stroke();
      if (!severedLimbs.has('right_arm')) {
        drawDetailedWeapon(ctx, 'black_bone_skeleton', 'right', cx + 21 * scale, destH * 0.50, scale, isTelegraphing);
        drawGrippingHand(ctx, cx + 21 * scale, destH * 0.50, scale, '#27272a', 0.24);
      }
    } else if (spriteKey === 'summon_wraith') {
      ctx.fillStyle = 'rgba(88, 28, 135, 0.82)';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(cx, destH * 0.12);
      ctx.lineTo(cx + 22 * scale, destH * 0.82);
      ctx.lineTo(cx, destH * 0.72);
      ctx.lineTo(cx - 22 * scale, destH * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (spriteKey === 'summon_child_12') {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.78)';
      ctx.beginPath();
      ctx.arc(cx, destH * 0.42, 8.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 9 * scale, destH * 0.50, 18 * scale, 28 * scale);
    } else {
      // summon_ghoul: head before torso
      ctx.fillStyle = '#4d7c0f';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.arc(cx, destH * 0.24, 10 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(cx - 18 * scale, destH * 0.34, 36 * scale, 30 * scale);
      ctx.strokeRect(cx - 18 * scale, destH * 0.34, 36 * scale, 30 * scale);
    }
    ctx.restore();
    return;
  }

  // =========================================================================
  // PLAYABLE CLASSES & GRIMDARK CHURCH / DUNGEON HUMANOIDS
  // (`fallen_knight`, `forsaken_nun`, `night_hunter`, `fanatic_zealot`, `rotting_priest`,
  //  `weeping_inquisitor`, `flagellant_monk`, `crypt_keybearer`, `armored_ghoul`, `orc_berserker`, `forge_goblin`)
  // =========================================================================
  const torsoWidthMult =
    spriteKey === 'orc_berserker' || spriteKey === 'armored_ghoul'
      ? 1.25
      : spriteKey === 'forsaken_nun'
      ? 0.94
      : 1.15;

  // 1. Broad Multi-Layered Back Cloak / Tattered Nun Skirt / Hunter Trench Hem
  const capeGrad = ctx.createLinearGradient(cx, destH * 0.24, cx, destH * 0.88);
  capeGrad.addColorStop(
    0,
    spriteKey === 'fallen_knight'
      ? '#991b1b'
      : spriteKey === 'forsaken_nun'
      ? '#38242d'
      : spriteKey === 'night_hunter'
      ? '#2e4232'
      : garbMid
  );
  capeGrad.addColorStop(1, spriteKey === 'fallen_knight' ? '#450a0a' : '#09070b');
  ctx.fillStyle = capeGrad;
  ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
  ctx.lineWidth = Math.max(0.85, 1.05 * scale);
  ctx.beginPath();
  ctx.moveTo(cx - 26 * scale * torsoWidthMult, destH * 0.28);
  ctx.lineTo(cx - 34 * scale * torsoWidthMult, destH * 0.86);
  ctx.lineTo(cx - 20 * scale, destH * 0.81);
  ctx.lineTo(cx - 10 * scale, destH * 0.88);
  ctx.lineTo(cx, destH * 0.82);
  ctx.lineTo(cx + 10 * scale, destH * 0.88);
  ctx.lineTo(cx + 20 * scale, destH * 0.81);
  ctx.lineTo(cx + 34 * scale * torsoWidthMult, destH * 0.86);
  ctx.lineTo(cx + 26 * scale * torsoWidthMult, destH * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. LEGS + Gravity Collapse / Tilted Stance Sync
  const leftLegSevered = severedLimbs.has('left_leg') || severedLimbs.has('legs');
  const rightLegSevered = severedLimbs.has('legs');
  const bothLegsSevered = leftLegSevered && rightLegSevered;
  const oneLegSevered = leftLegSevered !== rightLegSevered;
  const legDropY = bothLegsSevered ? 24 * scale : oneLegSevered ? 8 * scale : 0;
  const legTilt = bothLegsSevered ? 0.08 : oneLegSevered ? (leftLegSevered ? -0.11 : 0.11) : 0;
  const useArmoredStump = isArmoredKnight || spriteKey === 'armored_ghoul' || spriteKey === 'fallen_knight';

  const drawLayeredLeg = (dir: -1 | 1, isSevered: boolean) => {
    const lx = cx + dir * 14 * scale;
    if (isSevered) {
      if (useArmoredStump) {
        drawArmoredSeveredStump(ctx, lx, destH * 0.62 + legDropY, 8.5 * scale, scale);
      } else {
        drawArterialStump(ctx, lx, destH * 0.62 + legDropY, 8.5 * scale);
      }
      return;
    }
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    const thighGrad = ctx.createLinearGradient(lx - 8 * scale, destH * 0.56, lx + 8 * scale, destH * 0.75);
    thighGrad.addColorStop(0, garbLight);
    thighGrad.addColorStop(1, '#070509');
    ctx.fillStyle = thighGrad;
    ctx.beginPath();
    ctx.moveTo(cx + dir * 4 * scale, destH * 0.56 + legDropY * 0.35);
    ctx.quadraticCurveTo(cx + dir * 25 * scale, destH * 0.66, cx + dir * 20 * scale, destH * 0.76);
    ctx.lineTo(cx + dir * 6 * scale, destH * 0.76);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle =
      spriteKey === 'fallen_knight'
        ? '#5c3018'
        : isArmoredKnight
        ? '#475569'
        : spriteKey === 'night_hunter'
        ? '#5c3018'
        : '#1c1412';
    ctx.beginPath();
    ctx.moveTo(cx + dir * 6 * scale, destH * 0.75);
    ctx.lineTo(cx + dir * 20 * scale, destH * 0.75);
    ctx.lineTo(cx + dir * 22 * scale, destH * 0.90);
    ctx.lineTo(cx + dir * 5 * scale, destH * 0.90);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  withLimbHighlight('legs', () => {
    drawLayeredLeg(-1, leftLegSevered);
    drawLayeredLeg(1, rightLegSevered);
  });

  // Apply gravity drop & balance tilt to Arms, Head, and Torso when 1 or both legs are severed
  ctx.save();
  if (legDropY !== 0 || legTilt !== 0) {
    ctx.translate(cx, destH * 0.60 + legDropY);
    ctx.rotate(legTilt);
    ctx.translate(-cx, -destH * 0.60);
  }

  const tw = 24 * scale * torsoWidthMult * torsoExpandX;
  const humanoidHandCol =
    spriteKey === 'fallen_knight'
      ? '#64748b'
      : spriteKey === 'armored_ghoul'
      ? '#475569'
      : fleshMid;

  // 2b. LEFT & RIGHT ARMS (drawn BEFORE head & torso so shoulder joints stay cleanly tucked beneath torso/pauldrons)
  withLimbHighlight('left_arm', () => {
    if (!severedLimbs.has('left_arm')) {
      ctx.save();
      ctx.translate(leftArmSwayX, leftArmBobY);
      ctx.fillStyle = fleshMid;
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.moveTo(cx - tw * 0.9, destH * 0.31);
      ctx.bezierCurveTo(cx - 44 * scale, destH * 0.37, cx - 44 * scale, destH * 0.53, cx - 31 * scale, destH * 0.59);
      ctx.lineTo(cx - 21 * scale, destH * 0.54);
      ctx.bezierCurveTo(cx - 28 * scale, destH * 0.46, cx - 26 * scale, destH * 0.38, cx - tw * 0.8, destH * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  });
  withLimbHighlight('right_arm', () => {
    if (!severedLimbs.has('right_arm')) {
      ctx.save();
      ctx.translate(rightArmSwayX, rightArmBobY);
      ctx.fillStyle = fleshMid;
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.beginPath();
      ctx.moveTo(cx + tw * 0.9, destH * 0.31);
      ctx.bezierCurveTo(cx + 44 * scale, destH * 0.37, cx + 44 * scale, destH * 0.53, cx + 31 * scale, destH * 0.59);
      ctx.lineTo(cx + 21 * scale, destH * 0.54);
      ctx.bezierCurveTo(cx + 28 * scale, destH * 0.46, cx + 26 * scale, destH * 0.38, cx + tw * 0.8, destH * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  });

  // 3. HEAD / HOOD / HELM (drawn BEFORE torso so cổ áo & viền giáp ngực che gọn phần cổ)
  withLimbHighlight('head', () => {
    if (!severedLimbs.has('head')) {
      ctx.save();
      ctx.translate(headSwayX, headBobY);

      const hoodGrad = ctx.createLinearGradient(cx, destH * 0.06, cx, destH * 0.32);
      hoodGrad.addColorStop(0, garbLight);
      hoodGrad.addColorStop(0.6, garbMid);
      hoodGrad.addColorStop(1, '#070509');
      ctx.fillStyle = hoodGrad;
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);

      if (spriteKey === 'forsaken_nun') {
        // Ivory-cream veil with antique gold trim & pale blonde hair peeking under edge
        ctx.fillStyle = '#e6dcc0';
        ctx.strokeStyle = '#c5a059';
        ctx.beginPath();
        ctx.moveTo(cx, destH * 0.05);
        ctx.bezierCurveTo(cx + 24 * scale, destH * 0.08, cx + 26 * scale, destH * 0.28, cx + 22 * scale, destH * 0.36);
        ctx.lineTo(cx - 22 * scale, destH * 0.36);
        ctx.bezierCurveTo(cx - 26 * scale, destH * 0.28, cx - 24 * scale, destH * 0.08, cx, destH * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Subtle blonde hair locks framing the face
        ctx.fillStyle = '#d4b475';
        ctx.fillRect(cx - 14 * scale, destH * 0.14, 4 * scale, 16 * scale);
        ctx.fillRect(cx + 10 * scale, destH * 0.14, 4 * scale, 16 * scale);
        ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      } else if (spriteKey === 'night_hunter') {
        // Pointed dark moss-green hunter hood (khớp Khung III)
        ctx.fillStyle = '#2e4232';
        ctx.beginPath();
        ctx.moveTo(cx, destH * 0.03);
        ctx.bezierCurveTo(cx + 21 * scale, destH * 0.10, cx + 23 * scale, destH * 0.26, cx + 18 * scale, destH * 0.33);
        ctx.quadraticCurveTo(cx, destH * 0.30, cx - 18 * scale, destH * 0.33);
        ctx.bezierCurveTo(cx - 23 * scale, destH * 0.26, cx - 21 * scale, destH * 0.10, cx, destH * 0.03);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (spriteKey !== 'fallen_knight') {
        ctx.beginPath();
        ctx.moveTo(cx, destH * 0.06);
        ctx.bezierCurveTo(cx + 22 * scale, destH * 0.09, cx + 24 * scale, destH * 0.27, cx + 19 * scale, destH * 0.32);
        ctx.quadraticCurveTo(cx, destH * 0.29, cx - 19 * scale, destH * 0.32);
        ctx.bezierCurveTo(cx - 24 * scale, destH * 0.27, cx - 22 * scale, destH * 0.09, cx, destH * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (spriteKey === 'fallen_knight') {
        // Clean rounded steel sallet/barbute knight helm matching Frame 3
        const helmGrad = ctx.createLinearGradient(cx - 13 * scale, destH * 0.08, cx + 13 * scale, destH * 0.31);
        helmGrad.addColorStop(0, '#94a3b8');
        helmGrad.addColorStop(0.6, '#64748b');
        helmGrad.addColorStop(1, '#334155');
        ctx.fillStyle = helmGrad;
        ctx.beginPath();
        ctx.ellipse(cx, destH * 0.195, 13 * scale, 14 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#070509';
        ctx.fillRect(cx - 8.5 * scale, destH * 0.175, 17 * scale, 3 * scale);
        ctx.fillRect(cx - 1.8 * scale, destH * 0.175, 3.6 * scale, 11 * scale);
        if (isBlinded) {
          drawBlindedEyeSlash(ctx, cx, destH * 0.19, 9.5 * scale, scale);
        }
      } else {
        ctx.fillStyle = spriteKey === 'night_hunter' ? '#1c1816' : fleshLight;
        ctx.beginPath();
        ctx.ellipse(cx, destH * 0.205, 11.5 * scale, 12.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Iron nails driven into flagellant_monk skull
        if (spriteKey === 'flagellant_monk') {
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.8 * scale;
          for (const nx of [-7, 0, 7]) {
            ctx.beginPath();
            ctx.moveTo(cx + nx * scale, destH * 0.10);
            ctx.lineTo(cx + nx * 1.3 * scale, destH * 0.03);
            ctx.stroke();
          }
        }

        ctx.fillStyle = '#070509';
        ctx.beginPath();
        ctx.ellipse(cx - 4.8 * scale, destH * 0.19, 3.4 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 4.8 * scale, destH * 0.19, 3.4 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (!isBlinded) {
          ctx.fillStyle = eyeColor;
          ctx.beginPath();
          ctx.arc(cx - 4.8 * scale, destH * 0.19, 1.7 * scale, 0, Math.PI * 2);
          ctx.arc(cx + 4.8 * scale, destH * 0.19, 1.7 * scale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawBlindedEyeSlash(ctx, cx, destH * 0.19, 8.5 * scale, scale);
        }

        if (spriteKey === 'forsaken_nun') {
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 1.6 * scale;
          ctx.beginPath();
          ctx.moveTo(cx - 7 * scale, destH * 0.21);
          ctx.lineTo(cx - 2 * scale, destH * 0.26);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (useArmoredStump) {
      drawArmoredSeveredStump(ctx, cx, destH * 0.26 + torsoBreathY, 9 * scale, scale);
    } else {
      drawArterialStump(ctx, cx, destH * 0.26 + torsoBreathY, 9 * scale);
    }
  });

  // 4. TORSO / ARMOR / BELT (With 45% Grimdark Ink Shadow Block & Rot/Nails Details)
  withLimbHighlight('torso', () => {
    ctx.save();
    ctx.translate(0, torsoBreathY);
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    const torsoGrad = ctx.createRadialGradient(cx, cy - 6 * scale, 4 * scale, cx, cy, 36 * scale);
    torsoGrad.addColorStop(0, fleshLight);
    torsoGrad.addColorStop(0.5, fleshMid);
    torsoGrad.addColorStop(1, '#070509');
    ctx.fillStyle = torsoGrad;

    ctx.beginPath();
    ctx.moveTo(cx - tw, destH * 0.29);
    ctx.bezierCurveTo(cx - tw * 1.15, destH * 0.44, cx - tw * 0.9, destH * 0.55, cx - tw * 0.75, destH * 0.60);
    ctx.lineTo(cx + tw * 0.75, destH * 0.60);
    ctx.bezierCurveTo(cx + tw * 0.9, destH * 0.55, cx + tw * 1.15, destH * 0.44, cx + tw, destH * 0.29);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (spriteKey !== 'flagellant_monk') {
      const vestGrad = ctx.createLinearGradient(cx - tw, destH * 0.29, cx + tw, destH * 0.62);
      vestGrad.addColorStop(0, garbLight);
      vestGrad.addColorStop(0.5, garbMid);
      vestGrad.addColorStop(1, '#070509');
      ctx.fillStyle = vestGrad;
      ctx.beginPath();
      ctx.moveTo(cx - tw * 0.96, destH * 0.30);
      ctx.lineTo(cx - 7 * scale, destH * 0.30);
      ctx.lineTo(cx - 2 * scale, destH * 0.44);
      ctx.lineTo(cx + 2 * scale, destH * 0.44);
      ctx.lineTo(cx + 7 * scale, destH * 0.30);
      ctx.lineTo(cx + tw * 0.96, destH * 0.30);
      ctx.lineTo(cx + tw * 0.80, destH * 0.62);
      ctx.lineTo(cx - tw * 0.80, destH * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Flagellant Monk: Bare chest pierced with iron nails & bleeding lash marks
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.2 * scale;
      for (let w = -1; w <= 1; w++) {
        ctx.beginPath();
        ctx.moveTo(cx - 14 * scale, destH * (0.36 + w * 0.06));
        ctx.lineTo(cx + 14 * scale, destH * (0.42 + w * 0.06));
        ctx.stroke();
      }
      ctx.strokeStyle = '#cbd5e1';
      for (const nx of [-16, -9, 9, 16]) {
        ctx.beginPath();
        ctx.moveTo(cx + nx * scale, destH * 0.32);
        ctx.lineTo(cx + nx * 1.25 * scale, destH * 0.24);
        ctx.stroke();
      }
    }

    // Maggots & decomposing patches on rotting_priest & armored_ghoul
    if (spriteKey === 'rotting_priest' || spriteKey === 'armored_ghoul') {
      ctx.fillStyle = '#fef08a';
      for (const [mx, my] of [[-10, 0.38], [8, 0.44], [-6, 0.50], [12, 0.52]]) {
        ctx.beginPath();
        ctx.ellipse(cx + mx * scale, destH * my, 2.5 * scale, 1.2 * scale, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (spriteKey === 'night_hunter') {
      // Diagonal slung crossbow peeking over right shoulder + crossed leather chest straps + hip pouch
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 18 * scale, destH * 0.31);
      ctx.lineTo(cx + 16 * scale, destH * 0.56);
      ctx.moveTo(cx + 18 * scale, destH * 0.31);
      ctx.lineTo(cx - 16 * scale, destH * 0.56);
      ctx.stroke();
      // Slung crossbow prod behind shoulder
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.6 * scale;
      ctx.beginPath();
      ctx.arc(cx + 20 * scale, destH * 0.25, 11 * scale, -Math.PI * 0.7, Math.PI * 0.25);
      ctx.stroke();
      // Hip leather pouch
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(cx + 12 * scale, destH * 0.54, 8 * scale, 8 * scale);
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      ctx.strokeRect(cx + 12 * scale, destH * 0.54, 8 * scale, 8 * scale);
    } else if (spriteKey === 'forsaken_nun') {
      // Cream ivory wimple collar over tattered dark nun habit
      ctx.fillStyle = '#e6dcc0';
      ctx.strokeStyle = '#c5a059';
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 14 * scale, destH * 0.30);
      ctx.quadraticCurveTo(cx, destH * 0.40, cx + 14 * scale, destH * 0.30);
      ctx.lineTo(cx + 9 * scale, destH * 0.28);
      ctx.lineTo(cx - 9 * scale, destH * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (spriteKey === 'fallen_knight') {
      // Rounded Steel Shoulder Pauldrons
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
      ctx.lineWidth = Math.max(0.85, 1.05 * scale);
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + dir * 23 * scale, destH * 0.33, 10 * scale, 7 * scale, dir * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (spriteKey === 'armored_ghoul') {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.6 * scale;
      ctx.setLineDash([4 * scale, 2 * scale]);
      ctx.beginPath();
      ctx.moveTo(cx - 24 * scale, destH * 0.38);
      ctx.quadraticCurveTo(cx, destH * 0.52, cx + 26 * scale, destH * 0.85);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#29170e';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.78)';
    ctx.lineWidth = Math.max(0.85, 1.05 * scale);
    ctx.fillRect(cx - tw * 0.78, destH * 0.55, tw * 1.56, 6 * scale);
    ctx.strokeRect(cx - tw * 0.78, destH * 0.55, tw * 1.56, 6 * scale);
    ctx.restore();
  });

  // 5. WEAPONS / SHIELDS / HELD PROPS & SEVERED SHOULDER STUMPS (drawn AFTER arms, head & torso)
  withLimbHighlight('left_arm', () => {
    if (!severedLimbs.has('left_arm')) {
      const isLeftLargeShield =
        spriteKey === 'executioner_paladin' ||
        spriteKey === 'fallen_knight' ||
        spriteKey === 'dullahan_knight';
      const leftGripX = isLeftLargeShield ? cx - 30 * scale : cx - 28.5 * scale;
      const leftGripY = isLeftLargeShield ? destH * 0.54 : destH * 0.555;
      ctx.save();
      ctx.translate(leftArmSwayX, leftArmBobY);
      drawDetailedWeapon(ctx, spriteKey, 'left', leftGripX, leftGripY, scale, isTelegraphing);
      if (!isLeftLargeShield) {
        drawGrippingHand(ctx, leftGripX, leftGripY, scale, humanoidHandCol, -0.22);
      }
      ctx.restore();
    } else if (useArmoredStump) {
      drawArmoredSeveredStump(ctx, cx - tw * 0.9, destH * 0.36 + torsoBreathY, 8.5 * scale, scale);
    } else {
      drawArterialStump(ctx, cx - tw * 0.9, destH * 0.36 + torsoBreathY, 8.5 * scale);
    }
  });

  withLimbHighlight('right_arm', () => {
    if (!severedLimbs.has('right_arm')) {
      const rightGripX = cx + 28.5 * scale;
      const rightGripY = destH * 0.555;
      ctx.save();
      ctx.translate(rightArmSwayX, rightArmBobY);
      drawDetailedWeapon(ctx, spriteKey, 'right', rightGripX, rightGripY, scale, isTelegraphing);
      drawGrippingHand(ctx, rightGripX, rightGripY, scale, humanoidHandCol, 0.22);
      ctx.restore();
    } else if (useArmoredStump) {
      drawArmoredSeveredStump(ctx, cx + tw * 0.9, destH * 0.36 + torsoBreathY, 8.5 * scale, scale);
    } else {
      drawArterialStump(ctx, cx + tw * 0.9, destH * 0.36 + torsoBreathY, 8.5 * scale);
    }
  });

  ctx.restore();
  ctx.restore();
}

/**
 * Draws the First-Person Foreground Back-Sprite of a Party Member
 * Matching Frame 3 character silhouettes:
 * - fallen_knight: Steel Plate Pauldrons, Smooth Rounded Steel Helm, Crimson Red Cape, Steel Broadsword
 * - forsaken_nun: Ivory Gold-Trimmed Veil over Pale Hair, Tattered Dark Plum-Charcoal Habit, Flanged Steel Mace
 * - night_hunter: Pointed Moss-Green Hood, Belted Trench Coat + Crossed Straps + Slung Crossbow, Curved Steel Dagger
 */
export function drawPartyBackSprite(
  ctx: CanvasRenderingContext2D,
  classId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  limbs: { leftArm: boolean; rightArm: boolean },
  isAttacking: boolean = false,
  isHit: boolean = false,
  floor: 1 | 2 | 3 = 2,
  nowSec: number = 0,
  combatSpriteUrl?: string
) {
  // High-Resolution Transparent PNG Back-Sprite Pipeline (with destination-out missing-arm mask)
  // Automatically falls back to the smooth Dark Gothic Canvas back-sprite below when PNG is absent/loading.
  const backUrl = combatSpriteUrl || HERO_BACK_PNG_URLS[classId];
  if (backUrl) {
    const backImg = loadCombatImage(backUrl);
    if (backImg) {
      const offsetX = isAttacking ? 20 : isHit ? -12 : 0;
      const offsetY = isAttacking ? -26 : isHit ? 10 : 0;
      const heroSevered = new Set<string>();
      if (!limbs.leftArm) heroSevered.add('left_arm');
      if (!limbs.rightArm) heroSevered.add('right_arm');
      const rendered = drawCombatPngSprite(
        ctx,
        backImg,
        x + offsetX,
        y + offsetY,
        w,
        h,
        heroSevered,
        undefined,
        isHit,
        false,
        false,
        false,
        nowSec
      );
      if (rendered) return;
    }
  }

  ctx.save();
  const offsetX = isAttacking ? 20 : isHit ? -12 : 0;
  const offsetY = isAttacking ? -26 : isHit ? 10 : 0;
  ctx.translate(x + offsetX, y + offsetY);
  const rimCol =
    floor === 3 ? 'rgba(216, 180, 254, 0.85)' : floor === 1 ? 'rgba(251, 146, 60, 0.82)' : 'rgba(245, 200, 130, 0.72)';

  // Special shorter silhouette for Child 13 & Vong Linh Thánh Tử 12
  if (classId === 'child_13' || classId === 'summon_child_12') {
    const isSpecter = classId === 'summon_child_12';
    ctx.globalAlpha = isSpecter ? 0.82 : 1;
    // 1. Bleached white hair / small child head (drawn BEFORE torso robe)
    ctx.fillStyle = isSpecter ? '#e0f2fe' : '#f8fafc';
    ctx.strokeStyle = isSpecter ? '#38bdf8' : '#0d0a10';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(w * 0.50, h * 0.46, w * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 2. Child robe
    ctx.fillStyle = isHit ? '#dc2626' : isSpecter ? '#bae6fd' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h);
    ctx.lineTo(w * 0.34, h * 0.56);
    ctx.lineTo(w * 0.66, h * 0.56);
    ctx.lineTo(w * 0.72, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (classId === 'child_13') {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
      ctx.beginPath();
      ctx.arc(w * 0.24, h * 0.68, 6, 0, Math.PI * 2);
      ctx.arc(w * 0.76, h * 0.68, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Severed brass extraction tubes trailing from back
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.44, h * 0.62);
      ctx.lineTo(w * 0.30, h * 0.88);
      ctx.moveTo(w * 0.56, h * 0.62);
      ctx.lineTo(w * 0.70, h * 0.88);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Distinct undead summons (Ghoul, Black Skeleton, Wraith)
  if (classId === 'summon_wraith') {
    ctx.globalAlpha = 0.85;
    const wGrad = ctx.createLinearGradient(0, h * 0.16, 0, h);
    wGrad.addColorStop(0, isHit ? '#dc2626' : '#6b21a8');
    wGrad.addColorStop(1, 'rgba(15, 5, 28, 0.1)');
    ctx.fillStyle = wGrad;
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.50, h * 0.14);
    ctx.quadraticCurveTo(w * 0.88, h * 0.36, w * 0.86, h);
    ctx.lineTo(w * 0.65, h * 0.88);
    ctx.lineTo(w * 0.50, h * 0.98);
    ctx.lineTo(w * 0.35, h * 0.88);
    ctx.lineTo(w * 0.14, h);
    ctx.quadraticCurveTo(w * 0.12, h * 0.36, w * 0.50, h * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (classId === 'summon_skeleton') {
    // 1. Weapon
    if (limbs.rightArm) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.72, h * 0.56);
      ctx.lineTo(w * 0.88, h * 0.14);
      ctx.stroke();
    }
    // 2. Skull (drawn BEFORE spine/torso)
    ctx.fillStyle = '#27272a';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(w * 0.50, h * 0.22, w * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 3. Spine & Ribcage
    ctx.strokeStyle = isHit ? '#dc2626' : '#27272a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w * 0.50, h * 0.30);
    ctx.lineTo(w * 0.50, h * 0.95);
    ctx.stroke();
    ctx.lineWidth = 4;
    for (const ry of [0.40, 0.50, 0.60, 0.70]) {
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * ry);
      ctx.lineTo(w * 0.72, h * ry);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (classId === 'summon_ghoul') {
    // 1. Head (drawn BEFORE torso)
    ctx.fillStyle = '#4d7c0f';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = 1.44;
    ctx.beginPath();
    ctx.arc(w * 0.50, h * 0.24, w * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 2. Torso
    ctx.fillStyle = isHit ? '#dc2626' : '#3f6212';
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h);
    ctx.quadraticCurveTo(w * 0.16, h * 0.38, w * 0.50, h * 0.28);
    ctx.quadraticCurveTo(w * 0.84, h * 0.38, w * 0.82, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  const cloakLight = isHit
    ? '#dc2626'
    : classId === 'ally_kael'
    ? '#57534e'
    : classId === 'broken_knight'
    ? '#475569'
    : classId === 'fallen_knight'
    ? '#991b1b'
    : classId === 'forsaken_nun'
    ? '#3a252e'
    : '#2e4232';
  const cloakDark = classId === 'fallen_knight' ? '#450a0a' : '#09070c';

  // 0. Right Arm Class Weapon (drawn BEHIND headgear, back cloak & shoulder pauldrons)
  if (limbs.rightArm) {
    if (classId === 'forsaken_nun') {
      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.75, h * 0.58);
      ctx.lineTo(w * 0.90, h * 0.15);
      ctx.stroke();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3.8;
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#0d0a10';
      ctx.lineWidth = 1.2;
      for (let f = 0; f < 6; f++) {
        const ang = (f / 6) * Math.PI * 2;
        const hx = w * 0.90;
        const hy = h * 0.14;
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(ang - 0.25) * 5, hy + Math.sin(ang - 0.25) * 5);
        ctx.lineTo(hx + Math.cos(ang) * 14, hy + Math.sin(ang) * 14);
        ctx.lineTo(hx + Math.cos(ang + 0.25) * 5, hy + Math.sin(ang + 0.25) * 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (classId === 'night_hunter') {
      const dagGrad = ctx.createLinearGradient(w * 0.72, h * 0.55, w * 0.96, h * 0.10);
      dagGrad.addColorStop(0, '#64748b');
      dagGrad.addColorStop(0.6, '#e2e8f0');
      dagGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = dagGrad;
      ctx.strokeStyle = '#0d0a10';
      ctx.lineWidth = 1.44;
      ctx.beginPath();
      ctx.moveTo(w * 0.75, h * 0.55);
      ctx.quadraticCurveTo(w * 0.98, h * 0.32, w * 0.86, h * 0.10);
      ctx.quadraticCurveTo(w * 0.88, h * 0.34, w * 0.69, h * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(w * 0.86, h * 0.11);
      ctx.quadraticCurveTo(w * 0.96, h * 0.32, w * 0.76, h * 0.54);
      ctx.stroke();
    } else if (classId === 'ally_kael') {
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#0d0a10';
      ctx.lineWidth = 1.32;
      ctx.beginPath();
      ctx.moveTo(w * 0.74, h * 0.58);
      ctx.lineTo(w * 0.88, h * 0.16);
      ctx.lineTo(w * 0.94, h * 0.19);
      ctx.lineTo(w * 0.80, h * 0.60);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const bladeGrad = ctx.createLinearGradient(w * 0.74, h * 0.56, w * 0.96, h * 0.02);
      bladeGrad.addColorStop(0, '#475569');
      bladeGrad.addColorStop(0.55, '#cbd5e1');
      bladeGrad.addColorStop(1, '#f8fafc');
      ctx.fillStyle = bladeGrad;
      ctx.strokeStyle = '#0d0a10';
      ctx.lineWidth = 1.44;
      ctx.beginPath();
      ctx.moveTo(w * 0.73, h * 0.56);
      ctx.lineTo(w * 0.92, h * 0.04);
      ctx.lineTo(w * 0.99, h * 0.08);
      ctx.lineTo(w * 0.81, h * 0.59);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rim highlight along sword edge + dried blood near tip
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(w * 0.74, h * 0.55);
      ctx.lineTo(w * 0.92, h * 0.05);
      ctx.stroke();
      ctx.fillStyle = 'rgba(139, 0, 0, 0.72)';
      ctx.beginPath();
      ctx.moveTo(w * 0.89, h * 0.13);
      ctx.lineTo(w * 0.94, h * 0.15);
      ctx.lineTo(w * 0.91, h * 0.24);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(w * 0.67, h * 0.50);
      ctx.lineTo(w * 0.87, h * 0.58);
      ctx.stroke();
      ctx.strokeStyle = '#c5a059';
      ctx.lineWidth = 3.2;
      ctx.stroke();
    }
  }

  // 1. Headgear from Behind (drawn BEFORE Back Cloak & Shoulder Pauldrons/Wimple Collar)
  if (classId === 'ally_kael') {
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = 1.44;
    ctx.beginPath();
    ctx.arc(w * 0.50, h * 0.24, w * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.34, h * 0.20);
    ctx.lineTo(w * 0.38, h * 0.08);
    ctx.lineTo(w * 0.48, h * 0.14);
    ctx.lineTo(w * 0.55, h * 0.06);
    ctx.lineTo(w * 0.64, h * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rimCol;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(w * 0.50, h * 0.24, w * 0.18, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (classId === 'broken_knight') {
    const bkGrad = ctx.createLinearGradient(w * 0.32, h * 0.08, w * 0.68, h * 0.38);
    bkGrad.addColorStop(0, '#94a3b8');
    bkGrad.addColorStop(0.55, '#475569');
    bkGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bkGrad;
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = 1.56;
    ctx.beginPath();
    ctx.arc(w * 0.50, h * 0.24, w * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (classId === 'forsaken_nun') {
    ctx.fillStyle = '#d4b475';
    ctx.beginPath();
    ctx.ellipse(w * 0.50, h * 0.30, w * 0.15, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    const veilGrad = ctx.createLinearGradient(w * 0.28, h * 0.08, w * 0.72, h * 0.44);
    veilGrad.addColorStop(0, '#f5eedc');
    veilGrad.addColorStop(0.55, '#d8cba8');
    veilGrad.addColorStop(1, '#7a6c52');
    ctx.fillStyle = veilGrad;
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = 1.56;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.08);
    ctx.quadraticCurveTo(w * 0.74, h * 0.12, w * 0.68, h * 0.43);
    ctx.lineTo(w * 0.32, h * 0.43);
    ctx.quadraticCurveTo(w * 0.26, h * 0.12, w * 0.5, h * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = rimCol;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(w * 0.31, h * 0.22);
    ctx.quadraticCurveTo(w * 0.50, h * 0.06, w * 0.69, h * 0.22);
    ctx.stroke();
  } else if (classId === 'night_hunter') {
    const hoodGrad = ctx.createLinearGradient(w * 0.30, h * 0.06, w * 0.70, h * 0.36);
    hoodGrad.addColorStop(0, '#4a6850');
    hoodGrad.addColorStop(0.55, '#293b2d');
    hoodGrad.addColorStop(1, '#101a12');
    ctx.fillStyle = hoodGrad;
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = 1.56;
    ctx.beginPath();
    ctx.moveTo(w * 0.50, h * 0.06);
    ctx.quadraticCurveTo(w * 0.72, h * 0.14, w * 0.68, h * 0.36);
    ctx.lineTo(w * 0.32, h * 0.36);
    ctx.quadraticCurveTo(w * 0.28, h * 0.14, w * 0.50, h * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = rimCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.34, h * 0.22);
    ctx.quadraticCurveTo(w * 0.48, h * 0.07, w * 0.66, h * 0.20);
    ctx.stroke();
  } else {
    // fallen_knight: Smooth rounded 3-tone dark steel helm + scratches + rim light
    const helmGrad = ctx.createLinearGradient(w * 0.32, h * 0.08, w * 0.68, h * 0.38);
    helmGrad.addColorStop(0, '#e2e8f0');
    helmGrad.addColorStop(0.45, '#64748b');
    helmGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = helmGrad;
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = 1.68;
    ctx.beginPath();
    ctx.arc(w * 0.50, h * 0.23, w * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(w * 0.50, h * 0.11);
    ctx.lineTo(w * 0.50, h * 0.34);
    ctx.stroke();
    // Rim light on helm crown
    ctx.strokeStyle = rimCol;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(w * 0.50, h * 0.23, w * 0.176, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  }

  // 2. Broad Back Cloak / Tattered Nun Habit / Belted Hunter Trench Coat
  const grad = ctx.createLinearGradient(0, h * 0.25, 0, h);
  grad.addColorStop(0, cloakLight);
  grad.addColorStop(1, cloakDark);
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#0d0a10';
  ctx.lineWidth = 1.56;

  if (classId === 'forsaken_nun') {
    // Slender habit flaring into jagged tattered skirt hem (matching Frame 3 Nun)
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h);
    ctx.lineTo(w * 0.23, h * 0.91);
    ctx.lineTo(w * 0.33, h * 0.99);
    ctx.lineTo(w * 0.45, h * 0.92);
    ctx.lineTo(w * 0.56, h * 0.99);
    ctx.lineTo(w * 0.68, h * 0.91);
    ctx.lineTo(w * 0.78, h * 0.99);
    ctx.lineTo(w * 0.86, h * 0.94);
    ctx.quadraticCurveTo(w * 0.80, h * 0.46, w * 0.68, h * 0.35);
    ctx.lineTo(w * 0.32, h * 0.35);
    ctx.quadraticCurveTo(w * 0.20, h * 0.46, w * 0.12, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(w * 0.08, h);
    ctx.quadraticCurveTo(w * 0.06, h * 0.42, w * 0.24, h * 0.34);
    ctx.lineTo(w * 0.76, h * 0.34);
    ctx.quadraticCurveTo(w * 0.94, h * 0.42, w * 0.92, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Deep Cloak Drapery Folds
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.58)';
  ctx.lineWidth = 2;
  for (const fx of [0.30, 0.44, 0.56, 0.70]) {
    ctx.beginPath();
    ctx.moveTo(w * fx, h * 0.42);
    ctx.quadraticCurveTo(w * (fx + 0.03), h * 0.70, w * (fx - 0.02), h * 0.94);
    ctx.stroke();
  }

  if (classId === 'night_hunter') {
    // Leather waist belt + hip pouch + crossed back straps + slung crossbow
    ctx.fillStyle = '#5c2b12';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = 1.2;
    ctx.fillRect(w * 0.21, h * 0.64, w * 0.58, h * 0.065);
    ctx.strokeRect(w * 0.21, h * 0.64, w * 0.58, h * 0.065);
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(w * 0.64, h * 0.66, w * 0.14, h * 0.12);
    ctx.strokeRect(w * 0.64, h * 0.66, w * 0.14, h * 0.12);

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.24, h * 0.36);
    ctx.lineTo(w * 0.74, h * 0.66);
    ctx.moveTo(w * 0.74, h * 0.36);
    ctx.lineTo(w * 0.24, h * 0.66);
    ctx.stroke();

    // Diagonal Slung Crossbow across the back (matching Frame 3 Hunter)
    ctx.strokeStyle = '#5c2b12';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.32, h * 0.62);
    ctx.lineTo(w * 0.74, h * 0.22);
    ctx.stroke();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.24, w * 0.16, -Math.PI * 0.75, Math.PI * 0.28);
    ctx.stroke();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(w * 0.59, h * 0.13);
    ctx.lineTo(w * 0.82, h * 0.36);
    ctx.stroke();
  } else if (classId === 'ally_kael') {
    // Broken iron wrist shackles + dangling chain links
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.strokeRect(w * 0.14, h * 0.56, 10, 6);
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.62);
    ctx.lineTo(w * 0.12, h * 0.82);
    ctx.stroke();
  }

  // 3. Shoulder Pauldrons / Wimple Collar (3-Tone Volume Shading + Rim Light + Scratches)
  if (classId === 'forsaken_nun') {
    const collarGrad = ctx.createLinearGradient(w * 0.30, h * 0.30, w * 0.70, h * 0.44);
    collarGrad.addColorStop(0, '#f3ebd4');
    collarGrad.addColorStop(0.55, '#cfc2a0');
    collarGrad.addColorStop(1, '#7a6c52');
    ctx.fillStyle = collarGrad;
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = 1.32;
    ctx.beginPath();
    ctx.moveTo(w * 0.30, h * 0.34);
    ctx.quadraticCurveTo(w * 0.50, h * 0.44, w * 0.70, h * 0.34);
    ctx.lineTo(w * 0.62, h * 0.30);
    ctx.lineTo(w * 0.38, h * 0.30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = rimCol;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(w * 0.32, h * 0.33);
    ctx.lineTo(w * 0.38, h * 0.30);
    ctx.lineTo(w * 0.62, h * 0.30);
    ctx.lineTo(w * 0.68, h * 0.33);
    ctx.stroke();
  } else if (classId !== 'ally_kael') {
    for (const dir of [-1, 1]) {
      const px = w * (0.5 + dir * 0.27);
      const pGrad = ctx.createLinearGradient(px - w * 0.14, h * 0.31, px + w * 0.14, h * 0.47);
      if (classId === 'night_hunter') {
        pGrad.addColorStop(0, '#445e49');
        pGrad.addColorStop(0.55, '#243528');
        pGrad.addColorStop(1, '#0e1710');
      } else {
        pGrad.addColorStop(0, '#cbd5e1');
        pGrad.addColorStop(0.5, '#64748b');
        pGrad.addColorStop(1, '#1e293b');
      }
      ctx.fillStyle = pGrad;
      ctx.strokeStyle = '#0d0a10';
      ctx.lineWidth = 1.56;
      ctx.beginPath();
      ctx.ellipse(px, h * 0.39, w * 0.175, h * 0.088, dir * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Armor scratches + floor rim light along top pauldron contour
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(px, h * 0.385, w * 0.165, h * 0.08, dir * 0.22, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      if (classId !== 'night_hunter') {
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px - 5, h * 0.37);
        ctx.lineTo(px + 4, h * 0.41);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/**
 * Draws sharp 64x64 Vector Illustrations for all 16 Weapons, 3 Shields, Vials, Herbs, Bone Saw & Ancient Parchment
 */
export function drawItemIcon(ctx: CanvasRenderingContext2D, itemId: string, size: number = 64) {
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  const cx = size * 0.5;
  const cy = size * 0.5;

  const bg = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.48);
  bg.addColorStop(0, '#251e28');
  bg.addColorStop(1, '#0b090e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#070608';
  ctx.lineWidth = Math.max(1.4, size * 0.032);

  if (itemId === 'ancient_ash') {
    // Pile of glowing gray-silver sacred ash with tiny rune embers
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(cx, size * 0.68, size * 0.34, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const ashGrad = ctx.createRadialGradient(cx, size * 0.5, 2, cx, size * 0.56, size * 0.34);
    ashGrad.addColorStop(0, '#f1f5f9');
    ashGrad.addColorStop(0.55, '#94a3b8');
    ashGrad.addColorStop(1, '#475569');
    ctx.fillStyle = ashGrad;
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.68);
    ctx.quadraticCurveTo(size * 0.34, size * 0.32, cx, size * 0.28);
    ctx.quadraticCurveTo(size * 0.68, size * 0.34, size * 0.8, size * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Floating ember/ash motes
    ctx.fillStyle = '#e2e8f0';
    for (const [mx, my, mr] of [
      [0.34, 0.26, 0.03],
      [0.62, 0.22, 0.025],
      [0.5, 0.16, 0.035],
    ]) {
      ctx.beginPath();
      ctx.arc(size * mx, size * my, size * mr, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (itemId === 'poison_powder') {
    // Leather toxin pouch spilling noxious green-violet powder
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.ellipse(cx, size * 0.58, size * 0.28, size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tied pouch neck
    ctx.fillStyle = '#5c3d28';
    ctx.fillRect(cx - size * 0.1, size * 0.24, size * 0.2, size * 0.12);
    ctx.strokeRect(cx - size * 0.1, size * 0.24, size * 0.2, size * 0.12);
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.14, size * 0.16);
    ctx.lineTo(cx + size * 0.14, size * 0.16);
    ctx.lineTo(cx + size * 0.08, size * 0.26);
    ctx.lineTo(cx - size * 0.08, size * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Toxic emerald-purple cloud & skull mark
    ctx.fillStyle = '#4ade80';
    for (const [px, py, pr] of [
      [0.36, 0.62, 0.055],
      [0.54, 0.54, 0.065],
      [0.66, 0.64, 0.045],
    ]) {
      ctx.beginPath();
      ctx.arc(size * px, size * py, size * pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(size * 0.45, size * 0.48, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'lamp_oil') {
    // Brass Lantern Oil Can with Curved Spout & Amber Oil Glow
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(size * 0.24, size * 0.42);
    ctx.lineTo(size * 0.64, size * 0.42);
    ctx.lineTo(size * 0.7, size * 0.8);
    ctx.lineTo(size * 0.18, size * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brass handle & curved pouring spout
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = Math.max(2.5, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(size * 0.64, size * 0.48);
    ctx.quadraticCurveTo(size * 0.86, size * 0.36, size * 0.84, size * 0.22);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.22, size * 0.58, size * 0.11, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();

    // Amber drop at spout tip & oil level band
    ctx.lineWidth = Math.max(1.4, size * 0.032);
    ctx.strokeStyle = '#070608';
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(size * 0.25, size * 0.56, size * 0.38, size * 0.14);
    ctx.beginPath();
    ctx.arc(size * 0.84, size * 0.22, size * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (
    itemId.includes('vial') ||
    itemId.includes('oil') ||
    itemId === 'holy_water' ||
    itemId === 'sedative_draught' ||
    itemId === 'holy_elixir' ||
    itemId === 'stimulant_serum' ||
    itemId === 'elixir_of_ancients' ||
    itemId === 'strong_alcohol'
  ) {
    const liquidCol =
      itemId === 'brown_vial'
        ? '#d97724'
        : itemId === 'red_vial' || itemId === 'blood_vial' || itemId === 'stimulant_serum'
        ? '#e5383b'
        : itemId === 'white_vial'
        ? '#f8f9fa'
        : itemId === 'purple_vial' || itemId === 'opium_vial'
        ? '#9d4edd'
        : itemId === 'blue_vial'
        ? '#2563eb'
        : itemId === 'holy_elixir' || itemId === 'holy_fire_oil'
        ? '#fbbf24'
        : itemId === 'elixir_of_ancients'
        ? '#10b981'
        : itemId === 'silver_sword_oil'
        ? '#cbd5e1'
        : itemId === 'void_acid_vial'
        ? '#a855f7'
        : itemId === 'strong_alcohol'
        ? '#b45309'
        : '#48cae4';

    // Cork & bottle neck
    ctx.fillStyle = '#9c6644';
    ctx.fillRect(cx - size * 0.07, size * 0.11, size * 0.14, size * 0.08);
    ctx.fillStyle = '#8d99ae';
    ctx.fillRect(cx - size * 0.09, size * 0.18, size * 0.18, size * 0.14);
    ctx.strokeRect(cx - size * 0.09, size * 0.18, size * 0.18, size * 0.14);

    // Flask bulb
    const bulbGrad = ctx.createRadialGradient(
      cx - size * 0.06,
      cy + size * 0.06,
      size * 0.03,
      cx,
      cy + size * 0.1,
      size * 0.28
    );
    bulbGrad.addColorStop(0, '#ffffff');
    bulbGrad.addColorStop(0.35, liquidCol);
    bulbGrad.addColorStop(1, '#1a0b12');
    ctx.fillStyle = bulbGrad;
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.1, size * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (itemId === 'brown_vial') {
      // Burning fuse spark for explosive brown vial
      ctx.strokeStyle = '#c9a66b';
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.12);
      ctx.quadraticCurveTo(cx + size * 0.16, size * 0.04, cx + size * 0.22, size * 0.12);
      ctx.stroke();
      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath();
      ctx.arc(cx + size * 0.22, size * 0.12, size * 0.065, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (itemId === 'bandage') {
    // Medical Gauze Roll + Crimson Blood Cross
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.roundRect(size * 0.18, size * 0.24, size * 0.56, size * 0.48, size * 0.08);
    ctx.fill();
    ctx.stroke();

    // Inner roll spiral on top
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.ellipse(size * 0.46, size * 0.28, size * 0.18, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Loose gauze strip tail
    ctx.fillStyle = '#d1d5db';
    ctx.beginPath();
    ctx.moveTo(size * 0.72, size * 0.52);
    ctx.lineTo(size * 0.88, size * 0.64);
    ctx.lineTo(size * 0.82, size * 0.78);
    ctx.lineTo(size * 0.68, size * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red Cross / Blood stain emblem
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(size * 0.42, size * 0.37, size * 0.08, size * 0.24);
    ctx.fillRect(size * 0.34, size * 0.45, size * 0.24, size * 0.08);
  } else if (itemId.includes('herb') || itemId === 'calm_flower' || itemId === 'herbal_salve') {
    if (itemId === 'herbal_salve') {
      // Mortar jar of green healing salve
      ctx.fillStyle = '#4a3b32';
      ctx.fillRect(size * 0.22, size * 0.36, size * 0.56, size * 0.44);
      ctx.strokeRect(size * 0.22, size * 0.36, size * 0.56, size * 0.44);
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(cx, size * 0.36, size * 0.26, size * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (itemId === 'poison_herb') {
      // Venomous Serrated Dark-Emerald & Violet Herb with dripping toxin droplets
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.14);
      ctx.lineTo(size * 0.72, size * 0.36);
      ctx.lineTo(size * 0.62, size * 0.44);
      ctx.lineTo(size * 0.78, size * 0.58);
      ctx.lineTo(cx, size * 0.84);
      ctx.lineTo(size * 0.22, size * 0.58);
      ctx.lineTo(size * 0.38, size * 0.44);
      ctx.lineTo(size * 0.28, size * 0.36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.2);
      ctx.lineTo(cx, size * 0.8);
      ctx.stroke();

      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(size * 0.76, size * 0.68, size * 0.045, 0, Math.PI * 2);
      ctx.arc(size * 0.26, size * 0.7, size * 0.04, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Botanical Herb Leaf / Calm Flower
      const isWhiteHerb = itemId === 'white_herb';
      const leafCol = itemId.includes('red')
        ? '#e11d48'
        : isWhiteHerb
        ? '#f1f5f9'
        : itemId === 'calm_flower'
        ? '#38bdf8'
        : '#34d399';
      ctx.fillStyle = leafCol;
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.14);
      ctx.quadraticCurveTo(size * 0.8, cy, cx, size * 0.84);
      ctx.quadraticCurveTo(size * 0.2, cy, cx, size * 0.14);
      ctx.fill();
      ctx.stroke();

      // Leaf center vein
      ctx.strokeStyle = isWhiteHerb ? 'rgba(148,163,184,0.75)' : 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.22);
      ctx.lineTo(cx, size * 0.78);
      ctx.stroke();
    }
  } else if (itemId === 'dried_meat' || itemId === 'rotten_meat') {
    const isRotten = itemId === 'rotten_meat';
    // Bone shaft protruding
    ctx.strokeStyle = '#e5dccb';
    ctx.lineWidth = Math.max(3, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.78);
    ctx.lineTo(size * 0.78, size * 0.22);
    ctx.stroke();

    // Haunch of meat
    ctx.lineWidth = Math.max(1.4, size * 0.032);
    ctx.strokeStyle = '#070608';
    ctx.fillStyle = isRotten ? '#4d6b3c' : '#9b2c2c';
    ctx.beginPath();
    ctx.ellipse(cx + size * 0.04, cy - size * 0.04, size * 0.26, size * 0.19, -0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fat marbling or rot spots
    ctx.fillStyle = isRotten ? '#a3e635' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(cx + size * 0.06, cy - size * 0.08, size * 0.05, 0, Math.PI * 2);
    ctx.arc(cx - size * 0.04, cy + size * 0.02, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'moldy_bread') {
    // Tavern Bread Loaf with Mold Spots
    ctx.fillStyle = '#925c2c';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.04, size * 0.34, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bread score slashes
    ctx.strokeStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.14, cy - size * 0.08);
    ctx.lineTo(cx - size * 0.06, cy + size * 0.06);
    ctx.moveTo(cx + size * 0.04, cy - size * 0.08);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.06);
    ctx.stroke();

    // Green mold patches
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.arc(cx - size * 0.16, cy + size * 0.06, size * 0.055, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.18, cy + size * 0.02, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'herbal_cigarette') {
    // Hand-rolled herbal cigarette with glowing ember & smoke wisp
    ctx.save();
    ctx.translate(cx, cy + size * 0.04);
    ctx.rotate(-0.55);
    ctx.fillStyle = '#dfd6c2';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = Math.max(1.1, size * 0.024);
    ctx.fillRect(-size * 0.3, -size * 0.055, size * 0.52, size * 0.11);
    ctx.strokeRect(-size * 0.3, -size * 0.055, size * 0.52, size * 0.11);
    // Dried herb filter end
    ctx.fillStyle = '#4d6b47';
    ctx.fillRect(-size * 0.3, -size * 0.055, size * 0.14, size * 0.11);
    // Glowing ember tip
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(size * 0.2, -size * 0.055, size * 0.08, size * 0.11);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(size * 0.24, -size * 0.035, size * 0.04, size * 0.07);
    ctx.restore();
    // Rising smoke curl
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
    ctx.lineWidth = Math.max(1.2, size * 0.03);
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.22, cy - size * 0.14);
    ctx.bezierCurveTo(cx + size * 0.14, cy - size * 0.26, cx + size * 0.3, cy - size * 0.34, cx + size * 0.2, cy - size * 0.42);
    ctx.stroke();
  } else if (itemId === 'dark_ale') {
    // Squat Dark Ale Bottle with foamy cap & weathered label
    ctx.fillStyle = '#29211d';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = Math.max(1.1, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.08, size * 0.16);
    ctx.lineTo(cx + size * 0.08, size * 0.16);
    ctx.lineTo(cx + size * 0.09, size * 0.32);
    ctx.quadraticCurveTo(cx + size * 0.22, size * 0.38, cx + size * 0.22, size * 0.52);
    ctx.lineTo(cx + size * 0.2, size * 0.84);
    ctx.lineTo(cx - size * 0.2, size * 0.84);
    ctx.lineTo(cx - size * 0.22, size * 0.52);
    ctx.quadraticCurveTo(cx - size * 0.22, size * 0.38, cx - size * 0.09, size * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cork & parchment label
    ctx.fillStyle = '#855834';
    ctx.fillRect(cx - size * 0.06, size * 0.11, size * 0.12, size * 0.06);
    ctx.fillStyle = '#c8b89a';
    ctx.fillRect(cx - size * 0.15, size * 0.49, size * 0.3, size * 0.2);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - size * 0.1, size * 0.56, size * 0.2, size * 0.05);
  } else if (itemId === 'abbey_wine') {
    // Tall Crimson Abbey Wine Bottle with wax seal
    ctx.fillStyle = '#3b0d14';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = Math.max(1.1, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.065, size * 0.13);
    ctx.lineTo(cx + size * 0.065, size * 0.13);
    ctx.lineTo(cx + size * 0.075, size * 0.34);
    ctx.quadraticCurveTo(cx + size * 0.19, size * 0.4, cx + size * 0.18, size * 0.56);
    ctx.lineTo(cx + size * 0.17, size * 0.86);
    ctx.lineTo(cx - size * 0.17, size * 0.86);
    ctx.lineTo(cx - size * 0.18, size * 0.56);
    ctx.quadraticCurveTo(cx - size * 0.19, size * 0.4, cx - size * 0.075, size * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Red wax seal top & gold cross label
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(cx - size * 0.07, size * 0.11, size * 0.14, size * 0.1);
    ctx.fillStyle = '#e7dcc8';
    ctx.fillRect(cx - size * 0.12, size * 0.5, size * 0.24, size * 0.22);
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(cx - size * 0.018, size * 0.54, size * 0.036, size * 0.14);
    ctx.fillRect(cx - size * 0.07, size * 0.585, size * 0.14, size * 0.035);
  } else if (itemId === 'salted_meat') {
    // Thick Smoked Salted Meat Slab tied with butcher twine
    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = Math.max(1.1, size * 0.026);
    ctx.beginPath();
    ctx.roundRect(size * 0.16, size * 0.28, size * 0.68, size * 0.44, size * 0.1);
    ctx.fill();
    ctx.stroke();
    // Smoked crust & marbling streaks
    ctx.fillStyle = '#451212';
    ctx.fillRect(size * 0.18, size * 0.29, size * 0.64, size * 0.1);
    ctx.strokeStyle = '#e7d7c1';
    ctx.lineWidth = Math.max(1.2, size * 0.028);
    ctx.beginPath();
    ctx.moveTo(size * 0.34, size * 0.28);
    ctx.lineTo(size * 0.34, size * 0.72);
    ctx.moveTo(size * 0.64, size * 0.28);
    ctx.lineTo(size * 0.64, size * 0.72);
    ctx.stroke();
    // Salt crystals
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(size * 0.44, size * 0.45, size * 0.04, size * 0.04);
    ctx.fillRect(size * 0.52, size * 0.56, size * 0.04, size * 0.04);
    ctx.fillRect(size * 0.24, size * 0.52, size * 0.035, size * 0.035);
  } else if (itemId === 'aged_cheese') {
    // Cellar Aged Cheese Wedge with dark wax rind & holes
    ctx.fillStyle = '#ca8a04';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = Math.max(1.1, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(size * 0.16, size * 0.56);
    ctx.lineTo(size * 0.76, size * 0.26);
    ctx.lineTo(size * 0.84, size * 0.48);
    ctx.lineTo(size * 0.84, size * 0.72);
    ctx.lineTo(size * 0.16, size * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Top face highlight
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(size * 0.16, size * 0.56);
    ctx.lineTo(size * 0.76, size * 0.26);
    ctx.lineTo(size * 0.84, size * 0.48);
    ctx.lineTo(size * 0.16, size * 0.56);
    ctx.closePath();
    ctx.fill();
    // Cheese holes
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.arc(size * 0.4, size * 0.62, size * 0.055, 0, Math.PI * 2);
    ctx.arc(size * 0.62, size * 0.58, size * 0.045, 0, Math.PI * 2);
    ctx.arc(size * 0.72, size * 0.65, size * 0.035, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'torn_cloth') {
    // Folded frayed linen scrap
    ctx.fillStyle = '#c8beac';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = Math.max(1.1, size * 0.024);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.28);
    ctx.lineTo(size * 0.72, size * 0.22);
    ctx.lineTo(size * 0.8, size * 0.54);
    ctx.lineTo(size * 0.66, size * 0.78);
    ctx.lineTo(size * 0.46, size * 0.7);
    ctx.lineTo(size * 0.24, size * 0.8);
    ctx.lineTo(size * 0.18, size * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Fold crease & thread lines
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.beginPath();
    ctx.moveTo(size * 0.24, size * 0.48);
    ctx.lineTo(size * 0.74, size * 0.42);
    ctx.moveTo(size * 0.34, size * 0.62);
    ctx.lineTo(size * 0.64, size * 0.58);
    ctx.stroke();
  } else if (itemId === 'dry_wood') {
    // Crossed weathered ash-wood branches/planks
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = Math.max(1.1, size * 0.024);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.55);
    ctx.fillStyle = '#574c44';
    ctx.fillRect(-size * 0.36, -size * 0.08, size * 0.72, size * 0.16);
    ctx.strokeRect(-size * 0.36, -size * 0.08, size * 0.72, size * 0.16);
    ctx.rotate(1.05);
    ctx.fillStyle = '#443c36';
    ctx.fillRect(-size * 0.32, -size * 0.075, size * 0.64, size * 0.15);
    ctx.strokeRect(-size * 0.32, -size * 0.075, size * 0.64, size * 0.15);
    ctx.restore();
  } else if (itemId === 'scrap_iron') {
    // Jagged rusted iron plates & bent nails
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = Math.max(1.1, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(size * 0.18, size * 0.48);
    ctx.lineTo(size * 0.46, size * 0.2);
    ctx.lineTo(size * 0.8, size * 0.36);
    ctx.lineTo(size * 0.68, size * 0.74);
    ctx.lineTo(size * 0.26, size * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Rust patina patches & metallic glint
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.arc(size * 0.42, size * 0.54, size * 0.09, 0, Math.PI * 2);
    ctx.arc(size * 0.62, size * 0.42, size * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(size * 0.28, size * 0.44);
    ctx.lineTo(size * 0.48, size * 0.26);
    ctx.stroke();
  } else if (itemId === 'pine_resin') {
    // Amber pine resin lump with warm translucent gleam
    const rGrad = ctx.createRadialGradient(cx - size * 0.06, cy - size * 0.08, size * 0.04, cx, cy, size * 0.32);
    rGrad.addColorStop(0, '#fef08a');
    rGrad.addColorStop(0.45, '#d97706');
    rGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = rGrad;
    ctx.strokeStyle = '#0d0a10';
    ctx.lineWidth = Math.max(1.1, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(cx, size * 0.16);
    ctx.bezierCurveTo(size * 0.78, size * 0.24, size * 0.82, size * 0.66, cx + size * 0.1, size * 0.82);
    ctx.bezierCurveTo(size * 0.26, size * 0.84, size * 0.16, size * 0.56, size * 0.24, size * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Specular highlight
    ctx.fillStyle = 'rgba(255, 251, 235, 0.7)';
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.08, cy - size * 0.1, size * 0.06, size * 0.11, -0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'bone_saw') {
    // Surgical Bone Saw with Wooden Handle, Steel Frame & Bloodied Teeth
    ctx.fillStyle = '#78350f';
    ctx.fillRect(size * 0.14, size * 0.44, size * 0.16, size * 0.28);
    ctx.strokeRect(size * 0.14, size * 0.44, size * 0.16, size * 0.28);

    // Saw blade
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(size * 0.28, size * 0.36, size * 0.56, size * 0.16);
    ctx.strokeRect(size * 0.28, size * 0.36, size * 0.56, size * 0.16);

    // Bloodied serrated teeth along bottom of blade
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    for (let x = size * 0.3; x < size * 0.82; x += size * 0.08) {
      ctx.moveTo(x, size * 0.52);
      ctx.lineTo(x + size * 0.04, size * 0.62);
      ctx.lineTo(x + size * 0.08, size * 0.52);
    }
    ctx.fill();
  } else if (itemId.includes('key')) {
    // Ornate Dungeon Key
    const keyCol = itemId.includes('void') ? '#c084fc' : '#eab308';
    ctx.strokeStyle = keyCol;
    ctx.lineWidth = Math.max(2.2, size * 0.055);
    ctx.beginPath();
    ctx.arc(size * 0.3, cy, size * 0.14, 0, Math.PI * 2);
    ctx.moveTo(size * 0.44, cy);
    ctx.lineTo(size * 0.82, cy);
    ctx.moveTo(size * 0.68, cy);
    ctx.lineTo(size * 0.68, cy + size * 0.14);
    ctx.moveTo(size * 0.78, cy);
    ctx.lineTo(size * 0.78, cy + size * 0.14);
    ctx.stroke();
  } else if (
    itemId === 'iron_penitent_helm' ||
    itemId === 'weeping_hood' ||
    itemId === 'ashen_hood' ||
    itemId === 'stalkers_cap' ||
    itemId === 'mail_coif' ||
    itemId === 'legion_helm' ||
    itemId === 'beak_mask' ||
    itemId === 'black_wax_crown'
  ) {
    // Headgear Icons (6 new + 2 legacy)
    ctx.fillStyle =
      itemId === 'legion_helm' || itemId === 'iron_penitent_helm'
        ? '#64748b'
        : itemId === 'mail_coif'
        ? '#94a3b8'
        : itemId === 'stalkers_cap'
        ? '#78350f'
        : itemId === 'beak_mask'
        ? '#27272a'
        : itemId === 'black_wax_crown'
        ? '#18181b'
        : '#6b7280';
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.04, size * 0.28, Math.PI, 0);
    ctx.lineTo(size * 0.78, size * 0.78);
    ctx.lineTo(size * 0.22, size * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (itemId === 'beak_mask') {
      // Plague Doctor Beak
      ctx.fillStyle = '#d6d3c4';
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.04);
      ctx.lineTo(size * 0.88, cy + size * 0.16);
      ctx.lineTo(cx, cy + size * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (itemId === 'black_wax_crown') {
      // Finger-bone spikes on crown
      ctx.fillStyle = '#fef3c7';
      for (const sx of [-0.18, 0, 0.18]) {
        ctx.fillRect(cx + size * sx - 2, size * 0.14, 4, size * 0.16);
      }
    } else {
      ctx.fillStyle = '#09070c';
      ctx.fillRect(size * 0.32, cy - size * 0.02, size * 0.36, size * 0.08);
    }
  } else if (
    itemId === 'cathedral_chainmail' ||
    itemId === 'void_woven_robe' ||
    itemId === 'goethe_cassock' ||
    itemId === 'boiled_cuirass' ||
    itemId === 'hardened_leather_cuirass' ||
    itemId === 'star_pelt_coat' ||
    itemId === 'flayed_disguise' ||
    itemId === 'vanguard_hauberk' ||
    itemId === 'legion_brigandine' ||
    itemId === 'platinum_cuirass'
  ) {
    // Body Armor / Robe Icons
    ctx.fillStyle =
      itemId === 'platinum_cuirass'
        ? '#e2e8f0'
        : itemId === 'legion_brigandine' || itemId === 'vanguard_hauberk' || itemId === 'cathedral_chainmail'
        ? '#475569'
        : itemId === 'hardened_leather_cuirass'
        ? '#6b3e1e'
        : itemId === 'boiled_cuirass'
        ? '#78350f'
        : itemId === 'flayed_disguise'
        ? '#9f1239'
        : itemId === 'star_pelt_coat'
        ? '#4c1d95'
        : '#374151';
    ctx.beginPath();
    ctx.moveTo(size * 0.28, size * 0.18);
    ctx.lineTo(size * 0.72, size * 0.18);
    ctx.lineTo(size * 0.84, size * 0.42);
    ctx.lineTo(size * 0.7, size * 0.82);
    ctx.lineTo(size * 0.3, size * 0.82);
    ctx.lineTo(size * 0.16, size * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (itemId === 'platinum_cuirass' || itemId === 'goethe_cassock') {
      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.26);
      ctx.lineTo(cx, size * 0.72);
      ctx.moveTo(size * 0.36, size * 0.42);
      ctx.lineTo(size * 0.64, size * 0.42);
      ctx.stroke();
    }
  } else if (
    itemId === 'bone_rosary_ring' ||
    itemId === 'eclipse_pendant' ||
    itemId === 'vaelis_signet' ||
    itemId === 'black_straw_effigy' ||
    itemId === 'void_beast_claw'
  ) {
    // Accessories (4 new + 1 legacy)
    if (itemId === 'black_straw_effigy') {
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - size * 0.08, size * 0.2, size * 0.16, size * 0.6);
      ctx.fillRect(size * 0.24, size * 0.36, size * 0.52, size * 0.14);
      ctx.strokeRect(cx - size * 0.08, size * 0.2, size * 0.16, size * 0.6);
    } else if (itemId === 'void_beast_claw') {
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.moveTo(size * 0.26, size * 0.24);
      ctx.quadraticCurveTo(size * 0.78, size * 0.34, size * 0.66, size * 0.82);
      ctx.quadraticCurveTo(size * 0.46, size * 0.52, size * 0.26, size * 0.24);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.strokeStyle = itemId === 'eclipse_pendant' ? '#9333ea' : '#fde68a';
      ctx.lineWidth = Math.max(2.2, size * 0.05);
      ctx.beginPath();
      ctx.arc(cx, cy - size * 0.04, size * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx - size * 0.04, size * 0.58, size * 0.08, size * 0.22);
    }
  } else if (
    itemId.includes('shield') ||
    itemId === 'rotting_targe' ||
    itemId === 'rimmed_shield' ||
    itemId === 'legion_heater' ||
    itemId === 'widows_shield' ||
    itemId === 'aegis_of_order'
  ) {
    ctx.fillStyle =
      itemId === 'aegis_of_order'
        ? '#e2e8f0'
        : itemId === 'legion_heater' || itemId.includes('iron')
        ? '#475569'
        : itemId === 'widows_shield' || itemId.includes('blood')
        ? '#4c0519'
        : '#5c3d28';
    ctx.beginPath();
    ctx.moveTo(size * 0.22, size * 0.18);
    ctx.lineTo(size * 0.78, size * 0.18);
    ctx.quadraticCurveTo(size * 0.78, size * 0.65, cx, size * 0.86);
    ctx.quadraticCurveTo(size * 0.22, size * 0.65, size * 0.22, size * 0.18);
    ctx.fill();
    ctx.stroke();
  } else if (itemId === 'lucky_coin') {
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (itemId === 'ritual_chalk') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.45);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(-size * 0.08, -size * 0.26, size * 0.16, size * 0.52);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-size * 0.08, -size * 0.26, size * 0.06, size * 0.52);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(size * 0.03, -size * 0.26, size * 0.05, size * 0.52);
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = Math.max(1.2, size * 0.03);
    ctx.strokeRect(-size * 0.08, -size * 0.26, size * 0.16, size * 0.52);
    ctx.restore();
  } else if (itemId === 'silver_coin') {
    const coinGrad = ctx.createRadialGradient(
      cx - size * 0.08,
      cy - size * 0.08,
      size * 0.04,
      cx,
      cy,
      size * 0.29
    );
    coinGrad.addColorStop(0, '#f8fafc');
    coinGrad.addColorStop(0.55, '#94a3b8');
    coinGrad.addColorStop(1, '#334155');
    ctx.fillStyle = coinGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = Math.max(1.2, size * 0.025);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
    ctx.moveTo(cx, cy - size * 0.11);
    ctx.lineTo(cx, cy + size * 0.11);
    ctx.moveTo(cx - size * 0.09, cy);
    ctx.lineTo(cx + size * 0.09, cy);
    ctx.stroke();
  } else if (itemId === 'energy_stone') {
    const esGrad = ctx.createRadialGradient(
      cx - size * 0.05,
      cy - size * 0.08,
      size * 0.03,
      cx,
      cy,
      size * 0.34
    );
    esGrad.addColorStop(0, '#f5d0fe');
    esGrad.addColorStop(0.45, '#a855f7');
    esGrad.addColorStop(1, '#3b0764');
    ctx.fillStyle = esGrad;
    ctx.beginPath();
    ctx.moveTo(cx, size * 0.14);
    ctx.lineTo(size * 0.74, size * 0.38);
    ctx.lineTo(size * 0.68, size * 0.76);
    ctx.lineTo(size * 0.32, size * 0.76);
    ctx.lineTo(size * 0.26, size * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e9d5ff';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, size * 0.14);
    ctx.lineTo(cx, size * 0.76);
    ctx.moveTo(size * 0.26, size * 0.38);
    ctx.lineTo(size * 0.74, size * 0.38);
    ctx.stroke();
  } else if (itemId === 'lockpick') {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = Math.max(2, size * 0.055);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.78);
    ctx.lineTo(size * 0.72, size * 0.26);
    ctx.lineTo(size * 0.84, size * 0.34);
    ctx.stroke();
  } else if (itemId === 'torch' || itemId === 'oil_lamp') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - size * 0.07, cy, size * 0.14, size * 0.36);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.05, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.03, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'steel_trap') {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = Math.max(2.2, size * 0.055);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(cx + i * size * 0.08 - 2, cy - size * 0.12, 4, size * 0.24);
    }
  } else if (itemId === 'void_core') {
    const vcGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.32);
    vcGrad.addColorStop(0, '#f3e8ff');
    vcGrad.addColorStop(0.45, '#9333ea');
    vcGrad.addColorStop(1, '#1e0b36');
    ctx.fillStyle = vcGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8b4fe';
    ctx.stroke();
  } else if (itemId === 'knight_ring') {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = Math.max(2.5, size * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.24, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'pure_soul_shard' || itemId === 'petrified_bone_shard') {
    ctx.fillStyle = itemId === 'pure_soul_shard' ? '#e0f2fe' : '#a8a29e';
    ctx.beginPath();
    ctx.moveTo(cx, size * 0.14);
    ctx.lineTo(size * 0.72, cy);
    ctx.lineTo(cx, size * 0.86);
    ctx.lineTo(size * 0.28, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (
    itemId === 'ancient_parchment' ||
    itemId === 'reconstruction_scroll' ||
    itemId === 'crumpled_hunter_note' ||
    itemId.startsWith('scroll_') ||
    itemId.startsWith('recipe_book_')
  ) {
    ctx.fillStyle =
      itemId === 'reconstruction_scroll'
        ? '#fde68a'
        : itemId.startsWith('recipe_book_')
        ? '#93c5fd'
        : itemId === 'crumpled_hunter_note'
        ? '#cbd5e1'
        : '#d6be96';
    ctx.fillRect(size * 0.2, size * 0.14, size * 0.6, size * 0.72);
    ctx.strokeRect(size * 0.2, size * 0.14, size * 0.6, size * 0.72);
    ctx.strokeStyle =
      itemId === 'reconstruction_scroll'
        ? '#b45309'
        : itemId.startsWith('recipe_book_')
        ? '#1d4ed8'
        : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.16, 0, Math.PI * 2);
    ctx.stroke();
  } else if (itemId === 'hunter_arrows') {
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = Math.max(2, size * 0.05);
    for (const off of [-0.14, 0, 0.14]) {
      ctx.beginPath();
      ctx.moveTo(size * (0.22 + off), size * 0.78);
      ctx.lineTo(size * (0.74 + off), size * 0.24);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(size * (0.74 + off), size * 0.24, size * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (itemId.includes('mace') || itemId.includes('sledge') || itemId.includes('bell')) {
    // Heavy Mace / Sledgehammer / Blood Bell
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(3, size * 0.075);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.8);
    ctx.lineTo(size * 0.68, size * 0.32);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.4, size * 0.032);
    ctx.strokeStyle = '#070608';
    ctx.fillStyle = itemId.includes('holy') ? '#fbbf24' : itemId.includes('cursed') ? '#9333ea' : '#94a3b8';
    ctx.beginPath();
    ctx.arc(size * 0.68, size * 0.32, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (itemId.includes('bow') || itemId.includes('whip')) {
    ctx.strokeStyle = itemId.includes('whip') ? '#dc2626' : '#a16207';
    ctx.lineWidth = Math.max(2.4, size * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.28, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
  } else if (itemId.includes('axe') || itemId.includes('cleaver') || itemId.includes('scythe')) {
    // Battle Axe / Butcher Cleaver / Reaper Scythe
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(3, size * 0.07);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.82);
    ctx.lineTo(size * 0.75, size * 0.2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.4, size * 0.032);
    ctx.strokeStyle = '#070608';
    ctx.fillStyle = itemId.includes('cursed') ? '#c084fc' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(size * 0.56, size * 0.24);
    ctx.quadraticCurveTo(size * 0.88, size * 0.36, size * 0.66, size * 0.62);
    ctx.lineTo(size * 0.46, size * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Detailed Weapon Blade + Fuller + Crossguard
    const col =
      itemId.includes('cursed') || itemId.includes('vaelis')
        ? '#dc2626'
        : itemId.includes('void')
        ? '#c77dff'
        : itemId.includes('holy')
        ? '#f4d03f'
        : '#e2e8f0';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(size * 0.22, size * 0.74);
    ctx.lineTo(size * 0.76, size * 0.16);
    ctx.lineTo(size * 0.84, size * 0.24);
    ctx.lineTo(size * 0.3, size * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = itemId.includes('cursed') ? '#c084fc' : '#d4af37';
    ctx.lineWidth = Math.max(2.5, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(size * 0.18, size * 0.62);
    ctx.lineTo(size * 0.42, size * 0.84);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws the 3 Illustrated Prologue Frames on a Canvas
 */
export function drawPrologueScene(
  ctx: CanvasRenderingContext2D,
  step: number,
  w: number,
  h: number,
  classId: string = 'fallen_knight'
) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (step === 0) {
    sky.addColorStop(0, '#14040a');
    sky.addColorStop(0.55, '#470d1b');
    sky.addColorStop(1, '#08060a');
  } else if (step === 1) {
    sky.addColorStop(0, '#0d0614');
    sky.addColorStop(0.6, '#28123d');
    sky.addColorStop(1, '#07050a');
  } else {
    sky.addColorStop(0, '#121417');
    sky.addColorStop(0.65, '#0b0c10');
    sky.addColorStop(1, '#060508');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  if (step === 0) {
    // Khung 0: Trăng Đỏ rực & bóng Lâu Đài Hắc Ám đè sập mái vòm + tháp chuông Giáo Đường Goethe
    const moonGrad = ctx.createRadialGradient(w * 0.5, h * 0.24, 14, w * 0.5, h * 0.24, 92);
    moonGrad.addColorStop(0, '#f87171');
    moonGrad.addColorStop(0.45, '#b91c1c');
    moonGrad.addColorStop(0.85, 'rgba(127, 29, 29, 0.35)');
    moonGrad.addColorStop(1, 'rgba(127, 29, 29, 0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.24, 92, 0, Math.PI * 2);
    ctx.fill();

    // Moon disc
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.24, 42, 0, Math.PI * 2);
    ctx.fill();

    // Shadow silhouette of descending Black Castle crushing the Cathedral Bell Tower
    ctx.fillStyle = '#0e070b';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(w * 0.26, 0);
    ctx.lineTo(w * 0.31, h * 0.44);
    ctx.lineTo(w * 0.42, h * 0.54);
    ctx.lineTo(w * 0.58, h * 0.54);
    ctx.lineTo(w * 0.69, h * 0.44);
    ctx.lineTo(w * 0.74, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Castle battlements & Gothic spire teeth
    ctx.fillStyle = '#180b10';
    for (let tx = w * 0.32; tx <= w * 0.66; tx += 22) {
      ctx.fillRect(tx, h * 0.46, 12, 16);
    }

    // Crushed Goethe Cathedral Roof & Collapsing Bell Tower on right
    ctx.fillStyle = '#1b151a';
    ctx.fillRect(w * 0.14, h * 0.64, w * 0.72, h * 0.36);

    // Left shattered spire
    ctx.fillStyle = '#140f14';
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.64);
    ctx.lineTo(w * 0.23, h * 0.42);
    ctx.lineTo(w * 0.28, h * 0.64);
    ctx.fill();

    // Tilted collapsing Central Bell Tower (Tháp chuông sụp nghiêng)
    ctx.save();
    ctx.translate(w * 0.72, h * 0.64);
    ctx.rotate(0.24);
    ctx.fillStyle = '#1a1419';
    ctx.fillRect(-16, -54, 32, 54);
    ctx.beginPath();
    ctx.moveTo(-20, -54);
    ctx.lineTo(0, -84);
    ctx.lineTo(20, -54);
    ctx.closePath();
    ctx.fill();
    // Cracked bronze bell falling out of belfry arch
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(10, -24, 7, Math.PI, 0);
    ctx.lineTo(18, -12);
    ctx.lineTo(2, -12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Glowing blood fissures radiating from impact
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.54);
    ctx.lineTo(w * 0.40, h * 0.86);
    ctx.moveTo(w * 0.5, h * 0.54);
    ctx.lineTo(w * 0.58, h * 0.90);
    ctx.moveTo(w * 0.47, h * 0.68);
    ctx.lineTo(w * 0.32, h * 0.80);
    ctx.stroke();
  } else if (step === 1) {
    // Khung 1: Tượng cổ vỡ trong sương tím & nhiều đốm mắt đỏ rình rập
    // Swirling purple miasma fog bands
    for (let i = 0; i < 6; i++) {
      const fogGrad = ctx.createRadialGradient(
        w * (0.18 + i * 0.14),
        h * (0.58 + (i % 2) * 0.14),
        8,
        w * (0.18 + i * 0.14),
        h * (0.58 + (i % 2) * 0.14),
        120
      );
      fogGrad.addColorStop(0, 'rgba(147, 51, 234, 0.32)');
      fogGrad.addColorStop(1, 'rgba(15, 6, 28, 0)');
      ctx.fillStyle = fogGrad;
      ctx.beginPath();
      ctx.arc(w * (0.18 + i * 0.14), h * (0.58 + (i % 2) * 0.14), 120, 0, Math.PI * 2);
      ctx.fill();
    }

    // Broken Ancient Statue on cracked pedestal (fractured torso, severed stone wing, cracked head)
    ctx.fillStyle = '#241e29';
    ctx.strokeStyle = '#6b21a8';
    ctx.lineWidth = 1.6;
    // Pedestal
    ctx.fillRect(w * 0.41, h * 0.78, w * 0.18, h * 0.22);
    ctx.strokeRect(w * 0.41, h * 0.78, w * 0.18, h * 0.22);
    // Draped broken statue torso
    ctx.beginPath();
    ctx.moveTo(w * 0.43, h * 0.38);
    ctx.lineTo(w * 0.55, h * 0.35);
    ctx.lineTo(w * 0.60, h * 0.78);
    ctx.lineTo(w * 0.40, h * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cracked tilted head & weeping black tears
    ctx.beginPath();
    ctx.arc(w * 0.49, h * 0.27, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Diagonal fracture crack across statue face
    ctx.strokeStyle = '#09050c';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(w * 0.46, h * 0.21);
    ctx.lineTo(w * 0.52, h * 0.33);
    ctx.stroke();
    // Fallen shattered stone wing/head chunk at base
    ctx.fillStyle = '#1b1620';
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.94);
    ctx.lineTo(w * 0.36, h * 0.82);
    ctx.lineTo(w * 0.40, h * 0.96);
    ctx.closePath();
    ctx.fill();

    // Sinister pairs of glowing red eyes lurking inside the violet fog
    const eyePairs = [
      [0.14, 0.44],
      [0.24, 0.62],
      [0.74, 0.40],
      [0.84, 0.56],
      [0.68, 0.70],
    ];
    for (const [ex, ey] of eyePairs) {
      const gx = w * ex;
      const gy = h * ey;
      const eGlow = ctx.createRadialGradient(gx, gy, 1, gx, gy, 16);
      eGlow.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
      eGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = eGlow;
      ctx.beginPath();
      ctx.arc(gx, gy, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(gx - 5, gy, 2.4, 0, Math.PI * 2);
      ctx.arc(gx + 5, gy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Khung 2: Bức tường sương chướng khí đặc quánh ép sát sau lưng nhân vật đối diện Cổng Sắt Răng Cưa Gothic
    // 1. Two Carved Gothic Stone Gate Pillars framing the portcullis
    const pillarXs = [w * 0.16, w * 0.72];
    for (const px of pillarXs) {
      ctx.fillStyle = '#242022';
      ctx.fillRect(px, h * 0.12, w * 0.12, h * 0.88);
      ctx.strokeStyle = '#09070a';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, h * 0.12, w * 0.12, h * 0.88);
      // Carved Gothic relief arches & masonry lines on pillars
      ctx.strokeStyle = '#474044';
      ctx.lineWidth = 1.6;
      for (let ry = h * 0.20; ry < h * 0.88; ry += 32) {
        ctx.strokeRect(px + 10, ry, w * 0.12 - 20, 22);
      }
      // Stone finial spire on top of each pillar
      ctx.fillStyle = '#1c181b';
      ctx.beginPath();
      ctx.moveTo(px - 4, h * 0.12);
      ctx.lineTo(px + w * 0.06, h * 0.02);
      ctx.lineTo(px + w * 0.12 + 4, h * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Heavy Gothic stone lintel arch connecting the two pillars
    ctx.fillStyle = '#1d191c';
    ctx.fillRect(w * 0.28, h * 0.14, w * 0.44, h * 0.10);
    ctx.strokeStyle = '#09070a';
    ctx.strokeRect(w * 0.28, h * 0.14, w * 0.44, h * 0.10);

    // 2. Gothic Jagged Iron Portcullis Gate with Hanging Sharpened Spears (Hàng mũi giáo nhọn treo lơ lửng)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    for (let x = w * 0.31; x <= w * 0.69; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.24);
      ctx.lineTo(x, h * 0.90);
      ctx.stroke();
      // Hanging sharpened iron spearhead teeth along bottom & top suspension
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(x - 5, h * 0.24);
      ctx.lineTo(x, h * 0.36);
      ctx.lineTo(x + 5, h * 0.24);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x - 4.5, h * 0.84);
      ctx.lineTo(x, h * 0.95);
      ctx.lineTo(x + 4.5, h * 0.84);
      ctx.closePath();
      ctx.fill();
    }
    // Horizontal riveted iron crossbars
    ctx.fillStyle = '#334155';
    ctx.fillRect(w * 0.28, h * 0.42, w * 0.44, 6);
    ctx.fillRect(w * 0.28, h * 0.68, w * 0.44, 6);

    // 3. Thick Swirling Miasma Wall pressing right behind the hero's back (Bức tường sương chướng khí ép sát sau lưng)
    const wallGrad = ctx.createLinearGradient(0, h * 0.56, 0, h);
    wallGrad.addColorStop(0, 'rgba(88, 28, 135, 0)');
    wallGrad.addColorStop(0.42, 'rgba(107, 33, 168, 0.55)');
    wallGrad.addColorStop(0.75, 'rgba(127, 29, 29, 0.78)');
    wallGrad.addColorStop(1, 'rgba(24, 6, 36, 0.95)');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, h * 0.54, w, h * 0.46);

    for (let i = 0; i < 9; i++) {
      const mx = w * (0.06 + i * 0.11);
      const my = h * (0.84 + (i % 2) * 0.08);
      const puff = ctx.createRadialGradient(mx, my, 8, mx, my, 76);
      puff.addColorStop(0, i % 2 === 0 ? 'rgba(147, 51, 234, 0.62)' : 'rgba(153, 27, 27, 0.54)');
      puff.addColorStop(1, 'rgba(10, 4, 16, 0)');
      ctx.fillStyle = puff;
      ctx.beginPath();
      ctx.arc(mx, my, 76, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hero silhouette standing between the miasma wall behind and the Gothic Gate ahead
    drawPartyBackSprite(ctx, classId, w * 0.44, h * 0.56, 68, 92, { leftArm: true, rightArm: true });
  }

  ctx.restore();
}

/**
 * Draws atmospheric 3-Floor Dark Gothic Combat Arena Backdrops (Floor 1 Castle / Floor 2 Cathedral / Floor 3 Starry Abyss)
 */
export function drawCombatBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  floor: 1 | 2 | 3,
  nowSec: number,
  zoneId?: string
) {
  // High-Resolution Floor Backdrop Image (/assets/combat/bg_floor1..3.jpg) with dark gothic vignette;
  // automatically falls back to the smooth Dark Gothic Canvas backdrop below when image is absent/loading.
  if (drawCombatBackdropImage(ctx, w, h, floor)) {
    return;
  }

  ctx.save();
  const isExterior = zoneId === 'F2_EXTERIOR' || zoneId === 'EXTERIOR';
  const isBloodThrone = zoneId === 'F1_R3';
  const isF2Cellar = floor === 2 && !isExterior && (zoneId === 'F2_R1' || zoneId === 'F2_R2' || zoneId === 'F2_R3');
  const isF3RiftCore = floor === 3 && zoneId === 'F3_R3';

  const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.38, 22, w * 0.5, h * 0.46, w * 0.74);
  if (isExterior) {
    bgGrad.addColorStop(0, '#2a343d');
    bgGrad.addColorStop(0.5, '#12181f');
    bgGrad.addColorStop(1, '#05070a');
  } else if (floor === 1) {
    bgGrad.addColorStop(0, isBloodThrone ? '#441216' : '#2d1617');
    bgGrad.addColorStop(0.52, isBloodThrone ? '#1a0709' : '#130b0d');
    bgGrad.addColorStop(1, '#050304');
  } else if (floor === 3) {
    bgGrad.addColorStop(0, isF3RiftCore ? '#3b1560' : '#271242');
    bgGrad.addColorStop(0.52, '#10061c');
    bgGrad.addColorStop(1, '#040208');
  } else if (isF2Cellar) {
    bgGrad.addColorStop(0, '#2c221b');
    bgGrad.addColorStop(0.52, '#14100d');
    bgGrad.addColorStop(1, '#060505');
  } else {
    bgGrad.addColorStop(0, '#262b30');
    bgGrad.addColorStop(0.52, '#121316');
    bgGrad.addColorStop(1, '#050508');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(-30, -30, w + 60, h + 60);

  const horizonY = h * 0.59;

  if (isExterior) {
    // NGOẠI VI ĐẠI GIÁO ĐƯỜNG: Pale moon, ruined cathedral spires, dead trees & iron graveyard fence
    const moonX = w * 0.72;
    const moonY = h * 0.17;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 6, moonX, moonY, 120);
    moonGlow.addColorStop(0, 'rgba(226, 232, 240, 0.48)');
    moonGlow.addColorStop(0.35, 'rgba(148, 163, 184, 0.18)');
    moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dce4ee';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Distant Gothic Cathedral Silhouette
    ctx.fillStyle = '#0a0d12';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.16, horizonY);
    ctx.lineTo(w * 0.16, h * 0.34);
    ctx.lineTo(w * 0.21, h * 0.16);
    ctx.lineTo(w * 0.26, h * 0.34);
    ctx.lineTo(w * 0.38, h * 0.28);
    ctx.lineTo(w * 0.44, h * 0.12);
    ctx.lineTo(w * 0.50, h * 0.28);
    ctx.lineTo(w * 0.62, h * 0.35);
    ctx.lineTo(w * 0.62, horizonY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wrought-iron graveyard fence & spears across horizon
    ctx.strokeStyle = '#07090d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, horizonY - 26);
    ctx.lineTo(w, horizonY - 26);
    ctx.moveTo(0, horizonY - 8);
    ctx.lineTo(w, horizonY - 8);
    for (let fx = 12; fx < w; fx += 24) {
      ctx.moveTo(fx, horizonY);
      ctx.lineTo(fx, horizonY - 40);
    }
    ctx.stroke();

    // Gnarled dead trees on edges
    ctx.strokeStyle = '#060709';
    ctx.lineWidth = 6;
    for (const side of [-1, 1]) {
      const tx = side < 0 ? 34 : w - 34;
      ctx.beginPath();
      ctx.moveTo(tx, horizonY + 14);
      ctx.quadraticCurveTo(tx + side * 12, h * 0.36, tx + side * 48, h * 0.14);
      ctx.moveTo(tx + side * 16, h * 0.36);
      ctx.lineTo(tx + side * 74, h * 0.26);
      ctx.stroke();
    }

    // Damp cobbled graveyard ground + drifting fog
    ctx.fillStyle = '#0f1318';
    ctx.fillRect(0, horizonY, w, h - horizonY);
    for (let m = 0; m < 6; m++) {
      const mx = ((m * 160 + nowSec * (16 + m * 3)) % (w + 240)) - 120;
      const my = horizonY + 16 + m * 20;
      const fog = ctx.createRadialGradient(mx, my, 4, mx, my, 125);
      fog.addColorStop(0, 'rgba(203, 213, 225, 0.16)');
      fog.addColorStop(1, 'rgba(148, 163, 184, 0)');
      ctx.fillStyle = fog;
      ctx.beginPath();
      ctx.ellipse(mx, my, 125, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (floor === 1 && isBloodThrone) {
    // TẦNG 1 - ĐẠI ĐIỆN NGAI VÀNG MÁU: Hanging crimson banners, iron chains, twin roaring braziers & royal carpet
    for (const side of [-1, 1]) {
      const bx = side < 0 ? w * 0.15 : w * 0.85;
      // Torn royal crimson banner
      ctx.fillStyle = '#470a10';
      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 26, 0);
      ctx.lineTo(bx + 26, 0);
      ctx.lineTo(bx + 22, h * 0.44);
      ctx.lineTo(bx + 6, h * 0.39);
      ctx.lineTo(bx - 4, h * 0.49);
      ctx.lineTo(bx - 24, h * 0.41);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(202, 138, 4, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, h * 0.04);
      ctx.lineTo(bx, h * 0.35);
      ctx.stroke();

      // Heavy diagonal chains descending from vault
      ctx.strokeStyle = '#1e1b22';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(side < 0 ? 0 : w, h * 0.06);
      ctx.quadraticCurveTo(w * 0.5 + side * 120, h * 0.22, w * 0.5 + side * 26, h * 0.36);
      ctx.stroke();

      // Roaring iron brazier on obsidian plinth
      const tx = side < 0 ? w * 0.22 : w * 0.78;
      const ty = horizonY - 26;
      const flick = 0.88 + Math.sin(nowSec * 10.5 + side * 2.1) * 0.12 + Math.cos(nowSec * 17.3) * 0.05;
      const bAura = ctx.createRadialGradient(tx, ty - 8, 4, tx, ty - 8, 155 * flick);
      bAura.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
      bAura.addColorStop(0.28, 'rgba(234, 88, 12, 0.32)');
      bAura.addColorStop(0.65, 'rgba(153, 27, 27, 0.14)');
      bAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bAura;
      ctx.beginPath();
      ctx.arc(tx, ty - 8, 155 * flick, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1f1b20';
      ctx.strokeStyle = '#050505';
      ctx.fillRect(tx - 16, ty + 4, 32, 24);
      ctx.strokeRect(tx - 16, ty + 4, 32, 24);
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(tx, ty - 4, 13 * flick, 18 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(tx, ty - 1, 7 * flick, 10 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#12080a';
    ctx.fillRect(0, horizonY, w, h - horizonY);
    const carpetGrad = ctx.createLinearGradient(w * 0.5, horizonY, w * 0.5, h);
    carpetGrad.addColorStop(0, '#5a0c14');
    carpetGrad.addColorStop(0.55, '#7c111d');
    carpetGrad.addColorStop(1, '#260609');
    ctx.fillStyle = carpetGrad;
    ctx.beginPath();
    ctx.moveTo(w * 0.34, horizonY);
    ctx.lineTo(w * 0.66, horizonY);
    ctx.lineTo(w * 0.80, h);
    ctx.lineTo(w * 0.20, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(217, 160, 48, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(w * 0.36, horizonY);
    ctx.lineTo(w * 0.23, h);
    ctx.moveTo(w * 0.64, horizonY);
    ctx.lineTo(w * 0.77, h);
    ctx.stroke();
  } else if (floor === 1) {
    // TẦNG 1 - HÀNH LANG ĐÁ & NGỤC TỐI LÂU ĐÀI: Gothic stone arches, iron prison bars & flickering wall torches
    for (const ax of [w * 0.25, w * 0.5, w * 0.75]) {
      ctx.fillStyle = '#09070a';
      ctx.strokeStyle = '#292024';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ax - 54, horizonY);
      ctx.lineTo(ax - 54, h * 0.28);
      ctx.quadraticCurveTo(ax, h * 0.08, ax + 54, h * 0.28);
      ctx.lineTo(ax + 54, horizonY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Iron cell bars inside alcoves
      ctx.strokeStyle = '#1b1d24';
      ctx.lineWidth = 2;
      for (let bx = ax - 36; bx <= ax + 36; bx += 18) {
        ctx.beginPath();
        ctx.moveTo(bx, h * 0.24);
        ctx.lineTo(bx, horizonY);
        ctx.stroke();
      }
    }

    for (const side of [-1, 1]) {
      const px = side < 0 ? 18 : w - 74;
      const pGrad = ctx.createLinearGradient(px, 0, px + 56, 0);
      pGrad.addColorStop(0, '#0a0709');
      pGrad.addColorStop(0.5, '#261c1f');
      pGrad.addColorStop(1, '#080507');
      ctx.fillStyle = pGrad;
      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 2;
      ctx.fillRect(px, 0, 56, horizonY + 24);
      ctx.strokeRect(px, 0, 56, horizonY + 24);

      const tx = side < 0 ? 86 : w - 86;
      const ty = h * 0.34;
      const flick = 0.88 + Math.sin(nowSec * 9.5 + side * 2.1) * 0.12 + Math.cos(nowSec * 16.3) * 0.05;
      const tAura = ctx.createRadialGradient(tx, ty, 3, tx, ty, 132 * flick);
      tAura.addColorStop(0, 'rgba(254, 240, 138, 0.52)');
      tAura.addColorStop(0.28, 'rgba(245, 158, 11, 0.26)');
      tAura.addColorStop(0.65, 'rgba(180, 50, 18, 0.10)');
      tAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = tAura;
      ctx.beginPath();
      ctx.arc(tx, ty, 132 * flick, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.fillRect(tx - 4, ty + 6, 8, 18);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.ellipse(tx, ty, 6 * flick, 11 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(tx, ty + 2, 3 * flick, 6 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#130e10';
    ctx.fillRect(0, horizonY, w, h - horizonY);
  } else if (isF2Cellar) {
    // TẦNG 2 - HẦM RƯỢU & HÀNH LANG HÀI CỐT GIÁO ĐƯỜNG: Vaulted cellar ribs, oak casks & candle clusters
    ctx.strokeStyle = '#1c1714';
    ctx.lineWidth = 10;
    for (let r = 0; r < 3; r++) {
      const inset = r * 58;
      ctx.beginPath();
      ctx.moveTo(inset, horizonY + 10);
      ctx.quadraticCurveTo(w * 0.5, -24 + r * 36, w - inset, horizonY + 10);
      ctx.stroke();
    }

    // Stacked dark oak wine barrels & bone niches on left/right
    for (const side of [-1, 1]) {
      const bx = side < 0 ? 48 : w - 118;
      for (let row = 0; row < 2; row++) {
        const by = horizonY - 38 - row * 34;
        ctx.fillStyle = '#291c15';
        ctx.strokeStyle = '#070504';
        ctx.lineWidth = 2;
        ctx.fillRect(bx, by, 70, 32);
        ctx.strokeRect(bx, by, 70, 32);
        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(bx + 12, by);
        ctx.lineTo(bx + 12, by + 32);
        ctx.moveTo(bx + 58, by);
        ctx.lineTo(bx + 58, by + 32);
        ctx.stroke();
      }
      // Flickering wax candles on barrel tops
      const cx = side < 0 ? 88 : w - 88;
      const cy = horizonY - 76;
      const flick = 0.86 + Math.sin(nowSec * 8.2 + side) * 0.14;
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 85 * flick);
      glow.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      glow.addColorStop(0.4, 'rgba(217, 119, 6, 0.18)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 85 * flick, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e5dccb';
      ctx.fillRect(cx - 2, cy + 2, 4, 10);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(cx, cy, 3 * flick, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#120f0d';
    ctx.fillRect(0, horizonY, w, h - horizonY);
  } else if (floor === 2) {
    // TẦNG 2 - SẢNH KÍNH VỠ ĐẠI GIÁO ĐƯỜNG: Shattered Stained-Glass Lancet Arches, Cold Moonlight Shafts & Drifting Ash
    const archPositions = [w * 0.22, w * 0.5, w * 0.78];
    for (let i = 0; i < archPositions.length; i++) {
      const ax = archPositions[i];
      ctx.fillStyle = '#0d131c';
      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax - 44, horizonY);
      ctx.lineTo(ax - 44, h * 0.24);
      ctx.quadraticCurveTo(ax - 44, h * 0.05, ax, h * 0.02);
      ctx.quadraticCurveTo(ax + 44, h * 0.05, ax + 44, h * 0.24);
      ctx.lineTo(ax + 44, horizonY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const paneColors = ['rgba(153, 27, 27, 0.38)', 'rgba(30, 64, 175, 0.38)', 'rgba(180, 120, 30, 0.30)'];
      ctx.fillStyle = paneColors[i % paneColors.length];
      ctx.beginPath();
      ctx.moveTo(ax - 36, h * 0.22);
      ctx.lineTo(ax, h * 0.06);
      ctx.lineTo(ax + 36, h * 0.22);
      ctx.lineTo(ax + 12, h * 0.38);
      ctx.lineTo(ax - 22, h * 0.32);
      ctx.closePath();
      ctx.fill();

      const shaftGrad = ctx.createLinearGradient(ax, h * 0.14, ax + 75, h * 0.88);
      shaftGrad.addColorStop(0, 'rgba(203, 213, 225, 0.18)');
      shaftGrad.addColorStop(0.55, 'rgba(148, 163, 184, 0.08)');
      shaftGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
      ctx.fillStyle = shaftGrad;
      ctx.beginPath();
      ctx.moveTo(ax - 18, h * 0.18);
      ctx.lineTo(ax + 16, h * 0.18);
      ctx.lineTo(ax + 98, h * 0.92);
      ctx.lineTo(ax + 18, h * 0.92);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#111215';
    ctx.fillRect(0, horizonY, w, h - horizonY);

    for (let a = 0; a < 22; a++) {
      const mx = ((a * 73 + nowSec * (8 + (a % 4) * 3)) % (w + 40)) - 20;
      const my = ((a * 51 + nowSec * (11 + (a % 3) * 4)) % (h + 20)) - 10;
      const r = 1.1 + (a % 3) * 0.6;
      ctx.fillStyle = `rgba(218, 224, 232, ${(0.22 + (a % 3) * 0.12).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // TẦNG 3 - VÁCH ĐÁ VỰC SAO & VẾT RÁCH HƯ VÔ
    const pulse = 0.88 + Math.sin(nowSec * 2.2) * 0.12;
    const riftRadius = (isF3RiftCore ? 235 : 185) * pulse;
    const riftGrad = ctx.createRadialGradient(w * 0.5, h * 0.30, 8, w * 0.5, h * 0.30, riftRadius);
    riftGrad.addColorStop(0, isF3RiftCore ? 'rgba(245, 208, 254, 0.68)' : 'rgba(240, 171, 252, 0.52)');
    riftGrad.addColorStop(0.28, 'rgba(168, 85, 247, 0.34)');
    riftGrad.addColorStop(0.62, 'rgba(88, 28, 135, 0.14)');
    riftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = riftGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.30, riftRadius, 0, Math.PI * 2);
    ctx.fill();

    // Distant astral stars
    for (let s = 0; s < 26; s++) {
      const sx = (s * 97 + 31) % w;
      const sy = (s * 43 + 17) % Math.max(10, Math.floor(horizonY - 12));
      const twinkle = 0.25 + 0.55 * Math.abs(Math.sin(nowSec * 1.6 + s));
      ctx.fillStyle = `rgba(233, 213, 255, ${twinkle.toFixed(2)})`;
      ctx.fillRect(sx, sy, s % 3 === 0 ? 2 : 1.3, s % 3 === 0 ? 2 : 1.3);
    }

    // Vertical jagged dimensional tear in background sky
    ctx.fillStyle = '#04010a';
    ctx.strokeStyle = isF3RiftCore ? '#f0abfc' : '#e879f9';
    ctx.lineWidth = isF3RiftCore ? 3 : 2.2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.03);
    ctx.lineTo(w * 0.5 + (isF3RiftCore ? 26 : 18), h * 0.22);
    ctx.lineTo(w * 0.5 + 10, h * 0.42);
    ctx.lineTo(w * 0.5, h * 0.57);
    ctx.lineTo(w * 0.5 - (isF3RiftCore ? 22 : 14), h * 0.36);
    ctx.lineTo(w * 0.5 - 12, h * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Floating obsidian monolith shards in F3_R3 Rift Core
    if (isF3RiftCore) {
      for (let k = 0; k < 4; k++) {
        const side = k % 2 === 0 ? -1 : 1;
        const floatY = Math.sin(nowSec * 1.4 + k * 1.7) * 8;
        const sx = w * 0.5 + side * (110 + (k > 1 ? 85 : 0));
        const sy = h * 0.24 + (k > 1 ? 45 : 0) + floatY;
        ctx.fillStyle = '#120820';
        ctx.strokeStyle = '#7e22ce';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 22);
        ctx.lineTo(sx + 12, sy);
        ctx.lineTo(sx + 3, sy + 24);
        ctx.lineTo(sx - 11, sy + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Jagged obsidian cliffs framing left & right
    ctx.fillStyle = '#0c0716';
    ctx.strokeStyle = '#2e1065';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.18, h * 0.16);
    ctx.lineTo(w * 0.12, h * 0.38);
    ctx.lineTo(w * 0.20, horizonY + 12);
    ctx.lineTo(0, horizonY + 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w * 0.82, h * 0.14);
    ctx.lineTo(w * 0.88, h * 0.36);
    ctx.lineTo(w * 0.80, horizonY + 12);
    ctx.lineTo(w, horizonY + 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0b0614';
    ctx.fillRect(0, horizonY, w, h - horizonY);

    for (let m = 0; m < 5; m++) {
      const mx = ((m * 165 + nowSec * (22 + m * 5)) % (w + 260)) - 130;
      const my = horizonY + 22 + m * 24 + Math.sin(nowSec * 1.1 + m) * 8;
      const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 110);
      mg.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
      mg.addColorStop(1, 'rgba(88, 28, 135, 0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.ellipse(mx, my, 110, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle floor perspective seams + contact shadow pool directly beneath enemy
  ctx.strokeStyle = floor === 3 ? 'rgba(168, 85, 247, 0.16)' : 'rgba(155, 138, 118, 0.14)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 6; i++) {
    const yLine = horizonY + i * 32;
    ctx.beginPath();
    ctx.moveTo(0, yLine);
    ctx.lineTo(w, yLine);
    ctx.stroke();
  }
  const shadowGrad = ctx.createRadialGradient(w * 0.5, h * 0.72, 16, w * 0.5, h * 0.72, 195);
  shadowGrad.addColorStop(0, floor === 3 ? 'rgba(46, 16, 101, 0.72)' : 'rgba(5, 3, 6, 0.82)');
  shadowGrad.addColorStop(0.6, floor === 1 ? 'rgba(69, 10, 10, 0.48)' : 'rgba(6, 4, 9, 0.45)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.72, 195, 42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

const tileCache: Map<string, HTMLCanvasElement> = new Map();

/**
 * Generates High-Detail 2D Architectural & Grimy Stone Map Textures (48x48)
 * Uses exact 75% minimalist cold-slate flagstones / 25% weathered details (variant 0..19) for crisp readability.
 */
export function getFloorTileTexture(
  floor: 1 | 2 | 3,
  tileType: string,
  variant: number,
  isExterior: boolean = false
): HTMLCanvasElement {
  const v = Math.abs(variant) % 20;
  const key = `v9_${floor}_${tileType}_${v}_${isExterior ? 'ext' : 'int'}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;

  // 1. VOID (Dead Pine Canopy in Exterior / Cosmic Starfield in Floor 3 / Deep Abyss)
  if (tileType === 'VOID') {
    ctx.fillStyle = isExterior ? '#0f1410' : floor === 3 ? '#07040e' : '#070608';
    ctx.fillRect(0, 0, 48, 48);

    if (isExterior) {
      // Dead Pine Tree Canopy & gnarled branches casting shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(26, 28, 19, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      const treeGrad = ctx.createRadialGradient(22, 20, 3, 24, 24, 18);
      treeGrad.addColorStop(0, '#2b3626');
      treeGrad.addColorStop(0.6, '#1b2418');
      treeGrad.addColorStop(1, '#0d120c');
      ctx.fillStyle = treeGrad;
      ctx.beginPath();
      ctx.arc(24, 22, 16, 0, Math.PI * 2);
      ctx.fill();

      // Dead dry twigs
      ctx.strokeStyle = '#3d3126';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(24, 22);
      ctx.lineTo(14, 12);
      ctx.moveTo(24, 22);
      ctx.lineTo(34, 14);
      ctx.moveTo(24, 22);
      ctx.lineTo(20, 34);
      ctx.stroke();
    } else if (floor === 3) {
      // Cosmic Starfield & Nebula dust
      const sv = v % 10;
      ctx.fillStyle = v % 2 === 0 ? '#a855f7' : '#e9d5ff';
      ctx.fillRect(8 + sv * 3.4, 10 + sv * 2.8, 2, 2);
      ctx.fillRect(36 - sv * 3, 28 + sv * 1.4, 1.5, 1.5);
    }
    tileCache.set(key, canvas);
    return canvas;
  }

  // 2. HIGH-CONTRAST 2.5D STONE WALL & CRACKED WALL (Solid Dark Roof Cap + Chamfer Rim + Carved Vertical Masonry)
  if (tileType === 'WALL' || tileType === 'CRACKED_WALL') {
    const topCol = floor === 1 ? '#29171c' : floor === 3 ? '#251a3d' : '#22252a';
    const topDark = floor === 1 ? '#140b0e' : floor === 3 ? '#120b22' : '#141619';
    const frontCol = floor === 1 ? '#1d1216' : floor === 3 ? '#18102a' : '#1c1f24';
    const mortarCol = '#090a0c';

    // Top horizontal solid dark wall roof cap (upper 22px)
    const topGrad = ctx.createLinearGradient(0, 0, 48, 22);
    topGrad.addColorStop(0, topCol);
    topGrad.addColorStop(1, topDark);
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, 48, 22);
    ctx.strokeStyle = mortarCol;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(1, 1, 46, 20);

    // Subtle stone fracture on wall roof cap
    ctx.strokeStyle = 'rgba(5, 5, 7, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10 + (v % 6) * 3, 2);
    ctx.lineTo(14 + (v % 5) * 2, 11);
    ctx.lineTo(9 + (v % 6) * 3, 19);
    ctx.stroke();

    // High-contrast beveled stone ledge separating roof cap from vertical masonry face
    ctx.fillStyle = floor === 1 ? '#7f2428' : floor === 3 ? '#6d3fa8' : '#4a525e';
    ctx.fillRect(0, 22, 48, 2);
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 24, 48, 1.5);

    // Front vertical carved stone masonry face (y = 25..48)
    const faceGrad = ctx.createLinearGradient(0, 25, 0, 48);
    faceGrad.addColorStop(0, frontCol);
    faceGrad.addColorStop(0.65, '#121418');
    faceGrad.addColorStop(1, '#090a0c');
    ctx.fillStyle = faceGrad;
    ctx.fillRect(0, 25, 48, 23);

    // Staggered carved masonry bricks with subtle upper rim highlight
    ctx.fillStyle = floor === 1 ? 'rgba(92, 34, 40, 0.34)' : floor === 3 ? 'rgba(109, 63, 168, 0.30)' : 'rgba(66, 74, 86, 0.36)';
    ctx.fillRect(2, 26, 21, 9);
    ctx.fillRect(14, 37, 20, 8);
    ctx.strokeStyle = mortarCol;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 25, 23, 11);
    ctx.strokeRect(24, 25, 23, 11);
    ctx.strokeRect(1, 36, 12, 11);
    ctx.strokeRect(13, 36, 22, 11);
    ctx.strokeRect(35, 36, 12, 11);

    // Occasional creeping moss or fissure on vertical face
    if (v >= 14) {
      ctx.fillStyle = floor === 1 ? 'rgba(110, 22, 26, 0.42)' : floor === 3 ? 'rgba(109, 63, 168, 0.44)' : 'rgba(34, 62, 38, 0.52)';
      ctx.fillRect(4 + (v % 4) * 9, 34, 9, 5);
    }

    // Base damp grime along floor seam
    ctx.fillStyle = floor === 1 ? 'rgba(95, 18, 22, 0.48)' : floor === 3 ? 'rgba(88, 28, 135, 0.42)' : 'rgba(18, 34, 24, 0.56)';
    ctx.fillRect(0, 44, 48, 4);

    if (tileType === 'CRACKED_WALL') {
      // Subtle weathered structural fracture (dark fissure + dusty stone rim + small rubble chips)
      ctx.strokeStyle = 'rgba(107, 101, 94, 0.58)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(23, 4);
      ctx.lineTo(27, 17);
      ctx.lineTo(19, 31);
      ctx.lineTo(26, 45);
      ctx.stroke();

      ctx.strokeStyle = '#050507';
      ctx.lineWidth = 1.65;
      ctx.beginPath();
      ctx.moveTo(22, 3);
      ctx.lineTo(27, 17);
      ctx.lineTo(18, 31);
      ctx.lineTo(25, 45);
      // Secondary fine hairline branch
      ctx.moveTo(27, 17);
      ctx.lineTo(34, 23);
      ctx.moveTo(18, 31);
      ctx.lineTo(12, 37);
      ctx.stroke();

      // Tiny fallen rubble chips at base of crack
      ctx.fillStyle = '#47423d';
      ctx.fillRect(19, 43, 3, 2);
      ctx.fillRect(26, 44, 2.5, 2);
      ctx.fillStyle = '#6b655e';
      ctx.fillRect(23, 42, 2, 1.8);
    }

    tileCache.set(key, canvas);
    return canvas;
  }

  // 3. CHASM (Abyssal Pit / Magma Trench / Cosmic Void)
  if (tileType === 'CHASM') {
    const grad = ctx.createRadialGradient(24, 24, 4, 24, 24, 30);
    grad.addColorStop(0, floor === 1 ? '#ea580c' : floor === 3 ? '#6d3fa8' : '#050507');
    grad.addColorStop(1, '#040306');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#1f1924';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 46, 46);
    tileCache.set(key, canvas);
    return canvas;
  }

  // 4. ANTI-REPETITION FLOOR TILES (v = 0..14 => 75% CLEAN FLAGSTONES; v = 15..19 => 25% WEATHERED MOSS / BONE / BLOOD)
  if (isExterior) {
    ctx.fillStyle = v % 2 === 0 ? '#1d2219' : '#191e16';
    ctx.fillRect(0, 0, 48, 48);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(((v * 11) % 34) + 5, ((v * 17) % 32) + 6, 4, 2);
    ctx.fillRect(((v * 19 + 9) % 34) + 5, ((v * 13 + 7) % 32) + 6, 3, 2);

    if (v === 15 || v === 16) {
      // Withered olive grass tufts
      ctx.strokeStyle = '#4e5932';
      ctx.lineWidth = 1.3;
      for (const [gx, gy] of [[14, 34], [34, 22]]) {
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx - 3.5, gy - 8);
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 3.5, gy - 7);
        ctx.stroke();
      }
    } else if (v === 17 || v === 18) {
      // River pebbles & damp earth patch
      ctx.fillStyle = '#32312c';
      for (const [px, py, rx, ry] of [[15, 18, 4.2, 2.8], [32, 31, 4.8, 3.2]]) {
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (v === 19) {
      // Dark rainwater puddle reflecting pale mist
      ctx.fillStyle = '#141a20';
      ctx.beginPath();
      ctx.ellipse(24, 25, 12, 7.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(21, 23, 5, Math.PI * 1.1, Math.PI * 1.7);
      ctx.stroke();
    }
  } else if (floor === 2) {
    // Tầng 2 (Đại Giáo Đường): Cold Dark Gothic Slate (#141619–#22252a), mortar #090a0c — 75% clean flagstones, 25% moss/bone/blood
    ctx.fillStyle = v % 2 === 0 ? '#1b1e23' : '#171a1e';
    ctx.fillRect(0, 0, 48, 48);
    ctx.fillStyle = v % 3 === 0 ? '#22252a' : '#1e2126';
    ctx.fillRect(2, 2, 21, 20);
    ctx.fillRect(25, 2, 21, 22);
    ctx.fillRect(2, 24, 25, 22);
    ctx.fillRect(29, 26, 17, 20);
    // Dark mortar seams (#090a0c)
    ctx.strokeStyle = '#090a0c';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(0.8, 0.8, 46.4, 46.4);
    ctx.beginPath();
    ctx.moveTo(0, 23);
    ctx.lineTo(48, 24);
    ctx.moveTo(24, 0);
    ctx.lineTo(23, 23);
    ctx.moveTo(27, 24);
    ctx.lineTo(28, 48);
    ctx.stroke();

    // Faint border hairline crack on select clean tiles
    if (v < 15 && v % 5 === 0) {
      ctx.strokeStyle = 'rgba(9, 10, 12, 0.72)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(3, 14);
      ctx.lineTo(9, 17);
      ctx.lineTo(13, 15);
      ctx.stroke();
    }

    if (v === 15 || v === 16) {
      // Damp moss creeping from mortar seam + fracture
      ctx.strokeStyle = '#090a0c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(9, 8);
      ctx.lineTo(18, 18);
      ctx.lineTo(14, 27);
      ctx.stroke();
      ctx.fillStyle = 'rgba(34, 64, 38, 0.58)';
      ctx.beginPath();
      ctx.ellipse(24, 24, 6.5, 3.2, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (v === 17 || v === 18) {
      // Small bone chips & melted candle wax
      ctx.fillStyle = 'rgba(218, 208, 188, 0.58)';
      ctx.beginPath();
      ctx.ellipse(17, 30, 5, 2.8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8beab';
      ctx.fillRect(30, 14, 6, 2);
      ctx.fillRect(33, 17, 4, 1.8);
    } else if (v === 19) {
      // Dried dark-crimson blood smear
      ctx.fillStyle = 'rgba(72, 12, 16, 0.72)';
      ctx.beginPath();
      ctx.ellipse(28, 28, 8.5, 4.5, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (floor === 1) {
    // Tầng 1 (Lâu Đài Hắc Ám): Cold basalt-slate (#141518–#1f1d21), mortar #090a0c — 75% clean flagstones, 25% moss/bone/blood
    ctx.fillStyle = v % 2 === 0 ? '#18161a' : '#141316';
    ctx.fillRect(0, 0, 48, 48);
    ctx.fillStyle = v % 3 === 0 ? '#201d22' : '#1b191e';
    ctx.fillRect(2, 2, 20, 21);
    ctx.fillRect(25, 25, 21, 20);
    ctx.strokeStyle = '#090a0c';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(0.8, 0.8, 46.4, 46.4);
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(48, 24);
    ctx.moveTo(24, 0);
    ctx.lineTo(24, 48);
    ctx.stroke();

    if (v < 15 && v % 5 === 0) {
      ctx.strokeStyle = 'rgba(9, 10, 12, 0.78)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(36, 4);
      ctx.lineTo(40, 11);
      ctx.stroke();
    }

    if (v === 15 || v === 16) {
      // Cracked basalt seam & damp moss
      ctx.strokeStyle = '#090a0c';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(9, 12);
      ctx.lineTo(22, 25);
      ctx.lineTo(17, 39);
      ctx.stroke();
      ctx.fillStyle = 'rgba(32, 52, 36, 0.44)';
      ctx.beginPath();
      ctx.ellipse(21, 24, 5, 2.6, -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (v === 17 || v === 18) {
      // Small bone chips & rusted chain link
      ctx.fillStyle = '#c8beae';
      ctx.fillRect(13, 17, 7.5, 2.2);
      ctx.fillRect(29, 31, 6, 2);
      ctx.strokeStyle = '#525a66';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(32, 16, 4.2, 2.3, 0.4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (v === 19) {
      // Dried crimson blood stain
      ctx.fillStyle = 'rgba(84, 14, 18, 0.72)';
      ctx.beginPath();
      ctx.ellipse(26, 26, 8, 4.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Tầng 3 (Vực Sao): Void-obsidian slate, mortar #090a0c — 75% clean stone, 25% violet fissure / rune / crystal
    ctx.fillStyle = v % 2 === 0 ? '#151021' : '#110d1b';
    ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#090a0c';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(0.8, 0.8, 46.4, 46.4);

    if (v === 15 || v === 16) {
      // Faint Void mist fissure (#6d3fa8)
      ctx.strokeStyle = 'rgba(109, 63, 168, 0.45)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(10, 35);
      ctx.lineTo(24, 24);
      ctx.lineTo(38, 13);
      ctx.stroke();
      ctx.strokeStyle = '#d8b4fe';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (v === 17 || v === 18) {
      // Faint etched arcane ring
      ctx.strokeStyle = 'rgba(109, 63, 168, 0.38)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(24, 24, 13, 0, Math.PI * 2);
      ctx.stroke();
    } else if (v === 19) {
      // Small violet astral crystal shard
      ctx.fillStyle = '#6d3fa8';
      ctx.strokeStyle = '#d8b4fe';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 30);
      ctx.lineTo(24, 19);
      ctx.lineTo(28, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // 5. ARCHITECTURAL PROPS OVERLAID ON FLOOR
  if (tileType === 'BRIDGE') {
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(3, 2, 42, 44);
    ctx.strokeStyle = '#1f140b';
    ctx.lineWidth = 1.5;
    for (let y = 8; y < 44; y += 9) {
      ctx.strokeRect(4, y, 40, 7);
    }
  } else if (tileType === 'PORTAL_NEXT' || tileType === 'PORTAL_PREV') {
    // Rusted Iron Gothic Archway Gate with Subtle Moody Light Spill (Replaces ALL Orange Placeholder Squares!)
    const isForward = tileType === 'PORTAL_NEXT';
    const spillCol =
      floor === 3
        ? 'rgba(192, 132, 252, 0.30)'
        : isForward
        ? 'rgba(217, 179, 108, 0.28)'
        : 'rgba(148, 163, 184, 0.20)';
    const glow = ctx.createRadialGradient(24, 26, 2, 24, 26, 22);
    glow.addColorStop(0, spillCol);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 48, 48);

    // Recessed dark stone threshold & Gothic arch frame
    ctx.fillStyle = '#09070c';
    ctx.beginPath();
    ctx.moveTo(7, 44);
    ctx.lineTo(7, 20);
    ctx.quadraticCurveTo(7, 6, 24, 4);
    ctx.quadraticCurveTo(41, 6, 41, 20);
    ctx.lineTo(41, 44);
    ctx.closePath();
    ctx.fill();

    // Carved stone arch border
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Rusted wrought-iron portcullis bars
    ctx.strokeStyle = isForward ? '#8c6b4a' : '#64748b';
    ctx.lineWidth = 2;
    for (let bx = 13; bx <= 35; bx += 5.5) {
      ctx.beginPath();
      ctx.moveTo(bx, 11);
      ctx.lineTo(bx, 42);
      ctx.stroke();
    }
    ctx.fillStyle = '#3f3632';
    ctx.fillRect(9, 20, 30, 3);
    ctx.fillRect(9, 34, 30, 3);
    // Subtle lantern glint at arch keystone
    ctx.fillStyle = floor === 3 ? '#e879f9' : isForward ? '#e5c158' : '#94a3b8';
    ctx.beginPath();
    ctx.arc(24, 8, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (tileType === 'BARS' || tileType === 'SHORTCUT_GATE') {
    // Jagged Iron Gate with Riveted Horizontal Crossbars
    ctx.fillStyle = 'rgba(15, 15, 20, 0.6)';
    ctx.fillRect(2, 6, 44, 36);
    ctx.strokeStyle = tileType === 'SHORTCUT_GATE' ? '#c5a059' : '#94a3b8';
    ctx.lineWidth = 3;
    for (let x = 8; x <= 40; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, 44);
      ctx.stroke();
    }
    ctx.fillStyle = '#475569';
    ctx.fillRect(4, 14, 40, 4);
    ctx.fillRect(4, 32, 40, 4);
  } else if (tileType === 'CRATE') {
    // Detailed Wooden Barrel / Supply Crate with Plank Grain & Steel Hoops
    const crateGrad = ctx.createRadialGradient(22, 20, 3, 24, 24, 18);
    crateGrad.addColorStop(0, '#855832');
    crateGrad.addColorStop(0.7, '#5c3a1e');
    crateGrad.addColorStop(1, '#2b190b');
    ctx.fillStyle = crateGrad;
    ctx.beginPath();
    ctx.arc(24, 24, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a0f07';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Steel Rim & Plank lines
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 24, 13, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#2b190b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(14, 16);
    ctx.lineTo(34, 16);
    ctx.moveTo(12, 24);
    ctx.lineTo(36, 24);
    ctx.moveTo(14, 32);
    ctx.lineTo(34, 32);
    ctx.stroke();
  } else if (tileType === 'HERB') {
    // Distinct Wild Medicinal Herb Visuals:
    // 0: green_herb (xanh lục u ám pha ánh ngọc)
    // 1: red_herb (đỏ huyết dụ / đỏ tía đậm)
    // 2: white_herb (trắng ngà / xám tro phát sáng nhẹ)
    // 3: calm_flower (tím thẫm / xanh dương đậm)
    const herbStyleIdx = v % 4;
    const herbStyles = [
      {
        aura: 'rgba(16, 185, 129, 0.24)',
        shadow: 'rgba(6, 36, 20, 0.72)',
        stem: '#15803d',
        leaf: '#10b981',
        leafEdge: '#065f46',
        bud: '#6ee7b7',
        budRim: '#022c22',
      },
      {
        aura: 'rgba(190, 18, 60, 0.24)',
        shadow: 'rgba(42, 6, 12, 0.74)',
        stem: '#6b0f1a',
        leaf: '#9f1239',
        leafEdge: '#4c0519',
        bud: '#f43f5e',
        budRim: '#2d040c',
      },
      {
        aura: 'rgba(226, 232, 240, 0.26)',
        shadow: 'rgba(30, 41, 59, 0.72)',
        stem: '#64748b',
        leaf: '#cbd5e1',
        leafEdge: '#475569',
        bud: '#f8fafc',
        budRim: '#334155',
      },
      {
        aura: 'rgba(99, 102, 241, 0.28)',
        shadow: 'rgba(23, 21, 58, 0.76)',
        stem: '#312e81',
        leaf: '#4338ca',
        leafEdge: '#1e1b4b',
        bud: '#818cf8',
        budRim: '#1e1b4b',
      },
    ];
    const hs = herbStyles[herbStyleIdx];

    // Subtle colored ground aura so players distinguish herb species from a distance
    const auraGrad = ctx.createRadialGradient(24, 22, 2, 24, 22, 18);
    auraGrad.addColorStop(0, hs.aura);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(24, 22, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hs.shadow;
    ctx.beginPath();
    ctx.ellipse(24, 31, 14, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Serrated herb stems
    ctx.strokeStyle = hs.stem;
    ctx.lineWidth = 2.2;
    for (const [lx, ly] of [
      [14, 16],
      [24, 12],
      [34, 17],
      [18, 22],
      [30, 22],
    ]) {
      ctx.beginPath();
      ctx.moveTo(24, 32);
      ctx.quadraticCurveTo((24 + lx) / 2, ly + 6, lx, ly);
      ctx.stroke();
    }

    // Species-tinted leaves
    ctx.fillStyle = hs.leaf;
    ctx.strokeStyle = hs.leafEdge;
    ctx.lineWidth = 1;
    for (const [lx, ly, ang] of [
      [16, 20, -0.5],
      [32, 20, 0.5],
      [24, 15, 0],
    ]) {
      ctx.beginPath();
      ctx.ellipse(lx, ly, 5.5, 2.8, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (herbStyleIdx === 3) {
      // Calm Flower: 5-petal deep indigo/violet blossoms
      for (const [bx, by] of [
        [15, 15],
        [24, 11],
        [33, 16],
      ]) {
        ctx.fillStyle = '#5b21b6';
        for (let p = 0; p < 5; p++) {
          const a = (p * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(bx + Math.cos(a) * 2.5, by + Math.sin(a) * 2.5, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = hs.bud;
        ctx.beginPath();
        ctx.arc(bx, by, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Distinct emerald, crimson-blood, or luminous ivory buds
      ctx.fillStyle = hs.bud;
      for (const [bx, by] of [
        [15, 15],
        [24, 11],
        [33, 16],
      ]) {
        ctx.beginPath();
        ctx.arc(bx, by, 3.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hs.budRim;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  } else if (tileType === 'CHEST') {
    // Dark Oak Treasure Chest bound in Iron Straps with Gold Lock
    ctx.fillStyle = '#451a03';
    ctx.fillRect(7, 13, 34, 24);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(7, 10, 34, 8);
    ctx.strokeStyle = '#090504';
    ctx.lineWidth = 2;
    ctx.strokeRect(7, 10, 34, 27);

    // Iron Straps
    ctx.fillStyle = '#64748b';
    ctx.fillRect(12, 10, 4, 27);
    ctx.fillRect(32, 10, 4, 27);

    // Gleaming Gold Lockplate
    ctx.fillStyle = '#facc15';
    ctx.fillRect(21, 18, 6, 8);
    ctx.strokeRect(21, 18, 6, 8);
  } else if (tileType === 'BOOKSHELF') {
    // Tall Carved Wooden Bookshelf with Colored Tomes & Scrolls
    ctx.fillStyle = '#3b2313';
    ctx.fillRect(6, 4, 36, 40);
    ctx.strokeStyle = '#140b05';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 4, 36, 40);

    const colors = ['#991b1b', '#1e40af', '#ca8a04', '#6b21a8', '#065f46'];
    for (let row = 0; row < 3; row++) {
      const ry = 9 + row * 12;
      ctx.fillStyle = '#1f1209';
      ctx.fillRect(9, ry, 30, 9);
      for (let b = 0; b < 5; b++) {
        ctx.fillStyle = colors[(row + b) % colors.length];
        ctx.fillRect(10 + b * 5.8, ry + 1, 4.5, 8);
      }
    }
  } else if (tileType === 'HEXEN_ALTAR') {
    // Stone Pedestal inscribed with Glowing Purple 6-Pointed Star Rune Circle & Candles
    ctx.fillStyle = '#272030';
    ctx.beginPath();
    ctx.arc(24, 24, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#09070c';
    ctx.lineWidth = 2;
    ctx.stroke();

    const runeGlow = ctx.createRadialGradient(24, 24, 2, 24, 24, 17);
    runeGlow.addColorStop(0, 'rgba(216, 180, 254, 0.85)');
    runeGlow.addColorStop(0.6, 'rgba(147, 51, 234, 0.45)');
    runeGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = runeGlow;
    ctx.beginPath();
    ctx.arc(24, 24, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(24, 24, 13, 0, Math.PI * 2);
    // Hexagram star
    ctx.moveTo(24, 11);
    ctx.lineTo(35, 30);
    ctx.lineTo(13, 30);
    ctx.closePath();
    ctx.moveTo(24, 37);
    ctx.lineTo(35, 18);
    ctx.lineTo(13, 18);
    ctx.closePath();
    ctx.stroke();
  } else if (tileType === 'STAIRS_DOWN' || tileType === 'STAIRS_UP') {
    // Architectural Spiral Stone Staircase casting deep shadow (Cầu Thang Đá Xoắn)
    const isDown = tileType === 'STAIRS_DOWN';
    ctx.fillStyle = '#060509';
    ctx.beginPath();
    ctx.arc(24, 24, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // 7 radial spiral stone steps curving around central stone newel post
    const steps = 7;
    for (let s = 0; s < steps; s++) {
      const a0 = -Math.PI * 0.6 + s * 0.72;
      const a1 = a0 + 0.68;
      const lum = isDown ? Math.max(18, 92 - s * 11) : Math.min(115, 28 + s * 12);
      ctx.fillStyle = `rgb(${lum}, ${Math.max(12, lum - 4)}, ${Math.min(255, lum + 5)})`;
      ctx.beginPath();
      ctx.moveTo(24, 24);
      ctx.arc(24, 24, 18.5, a0, a1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#050408';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Central carved stone spiral column
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(24, 24, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Subtle directional highlight arc (violet for abyss descent, pale stone-gold for ascent)
    ctx.strokeStyle = isDown ? 'rgba(168, 85, 247, 0.65)' : 'rgba(202, 165, 96, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(24, 24, 20.5, -Math.PI * 0.75, Math.PI * 0.15);
    ctx.stroke();
  } else if (tileType === 'VOID_RIFT') {
    const riftGrad = ctx.createRadialGradient(24, 24, 2, 24, 24, 22);
    riftGrad.addColorStop(0, '#fdf4ff');
    riftGrad.addColorStop(0.35, '#a855f7');
    riftGrad.addColorStop(0.75, '#4c1d95');
    riftGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = riftGrad;
    ctx.beginPath();
    ctx.arc(24, 24, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(24, 24, 16, 8, 0.5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tileType === 'BED_SAVE') {
    // Stone Cot with Straw Mattress & Fur Blanket
    ctx.fillStyle = '#3b2818';
    ctx.fillRect(7, 8, 34, 32);
    ctx.strokeStyle = '#140c06';
    ctx.lineWidth = 2;
    ctx.strokeRect(7, 8, 34, 32);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(10, 10, 14, 9);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(10, 20, 28, 17);
  } else if (tileType === 'FLOOR_TRAP') {
    // Rusted Serrated Iron Bear-Trap with recessed stone crack & bloodied pressure pan
    ctx.strokeStyle = '#18141c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 22);
    ctx.lineTo(16, 26);
    ctx.moveTo(33, 21);
    ctx.lineTo(40, 27);
    ctx.stroke();

    // Rusted iron outer jaw ring
    ctx.fillStyle = 'rgba(15, 11, 14, 0.75)';
    ctx.beginPath();
    ctx.arc(24, 24, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(24, 24, 13, 0, Math.PI * 2);
    ctx.stroke();

    // Central crimson-stained pressure plate
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(24, 24, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Sharp serrated metallic jaw teeth
    ctx.fillStyle = '#cbd5e1';
    for (const [sx, sy] of [[15, 19], [20, 15], [28, 15], [33, 19], [16, 29], [24, 32], [32, 29]]) {
      ctx.beginPath();
      ctx.moveTo(sx - 2, sy + 2);
      ctx.lineTo(sx, sy - 4);
      ctx.lineTo(sx + 2, sy + 2);
      ctx.closePath();
      ctx.fill();
    }
  } else if (tileType === 'MIASMA_VENT') {
    // Glowing Purple Miasma Fissure Vent
    const mGrad = ctx.createRadialGradient(24, 24, 2, 24, 24, 18);
    mGrad.addColorStop(0, 'rgba(216, 180, 254, 0.8)');
    mGrad.addColorStop(0.55, 'rgba(126, 34, 206, 0.45)');
    mGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(24, 24, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 28);
    ctx.lineTo(24, 18);
    ctx.lineTo(36, 26);
    ctx.stroke();
  } else if (tileType === 'RITUAL_CIRCLE') {
    // Sacrificial Blood & Order Sigil Circle
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 24, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(14, 14, 20, 20);
  } else if (tileType === 'CORPSE_LOOT') {
    // Fallen Expedition Corpse with Armor Remnants & Satchel
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(24, 26, 14, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e5dccb';
    ctx.beginPath();
    ctx.arc(15, 22, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(20, 24, 10, 5);
  }

  tileCache.set(key, canvas);
  return canvas;
}

/**
 * Draws a 160x160 3D Embossed Antique Gold Coin for the Fate Coin Flip Modal
 * HEADS (MẶT NGỬA) = Crowned Holy Mother Portrait with Radiant Halo
 * TAILS (MẶT SẤP) = Goethe Sanctuary Emblem (Cross inside Solar Eclipse Circle)
 */
export function drawEngravedGoldCoin(
  ctx: CanvasRenderingContext2D,
  side: 'HEADS' | 'TAILS' | null,
  size: number = 160,
  clearCanvas: boolean = true,
  metal: 'silver' | 'gold' = 'silver'
) {
  ctx.save();
  if (clearCanvas) {
    ctx.clearRect(0, 0, size, size);
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;
  const isSilver = metal === 'silver';

  // Outer ambient drop shadow (only when standalone or front-facing)
  if (clearCanvas) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 5, r + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Metallic 3D Rim Gradient (Sterling Silver or Antique Gold)
  const rimGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  if (isSilver) {
    if (side === 'TAILS') {
      rimGrad.addColorStop(0, '#f1f5f9');
      rimGrad.addColorStop(0.35, '#94a3b8');
      rimGrad.addColorStop(0.7, '#334155');
      rimGrad.addColorStop(1, '#cbd5e1');
    } else {
      rimGrad.addColorStop(0, '#ffffff');
      rimGrad.addColorStop(0.3, '#cbd5e1');
      rimGrad.addColorStop(0.7, '#475569');
      rimGrad.addColorStop(1, '#e2e8f0');
    }
  } else if (side === 'TAILS') {
    rimGrad.addColorStop(0, '#fde68a');
    rimGrad.addColorStop(0.35, '#d97706');
    rimGrad.addColorStop(0.7, '#78350f');
    rimGrad.addColorStop(1, '#f59e0b');
  } else {
    rimGrad.addColorStop(0, '#fef08a');
    rimGrad.addColorStop(0.3, '#eab308');
    rimGrad.addColorStop(0.7, '#854d0e');
    rimGrad.addColorStop(1, '#fde047');
  }

  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isSilver ? '#0f172a' : '#451a03';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Serrated Milled Coin Edge (36 notches around rim)
  ctx.strokeStyle = isSilver ? 'rgba(15, 23, 42, 0.78)' : 'rgba(69, 26, 3, 0.75)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 36; i++) {
    const ang = (i * Math.PI * 2) / 36;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (r - 6), cy + Math.sin(ang) * (r - 6));
    ctx.lineTo(cx + Math.cos(ang) * (r - 1), cy + Math.sin(ang) * (r - 1));
    ctx.stroke();
  }

  // Recessed Inner Coin Face
  const faceR = r - 9;
  const faceGrad = ctx.createRadialGradient(cx - faceR * 0.25, cy - faceR * 0.25, 6, cx, cy, faceR);
  if (isSilver) {
    faceGrad.addColorStop(0, '#94a3b8');
    faceGrad.addColorStop(0.65, '#475569');
    faceGrad.addColorStop(1, '#1e293b');
  } else {
    faceGrad.addColorStop(0, '#ca8a04');
    faceGrad.addColorStop(0.65, '#854d0e');
    faceGrad.addColorStop(1, '#451a03');
  }
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, faceR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isSilver ? '#e2e8f0' : '#fde047';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, faceR - 2, 0, Math.PI * 2);
  ctx.stroke();

  const effectiveSide = side || 'HEADS';

  if (effectiveSide === 'HEADS') {
    // HEADS: Crowned Holy Mother Relief Portrait with Radiant Halo
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 26, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI * 2) / 12;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 28, cy - 6 + Math.sin(ang) * 28);
      ctx.lineTo(cx + Math.cos(ang) * 35, cy - 6 + Math.sin(ang) * 35);
      ctx.stroke();
    }

    // Draped Veil & Shoulders Bust
    const reliefGrad = ctx.createLinearGradient(cx - 24, cy - 28, cx + 24, cy + 38);
    reliefGrad.addColorStop(0, '#fef08a');
    reliefGrad.addColorStop(0.5, '#eab308');
    reliefGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = reliefGrad;
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cx - 28, cy + 36);
    ctx.quadraticCurveTo(cx - 24, cy + 8, cx - 14, cy - 10);
    ctx.quadraticCurveTo(cx, cy - 26, cx + 14, cy - 10);
    ctx.quadraticCurveTo(cx + 24, cy + 8, cx + 28, cy + 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sculpted Face Oval
    ctx.beginPath();
    ctx.ellipse(cx, cy - 3, 12, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Serene Closed Eyes & Nose Bridge
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 4);
    ctx.quadraticCurveTo(cx - 4, cy - 2, cx - 2, cy - 4);
    ctx.moveTo(cx + 2, cy - 4);
    ctx.quadraticCurveTo(cx + 4, cy - 2, cx + 7, cy - 4);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 2);
    ctx.stroke();

    // 5-Spire Gothic Crown
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 15);
    ctx.lineTo(cx - 13, cy - 28);
    ctx.lineTo(cx - 7, cy - 20);
    ctx.lineTo(cx, cy - 33);
    ctx.lineTo(cx + 7, cy - 20);
    ctx.lineTo(cx + 13, cy - 28);
    ctx.lineTo(cx + 15, cy - 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // TAILS: Goethe Sanctuary Emblem (Ornate Cross inside Solar Eclipse Circle)
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.stroke();

    // Eclipse rays
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI * 2) / 8 + Math.PI / 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 34, cy + Math.sin(ang) * 34);
      ctx.lineTo(cx + Math.cos(ang) * 43, cy + Math.sin(ang) * 43);
      ctx.stroke();
    }

    // Ornate Gothic Cross of Goethe
    const crossGrad = ctx.createLinearGradient(cx - 24, cy - 34, cx + 24, cy + 34);
    crossGrad.addColorStop(0, '#fef08a');
    crossGrad.addColorStop(0.5, '#f59e0b');
    crossGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = crossGrad;
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;

    // Vertical beam
    ctx.fillRect(cx - 6, cy - 36, 12, 72);
    ctx.strokeRect(cx - 6, cy - 36, 12, 72);
    // Horizontal beam
    ctx.fillRect(cx - 28, cy - 10, 56, 12);
    ctx.strokeRect(cx - 28, cy - 10, 56, 12);

    // Center Blood Ruby / Solar Core
    ctx.fillStyle = '#be123c';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Specular metallic sheen across coin surface
  const sheen = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.4, cy + r * 0.4);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the 3-Phase 1.6-Second 3D Parabolic Coin Flip Animation on Canvas:
 * - Phase 1 (0.0s - 0.65s): Launch upward from bottom along parabolic arc with rapid 3D horizontal-axis flip (scaleY = Math.cos(flipAngle)) alternating HEADS/TAILS + shrinking ground shadow.
 * - Phase 2 (0.65s - 1.15s): Rapid fall to ground, decelerating flip, light bounce on stone floor, then 200ms perspective rest (scaleY ~ 0.45) revealing the result face.
 * - Phase 3 (1.15s - 1.60s): Smooth glide to screen center, rotating to front-facing (scaleY = 1) and zooming to crisp 160x160px result.
 * Supports both 1-coin and 2-coin (Lucky Coin x2) diverging parabolic trajectories.
 */
export function drawParabolicCoinFlipStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedMs: number,
  resultSide: 'HEADS' | 'TAILS',
  secondResultSide?: 'HEADS' | 'TAILS' | null
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const coins: Array<{ targetSide: 'HEADS' | 'TAILS'; idx: number }> = secondResultSide
    ? [
        { targetSide: resultSide, idx: 0 },
        { targetSide: secondResultSide, idx: 1 },
      ]
    : [{ targetSide: resultSide, idx: 0 }];

  const groundY = height * 0.74;
  const startY = height * 0.94;
  const apexY = height * 0.17;
  const centerY = height * 0.48;
  const baseCoinSize = 160;

  for (const coin of coins) {
    const isDual = coins.length === 2;
    const dir = coin.idx === 0 ? -1 : 1;

    let x = width / 2;
    let y = centerY;
    let scaleY = 1;
    let coinScale = 1;
    let tiltAngle = 0;
    let activeFace: 'HEADS' | 'TAILS' = coin.targetSide;
    let shadowAlpha = 0;
    let shadowScale = 1;
    let impactRingProgress = -1;

    if (elapsedMs < 650) {
      // Phase 1 (0.0s - 0.65s): Parabolic upward launch from bottom edge
      const t1 = Math.max(0, elapsedMs / 650);
      const arc = 1 - Math.pow(1 - t1, 2.15);
      y = startY + (apexY - startY) * arc;

      if (isDual) {
        const spread = 28 + 56 * t1;
        x = width / 2 + dir * spread;
      } else {
        x = width / 2 + Math.sin(t1 * Math.PI) * 6;
      }

      // 3D horizontal-axis flip (scaleY = Math.cos(flipAngle)) alternating HEADS & TAILS
      const flipAngle = t1 * Math.PI * 8.5 + coin.idx * 0.85;
      const cosVal = Math.cos(flipAngle);
      activeFace = cosVal >= 0 ? 'HEADS' : 'TAILS';
      scaleY = Math.max(0.06, Math.abs(cosVal));

      tiltAngle =
        Math.sin(t1 * Math.PI * 3 + coin.idx) * 0.13 + (isDual ? dir * 0.08 : 0.05);
      coinScale = 0.72 + 0.18 * Math.sin(t1 * Math.PI * 0.6);

      // Ground shadow shrinks as coin flies higher
      shadowScale = 1 - 0.62 * arc;
      shadowAlpha = 0.56 * (1 - 0.6 * arc);
    } else if (elapsedMs < 1150) {
      // Phase 2 (0.65s - 1.15s): Fall down, bounce lightly, and rest at perspective angle (scaleY ~ 0.45) for 200ms
      const t2 = (elapsedMs - 650) / 500; // 500ms total

      if (isDual) {
        x = width / 2 + dir * 84;
      } else {
        x = width / 2;
      }

      if (t2 < 0.44) {
        // 2A (0.65s - 0.87s): Rapid fall to ground with decelerating flip
        const f = t2 / 0.44;
        const fallQuad = f * f;
        y = apexY + (groundY - apexY) * fallQuad;

        const flipAngle = Math.PI * 8.5 + (1 - Math.pow(1 - f, 1.6)) * Math.PI * 3.0 + coin.idx * 0.6;
        const cosVal = Math.cos(flipAngle);
        activeFace = cosVal >= 0 ? 'HEADS' : 'TAILS';
        scaleY = Math.max(0.08, Math.abs(cosVal));
        tiltAngle = (1 - f) * (isDual ? dir * 0.08 : 0.08);
        coinScale = 0.9 - 0.1 * f;

        shadowScale = 0.38 + 0.62 * fallQuad;
        shadowAlpha = 0.24 + 0.46 * fallQuad;
      } else if (t2 < 0.60) {
        // 2B (0.87s - 0.95s): Light bounce on impact
        const b = (t2 - 0.44) / 0.16;
        const bounceArc = Math.sin(b * Math.PI);
        y = groundY - bounceArc * 26;
        activeFace = coin.targetSide;
        scaleY = 0.28 + 0.17 * b + bounceArc * 0.12;
        tiltAngle = bounceArc * (isDual ? dir * 0.05 : -0.04);
        coinScale = 0.80;

        shadowScale = 1 - bounceArc * 0.18;
        shadowAlpha = 0.68 - bounceArc * 0.15;
        impactRingProgress = (t2 - 0.44) / 0.45;
      } else {
        // 2C (0.95s - 1.15s = 200ms): Rest flat on ground at perspective angle (scaleY = 0.45) revealing result
        y = groundY;
        activeFace = coin.targetSide;
        scaleY = 0.45;
        tiltAngle = 0;
        coinScale = 0.80;

        shadowScale = 1.0;
        shadowAlpha = 0.72;
        impactRingProgress = Math.min(1, (t2 - 0.44) / 0.45);
      }
    } else {
      // Phase 3 (1.15s - 1.60s): Glide to screen center, rotate front-facing (scaleY = 1) & zoom to 160x160px
      const t3 = Math.min(1, (elapsedMs - 1150) / 450);
      const e3 = 1 - Math.pow(1 - t3, 3);

      if (isDual) {
        x = width / 2 + dir * (84 + 6 * e3);
      } else {
        x = width / 2;
      }

      y = groundY + (centerY - groundY) * e3;
      activeFace = coin.targetSide;
      scaleY = 0.45 + 0.55 * e3;
      tiltAngle = 0;
      coinScale = isDual ? 0.80 + 0.14 * e3 : 0.80 + 0.20 * e3;

      shadowScale = 1.0 + 0.25 * e3;
      shadowAlpha = 0.72 * (1 - e3 * 0.85);
    }

    // 1. Draw Ground Shadow beneath coin
    if (shadowAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(
        x,
        groundY + 14,
        54 * shadowScale,
        16 * shadowScale,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    // Subtle golden impact ripple when touching the floor in Phase 2
    if (impactRingProgress >= 0 && impactRingProgress < 1) {
      ctx.save();
      ctx.strokeStyle = `rgba(253, 224, 71, ${(0.45 * (1 - impactRingProgress)).toFixed(3)})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(
        x,
        groundY + 6,
        42 + impactRingProgress * 38,
        14 + impactRingProgress * 12,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw 3D Coin with Perspective ScaleY, Extruded Metallic Rim Edge & Embossed Face
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tiltAngle);
    ctx.scale(coinScale, coinScale);

    const r = baseCoinSize * 0.44;
    // Draw 3D cylindrical rim thickness when coin is tilted/flipping (scaleY < 0.98)
    const rimThickness = Math.max(2, Math.round(12 * (1 - scaleY * 0.82)));
    if (rimThickness > 2) {
      const edgeGrad = ctx.createLinearGradient(-r, 0, r, 0);
      edgeGrad.addColorStop(0, '#0f172a');
      edgeGrad.addColorStop(0.25, '#64748b');
      edgeGrad.addColorStop(0.5, '#f8fafc');
      edgeGrad.addColorStop(0.75, '#475569');
      edgeGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = edgeGrad;
      ctx.beginPath();
      ctx.ellipse(0, rimThickness, r, r * scaleY, 0, 0, Math.PI);
      ctx.lineTo(-r, 0);
      ctx.ellipse(0, 0, r, r * scaleY, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw scaled top coin face
    ctx.save();
    ctx.scale(1, scaleY);
    ctx.translate(-baseCoinSize / 2, -baseCoinSize / 2);
    drawEngravedGoldCoin(ctx, activeFace, baseCoinSize, false);
    ctx.restore();

    ctx.restore();
  }

  ctx.restore();
}


/**
 * Multi-Tile Landmark Renderer (Over-border rendering for HEXEN_ALTAR 3x2, RITUAL_CIRCLE 3x3, BOOKSHELF 1x2, VOID_RIFT 3x3)
 */
export function drawMultiTileLandmark(
  ctx: CanvasRenderingContext2D,
  tileType: string,
  tileX: number,
  tileY: number,
  tileW: number,
  tileH: number,
  animTick: number,
  isLooted: boolean = false,
  isPlayerInside: boolean = false,
  deityType: RitualDeityType = 'uninscribed'
) {
  ctx.save();
  const cx = (tileX + 0.5) * tileW;
  const cy = (tileY + 0.5) * tileH;
  const pulse = Math.sin(animTick * 0.6) * 0.5 + 0.5;

  if (tileType === 'RITUAL_CIRCLE') {
    // 3x3 Tile (144x144px) Sunken Arcane Matrix carved into stone floor with 4 distinct deity themes
    const radiusOuter = tileW * 1.38;
    const radiusMid = tileW * 1.02;
    const radiusInner = tileW * 0.56;

    const paletteMap: Record<
      RitualDeityType,
      {
        glowInner: string;
        glowOuter: string;
        primary: string;
        secondary: string;
        nodeFill: string;
      }
    > = {
      uninscribed: {
        glowInner: isPlayerInside ? 'rgba(148, 163, 184, 0.25)' : 'rgba(71, 85, 105, 0.14)',
        glowOuter: 'rgba(15, 23, 42, 0.10)',
        primary: isPlayerInside ? '#cbd5e1' : 'rgba(148, 163, 184, 0.65)',
        secondary: isPlayerInside ? '#94a3b8' : 'rgba(100, 116, 139, 0.55)',
        nodeFill: '#94a3b8',
      },
      holy_mother: {
        glowInner: isPlayerInside ? 'rgba(248, 250, 252, 0.42)' : 'rgba(234, 179, 8, 0.22)',
        glowOuter: 'rgba(250, 204, 21, 0.18)',
        primary: isPlayerInside ? '#ffffff' : `rgba(248, 250, 252, ${0.72 + pulse * 0.22})`,
        secondary: isPlayerInside ? '#fef08a' : `rgba(234, 179, 8, ${0.60 + pulse * 0.28})`,
        nodeFill: isPlayerInside ? '#fef08a' : '#f8fafc',
      },
      demon_lord: {
        glowInner: isPlayerInside ? 'rgba(220, 38, 38, 0.48)' : 'rgba(153, 27, 27, 0.26)',
        glowOuter: 'rgba(127, 29, 29, 0.20)',
        primary: isPlayerInside ? '#fca5a5' : `rgba(239, 68, 68, ${0.72 + pulse * 0.24})`,
        secondary: isPlayerInside ? '#ef4444' : `rgba(185, 28, 28, ${0.65 + pulse * 0.28})`,
        nodeFill: isPlayerInside ? '#fecaca' : '#ef4444',
      },
      void_god: {
        glowInner: isPlayerInside ? 'rgba(192, 132, 252, 0.46)' : 'rgba(107, 33, 168, 0.26)',
        glowOuter: 'rgba(88, 28, 135, 0.22)',
        primary: isPlayerInside ? '#e9d5ff' : `rgba(192, 132, 252, ${0.72 + pulse * 0.24})`,
        secondary: isPlayerInside ? '#c084fc' : `rgba(126, 34, 206, ${0.62 + pulse * 0.28})`,
        nodeFill: isPlayerInside ? '#f3e8ff' : '#a855f7',
      },
    };
    const pal = paletteMap[deityType] || paletteMap.uninscribed;

    // Sunken stone recess ring
    const recessGrad = ctx.createRadialGradient(cx, cy, radiusInner * 0.2, cx, cy, radiusOuter);
    recessGrad.addColorStop(0, pal.glowInner);
    recessGrad.addColorStop(0.65, pal.glowOuter);
    recessGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = recessGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusOuter, 0, Math.PI * 2);
    ctx.fill();

    // Chiseled dark groove shadow
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusOuter, 0, Math.PI * 2);
    ctx.arc(cx, cy, radiusMid, 0, Math.PI * 2);
    ctx.stroke();

    const primaryStroke = isLooted ? 'rgba(100, 116, 139, 0.42)' : pal.primary;
    const secondaryStroke = isLooted ? 'rgba(71, 85, 105, 0.34)' : pal.secondary;

    ctx.strokeStyle = primaryStroke;
    ctx.lineWidth = isPlayerInside ? 2.8 : 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusOuter, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = secondaryStroke;
    ctx.lineWidth = isPlayerInside ? 2.2 : 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusMid, 0, Math.PI * 2);
    ctx.arc(cx, cy, radiusInner, 0, Math.PI * 2);
    ctx.stroke();

    if (deityType !== 'uninscribed') {
      // 8-Pointed Octagram & Elder Glyphs across the 3x3 floor
      for (let i = 0; i < 8; i++) {
        const a1 = (i * Math.PI) / 4;
        const a2 = ((i + 3) * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * radiusMid, cy + Math.sin(a1) * radiusMid);
        ctx.lineTo(cx + Math.cos(a2) * radiusMid, cy + Math.sin(a2) * radiusMid);
        ctx.stroke();

        // Rune nodes around outer ring
        const rx = cx + Math.cos(a1) * ((radiusOuter + radiusMid) * 0.5);
        const ry = cy + Math.sin(a1) * ((radiusOuter + radiusMid) * 0.5);
        ctx.fillStyle = pal.nodeFill;
        ctx.beginPath();
        ctx.arc(rx, ry, isPlayerInside ? 4 : 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Distinct Center Symbol per Deity
    if (deityType === 'holy_mother') {
      ctx.strokeStyle = primaryStroke;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - radiusInner * 0.65);
      ctx.lineTo(cx, cy + radiusInner * 0.65);
      ctx.moveTo(cx - radiusInner * 0.45, cy - radiusInner * 0.15);
      ctx.lineTo(cx + radiusInner * 0.45, cy - radiusInner * 0.15);
      ctx.stroke();
    } else if (deityType === 'demon_lord') {
      ctx.strokeStyle = primaryStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const a2 = (((i + 2) % 5) * 2 * Math.PI) / 5 - Math.PI / 2;
        ctx.moveTo(cx + Math.cos(a1) * radiusInner * 0.78, cy + Math.sin(a1) * radiusInner * 0.78);
        ctx.lineTo(cx + Math.cos(a2) * radiusInner * 0.78, cy + Math.sin(a2) * radiusInner * 0.78);
      }
      ctx.stroke();
    } else if (deityType === 'void_god') {
      ctx.strokeStyle = primaryStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusInner * 0.72, radiusInner * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = pal.nodeFill;
      ctx.beginPath();
      ctx.arc(cx, cy, radiusInner * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  if (tileType === 'HEXEN_ALTAR') {
    // 3x2 Tile (144x96px) 3-Stepped Stone Dais + Glowing Purple-Gold Elder Rune Circle + 4 Flickering Candlesticks
    const daisW = tileW * 2.85; // ~136px across 3 tiles
    const daisH = tileH * 1.85; // ~88px across 2 tiles
    const leftX = cx - daisW / 2;
    const topY = cy - daisH * 0.58;

    // Ambient Point-Light Floor Halo piercing darkness
    const halo = ctx.createRadialGradient(cx, cy, 8, cx, cy, tileW * 2.1);
    halo.addColorStop(0, `rgba(216, 180, 254, ${0.38 + pulse * 0.14})`);
    halo.addColorStop(0.5, `rgba(147, 51, 234, ${0.22 + pulse * 0.08})`);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, tileW * 2.1, 0, Math.PI * 2);
    ctx.fill();

    // 3 Stepped Stone Platforms (Outer -> Mid -> Inner Sanctum)
    const steps = [
      { insetX: 0, insetY: 0, fill: '#1e1826', border: '#4c3b63' },
      { insetX: 12, insetY: 8, fill: '#282033', border: '#6d548c' },
      { insetX: 24, insetY: 16, fill: '#332742', border: '#a855f7' },
    ];
    for (const st of steps) {
      const sx = leftX + st.insetX;
      const sy = topY + st.insetY;
      const sw = daisW - st.insetX * 2;
      const sh = daisH - st.insetY * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(sx + 3, sy + 4, sw, sh);
      ctx.fillStyle = st.fill;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = st.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);
    }

    // Center Glowing Purple-Gold Elder Rune Circle
    const rCircle = tileW * 0.58;
    const circleCenterY = topY + daisH * 0.5;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, circleCenterY, rCircle, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a1 = (i * Math.PI) / 3 + animTick * 0.04;
      const a2 = ((i + 2) * Math.PI) / 3 + animTick * 0.04;
      ctx.moveTo(cx + Math.cos(a1) * rCircle, circleCenterY + Math.sin(a1) * rCircle);
      ctx.lineTo(cx + Math.cos(a2) * rCircle, circleCenterY + Math.sin(a2) * rCircle);
    }
    ctx.stroke();

    // 4 Corner Candlesticks with Flickering Flames
    const candleOffsets = [
      [leftX + 16, topY + 14],
      [leftX + daisW - 16, topY + 14],
      [leftX + 16, topY + daisH - 16],
      [leftX + daisW - 16, topY + daisH - 16],
    ];
    for (let i = 0; i < candleOffsets.length; i++) {
      const [kx, ky] = candleOffsets[i];
      // Brass stand + wax pillar
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(kx - 4, ky, 8, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(kx - 2.5, ky - 10, 5, 10);
      // Flickering flame
      const flickerY = ((animTick + i) % 2 === 0 ? -1 : 1);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
      ctx.beginPath();
      ctx.arc(kx, ky - 13 + flickerY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(kx, ky - 13 + flickerY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  if (tileType === 'BOOKSHELF') {
    // 1x2 Gothic Wooden Bookcase seated cleanly so crown and candle never clip into top wall
    const px = tileX * tileW;
    const w = tileW;
    const h = Math.round(tileH * 1.58);
    const py = (tileY + 1) * tileH - h - 4;

    // Ground drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(px + 2, py + h - 8, w - 4, 10);

    // Tall Gothic Oak Frame + Pointed Arch Crown
    ctx.fillStyle = '#2b180c';
    ctx.fillRect(px + 3, py + 11, w - 6, h - 14);
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 13);
    ctx.lineTo(px + w / 2, py + 3);
    ctx.lineTo(px + w - 3, py + 13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#120904';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 3, py + 11, w - 6, h - 14);

    // 4 Tiers of Shelves packed with Ancient Tomes & Parchment Scrolls
    const tomeColors = ['#991b1b', '#1e3a8a', '#b45309', '#581c87', '#065f46', '#78350f'];
    const shelfStep = Math.floor((h - 22) / 4);
    const shelfH = Math.max(9, shelfStep - 3);
    for (let row = 0; row < 4; row++) {
      const sy = py + 15 + row * shelfStep;
      ctx.fillStyle = '#160c06';
      ctx.fillRect(px + 6, sy, w - 12, shelfH);

      for (let b = 0; b < 6; b++) {
        // If looted, leave gaps where books were pulled out
        if (isLooted && (row + b) % 3 === 0) continue;
        ctx.fillStyle = tomeColors[(row * 3 + b) % tomeColors.length];
        ctx.fillRect(px + 7 + b * 5.6, sy + 1.5, 4.4, shelfH - 2);
      }
      // Rolled parchment scroll on row 1
      if (!isLooted && row === 1) {
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(px + w - 16, sy + 3, 8, 3.5);
      }
    }

    if (!isLooted) {
      // Unlooted: Golden candle burning brightly on top ledge
      const cX = px + w - 11;
      const cY = py + 11;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cX - 2, cY - 6, 4, 6);
      const glow = ctx.createRadialGradient(cX, cY - 9, 1, cX, cY - 9, 14);
      glow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      glow.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cX, cY - 9, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cX, cY - 8 + (animTick % 2), 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Looted: Candle extinguished + Scattered pages & fallen book at foot of shelf
      const cX = px + w - 11;
      const cY = py + 11;
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cX - 2, cY - 4, 4, 4);

      // Scattered parchment pages at base
      ctx.fillStyle = '#d6c5ad';
      ctx.fillRect(px + 8, py + h - 8, 10, 5);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(px + 22, py + h - 7, 12, 6);
      ctx.fillStyle = '#e7dcc8';
      ctx.fillRect(px + 24, py + h - 6, 8, 3.5);
    }

    ctx.restore();
    return;
  }

  if (tileType === 'VOID_RIFT') {
    // 3x3 Tile (144x144px) Spatial Tear on Floor 3 + Purple Lightning + Levitating Rocks + Thánh Tử 13 Cage & Elixir Pedestal
    const riftR = tileW * 1.35;

    // Spatial distortion aura
    const aura = ctx.createRadialGradient(cx, cy - 8, 6, cx, cy - 8, riftR * 1.25);
    aura.addColorStop(0, '#fdf4ff');
    aura.addColorStop(0.28, '#a855f7');
    aura.addColorStop(0.62, 'rgba(88, 28, 135, 0.65)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, riftR * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // Jagged vertical-diagonal dimensional tear core
    ctx.fillStyle = '#05020a';
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - riftR * 0.95);
    ctx.lineTo(cx + 22, cy - 18);
    ctx.lineTo(cx + 12, cy + 16);
    ctx.lineTo(cx, cy + riftR * 0.65);
    ctx.lineTo(cx - 18, cy + 10);
    ctx.lineTo(cx - 14, cy - 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crackling purple lightning arcs radiating from the tear
    ctx.strokeStyle = animTick % 2 === 0 ? '#e879f9' : '#c084fc';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3 + (animTick % 4) * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 14, cy - 8 + Math.sin(ang) * 14);
      ctx.lineTo(
        cx + Math.cos(ang + 0.2) * (riftR * 0.55),
        cy - 8 + Math.sin(ang - 0.15) * (riftR * 0.55)
      );
      ctx.lineTo(cx + Math.cos(ang) * (riftR * 0.95), cy - 8 + Math.sin(ang) * (riftR * 0.95));
      ctx.stroke();
    }

    // Levitating stone shards orbiting according to animTick
    const floatOffset = Math.sin(animTick * 0.8) * 5;
    ctx.fillStyle = '#3b2859';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.4;
    for (const [ox, oy, sz] of [
      [-46, -28, 9],
      [48, -22, 8],
      [-38, 22, 7],
      [44, 24, 9],
    ]) {
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy + floatOffset, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Left Side of Rift: Half-open Iron Cage & Thánh Tử Thứ 13 (child_13)
    const cageX = cx - tileW * 0.95;
    const cageY = cy - tileH * 0.35;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(cageX, cageY, 34, 42);
    drawPixelSprite(ctx, 'child_13', cageX - 4, cageY - 18, 42, 62);

    // Right Side of Rift: Mossy Stone Pedestal holding the unique Elixir of Ancients
    const pedX = cx + tileW * 0.65;
    const pedY = cy + 2;
    ctx.fillStyle = '#334155';
    ctx.fillRect(pedX - 12, pedY, 24, 22);
    ctx.strokeStyle = '#0f172a';
    ctx.strokeRect(pedX - 12, pedY, 24, 22);
    if (!isLooted) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pedX, pedY - 6 + floatOffset * 0.3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a7f3d0';
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  // 5. VACANT BLOOD THRONE (Ngai Vàng Máu bỏ trống sau khi hạ gục Vaelis — 3x2 Monument)
  if (tileType === 'BLOOD_THRONE') {
    const pulse = 0.65 + 0.35 * Math.sin(animTick * 0.7);
    // Soft crimson/black contact aura on dais
    const aura = ctx.createRadialGradient(cx, cy + 4, 8, cx, cy + 4, tileW * 1.45);
    aura.addColorStop(0, `rgba(153, 27, 27, ${(0.55 * pulse).toFixed(2)})`);
    aura.addColorStop(0.55, 'rgba(69, 10, 10, 0.25)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, tileW * 1.4, tileH * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3-Step Carved Gothic Stone Dais aligned with the Royal Crimson Carpet Runner
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 2;
    // Step 1 (lowest wide tier)
    ctx.fillStyle = '#141217';
    ctx.fillRect(cx - tileW * 1.18, cy - 2, tileW * 2.36, tileH * 0.96);
    ctx.strokeRect(cx - tileW * 1.18, cy - 2, tileW * 2.36, tileH * 0.96);
    // Step 2 (middle tier)
    ctx.fillStyle = '#1b171e';
    ctx.fillRect(cx - tileW * 1.02, cy - 6, tileW * 2.04, tileH * 0.84);
    ctx.strokeRect(cx - tileW * 1.02, cy - 6, tileW * 2.04, tileH * 0.84);
    // Step 3 (upper throne plinth with subtle stone highlight)
    ctx.fillStyle = '#251e26';
    ctx.fillRect(cx - tileW * 0.86, cy - 10, tileW * 1.72, tileH * 0.70);
    ctx.strokeRect(cx - tileW * 0.86, cy - 10, tileW * 1.72, tileH * 0.70);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - tileW * 0.85, cy - 9);
    ctx.lineTo(cx + tileW * 0.85, cy - 9);
    ctx.stroke();
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 2;

    // Tall Iron-Bone Throne Backrest
    const backGrad = ctx.createLinearGradient(cx - 28, cy - tileH * 1.5, cx + 28, cy + 16);
    backGrad.addColorStop(0, '#362129');
    backGrad.addColorStop(0.5, '#160d12');
    backGrad.addColorStop(1, '#070407');
    ctx.fillStyle = backGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy + 14);
    ctx.lineTo(cx - 22, cy - tileH * 1.15);
    ctx.lineTo(cx, cy - tileH * 1.45);
    ctx.lineTo(cx + 22, cy - tileH * 1.15);
    ctx.lineTo(cx + 26, cy + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rim light on throne crest + ancient impaled swords fanning behind
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.4;
    for (const [ox, oy] of [[-32, -52], [32, -52], [-38, -28], [38, -28]]) {
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy);
      ctx.lineTo(cx + ox * 0.35, cy - 10);
      ctx.stroke();
    }
    // Vacant blood-stained seat & broken chains
    ctx.fillStyle = '#5c1118';
    ctx.fillRect(cx - 18, cy - 4, 36, 16);
    ctx.strokeRect(cx - 18, cy - 4, 36, 16);
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - tileH * 1.12);
    ctx.lineTo(cx, cy - tileH * 1.42);
    ctx.lineTo(cx + 20, cy - tileH * 1.12);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.restore();
}

/**
 * Draws Canonical Lore Set-Dressing Props around NPCs & Boss Vaelis so no NPC stands on bare floor
 */
export function drawNpcSetDressing(
  ctx: CanvasRenderingContext2D,
  npcTypeOrBoss: string,
  tileX: number,
  tileY: number,
  tileW: number,
  tileH: number,
  animTick: number
) {
  ctx.save();
  const cx = (tileX + 0.5) * tileW;
  const cy = (tileY + 0.5) * tileH;

  if (npcTypeOrBoss === 'NPC_SMITH') {
    // Floor 1 Blood Forge: Boiling red iron cauldron/brazier on left, weapon rack on right, blood-soaked anvil
    // Red fire brazier / cauldron
    const bx = cx - tileW * 0.95;
    const by = cy + 4;
    const fireGlow = ctx.createRadialGradient(bx, by, 2, bx, by, 32);
    fireGlow.addColorStop(0, 'rgba(251, 146, 60, 0.85)');
    fireGlow.addColorStop(0.5, 'rgba(220, 38, 38, 0.38)');
    fireGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fireGlow;
    ctx.beginPath();
    ctx.arc(bx, by, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(bx, by, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = animTick % 2 === 0 ? '#ef4444' : '#f97316';
    ctx.beginPath();
    ctx.arc(bx, by - 2, 9, 0, Math.PI * 2);
    ctx.fill();

    // Weapon Rack on right
    const rx = cx + tileW * 0.85;
    const ry = cy - 16;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx - 14, ry, 28, 32);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    for (const ox of [-7, 0, 7]) {
      ctx.beginPath();
      ctx.moveTo(rx + ox, ry + 4);
      ctx.lineTo(rx + ox, ry + 28);
      ctx.stroke();
    }
  } else if (npcTypeOrBoss === 'NPC_GLASS_LADY') {
    // Floor 1 Antechamber: Ruined banquet table on left, extinguished candelabra on right, crystal cage rim at base
    ctx.fillStyle = '#3b2314';
    ctx.fillRect(cx - tileW * 1.15, cy + 2, 34, 18);
    ctx.strokeStyle = '#140b05';
    ctx.strokeRect(cx - tileW * 1.15, cy + 2, 34, 18);
    // White cloth remnant & skull on banquet table
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - tileW * 1.05, cy + 4, 14, 10);

    // Extinguished iron candelabra on right
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx + tileW * 0.85, cy + 16);
    ctx.lineTo(cx + tileW * 0.85, cy - 12);
    ctx.moveTo(cx + tileW * 0.85 - 8, cy - 8);
    ctx.lineTo(cx + tileW * 0.85 + 8, cy - 8);
    ctx.stroke();
  } else if (npcTypeOrBoss === 'demon_lord_vaelis') {
    // Floor 1 Throne Room: Bone & black-iron Throne dais behind Vaelis + heavy iron chains pinned into stone floor
    ctx.fillStyle = '#140c10';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2.5;
    ctx.fillRect(cx - tileW * 1.35, cy - tileH * 1.4, tileW * 2.7, tileH * 2.2);
    ctx.strokeRect(cx - tileW * 1.35, cy - tileH * 1.4, tileW * 2.7, tileH * 2.2);

    // Heavy iron chains radiating to 4 floor anchors
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 3]);
    for (const [ax, ay] of [
      [-tileW * 1.5, -tileH * 1.2],
      [tileW * 1.5, -tileH * 1.2],
      [-tileW * 1.5, tileH * 1.1],
      [tileW * 1.5, tileH * 1.1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + ax, cy + ay);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  } else if (npcTypeOrBoss === 'NPC_SMUGGLER') {
    // Floor 2 Exterior / Ruined Corner: Oilskin tarp spread on ground + colored vials + wooden crate + storm lantern
    ctx.fillStyle = '#362819';
    ctx.strokeStyle = '#1c130b';
    ctx.lineWidth = 1.8;
    ctx.fillRect(cx - 34, cy - 6, 68, 30);
    ctx.strokeRect(cx - 34, cy - 6, 68, 30);

    // Colored vials on tarp
    const vialCols = ['#ef4444', '#3b82f6', '#a855f7', '#eab308'];
    vialCols.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(cx - 20 + i * 9, cy + 12, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Storm lantern on right
    const lx = cx + 26;
    const ly = cy + 6;
    const lGlow = ctx.createRadialGradient(lx, ly, 1, lx, ly, 22);
    lGlow.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
    lGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lGlow;
    ctx.beginPath();
    ctx.arc(lx, ly, 22, 0, Math.PI * 2);
    ctx.fill();
  } else if (npcTypeOrBoss === 'NPC_PRISONER') {
    // Floor 2 Dungeon Cell: Half-open iron cell bars & broken chains on floor
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    for (let ox = -24; ox <= 24; ox += 12) {
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy - 36);
      ctx.lineTo(cx + ox, cy - 6);
      ctx.stroke();
    }
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.arc(cx - 16, cy + 14, 6, 0, Math.PI * 2);
    ctx.arc(cx + 18, cy + 12, 6, 0, Math.PI * 2);
    ctx.stroke();
  } else if (npcTypeOrBoss === 'NPC_PRIEST') {
    // Floor 2 Main Nave: Cracked Holy Mother statue behind Priest weeping black blood trail across floor
    const sx = cx;
    const sy = cy - tileH * 0.85;
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy - 14, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(sx - 12, sy - 4, 24, 26);
    ctx.strokeRect(sx - 12, sy - 4, 24, 26);

    // Black blood weeping from statue eyes onto floor
    ctx.strokeStyle = '#090508';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(sx - 4, sy - 14);
    ctx.lineTo(sx - 6, cy + 18);
    ctx.moveTo(sx + 4, sy - 14);
    ctx.lineTo(sx + 8, cy + 20);
    ctx.stroke();
  } else if (npcTypeOrBoss === 'NPC_BROKEN_KNIGHT') {
    // Floor 2 Wine Cellar / Supply Room: Smashed wooden wine casks & broken legion shield split in two
    ctx.fillStyle = '#5c3a1e';
    ctx.strokeStyle = '#1f1209';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - 28, cy + 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Split legion shield on right
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(cx + 18, cy + 2);
    ctx.lineTo(cx + 32, cy + 6);
    ctx.lineTo(cx + 24, cy + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (npcTypeOrBoss === 'NPC_CHILD_12') {
    // Floor 2 Secret Sanctuary: White Wax Machine behind Child 12, golden drainage tubes & black blood pools
    ctx.fillStyle = '#e5dccb';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 20, cy - tileH * 0.95, 40, 28);
    ctx.strokeRect(cx - 20, cy - tileH * 0.95, 40, 28);

    // Golden drainage tubes arching from machine into Child 12
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - tileH * 0.7);
    ctx.quadraticCurveTo(cx - 26, cy - 10, cx - 6, cy - 6);
    ctx.moveTo(cx + 14, cy - tileH * 0.7);
    ctx.quadraticCurveTo(cx + 26, cy - 10, cx + 6, cy - 6);
    ctx.stroke();

    // Black blood pool beneath feet
    ctx.fillStyle = 'rgba(15, 5, 12, 0.85)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (npcTypeOrBoss === 'NPC_CHRONICLER') {
    // Floor 3 Rune Foyer: Ancient glowing runic stone steles & stacks of fossilized parchment tomes
    for (const ox of [-30, 30]) {
      ctx.fillStyle = '#2e1d4a';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.8;
      ctx.fillRect(cx + ox - 8, cy - 26, 16, 38);
      ctx.strokeRect(cx + ox - 8, cy - 26, 16, 38);
    }
  } else if (npcTypeOrBoss === 'NPC_PHYSICIAN') {
    // Floor 3 Star-Abyss Lab: Stone operating table on left & glass cabinet with green/purple chemical tubes on right
    // Stone operating slab
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 44, cy - 4, 28, 18);
    ctx.strokeRect(cx - 44, cy - 4, 28, 18);

    // Chemical rack with glowing green & purple test tubes
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx + 20, cy - 22, 22, 32);
    ctx.strokeRect(cx + 20, cy - 22, 22, 32);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(cx + 24, cy - 16, 4, 10);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(cx + 32, cy - 16, 4, 10);
  }

  ctx.restore();
}

export interface PaperdollSpec {
  spriteKey: string;
  equippedWeapon?: string | null;
  equippedShield?: string | null;
  equippedHead?: string | null;
  equippedBody?: string | null;
  weaponCategory?: 'sword' | 'heavy_axe' | 'dagger' | 'staff' | 'unarmed';
  weaponHands?: 0 | 1 | 2;
  vfxColor?: string;
  isUndeadSummon?: boolean;
  isPureTank?: boolean;
  limbs?: {
    leftArm: boolean;
    rightArm: boolean;
    leftLeg: boolean;
    rightLeg: boolean;
    infected?: Record<'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg', boolean>;
  };
}

/**
 * Live Equipment & Limb Paperdoll Renderer for Inventory [I]
 * Dynamically mirrors equipped Weapon, Shield, Helm, Armor & Severed/Infected limbs.
 */
export function drawInventoryPaperdoll(
  ctx: CanvasRenderingContext2D,
  spec: PaperdollSpec,
  w: number,
  h: number
) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // Moody dark gothic alcove backdrop
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.44, 6, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
  bg.addColorStop(0, spec.isUndeadSummon ? '#20142c' : '#241b1e');
  bg.addColorStop(0.7, '#110d13');
  bg.addColorStop(1, '#0d0a10');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Pedestal floor shadow
  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.89, w * 0.34, h * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  const cx = w * 0.5;
  const scale = Math.min(w / 120, h / 160);
  const limbs = spec.limbs || { leftArm: true, rightArm: true, leftLeg: true, rightLeg: true };
  const inf = limbs.infected || { leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };

  const key = spec.spriteKey;
  const isSkeleton = key === 'summon_skeleton';
  const isWraith = key === 'summon_wraith' || spec.isPureTank;
  const isChild = key === 'summon_child_12';
  const isGhoul = key === 'summon_ghoul';

  // Determine armor palette from equippedBody
  const bodyId = spec.equippedBody || '';
  let coatLight =
    key === 'fallen_knight'
      ? '#64748b'
      : key === 'forsaken_nun'
      ? '#442b36'
      : key === 'night_hunter'
      ? '#344c3a'
      : isSkeleton
      ? '#27272a'
      : isGhoul
      ? '#3f6212'
      : '#4b362e';
  let coatDark =
    key === 'fallen_knight'
      ? '#1e293b'
      : key === 'forsaken_nun'
      ? '#1b1015'
      : key === 'night_hunter'
      ? '#141f17'
      : '#0f0c12';
  let trim = '#c5a059';

  if (bodyId === 'platinum_cuirass') {
    coatLight = '#e2e8f0';
    coatDark = '#64748b';
    trim = '#facc15';
  } else if (bodyId === 'flayed_disguise' || bodyId.includes('inquisitor') || bodyId.includes('blood')) {
    coatLight = '#7f1d1d';
    coatDark = '#29070a';
    trim = '#eab308';
  } else if (
    bodyId === 'vanguard_hauberk' ||
    bodyId === 'legion_brigandine' ||
    bodyId === 'cathedral_chainmail' ||
    bodyId.includes('plate') ||
    bodyId.includes('chainmail') ||
    bodyId.includes('iron')
  ) {
    coatLight = '#94a3b8';
    coatDark = '#334155';
    trim = '#cbd5e1';
  } else if (
    bodyId === 'void_woven_robe' ||
    bodyId === 'star_pelt_coat' ||
    bodyId.includes('void') ||
    bodyId.includes('abyss')
  ) {
    coatLight = '#4c1d95';
    coatDark = '#170a2e';
    trim = '#c084fc';
  } else if (
    bodyId === 'hardened_leather_cuirass' ||
    bodyId === 'boiled_cuirass' ||
    bodyId.includes('leather') ||
    bodyId.includes('hunter')
  ) {
    coatLight = '#573b26';
    coatDark = '#24160d';
    trim = '#a16207';
  } else if (bodyId === 'goethe_cassock') {
    coatLight = '#374151';
    coatDark = '#111827';
    trim = '#facc15';
  }

  ctx.strokeStyle = '#0d0a10';
  ctx.lineWidth = Math.max(1.1, 1.2 * scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Wraith / Child-12 Spectral Ghost Silhouette
  if (isWraith || isChild) {
    const aura = ctx.createRadialGradient(cx, h * 0.45, 4, cx, h * 0.45, 46 * scale);
    aura.addColorStop(0, isChild ? 'rgba(186, 230, 253, 0.35)' : 'rgba(168, 85, 247, 0.35)');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, h * 0.45, 46 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isChild ? 'rgba(186, 230, 253, 0.72)' : 'rgba(88, 28, 135, 0.78)';
    ctx.strokeStyle = isChild ? '#e0f2fe' : '#c084fc';
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.22);
    ctx.lineTo(cx + 22 * scale, h * 0.84);
    ctx.lineTo(cx + 6 * scale, h * 0.75);
    ctx.lineTo(cx, h * 0.86);
    ctx.lineTo(cx - 8 * scale, h * 0.75);
    ctx.lineTo(cx - 22 * scale, h * 0.84);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isChild ? '#e0f2fe' : '#e9d5ff';
    ctx.beginPath();
    ctx.arc(cx, h * 0.22, 11 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0d0a10';
    ctx.beginPath();
    ctx.arc(cx - 4 * scale, h * 0.22, 2.1 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 4 * scale, h * 0.22, 2.1 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  // Cloak behind shoulders
  ctx.fillStyle = key === 'fallen_knight' ? '#7f1d1d' : coatDark;
  ctx.beginPath();
  ctx.moveTo(cx - 22 * scale, h * 0.30);
  ctx.lineTo(cx - 30 * scale, h * 0.84);
  ctx.lineTo(cx + 30 * scale, h * 0.84);
  ctx.lineTo(cx + 22 * scale, h * 0.30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Legs (left & right)
  const drawPaperdollLeg = (dir: -1 | 1, intact: boolean, infected: boolean) => {
    const lx = cx + dir * 11 * scale;
    if (!intact) {
      drawArterialStump(ctx, lx, h * 0.62, 7.5 * scale);
      return;
    }
    ctx.fillStyle = infected ? '#4d7c0f' : isSkeleton ? '#cbd5e1' : '#332924';
    ctx.fillRect(lx - 5.5 * scale, h * 0.56, 11 * scale, h * 0.31);
    ctx.strokeRect(lx - 5.5 * scale, h * 0.56, 11 * scale, h * 0.31);
    ctx.fillStyle = '#181416';
    ctx.fillRect(lx - 6.5 * scale, h * 0.81, 13 * scale, h * 0.08);
    ctx.strokeRect(lx - 6.5 * scale, h * 0.81, 13 * scale, h * 0.08);
  };
  drawPaperdollLeg(-1, limbs.leftLeg, inf.leftLeg);
  drawPaperdollLeg(1, limbs.rightLeg, inf.rightLeg);

  // Torso Armor / Coat
  const torsoGrad = ctx.createLinearGradient(cx, h * 0.29, cx, h * 0.61);
  torsoGrad.addColorStop(0, coatLight);
  torsoGrad.addColorStop(1, coatDark);
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 20 * scale, h * 0.30);
  ctx.lineTo(cx + 20 * scale, h * 0.30);
  ctx.lineTo(cx + 16 * scale, h * 0.61);
  ctx.lineTo(cx - 16 * scale, h * 0.61);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Armor trim / sash
  ctx.strokeStyle = trim;
  ctx.lineWidth = Math.max(1.1, 1.05 * scale);
  ctx.beginPath();
  ctx.moveTo(cx - 14 * scale, h * 0.32);
  ctx.lineTo(cx, h * 0.45);
  ctx.lineTo(cx + 14 * scale, h * 0.32);
  ctx.stroke();
  ctx.strokeStyle = '#0d0a10';
  ctx.lineWidth = Math.max(1.1, 1.2 * scale);

  // Left Arm & Shield (or empty if 2-handed / severed)
  if (limbs.leftArm) {
    ctx.fillStyle = inf.leftArm ? '#65a30d' : coatLight;
    ctx.beginPath();
    ctx.moveTo(cx - 20 * scale, h * 0.32);
    ctx.lineTo(cx - 34 * scale, h * 0.54);
    ctx.lineTo(cx - 25 * scale, h * 0.58);
    ctx.lineTo(cx - 16 * scale, h * 0.40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (spec.equippedShield && (spec.weaponHands || 1) < 2) {
      const shId = spec.equippedShield;
      const sx = cx - 33 * scale;
      const sy = h * 0.52;
      const isAegis = shId === 'aegis_of_order';
      const isBlessed = shId.includes('holy') || shId.includes('sanctuary');
      const isBloodShield = shId === 'blood_thorn_shield' || shId === 'widows_shield';
      const isSteelShield =
        shId === 'legion_heater' ||
        shId === 'cathedral_iron_shield' ||
        shId.includes('iron') ||
        shId.includes('tower');
      ctx.fillStyle = isAegis
        ? '#e2e8f0'
        : isBloodShield
        ? '#4c0519'
        : isBlessed
        ? '#d4af37'
        : isSteelShield
        ? '#64748b'
        : '#5c3a1e';
      ctx.strokeStyle = isAegis
        ? '#facc15'
        : isBloodShield
        ? '#991b1b'
        : isBlessed
        ? '#fef08a'
        : '#0d0a10';
      ctx.beginPath();
      ctx.moveTo(sx - 11 * scale, sy - 14 * scale);
      ctx.lineTo(sx + 11 * scale, sy - 14 * scale);
      ctx.lineTo(sx + 9 * scale, sy + 7 * scale);
      ctx.lineTo(sx, sy + 18 * scale);
      ctx.lineTo(sx - 9 * scale, sy + 7 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#0d0a10';
    }
  } else {
    drawArterialStump(ctx, cx - 21 * scale, h * 0.36, 7 * scale);
  }

  // Right Arm & Weapon
  if (limbs.rightArm) {
    ctx.fillStyle = inf.rightArm ? '#65a30d' : coatLight;
    ctx.beginPath();
    ctx.moveTo(cx + 20 * scale, h * 0.32);
    ctx.lineTo(cx + 34 * scale, h * 0.53);
    ctx.lineTo(cx + 25 * scale, h * 0.57);
    ctx.lineTo(cx + 16 * scale, h * 0.40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const cat = spec.weaponCategory || 'unarmed';
    const wCol = spec.vfxColor || '#cbd5e1';
    const hx = cx + 31 * scale;
    const hy = h * 0.53;
    const is2H = (spec.weaponHands || 1) >= 2;

    if (cat === 'sword') {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(is2H ? -0.45 : -0.25);
      // Hilt & Crossguard
      ctx.fillStyle = '#c5a059';
      ctx.fillRect(-7 * scale, -2 * scale, 14 * scale, 3.5 * scale);
      ctx.strokeRect(-7 * scale, -2 * scale, 14 * scale, 3.5 * scale);
      // Blade
      const bladeLen = (is2H ? 52 : 38) * scale;
      ctx.fillStyle = wCol === '#991b1b' ? '#7f1d1d' : '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-3 * scale, -2 * scale);
      ctx.lineTo(0, -bladeLen);
      ctx.lineTo(3 * scale, -2 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (cat === 'heavy_axe') {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(-0.3);
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(-2 * scale, -44 * scale, 4 * scale, 52 * scale);
      ctx.strokeRect(-2 * scale, -44 * scale, 4 * scale, 52 * scale);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(2 * scale, -42 * scale);
      ctx.quadraticCurveTo(16 * scale, -48 * scale, 14 * scale, -28 * scale);
      ctx.lineTo(2 * scale, -32 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (cat === 'dagger') {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(0.45);
      ctx.fillStyle = '#c5a059';
      ctx.fillRect(-4 * scale, -2 * scale, 8 * scale, 2.5 * scale);
      ctx.fillStyle = wCol === '#7e22ce' ? '#a855f7' : '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-2.5 * scale, -2 * scale);
      ctx.lineTo(0, -24 * scale);
      ctx.lineTo(2.5 * scale, -2 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (cat === 'staff') {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(-0.12);
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(-2 * scale, -48 * scale, 4 * scale, 58 * scale);
      ctx.strokeRect(-2 * scale, -48 * scale, 4 * scale, 58 * scale);
      ctx.fillStyle = wCol;
      ctx.beginPath();
      ctx.arc(0, -52 * scale, 6.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (cat !== 'unarmed') {
      const paperHandCol = inf.rightArm
        ? '#65a30d'
        : key === 'fallen_knight'
        ? '#64748b'
        : isSkeleton
        ? '#27272a'
        : '#d8c2ae';
      drawGrippingHand(ctx, hx, hy, scale, paperHandCol, 0.18);
    }
  } else {
    drawArterialStump(ctx, cx + 21 * scale, h * 0.36, 7 * scale);
  }

  // Head + Equipped Helm / Hood / Mask / Bare Head
  const headId = spec.equippedHead || '';
  if (headId.includes('helm') || headId === 'mail_coif') {
    const helmGrad = ctx.createLinearGradient(cx - 12 * scale, h * 0.10, cx + 12 * scale, h * 0.30);
    helmGrad.addColorStop(0, '#94a3b8');
    helmGrad.addColorStop(1, '#334155');
    ctx.fillStyle = helmGrad;
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.20, 12.5 * scale, 13.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0d0a10';
    ctx.fillRect(cx - 8 * scale, h * 0.18, 16 * scale, 2.8 * scale);
    ctx.fillRect(cx - 1.5 * scale, h * 0.18, 3 * scale, 10 * scale);
  } else if (headId === 'beak_mask') {
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(cx, h * 0.20, 11 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Plague bird beak + goggles
    ctx.fillStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.moveTo(cx - 3 * scale, h * 0.20);
    ctx.lineTo(cx + 15 * scale, h * 0.25);
    ctx.lineTo(cx - 2 * scale, h * 0.27);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(cx - 3 * scale, h * 0.18, 2.4 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 4 * scale, h * 0.18, 2.4 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else if (headId) {
    // Hood, Veil, Cap, or Crown
    ctx.fillStyle =
      headId.includes('blood') || headId.includes('crown')
        ? '#7f1d1d'
        : headId === 'stalkers_cap'
        ? '#2e4232'
        : headId === 'ashen_hood'
        ? '#475569'
        : key === 'forsaken_nun'
        ? '#e6dcc0'
        : key === 'night_hunter'
        ? '#2e4232'
        : coatLight;
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.06);
    ctx.bezierCurveTo(cx + 20 * scale, h * 0.10, cx + 22 * scale, h * 0.28, cx + 17 * scale, h * 0.33);
    ctx.lineTo(cx - 17 * scale, h * 0.33);
    ctx.bezierCurveTo(cx - 22 * scale, h * 0.28, cx - 20 * scale, h * 0.10, cx, h * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSkeleton ? '#d4d4d8' : isGhoul ? '#65a30d' : '#d8c2ae';
    ctx.beginPath();
    ctx.arc(cx, h * 0.21, 10 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSkeleton ? '#38bdf8' : '#09070a';
    ctx.beginPath();
    ctx.arc(cx - 3.8 * scale, h * 0.20, 1.8 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 3.8 * scale, h * 0.20, 1.8 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Bare head without helmet or hood
    ctx.fillStyle = isSkeleton ? '#d4d4d8' : isGhoul ? '#65a30d' : '#d8c2ae';
    ctx.beginPath();
    ctx.arc(cx, h * 0.20, 10.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!isSkeleton) {
      ctx.fillStyle =
        key === 'forsaken_nun' ? '#d4c8b4' : key === 'night_hunter' ? '#2c221e' : '#1e1b18';
      ctx.beginPath();
      ctx.arc(cx, h * 0.16, 10.6 * scale, Math.PI * 1.02, Math.PI * 1.98);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = isSkeleton ? '#38bdf8' : '#09070a';
    ctx.beginPath();
    ctx.arc(cx - 3.8 * scale, h * 0.20, 1.8 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 3.8 * scale, h * 0.20, 1.8 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Framed Dark-Fantasy Bust Portrait Fallback (used when .jpg portrait is unavailable or fails to load)
 */
export function drawCharacterBustPortrait(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  size: number
) {
  ctx.clearRect(0, 0, size, size);
  ctx.save();

  const isUndead = spriteKey.startsWith('summon_') || spriteKey.includes('ghoul') || spriteKey.includes('skeleton');
  const isVoid = spriteKey.includes('void') || spriteKey.includes('wraith') || spriteKey.includes('chimera');

  const bg = ctx.createRadialGradient(size * 0.5, size * 0.38, 2, size * 0.5, size * 0.5, size * 0.72);
  if (isVoid) {
    bg.addColorStop(0, '#3b1c5e');
    bg.addColorStop(1, '#090512');
  } else if (isUndead) {
    bg.addColorStop(0, '#2a331d');
    bg.addColorStop(1, '#090b08');
  } else if (spriteKey === 'forsaken_nun') {
    bg.addColorStop(0, '#38222a');
    bg.addColorStop(1, '#0a0709');
  } else if (spriteKey === 'night_hunter') {
    bg.addColorStop(0, '#1f3023');
    bg.addColorStop(1, '#080b09');
  } else {
    bg.addColorStop(0, '#3b181b');
    bg.addColorStop(1, '#0a0709');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const cx = size * 0.5;
  const s = size / 64;
  ctx.strokeStyle = '#0d0a10';
  ctx.lineWidth = Math.max(1.1, 1.15 * s);

  // Shoulders bust
  ctx.fillStyle =
    spriteKey === 'fallen_knight'
      ? '#475569'
      : spriteKey === 'forsaken_nun'
      ? '#2d1c24'
      : spriteKey === 'night_hunter'
      ? '#243628'
      : isVoid
      ? '#4c1d95'
      : isUndead
      ? '#3f6212'
      : '#4a3525';
  ctx.beginPath();
  ctx.moveTo(cx - 24 * s, size);
  ctx.quadraticCurveTo(cx - 20 * s, 39 * s, cx, 38 * s);
  ctx.quadraticCurveTo(cx + 20 * s, 39 * s, cx + 24 * s, size);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (spriteKey === 'fallen_knight') {
    // Steel Barbute Helm + Crimson Collar
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(cx - 12 * s, 37 * s, 24 * s, 7 * s);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(cx, 25 * s, 13 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#070509';
    ctx.fillRect(cx - 8 * s, 22 * s, 16 * s, 3 * s);
    ctx.fillRect(cx - 1.5 * s, 22 * s, 3 * s, 11 * s);
  } else {
    // Hood / Veil
    ctx.fillStyle =
      spriteKey === 'forsaken_nun'
        ? '#e6dcc0'
        : spriteKey === 'night_hunter'
        ? '#2e4232'
        : isVoid
        ? '#581c87'
        : '#3b3330';
    ctx.beginPath();
    ctx.moveTo(cx, 6 * s);
    ctx.bezierCurveTo(cx + 21 * s, 12 * s, cx + 21 * s, 36 * s, cx + 16 * s, 43 * s);
    ctx.lineTo(cx - 16 * s, 43 * s);
    ctx.bezierCurveTo(cx - 21 * s, 36 * s, cx - 21 * s, 12 * s, cx, 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Face
    ctx.fillStyle =
      spriteKey === 'summon_skeleton'
        ? '#cbd5e1'
        : spriteKey === 'summon_ghoul'
        ? '#84cc16'
        : spriteKey === 'summon_child_12'
        ? '#bae6fd'
        : '#d6bfa9';
    ctx.beginPath();
    ctx.arc(cx, 26 * s, 10.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes
    ctx.fillStyle =
      spriteKey === 'summon_skeleton'
        ? '#38bdf8'
        : isVoid
        ? '#e879f9'
        : '#110d12';
    ctx.beginPath();
    ctx.arc(cx - 4 * s, 25 * s, 2 * s, 0, Math.PI * 2);
    ctx.arc(cx + 4 * s, 25 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Inner antique frame edge
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  ctx.restore();
}

/**
 * Renders a slain enemy corpse directly on the dungeon floor tile:
 * - Organic multi-lobed dark crimson blood splatter underneath
 * - 'intact': actual enemy sprite rotated ~90° lying flat with real severedLimbs
 * - 'devoured': stripped pale ribcage/bone shards & darker dried blood smear
 * - 'raised': faint necrotic ash ring & dried bloodstain
 */
export function drawFallenEnemyCorpse(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  x: number,
  y: number,
  tileW: number,
  tileH: number,
  severedLimbs: Set<string>,
  state: 'intact' | 'devoured' | 'raised',
  isBoss: boolean = false
): void {
  const cx = x + tileW * 0.5;
  const cy = y + tileH * 0.56;
  const mult = isBoss ? 1.38 : 1;

  // Deterministic pseudo-random offset from spriteKey + tile coords
  let seed = Math.round(x * 7 + y * 13);
  for (let i = 0; i < spriteKey.length; i++) {
    seed = (seed * 31 + spriteKey.charCodeAt(i)) % 997;
  }
  const jitter = (n: number) => Math.sin(seed * 0.23 + n * 1.9);

  ctx.save();

  // 1. Organic multi-lobed dark crimson blood splatter underneath
  const baseColor =
    state === 'intact'
      ? 'rgba(108, 12, 18, 0.72)'
      : state === 'devoured'
      ? 'rgba(66, 8, 12, 0.76)'
      : 'rgba(54, 14, 24, 0.56)';
  const coreColor =
    state === 'intact'
      ? 'rgba(138, 18, 24, 0.62)'
      : state === 'devoured'
      ? 'rgba(84, 12, 16, 0.68)'
      : 'rgba(72, 16, 36, 0.45)';

  ctx.fillStyle = baseColor;
  const lobes: Array<[number, number, number, number, number]> = [
    [0, 0, tileW * 0.34 * mult, tileH * 0.19 * mult, 0.12],
    [-tileW * 0.16 * mult, tileH * 0.06 * mult, tileW * 0.22 * mult, tileH * 0.13 * mult, -0.35],
    [tileW * 0.18 * mult, -tileH * 0.04 * mult, tileW * 0.2 * mult, tileH * 0.12 * mult, 0.4],
    [tileW * 0.05 * mult, tileH * 0.12 * mult, tileW * 0.18 * mult, tileH * 0.1 * mult, -0.15],
  ];
  for (let i = 0; i < lobes.length; i++) {
    const [ox, oy, rx, ry, rot] = lobes[i];
    ctx.beginPath();
    ctx.ellipse(cx + ox + jitter(i) * 2.5, cy + oy + jitter(i + 4) * 2, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.ellipse(cx + jitter(9) * 2, cy + jitter(10) * 1.5, tileW * 0.22 * mult, tileH * 0.12 * mult, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Small scattered droplets around main pool
  for (let d = 0; d < 5; d++) {
    const ang = d * 1.28 + jitter(d + 12) * 0.5;
    const dist = tileW * (0.28 + (d % 3) * 0.07) * mult;
    const dr = (1.4 + (d % 2) * 0.9) * mult;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 0.6, dr * 1.25, dr * 0.85, ang, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state === 'intact') {
    // 2. Fallen enemy body: actual sprite rotated ~90° lying flat with real severedLimbs
    ctx.save();
    // Subtle dark floor contact shadow under fallen body
    ctx.fillStyle = 'rgba(4, 3, 6, 0.48)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + tileH * 0.04, tileW * 0.36 * mult, tileH * 0.16 * mult, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(cx, cy);
    const flipDir = seed % 2 === 0 ? 1 : -1;
    ctx.rotate(flipDir * (Math.PI * 0.48 + jitter(19) * 0.06));
    ctx.scale(1, 0.78);
    ctx.globalAlpha = 0.86;
    if ('filter' in ctx) {
      ctx.filter = 'brightness(0.72) saturate(0.68)';
    }

    const sprW = tileW * (isBoss ? 1.18 : 0.86);
    const sprH = tileH * (isBoss ? 1.18 : 0.86);
    drawPixelSprite(
      ctx,
      spriteKey,
      -sprW * 0.5,
      -sprH * 0.5,
      sprW,
      sprH,
      severedLimbs,
      false,
      false,
      false,
      false
    );
    ctx.restore();
  } else if (state === 'devoured') {
    // 3. Devoured remains: stripped pale ribcage & scattered bone shards
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.75)';
    ctx.lineWidth = 1.0;

    // Spine bone
    ctx.fillStyle = '#d6ccb8';
    ctx.beginPath();
    ctx.roundRect(cx - tileW * 0.2 * mult, cy - 2.2 * mult, tileW * 0.4 * mult, 4.4 * mult, 2);
    ctx.fill();
    ctx.stroke();

    // Curved pale ribs
    ctx.strokeStyle = '#dfd5c0';
    ctx.lineWidth = Math.max(1.4, 2 * mult);
    ctx.lineCap = 'round';
    for (let r = -2; r <= 2; r++) {
      const rx = cx + r * tileW * 0.068 * mult;
      ctx.beginPath();
      ctx.moveTo(rx, cy - 1.5 * mult);
      ctx.quadraticCurveTo(rx - 2 * mult, cy - tileH * 0.13 * mult, rx + 3 * mult, cy - tileH * 0.16 * mult);
      ctx.moveTo(rx, cy + 1.5 * mult);
      ctx.quadraticCurveTo(rx - 2 * mult, cy + tileH * 0.12 * mult, rx + 3 * mult, cy + tileH * 0.15 * mult);
      ctx.stroke();
    }

    // Small cracked skull / bone shards nearby
    ctx.fillStyle = '#cfc4ae';
    ctx.strokeStyle = 'rgba(10, 8, 13, 0.75)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(cx + tileW * 0.22 * mult, cy - tileH * 0.02, tileW * 0.08 * mult, tileH * 0.065 * mult, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // 4. Raised corpse: faint necrotic ash ring & pale residual rune dust
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.38)';
    ctx.lineWidth = Math.max(1.2, 1.6 * mult);
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, tileW * 0.32 * mult, tileH * 0.18 * mult, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.32)';
    for (let a = 0; a < 7; a++) {
      const ang = (a / 7) * Math.PI * 2;
      const ax = cx + Math.cos(ang) * tileW * 0.18 * mult;
      const ay = cy + Math.sin(ang) * tileH * 0.1 * mult;
      ctx.beginPath();
      ctx.arc(ax, ay, (1.5 + (a % 2) * 0.8) * mult, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}




