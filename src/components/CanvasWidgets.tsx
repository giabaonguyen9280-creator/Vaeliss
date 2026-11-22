import React, { useEffect, useRef } from 'react';
import {
  drawItemIcon,
  drawEngravedGoldCoin,
  drawInventoryPaperdoll,
  drawCharacterBustPortrait,
  PaperdollSpec,
} from '../game/pixelArt';

export const HungerBowlIcon: React.FC<{ className?: string; isDanger?: boolean }> = ({
  className = 'w-4 h-4',
  isDanger = false,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={`${className} transition-all duration-300 ${
      isDanger
        ? 'text-[#ef4444] drop-shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-pulse'
        : 'text-[#eab308]'
    }`}
  >
    <path
      d="M4 10.5C4 15.2 7.2 18.8 12 18.8C16.8 18.8 20 15.2 20 10.5H4Z"
      fill="currentColor"
      fillOpacity="0.24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <ellipse cx="12" cy="10.5" rx="8" ry="2.2" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M8.5 21H15.5M9.5 18.5L8.8 21M14.5 18.5L15.2 21"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

// Reusable 64x64 Vector Artwork Canvas for Weapons, Shields, Gear & Vials
export const ItemArtworkCanvas: React.FC<{
  itemOrWeaponId: string;
  size?: number;
  className?: string;
}> = React.memo(({ itemOrWeaponId, size = 64, className = '' }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawItemIcon(ctx, itemOrWeaponId, size);
  }, [itemOrWeaponId, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={`border border-[#6a5a44] bg-[#0b090d] shrink-0 ${className}`}
    />
  );
});

// Reusable Character / Ally Portrait Box: renders .jpg portrait when available or dark-fantasy vector bust fallback
export const CharacterPortraitBox: React.FC<{
  spriteKey: string;
  portraitUrl?: string;
  size?: number;
  alt?: string;
  className?: string;
  seamless?: boolean;
  isError?: boolean;
  onPortraitError?: (url: string) => void;
}> = ({
  spriteKey,
  portraitUrl,
  size = 52,
  alt = '',
  className = '',
  seamless = false,
  isError = false,
  onPortraitError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const showImage = Boolean(portraitUrl && !isError);

  useEffect(() => {
    if (showImage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCharacterBustPortrait(ctx, spriteKey, size);
  }, [showImage, spriteKey, size]);

  if (showImage && portraitUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative overflow-hidden shrink-0 ${
          seamless ? 'bg-transparent' : 'border border-[#6a5a44] bg-[#0b090d]'
        } ${className}`}
      >
        <img
          src={portraitUrl}
          alt={alt}
          onError={() => onPortraitError?.(portraitUrl)}
          className={`w-full h-full object-cover object-top ${
            seamless ? 'combat-portrait-mini-mask' : ''
          }`}
          style={{ filter: 'contrast(1.06) brightness(0.9) saturate(0.86)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: seamless
              ? 'radial-gradient(circle at 50% 44%, transparent 34%, rgba(10, 8, 12, 0.65) 70%, rgba(10, 8, 12, 0.96) 100%)'
              : 'radial-gradient(circle at 50% 42%, transparent 44%, rgba(7, 5, 10, 0.78) 100%)',
            boxShadow: seamless ? 'inset 0 0 12px 5px rgba(8, 6, 10, 0.9)' : undefined,
          }}
        />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`shrink-0 ${
        seamless ? 'combat-portrait-mini-mask bg-transparent' : 'border border-[#6a5a44] bg-[#0b090d]'
      } ${className}`}
    />
  );
};

// Reusable 120x160 Full-Body Equipment Paperdoll Preview Canvas for Inventory [I]
export const PaperdollPreviewCanvas: React.FC<{
  spec: PaperdollSpec;
  width?: number;
  height?: number;
  className?: string;
}> = React.memo(
  ({ spec, width = 120, height = 160, className = '' }) => {
    const ref = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      const canvas = ref.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawInventoryPaperdoll(ctx, spec, width, height);
    }, [
      spec.spriteKey,
      spec.equippedWeapon,
      spec.weaponCategory,
      spec.weaponHands,
      spec.vfxColor,
      spec.equippedShield,
      spec.equippedHead,
      spec.equippedBody,
      spec.isUndeadSummon,
      spec.isPureTank,
      spec.limbs?.leftArm,
      spec.limbs?.rightArm,
      spec.limbs?.leftLeg,
      spec.limbs?.rightLeg,
      spec.limbs?.infected?.leftArm,
      spec.limbs?.infected?.rightArm,
      spec.limbs?.infected?.leftLeg,
      spec.limbs?.infected?.rightLeg,
      width,
      height,
    ]);

    return (
      <canvas
        ref={ref}
        width={width}
        height={height}
        className={`border border-[#6a5a44] bg-[#0b090d] shrink-0 ${className}`}
      />
    );
  },
  (prev, next) =>
    prev.width === next.width &&
    prev.height === next.height &&
    prev.className === next.className &&
    prev.spec.spriteKey === next.spec.spriteKey &&
    prev.spec.equippedWeapon === next.spec.equippedWeapon &&
    prev.spec.weaponCategory === next.spec.weaponCategory &&
    prev.spec.weaponHands === next.spec.weaponHands &&
    prev.spec.vfxColor === next.spec.vfxColor &&
    prev.spec.equippedShield === next.spec.equippedShield &&
    prev.spec.equippedHead === next.spec.equippedHead &&
    prev.spec.equippedBody === next.spec.equippedBody &&
    prev.spec.isUndeadSummon === next.spec.isUndeadSummon &&
    prev.spec.isPureTank === next.spec.isPureTank &&
    prev.spec.limbs?.leftArm === next.spec.limbs?.leftArm &&
    prev.spec.limbs?.rightArm === next.spec.limbs?.rightArm &&
    prev.spec.limbs?.leftLeg === next.spec.limbs?.leftLeg &&
    prev.spec.limbs?.rightLeg === next.spec.limbs?.rightLeg &&
    prev.spec.limbs?.infected?.leftArm === next.spec.limbs?.infected?.leftArm &&
    prev.spec.limbs?.infected?.rightArm === next.spec.limbs?.infected?.rightArm &&
    prev.spec.limbs?.infected?.leftLeg === next.spec.limbs?.infected?.leftLeg &&
    prev.spec.limbs?.infected?.rightLeg === next.spec.limbs?.infected?.rightLeg
);

// 160x160 3D Embossed Sterling Silver Fate Coin Canvas for Floating Inline Coin Flip
export const EngravedGoldCoinCanvas: React.FC<{
  side: 'HEADS' | 'TAILS' | null;
  flipping: boolean;
  size?: number;
}> = ({ side, flipping, size = 160 }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!flipping) {
      canvas.style.transform = '';
      canvas.style.filter =
        'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 14px rgba(226, 232, 240, 0.35))';
      drawEngravedGoldCoin(ctx, side, size, true, 'silver');
      return;
    }

    let rafId = 0;
    let lastShownFace: 'HEADS' | 'TAILS' | null = null;
    const startTime = performance.now();

    const animateFlip = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const angle = elapsed * Math.PI * 7.2;
      const cosVal = Math.cos(angle);
      const scaleX = Math.max(0.08, Math.abs(cosVal));
      const hopY = -Math.abs(Math.sin(elapsed * Math.PI * 2.6)) * 18;
      const currentFace: 'HEADS' | 'TAILS' = cosVal >= 0 ? 'HEADS' : 'TAILS';

      if (currentFace !== lastShownFace) {
        lastShownFace = currentFace;
        drawEngravedGoldCoin(ctx, currentFace, size, true, 'silver');
      }

      canvas.style.transform = `translateY(${hopY.toFixed(2)}px) scaleX(${scaleX.toFixed(3)})`;
      canvas.style.filter =
        'drop-shadow(0 14px 24px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 18px rgba(226, 232, 240, 0.65))';
      rafId = requestAnimationFrame(animateFlip);
    };

    rafId = requestAnimationFrame(animateFlip);
    return () => {
      cancelAnimationFrame(rafId);
      canvas.style.transform = '';
    };
  }, [side, flipping, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={flipping ? 'will-change-transform' : 'transition-transform duration-300 hover:scale-105'}
    />
  );
};
