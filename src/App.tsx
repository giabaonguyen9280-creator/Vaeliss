import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Shield,
  BookOpen,
  Flame,
  Heart,
  Brain,
  Compass,
  Sparkles,
  Backpack,
  Save,
  FolderOpen,
  Coins,
  Volume2,
  VolumeX,
  HelpCircle,
  Settings,
  Dices,
} from 'lucide-react';
import { CONFIG, WeaponCategory } from './game/config';
import { CHARACTER_INTRO_STEPS, evaluateCanonEnding } from './game/narrative';
import { SeededRNG } from './game/prng';
import { sfx, AudioVisualSettings } from './game/audio';
import {
  drawPixelSprite,
  drawPartyBackSprite,
  drawItemIcon,
  getLimbReticlePositions,
  drawEngravedGoldCoin,
  drawInventoryPaperdoll,
  drawCharacterBustPortrait,
  PaperdollSpec,
} from './game/pixelArt';
import prologueFrame1Img from './assets/images/prologue_castle_colossal_1794938768880.jpg';
import prologueFrame2Img from './assets/images/prologue_statue_mother_1794938322367.jpg';
import prologueGateKnightImg from './assets/images/prologue_gate_knight_1794938325240.jpg';
import prologueGateNunImg from './assets/images/prologue_gate_nun_1794938324507.jpg';
import prologueGateHunterImg from './assets/images/prologue_gate_hunter_1794938325467.jpg';
import { DungeonMapViewport, getParkedCompanionSpots } from './components/DungeonMapViewport';
import {
  generateWorld,
  getHerbTypeAtCoord,
  TILE,
  WorldMapState,
  RoomData,
  MapEnemyInstance,
  RitualDeityType,
  isWalkableTile,
  advanceRoomEnemiesOneTurn,
} from './game/mapGen';
import {
  PlayerState,
  createInitialPlayer,
  createRecruitedAlly,
  castNecromancyOnCorpse,
  castNecromancyOnChild12,
  getComputedPlayerStats,
  getAllyComputedStats,
  getPlayerStepCooldownMs,
  getEffectiveWeapon,
  getAllyEffectiveWeapon,
  getAllyAvailableSkills,
  canTargetEnemyLimb,
  applySupportItemEffects,
  applySupportItemToAlly,
  devourEnemyCorpse,
  amputateInfectedLimbWithBoneSaw,
  amputateAllyLimbWithBoneSaw,
  applyIntroChoiceToPlayer,
  applyDefaultIntroLoadoutForRemainingSteps,
  isPlayerPanicking,
  canUnequipWeapon,
  canMemberEquipWeapon,
  leaveOrDismissPartyMember,
  recallDismissedCompanion,
  getAmputationSanityMultiplier,
  resolveCombatCoinFlipOutcome,
  canPlayerEquipGear,
  canPlayerEquipShield,
  canAllyEquipGear,
  canAllyEquipShield,
  isPureTankSummon,
  isAllyGearLocked,
  isHolyMotherBanned,
  banHolyMother,
  syncCorruptionHolyBan,
  canUseHolySkill,
  getFloor3MiasmaMultiplier,
  dissectEnemyCorpseCleanly,
  useEmergencyAmputationScroll,
  grantAffinityOnce,
  HOLY_MOTHER_REFUSAL_MSG,
  bloodForgeWeapon,
  exorciseCursedWeapon,
  regrowLimbAtHexen,
  unlockHexenStatNode,
  learnOrUpgradeHexenSkill,
  isEnemyWeaponLimbSevered,
  GEAR_ITEMS,
} from './game/combat';
import { CombatEngine, CombatActionType } from './game/combatEngine';

type ScreenMode = 'title' | 'prologue' | 'playing' | 'combat' | 'ending';
type ActiveModal =
  | null
  | 'inventory'
  | 'lore'
  | 'hexen'
  | 'saves'
  | 'guide'
  | 'settings'
  | 'hunter_note'
  | 'npc_priest'
  | 'npc_smuggler'
  | 'npc_prisoner'
  | 'npc_child_12'
  | 'npc_broken_knight'
  | 'npc_smith'
  | 'npc_glass_lady'
  | 'npc_physician'
  | 'npc_chronicler'
  | 'npc_recruit_knight'
  | 'npc_recruit_nun'
  | 'npc_recruit_hunter'
  | 'void_rift'
  | 'vaelis_climax';

type CombatMenuMode = 'main' | 'skills' | 'items';
type EquipSlotKey = 'weapon' | 'shield' | 'head' | 'body' | 'accessory';
export type CoinOutcomeTier = 'win' | 'partial' | 'lose';
type AffinityPillarKey = 'holyMother' | 'primordialVoid' | 'demonicPact';
interface AffinityToastState {
  id: number;
  pillar: AffinityPillarKey;
  godName: string;
  prevVal: number;
  nextVal: number;
  unlockedSkills: string[];
}

interface SaveSlotData {
  slot: number;
  timestamp: string;
  seed: string;
  player: PlayerState;
  playerPos: { x: number; y: number };
  world: WorldMapState;
}

interface CoinTossState {
  title: string;
  subtitle: string;
  chosenSide: 'HEADS' | 'TAILS' | null;
  flipping: boolean;
  resultSide: 'HEADS' | 'TAILS' | null;
  secondResultSide?: 'HEADS' | 'TAILS' | null;
  useTwoCoinsShift?: boolean;
  isPanicAuto?: boolean;
  wonOutcome?: boolean;
  outcomeTier?: CoinOutcomeTier;
  outcomeText: string | null;
  onResolve: (won: boolean, tier: CoinOutcomeTier) => void;
  onLockpick?: () => void;
}

interface InteractionChoice {
  label: string;
  onSelect: () => void;
}

interface InteractionPromptState {
  title: string;
  description: string;
  choices: InteractionChoice[];
  selectedIndex: number;
}

const HungerBowlIcon: React.FC<{ className?: string; isDanger?: boolean }> = ({
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
const ItemArtworkCanvas: React.FC<{ itemOrWeaponId: string; size?: number; className?: string }> = ({
  itemOrWeaponId,
  size = 64,
  className = '',
}) => {
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
};

// Reusable Character / Ally Portrait Box: renders .jpg portrait when available or dark-fantasy vector bust fallback
const CharacterPortraitBox: React.FC<{
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
const PaperdollPreviewCanvas: React.FC<{
  spec: PaperdollSpec;
  width?: number;
  height?: number;
  className?: string;
}> = ({ spec, width = 120, height = 160, className = '' }) => {
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
};

// 160x160 3D Embossed Antique Gold Coin Canvas for Fate Coin Flip Modal
const EngravedGoldCoinCanvas: React.FC<{
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
      canvas.style.filter = 'drop-shadow(0 6px 14px rgba(251, 191, 36, 0.25))';
      drawEngravedGoldCoin(ctx, side, size);
      return;
    }

    let rafId = 0;
    let lastShownFace: 'HEADS' | 'TAILS' | null = null;
    const startTime = performance.now();

    const animateFlip = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const angle = elapsed * Math.PI * 6.5;
      const cosVal = Math.cos(angle);
      const scaleX = Math.max(0.08, Math.abs(cosVal));
      const hopY = -Math.abs(Math.sin(elapsed * Math.PI * 2.5)) * 14;
      const currentFace: 'HEADS' | 'TAILS' = cosVal >= 0 ? 'HEADS' : 'TAILS';

      if (currentFace !== lastShownFace) {
        lastShownFace = currentFace;
        drawEngravedGoldCoin(ctx, currentFace, size);
      }

      canvas.style.transform = `translateY(${hopY.toFixed(2)}px) scaleX(${scaleX.toFixed(3)})`;
      canvas.style.filter =
        'drop-shadow(0 12px 22px rgba(251, 191, 36, 0.58)) drop-shadow(0 0 12px rgba(245, 158, 11, 0.45))';
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

export default function App() {
  const [screen, setScreen] = useState<ScreenMode>('title');
  const [seedInput, setSeedInput] = useState<string>(CONFIG.DEFAULT_SEED);
  const [characterNameInput, setCharacterNameInput] = useState<string>(CONFIG.CLASSES[0].name);
  const [selectedClassId, setSelectedClassId] = useState<string>(CONFIG.CLASSES[0].id);
  const [world, setWorld] = useState<WorldMapState>(() => generateWorld(CONFIG.DEFAULT_SEED));
  const [player, setPlayer] = useState<PlayerState>(() => createInitialPlayer(CONFIG.CLASSES[0].id));
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 3, y: 9 });

  // Active combat enemy reference & standalone CombatEngine Manager
  const combatEngineRef = useRef<CombatEngine>(new CombatEngine());
  const [activeEnemyUid, setActiveEnemyUid] = useState<string | null>(null);
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const [selectedLimbId, setSelectedLimbId] = useState<string>('torso');
  const [focusedLimbId, setFocusedLimbId] = useState<string | null>(null); // 2-step click confirmation
  const [combatMenuMode, setCombatMenuMode] = useState<CombatMenuMode>('main');
  const [activeActorIdx, setActiveActorIdx] = useState<number>(0);
  const [combatFocusPhase, setCombatFocusPhase] = useState<
    'action' | 'skills_menu' | 'items_menu' | 'limb'
  >('action');
  const [combatActionCursor, setCombatActionCursor] = useState<number>(0);
  const [combatSubCursor, setCombatSubCursor] = useState<number>(0);
  const [pendingSkillId, setPendingSkillId] = useState<string | null>(null);

  // Audio & Visual Preferences (persisted in localStorage)
  const [audioSettings, setAudioSettings] = useState<AudioVisualSettings>(() => sfx.getSettings());
  const [confirmReturnTitle, setConfirmReturnTitle] = useState<boolean>(false);

  // Combat VFX overlay, screen-shake, async turn pacing, and portrait fallback tracking
  const [activeVfx, setActiveVfx] = useState<{
    category: WeaponCategory;
    color: string;
    key: number;
  } | null>(null);
  const [screenShakeMode, setScreenShakeMode] = useState<'none' | 'normal' | 'heavy'>('none');
  const [isResolvingTurn, setIsResolvingTurn] = useState<boolean>(false);
  const isResolvingTurnRef = useRef<boolean>(false);
  const [portraitErrorMap, setPortraitErrorMap] = useState<Record<string, boolean>>({});
  const portraitErrorRef = useRef<Record<string, boolean>>({});
  const combatAbortRef = useRef<number>(0);
  const vfxTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);

  const markPortraitError = useCallback((url: string) => {
    if (!url || portraitErrorRef.current[url]) return;
    portraitErrorRef.current = { ...portraitErrorRef.current, [url]: true };
    setPortraitErrorMap((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  }, []);

  const triggerCombatVfx = useCallback(
    (category: WeaponCategory | undefined, color: string | undefined, isHeavy: boolean) => {
      if (category && category !== 'unarmed') {
        if (vfxTimerRef.current) window.clearTimeout(vfxTimerRef.current);
        setActiveVfx({
          category,
          color: color || '#e2e8f0',
          key: Date.now() + Math.floor(Math.random() * 1000),
        });
        vfxTimerRef.current = window.setTimeout(() => {
          setActiveVfx(null);
          vfxTimerRef.current = null;
        }, 560);
      }
      if (audioSettings.screenShakeEnabled) {
        if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
        setScreenShakeMode(isHeavy ? 'heavy' : 'normal');
        shakeTimerRef.current = window.setTimeout(() => {
          setScreenShakeMode('none');
          shakeTimerRef.current = null;
        }, isHeavy ? 380 : 280);
      }
    },
    [audioSettings.screenShakeEnabled]
  );

  const sleepCombatStep = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }, []);

  // Prologue state
  const [prologueFrame, setPrologueFrame] = useState<0 | 1 | 2>(0);
  const [backstoryChosen, setBackstoryChosen] = useState<boolean>(false);
  const [introStepIdx, setIntroStepIdx] = useState<0 | 1 | 2>(0);
  const [riftElixirCollected, setRiftElixirCollected] = useState<boolean>(false);
  const [hexenFeedback, setHexenFeedback] = useState<string | null>(null);
  const [affinityToast, setAffinityToast] = useState<AffinityToastState | null>(null);
  const [recentAffinityPillar, setRecentAffinityPillar] = useState<AffinityPillarKey | null>(null);
  const prevAffinitiesRef = useRef<{ holyMother: number; primordialVoid: number; demonicPact: number }>({
    holyMother: 0,
    primordialVoid: 0,
    demonicPact: 0,
  });
  const skipNextAffinityToastRef = useRef<boolean>(false);
  const affinityToastTimerRef = useRef<number | null>(null);

  // Modals & Equipment UI
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [invTab, setInvTab] = useState<'equip' | 'items' | 'saw'>('equip');
  const [isAmputating, setIsAmputating] = useState<boolean>(false);
  const [sawTargetMemberIdx, setSawTargetMemberIdx] = useState<number | null>(null);
  const [selectedInvMemberIdx, setSelectedInvMemberIdx] = useState<number>(0);
  const [invFeedback, setInvFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (activeModal !== 'inventory') {
      setIsAmputating(false);
      setSawTargetMemberIdx(null);
      setInvTab((tab) => (tab === 'saw' ? 'equip' : tab));
    }
  }, [activeModal]);

  useEffect(() => {
    const cur = player.affinities || { holyMother: 0, primordialVoid: 0, demonicPact: 0 };
    if (skipNextAffinityToastRef.current) {
      prevAffinitiesRef.current = { ...cur };
      skipNextAffinityToastRef.current = false;
      return;
    }
    if (screen !== 'playing' && screen !== 'combat') {
      return;
    }

    const prev = prevAffinitiesRef.current;
    const pillars: Array<{ key: AffinityPillarKey; name: string; icon: string }> = [
      { key: 'holyMother', name: 'Thánh Mẫu', icon: '✝️' },
      { key: 'primordialVoid', name: 'Hư Vô Nguyên Thủy', icon: '🌌' },
      { key: 'demonicPact', name: 'Huyết Quỷ', icon: '🩸' },
    ];

    for (const pInfo of pillars) {
      const prevVal = prev[pInfo.key] || 0;
      const nextVal = cur[pInfo.key] || 0;
      if (nextVal > prevVal) {
        const unlockedSkills = CONFIG.SKILLS.filter(
          (s) =>
            s.requiredAffinity?.pillar === pInfo.key &&
            s.requiredAffinity.level > prevVal &&
            s.requiredAffinity.level <= nextVal
        ).map((s) => s.name);

        setAffinityToast({
          id: Date.now(),
          pillar: pInfo.key,
          godName: pInfo.name,
          prevVal,
          nextVal,
          unlockedSkills,
        });
        setRecentAffinityPillar(pInfo.key);
        sfx.playHealOrChime();

        if (affinityToastTimerRef.current) {
          window.clearTimeout(affinityToastTimerRef.current);
        }
        affinityToastTimerRef.current = window.setTimeout(() => {
          setAffinityToast(null);
          setRecentAffinityPillar(null);
          affinityToastTimerRef.current = null;
        }, 5200);
        break;
      }
    }

    prevAffinitiesRef.current = { ...cur };
  }, [player.affinities, screen]);

  useEffect(() => {
    return () => {
      combatAbortRef.current += 1;
      if (affinityToastTimerRef.current) {
        window.clearTimeout(affinityToastTimerRef.current);
      }
      if (vfxTimerRef.current) {
        window.clearTimeout(vfxTimerRef.current);
      }
      if (shakeTimerRef.current) {
        window.clearTimeout(shakeTimerRef.current);
      }
    };
  }, []);
  const [selectedEquipSlot, setSelectedEquipSlot] = useState<EquipSlotKey>('weapon');
  const [previewItemId, setPreviewItemId] = useState<string>('broad_iron_sword');
  const [selectedLoreBookId, setSelectedLoreBookId] = useState<string>(CONFIG.BOOKS[0].id);

  // 3D Gold Coin Toss Modal & Shift Key 2-Coin State
  const [coinToss, setCoinToss] = useState<CoinTossState | null>(null);
  const [shiftHeld, setShiftHeld] = useState<boolean>(false);

  // Smuggler Haggle input
  const [smugglerItem, setSmugglerItem] = useState<string>('brown_vial');
  const [smugglerOffer, setSmugglerOffer] = useState<number>(6);

  // Ending info
  const [endingInfo, setEndingInfo] = useState<{
    id: string;
    title: string;
    subtitle: string;
    epilogue: string;
  } | null>(null);

  const [narrativeLogs, setNarrativeLogs] = useState<string[]>([
    'Lâu Đài Hắc Ám từ vòm trời đêm giáng xuống, nghiền nát mái vòm Đại Giáo Đường Goethe.',
    'Bạn tỉnh dậy tại Ngoại Vi Đại Giáo Đường Goethe giữa sương mù và mùi máu tanh.',
  ]);
  const [lastStepTime, setLastStepTime] = useState<number>(0);
  const inCombat = screen === 'combat';
  const [isInputLocked, setIsInputLocked] = useState<boolean>(false);
  const isInputLockedRef = useRef<boolean>(false);
  const worldRef = useRef(world);
  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  const playerPosRef = useRef(playerPos);
  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  const [animTick, setAnimTick] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(() => sfx.getSettings().muted);
  const sanitySecondsRef = useRef<number>(0);
  const [saveSlots, setSaveSlots] = useState<Array<SaveSlotData | null>>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [titleSaveModalOpen, setTitleSaveModalOpen] = useState<boolean>(false);
  const [titleStep, setTitleStep] = useState<'menu' | 'char_select'>('menu');
  const [interactionMenu, setInteractionMenu] = useState<InteractionPromptState | null>(null);
  const [logOverlayVisible, setLogOverlayVisible] = useState<boolean>(false);
  const [guideTab, setGuideTab] = useState<'lore' | 'move' | 'combat' | 'survival'>('lore');
  const [areaBannerText, setAreaBannerText] = useState<string>('Ngoại Vi Đại Giáo Đường Goethe');

  // Trail coordinates so up to 3 recruited party members follow behind the player on the map
  const [trailCoords, setTrailCoords] = useState<Array<{ x: number; y: number }>>([
    { x: 3, y: 10 },
    { x: 2, y: 10 },
    { x: 2, y: 11 },
    { x: 1, y: 11 },
  ]);

  const combatStageCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const addLog = useCallback((msg: string) => {
    setNarrativeLogs((prev) => {
      if (prev[0] === msg) return prev;
      return [msg, ...prev.slice(0, 35)];
    });
  }, []);

  // Track Shift key hold for 2-coin toss mode
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Load 5 Save Slots
  const refreshSaveSlots = useCallback(() => {
    const loaded: Array<SaveSlotData | null> = [0, 1, 2, 3, 4].map((idx) => {
      try {
        const raw = localStorage.getItem(`${CONFIG.SAVE_KEY_PREFIX}${idx}`);
        if (!raw) return null;
        return JSON.parse(raw) as SaveSlotData;
      } catch {
        return null;
      }
    });
    setSaveSlots(loaded);
  }, []);

  useEffect(() => {
    refreshSaveSlots();
  }, [refreshSaveSlots]);

  useEffect(() => {
    if (screen === 'title') {
      setTitleStep('menu');
    }
  }, [screen]);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimTick((t) => (t + 1) % 10000);
    }, 95);
    return () => clearInterval(timer);
  }, []);

  // Trigger 3D Gold Coin Toss Modal (Heads / Tails; hold Shift to toss 2 coins simultaneously)
  const triggerCoinToss = useCallback(
    (
      title: string,
      subtitle: string,
      onResolve: (won: boolean, tier: CoinOutcomeTier) => void,
      onLockpick?: () => void
    ) => {
      const panicking = isPlayerPanicking(player);
      if (panicking) {
        const autoSide: 'HEADS' | 'TAILS' = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        setCoinToss({
          title,
          subtitle: `${subtitle} [HOẢNG LOẠN — Lý Trí xuống thấp: Mất quyền chọn mặt xu!]`,
          chosenSide: autoSide,
          flipping: true,
          resultSide: null,
          isPanicAuto: true,
          outcomeText: null,
          onResolve,
          onLockpick,
        });
        sfx.playSfx('coin_flip');
        setTimeout(() => {
          sfx.playSfx('coin_land');
          const rng = new SeededRNG(`${world.seed}_panic_coin_${Date.now()}`);
          const won = rng.chance(0.38);
          const landed: 'HEADS' | 'TAILS' = won ? autoSide : autoSide === 'HEADS' ? 'TAILS' : 'HEADS';
          setCoinToss((prev) =>
            prev
              ? {
                  ...prev,
                  flipping: false,
                  resultSide: landed,
                  wonOutcome: won,
                  outcomeTier: won ? 'win' : 'lose',
                  outcomeText: landed === 'HEADS' ? 'Mặt Ngửa' : 'Mặt Sấp',
                }
              : null
          );
        }, 650);
        return;
      }

      setCoinToss({
        title,
        subtitle,
        chosenSide: null,
        flipping: false,
        resultSide: null,
        secondResultSide: null,
        useTwoCoinsShift: false,
        isPanicAuto: false,
        outcomeText: null,
        onResolve,
        onLockpick,
      });
    },
    [player, world.seed]
  );

  const handleChooseCoinSide = useCallback(
    (side: 'HEADS' | 'TAILS', tossTwoWithShift: boolean = false) => {
      if (!coinToss || coinToss.flipping || coinToss.resultSide) return;
      sfx.playSfx('coin_flip');
      setCoinToss({
        ...coinToss,
        chosenSide: side,
        flipping: true,
        useTwoCoinsShift: tossTwoWithShift,
      });

      setTimeout(() => {
        sfx.playSfx('coin_land');
        const rng = new SeededRNG(`${world.seed}_coin_${Date.now()}`);
        const computed = getComputedPlayerStats(player);
        const hasClawBoost =
          player.equippedAccessory === 'void_beast_claw' ||
          GEAR_ITEMS[player.equippedAccessory || '']?.coinTossBoost;
        const winChance = Math.min(
          0.88,
          0.5 + (computed.luck - 10) * 0.01 + (hasClawBoost ? 0.15 : 0)
        );

        const win1 = rng.chance(winChance);
        const landed1: 'HEADS' | 'TAILS' = win1 ? side : side === 'HEADS' ? 'TAILS' : 'HEADS';

        let win2 = false;
        let landed2: 'HEADS' | 'TAILS' | null = null;
        let tier: CoinOutcomeTier = win1 ? 'win' : 'lose';
        let totalWon = win1;
        let text = landed1 === 'HEADS' ? 'Mặt Ngửa' : 'Mặt Sấp';

        if (tossTwoWithShift) {
          win2 = rng.chance(winChance);
          landed2 = win2 ? side : side === 'HEADS' ? 'TAILS' : 'HEADS';
          if (win1 && win2) {
            tier = 'win';
            totalWon = true;
            text = landed1 === 'HEADS' ? 'Mặt Ngửa' : 'Mặt Sấp';
          } else if (win1 || win2) {
            tier = 'partial';
            totalWon = true;
            text = 'Một ngửa, một sấp';
          } else {
            tier = 'lose';
            totalWon = false;
            text = landed1 === 'HEADS' ? 'Mặt Ngửa' : 'Mặt Sấp';
          }
        }

        setCoinToss((prev) =>
          prev
            ? {
                ...prev,
                flipping: false,
                resultSide: landed1,
                secondResultSide: landed2,
                wonOutcome: totalWon,
                outcomeTier: tier,
                outcomeText: text,
              }
            : null
        );
      }, 650);
    },
    [coinToss, player, world.seed]
  );

  const confirmCoinTossOutcome = useCallback(() => {
    if (!coinToss || !coinToss.outcomeText) return;
    const won =
      coinToss.wonOutcome !== undefined
        ? coinToss.wonOutcome
        : coinToss.chosenSide === coinToss.resultSide;
    const tier: CoinOutcomeTier = coinToss.outcomeTier || (won ? 'win' : 'lose');
    const cb = coinToss.onResolve;
    setCoinToss(null);
    cb(won, tier);
  }, [coinToss]);

  const generateRandomSeed = useCallback((): string => {
    const prefixes = ['VAELIS', 'GOETHE', 'ABYSS', 'HEXEN', 'ECLIPSE', 'BONE'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${suffix}`;
  }, []);

  const generateRandomCharacterName = useCallback((): string => {
    const names = [
      'Vaelen',
      'Kaelen',
      'Seraphina',
      'Corvus',
      'Alistair',
      'Isolde',
      'Gideon',
      'Morrigan',
      'Balthazar',
      'Valeria',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }, []);

  // Start new game -> enters 3-Frame Prologue first
  const enterPrologue = useCallback(
    (customSeed?: string, customClassId?: string) => {
      const finalSeed = (customSeed ?? seedInput).trim() || generateRandomSeed();
      const finalClass = customClassId ?? selectedClassId;
      const newWorld = generateWorld(finalSeed);
      const startRoom = newWorld.rooms[newWorld.currentRoomId];
      const newPlayer = createInitialPlayer(finalClass, characterNameInput);

      setSeedInput(finalSeed);
      setWorld(newWorld);
      setPlayer(newPlayer);
      setPlayerPos({ x: startRoom.spawnX, y: startRoom.spawnY });
      setActiveEnemyUid(null);
      setEndingInfo(null);
      setActiveModal(null);
      setInvFeedback(null);
      setHexenFeedback(null);
      setPrologueFrame(0);
      setBackstoryChosen(false);
      setIntroStepIdx(0);
      setRiftElixirCollected(false);
      setPreviewItemId(newPlayer.equippedWeapon);
      setAreaBannerText(startRoom.name);
      setTrailCoords([
        { x: Math.max(1, startRoom.spawnX - 1), y: startRoom.spawnY },
        { x: Math.max(1, startRoom.spawnX - 2), y: startRoom.spawnY },
        { x: Math.max(1, startRoom.spawnX - 2), y: Math.max(1, startRoom.spawnY - 1) },
        { x: Math.max(1, startRoom.spawnX - 3), y: Math.max(1, startRoom.spawnY - 1) },
      ]);
      setSelectedInvMemberIdx(0);
      skipNextAffinityToastRef.current = true;
      setAffinityToast(null);
      setRecentAffinityPillar(null);
      setScreen('prologue');
    },
    [seedInput, selectedClassId, characterNameInput, generateRandomSeed]
  );

  const finishPrologueAndPlay = useCallback(() => {
    const startRoom = world.rooms[world.currentRoomId];
    let starterPackSummary: string | null = null;
    if (!backstoryChosen) {
      const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
      const res = applyDefaultIntroLoadoutForRemainingSteps(pCopy, introStepIdx);
      setPlayer(pCopy);
      setPreviewItemId(pCopy.equippedWeapon);
      setBackstoryChosen(true);
      starterPackSummary = res.summary;
    }
    const classOpening: Record<string, string> = {
      fallen_knight:
        '⚔️ Ký ức Kỵ Đoàn: Bạn siết chặt chuôi kiếm trước Cổng Sắt Goethe. Đội trưởng Vaelis từng thề bảo vệ nhân loại — vì sao ngài lại kéo cả Lâu Đài Hắc Ám đè nát thánh địa này?',
      forsaken_nun:
        '✝️ Tội Ác Máu Đen: Giữa sương mù, hình ảnh bức tượng Thánh Mẫu khóc ra máu đen lại hiện về. Đứa em trai duy nhất của bạn — Thánh Tử Thứ 13 — vẫn đang bị giam dưới đáy địa ngục này.',
      night_hunter:
        '🗡️ Lời Nguyền Hóa Đá: Lớp vảy đá xám trên cánh tay lại nhói buốt. Chỉ có bình Tiên Dược Nguyên Sơ dưới đáy Vực Sao và Lõi Khóa Hư Vô mới giúp bạn thoát khỏi Thung Lũng Xương Tàn.',
    };
    isInputLockedRef.current = false;
    setIsInputLocked(false);
    setScreen('playing');
    setNarrativeLogs([
      `Bạn đứng trước Cổng Sắt Răng Cưa tại ${startRoom.name}.`,
      ...(starterPackSummary ? [starterPackSummary] : []),
      classOpening[player.classId] || startRoom.sensoryLine,
      startRoom.sensoryLine,
    ]);
  }, [world, player, backstoryChosen, introStepIdx]);

  // URL ?autostart=1 support for automated testing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const seedParam = params.get('seed') || CONFIG.DEFAULT_SEED;
      const newWorld = generateWorld(seedParam);
      const startRoom = newWorld.rooms[newWorld.currentRoomId];
      const newPlayer = createInitialPlayer(CONFIG.CLASSES[0].id);
      applyDefaultIntroLoadoutForRemainingSteps(newPlayer, 0);
      setWorld(newWorld);
      setPlayer(newPlayer);
      setPreviewItemId(newPlayer.equippedWeapon);
      setBackstoryChosen(true);
      setPlayerPos({ x: startRoom.spawnX, y: startRoom.spawnY });
      setAreaBannerText(startRoom.name);
      skipNextAffinityToastRef.current = true;
      setAffinityToast(null);
      setScreen('playing');
    }
  }, []);

  // Save / Load
  const saveToSlot = (slotIdx: number) => {
    const payload: SaveSlotData = {
      slot: slotIdx,
      timestamp: new Date().toLocaleString('vi-VN'),
      seed: world.seed,
      player,
      playerPos,
      world,
    };
    localStorage.setItem(`${CONFIG.SAVE_KEY_PREFIX}${slotIdx}`, JSON.stringify(payload));
    refreshSaveSlots();
    addLog(`🕯️ Đã khắc ấn ký lưu giữ hành trình vào trang ký ức thứ ${slotIdx + 1}.`);
  };

  const loadFromSlot = (slotIdx: number) => {
    const data = saveSlots[slotIdx];
    if (!data) return;
    const restoredSeed = data.seed || data.world?.seed || CONFIG.DEFAULT_SEED;
    const restoredWorld: WorldMapState = {
      ...data.world,
      seed: restoredSeed,
    };
    const restoredRoom = restoredWorld.rooms[restoredWorld.currentRoomId];
    const spawnPos = data.playerPos || {
      x: restoredRoom?.spawnX ?? 3,
      y: restoredRoom?.spawnY ?? 6,
    };
    const restoredPlayer: PlayerState = {
      ...data.player,
      inventory: {
        ...data.player.inventory,
        energy_stone: data.player.inventory?.energy_stone ?? data.player.energyStones ?? 0,
        silver_coin: data.player.inventory?.silver_coin ?? data.player.silverCoins ?? 0,
      },
    };
    setWorld(restoredWorld);
    setPlayer(restoredPlayer);
    setPlayerPos(spawnPos);
    setSeedInput(restoredSeed);
    setAreaBannerText(restoredRoom?.name || 'Ngoại Vi Đại Giáo Đường Goethe');
    setTrailCoords([
      { x: Math.max(1, spawnPos.x - 1), y: spawnPos.y },
      { x: Math.max(1, spawnPos.x - 2), y: spawnPos.y },
      { x: Math.max(1, spawnPos.x - 2), y: Math.max(1, spawnPos.y - 1) },
      { x: Math.max(1, spawnPos.x - 3), y: Math.max(1, spawnPos.y - 1) },
    ]);
    setSelectedInvMemberIdx(0);
    setActiveEnemyUid(null);
    setEndingInfo(null);
    setActiveModal(null);
    setTitleSaveModalOpen(false);
    isInputLockedRef.current = false;
    setIsInputLocked(false);
    skipNextAffinityToastRef.current = true;
    setAffinityToast(null);
    setRecentAffinityPillar(null);
    setScreen('playing');
    addLog(`🕰️ Ký ức từ trang thứ ${slotIdx + 1} đã được đánh thức giữa sương mù.`);
  };

  const deleteSaveSlot = (slotIdx: number) => {
    localStorage.removeItem(`${CONFIG.SAVE_KEY_PREFIX}${slotIdx}`);
    refreshSaveSlots();
  };

  const currentRoom: RoomData = world.rooms[world.currentRoomId];
  const activeCombatEnemy: MapEnemyInstance | undefined = currentRoom.enemies.find(
    (e) => e.uid === activeEnemyUid
  );

  // Enter Combat against a map enemy instance (locks map input & pauses AI loop)
  const startCombatWithEnemy = useCallback(
    (enemyInst: MapEnemyInstance, opts?: { ambushFirstStrike?: boolean }) => {
      const tpl = CONFIG.ENEMIES[enemyInst.templateId];
      if (!tpl) return;
      combatAbortRef.current += 1;
      isResolvingTurnRef.current = false;
      setIsResolvingTurn(false);
      setActiveVfx(null);
      setScreenShakeMode('none');
      isInputLockedRef.current = true;
      setIsInputLocked(true);
      setActiveEnemyUid(enemyInst.uid);
      const defaultLimb =
        enemyInst.limbs.find(
          (l) => l.isWeaponArm && l.hp > 0 && canTargetEnemyLimb(enemyInst, tpl, l.id).allowed
        )?.id ||
        enemyInst.limbs.find(
          (l) => l.hp > 0 && canTargetEnemyLimb(enemyInst, tpl, l.id).allowed
        )?.id ||
        enemyInst.limbs.find((l) => l.hp > 0)?.id ||
        'torso';
      setSelectedLimbId(defaultLimb);
      setFocusedLimbId(null);
      setCombatMenuMode('main');
      setActiveActorIdx(0);
      setCombatFocusPhase('action');
      setCombatActionCursor(0);
      setCombatSubCursor(0);
      setPendingSkillId(null);
      combatEngineRef.current.resetStageEffects();

      const baseLogs = [
        `⚔️ CHẠM TRÁN: ${enemyInst.customName || tpl.name}!`,
        enemyInst.isTutorialGatekeeper
          ? 'Ánh thép gỉ sét loé lên trước cổng sắt; cánh tay phải của tên gác ngục vung thanh kiếm gãy.'
          : `Quan sát kỹ từng cử động của ${tpl.name} trong màn sương tối.`,
      ];

      if (opts?.ambushFirstStrike) {
        const ambushOutcome = combatEngineRef.current.resolveEnemyRound(
          playerRef.current,
          enemyInst,
          worldRef.current.seed
        );
        setPlayer(ambushOutcome.updatedPlayer);
        setWorld((prev) => {
          const curRoom = prev.rooms[prev.currentRoomId];
          if (!curRoom) return prev;
          return {
            ...prev,
            rooms: {
              ...prev.rooms,
              [prev.currentRoomId]: {
                ...curRoom,
                enemies: curRoom.enemies.map((e) =>
                  e.uid === ambushOutcome.updatedEnemy.uid ? ambushOutcome.updatedEnemy : e
                ),
              },
            },
          };
        });
        if ((ambushOutcome.result.lastTakenDmg || 0) > 0) {
          sfx.playSfx('hurt');
        }
        setCombatLogs([
          ...ambushOutcome.result.logs.slice().reverse(),
          `⚠️ BỊ PHỤC KÍCH TRONG GIẤC NGỦ! ${enemyInst.customName || tpl.name} ra đòn trước!`,
          ...baseLogs,
        ]);
        if (ambushOutcome.endingTrigger?.id === 'SLAIN_IN_COMBAT') {
          const nextRandomSeed = generateRandomSeed();
          setSeedInput(nextRandomSeed);
          setEndingInfo({
            ...ambushOutcome.endingTrigger,
            subtitle: `Bị Tập Kích Trong Lúc Ngủ • Seed ngẫu nhiên mới: ${nextRandomSeed}`,
          });
          setScreen('ending');
          return;
        }
      } else {
        setCombatLogs(baseLogs);
      }

      setScreen('combat');
      setInteractionMenu(null);
      setLogOverlayVisible(false);
      addLog(
        opts?.ambushFirstStrike
          ? `⚠️ Bị [${enemyInst.customName || tpl.name}] tập kích ngay khi đang ngủ!`
          : `⚔️ Giao chiến với ${enemyInst.customName || tpl.name}!`
      );
    },
    [addLog, generateRandomSeed]
  );

  // Unlock Web Audio on first user interaction & synchronize procedural BGM per screen
  useEffect(() => {
    const unlock = () => {
      sfx.unlockAndResume();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (screen === 'combat' && activeCombatEnemy) {
      const tpl = CONFIG.ENEMIES[activeCombatEnemy.templateId];
      const isBoss = tpl?.tier === 'boss' || tpl?.tier === 'miniboss';
      sfx.playBgm(isBoss ? 'boss' : 'combat', { mind: player.mind });
    } else if (screen === 'playing') {
      sfx.playBgm('explore', { mind: player.mind });
    } else if (screen === 'title' || screen === 'prologue') {
      sfx.playBgm('title', { mind: player.mind });
    } else {
      sfx.stopBgm();
    }
  }, [screen, activeCombatEnemy, player.mind, audioSettings.bgmVolume, audioSettings.muted]);

  // Real-Time 30s Sanity Decay outside Holy Mother safe zones during active exploration
  useEffect(() => {
    if (screen !== 'playing') {
      sanitySecondsRef.current = 0;
      return;
    }
    const timer = window.setInterval(() => {
      if (activeModal || interactionMenu || coinToss || logOverlayVisible) return;
      const room = worldRef.current.rooms[worldRef.current.currentRoomId];
      const pos = playerPosRef.current;
      if (!room) return;
      const roomW = room.width || room.grid[0]?.length || CONFIG.GRID_W;
      const roomH = room.height || room.grid.length || CONFIG.GRID_H;

      let inSafeZone = false;
      for (let ry = 0; ry < roomH && !inSafeZone; ry++) {
        for (let rx = 0; rx < roomW; rx++) {
          const tile = room.grid[ry]?.[rx];
          if (tile === TILE.HEXEN_ALTAR && Math.abs(pos.x - rx) + Math.abs(pos.y - ry) <= 2) {
            inSafeZone = true;
            break;
          }
          if (
            tile === TILE.RITUAL_CIRCLE &&
            room.ritualCircles?.[`${rx},${ry}`]?.deityType === 'holy_mother' &&
            Math.abs(pos.x - rx) <= 1 &&
            Math.abs(pos.y - ry) <= 1
          ) {
            inSafeZone = true;
            break;
          }
        }
      }

      if (inSafeZone) {
        sanitySecondsRef.current = 0;
        return;
      }

      const sanityMult = getAmputationSanityMultiplier(playerRef.current);
      sanitySecondsRef.current += sanityMult;
      if (sanitySecondsRef.current >= 30) {
        sanitySecondsRef.current = 0;
        setPlayer((prev) => {
          const drain = prev.hunger >= 50 ? 2 : 1;
          return {
            ...prev,
            mind: Math.max(0, prev.mind - drain),
            party: prev.party.map((ally) =>
              ally.hp > 0 && !ally.isUndeadSummon
                ? { ...ally, mind: Math.max(0, ally.mind - 1) }
                : ally
            ),
          };
        });
        addLog(
          sanityMult > 1
            ? 'Cơ thể tàn phế mất chi khiến nỗi tuyệt vọng trỗi dậy — Lý Trí bị bóng tối bào mòn nhanh hơn (+50%)!'
            : 'Bóng tối đặc quánh và sự tĩnh lặng chết chóc đang bào mòn Lý Trí...'
        );
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen, activeModal, interactionMenu, coinToss, logOverlayVisible, addLog]);

  const triggerCombat = useCallback(
    (enemyInst: MapEnemyInstance) => {
      startCombatWithEnemy(enemyInst);
    },
    [startCombatWithEnemy]
  );

  // Cleanly exit combat: reset inCombat & isInputLocked, and remove defeated enemy from active `enemies` list (archiving to `corpses`)
  const handleCombatEnd = useCallback(
    (opts?: { defeatedEnemyUid?: string; fled?: boolean; nextScreen?: ScreenMode }) => {
      combatAbortRef.current += 1;
      isResolvingTurnRef.current = false;
      setIsResolvingTurn(false);
      setActiveVfx(null);
      setScreenShakeMode('none');
      const roomId = worldRef.current.currentRoomId;
      if (opts?.defeatedEnemyUid) {
        setWorld((prev) => {
          const curRoom = prev.rooms[roomId];
          if (!curRoom) return prev;
          const defeatedInst = curRoom.enemies.find((e) => e.uid === opts.defeatedEnemyUid);
          const remainingEnemies = curRoom.enemies.filter((e) => e.uid !== opts.defeatedEnemyUid);
          const existingCorpses = curRoom.corpses || [];
          const nextCorpses =
            defeatedInst && !existingCorpses.some((c) => c.uid === defeatedInst.uid)
              ? [...existingCorpses, { ...defeatedInst, defeated: true }]
              : existingCorpses;
          return {
            ...prev,
            rooms: {
              ...prev.rooms,
              [roomId]: {
                ...curRoom,
                enemies: remainingEnemies,
                corpses: nextCorpses,
              },
            },
          };
        });
      }
      isInputLockedRef.current = false;
      setIsInputLocked(false);
      setActiveEnemyUid(null);
      setActiveActorIdx(0);
      setCombatMenuMode('main');
      setFocusedLimbId(null);
      setScreen(opts?.nextScreen || 'playing');
    },
    []
  );

  // Room transition helper that updates Fog-of-War visitedRoomIds, resets old room enemy Chase states, and updates Area Banner
  const movePlayerToRoom = useCallback(
    (targetRoomId: string, entryType: 'spawn' | 'exit' = 'spawn') => {
      const nextRoom = world.rooms[targetRoomId];
      if (!nextRoom) return;
      const roomW = nextRoom.width || nextRoom.grid[0]?.length || CONFIG.GRID_W;
      const nextX = entryType === 'spawn' ? nextRoom.spawnX : Math.max(2, roomW - 4);
      const nextY = nextRoom.spawnY;

      setWorld((prev) => {
        const oldRoomId = prev.currentRoomId;
        const oldRoom = prev.rooms[oldRoomId];
        const updatedOldRoom = oldRoom
          ? {
              ...oldRoom,
              enemies: oldRoom.enemies.map((e) => ({
                ...e,
                aiState: 'patrol' as const,
                alertTimerMs: 0,
                loseSightTimerMs: 0,
                questionTimerMs: 0,
                moveCooldownMs: 0,
              })),
            }
          : undefined;

        return {
          ...prev,
          currentRoomId: targetRoomId,
          rooms: updatedOldRoom
            ? {
                ...prev.rooms,
                [oldRoomId]: updatedOldRoom,
              }
            : prev.rooms,
          visitedRoomIds: prev.visitedRoomIds.includes(targetRoomId)
            ? prev.visitedRoomIds
            : [...prev.visitedRoomIds, targetRoomId],
        };
      });
      setPlayerPos({ x: nextX, y: nextY });
      setPlayer((prev) => ({
        ...prev,
        mind: Math.min(prev.maxMind, prev.mind + prev.mindPerRoom),
      }));
      setTrailCoords([
        { x: Math.max(1, nextX - 1), y: nextY },
        { x: Math.max(1, nextX - 2), y: nextY },
        { x: Math.max(1, nextX - 2), y: Math.max(1, nextY - 1) },
        { x: Math.max(1, nextX - 3), y: Math.max(1, nextY - 1) },
      ]);
      setAreaBannerText(nextRoom.name);
      setInteractionMenu(null);
      setLogOverlayVisible(false);
      addLog(`📍 Bước vào ${nextRoom.name}. ${nextRoom.sensoryLine}`);
    },
    [world.rooms, addLog]
  );

  // Use Brown Vial on Cracked Wall (Shortcut / Secret Chamber)
  const useBrownVialOnMap = useCallback((): boolean => {
    if ((player.inventory.brown_vial || 0) <= 0) {
      const msg = '⚠️ Trong hành trang không còn Lọ Nâu nào.';
      setInvFeedback(msg);
      addLog(msg);
      setLogOverlayVisible(true);
      return false;
    }
    const room = world.rooms[world.currentRoomId];
    const roomW = room.width || room.grid[0]?.length || CONFIG.GRID_W;
    const roomH = room.height || room.grid.length || CONFIG.GRID_H;
    let blown = false;
    const newGrid = room.grid.map((r) => [...r]);

    // Check within Manhattan distance <= 1 of playerPos for an adjacent Cracked Wall
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > 1) continue;
        const nx = playerPos.x + dx;
        const ny = playerPos.y + dy;
        if (ny >= 0 && ny < roomH && nx >= 0 && nx < roomW) {
          if (newGrid[ny][nx] === TILE.CRACKED_WALL) {
            newGrid[ny][nx] = TILE.FLOOR;
            blown = true;
          }
        }
      }
    }

    if (!blown) {
      const warnMsg =
        '⚠️ Quanh đây chưa thấy bức tường đá rạn nứt nào để châm nổ Lọ Nâu.';
      setInvFeedback(warnMsg);
      addLog(warnMsg);
      setLogOverlayVisible(true);
      return false;
    }

    sfx.playExplosion();
    setPlayer((prev) => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        brown_vial: Math.max(0, (prev.inventory.brown_vial || 0) - 1),
      },
    }));
    setWorld((prev) => ({
      ...prev,
      rooms: {
        ...prev.rooms,
        [room.id]: {
          ...room,
          grid: newGrid,
          secretWallBlown: true,
        },
      },
    }));
    const okMsg = '💥 ẦM! Lọ Nâu nổ tung xé toạc bức tường nứt, hé lộ khoang Mật Thất ẩn giấu.';
    setInvFeedback(okMsg);
    addLog(okMsg);
    setLogOverlayVisible(true);
    return true;
  }, [player.inventory.brown_vial, world, playerPos, addLog]);

  // Open Fear & Hunger-style Right-Side Horizontal Confirmation Prompt for Cracked Wall
  const promptCrackedWallExplosion = useCallback(() => {
    const brownCount = player.inventory.brown_vial || 0;
    setInteractionMenu({
      title: 'TƯỜNG ĐÁ RẠN NỨT',
      description:
        'Bức tường đá có nhiều vết nứt sâu dẫn vào Mật Thất ẩn giấu. Bạn có muốn châm nổ bức tường bằng Lọ Nâu không?',
      selectedIndex: 0,
      choices: [
        {
          label: `Châm nổ tường nứt bằng Lọ Nâu (Còn ${brownCount})`,
          onSelect: () => {
            setInteractionMenu(null);
            useBrownVialOnMap();
          },
        },
        {
          label: 'Rời đi',
          onSelect: () => {
            setInteractionMenu(null);
            setLogOverlayVisible(false);
          },
        },
      ],
    });
  }, [player.inventory.brown_vial, useBrownVialOnMap]);

  // Opens Fear & Hunger / Termina style RPG Dialogue Box + Docked Right-Side Choice Window for any NPC, Void Rift, or Throne Climax
  const openNpcRpgDialogue = useCallback(
    (npcId: string, customSpeech?: string, tileCoordKey?: string) => {
      const closePrompt = () => {
        setInteractionMenu(null);
        setLogOverlayVisible(false);
      };
      const markCoordLooted = (coord?: string) => {
        if (!coord) return;
        setWorld((prev) => {
          const r = prev.rooms[prev.currentRoomId];
          if (!r || r.lootedCoords.includes(coord)) return prev;
          return {
            ...prev,
            rooms: {
              ...prev.rooms,
              [r.id]: { ...r, lootedCoords: [...r.lootedCoords, coord] },
            },
          };
        });
      };

      if (npcId === 'npc_recruit_knight' || npcId === 'npc_recruit_nun' || npcId === 'npc_recruit_hunter') {
        const allyKey =
          npcId === 'npc_recruit_knight'
            ? 'fallen_knight'
            : npcId === 'npc_recruit_nun'
            ? 'forsaken_nun'
            : 'night_hunter';
        const titleMap: Record<string, string> = {
          fallen_knight: 'KẺ GÁC MỘ VÔ DANH MARCUS',
          forsaken_nun: 'NỮ TU OAN KHUẤT AGNES',
          night_hunter: 'GÃ SĂN DI VẬT CROW',
        };
        const introSpeechMap: Record<string, string> = {
          fallen_knight:
            '“Thanh trường kiếm của ta đã sứt mẻ giữa đám cuồng tín, nhưng ta vẫn còn đủ sức đứng chắn trước lưỡi đao của lũ quái vật. Ngươi có cần một lá chắn thép cùng tiến sâu vào Giáo Đường không?”',
          forsaken_nun:
            '“Ta không thể quay lại lễ đường đầy mùi nến sáp nữa... Nếu ngươi cũng đang lần theo dấu vết của những kẻ mất tích dưới hầm sâu, xin hãy cho ta đồng hành và cầu nguyện giữ Lý Trí cho cả đội.”',
          night_hunter:
            '“Sương mù quanh khu mộ đá này nồng nặc mùi sát khí. Một kẻ đi lẻ sẽ sớm làm mồi cho bầy thú đói. Nếu ngươi chia phần chiến lợi phẩm công bằng, cung ngắn và dao găm của ta sẽ yểm trợ phía sau ngươi.”',
        };
        const partyFull = player.party.length >= 3;
        const choices: InteractionChoice[] = [];
        if (!partyFull) {
          choices.push({
            label: `🤝 Chiêu mộ ${titleMap[allyKey]} vào Tổ Đội`,
            onSelect: () => {
              const ally = createRecruitedAlly(allyKey);
              setPlayer((prev) => ({
                ...prev,
                party: prev.party.length < 3 ? [...prev.party, ally] : prev.party,
                npcLifecycle: {
                  ...(prev.npcLifecycle || {}),
                  [npcId]: 'recruited',
                },
              }));
              markCoordLooted(tileCoordKey);
              setInteractionMenu(null);
              addLog(`🤝 [${ally.name}] đã gia nhập Tổ Đội!`);
              setLogOverlayVisible(true);
            },
          });
        }
        choices.push({ label: partyFull ? 'Tổ đội đã đầy (Rời đi)' : 'Từ chối & Rời đi', onSelect: closePrompt });
        setInteractionMenu({
          title: titleMap[allyKey],
          description: customSpeech || introSpeechMap[allyKey],
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'npc_priest') {
        const speech =
          customSpeech ||
          '“Khụ... Ta tự chọc mù mắt sau khi nhìn thấy máu đen rỉ ra từ tượng Thánh Mẫu. Đừng tin bất kỳ lời cầu nguyện nào vang lên từ lễ đường phía trên...”';
        const choices: InteractionChoice[] = [
          {
            label: '"Chuyện gì đã xảy ra với những đứa trẻ trong Giáo Đường?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_priest',
                '“Các giám mục đã giam những đứa trẻ vô tội dưới hầm ngầm để giữ ngọn nến giả tạo khỏi tắt. Đứa gần cuối đang hấp hối ở Hậu Cung, còn đứa nhỏ nhất đã bị kéo xuống tận vực sâu...”'
              ),
          },
          {
            label: '"Linh mục đang tìm kiếm điều gì ở nơi đổ nát này?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_priest',
                '“Chỉ những linh hồn chưa từng vấy bẩn Tha Hóa mới nghe được tiếng thì thầm chân thực của Thánh Mẫu. Nếu bước sai một bước vào bóng tối, ánh sáng sẽ khước từ ngươi mãi mãi.”'
              ),
          },
        ];

        if (!player.npcFlags.priestHelped) {
          const canHeal =
            (player.inventory.green_herb || 0) > 0 || (player.inventory.white_vial || 0) > 0;
          choices.push({
            label: canHeal
              ? '🌿 Trao Thảo Dược Xanh / Thuốc Giải Độc cứu chữa'
              : '🌿 Trao Thảo Dược cứu chữa (Cần Thảo Dược Xanh hoặc Thuốc Giải Độc)',
            onSelect: () => {
              if (!canHeal) {
                openNpcRpgDialogue(
                  'npc_priest',
                  '“Khụ khụ... Ngươi chưa có Thảo Dược Xanh hay Thuốc Giải Độc nào trong hành trang cả...”'
                );
                return;
              }
              const useWhite = (player.inventory.green_herb || 0) <= 0;
              const secondBookId = CONFIG.BOOKS[1].id;
              let gainedHolyAff = false;
              let learnedHolyLight = false;
              setPlayer((prev) => {
                const next: PlayerState = JSON.parse(JSON.stringify(prev));
                next.energyStones += 2;
                if (!isHolyMotherBanned(next)) {
                  gainedHolyAff = grantAffinityOnce(next, 'milestone_help_priest', 'holyMother', 1);
                  if (!next.skillLevels?.holy_light) {
                    next.skillLevels.holy_light = 1;
                    learnedHolyLight = true;
                  }
                }
                if (!next.readBookIds.includes(secondBookId)) {
                  next.readBookIds.push(secondBookId);
                }
                next.inventory.energy_stone = (next.inventory.energy_stone ?? next.energyStones - 2) + 2;
                if (useWhite) {
                  next.inventory.white_vial = Math.max(0, (next.inventory.white_vial || 0) - 1);
                } else {
                  next.inventory.green_herb = Math.max(0, (next.inventory.green_herb || 0) - 1);
                }
                next.npcFlags.priestHelped = true;
                return next;
              });
              setInteractionMenu(null);
              addLog(
                `✨ Giáo Sĩ Mù trao tặng +2 Đá Linh Hồn Rỗng và [${CONFIG.BOOKS[1]?.title || 'Sổ Kiểm Kê Tế Lễ'}]${
                  learnedHolyLight ? ' + Lĩnh hội [Ánh Sáng Thánh Mẫu]' : ''
                }${gainedHolyAff ? ' (+1 Tín Ngưỡng Thánh Mẫu)' : ''}!`
              );
              setLogOverlayVisible(true);
            },
          });
        }
        choices.push({ label: 'Rời đi', onSelect: closePrompt });

        setInteractionMenu({
          title: 'GIÁO SĨ MÙ',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'npc_child_12') {
        const canNecroChild12 =
          Boolean(player.questFlags?.child12Resolved) &&
          !player.questFlags?.child12Raised &&
          (player.skillLevels?.necromancy || 0) >= 1 &&
          player.party.length < 3;
        const speech =
          customSpeech ||
          (player.questFlags?.child12Resolved
            ? '“Chỉ còn bộ khung sắt lạnh lẽo và chiếc áo lễ trắng đẫm máu trên tế đàn...”'
            : '“Đừng... đừng nhìn vào đôi mắt ta... Các giám mục đã cắm những ống đồng lạnh buốt để nuôi ánh nến lễ đường. Em út của bọn ta đã bị kéo xuống vực sâu tối thẳm rồi...”');
        const choices: InteractionChoice[] = [];
        if (!player.questFlags?.child12Resolved) {
          choices.push(
            {
              label: '"Ai đã dựng nên cỗ máy sáp trắng kinh tởm này?"',
              onSelect: () =>
                openNpcRpgDialogue(
                  'npc_child_12',
                  '“Chính Hồng Y Sáp Trắng... Hắn bảo máu của những đứa trẻ mang ấn ký sẽ giữ cho Đại Giáo Đường bất tử, nhưng thứ rỉ ra từ tượng Thánh Mẫu chỉ toàn là máu đen đặc quánh...”'
                ),
            },
            {
              label: '✝ Giải thoát nhẹ nhàng (-10 Tha Hóa, +1 Tín Ngưỡng Thánh Mẫu & [Mảnh Linh Hồn Thuần Khiết])',
              onSelect: () => {
                let gainedHoly = false;
                setPlayer((prev) => {
                  const next: PlayerState = JSON.parse(JSON.stringify(prev));
                  next.corruption = Math.max(0, next.corruption - 10);
                  if (!isHolyMotherBanned(next)) {
                    gainedHoly = grantAffinityOnce(next, 'milestone_free_child_12', 'holyMother', 1);
                  }
                  next.inventory.pure_soul_shard = (next.inventory.pure_soul_shard || 0) + 1;
                  next.questFlags.child12Resolved = true;
                  return next;
                });
                setInteractionMenu(null);
                addLog(
                  `✝️ Bạn nhẹ nhàng tháo gỡ các ống đồng lạnh lẽo, trả lại sự thanh thản cho Thánh Tử Thứ 12 và thu nhận [Mảnh Linh Hồn Thuần Khiết]${
                    gainedHoly ? ' (+1 Tín Ngưỡng Thánh Mẫu)' : ''
                  }.`
                );
                setLogOverlayVisible(true);
              },
            },
            {
              label: '🩸 Rút cạn máu vàng tế đàn (+15 Tha Hóa, +1 Tín Ngưỡng Huyết Quỷ, +2 Đá LH & +2 Bình Máu)',
              onSelect: () => {
                setPlayer((prev) => {
                  const next: PlayerState = JSON.parse(JSON.stringify(prev));
                  next.energyStones += 2;
                  grantAffinityOnce(next, 'milestone_drain_child_12', 'demonicPact', 1);
                  banHolyMother(next);
                  syncCorruptionHolyBan(next);
                  next.inventory.energy_stone = (next.inventory.energy_stone ?? next.energyStones - 2) + 2;
                  next.inventory.blood_vial = (next.inventory.blood_vial || 0) + 2;
                  next.questFlags.child12Resolved = true;
                  return next;
                });
                setInteractionMenu(null);
                addLog(
                  '🩸 Bạn rút cạn dòng máu vàng từ tế đàn của Thánh Tử Thứ 12, thu về 2 Đá Linh Hồn Rỗng, 2 Bình Máu đặc quánh (+1 Tín Ngưỡng Huyết Quỷ, +15 Tha Hóa).'
                );
                setLogOverlayVisible(true);
              },
            }
          );
        } else if (canNecroChild12) {
          choices.push({
            label: '💀 Niệm [Chiêu Hồn Thuật] dựng dậy Vong Linh Thánh Tử 12 (-15 Lý Trí, +12 Tha Hóa)',
            onSelect: () => {
              const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
              const res = castNecromancyOnChild12(pCopy);
              if (res.success) {
                setPlayer(pCopy);
              }
              setInteractionMenu(null);
              addLog(res.message);
              setLogOverlayVisible(true);
            },
          });
        }
        choices.push({ label: 'Rời đi', onSelect: closePrompt });
        setInteractionMenu({
          title: 'THÁNH TỬ THỨ 12',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'npc_broken_knight') {
        const rolandInParty = player.party.some((a) => a.id === 'broken_knight');
        const speech =
          customSpeech ||
          (player.questFlags?.brokenKnightResolved
            ? '“Hãy mang [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis] ấy lên phía trên trao lại cho tiểu thư trong Lồng Kính... Nếu có thể, hãy tìm lại thẻ bài đồng đội nằm rải rác quanh nghĩa địa và lâu đài.”'
            : '“Các giáo sĩ đã khóa chặt cổng sắt sau lưng tiểu đội ta... Trước khi lên trên kia, Đội trưởng nhờ ta giữ [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis] này. Xin ngươi... hãy mang nó lên trao lại cho tiểu thư trong Lồng Kính...”');
        const choices: InteractionChoice[] = [
          {
            label: '"Điều gì đã xảy ra với Đội trưởng và tiểu đội của anh?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_broken_knight',
                '“Ngài ấy chưa từng quay lưng lại với đồng đội... Khi bóng tối từ khe nứt sắp tràn ngập mặt đất, ngài ấy tự bước lên bệ đá cao nhất để gánh lấy tất cả. Mộ đồng đội của ta vẫn còn rải rác quanh Thung Lũng...”'
              ),
          },
        ];
        if (!player.questFlags?.brokenKnightResolved) {
          choices.push(
            {
              label: '💍 Nhận [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis] & băng bó cho anh ta',
              onSelect: () => {
                const updatedKnightReadOk =
                  player.classId === 'fallen_knight' &&
                  player.corruption < 30 &&
                  Boolean(player.questFlags?.vaelisTalked) &&
                  Boolean(player.questFlags?.vaelisDefeated) &&
                  player.readBookIds.length >= 3;
                setPlayer((prev) => ({
                  ...prev,
                  inventory: {
                    ...prev.inventory,
                    knight_ring: (prev.inventory.knight_ring || 0) + 1,
                  },
                  questFlags: { ...prev.questFlags, brokenKnightResolved: true },
                }));
                addLog('💍 Nhận [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis] từ Kỵ Sĩ Gãy Chân Roland.');
                if (updatedKnightReadOk) {
                  setInteractionMenu({
                    title: 'MỤC TIÊU CÁ NHÂN: LỜI THỀ KỴ ĐOÀN',
                    description:
                      'Bạn đã đọc qua các trang Nhật Ký Viễn Chinh, hiểu trọn bi kịch của Vaelis và nắm trong tay [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis]. Bạn muốn ở lại dựng bia mộ hoàn thành tâm nguyện cá nhân hay tiếp tục xuống Vết Rách định đoạt vận mệnh thế giới?',
                    selectedIndex: 0,
                    choices: [
                      {
                        label: '🏆 Hoàn Thành Mục Tiêu Cá Nhân: Dựng Bia Mộ Kỵ Đoàn (S-Ending)',
                        onSelect: () => {
                          const res = evaluateCanonEnding({
                            classId: player.classId,
                            corruption: player.corruption,
                            holyMotherBanned: isHolyMotherBanned(player),
                            readBookIds: player.readBookIds,
                            inventory: {
                              ...player.inventory,
                              knight_ring: (player.inventory.knight_ring || 0) + 1,
                            },
                            learnedSkillIds: Object.keys(player.skillLevels),
                            vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
                            vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
                            curedPetrification: Boolean(player.questFlags?.curedPetrification),
                            child13Rescued: Boolean(player.questFlags?.child13Rescued),
                            child13InParty: player.party.some((a) => a.id === 'child_13' && a.hp > 0),
                            endingAction: 'STAY_BUILD_GRAVES',
                          });
                          setInteractionMenu(null);
                          setActiveModal(null);
                          setEndingInfo(res);
                          setScreen('ending');
                        },
                      },
                      {
                        label: '🌌 Tiếp Tục Xuống Vết Rách Định Đoạt Thế Giới (World Endings)',
                        onSelect: () => {
                          setInteractionMenu(null);
                          addLog('🌌 Bạn cất [Thẻ Bài Kỵ Đoàn], quyết tâm tiến về Vết Rách Tầng 3 định đoạt thế giới.');
                          setLogOverlayVisible(true);
                        },
                      },
                    ],
                  });
                } else {
                  setInteractionMenu(null);
                  setLogOverlayVisible(true);
                }
              },
            },
            {
              label: '⚔️ Ban cái chết êm ái (+15 Tha Hóa, +12 Bạc & nhận [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis])',
              onSelect: () => {
                setPlayer((prev) => {
                  const next: PlayerState = JSON.parse(JSON.stringify(prev));
                  next.silverCoins += 12;
                  next.inventory.silver_coin = (next.inventory.silver_coin ?? next.silverCoins - 12) + 12;
                  next.inventory.knight_ring = (next.inventory.knight_ring || 0) + 1;
                  next.questFlags.brokenKnightResolved = true;
                  next.npcLifecycle = {
                    ...(next.npcLifecycle || {}),
                    npc_broken_knight: 'dead',
                  };
                  banHolyMother(next);
                  grantAffinityOnce(next, 'milestone_kill_npc', 'demonicPact', 1);
                  syncCorruptionHolyBan(next);
                  return next;
                });
                markCoordLooted(tileCoordKey);
                setInteractionMenu(null);
                addLog(
                  '⚔️ Bạn ban nhát kiếm ân huệ kết thúc nỗi thống khổ của Kỵ Sĩ Gãy Chân, thu lại [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis] cùng túi bạc.'
                );
                setLogOverlayVisible(true);
              },
            }
          );
        }
        if (player.questFlags?.brokenKnightResolved && !rolandInParty && player.npcLifecycle?.npc_broken_knight !== 'dead' && player.party.length < 3) {
          choices.push({
            label: '🤝 Đỡ Roland đứng dậy & Chiêu mộ vào Tổ Đội',
            onSelect: () => {
              const roland = createRecruitedAlly('broken_knight');
              setPlayer((prev) => ({
                ...prev,
                party: prev.party.length < 3 ? [...prev.party, roland] : prev.party,
                npcLifecycle: {
                  ...(prev.npcLifecycle || {}),
                  npc_broken_knight: 'recruited' as const,
                },
              }));
              markCoordLooted(tileCoordKey);
              setInteractionMenu(null);
              addLog(`🤝 [${roland.name}] chống kiếm đứng dậy và gia nhập Tổ Đội!`);
              setLogOverlayVisible(true);
            },
          });
        }
        choices.push({ label: 'Rời đi', onSelect: closePrompt });
        setInteractionMenu({
          title: 'KỴ SĨ GÃY CHÂN ROLAND',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'npc_smith') {
        const isHunterDiscount = player.classId === 'night_hunter';
        const speech =
          customSpeech ||
          (isHunterDiscount
            ? '“...” (Đôi mắt trên chiếc đầu đeo thắt lưng gã khẽ nheo lại khi nhận ra dấu ấn Gã Săn Di Vật. Gã giơ búa tạ chỉ vào chảo máu quỷ — sẵn sàng giảm nửa mức Tha Hóa khi Huyết Rèn cho ngươi).'
            : '“...” (Từ vết sẹo cổ cụt ngang phát ra tiếng thở khò khè như bễ lò rèn. Bốn cánh tay khổng lồ giơ búa tạ chỉ vào chảo sắt sôi máu quỷ — sẵn sàng tôi luyện vũ khí của bạn).');
        const choices: InteractionChoice[] = [
          {
            label: '"Ngươi từng là thợ rèn của Kỵ Đoàn sao?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_smith',
                '“...Khộc... Khộc...” (Gã gõ nhịp búa lên đe sắt đẫm máu, chỉ lên bức tường đá đen nơi khắc phù hiệu Quân Đoàn Thập Tự đã bị gạch chéo).'
              ),
          },
        ];

        player.unlockedWeapons
          .filter((wId) => CONFIG.WEAPONS[wId]?.hands > 0)
          .forEach((wId) => {
            const w = CONFIG.WEAPONS[wId];
            const forged = player.bloodForgedWeapons?.includes(wId);
            choices.push({
              label: forged
                ? `✓ [${w.name}] đã tôi luyện Huyết Rèn`
                : isHunterDiscount
                ? `🔥 Huyết Rèn [${w.name}] (+35% ST vĩnh viễn, +8 Tha Hóa — Ưu đãi Săn Di Vật)`
                : `🔥 Huyết Rèn [${w.name}] (+35% ST vĩnh viễn, +15 Tha Hóa)`,
              onSelect: () => {
                if (forged) {
                  openNpcRpgDialogue(
                    'npc_smith',
                    `“Thanh [${w.name}] đã uống no máu quỷ trong lò rèn rồi... Hãy chọn vũ khí khác.”`
                  );
                  return;
                }
                const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                const corBefore = pCopy.corruption;
                const res = bloodForgeWeapon(pCopy, wId);
                if (isHunterDiscount && res.success) {
                  pCopy.corruption = Math.min(100, corBefore + 8);
                  syncCorruptionHolyBan(pCopy);
                }
                pCopy.questFlags.smithUsed = true;
                setPlayer(pCopy);
                setInteractionMenu(null);
                addLog(
                  isHunterDiscount && res.success
                    ? `${res.message} (Đặc quyền Gã Săn Di Vật: Giảm Tha Hóa xuống +8%)`
                    : res.message
                );
                setLogOverlayVisible(true);
              },
            });
          });

        choices.push({ label: 'Rời đi', onSelect: closePrompt });
        setInteractionMenu({
          title: 'KẺ ĐÚC KIẾM KHÔNG ĐẦU',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'npc_glass_lady') {
        const speech =
          customSpeech ||
          (player.questFlags?.glassLadyResolved
            ? '“Chiếc lồng kính pha lê chỉ còn ánh trăng máu lạnh lẽo chiếu xuyên qua...”'
            : '“Chàng đã giam ta trong chiếc lồng pha lê này để Chướng Khí không thể ăn mòn tâm trí ta... Ngươi có nhìn thấy chiếc nhẫn đính hôn của chàng ở đâu không?”');
        const choices: InteractionChoice[] = [
          {
            label: '"Chủ nhân của lâu đài vẫn đang chờ ở phía trước sao?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_glass_lady',
                '“Phải... Chàng tự trói mình giữa sảnh lớn phía trước. Nếu phải đối mặt với chàng, xin đừng chỉ dùng gươm giáo — hãy cất tiếng gọi ký ức còn sót lại trong chàng...”'
              ),
          },
        ];
        if (!player.questFlags?.glassLadyResolved) {
          const hasRing = (player.inventory.knight_ring || 0) > 0;
          choices.push(
            {
              label: hasRing
                ? '💍 Trao lại [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis]'
                : '💍 Trao lại [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis] (Chưa có)',
              onSelect: () => {
                if (!hasRing) {
                  openNpcRpgDialogue(
                    'npc_glass_lady',
                    '“Ngươi vẫn chưa tìm thấy chiếc nhẫn đính hôn ấy ư? Có lẽ một người cận vệ đang giữ nó ở tầng dưới...”'
                  );
                  return;
                }
                const keyBookId = CONFIG.BOOKS[3].id;
                setPlayer((prev) => ({
                  ...prev,
                  hp: prev.maxHp,
                  mind: prev.maxMind,
                  readBookIds: prev.readBookIds.includes(keyBookId)
                    ? prev.readBookIds
                    : [...prev.readBookIds, keyBookId],
                  inventory: {
                    ...prev.inventory,
                    knight_ring: Math.max(0, (prev.inventory.knight_ring || 0) - 1),
                    secret_archive_key: (prev.inventory.secret_archive_key || 0) + 1,
                  },
                  questFlags: { ...prev.questFlags, glassLadyResolved: true },
                }));
                setInteractionMenu(null);
                addLog(
                  '💍✨ Quý Cô ôm chiếc nhẫn bật khóc: Sinh Lực và Lý Trí bạn được xoa dịu, nhận [Chìa Khóa Tư Liệu Mật Goethe] cùng Hồ Sơ Tội Đồ.'
                );
                setLogOverlayVisible(true);
              },
            },
            {
              label: '💥 Đập vỡ Lồng Kính cướp Đá Linh Hồn (+2 Đá LH, +15 Tha Hóa)',
              onSelect: () => {
                setPlayer((prev) => {
                  const next: PlayerState = JSON.parse(JSON.stringify(prev));
                  next.energyStones += 2;
                  next.inventory.energy_stone = (next.inventory.energy_stone ?? next.energyStones - 2) + 2;
                  next.questFlags.glassLadyResolved = true;
                  banHolyMother(next);
                  grantAffinityOnce(next, 'milestone_kill_npc', 'demonicPact', 1);
                  syncCorruptionHolyBan(next);
                  return next;
                });
                setInteractionMenu(null);
                addLog(
                  '💔 Bạn đập vỡ Lồng Kính đoạt lấy hai viên Đá Linh Hồn Rỗng giữa tiếng khóc nghẹn tắt dần.'
                );
                setLogOverlayVisible(true);
              },
            }
          );
        }
        choices.push({ label: 'Rời đi', onSelect: closePrompt });
        setInteractionMenu({
          title: 'QUÝ CÔ TRONG LỒNG KÍNH',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'npc_physician') {
        const isHunter = player.classId === 'night_hunter';
        const speech =
          customSpeech ||
          (isHunter
            ? '“Hắc hắc! Ngươi mang mảnh giấy của ta xuống tận đây sao, Gã Săn Di Vật? Gần khe nứt kia chỉ còn ĐÚNG MỘT BÌNH [Tiên Dược Nguyên Sơ]! Ta để ngươi tự chọn: dùng nó cứu bản thân hay tưới lên hạt giống Thánh Thụ bên cạnh Thánh Tử 13!”'
            : '“Hắc hắc! Ngươi xuống tới tận đáy vực này rồi sao? Gần khe nứt kia chỉ còn ĐÚNG MỘT BÌNH [Tiên Dược Nguyên Sơ]! Kẻ khôn ngoan dùng nó để tẩy độc hóa đá; kẻ điên rồ lại mang nó tưới lên hạt giống sự sống giữa hỗn mang...”');
        const choices: InteractionChoice[] = [
          {
            label: '"Đôi chân hóa đá của ông là do thứ sương mù dưới đây ư?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_physician',
                '“Chính xác! Chướng khí dưới vực sâu biến máu thịt thành đá vôi xám xịt. Ta đã tự gắn bánh xe gỗ vào hông mình để tiếp tục nghiên cứu công thức Giả Kim Cấm!”'
              ),
          },
        ];
        if (!player.questFlags?.physicianTalked) {
          choices.push({
            label: '🧪 Học Công Thức Giả Kim Cấm & nhận +1 Thuốc Hồi Huyết',
            onSelect: () => {
              setPlayer((prev) => ({
                ...prev,
                unlockedRecipes: Array.from(
                  new Set([
                    ...prev.unlockedRecipes,
                    'recipe_void_acid',
                    'recipe_stimulant_serum',
                  ])
                ),
                inventory: {
                  ...prev.inventory,
                  blue_vial: (prev.inventory.blue_vial || 0) + 1,
                },
                questFlags: { ...prev.questFlags, physicianTalked: true },
              }));
              setInteractionMenu(null);
              addLog(
                '🧪 Lão Thần Y trao tặng 1 [Thuốc Hồi Huyết] và mở khóa công thức Giả Kim Cấm!'
              );
              setLogOverlayVisible(true);
            },
          });
        }
        choices.push({ label: 'Rời đi', onSelect: closePrompt });
        setInteractionMenu({
          title: 'LÃO THẦN Y ĐIÊN',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'npc_chronicler') {
        const speech =
          customSpeech ||
          '“Thánh Mẫu chọn Khuôn Khổ Trật Tự. Huyết Quỷ chọn Tham Vọng. Còn Thánh Thụ chỉ nảy mầm từ Ý Chí Tự Do! Chỉ những kẻ chưa từng vấy bẩn tâm hồn mới đọc trọn được thần chú cổ xưa này.”';
        const choices: InteractionChoice[] = [
          {
            label: '"Bia đá cổ ngữ này ghi chép gì về nguồn gốc khe nứt?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_chronicler',
                '“Trước khi Giáo Đường Goethe được xây dựng, nơi đây từng là rễ của một gốc cây cổ thụ thiêng liêng. Khi giáo hội chặt đứt gốc cây để dựng tượng đá, mặt đất dưới đáy vực đã toạc mở!”'
              ),
          },
        ];
        if (!player.questFlags?.chroniclerTalked) {
          choices.push({
            label: '📜 Nhận [Mảnh Thần Chú Tái Thiết] & Giải mã Cổ Thư (+1 Tín Ngưỡng Hư Vô)',
            onSelect: () => {
              const loreBooks = CONFIG.BOOKS.slice(0, 4).map((b) => b.id);
              setPlayer((prev) => {
                const next: PlayerState = JSON.parse(JSON.stringify(prev));
                grantAffinityOnce(next, 'milestone_chronicler_void', 'primordialVoid', 1);
                next.readBookIds = Array.from(new Set([...next.readBookIds, ...loreBooks]));
                next.inventory.reconstruction_scroll = (next.inventory.reconstruction_scroll || 0) + 1;
                next.questFlags.chroniclerTalked = true;
                return next;
              });
              setInteractionMenu(null);
              addLog(
                '📜 Kẻ Chép Sử Hóa Thạch trao [Mảnh Thần Chú Tái Thiết] cùng những trang cổ thư bị phong ấn (+1 Tín Ngưỡng Hư Vô, -10 Lý Trí tối đa).'
              );
              setLogOverlayVisible(true);
            },
            });
          }
          choices.push({ label: 'Rời đi', onSelect: closePrompt });
          setInteractionMenu({
            title: 'KẺ CHÉP SỬ HÓA THẠCH',
            description: speech,
            selectedIndex: 0,
            choices,
          });
          return;
        }

        if (npcId === 'npc_smuggler') {
          if (player.npcFlags.smugglerClosed) {
            addLog(
              'Kẻ Buôn Lậu Đeo Mặt Nạ đã khóa chặt sạp hàng và biến mất vào bóng tối.'
            );
            setLogOverlayVisible(true);
            return;
          }
          const coinsBought = player.npcFlags.smugglerCoinsBought || 0;
          const remainingCoins = Math.max(0, 2 - coinsBought);
          const speech =
            customSpeech ||
            `“Hề hề... Túi của ngươi hiện có ${player.silverCoins} Đồng Bạc. Kể từ khi sương mù khóa chặt Thung Lũng, đám giáo sĩ đều bỏ lại bạc trắng cả. Chọn món hàng ngươi cần đi!”`;
          const wares: Array<{ id: string; name: string; price: number }> = [
            { id: 'ritual_chalk', name: 'Phấn Khắc Ấn', price: 4 },
            { id: 'brown_vial', name: 'Lọ Nâu', price: 6 },
            { id: 'red_vial', name: 'Lọ Đỏ', price: 6 },
            { id: 'ancient_ash', name: 'Tro Tàn Cổ', price: 7 },
            { id: 'poison_powder', name: 'Bột Độc', price: 8 },
            { id: 'poison_herb', name: 'Thảo Dược Độc', price: 7 },
            { id: 'lamp_oil', name: 'Dầu Đèn', price: 6 },
            { id: 'bone_saw', name: 'Cưa Xương Rỉ Máu', price: 8 },
            { id: 'butcher_cleaver', name: 'Đao Phay Đồ Tể', price: 12 },
            ...(remainingCoins > 0
              ? [
                  {
                    id: 'lucky_coin',
                    name: `Thẻ Bài Bạc (Còn ${remainingCoins}/2)`,
                    price: 24,
                  },
                ]
              : []),
          ];
        const choices: InteractionChoice[] = [
          {
            label: '"Ngươi lấy những lọ thuốc và vũ khí này từ đâu?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_smuggler',
                '“Hề hề, từ những đội kỵ sĩ viễn chinh đi trước ngươi chứ đâu! Kẻ nào không biết dùng Lọ Nâu phá tường nứt hay dùng Lọ Đỏ làm mù mắt quái đều bỏ mạng cả!”'
              ),
          },
          ...wares.map((w) => ({
            label: `💰 Mua [${w.name}] (${w.price} Đồng Bạc — Đang có: ${player.silverCoins})`,
            onSelect: () => {
              if (player.silverCoins < w.price) {
                openNpcRpgDialogue(
                  'npc_smuggler',
                  `“Ngươi chỉ có ${player.silverCoins} Đồng Bạc, không đủ ${w.price} Đồng Bạc để mua [${w.name}] đâu!”`
                );
                return;
              }
              setPlayer((prev) => {
                const nextSilver = Math.max(0, prev.silverCoins - w.price);
                return {
                  ...prev,
                  silverCoins: nextSilver,
                  npcFlags:
                    w.id === 'lucky_coin'
                      ? {
                          ...prev.npcFlags,
                          smugglerCoinsBought: (prev.npcFlags.smugglerCoinsBought || 0) + 1,
                        }
                      : prev.npcFlags,
                  unlockedWeapons:
                    w.id === 'butcher_cleaver' && !prev.unlockedWeapons.includes('butcher_cleaver')
                      ? [...prev.unlockedWeapons, 'butcher_cleaver']
                      : prev.unlockedWeapons,
                  inventory:
                    w.id === 'butcher_cleaver'
                      ? {
                          ...prev.inventory,
                          silver_coin: nextSilver,
                        }
                      : {
                          ...prev.inventory,
                          silver_coin: nextSilver,
                          [w.id]: (prev.inventory[w.id] || 0) + 1,
                        },
                };
              });
              setInteractionMenu(null);
              addLog(`💰 Đã mua [${w.name}] từ Kẻ Buôn Lậu với giá ${w.price} Đồng Bạc!`);
              setLogOverlayVisible(true);
            },
          })),
          { label: 'Rời đi', onSelect: closePrompt },
        ];
        setInteractionMenu({
          title: 'KẺ BUÔN LẬU ĐEO MẶT NẠ',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'npc_prisoner') {
        const speech =
          customSpeech ||
          '“Bọn giám mục đã lừa cả đội viễn chinh tiến vào rồi khóa trái Cổng Sắt sau lưng bọn ta... Hãy cởi xích giúp ta, ta sẽ cầm trường kiếm đi theo bảo vệ ngươi đến tận cùng!”';
        const choices: InteractionChoice[] = [
          {
            label: '"Anh còn đủ sức cầm kiếm chiến đấu cùng tôi chứ?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_prisoner',
                '“Đôi tay này vẫn còn nguyên vẹn! Chỉ cần phá chốt cũi sắt, ta sẽ sát cánh cùng ngươi trong từng trận chiến!”'
              ),
          },
        ];
        if (!player.npcFlags.prisonerRecruited && player.party.length < 3) {
          choices.push({
            label: '⛓️ Phá xiềng xích & Chiêu mộ Kael vào Tổ Đội',
            onSelect: () => {
              const kael = createRecruitedAlly('ally_kael');
              setPlayer((prev) => ({
                ...prev,
                npcFlags: { ...prev.npcFlags, prisonerRecruited: true },
                party: prev.party.length < 3 ? [...prev.party, kael] : prev.party,
                npcLifecycle: {
                  ...(prev.npcLifecycle || {}),
                  npc_prisoner: 'recruited',
                },
              }));
              setInteractionMenu(null);
              addLog(
                '🤝 Tù Nhân Kael đã gia nhập Tổ Đội! Anh ta sẽ đi theo sau bạn và cùng chiến đấu.'
              );
              setLogOverlayVisible(true);
            },
          });
        }
        choices.push({ label: 'Rời đi', onSelect: closePrompt });
        setInteractionMenu({
          title: 'KAEL (TÙ NHÂN KỴ ĐOÀN)',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'void_rift') {
        const speech =
          customSpeech ||
          '“Trước mặt bạn là khe nứt không gian tím thẫm đang gầm rú giữa những ngôi sao chết. Bên trong chiếc lồng sắt mở hé là Thánh Tử Thứ 13 đang run rẩy — và trên bệ đá rêu phong đặt độc nhất một bình Tiên Dược Nguyên Sơ.”';
        const choices: InteractionChoice[] = [];

        if (!riftElixirCollected) {
          choices.push({
            label: '🏺 Thu lấy [Tiên Dược Nguyên Sơ] trên bệ đá',
            onSelect: () => {
              setRiftElixirCollected(true);
              setPlayer((prev) => ({
                ...prev,
                inventory: {
                  ...prev.inventory,
                  elixir_of_ancients: (prev.inventory.elixir_of_ancients || 0) + 1,
                },
              }));
              setInteractionMenu(null);
              addLog('🏺 Bạn thu giữ bình [Tiên Dược Nguyên Sơ] duy nhất bên mép Vết Rách!');
              setLogOverlayVisible(true);
            },
          });
        }

        const canTrueEnding =
          (player.inventory.void_core || 0) > 0 &&
          (player.inventory.elixir_of_ancients || 0) > 0 &&
          (player.readBookIds.includes('book_9') || player.readBookIds.length >= 4);
        choices.push({
          label: '🌳 Tưới [Tiên Dược Nguyên Sơ] lên Thánh Tử 13 & cắm [Lõi Khóa Hư Vô]',
          onSelect: () => {
            if (!canTrueEnding) {
              openNpcRpgDialogue(
                'void_rift',
                '“Nghi thức chưa đủ vật dẫn: Cần có Lõi Khóa Hư Vô, bình Tiên Dược Nguyên Sơ còn nguyên vẹn và tri thức từ những Cổ Thư trong Thư Viện.”'
              );
              return;
            }
            const res = evaluateCanonEnding({
              classId: player.classId,
              corruption: player.corruption,
              holyMotherBanned: isHolyMotherBanned(player),
              readBookIds: player.readBookIds,
              inventory: player.inventory,
              learnedSkillIds: Object.keys(player.skillLevels),
              vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
              vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
              curedPetrification: Boolean(player.questFlags?.curedPetrification),
              child13Rescued: Boolean(player.questFlags?.child13Rescued),
              child13InParty: player.party.some((a) => a.id === 'child_13' && a.hp > 0),
              endingAction: 'POUR_ELIXIR_CHILD13_RIFT',
            });
            setInteractionMenu(null);
            setActiveModal(null);
            setEndingInfo(res);
            setScreen('ending');
          },
        });

        const canOrderEnding =
          !isHolyMotherBanned(player) &&
          player.corruption === 0 &&
          (player.inventory.void_core || 0) > 0 &&
          (player.inventory.reconstruction_scroll || 0) > 0;
        choices.push({
          label: '✝️ Thực hiện Nghi Thức Tái Thiết với Thánh Tử 13',
          onSelect: () => {
            if (!canOrderEnding) {
              openNpcRpgDialogue(
                'void_rift',
                '“Nghi thức Trật Tự bị đẩy lùi: Cần tâm hồn thuần khiết chưa bị Thánh Mẫu khước từ, Lõi Khóa Hư Vô và Mảnh Thần Chú Tái Thiết.”'
              );
              return;
            }
            const res = evaluateCanonEnding({
              classId: player.classId,
              corruption: player.corruption,
              holyMotherBanned: isHolyMotherBanned(player),
              readBookIds: player.readBookIds,
              inventory: player.inventory,
              learnedSkillIds: Object.keys(player.skillLevels),
              vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
              vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
              curedPetrification: Boolean(player.questFlags?.curedPetrification),
              child13Rescued: Boolean(player.questFlags?.child13Rescued),
              child13InParty: player.party.some((a) => a.id === 'child_13' && a.hp > 0),
              endingAction: 'SACRIFICE_CHILD13_RIFT',
            });
            setInteractionMenu(null);
            setActiveModal(null);
            setEndingInfo(res);
            setScreen('ending');
          },
        });

        const child13AliveAtRift = player.party.some((a) => a.id === 'child_13' && a.hp > 0);
        const knightPersonalAtRift =
          player.classId === 'fallen_knight' &&
          player.corruption < 30 &&
          Boolean(player.questFlags?.vaelisTalked) &&
          Boolean(player.questFlags?.vaelisDefeated) &&
          player.readBookIds.length >= 3;
        const nunPersonalAtRift =
          player.classId === 'forsaken_nun' &&
          player.corruption < 15 &&
          Boolean(player.questFlags?.child13Rescued) &&
          child13AliveAtRift &&
          player.readBookIds.length >= 3;
        const hunterPersonalAtRift =
          player.classId === 'night_hunter' &&
          Boolean(player.questFlags?.curedPetrification) &&
          Boolean(player.questFlags?.vaelisDefeated);

        if (knightPersonalAtRift || nunPersonalAtRift || hunterPersonalAtRift) {
          choices.push({
            label: knightPersonalAtRift
              ? '🏆 Hoàn Thành Mục Tiêu Cá Nhân: Ở lại Thung Lũng dựng Bia Mộ Kỵ Đoàn (S-Ending)'
              : nunPersonalAtRift
              ? '🏆 Hoàn Thành Mục Tiêu Cá Nhân: Đưa Thánh Tử 13 & Bằng Chứng Trận Pháp Ra Cổng Sắt (S-Ending)'
              : '🏆 Hoàn Thành Mục Tiêu Cá Nhân: Phá Kết Giới & Rời Thung Lũng (S-Ending)',
            onSelect: () => {
              const res = evaluateCanonEnding({
                classId: player.classId,
                corruption: player.corruption,
                holyMotherBanned: isHolyMotherBanned(player),
                readBookIds: player.readBookIds,
                inventory: player.inventory,
                learnedSkillIds: Object.keys(player.skillLevels),
                vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
                vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
                curedPetrification: Boolean(player.questFlags?.curedPetrification),
                child13Rescued: Boolean(player.questFlags?.child13Rescued),
                child13InParty: child13AliveAtRift,
                endingAction: knightPersonalAtRift ? 'STAY_BUILD_GRAVES' : 'ESCAPE_EXTERIOR_GATE',
              });
              setInteractionMenu(null);
              setActiveModal(null);
              setEndingInfo(res);
              setScreen('ending');
            },
          });
        }

        if (!player.questFlags?.child13Rescued) {
          choices.push({
            label: '🔓 Phá xiềng xích giải cứu Thánh Tử Thứ 13 & đưa vào Tổ Đội',
            onSelect: () => {
              const child13Ally = createRecruitedAlly('child_13');
              const canJoin = player.party.length < 3 && !player.party.some((a) => a.id === 'child_13');
              const updatedParty = canJoin ? [...player.party, child13Ally] : player.party;
              const nunReadyNow =
                player.classId === 'forsaken_nun' &&
                canJoin &&
                player.corruption < 15 &&
                player.readBookIds.length >= 3;

              setPlayer((prev) => ({
                ...prev,
                questFlags: { ...prev.questFlags, child13Rescued: true },
                party:
                  prev.party.length < 3 && !prev.party.some((a) => a.id === 'child_13')
                    ? [...prev.party, child13Ally]
                    : prev.party,
              }));
              addLog(
                canJoin
                  ? '🤝💔 Bạn bẻ gãy xiềng xích giải cứu Thánh Tử Thứ 13! Đứa trẻ run rẩy nép sau lưng bạn, hướng về phía Cổng Sắt Ngoại Vi.'
                  : '⚠️ Hàng ngũ đồng hành đã kín chỗ; bạn chỉ kịp mở khóa cũi sắt cho Thánh Tử Thứ 13.'
              );
              if (nunReadyNow) {
                setInteractionMenu({
                  title: 'MỤC TIÊU CÁ NHÂN: BẰNG CHỨNG & THÁNH TỬ 13',
                  description:
                    'Bạn đã giải cứu thành công Thánh Tử Thứ 13 cùng đầy đủ bằng chứng về Trận Pháp Giáo Hội. Bạn muốn đưa em trai trốn thoát ngay qua Cổng Sắt hay tiếp tục ở lại Vết Rách định đoạt vận mệnh thế giới?',
                  selectedIndex: 0,
                  choices: [
                    {
                      label: '🏆 Hoàn Thành Mục Tiêu Cá Nhân: Đưa Thánh Tử 13 Thoát Ra Ngoài (S-Ending)',
                      onSelect: () => {
                        const res = evaluateCanonEnding({
                          classId: player.classId,
                          corruption: player.corruption,
                          holyMotherBanned: isHolyMotherBanned(player),
                          readBookIds: player.readBookIds,
                          inventory: player.inventory,
                          learnedSkillIds: Object.keys(player.skillLevels),
                          vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
                          vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
                          curedPetrification: Boolean(player.questFlags?.curedPetrification),
                          child13Rescued: true,
                          child13InParty: updatedParty.some((a) => a.id === 'child_13' && a.hp > 0),
                          endingAction: 'ESCAPE_EXTERIOR_GATE',
                        });
                        setInteractionMenu(null);
                        setActiveModal(null);
                        setEndingInfo(res);
                        setScreen('ending');
                      },
                    },
                    {
                      label: '🌌 Tiếp Tục Ở Lại Vết Rách Định Đoạt Thế Giới (World Endings)',
                      onSelect: () => {
                        setInteractionMenu(null);
                        setLogOverlayVisible(true);
                      },
                    },
                  ],
                });
              } else {
                setInteractionMenu(null);
                setLogOverlayVisible(true);
              }
            },
          });
        }

        choices.push({ label: 'Rời đi', onSelect: closePrompt });
        setInteractionMenu({
          title: 'VẾT RÁCH HƯ VÔ & THÁNH TỬ 13',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'vaelis_climax') {
        const speech =
          customSpeech ||
          '“Hiệp Sĩ Trưởng Vaelis đã ngã gục trước bậc thềm xương. Trong tay bạn là [Lõi Khóa Hư Vô] — bạn sẽ lựa chọn con đường nào?”';
        const choices: InteractionChoice[] = [
          {
            label: '👑 Ngồi lên Ngai Vàng Máu',
            onSelect: () => {
              if (player.corruption < 100) {
                openNpcRpgDialogue(
                  'vaelis_climax',
                  '“Ngai Vàng Máu đẩy lùi bạn! Chỉ linh hồn đã chìm ngập hoàn toàn trong Tha Hóa mới có thể kế thừa ngôi vị này.”'
                );
                return;
              }
              const res = evaluateCanonEnding({
                classId: player.classId,
                corruption: player.corruption,
                readBookIds: player.readBookIds,
                inventory: player.inventory,
                learnedSkillIds: Object.keys(player.skillLevels),
                vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
                vaelisDefeated: true,
                curedPetrification: Boolean(player.questFlags?.curedPetrification),
                child13Rescued: Boolean(player.questFlags?.child13Rescued),
                child13InParty: player.party.some((a) => a.id === 'child_13' && a.hp > 0),
                endingAction: 'SIT_THRONE',
              });
              setInteractionMenu(null);
              setActiveModal(null);
              setEndingInfo(res);
              setScreen('ending');
            },
          },
        ];

        if (player.classId === 'fallen_knight') {
          choices.push({
            label: '🏆 Hoàn Thành Mục Tiêu Cá Nhân: Ở lại Thung Lũng dựng Bia Mộ Kỵ Đoàn (S-Ending)',
            onSelect: () => {
              if (
                player.corruption >= 30 ||
                !player.questFlags?.vaelisTalked ||
                player.readBookIds.length < 3
              ) {
                openNpcRpgDialogue(
                  'vaelis_climax',
                  '“Lời thề Kỵ Đoàn chưa trọn vẹn: Ngươi cần thấu hiểu bi kịch của Vaelis trước khi vung nhát kiếm cuối, giữ lòng ít vấy bẩn và đọc đủ Nhật Ký / Cổ Thư.”'
                );
                return;
              }
              const res = evaluateCanonEnding({
                classId: player.classId,
                corruption: player.corruption,
                holyMotherBanned: isHolyMotherBanned(player),
                readBookIds: player.readBookIds,
                inventory: player.inventory,
                learnedSkillIds: Object.keys(player.skillLevels),
                vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
                vaelisDefeated: true,
                curedPetrification: Boolean(player.questFlags?.curedPetrification),
                child13Rescued: Boolean(player.questFlags?.child13Rescued),
                child13InParty: player.party.some((a) => a.id === 'child_13' && a.hp > 0),
                endingAction: 'STAY_BUILD_GRAVES',
              });
              setInteractionMenu(null);
              setActiveModal(null);
              setEndingInfo(res);
              setScreen('ending');
            },
          });
        }

        choices.push(
          {
            label: '🌌 Tiếp Tục Xuống Vết Rách Định Đoạt Thế Giới (Giữ [Lõi Khóa Hư Vô])',
            onSelect: () => {
              setInteractionMenu(null);
              setActiveModal(null);
              addLog(
                '🌀 Bạn nắm chặt [Lõi Khóa Hư Vô] và tiếp tục tiến về Vết Rách Tầng 3!'
              );
              setLogOverlayVisible(true);
            },
          },
          {
            label: '🚪 Bỏ lại Vết Rách & rời khỏi Lâu Đài ngay',
            onSelect: () => {
              const res = evaluateCanonEnding({
                classId: player.classId,
                corruption: player.corruption,
                readBookIds: player.readBookIds,
                inventory: player.inventory,
                learnedSkillIds: Object.keys(player.skillLevels),
                vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
                vaelisDefeated: true,
                curedPetrification: Boolean(player.questFlags?.curedPetrification),
                child13Rescued: Boolean(player.questFlags?.child13Rescued),
                child13InParty: player.party.some((a) => a.id === 'child_13' && a.hp > 0),
                endingAction: 'LEAVE_AFTER_VAELIS',
              });
              setInteractionMenu(null);
              setActiveModal(null);
              setEndingInfo(res);
              setScreen('ending');
            },
          }
        );

        setInteractionMenu({
          title: 'NGAI VÀNG MÁU BỎ TRỐNG',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }
    },
    [player, riftElixirCollected, addLog]
  );

  // Interact with adjacent or 2-tile landmark/NPC ([F] key / Click) — opens RPG Bottom Dialogue & Docked Right-Side Choice Window
  const handleTileInteraction = useCallback(() => {
    if (screen !== 'playing' || activeModal || coinToss) return;

    if (interactionMenu) {
      const choice = interactionMenu.choices[interactionMenu.selectedIndex];
      if (choice) choice.onSelect();
      return;
    }

    const room = world.rooms[world.currentRoomId];
    const roomW = room.width || room.grid[0]?.length || CONFIG.GRID_W;
    const roomH = room.height || room.grid.length || CONFIG.GRID_H;
    const closePrompt = () => {
      setInteractionMenu(null);
      setLogOverlayVisible(false);
    };

    // Strictly scan current tile (0,0) and 4 orthogonal adjacent tiles (Manhattan distance <= 1)
    const searchOffsets: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    const npcTileToModalMap: Record<string, string> = {
      [TILE.NPC_PRIEST]: 'npc_priest',
      [TILE.NPC_PRISONER]: 'npc_prisoner',
      [TILE.NPC_CHILD_12]: 'npc_child_12',
      [TILE.NPC_BROKEN_KNIGHT]: 'npc_broken_knight',
      [TILE.NPC_SMITH]: 'npc_smith',
      [TILE.NPC_GLASS_LADY]: 'npc_glass_lady',
      [TILE.NPC_PHYSICIAN]: 'npc_physician',
      [TILE.NPC_CHRONICLER]: 'npc_chronicler',
      [TILE.NPC_SMUGGLER]: 'npc_smuggler',
      [TILE.NPC_RECRUIT_KNIGHT]: 'npc_recruit_knight',
      [TILE.NPC_RECRUIT_NUN]: 'npc_recruit_nun',
      [TILE.NPC_RECRUIT_HUNTER]: 'npc_recruit_hunter',
      [TILE.VOID_RIFT]: 'void_rift',
    };

    const canCastNecro = (player.skillLevels?.necromancy || 0) >= 1 && player.party.length < 3;
    const allCorpses = [...(room.corpses || []), ...room.enemies.filter((e) => e.defeated)];

    const openCorpsePrompt = (corpse: MapEnemyInstance) => {
      const tpl = CONFIG.ENEMIES[corpse.templateId];
      const corpseName = corpse.customName || tpl?.name || 'Quái vật';
      const corpseChoices: InteractionChoice[] = [];

      if (!corpse.corpseLooted) {
        corpseChoices.push({
          label: '🗡️ Lục soát xác quái (Tìm Vũ Khí / Chìa Khóa / Chiến Lợi Phẩm)',
          onSelect: () => {
            setInteractionMenu(null);
            sfx.playSfx('loot');
            const rng = new SeededRNG(`${world.seed}_corpse_loot_${corpse.uid}`);
            const lootMessages: string[] = [];

            const nextPlayer: PlayerState = JSON.parse(JSON.stringify(player));

            if (tpl?.guaranteedWeaponDrop && CONFIG.WEAPONS[tpl.guaranteedWeaponDrop]) {
              const sigWpn = tpl.guaranteedWeaponDrop;
              if (!nextPlayer.unlockedWeapons.includes(sigWpn)) {
                nextPlayer.unlockedWeapons.push(sigWpn);
              }
              lootMessages.push(`Vũ khí Đặc Trưng [${CONFIG.WEAPONS[sigWpn].name}]`);
            }
            if (tpl?.guaranteedDropItem && CONFIG.ITEMS[tpl.guaranteedDropItem]) {
              const sigItem = tpl.guaranteedDropItem;
              nextPlayer.inventory[sigItem] = (nextPlayer.inventory[sigItem] || 0) + 1;
              lootMessages.push(`Di vật [${CONFIG.ITEMS[sigItem].name}]`);
            }
            if ((tpl?.tier === 'miniboss' || tpl?.tier === 'boss') && (tpl?.dropLuckyCoins || 0) > 0) {
              const luckyCount = tpl.dropLuckyCoins || 1;
              nextPlayer.inventory.lucky_coin = (nextPlayer.inventory.lucky_coin || 0) + luckyCount;
              lootMessages.push(`🪙 +${luckyCount} [${CONFIG.ITEMS.lucky_coin.name}]`);
            }

            if (lootMessages.length === 0) {
              const dropRoll = rng.next();
              const normalWeaponPool = [
                'broad_iron_sword',
                'serrated_cleaver',
                'executioner_axe',
                'war_scythe',
                'armor_breaker_mace',
                'poison_curved_dagger',
              ];
              const gearDropPool = [
                'ashen_hood',
                'stalkers_cap',
                'mail_coif',
                'legion_helm',
                'beak_mask',
                'boiled_cuirass',
                'vanguard_hauberk',
                'legion_brigandine',
                'eclipse_pendant',
                'black_straw_effigy',
              ];
              if (dropRoll < 0.42) {
                const wPick = rng.pick(normalWeaponPool);
                if (!nextPlayer.unlockedWeapons.includes(wPick)) {
                  nextPlayer.unlockedWeapons.push(wPick);
                }
                lootMessages.push(`Vũ khí [${CONFIG.WEAPONS[wPick]?.name || wPick}]`);
              } else if (dropRoll < 0.75) {
                nextPlayer.inventory.lockpick = (nextPlayer.inventory.lockpick || 0) + 1;
                lootMessages.push(`+1 [${CONFIG.ITEMS.lockpick.name}]`);
              } else {
                const gPick = rng.pick(gearDropPool);
                if (!nextPlayer.unlockedGear.includes(gPick)) {
                  nextPlayer.unlockedGear.push(gPick);
                }
                lootMessages.push(`Trang bị [${GEAR_ITEMS[gPick]?.name || gPick}]`);
              }
            }

            setPlayer(nextPlayer);
            setWorld((prev) => {
              const curRoom = prev.rooms[room.id];
              if (!curRoom) return prev;
              return {
                ...prev,
                rooms: {
                  ...prev.rooms,
                  [room.id]: {
                    ...curRoom,
                    enemies: curRoom.enemies.map((e) =>
                      e.uid === corpse.uid ? { ...e, corpseLooted: true } : e
                    ),
                    corpses: (curRoom.corpses || []).map((c) =>
                      c.uid === corpse.uid ? { ...c, corpseLooted: true } : c
                    ),
                  },
                },
              };
            });
            addLog(`🗡️ Lục soát xác [${corpseName}]: Thu được ${lootMessages.join(' & ')}!`);
            setLogOverlayVisible(true);
          },
        });
      }

      if (!corpse.corpseDevoured && (player.inventory.scroll_field_dissection || 0) > 0) {
        corpseChoices.push({
          label: '🔪 Giải Phẫu Xác Quái ([Cuộn Giải Phẫu Thực Địa] — 0 Tha Hóa, giữ thuần khiết)',
          onSelect: () => {
            setInteractionMenu(null);
            const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
            const eCopy: MapEnemyInstance = JSON.parse(JSON.stringify(corpse));
            const rng = new SeededRNG(`${world.seed}_dissect_${corpse.uid}`);
            const res = dissectEnemyCorpseCleanly(pCopy, eCopy, rng);
            if (res.success) {
              sfx.playHealOrChime();
              setPlayer(pCopy);
              setWorld((prev) => {
                const curRoom = prev.rooms[room.id];
                if (!curRoom) return prev;
                return {
                  ...prev,
                  rooms: {
                    ...prev.rooms,
                    [room.id]: {
                      ...curRoom,
                      enemies: curRoom.enemies.map((e) => (e.uid === eCopy.uid ? eCopy : e)),
                      corpses: (curRoom.corpses || []).map((c) => (c.uid === eCopy.uid ? eCopy : c)),
                    },
                  },
                };
              });
            }
            addLog(res.message);
            setLogOverlayVisible(true);
          },
        });
      }

      if (!corpse.corpseRaised && !corpse.corpseDevoured && canCastNecro) {
        corpseChoices.push({
          label: '💀 Niệm [Chiêu Hồn Thuật] dựng dậy thành thuộc hạ (-15 Lý Trí, +12 Tha Hóa)',
          onSelect: () => {
            setInteractionMenu(null);
            const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
            const eCopy: MapEnemyInstance = JSON.parse(JSON.stringify(corpse));
            const res = castNecromancyOnCorpse(pCopy, eCopy);
            if (res.success) {
              sfx.playSfx('ritual');
              setPlayer(pCopy);
              setWorld((prev) => {
                const curRoom = prev.rooms[room.id];
                if (!curRoom) return prev;
                return {
                  ...prev,
                  rooms: {
                    ...prev.rooms,
                    [room.id]: {
                      ...curRoom,
                      enemies: curRoom.enemies.map((e) => (e.uid === eCopy.uid ? eCopy : e)),
                      corpses: (curRoom.corpses || []).map((c) => (c.uid === eCopy.uid ? eCopy : c)),
                    },
                  },
                };
              });
            }
            addLog(res.message);
            setLogOverlayVisible(true);
          },
        });
      }

      if (!corpse.corpseDevoured) {
        corpseChoices.push({
          label: '🩸 Nuốt xác tươi (-45% Đói / +20% Tha Hóa)',
          onSelect: () => {
            setInteractionMenu(null);
            const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
            const eCopy: MapEnemyInstance = JSON.parse(JSON.stringify(corpse));
            const res = devourEnemyCorpse(pCopy, eCopy);
            if (!res.success) return;
            sfx.playSfx('hurt');
            setPlayer(pCopy);
            setWorld((prev) => {
              const curRoom = prev.rooms[room.id];
              if (!curRoom) return prev;
              return {
                ...prev,
                rooms: {
                  ...prev.rooms,
                  [room.id]: {
                    ...curRoom,
                    enemies: curRoom.enemies.map((e) => (e.uid === eCopy.uid ? eCopy : e)),
                    corpses: (curRoom.corpses || []).map((c) => (c.uid === eCopy.uid ? eCopy : c)),
                  },
                },
              };
            });
            addLog(res.message);
            setLogOverlayVisible(true);
          },
        });
      }

      corpseChoices.push({ label: 'Rời đi', onSelect: closePrompt });

      setInteractionMenu({
        title: `XÁC CỦA ${corpseName.toUpperCase()}`,
        description:
          'Xác kẻ địch nằm bất động trên nền đá đẫm máu. Bạn có thể lục soát chiến lợi phẩm, niệm Chiêu Hồn Thuật hoặc nuốt xác để cầm cự cơn đói.',
        selectedIndex: 0,
        choices: corpseChoices,
      });
    };

    for (const [dx, dy] of searchOffsets) {
      if (Math.abs(dx) + Math.abs(dy) > 1) continue;
      const cx = playerPos.x + dx;
      const cy = playerPos.y + dy;
      if (cy < 0 || cy >= roomH || cx < 0 || cx >= roomW) continue;
      const tile = room.grid[cy][cx];
      const coordKey = `${cx},${cy}`;

      // Corpse has higher interaction priority than floor landmarks (e.g. RITUAL_CIRCLE)
      const corpseOnTile = allCorpses.find(
        (e) =>
          e.x === cx &&
          e.y === cy &&
          (!e.corpseDevoured || !e.corpseLooted || (!e.corpseRaised && canCastNecro))
      );
      if (corpseOnTile) {
        openCorpsePrompt(corpseOnTile);
        return;
      }

      if (npcTileToModalMap[tile]) {
        const modalId = npcTileToModalMap[tile];
        const lcState = player.npcLifecycle?.[modalId];
        if (lcState === 'recruited' || lcState === 'dead') continue;
        if (tile === TILE.NPC_PRISONER && (player.npcFlags.prisonerRecruited || player.party.some((a) => a.id === 'ally_kael'))) continue;
        if (tile === TILE.NPC_BROKEN_KNIGHT && player.party.some((a) => a.id === 'broken_knight')) continue;
        if (
          tile === TILE.NPC_RECRUIT_KNIGHT &&
          ((room.lootedCoords.includes(coordKey) && lcState !== 'map') ||
            player.classId === 'fallen_knight' ||
            player.party.some((a) => a.id === 'fallen_knight'))
        ) {
          continue;
        }
        if (
          tile === TILE.NPC_RECRUIT_NUN &&
          ((room.lootedCoords.includes(coordKey) && lcState !== 'map') ||
            player.classId === 'forsaken_nun' ||
            player.party.some((a) => a.id === 'forsaken_nun'))
        ) {
          continue;
        }
        if (
          tile === TILE.NPC_RECRUIT_HUNTER &&
          ((room.lootedCoords.includes(coordKey) && lcState !== 'map') ||
            player.classId === 'night_hunter' ||
            player.party.some((a) => a.id === 'night_hunter'))
        ) {
          continue;
        }
        openNpcRpgDialogue(modalId, undefined, coordKey);
        return;
      }

      // Bed Save / Rest (Safe if room cleared; forced Coin-Flip ambush check if living enemies remain)
      if (tile === TILE.BED_SAVE) {
        const livingRoomEnemies = room.enemies.filter(
          (e) => !e.defeated && !e.isTutorialGatekeeper
        );
        const hasLivingEnemies = livingRoomEnemies.length > 0;
        setInteractionMenu({
          title: 'GIƯỜNG ĐÁ CỔ',
          description: hasLivingEnemies
            ? 'Chiếc giường đá phủ chăn rách giữa bóng tối. Vẫn còn quái vật lẩn khuất trong tầng này — nằm ngủ lúc này sẽ phải Tung Đồng Xu Định Mệnh đề phòng bị tập kích!'
            : 'Chiếc giường đá phủ chăn rách giữa vùng an toàn. Khu vực này đã sạch bóng quái vật — bạn có thể yên tâm nghỉ ngơi và Lưu tiến trình.',
          selectedIndex: 0,
          choices: [
            {
              label: hasLivingEnemies
                ? '⚠️ Nằm xuống ngủ & Lưu (Nguy cơ bị tập kích)'
                : '🛏️ Nằm xuống ngủ & Lưu tiến trình (An toàn)',
              onSelect: () => {
                setInteractionMenu(null);
                if (!hasLivingEnemies) {
                  sfx.playHealOrChime();
                  setPlayer((prev) => ({
                    ...prev,
                    hp: Math.min(prev.maxHp, prev.hp + 35),
                    mind: Math.min(prev.maxMind, prev.mind + 30),
                  }));
                  addLog(
                    '🛏️ Giấc ngủ bình yên hiếm hoi xoa dịu vết thương và tâm trí giữa bóng tối.'
                  );
                  setActiveModal('saves');
                  return;
                }
                triggerCoinToss(
                  'PHỤC KÍCH TRONG GIẤC NGỦ',
                  'Quái vật vẫn còn sống trong tầng hầm! Thất bại sẽ bị tập kích ngay lập tức và mất lượt đầu!',
                  (won) => {
                    if (won) {
                      sfx.playHealOrChime();
                      setPlayer((prev) => ({
                        ...prev,
                        hp: Math.min(prev.maxHp, prev.hp + 30),
                        mind: Math.min(prev.maxMind, prev.mind + 25),
                      }));
                      addLog(
                        '🛏️ May mắn thay, tiếng bước chân lướt qua ngoài cửa — bạn chợp mắt hồi sức an toàn.'
                      );
                      setActiveModal('saves');
                    } else {
                      const ambushEnemy = livingRoomEnemies[0];
                      addLog(
                        '⚠️ BỊ PHỤC KÍCH! Bóng đen lao vào xé rách màn đêm khi bạn vừa khép mắt!'
                      );
                      startCombatWithEnemy(ambushEnemy, { ambushFirstStrike: true });
                    }
                  }
                );
              },
            },
            {
              label: 'Tải lại Hồ Sơ Lưu (Load Save)',
              onSelect: () => {
                setInteractionMenu(null);
                setActiveModal('saves');
              },
            },
            { label: 'Rời đi', onSelect: closePrompt },
          ],
        });
        return;
      }

      // CRATE: Instant loot on [F] — High food spawn rate (~60% overall) + supplies (12% rare Lucky Coin)
      if (tile === TILE.CRATE && !room.lootedCoords.includes(coordKey)) {
        sfx.playHealOrChime();
        const rng = new SeededRNG(`${world.seed}_${room.id}_${coordKey}`);
        const supplyTable = [
          'ritual_chalk',
          'ritual_chalk',
          'brown_vial',
          'red_vial',
          'blue_vial',
          'opium_vial',
          'ancient_ash',
          'poison_powder',
          'poison_herb',
          'lamp_oil',
          'green_herb',
          'red_herb',
          'white_herb',
          'bandage',
          'bone_saw',
          'lockpick',
          'torch',
        ];
        const foodTable = ['dried_meat', 'moldy_bread', 'moldy_bread'];

        let item1: string;
        let bonusFood: string | null = null;
        if (rng.chance(0.12)) {
          item1 = 'lucky_coin';
        } else if (rng.chance(0.52)) {
          item1 = rng.pick(foodTable);
        } else {
          item1 = rng.pick(supplyTable);
          if (rng.chance(0.35)) {
            bonusFood = rng.pick(foodTable);
          }
        }

        setPlayer((prev) => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            [item1]: (prev.inventory[item1] || 0) + 1,
            ...(bonusFood ? { [bonusFood]: (prev.inventory[bonusFood] || 0) + 1 } : {}),
          },
        }));

        setWorld((prev) => {
          const curRoom = prev.rooms[room.id] || room;
          return {
            ...prev,
            rooms: {
              ...prev.rooms,
              [room.id]: {
                ...curRoom,
                lootedCoords: curRoom.lootedCoords.includes(coordKey)
                  ? curRoom.lootedCoords
                  : [...curRoom.lootedCoords, coordKey],
              },
            },
          };
        });
        addLog(
          item1 === 'lucky_coin'
            ? '📦✨ Lục thùng gỗ tiếp tế, bất ngờ tìm thấy [Thẻ Bài Bạc] ẩn dưới lớp rơm!'
            : bonusFood
            ? `📦 Lục thùng gỗ tiếp tế, thu nhận [${CONFIG.ITEMS[item1]?.name || item1}] cùng [${CONFIG.ITEMS[bonusFood]?.name || bonusFood}].`
            : `📦 Lục thùng gỗ tiếp tế, thu nhận [${CONFIG.ITEMS[item1]?.name || item1}].`
        );
        sfx.playSfx('loot');
        setLogOverlayVisible(true);
        return;
      }

      // WILD HERB: Instant forage on [F] matching the exact herb color rendered on the map
      if (tile === TILE.HERB && !room.lootedCoords.includes(coordKey)) {
        sfx.playHealOrChime();
        const h1 = getHerbTypeAtCoord(room, cx, cy, world.seed);

        setPlayer((prev) => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            [h1]: (prev.inventory[h1] || 0) + 1,
          },
        }));

        setWorld((prev) => {
          const curRoom = prev.rooms[room.id] || room;
          return {
            ...prev,
            rooms: {
              ...prev.rooms,
              [room.id]: {
                ...curRoom,
                lootedCoords: curRoom.lootedCoords.includes(coordKey)
                  ? curRoom.lootedCoords
                  : [...curRoom.lootedCoords, coordKey],
              },
            },
          };
        });
        addLog(`🌿 Hái được nhành [${CONFIG.ITEMS[h1]?.name || h1}] mọc bên kẽ đá ẩm.`);
        setLogOverlayVisible(true);
        return;
      }

      // CHEST: 45% sealed chests require a Coin Toss (or Lockpick) to open; grants gear, rare vial, high chance of food rations (~60%), and 28% Lucky Coin
      if (tile === TILE.CHEST && !room.lootedCoords.includes(coordKey)) {
        const lockRng = new SeededRNG(`${world.seed}_chest_lock_${room.id}_${coordKey}`);
        const requiresCoinToss = lockRng.chance(0.45);

        const openChestAndGrantRewards = (extraHealthDelta = 0, prefixLog?: string) => {
          const rng = new SeededRNG(`${world.seed}_chest_${room.id}_${coordKey}`);
          const allGearIds = Object.keys(GEAR_ITEMS).filter(
            (g) => !player.unlockedGear.includes(g)
          );
          const allShieldIds = Object.keys(CONFIG.SHIELDS).filter(
            (s) => !player.unlockedShields.includes(s)
          );
          const weaponKeys = Object.keys(CONFIG.WEAPONS).filter(
            (w) => w !== 'bite_headbutt' && !player.unlockedWeapons.includes(w)
          );

          setWorld((prev) => {
            const curRoom = prev.rooms[room.id] || room;
            return {
              ...prev,
              rooms: {
                ...prev.rooms,
                [room.id]: {
                  ...curRoom,
                  lootedCoords: curRoom.lootedCoords.includes(coordKey)
                    ? curRoom.lootedCoords
                    : [...curRoom.lootedCoords, coordKey],
                },
              },
            };
          });

          const rollEquipType = rng.next();
          const rareVials = [
            'white_vial',
            'purple_vial',
            'blue_vial',
            'silver_sword_oil',
            'ancient_ash',
            'poison_powder',
            'lamp_oil',
          ];
          const vialId = rng.pick(rareVials);
          const foundLuckyCoin = rng.chance(0.28);
          const hasFood = rng.chance(0.6);
          const foodId = rng.chance(0.62) ? 'dried_meat' : 'moldy_bread';
          const foodQty = hasFood ? (rng.chance(0.3) ? 2 : 1) : 0;
          let equipRewardName = '';

          const applyRewards = (
            prev: PlayerState,
            updates: Partial<Pick<PlayerState, 'unlockedGear' | 'unlockedShields' | 'unlockedWeapons'>>
          ): PlayerState => ({
            ...prev,
            ...updates,
            hp:
              extraHealthDelta < 0
                ? Math.max(1, prev.hp + extraHealthDelta)
                : prev.hp,
            inventory: {
              ...prev.inventory,
              [vialId]: (prev.inventory[vialId] || 0) + 1,
              ...(foodQty > 0 ? { [foodId]: (prev.inventory[foodId] || 0) + foodQty } : {}),
              ...(foundLuckyCoin ? { lucky_coin: (prev.inventory.lucky_coin || 0) + 1 } : {}),
            },
          });

          if (rollEquipType < 0.45 && allGearIds.length > 0) {
            const pickedGear = rng.pick(allGearIds);
            equipRewardName = GEAR_ITEMS[pickedGear]?.name || pickedGear;
            setPlayer((prev) =>
              applyRewards(prev, {
                unlockedGear: prev.unlockedGear.includes(pickedGear)
                  ? prev.unlockedGear
                  : [...prev.unlockedGear, pickedGear],
              })
            );
          } else if (rollEquipType < 0.7 && allShieldIds.length > 0) {
            const pickedShield = rng.pick(allShieldIds);
            equipRewardName = CONFIG.SHIELDS[pickedShield]?.name || pickedShield;
            setPlayer((prev) =>
              applyRewards(prev, {
                unlockedShields: prev.unlockedShields.includes(pickedShield)
                  ? prev.unlockedShields
                  : [...prev.unlockedShields, pickedShield],
              })
            );
          } else {
            const chosenWeapon =
              weaponKeys.length > 0 ? rng.pick(weaponKeys) : 'claymore_greatsword';
            equipRewardName = CONFIG.WEAPONS[chosenWeapon]?.name || chosenWeapon;
            setPlayer((prev) =>
              applyRewards(prev, {
                unlockedWeapons: prev.unlockedWeapons.includes(chosenWeapon)
                  ? prev.unlockedWeapons
                  : [...prev.unlockedWeapons, chosenWeapon],
              })
            );
          }

          sfx.playSfx('loot');
          const foodPart =
            foodQty > 0
              ? ` & +${foodQty} [${CONFIG.ITEMS[foodId]?.name || foodId}]`
              : '';
          const coinPart = foundLuckyCoin ? ' & 🪙 +1 [Thẻ Bài Bạc]' : '';
          addLog(
            `${prefixLog ? `${prefixLog} ` : ''}🗝️ Mở nắp rương cổ: Thu được [${equipRewardName}], [${CONFIG.ITEMS[vialId]?.name || vialId}]${foodPart}${coinPart}.`
          );
          setLogOverlayVisible(true);
        };

        if (!requiresCoinToss) {
          openChestAndGrantRewards();
          return;
        }

        const lockpickCount = player.inventory.lockpick || 0;
        const useLockpick =
          lockpickCount > 0
            ? () => {
                setPlayer((prev) => ({
                  ...prev,
                  inventory: {
                    ...prev.inventory,
                    lockpick: Math.max(0, (prev.inventory.lockpick || 0) - 1),
                  },
                }));
                openChestAndGrantRewards(0, '🔓 Chìa Khóa Vạn Năng lách khẽ qua ổ khóa cổ.');
              }
            : undefined;

        triggerCoinToss(
          'RƯƠNG NIÊM PHONG',
          '',
          (_won, tier) => {
            if (tier === 'win') {
              openChestAndGrantRewards();
            } else if (tier === 'partial') {
              openChestAndGrantRewards(
                -6,
                '🩸⚖️ Lưỡi châm sượt qua ngón tay nhưng chốt khóa đã bật tung.'
              );
            } else {
              setPlayer((prev) => ({
                ...prev,
                hp: Math.max(1, prev.hp - 10),
              }));
              addLog('🩸 Mũi kim bật ra từ ổ khóa rương cổ. Nắp rương vẫn đóng chặt trong bóng tối.');
              setLogOverlayVisible(true);
            }
          },
          useLockpick
        );
        return;
      }

      // BOOKSHELF: Grants AT MOST 1 item from Lore, Chiến Kỹ Scroll, Survival Scroll, or Alchemy Recipe Book; Lose = Cursed Book Trap.
      if (tile === TILE.BOOKSHELF && !room.lootedCoords.includes(coordKey)) {
        const shelfRng = new SeededRNG(`${world.seed}_bookshelf_type_${room.id}_${coordKey}`);
        const isScrollShelf = shelfRng.chance(0.55);

        setInteractionMenu({
          title: isScrollShelf
            ? 'KỆ SÁCH CỔ — NGĂN BÍ KÍP & CÔNG THỨC'
            : 'KỆ SÁCH CỔ — NGĂN BIÊN NIÊN SỬ',
          description: isScrollShelf
            ? 'Giữa những tầng sách mục nát thấp thoáng cuộn da cổ xưa, Bí Kíp Sinh Tồn hoặc Sách Công Thức Giả Kim. Hãy Tung Đồng Xu Định Mệnh (hoặc dùng Chìa Khóa Vạn Năng) để lục tìm cẩn trọng.'
            : 'Kệ sách gỗ mục nát lưu giữ 1 trang Ghi Chép Biên Niên Sử cổ đại của Đại Giáo Đường Goethe.',
          selectedIndex: 0,
          choices: [
            {
              label: isScrollShelf
                ? 'Tung Đồng Xu tìm Bí Kíp / Công Thức Cổ'
                : 'Đọc & Thu thập Ghi Chép Cổ',
              onSelect: () => {
                setInteractionMenu(null);
                const rng = new SeededRNG(`${world.seed}_bookshelf_${room.id}_${coordKey}`);

                // Mark shelf as looted
                setWorld((prev) => ({
                  ...prev,
                  rooms: {
                    ...prev.rooms,
                    [room.id]: {
                      ...room,
                      lootedCoords: [...room.lootedCoords, coordKey],
                    },
                  },
                }));

                if (!isScrollShelf) {
                  // Note / Lore Shelf: Grants 1 Lore Book (max 1 item)
                  const uncollected = CONFIG.BOOKS.filter(
                    (b) => !player.readBookIds.includes(b.id)
                  );
                  const pickedBook =
                    uncollected.length > 0 ? rng.pick(uncollected) : rng.pick(CONFIG.BOOKS);
                  const bonusRecipeId = pickedBook.unlockRecipeId;

                  setPlayer((prev) => ({
                    ...prev,
                    readBookIds: prev.readBookIds.includes(pickedBook.id)
                      ? prev.readBookIds
                      : [...prev.readBookIds, pickedBook.id],
                    unlockedRecipes:
                      bonusRecipeId && !prev.unlockedRecipes.includes(bonusRecipeId)
                        ? [...prev.unlockedRecipes, bonusRecipeId]
                        : prev.unlockedRecipes,
                  }));
                  setSelectedLoreBookId(pickedBook.id);
                  addLog(`📜 Kệ Sách Ghi Chép: Tìm thấy trang "${pickedBook.title}"!`);
                  setLogOverlayVisible(true);
                  setActiveModal('lore');
                  return;
                }

                const grantShelfTreasure = (tier: CoinOutcomeTier) => {
                  if (tier === 'win') {
                    const survivalScrollPool = [
                      'scroll_shadow_step',
                      'scroll_distract_ash',
                      'scroll_field_dissection',
                      'scroll_emergency_amputation',
                    ];
                    const recipeBookPool = [
                      'recipe_book_expedition',
                      'recipe_book_cathedral',
                      'recipe_book_forbidden',
                    ].filter((rbId) => {
                      const recIds = CONFIG.ITEMS[rbId]?.unlockRecipes || [];
                      return recIds.some((rid) => !player.unlockedRecipes.includes(rid));
                    });
                    const uncollectedSkillScrolls = CONFIG.SKILLS.filter(
                      (s) =>
                        s.branch === 'Chiến Kỹ' &&
                        (player.skillLevels[s.id] || 0) === 0 &&
                        (player.inventory[`scroll_${s.id}`] || 0) === 0
                    ).map((s) => `scroll_${s.id}`);

                    const rewardCandidates: string[] = [
                      ...uncollectedSkillScrolls,
                      ...survivalScrollPool,
                      ...recipeBookPool,
                    ];

                    if (rewardCandidates.length > 0 && rng.chance(0.75)) {
                      const pickedId = rng.pick(rewardCandidates);
                      setPlayer((prev) => ({
                        ...prev,
                        inventory: {
                          ...prev.inventory,
                          [pickedId]: (prev.inventory[pickedId] || 0) + 1,
                        },
                      }));
                      sfx.playHealOrChime();
                      addLog(
                        `📜✨ Thu nhận được [${CONFIG.ITEMS[pickedId]?.name || pickedId}]. Hãy mở Túi [I] để đọc hoặc sử dụng!`
                      );
                    } else {
                      const uncollectedLore = CONFIG.BOOKS.filter(
                        (b) => !player.readBookIds.includes(b.id)
                      );
                      if (uncollectedLore.length > 0) {
                        const b = rng.pick(uncollectedLore);
                        setPlayer((prev) => ({
                          ...prev,
                          readBookIds: prev.readBookIds.includes(b.id)
                            ? prev.readBookIds
                            : [...prev.readBookIds, b.id],
                          unlockedRecipes:
                            b.unlockRecipeId && !prev.unlockedRecipes.includes(b.unlockRecipeId)
                              ? [...prev.unlockedRecipes, b.unlockRecipeId]
                              : prev.unlockedRecipes,
                        }));
                        setSelectedLoreBookId(b.id);
                        sfx.playHealOrChime();
                        addLog(`📜✨ Giữa ngăn bí mật ẩn giấu trang Cổ Thư "${b.title}"!`);
                      } else {
                        const rareArchiveItem = rng.pick([
                          'blue_vial',
                          'white_vial',
                          'calm_flower',
                          'green_herb',
                        ]);
                        setPlayer((prev) => ({
                          ...prev,
                          inventory: {
                            ...prev.inventory,
                            [rareArchiveItem]: (prev.inventory[rareArchiveItem] || 0) + 1,
                          },
                        }));
                        sfx.playHealOrChime();
                        addLog(
                          `📜✨ Tìm thấy [${CONFIG.ITEMS[rareArchiveItem]?.name}] cất giấu sau giá sách.`
                        );
                      }
                    }
                  } else if (tier === 'partial') {
                    const lesserItem = rng.pick(['green_herb', 'bandage', 'white_herb']);
                    setPlayer((prev) => ({
                      ...prev,
                      inventory: {
                        ...prev.inventory,
                        [lesserItem]: (prev.inventory[lesserItem] || 0) + 1,
                      },
                    }));
                    addLog(
                      `📜⚖️ Cuộn giấy mục nát vỡ vụn giữa tay, chỉ sót lại [${CONFIG.ITEMS[lesserItem]?.name}] kẹp sau giá gỗ.`
                    );
                  } else {
                    // Cursed Book Trap!
                    setPlayer((prev) => ({
                      ...prev,
                      mind: Math.max(0, prev.mind - 10),
                      corruption: Math.min(100, prev.corruption + 4),
                    }));
                    sfx.playSfx('hurt');
                    addLog(
                      '🕸️📖 BẪY SÁCH NGUYỀN! Bụi cổ ngữ đen phụt thẳng vào mặt bạn (-10 Lý Trí, +4 Tha Hóa)!'
                    );
                  }
                  setLogOverlayVisible(true);
                };

                const shelfLockpicks = player.inventory.lockpick || 0;
                const useLockpickOnShelf =
                  shelfLockpicks > 0
                    ? () => {
                        setPlayer((prev) => ({
                          ...prev,
                          inventory: {
                            ...prev.inventory,
                            lockpick: Math.max(0, (prev.inventory.lockpick || 0) - 1),
                          },
                        }));
                        grantShelfTreasure('win');
                      }
                    : undefined;

                // Skill/Survival/Recipe Scroll Shelf (requires Coin Toss or Lockpick)
                triggerCoinToss(
                  'LỤC KỆ SÁCH CỔ',
                  'Đoán sai sẽ kích hoạt Bẫy Sách Nguyền (-10 Lý Trí)!',
                  (_won, tier) => grantShelfTreasure(tier),
                  useLockpickOnShelf
                );
              },
            },
            { label: 'Rời đi', onSelect: closePrompt },
          ],
        });
        return;
      }

      // NEW SURVIVAL TILE 1: CORPSE_LOOT (Fallen Crusader Corpse)
      if (tile === TILE.CORPSE_LOOT && !room.lootedCoords.includes(coordKey)) {
        sfx.playHealOrChime();
        const rng = new SeededRNG(`${world.seed}_corpse_tile_${room.id}_${coordKey}`);
        const roll = rng.next();
        let rewardLog = '';

        if (roll < 0.45) {
          const lightGearPool = ['ashen_hood', 'stalkers_cap', 'goethe_cassock', 'rotting_targe'];
          const gId = rng.pick(lightGearPool);
          if (CONFIG.SHIELDS[gId]) {
            rewardLog = `[${CONFIG.SHIELDS[gId].name}]`;
            setPlayer((prev) => ({
              ...prev,
              unlockedShields: prev.unlockedShields.includes(gId)
                ? prev.unlockedShields
                : [...prev.unlockedShields, gId],
            }));
          } else {
            rewardLog = `[${GEAR_ITEMS[gId]?.name || gId}]`;
            setPlayer((prev) => ({
              ...prev,
              unlockedGear: prev.unlockedGear.includes(gId)
                ? prev.unlockedGear
                : [...prev.unlockedGear, gId],
            }));
          }
        } else {
          const itemPick = rng.pick([
            'lockpick',
            'bandage',
            'blue_vial',
            'ritual_chalk',
            'ancient_ash',
            'poison_powder',
            'poison_herb',
            'lamp_oil',
          ]);
          rewardLog = `+1 ${CONFIG.ITEMS[itemPick]?.name}`;
          setPlayer((prev) => ({
            ...prev,
            inventory: {
              ...prev.inventory,
              [itemPick]: (prev.inventory[itemPick] || 0) + 1,
            },
          }));
        }

        setWorld((prev) => ({
          ...prev,
          rooms: {
            ...prev.rooms,
            [room.id]: {
              ...room,
              lootedCoords: [...room.lootedCoords, coordKey],
            },
          },
        }));
        addLog(`💀 Lục soát xác kỵ sĩ viễn chinh tử trận: Thu được ${rewardLog}!`);
        setLogOverlayVisible(true);
        return;
      }

      // NEW SURVIVAL TILE 2: MIASMA_VENT (Meditate to absorb Miasma for Primordial Void Affinity)
      if (tile === TILE.MIASMA_VENT && !room.lootedCoords.includes(coordKey)) {
        setInteractionMenu({
          title: 'KHE NỨT CHƯỚNG KHÍ HƯ VÔ',
          description:
            'Luồng khói tím lạnh lẽo rỉ ra từ vết nứt nền đá. Bạn có thể bất chấp điên loạn để hít sâu và lĩnh hội nhịp thở của Hư Vô Nguyên Thủy.',
          selectedIndex: 0,
          choices: [
            {
              label: 'Thiền định hấp thụ Chướng Khí (-18 Lý Trí, +8 Tha Hóa → +1 Tín Ngưỡng Hư Vô)',
              onSelect: () => {
                setInteractionMenu(null);
                setPlayer((prev) => {
                  const next: PlayerState = JSON.parse(JSON.stringify(prev));
                  next.mind = Math.max(2, next.mind - 18);
                  next.corruption = Math.min(100, next.corruption + 8);
                  grantAffinityOnce(next, `miasma_${room.id}_${coordKey}`, 'primordialVoid', 1);
                  syncCorruptionHolyBan(next);
                  return next;
                });
                setWorld((prev) => ({
                  ...prev,
                  rooms: {
                    ...prev.rooms,
                    [room.id]: {
                      ...room,
                      lootedCoords: [...room.lootedCoords, coordKey],
                    },
                  },
                }));
                addLog(
                  '🌌 Bạn hít sâu luồng Chướng Khí tím, Lý Trí tối đa giảm nhẹ (-10) khi nghe rõ nhịp thở của Hư Vô Nguyên Thủy (+1 Tín Ngưỡng).'
                );
                setLogOverlayVisible(true);
              },
            },
            { label: 'Rời đi', onSelect: closePrompt },
          ],
        });
        return;
      }

      // RITUAL_CIRCLE: 4 Strictly Separated Deity Circles (uninscribed / holy_mother / demon_lord / void_god)
      if (tile === TILE.RITUAL_CIRCLE) {
        const circleMeta = room.ritualCircles?.[coordKey];
        const deityType: RitualDeityType = circleMeta?.deityType || 'uninscribed';
        const circleActionId = `ritual_${room.id}_${coordKey}`;
        const isCircleDone =
          Boolean(circleMeta?.used) ||
          (deityType !== 'uninscribed' && room.lootedCoords.includes(coordKey));
        if (!isCircleDone) {
          const updateCircleState = (nextDeity: RitualDeityType, markUsed: boolean) => {
            setWorld((prev) => {
              const curRoom = prev.rooms[room.id];
              if (!curRoom) return prev;
              return {
                ...prev,
                rooms: {
                  ...prev.rooms,
                  [room.id]: {
                    ...curRoom,
                    ritualCircles: {
                      ...(curRoom.ritualCircles || {}),
                      [coordKey]: { deityType: nextDeity, used: markUsed },
                    },
                    lootedCoords:
                      markUsed && !curRoom.lootedCoords.includes(coordKey)
                        ? [...curRoom.lootedCoords, coordKey]
                        : curRoom.lootedCoords,
                  },
                },
              };
            });
          };

          if (deityType === 'uninscribed') {
            const chalkCount = player.inventory.ritual_chalk || 0;
            if (chalkCount <= 0) {
              setInteractionMenu({
                title: 'VÒNG TRÒN ĐÁ TRỐNG',
                description:
                  'Phiến đá xám cổ xưa chưa khắc bất kỳ ấn ký thần linh nào. Bạn cần có [Phấn Khắc Ấn] trong túi đồ để vẽ biểu tượng vị thần lên đá trước khi hành lễ (có thể tìm trong Thùng tiếp tế hoặc mua từ Kẻ Buôn Lậu).',
                selectedIndex: 0,
                choices: [{ label: 'Rời đi (Chưa có Phấn Khắc Ấn)', onSelect: closePrompt }],
              });
              return;
            }
            const consumeChalkAndInscribe = (targetDeity: RitualDeityType, logMsg: string) => {
              setInteractionMenu(null);
              sfx.playSfx('ritual');
              setPlayer((prev) => ({
                ...prev,
                inventory: {
                  ...prev.inventory,
                  ritual_chalk: Math.max(0, (prev.inventory.ritual_chalk || 0) - 1),
                },
              }));
              updateCircleState(targetDeity, false);
              addLog(logMsg);
              setLogOverlayVisible(true);
            };

            setInteractionMenu({
              title: 'VÒNG TRÒN ĐÁ TRỐNG',
              description: `Phiến đá xám cổ xưa chưa khắc ấn ký (Đang có ${chalkCount} [Phấn Khắc Ấn]). Dùng 1 Phấn Khắc Ấn để vẽ biểu tượng — sau đó vòng tròn sẽ cố định vĩnh viễn vị thần đó và sẵn sàng hành lễ.`,
              selectedIndex: 0,
              choices: [
                {
                  label: '✏️ Dùng [Phấn Khắc Ấn] vẽ biểu tượng Thánh Mẫu',
                  onSelect: () => {
                    if (isHolyMotherBanned(player)) {
                      setInteractionMenu(null);
                      addLog(HOLY_MOTHER_REFUSAL_MSG);
                      setLogOverlayVisible(true);
                      return;
                    }
                    consumeChalkAndInscribe(
                      'holy_mother',
                      '✝️ Bạn dùng [Phấn Khắc Ấn] vẽ biểu tượng Thánh Mẫu lên mặt đá. Hãy nhấn [F] lần nữa để tiến hành nghi lễ cầu nguyện!'
                    );
                  },
                },
                {
                  label: '✏️ Dùng [Phấn Khắc Ấn] vẽ biểu tượng Huyết Quỷ',
                  onSelect: () => {
                    consumeChalkAndInscribe(
                      'demon_lord',
                      '🩸 Bạn dùng [Phấn Khắc Ấn] vẽ ấn ký Huyết Trận Huyết Quỷ lên mặt đá. Hãy nhấn [F] lần nữa để tiến hành nghi lễ!'
                    );
                  },
                },
                {
                  label: '✏️ Dùng [Phấn Khắc Ấn] vẽ biểu tượng Hư Vô',
                  onSelect: () => {
                    consumeChalkAndInscribe(
                      'void_god',
                      '🌌 Bạn dùng [Phấn Khắc Ấn] vẽ con mắt Ấn Trận Hư Vô lên mặt đá. Hãy nhấn [F] lần nữa để tiến hành nghi lễ!'
                    );
                  },
                },
                { label: 'Rời đi', onSelect: closePrompt },
              ],
            });
            return;
          }

          if (deityType === 'holy_mother') {
            if (isHolyMotherBanned(player)) {
              setInteractionMenu({
                title: 'TẾ ĐÀN THÁNH MẪU',
                description: HOLY_MOTHER_REFUSAL_MSG,
                selectedIndex: 0,
                choices: [{ label: 'Rời đi', onSelect: closePrompt }],
              });
              return;
            }
            setInteractionMenu({
              title: 'TẾ ĐÀN THÁNH MẪU',
              description:
                'Ánh sáng trắng bạc dịu nhẹ tỏa ra từ cổ ngữ Thánh Mẫu, xua tan bóng tối và chướng khí quanh đây.',
              selectedIndex: 0,
              choices: [
                {
                  label: '✝ Cầu nguyện thanh tẩy Lý Trí (+25 Lý Trí, -5 Tha Hóa)',
                  onSelect: () => {
                    setInteractionMenu(null);
                    sfx.playSfx('ritual');
                    updateCircleState('holy_mother', true);
                    setPlayer((prev) => ({
                      ...prev,
                      mind: Math.min(prev.maxMind, prev.mind + 25),
                      corruption: Math.max(0, prev.corruption - 5),
                    }));
                    addLog('✝️ Ánh sáng trắng dịu dàng gột rửa Lý Trí bạn giữa bóng tối.');
                    setLogOverlayVisible(true);
                  },
                },
                {
                  label: '✝ Dâng lời khấn cầu ban phước (+1 Tín Ngưỡng Thánh Mẫu)',
                  onSelect: () => {
                    setInteractionMenu(null);
                    sfx.playSfx('ritual');
                    updateCircleState('holy_mother', true);
                    let gained = false;
                    setPlayer((prev) => {
                      const next: PlayerState = JSON.parse(JSON.stringify(prev));
                      next.mind = Math.max(5, next.mind - 10);
                      gained = grantAffinityOnce(next, circleActionId, 'holyMother', 1);
                      return next;
                    });
                    addLog(
                      gained
                        ? '✝️ Lời cầu nguyện thanh sạch vang vọng: Thánh Mẫu hồi đáp bằng ánh hào quang ấm áp (+1 Tín Ngưỡng Thánh Mẫu).'
                        : '✝️ Lời cầu nguyện vang vọng giữa ánh sáng trắng dịu dàng.'
                    );
                    setLogOverlayVisible(true);
                  },
                },
                { label: 'Rời đi', onSelect: closePrompt },
              ],
            });
            return;
          }

          if (deityType === 'demon_lord') {
            const demonChoices: InteractionChoice[] = [
              {
                label: '🩸 Cắt máu hiến tế (-20 Sinh Lực, +15 Tha Hóa → +1 Huyết Quỷ & +15 Lý Trí)',
                onSelect: () => {
                  setInteractionMenu(null);
                  sfx.playSfx('ritual');
                  updateCircleState('demon_lord', true);
                  setPlayer((prev) => {
                    const next: PlayerState = JSON.parse(JSON.stringify(prev));
                    next.hp = Math.max(5, next.hp - 20);
                    next.mind = Math.min(next.maxMind, next.mind + 15);
                    banHolyMother(next);
                    grantAffinityOnce(next, circleActionId, 'demonicPact', 1);
                    syncCorruptionHolyBan(next);
                    return next;
                  });
                  addLog('🩸 Máu tươi thấm vào cổ ngữ đỏ thẫm, khế ước Huyết Quỷ âm thầm đáp lời.');
                  setLogOverlayVisible(true);
                },
              },
            ];

            player.party.forEach((ally, idx) => {
              if (ally.hp <= 0) return;
              demonChoices.push({
                label: `🩸 Hiến tế [${ally.name}] lên Huyết Trận Huyết Quỷ (+Huyết Quỷ, hồi đầy Sinh Lực & Lý Trí)`,
                onSelect: () => {
                  setInteractionMenu(null);
                  sfx.playSfx('ritual');
                  updateCircleState('demon_lord', true);
                  setPlayer((prev) => {
                    const next: PlayerState = JSON.parse(JSON.stringify(prev));
                    const targetAlly = next.party[idx];
                    if (targetAlly) {
                      leaveOrDismissPartyMember(next, idx, 'dead');
                    }
                    next.hp = next.maxHp;
                    next.mind = next.maxMind;
                    banHolyMother(next);
                    grantAffinityOnce(next, circleActionId, 'demonicPact', 1);
                    grantAffinityOnce(next, 'milestone_sacrifice_ally', 'demonicPact', 1);
                    syncCorruptionHolyBan(next);
                    return next;
                  });
                  setSelectedInvMemberIdx(0);
                  addLog(`🩸 Huyết Trận Huyết Quỷ nuốt trọn sinh linh của [${ally.name}], trả lại toàn bộ hành trang vào kho đồ.`);
                  setLogOverlayVisible(true);
                },
              });
            });

            demonChoices.push({ label: 'Rời đi', onSelect: closePrompt });
            setInteractionMenu({
              title: 'HUYẾT TRẬN HUYẾT QUỶ',
              description:
                'Mặt đá nhuốm đỏ rỉ ra hơi nóng tanh nồng. Chỉ máu thịt tự cắt hoặc hiến tế đồng đội/xác sống mới làm thỏa mãn vòng tròn này.',
              selectedIndex: 0,
              choices: demonChoices,
            });
            return;
          }

          if (deityType === 'void_god') {
            const voidChoices: InteractionChoice[] = [];
            if ((player.inventory.pure_soul_shard || 0) > 0) {
              voidChoices.push({
                label: '💎 Dâng hiến 1 [Mảnh Linh Hồn Thuần Khiết] cho Hư Vô (+Tín Ngưỡng Hư Vô & +2 Đá LH)',
                onSelect: () => {
                  setInteractionMenu(null);
                  sfx.playSfx('ritual');
                  updateCircleState('void_god', true);
                  setPlayer((prev) => {
                    const next: PlayerState = JSON.parse(JSON.stringify(prev));
                    next.inventory.pure_soul_shard = Math.max(0, (next.inventory.pure_soul_shard || 0) - 1);
                    next.energyStones += 2;
                    next.inventory.energy_stone = (next.inventory.energy_stone ?? next.energyStones - 2) + 2;
                    grantAffinityOnce(next, circleActionId, 'primordialVoid', 1);
                    grantAffinityOnce(next, 'milestone_void_offering', 'primordialVoid', 1);
                    return next;
                  });
                  addLog('🌌 Mảnh Linh Hồn tan chảy thành ánh tím sâu thẳm, ban tặng 2 Đá Linh Hồn Rỗng và tri thức Hư Vô.');
                  setLogOverlayVisible(true);
                },
              });
            }
            const relicOfferId = (['petrified_bone_shard', 'ancient_scroll', 'secret_archive_key'] as const).find(
              (id) => (player.inventory[id] || 0) > 0
            );
            if (relicOfferId) {
              const relicName = CONFIG.ITEMS[relicOfferId]?.name || 'Cổ Vật';
              voidChoices.push({
                label: `🏺 Dâng hiến 1 [${relicName}] vào Ấn Trận Hư Vô (+Tín Ngưỡng Hư Vô & +1 Thuốc An Thần)`,
                onSelect: () => {
                  setInteractionMenu(null);
                  sfx.playSfx('ritual');
                  updateCircleState('void_god', true);
                  setPlayer((prev) => {
                    const next: PlayerState = JSON.parse(JSON.stringify(prev));
                    next.inventory[relicOfferId] = Math.max(0, (next.inventory[relicOfferId] || 0) - 1);
                    next.inventory.purple_vial = (next.inventory.purple_vial || 0) + 1;
                    grantAffinityOnce(next, circleActionId, 'primordialVoid', 1);
                    grantAffinityOnce(next, 'milestone_void_offering', 'primordialVoid', 1);
                    return next;
                  });
                  addLog(`🌌 [${relicName}] tan biến vào vòng xoáy tím, mở rộng cộng hưởng Hư Vô.`);
                  setLogOverlayVisible(true);
                },
              });
            }
            if (player.readBookIds.length > 0) {
              const offeredBookId = player.readBookIds[player.readBookIds.length - 1];
              const offeredBookTitle = CONFIG.BOOKS.find((b) => b.id === offeredBookId)?.title || 'Sách Cổ';
              voidChoices.push({
                label: `📜 Dâng hiến tri thức Sách Cổ [${offeredBookTitle}] (+Tín Ngưỡng Hư Vô & +1 Đá LH)`,
                onSelect: () => {
                  setInteractionMenu(null);
                  sfx.playSfx('ritual');
                  updateCircleState('void_god', true);
                  setPlayer((prev) => {
                    const next: PlayerState = JSON.parse(JSON.stringify(prev));
                    next.readBookIds = next.readBookIds.filter((id) => id !== offeredBookId);
                    next.energyStones += 1;
                    next.inventory.energy_stone = (next.inventory.energy_stone ?? next.energyStones - 1) + 1;
                    grantAffinityOnce(next, circleActionId, 'primordialVoid', 1);
                    grantAffinityOnce(next, 'milestone_void_offering', 'primordialVoid', 1);
                    return next;
                  });
                  addLog(`🌌 Ký ức về trang Sách Cổ [${offeredBookTitle}] bị Hư Vô nuốt chửng, để lại một viên Đá Linh Hồn Rỗng lạnh buốt.`);
                  setLogOverlayVisible(true);
                },
              });
            }
            voidChoices.push({
              label: '🌌 Dâng Lý Trí khai mở Ấn Trận (-18 Lý Trí → +Tín Ngưỡng Hư Vô & +1 Đá LH)',
              onSelect: () => {
                setInteractionMenu(null);
                sfx.playSfx('ritual');
                updateCircleState('void_god', true);
                setPlayer((prev) => {
                  const next: PlayerState = JSON.parse(JSON.stringify(prev));
                  next.mind = Math.max(2, next.mind - 18);
                  next.energyStones += 1;
                  next.inventory.energy_stone = (next.inventory.energy_stone ?? next.energyStones - 1) + 1;
                  grantAffinityOnce(next, circleActionId, 'primordialVoid', 1);
                  grantAffinityOnce(next, 'milestone_void_offering', 'primordialVoid', 1);
                  return next;
                });
                addLog('🌌 Tiếng thì thầm từ Vực Sao vang lên trong đầu bạn, kết tinh thành một viên Đá Linh Hồn Rỗng.');
                setLogOverlayVisible(true);
              },
            });
            voidChoices.push({ label: 'Rời đi', onSelect: closePrompt });
            setInteractionMenu({
              title: 'ẤN TRẬN HƯ VÔ',
              description:
                'Cổ ngữ tím thẫm uốn lượn như con mắt không mí nhìn xuyên qua không gian, đòi hỏi Sách Cổ, Cổ Vật, Mảnh Linh Hồn hoặc tâm lực làm vật dẫn.',
              selectedIndex: 0,
              choices: voidChoices,
            });
            return;
          }
        }
      }

      if (tile === TILE.SHORTCUT_GATE && !room.shortcutOpened) {
        setInteractionMenu({
          title: 'CỔNG SẮT ĐƯỜNG TẮT',
          description:
            'Cánh cổng sắt nặng nề đang khóa chốt từ phía này. Mở chốt sẽ thông lối đi tắt vĩnh viễn.',
          selectedIndex: 0,
          choices: [
            {
              label: 'Gạt chốt sắt mở Cổng Đường Tắt',
              onSelect: () => {
                setInteractionMenu(null);
                setWorld((prev) => ({
                  ...prev,
                  rooms: {
                    ...prev.rooms,
                    [room.id]: {
                      ...room,
                      shortcutOpened: true,
                    },
                  },
                }));
                addLog('⚙️ Gạt chốt sắt: Cổng Sắt Đường Tắt đã mở toang!');
                setLogOverlayVisible(true);
              },
            },
            { label: 'Rời đi', onSelect: closePrompt },
          ],
        });
        return;
      }

      if (tile === TILE.HEXEN_ALTAR) {
        setInteractionMenu({
          title: 'ĐÀI CỘNG HƯỞNG',
          description: 'Đài đá khắc ấn ký cổ thần tỏa ra ánh sáng tím lạnh lẽo.',
          selectedIndex: 0,
          choices: [
            {
              label: 'Chạm vào Đài Cộng Hưởng',
              onSelect: () => {
                setInteractionMenu(null);
                setActiveModal('hexen');
              },
            },
            { label: 'Rời đi', onSelect: closePrompt },
          ],
        });
        return;
      }
    }

    // Check parked dismissed companions waiting near Đài Cộng Hưởng (Manhattan <= 1)
    const parkedSpots = getParkedCompanionSpots(room, player);
    for (const [dx, dy] of searchOffsets) {
      if (Math.abs(dx) + Math.abs(dy) > 1) continue;
      const sx = playerPos.x + dx;
      const sy = playerPos.y + dy;
      const parked = parkedSpots.find((p) => p.x === sx && p.y === sy);
      if (parked) {
        setInteractionMenu({
          title: `${parked.ally.name.toUpperCase()}`,
          description: `${parked.ally.name} đang kiên nhẫn chờ bạn bên cạnh ánh sáng Đài Cộng Hưởng (Sinh Lực ${parked.ally.hp}/${parked.ally.maxHp}, Lý Trí ${parked.ally.mind}/${parked.ally.maxMind}).`,
          selectedIndex: 0,
          choices: [
            {
              label: `🤝 Gọi [${parked.ally.name}] tái gia nhập đội hình`,
              onSelect: () => {
                setInteractionMenu(null);
                const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                const res = recallDismissedCompanion(pCopy, parked.ally.id);
                if (res.success) {
                  sfx.playHealOrChime();
                  setPlayer(pCopy);
                }
                addLog(res.message);
                setLogOverlayVisible(true);
              },
            },
            { label: 'Để họ nghỉ ngơi tiếp', onSelect: closePrompt },
          ],
        });
        return;
      }
    }

    // Check directly adjacent tiles (Manhattan <= 1) for Cracked Wall (explosive interaction unified on [F])
    for (const [dx, dy] of searchOffsets) {
      if (Math.abs(dx) + Math.abs(dy) > 1) continue;
      const nx = playerPos.x + dx;
      const ny = playerPos.y + dy;
      if (ny >= 0 && ny < roomH && nx >= 0 && nx < roomW) {
        if (room.grid[ny][nx] === TILE.CRACKED_WALL) {
          promptCrackedWallExplosion();
          return;
        }
      }
    }

    // Check Escape / Personal Ending gate in F2_EXTERIOR across all 3 canon characters
    const child13AliveInParty = player.party.some((a) => a.id === 'child_13' && a.hp > 0);
    const knightGateOk =
      player.classId === 'fallen_knight' &&
      player.corruption < 30 &&
      Boolean(player.questFlags?.vaelisTalked) &&
      Boolean(player.questFlags?.vaelisDefeated) &&
      player.readBookIds.length >= 3;
    const nunGateOk =
      player.classId === 'forsaken_nun' &&
      player.corruption < 15 &&
      Boolean(player.questFlags?.child13Rescued) &&
      child13AliveInParty &&
      player.readBookIds.length >= 3;
    const hunterGateOk =
      player.classId === 'night_hunter' &&
      Boolean(player.questFlags?.curedPetrification && player.questFlags?.vaelisDefeated);
    if (room.id === 'F2_EXTERIOR' && (knightGateOk || nunGateOk || hunterGateOk)) {
      setInteractionMenu({
        title: 'MỤC TIÊU CÁ NHÂN & VẬN MỆNH THUNG LŨNG',
        description: knightGateOk
          ? 'Lời thề Kỵ Đoàn đã tròn. Bạn có thể ở lại Thung Lũng dựng bia mộ đồng đội ngay lúc này, hoặc quay xuống Vết Rách Tầng 3 để định đoạt vận mệnh thế giới.'
          : 'Kết Giới Chướng Khí nơi Cổng Sắt Ngoại Vi đã suy yếu. Bạn đã hoàn thành mục tiêu cá nhân và có thể rời khỏi Thung Lũng Xương Tàn ngay, hoặc tiếp tục xuống Vết Rách Tầng 3 định đoạt thế giới.',
        selectedIndex: 0,
        choices: [
          {
            label: knightGateOk
              ? '🏆 Hoàn Thành Mục Tiêu Cá Nhân: Ở lại Dựng Bia Mộ Kỵ Đoàn (S-Ending)'
              : '🏆 Hoàn Thành Mục Tiêu Cá Nhân: Mở Cổng Sắt Rời Thung Lũng (S-Ending)',
            onSelect: () => {
              setInteractionMenu(null);
              const outEnding = evaluateCanonEnding({
                classId: player.classId,
                corruption: player.corruption,
                holyMotherBanned: isHolyMotherBanned(player),
                readBookIds: player.readBookIds,
                inventory: player.inventory,
                learnedSkillIds: Object.keys(player.skillLevels),
                vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
                vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
                curedPetrification: Boolean(player.questFlags?.curedPetrification),
                child13Rescued: Boolean(player.questFlags?.child13Rescued),
                child13InParty: child13AliveInParty,
                endingAction: knightGateOk ? 'STAY_BUILD_GRAVES' : 'ESCAPE_EXTERIOR_GATE',
              });
              setEndingInfo(outEnding);
              setScreen('ending');
            },
          },
          {
            label: '🌌 Tiếp Tục Xuống Vết Rách Định Đoạt Thế Giới (World Endings)',
            onSelect: () => {
              closePrompt();
              addLog('🌌 Bạn chọn ở lại để tiếp tục tiến xuống Vết Rách Tầng 3 định đoạt vận mệnh thế giới.');
              setLogOverlayVisible(true);
            },
          },
        ],
      });
      return;
    }

    if (logOverlayVisible) {
      setLogOverlayVisible(false);
      return;
    }

    addLog('Không có đối tượng tương tác ngay sát bên cạnh.');
    setLogOverlayVisible(true);
  }, [
    screen,
    activeModal,
    coinToss,
    interactionMenu,
    logOverlayVisible,
    world,
    playerPos,
    player,
    addLog,
    triggerCoinToss,
    promptCrackedWallExplosion,
    openNpcRpgDialogue,
    activeActorIdx,
    player.party,
  ]);

  // Autonomous AI Enemy Game Loop (~400ms tick) — decoupled from player keydown events
  const canRunAiTick =
    !inCombat &&
    screen === 'playing' &&
    !isInputLocked &&
    !activeModal &&
    !coinToss &&
    !interactionMenu;

  useEffect(() => {
    if (!canRunAiTick) return;

    const tickId = window.setInterval(() => {
      if (isInputLockedRef.current) return;
      const curWorld = worldRef.current;
      const curRoom = curWorld.rooms[curWorld.currentRoomId];
      if (!curRoom) return;
      const curPlayerPos = playerPosRef.current;
      const curPlayer = playerRef.current;

      // Immediate Manhattan <= 1 check before advancing AI tick
      const adjacentChaser = curRoom.enemies.find((e) => {
        if (e.defeated || e.isFloorBoss || e.isTutorialGatekeeper) return false;
        if (e.aiState !== 'chase' || (e.eatTicksRemaining || 0) > 0) return false;
        return Math.abs(e.x - curPlayerPos.x) + Math.abs(e.y - curPlayerPos.y) <= 1;
      });

      if (adjacentChaser) {
        isInputLockedRef.current = true;
        setIsInputLocked(true);
        triggerCombat(adjacentChaser);
        return;
      }

      const tickResult = advanceRoomEnemiesOneTurn(
        curRoom,
        curPlayerPos,
        curPlayer.equippedBody,
        (curPlayer.stealthStepsTurns || 0) > 0
      );

      setWorld((prev) => {
        const latestRoom = prev.rooms[curRoom.id];
        if (!latestRoom) return prev;
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [curRoom.id]: {
              ...latestRoom,
              enemies: tickResult.enemies,
              decoys: tickResult.decoys,
            },
          },
        };
      });

      if (tickResult.collidedEnemy) {
        isInputLockedRef.current = true;
        setIsInputLocked(true);
        triggerCombat(tickResult.collidedEnemy);
      }
    }, 400);

    return () => window.clearInterval(tickId);
  }, [canRunAiTick, triggerCombat]);

  // Grid Step Movement with STEP_COOLDOWN = 220ms & Hunger Loop (decoupled from enemy AI tick)
  const attemptMove = useCallback(
    (dx: number, dy: number) => {
      if (
        inCombat ||
        screen !== 'playing' ||
        isInputLocked ||
        isInputLockedRef.current ||
        activeModal ||
        coinToss ||
        interactionMenu
      ) {
        return;
      }
      if (logOverlayVisible) {
        setLogOverlayVisible(false);
      }
      const now = performance.now();
      const cooldown = getPlayerStepCooldownMs(player);
      if (now - lastStepTime < cooldown) return;

      const room = world.rooms[world.currentRoomId];

      // Immediate combat lock if a chasing enemy is already adjacent (Manhattan <= 1) and not eating decoy
      const pinningChaser = room.enemies.find((e) => {
        if (e.defeated || e.isFloorBoss || e.isTutorialGatekeeper) return false;
        if (e.aiState !== 'chase' || (e.eatTicksRemaining || 0) > 0) return false;
        return Math.abs(e.x - playerPos.x) + Math.abs(e.y - playerPos.y) <= 1;
      });
      if (pinningChaser) {
        isInputLockedRef.current = true;
        setIsInputLocked(true);
        setLastStepTime(now);
        triggerCombat(pinningChaser);
        return;
      }

      const roomW = room.width || room.grid[0]?.length || CONFIG.GRID_W;
      const roomH = room.height || room.grid.length || CONFIG.GRID_H;
      const nx = playerPos.x + dx;
      const ny = playerPos.y + dy;
      if (nx < 0 || nx >= roomW || ny < 0 || ny >= roomH) return;

      const targetTile = room.grid[ny][nx];
      if (!isWalkableTile(targetTile, room.shortcutOpened)) {
        return;
      }

      // Check enemy collision at (nx, ny) (including 3x3 Floor Boss footprint)
      const hitEnemy = room.enemies.find((e) => {
        if (e.defeated) return false;
        if (e.isFloorBoss) {
          return Math.abs(e.x - nx) <= 1 && Math.abs(e.y - ny) <= 1;
        }
        return e.x === nx && e.y === ny;
      });
      if (hitEnemy) {
        setLastStepTime(now);
        startCombatWithEnemy(hitEnemy);
        return;
      }

      // Check Portal / Stairs Transition
      if (targetTile === TILE.PORTAL_NEXT) {
        if (room.id === 'F2_EXTERIOR') {
          setLastStepTime(now);
          movePlayerToRoom('F2_R0', 'spawn');
          return;
        }
        const nextId = `F${room.floor}_R${room.roomIndex + 1}`;
        if (world.rooms[nextId]) {
          setLastStepTime(now);
          movePlayerToRoom(nextId, 'spawn');
          return;
        }
      }

      if (targetTile === TILE.PORTAL_PREV) {
        if (room.id === 'F2_R0') {
          setLastStepTime(now);
          movePlayerToRoom('F2_EXTERIOR', 'exit');
          return;
        }
        const prevId = `F${room.floor}_R${room.roomIndex - 1}`;
        if (world.rooms[prevId]) {
          setLastStepTime(now);
          movePlayerToRoom(prevId, 'exit');
          return;
        }
      }

      if (targetTile === TILE.STAIRS_DOWN) {
        const destId = room.floor === 2 ? 'F3_R0' : 'F2_R1';
        if (world.rooms[destId]) {
          setLastStepTime(now);
          movePlayerToRoom(destId, 'spawn');
          return;
        }
      }

      if (targetTile === TILE.STAIRS_UP) {
        const destId = room.floor === 3 ? 'F2_R3' : room.floor === 2 ? 'F1_R0' : 'F2_R1';
        if (world.rooms[destId]) {
          setLastStepTime(now);
          movePlayerToRoom(destId, 'spawn');
          return;
        }
      }

      // Normal step + Hunger Loop (+2 Hunger every 5 steps, -3 HP if Hunger >= 80)
      sfx.playStep();
      setLastStepTime(now);

      const nextSteps = player.stats.stepsTaken + 1;
      const nextHunger = Math.min(100, player.hunger + (nextSteps % 5 === 0 ? 2 : 0));
      let nextHp = player.hp;
      let nextMind = player.mind;
      let nextCor = player.corruption;

      if (nextHunger >= 80) {
        nextHp = Math.max(0, nextHp - 3);
        addLog('🥀 Cơn Đói Cực Hạn rút cạn 3 Sinh Lực mỗi bước chân!');
      }

      // Step hazard: MIASMA_VENT deals -3 Lý Trí, +2 Tha Hóa scaled by Floor 3 Void Miasma resistance
      if (targetTile === TILE.MIASMA_VENT) {
        const immuneMiasma =
          player.equippedHead === 'beak_mask' || player.equippedBody === 'star_pelt_coat';
        const miasmaMult = getFloor3MiasmaMultiplier(player);
        if (immuneMiasma || miasmaMult <= 0) {
          addLog('🦅 Cộng hưởng Hư Vô hoặc Trang bị kháng Chướng Khí giúp bạn bước qua Khe Nứt mà không mất Lý Trí!');
        } else {
          const mindLoss = Math.max(1, Math.round(3 * miasmaMult));
          const corGain = Math.max(1, Math.round(2 * miasmaMult));
          nextMind = Math.max(0, nextMind - mindLoss);
          nextCor = Math.min(100, nextCor + corGain);
          addLog('🌫️ Khói tím chướng khí tràn vào buồng phổi, bào mòn Lý Trí!');
        }
      }

      const nextStealth = Math.max(0, (player.stealthStepsTurns || 0) - 1);
      if ((player.stealthStepsTurns || 0) > 0 && nextStealth === 0) {
        addLog('🌑 Lớp sương ẩn thân [Bước Chân Bóng Tối] đã tan biến.');
      }

      const updatedPlayer: PlayerState = {
        ...player,
        hp: nextHp,
        mind: nextMind,
        corruption: nextCor,
        hunger: nextHunger,
        stealthStepsTurns: nextStealth,
        stats: {
          ...player.stats,
          stepsTaken: nextSteps,
        },
      };
      syncCorruptionHolyBan(updatedPlayer);

      setPlayerPos({ x: nx, y: ny });
      setTrailCoords((prev) => [{ x: playerPos.x, y: playerPos.y }, ...prev].slice(0, 4));
      setPlayer(updatedPlayer);

      const stepCoordKey = `${nx},${ny}`;
      const isFloorTrapTriggered =
        targetTile === TILE.FLOOR_TRAP && !room.lootedCoords.includes(stepCoordKey);

      // Check immediately after player's step if any chasing enemy is now at Manhattan <= 1
      const adjacentChaserAfterStep =
        updatedPlayer.hp > 0
          ? room.enemies.find((e) => {
              if (e.defeated || e.isFloorBoss || e.isTutorialGatekeeper) return false;
              if (e.aiState !== 'chase' || (e.eatTicksRemaining || 0) > 0) return false;
              return Math.abs(e.x - nx) + Math.abs(e.y - ny) <= 1;
            })
          : undefined;

      if (isFloorTrapTriggered) {
        setWorld((prev) => {
          const curRoom = prev.rooms[room.id];
          if (!curRoom) return prev;
          return {
            ...prev,
            rooms: {
              ...prev.rooms,
              [room.id]: {
                ...curRoom,
                lootedCoords: [...curRoom.lootedCoords, stepCoordKey],
              },
            },
          };
        });
      }

      if (updatedPlayer.hp <= 0) {
        const nextRandomSeed = generateRandomSeed();
        setSeedInput(nextRandomSeed);
        setEndingInfo({
          id: 'STARVED_IN_DARKNESS',
          title: 'XÁC KHÔ GIỮA ĐẠI GIÁO ĐƯỜNG',
          subtitle: `Gục ngã bởi Cơn Đói và Vết Thương • Seed mới tiếp theo: ${nextRandomSeed}`,
          epilogue:
            'Không còn chút sức lực nào, bạn gục xuống nền đá lạnh lẽo của Thung Lũng Xương Tàn. Định mệnh đã xoay chuyển sang một Hạt Giống (Seed) ngẫu nhiên mới, trừ khi bạn tải lại ký ức đã lưu.',
        });
        setScreen('ending');
        return;
      }

      // Immediate combat lock if player stepped next to a chaser (distance <= 1)
      if (adjacentChaserAfterStep) {
        isInputLockedRef.current = true;
        setIsInputLocked(true);
        triggerCombat(adjacentChaserAfterStep);
        return;
      }

      // Step hazard: FLOOR_TRAP inflicts immediate brutal damage + bleeding + mind shock (true Fear & Hunger trap!)
      if (isFloorTrapTriggered) {
        sfx.playSfx('hurt');
        setPlayer((prev) => {
          const nextHp = Math.max(1, prev.hp - 22);
          const nextMind = Math.max(0, prev.mind - 6);
          return {
            ...prev,
            hp: nextHp,
            mind: nextMind,
            statuses: {
              ...prev.statuses,
              bleeding: (prev.statuses.bleedImmunityTurns || 0) > 0 ? prev.statuses.bleeding : true,
            },
          };
        });
        addLog(
          '🩸⚙️ BẪY CHÔNG BẬT MẠNH! Răng sắt gỉ sét ngoạm sâu vào bắp chân (-22 Sinh Lực, -6 Lý Trí, Chảy Máu)!'
        );
        setLogOverlayVisible(true);
        return;
      }
    },
    [
      inCombat,
      screen,
      isInputLocked,
      activeModal,
      coinToss,
      interactionMenu,
      logOverlayVisible,
      player,
      playerPos,
      lastStepTime,
      world,
      addLog,
      startCombatWithEnemy,
      triggerCombat,
      movePlayerToRoom,
      generateRandomSeed,
      triggerCoinToss,
    ]
  );

  // Execute sequential per-member combat action with dark-fantasy pacing (Hitstop + VFX + Sequential Ally/Enemy Beats)
  const runCombatTurn = useCallback(
    async (
      action: CombatActionType,
      opts?: { limbId?: string; skillId?: string; itemId?: string }
    ) => {
      if (!activeCombatEnemy || isResolvingTurnRef.current) return;
      isResolvingTurnRef.current = true;
      setIsResolvingTurn(true);
      const turnRunId = combatAbortRef.current;

      const syncCombatState = (
        pState: PlayerState,
        eState: MapEnemyInstance,
        newLogs: string[]
      ) => {
        setPlayer(pState);
        setWorld((prev) => {
          const curRoom = prev.rooms[currentRoom.id];
          if (!curRoom) return prev;
          return {
            ...prev,
            rooms: {
              ...prev.rooms,
              [currentRoom.id]: {
                ...curRoom,
                enemies: curRoom.enemies.map((e) => (e.uid === eState.uid ? eState : e)),
              },
            },
          };
        });
        if (newLogs.length > 0) {
          setCombatLogs((prev) => [...newLogs.slice().reverse(), ...prev.slice(0, 18)]);
        }
      };

      try {
        let pCur = player;
        let eCur = activeCombatEnemy;
        let lastTargetLimb = opts?.limbId || selectedLimbId;
        let finalEndingTrigger: ReturnType<CombatEngine['executeActorTurn']>['endingTrigger'] = undefined;
        let fledBattle = false;

        // 1. Execute action for current actor (activeActorIdx)
        const outcome = combatEngineRef.current.executeActorTurn(
          pCur,
          eCur,
          world.seed,
          activeActorIdx,
          action,
          selectedLimbId,
          opts
        );
        pCur = outcome.updatedPlayer;
        eCur = outcome.updatedEnemy;
        if (outcome.result.targetLimbId) lastTargetLimb = outcome.result.targetLimbId;
        if (outcome.result.fledSuccess) fledBattle = true;
        if (outcome.endingTrigger) finalEndingTrigger = outcome.endingTrigger;

        const isOffensiveAction =
          action === 'ATTACK' ||
          action === 'SKILL' ||
          (action === 'ITEM' && (outcome.result.lastDealtDmg || 0) > 0);
        if (isOffensiveAction) {
          sfx.playSfx(outcome.result.weaponCategory || 'unarmed');
          if (outcome.result.severedAnyLimb) sfx.playSfx('sever_limb');
          const isHeavyStrike =
            Boolean(outcome.result.wasCrit) ||
            (outcome.result.lastDealtDmg || 0) > 500 ||
            outcome.result.weaponCategory === 'heavy_axe';
          triggerCombatVfx(
            outcome.result.weaponCategory || 'sword',
            outcome.result.vfxColor || '#e2e8f0',
            isHeavyStrike
          );
        } else if (action === 'ITEM' || action === 'GUARD') {
          sfx.playSfx('ui_confirm');
        }

        const persistedInitEnemy: MapEnemyInstance = fledBattle
          ? {
              ...eCur,
              aiState: 'deagro',
              questionTimerMs: 4000,
              alertTimerMs: 0,
              loseSightTimerMs: 0,
              moveCooldownMs: 1800,
            }
          : eCur;

        syncCombatState(pCur, persistedInitEnemy, outcome.result.logs);
        setFocusedLimbId(null);
        setCombatMenuMode('main');
        setCombatFocusPhase('action');
        setPendingSkillId(null);

        // Advance reticle early if limb severed during actor strike
        const initTargetAfter = eCur.limbs.find((l) => l.id === lastTargetLimb);
        if (!initTargetAfter || initTargetAfter.hp <= 0) {
          const nextIntact =
            eCur.limbs.find((l) => l.id === 'torso' && l.hp > 0) ||
            eCur.limbs.find((l) => l.hp > 0);
          if (nextIntact) setSelectedLimbId(nextIntact.id);
        } else if (lastTargetLimb && lastTargetLimb !== selectedLimbId) {
          setSelectedLimbId(lastTargetLimb);
        }

        if (fledBattle) {
          await sleepCombatStep(350);
          if (combatAbortRef.current !== turnRunId) return;
          handleCombatEnd({ fled: true });
          addLog('🏃 Cả đội đã thoát khỏi cuộc giao tranh trong gang tấc.');
          return;
        }

        if (isOffensiveAction) {
          await sleepCombatStep(660);
        } else {
          await sleepCombatStep(340);
        }
        if (combatAbortRef.current !== turnRunId) return;

        // 2. If still in battle, sequentially resolve any panicking / stunned living allies following activeActorIdx
        let nextControllableActor: number | null = null;
        if (!finalEndingTrigger && !eCur.defeated) {
          let probeIdx = activeActorIdx + 1;
          while (probeIdx <= pCur.party.length) {
            const ally = pCur.party[probeIdx - 1];
            if (!ally || ally.hp <= 0) {
              probeIdx++;
              continue;
            }
            const mustAuto = ally.mind < 30 || (ally.stunnedTurns || 0) > 0;
            if (!mustAuto) {
              nextControllableActor = probeIdx;
              break;
            }
            setActiveActorIdx(probeIdx);
            const autoOut = combatEngineRef.current.executeActorTurn(
              pCur,
              eCur,
              world.seed,
              probeIdx,
              'ATTACK',
              lastTargetLimb
            );
            pCur = autoOut.updatedPlayer;
            eCur = autoOut.updatedEnemy;
            if ((autoOut.result.lastDealtDmg || 0) > 0) {
              sfx.playSfx(autoOut.result.weaponCategory || 'unarmed');
              if (autoOut.result.severedAnyLimb) sfx.playSfx('sever_limb');
              triggerCombatVfx(
                autoOut.result.weaponCategory || 'sword',
                autoOut.result.vfxColor || '#e2e8f0',
                Boolean(autoOut.result.wasCrit) || (autoOut.result.lastDealtDmg || 0) > 500
              );
            }
            syncCombatState(pCur, eCur, autoOut.result.logs);
            if (autoOut.endingTrigger) {
              finalEndingTrigger = autoOut.endingTrigger;
              break;
            }
            if (eCur.defeated) break;
            await sleepCombatStep(660);
            if (combatAbortRef.current !== turnRunId) return;
            probeIdx++;
          }

          // 3. If no more sane allies remain in this round, resolve Enemy Round after rhythmic beat and wrap back to Actor 0
          if (nextControllableActor === null && !eCur.defeated && !finalEndingTrigger) {
            const enemyRound = combatEngineRef.current.resolveEnemyRound(pCur, eCur, world.seed);
            pCur = enemyRound.updatedPlayer;
            eCur = enemyRound.updatedEnemy;
            if (enemyRound.endingTrigger) finalEndingTrigger = enemyRound.endingTrigger;
            if ((enemyRound.result.lastTakenDmg || 0) > 0) {
              sfx.playSfx('hurt');
              triggerCombatVfx(
                enemyRound.result.weaponCategory || 'unarmed',
                enemyRound.result.vfxColor || '#dc2626',
                Boolean(enemyRound.result.wasCrit) || (enemyRound.result.lastTakenDmg || 0) > 35
              );
            }
            syncCombatState(pCur, eCur, enemyRound.result.logs);
            await sleepCombatStep(700);
            if (combatAbortRef.current !== turnRunId) return;

            if (enemyRound.result.pendingCoinFlip && !finalEndingTrigger) {
              const cf = enemyRound.result.pendingCoinFlip;
              const enemySnapshot: MapEnemyInstance = JSON.parse(JSON.stringify(eCur));
              const playerSnapshot: PlayerState = JSON.parse(JSON.stringify(pCur));
              const tpl = CONFIG.ENEMIES[enemySnapshot.templateId] || CONFIG.ENEMIES.fanatic_zealot;

              triggerCoinToss(
                `NÉ ĐÒN TỬ THẦN: ${cf.skillName.toUpperCase()}`,
                cf.telegraphText,
                (won) => {
                  const pAfter: PlayerState = JSON.parse(JSON.stringify(playerSnapshot));
                  const eAfter: MapEnemyInstance = JSON.parse(JSON.stringify(enemySnapshot));
                  const cfRng = new SeededRNG(`${world.seed}_combat_cf_${eAfter.uid}_${eAfter.turnCount}_${Date.now()}`);
                  const cfRes = resolveCombatCoinFlipOutcome(
                    pAfter,
                    eAfter,
                    tpl,
                    won,
                    cf.penaltyType,
                    cf.damageMultiplier,
                    cfRng
                  );
                  if ((cfRes.lastTakenDmg || 0) > 0) {
                    sfx.playSfx('hurt');
                    if (cf.penaltyType === 'sever_limb') sfx.playSfx('sever_limb');
                    triggerCombatVfx(
                      cfRes.weaponCategory || 'heavy_axe',
                      cfRes.vfxColor || '#dc2626',
                      true
                    );
                  } else {
                    sfx.playSfx('ui_confirm');
                  }
                  syncCombatState(pAfter, eAfter, cfRes.logs);
                  if (cfRes.playerDefeated) {
                    const nextRandomSeed = generateRandomSeed();
                    setSeedInput(nextRandomSeed);
                    setEndingInfo({
                      id: 'SLAIN_IN_COMBAT',
                      title: 'MÁU NHUỘM ĐẠI GIÁO ĐƯỜNG GOETHE',
                      subtitle: `Gục Ngã Trước Đòn Tử Thần • Seed ngẫu nhiên mới: ${nextRandomSeed}`,
                      epilogue:
                        'Đòn đánh báo trước mang tính hủy diệt đã kết thúc hành trình của bạn giữa bóng tối. Hãy tải lại Bản Lưu hoặc thử thách một Seed mới.',
                    });
                    handleCombatEnd({ nextScreen: 'ending' });
                    return;
                  }
                  setActiveActorIdx(0);
                  setCombatActionCursor(0);
                  setCombatFocusPhase('action');
                  setPendingSkillId(null);
                }
              );
              return;
            }

            nextControllableActor = 0;
          }
        }

        if (nextControllableActor !== null) {
          setActiveActorIdx(nextControllableActor);
          const nextAlly = nextControllableActor > 0 ? pCur.party[nextControllableActor - 1] || null : null;
          setCombatActionCursor(nextAlly && isPureTankSummon(nextAlly) ? 2 : 0);
          setCombatFocusPhase('action');
          setPendingSkillId(null);
        }

        const activeTargetAfter = eCur.limbs.find((l) => l.id === lastTargetLimb);
        if (!activeTargetAfter || activeTargetAfter.hp <= 0) {
          const nextIntact =
            eCur.limbs.find((l) => l.id === 'torso' && l.hp > 0) ||
            eCur.limbs.find((l) => l.hp > 0);
          if (nextIntact) setSelectedLimbId(nextIntact.id);
        } else if (lastTargetLimb && lastTargetLimb !== selectedLimbId) {
          setSelectedLimbId(lastTargetLimb);
        }

        if (finalEndingTrigger) {
          if (finalEndingTrigger.id === 'VAELIS_CLIMAX_CHOICE') {
            handleCombatEnd({ defeatedEnemyUid: eCur.uid });
            openNpcRpgDialogue('vaelis_climax');
            return;
          }
          if (finalEndingTrigger.id === 'SLAIN_IN_COMBAT') {
            const nextRandomSeed = generateRandomSeed();
            setSeedInput(nextRandomSeed);
            setEndingInfo({
              ...finalEndingTrigger,
              subtitle: `Sinh Lực Cạn Kiệt • Seed ngẫu nhiên mới: ${nextRandomSeed}`,
            });
          } else {
            setEndingInfo(finalEndingTrigger);
          }
          handleCombatEnd({ nextScreen: 'ending' });
        }
      } catch (err) {
        console.error('Combat turn execution error:', err);
        setCombatLogs((prev) => ['⚡ Đòn kỹ năng va chạm dữ dội trong bóng tối!', ...prev]);
      } finally {
        isResolvingTurnRef.current = false;
        setIsResolvingTurn(false);
      }
    },
    [
      activeCombatEnemy,
      activeActorIdx,
      player,
      world.seed,
      selectedLimbId,
      currentRoom,
      addLog,
      handleCombatEnd,
      generateRandomSeed,
      openNpcRpgDialogue,
      triggerCombatVfx,
      sleepCombatStep,
    ]
  );

  // Keyboard Controls (Exploration + 100% Keyboard-Driven 2-Step Combat + Settings [ESC])
  useEffect(() => {
    const SELF_UTILITY_SKILLS = new Set([
      'blessed_heal',
      'divine_aegis',
      'purification',
      'blood_pact',
      'veil_of_blindness',
      'necromancy',
    ]);

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (coinToss) {
        const cKey = e.key.toLowerCase();
        if (
          !coinToss.isPanicAuto &&
          !coinToss.chosenSide &&
          !coinToss.flipping &&
          !coinToss.resultSide
        ) {
          if (cKey === 'a' || cKey === 'w' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === '1' || e.code === 'Digit1') {
            e.preventDefault();
            handleChooseCoinSide('HEADS', e.shiftKey || shiftHeld);
            return;
          }
          if (cKey === 'd' || cKey === 's' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === '2' || e.code === 'Digit2') {
            e.preventDefault();
            handleChooseCoinSide('TAILS', e.shiftKey || shiftHeld);
            return;
          }
        }
        if (
          coinToss.outcomeText !== null &&
          (e.key === 'Enter' || cKey === 'f' || e.key === ' ')
        ) {
          e.preventDefault();
          confirmCoinTossOutcome();
          return;
        }
        return;
      }

      // Victory screen keyboard confirmation in Combat
      if (screen === 'combat' && activeCombatEnemy?.defeated && !activeModal) {
        if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'f') {
          e.preventDefault();
          sfx.playSfx('ui_confirm');
          handleCombatEnd({ defeatedEnemyUid: activeCombatEnemy.uid });
        }
        return;
      }

      // 100% Keyboard-Driven 2-Step Combat Controls
      if (
        screen === 'combat' &&
        activeCombatEnemy &&
        !activeCombatEnemy.defeated &&
        !activeModal &&
        !isResolvingTurnRef.current
      ) {
        const key = e.key.toLowerCase();
        const tpl = CONFIG.ENEMIES[activeCombatEnemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
        const reticleMap = getLimbReticlePositions(tpl.spriteKey);
        const aliveLimbs = activeCombatEnemy.limbs.filter((l) => l.hp > 0);
        if (aliveLimbs.length === 0) return;

        const snapLimbFocus = () => {
          const curAlive = aliveLimbs.find((l) => l.id === selectedLimbId);
          const nextLimb =
            (curAlive && canTargetEnemyLimb(activeCombatEnemy, tpl, curAlive.id).allowed
              ? curAlive
              : null) ||
            aliveLimbs.find((l) => canTargetEnemyLimb(activeCombatEnemy, tpl, l.id).allowed) ||
            curAlive ||
            aliveLimbs[0];
          if (nextLimb) {
            setSelectedLimbId(nextLimb.id);
            setFocusedLimbId(nextLimb.id);
          }
        };

        const activeAllyForKeys = activeActorIdx > 0 ? player.party[activeActorIdx - 1] || null : null;
        const isPureTankKeyTurn = Boolean(activeAllyForKeys && isPureTankSummon(activeAllyForKeys));
        const activeSkillIds = activeAllyForKeys
          ? getAllyAvailableSkills(activeAllyForKeys)
          : Object.entries(player.skillLevels)
              .filter(([, lv]) => lv > 0)
              .map(([id]) => id);
        const usableItems = Object.entries(player.inventory).filter(
          ([itemId, count]) => count > 0 && CONFIG.ITEMS[itemId]?.combatUsable
        );
        const maxActionIdx = activeActorIdx === 0 ? 5 : 3;

        // ESC / Backspace cancels Step 2 or Sub-Menus cleanly back to Action Dock
        if (key === 'escape' || e.key === 'Backspace') {
          e.preventDefault();
          sfx.playSfx('ui_move');
          if (combatFocusPhase === 'limb') {
            setFocusedLimbId(null);
            if (pendingSkillId) {
              setPendingSkillId(null);
              setCombatMenuMode('skills');
              setCombatFocusPhase('skills_menu');
            } else {
              setCombatFocusPhase('action');
            }
          } else if (combatFocusPhase === 'skills_menu' || combatFocusPhase === 'items_menu') {
            setCombatMenuMode('main');
            setCombatFocusPhase('action');
          }
          return;
        }

        // Number Hotkeys 1..6 for fast action selection
        if (e.key === '1' && !isPureTankKeyTurn) {
          e.preventDefault();
          sfx.playSfx('ui_confirm');
          setCombatActionCursor(0);
          setPendingSkillId(null);
          setCombatMenuMode('main');
          snapLimbFocus();
          setCombatFocusPhase('limb');
          return;
        }
        if (e.key === '2' && activeSkillIds.length > 0) {
          e.preventDefault();
          sfx.playSfx('ui_confirm');
          setCombatActionCursor(1);
          setCombatSubCursor(0);
          setCombatMenuMode('skills');
          setCombatFocusPhase('skills_menu');
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          setCombatActionCursor(2);
          setCombatMenuMode('main');
          runCombatTurn('GUARD');
          return;
        }
        if (e.key === '4' && usableItems.length > 0) {
          e.preventDefault();
          sfx.playSfx('ui_confirm');
          setCombatActionCursor(3);
          setCombatSubCursor(0);
          setCombatMenuMode('items');
          setCombatFocusPhase('items_menu');
          return;
        }
        if (e.key === '5' && activeActorIdx === 0) {
          e.preventDefault();
          setCombatActionCursor(4);
          setCombatMenuMode('main');
          runCombatTurn('TALK');
          return;
        }
        if (e.key === '6' && activeActorIdx === 0) {
          e.preventDefault();
          setCombatActionCursor(5);
          setCombatMenuMode('main');
          runCombatTurn('FLEE');
          return;
        }

        // PHASE 1: Left Action Dock Navigation
        if (combatFocusPhase === 'action') {
          if (key === 'w' || e.key === 'ArrowUp') {
            e.preventDefault();
            sfx.playSfx('ui_move');
            setCombatActionCursor((c) => {
              let next = (c - 1 + maxActionIdx + 1) % (maxActionIdx + 1);
              if (isPureTankKeyTurn && next === 0) next = maxActionIdx;
              return next;
            });
            return;
          }
          if (key === 's' || e.key === 'ArrowDown') {
            e.preventDefault();
            sfx.playSfx('ui_move');
            setCombatActionCursor((c) => {
              let next = (c + 1) % (maxActionIdx + 1);
              if (isPureTankKeyTurn && next === 0) next = 1;
              return next;
            });
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (combatActionCursor === 0 && !isPureTankKeyTurn) {
              sfx.playSfx('ui_confirm');
              setPendingSkillId(null);
              setCombatMenuMode('main');
              snapLimbFocus();
              setCombatFocusPhase('limb');
            } else if (combatActionCursor === 1) {
              if (activeSkillIds.length === 0) return;
              sfx.playSfx('ui_confirm');
              setCombatSubCursor(0);
              setCombatMenuMode('skills');
              setCombatFocusPhase('skills_menu');
            } else if (combatActionCursor === 2) {
              setCombatMenuMode('main');
              runCombatTurn('GUARD');
            } else if (combatActionCursor === 3) {
              if (usableItems.length === 0) return;
              sfx.playSfx('ui_confirm');
              setCombatSubCursor(0);
              setCombatMenuMode('items');
              setCombatFocusPhase('items_menu');
            } else if (combatActionCursor === 4 && activeActorIdx === 0) {
              runCombatTurn('TALK');
            } else if (combatActionCursor === 5 && activeActorIdx === 0) {
              runCombatTurn('FLEE');
            }
            return;
          }
          return;
        }

        // PHASE 1B: Skills Sub-Menu Navigation
        if (combatFocusPhase === 'skills_menu') {
          if (activeSkillIds.length === 0) {
            setCombatMenuMode('main');
            setCombatFocusPhase('action');
            return;
          }
          if (
            key === 'w' ||
            key === 'a' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowLeft'
          ) {
            e.preventDefault();
            sfx.playSfx('ui_move');
            setCombatSubCursor((c) => (c - 1 + activeSkillIds.length) % activeSkillIds.length);
            return;
          }
          if (
            key === 's' ||
            key === 'd' ||
            e.key === 'ArrowDown' ||
            e.key === 'ArrowRight' ||
            e.key === 'Tab'
          ) {
            e.preventDefault();
            sfx.playSfx('ui_move');
            setCombatSubCursor((c) => (c + 1) % activeSkillIds.length);
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const skId = activeSkillIds[combatSubCursor % activeSkillIds.length];
            const sk = CONFIG.SKILLS.find((s) => s.id === skId);
            if (!sk) return;
            const curMind = activeAllyForKeys ? activeAllyForKeys.mind : player.mind;
            const holyCheck = !activeAllyForKeys ? canUseHolySkill(player, sk) : { allowed: true };
            const lockedByHoly = !holyCheck.allowed;
            if (curMind < sk.mindCost || lockedByHoly) {
              setCombatLogs((prev) => [
                lockedByHoly ? holyCheck.reason || HOLY_MOTHER_REFUSAL_MSG : '⚠️ Không đủ Lý Trí để thi triển kỹ năng này!',
                ...prev.slice(0, 18),
              ]);
              return;
            }
            if (SELF_UTILITY_SKILLS.has(sk.id)) {
              setCombatMenuMode('main');
              setCombatFocusPhase('action');
              runCombatTurn('SKILL', { limbId: selectedLimbId, skillId: sk.id });
            } else {
              sfx.playSfx('ui_confirm');
              setPendingSkillId(sk.id);
              setCombatMenuMode('main');
              snapLimbFocus();
              setCombatFocusPhase('limb');
            }
            return;
          }
          return;
        }

        // PHASE 1C: Items Sub-Menu Navigation
        if (combatFocusPhase === 'items_menu') {
          if (usableItems.length === 0) {
            setCombatMenuMode('main');
            setCombatFocusPhase('action');
            return;
          }
          if (
            key === 'w' ||
            key === 'a' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowLeft'
          ) {
            e.preventDefault();
            sfx.playSfx('ui_move');
            setCombatSubCursor((c) => (c - 1 + usableItems.length) % usableItems.length);
            return;
          }
          if (
            key === 's' ||
            key === 'd' ||
            e.key === 'ArrowDown' ||
            e.key === 'ArrowRight' ||
            e.key === 'Tab'
          ) {
            e.preventDefault();
            sfx.playSfx('ui_move');
            setCombatSubCursor((c) => (c + 1) % usableItems.length);
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const picked = usableItems[combatSubCursor % usableItems.length];
            if (!picked) return;
            setCombatMenuMode('main');
            setCombatFocusPhase('action');
            runCombatTurn('ITEM', { limbId: selectedLimbId, itemId: picked[0] });
            return;
          }
          return;
        }

        // PHASE 2: Spatial Limb Reticle Navigation on Enemy Anatomy
        if (combatFocusPhase === 'limb') {
          if (
            key === 'w' ||
            key === 's' ||
            key === 'a' ||
            key === 'd' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowDown' ||
            e.key === 'ArrowLeft' ||
            e.key === 'ArrowRight' ||
            e.key === 'Tab'
          ) {
            e.preventDefault();
            sfx.playSfx('ui_move');
            if (e.key === 'Tab') {
              const curIdx = aliveLimbs.findIndex((l) => l.id === selectedLimbId);
              const nextLimb = aliveLimbs[(curIdx + 1) % aliveLimbs.length];
              if (nextLimb) {
                setSelectedLimbId(nextLimb.id);
                setFocusedLimbId(nextLimb.id);
              }
              return;
            }
            const getCoords = (id: string, i: number) =>
              reticleMap[id] || { nx: 0.25 + (i % 2) * 0.5, ny: 0.25 + Math.floor(i / 2) * 0.22 };
            const curIdx = Math.max(0, aliveLimbs.findIndex((l) => l.id === selectedLimbId));
            const curPos = getCoords(aliveLimbs[curIdx].id, curIdx);
            const dirY = key === 'w' || e.key === 'ArrowUp' ? -1 : key === 's' || e.key === 'ArrowDown' ? 1 : 0;
            const dirX = key === 'a' || e.key === 'ArrowLeft' ? -1 : key === 'd' || e.key === 'ArrowRight' ? 1 : 0;

            let bestLimb = aliveLimbs[curIdx];
            let bestScore = Infinity;
            aliveLimbs.forEach((cand, idx) => {
              if (cand.id === aliveLimbs[curIdx].id) return;
              const p = getCoords(cand.id, idx);
              const dx = p.nx - curPos.nx;
              const dy = p.ny - curPos.ny;
              const primaryProj = dx * dirX + dy * dirY;
              const ortho = Math.abs(dx * dirY - dy * dirX);
              if (primaryProj > 0.02) {
                const score = primaryProj + ortho * 1.6;
                if (score < bestScore) {
                  bestScore = score;
                  bestLimb = cand;
                }
              }
            });

            if (bestLimb.id === aliveLimbs[curIdx].id && aliveLimbs.length > 1) {
              // Wrap around in the chosen direction
              const step = dirY < 0 || dirX < 0 ? -1 : 1;
              bestLimb = aliveLimbs[(curIdx + step + aliveLimbs.length) % aliveLimbs.length];
            }

            setSelectedLimbId(bestLimb.id);
            setFocusedLimbId(bestLimb.id);
            return;
          }

          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const targetLimbId = aliveLimbs.some((l) => l.id === selectedLimbId)
              ? selectedLimbId
              : aliveLimbs[0].id;
            const targetCheck = canTargetEnemyLimb(activeCombatEnemy, tpl, targetLimbId);
            if (!targetCheck.allowed) {
              sfx.playSfx('ui_move');
              setCombatLogs((prev) => [
                `🔒 ${targetCheck.reason || 'Bộ phận này đang bị che chắn!'}`,
                ...prev.slice(0, 18),
              ]);
              return;
            }
            if (pendingSkillId) {
              const skId = pendingSkillId;
              setPendingSkillId(null);
              runCombatTurn('SKILL', { limbId: targetLimbId, skillId: skId });
            } else {
              runCombatTurn('ATTACK', { limbId: targetLimbId });
            }
            return;
          }
        }
        return;
      }

      if (e.key.toLowerCase() === 'escape' && titleSaveModalOpen) {
        setTitleSaveModalOpen(false);
        return;
      }

      if (e.key.toLowerCase() === 'escape' && screen === 'title' && titleStep === 'char_select') {
        setTitleStep('menu');
        return;
      }

      if (screen !== 'playing') return;
      const key = e.key.toLowerCase();

      if (key === 'escape') {
        if (interactionMenu || logOverlayVisible) {
          setInteractionMenu(null);
          setLogOverlayVisible(false);
          return;
        }
        if (activeModal) {
          setConfirmReturnTitle(false);
          setActiveModal(null);
          return;
        }
        setConfirmReturnTitle(false);
        setActiveModal('settings');
        return;
      }

      if (interactionMenu && !activeModal) {
        if (key === 'w' || e.key === 'ArrowUp') {
          e.preventDefault();
          sfx.playSfx('ui_move');
          setInteractionMenu((prev) =>
            prev
              ? {
                  ...prev,
                  selectedIndex:
                    (prev.selectedIndex - 1 + prev.choices.length) % prev.choices.length,
                }
              : null
          );
          return;
        }
        if (key === 's' || e.key === 'ArrowDown') {
          e.preventDefault();
          sfx.playSfx('ui_move');
          setInteractionMenu((prev) =>
            prev
              ? {
                  ...prev,
                  selectedIndex: (prev.selectedIndex + 1) % prev.choices.length,
                }
              : null
          );
          return;
        }
        if (key === 'f' || key === 'e' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          sfx.playSfx('ui_confirm');
          const chosen = interactionMenu.choices[interactionMenu.selectedIndex];
          if (chosen) chosen.onSelect();
          return;
        }
        return;
      }

      if (key === 'i') {
        setActiveModal((m) => (m === 'inventory' ? null : 'inventory'));
        return;
      }
      if (key === 'l') {
        setActiveModal((m) => (m === 'lore' ? null : 'lore'));
        return;
      }
      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setActiveModal((m) => (m === 'guide' ? null : 'guide'));
        return;
      }
      if (activeModal) return;

      if (key === 'w' || e.key === 'ArrowUp') {
        e.preventDefault();
        attemptMove(0, -1);
      } else if (key === 's' || e.key === 'ArrowDown') {
        e.preventDefault();
        attemptMove(0, 1);
      } else if (key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        attemptMove(-1, 0);
      } else if (key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        attemptMove(1, 0);
      } else if (key === 'f' || key === 'e' || e.key === ' ') {
        e.preventDefault();
        handleTileInteraction();
      } else if (key === 'b') {
        e.preventDefault();
        promptCrackedWallExplosion();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screen,
    activeCombatEnemy,
    activeModal,
    activeActorIdx,
    player,
    combatFocusPhase,
    combatActionCursor,
    combatSubCursor,
    pendingSkillId,
    titleSaveModalOpen,
    titleStep,
    interactionMenu,
    logOverlayVisible,
    coinToss,
    shiftHeld,
    handleChooseCoinSide,
    confirmCoinTossOutcome,
    selectedLimbId,
    attemptMove,
    handleTileInteraction,
    handleCombatEnd,
    promptCrackedWallExplosion,
    runCombatTurn,
  ]);

  // Delta-Time Driven RequestAnimationFrame Combat Loop (Particles, Eased Slash Arcs, Screen Shake, Per-Limb Breathing)
  useEffect(() => {
    if (screen !== 'combat' || !activeCombatEnemy) return;
    let rafId = 0;
    let lastTime = performance.now();

    const renderLoop = (now: number) => {
      const dtMs = now - lastTime;
      lastTime = now;

      const engine = combatEngineRef.current;
      engine.update(dtMs);

      const canvas = combatStageCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          ctx.save();
          // Apply Damage-Proportional Screen Shake (Crit = 25px, >500 Dmg = 15px)
          ctx.translate(engine.currentShakeX, engine.currentShakeY);

          const tpl = CONFIG.ENEMIES[activeCombatEnemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
          const showCombatPortrait = Boolean(
            tpl.combatPortraitUrl && !portraitErrorRef.current[tpl.combatPortraitUrl]
          );

          if (!showCombatPortrait) {
            // 1. Atmospheric Dungeon / Void / Blood Backdrop
            const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.42, 24, w * 0.5, h * 0.45, w * 0.68);
            if (currentRoom.floor === 3) {
              bgGrad.addColorStop(0, '#2a1642');
              bgGrad.addColorStop(0.55, '#12081e');
              bgGrad.addColorStop(1, '#050308');
            } else if (currentRoom.floor === 1) {
              bgGrad.addColorStop(0, '#3e1214');
              bgGrad.addColorStop(0.55, '#19080a');
              bgGrad.addColorStop(1, '#060304');
            } else {
              bgGrad.addColorStop(0, '#29221d');
              bgGrad.addColorStop(0.55, '#120e10');
              bgGrad.addColorStop(1, '#060508');
            }
            ctx.fillStyle = bgGrad;
            ctx.fillRect(-30, -30, w + 60, h + 60);

            // Gothic stone pillars in background
            ctx.fillStyle = 'rgba(20, 16, 22, 0.75)';
            ctx.fillRect(28, 0, 52, h * 0.65);
            ctx.fillRect(w - 80, 0, 52, h * 0.65);

            // Stone floor perspective lines
            ctx.strokeStyle = 'rgba(130, 110, 90, 0.16)';
            ctx.lineWidth = 2;
            for (let i = 1; i < 6; i++) {
              const yLine = h * 0.58 + i * 32;
              ctx.beginPath();
              ctx.moveTo(0, yLine);
              ctx.lineTo(w, yLine);
              ctx.stroke();
            }

            // Shadow / Blood pool under enemy
            ctx.fillStyle = 'rgba(75, 10, 14, 0.64)';
            ctx.beginPath();
            ctx.ellipse(w * 0.5, h * 0.72, 185, 36, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // 2. Central Anatomical Vector Monster with Per-Limb Sinusoidal Breathing (skipped when portrait image is rendered beneath)
          const severedSet = new Set<string>(activeCombatEnemy.severedLimbs);
          const animState = engine.getStageAnimState();

          if (!showCombatPortrait) {
            const enemyW =
              tpl.spriteScale === '3x3'
                ? 500
                : tpl.spriteScale === '2x3'
                ? 465
                : tpl.spriteScale === '2x2'
                ? 425
                : 375;
            const enemyH =
              tpl.spriteScale === '3x3'
                ? 430
                : tpl.spriteScale === '2x3'
                ? 420
                : tpl.spriteScale === '2x2'
                ? 405
                : 395;
            const enemyX = w * 0.5 - enemyW * 0.5;
            const enemyY = h * 0.015;

            drawPixelSprite(
              ctx,
              tpl.spriteKey,
              enemyX,
              enemyY,
              enemyW,
              enemyH,
              severedSet,
              animState === 'enemyHit',
              activeCombatEnemy.oilCovered,
              activeCombatEnemy.blindTurns > 0,
              activeCombatEnemy.telegraphing,
              engine.breathPhase
            );
          }

          // Render Eased Blade Slash Arcs & Physics Particles (gravity = 0.5)
          engine.renderCanvasEffects(ctx);

          // 3. Foreground Party Back-Sprites (up to 4 living party members arrayed across bottom stage)
          const partyShakeX = animState === 'playerHit' ? Math.sin(now * 0.08) * 10 : 0;
          const livingSprites: Array<{
            spriteKey: string;
            arms: { leftArm: boolean; rightArm: boolean };
            actorIdx: number;
          }> = [
            {
              spriteKey: player.classId,
              arms: { leftArm: player.limbs.leftArm, rightArm: player.limbs.rightArm },
              actorIdx: 0,
            },
            ...player.party
              .map((ally, i) => ({ ally, actorIdx: i + 1 }))
              .filter(({ ally }) => ally.hp > 0)
              .map(({ ally, actorIdx }) => ({
                spriteKey: ally.spriteKey || ally.classId,
                arms: { leftArm: ally.limbs.leftArm, rightArm: ally.limbs.rightArm },
                actorIdx,
              })),
          ];

          const slotXByCount: Record<number, number[]> = {
            1: [0.14],
            2: [0.08, 0.68],
            3: [0.04, 0.41, 0.73],
            4: [0.01, 0.23, 0.54, 0.76],
          };
          const xNorms = slotXByCount[livingSprites.length] || slotXByCount[4];
          const spriteScaleW = livingSprites.length >= 4 ? 142 : livingSprites.length === 3 ? 154 : 170;
          const spriteScaleH = livingSprites.length >= 4 ? 166 : livingSprites.length === 3 ? 180 : 196;

          livingSprites.forEach((member, slotIdx) => {
            const bx = w * (xNorms[slotIdx] ?? 0.14) + partyShakeX;
            const by = h * (slotIdx === 0 ? 0.54 : 0.56);
            if (member.actorIdx === activeActorIdx) {
              ctx.save();
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.78)';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.ellipse(bx + spriteScaleW * 0.5, by + spriteScaleH * 0.9, spriteScaleW * 0.34, 11, 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
            drawPartyBackSprite(
              ctx,
              member.spriteKey,
              bx,
              by,
              spriteScaleW,
              spriteScaleH,
              member.arms,
              animState === 'playerAttack' && member.actorIdx === activeActorIdx,
              animState === 'playerHit'
            );
          });

          if (animState === 'playerHit') {
            ctx.save();
            const hitCx = w * (xNorms[0] ?? 0.14) + spriteScaleW * 0.5 + partyShakeX;
            const hitCy = h * 0.54 + 72;
            const burstGrad = ctx.createRadialGradient(hitCx, hitCy, 6, hitCx, hitCy, 78);
            burstGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
            burstGrad.addColorStop(0.45, 'rgba(239, 68, 68, 0.85)');
            burstGrad.addColorStop(1, 'rgba(127, 29, 29, 0)');
            ctx.fillStyle = burstGrad;
            ctx.beginPath();
            for (let i = 0; i < 16; i++) {
              const ang = (i * Math.PI * 2) / 16;
              const rad = i % 2 === 0 ? 76 : 32;
              const px = hitCx + Math.cos(ang) * rad;
              const py = hitCy + Math.sin(ang) * rad;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // 4. Render Floating Combat Damage Numbers with smooth delta-time fade
          for (const ft of engine.floatingTexts) {
            const alpha = Math.max(0, Math.min(1, ft.lifeMs / ft.maxLifeMs));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = "bold 19px 'Noto Serif', serif";
            ctx.fillStyle = '#000000';
            ctx.fillText(ft.text, ft.x + 2, ft.y + 2);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
          }

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [screen, activeCombatEnemy, currentRoom.floor, player, activeActorIdx]);

  const renderCoinTossModal = () => {
    if (!coinToss) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
        <div className="max-w-md w-full df-panel p-6 text-center space-y-4">
          <div className="text-xs uppercase tracking-[0.2em] text-[#c5a059] font-bold">
            ĐỒNG XU ĐỊNH MỆNH {coinToss.isPanicAuto ? '• HOẢNG LOẠN' : ''}
          </div>
          <h3
            className="text-2xl font-bold text-[#dfd2b4] tracking-wide uppercase"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {coinToss.title}
          </h3>
          {coinToss.subtitle && (
            <p className="text-sm text-[#d6b79f] leading-relaxed px-2">
              {coinToss.subtitle}
            </p>
          )}

          {/* 160x160 3D Embossed Gold Coin Canvas (or Dual 2-Coin Shift view) */}
          <div className="py-2 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center justify-center gap-3">
              <EngravedGoldCoinCanvas
                side={coinToss.resultSide || coinToss.chosenSide || 'HEADS'}
                flipping={coinToss.flipping}
                size={coinToss.secondResultSide || (!coinToss.resultSide && shiftHeld) ? 120 : 160}
              />
              {(coinToss.secondResultSide || (!coinToss.resultSide && shiftHeld)) && (
                <EngravedGoldCoinCanvas
                  side={coinToss.secondResultSide || coinToss.chosenSide || 'TAILS'}
                  flipping={coinToss.flipping}
                  size={120}
                />
              )}
            </div>
            {coinToss.resultSide && (
              <div className="text-sm font-bold tracking-widest uppercase text-[#c5a059]">
                {coinToss.secondResultSide
                  ? `${coinToss.resultSide === 'HEADS' ? 'NGỬA' : 'SẤP'} • ${
                      coinToss.secondResultSide === 'HEADS' ? 'NGỬA' : 'SẤP'
                    }`
                  : coinToss.resultSide === 'HEADS'
                  ? 'MẶT NGỬA'
                  : 'MẶT SẤP'}
              </div>
            )}
          </div>

          {!coinToss.chosenSide && !coinToss.isPanicAuto && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={(e) => handleChooseCoinSide('HEADS', e.shiftKey || shiftHeld)}
                  className="df-btn-bronze py-2.5 px-2 text-sm font-bold uppercase cursor-pointer"
                >
                  [1/A] Mặt Ngửa
                </button>
                <button
                  onClick={(e) => handleChooseCoinSide('TAILS', e.shiftKey || shiftHeld)}
                  className="df-btn-bronze py-2.5 px-2 text-sm font-bold uppercase cursor-pointer"
                >
                  [2/D] Mặt Sấp
                </button>
              </div>
              {player.inventory.lucky_coin > 0 && (
                <div className="text-xs text-[#9b8f82]">
                  Giữ [Shift] để tung 2 đồng xu cùng lúc (Thẻ Bài Bạc: x{player.inventory.lucky_coin})
                </div>
              )}

              {coinToss.onLockpick && (
                <button
                  onClick={() => {
                    const lp = coinToss.onLockpick;
                    setCoinToss(null);
                    lp?.();
                  }}
                  className="df-btn w-full py-2 text-sm font-bold text-[#dfd2b4] cursor-pointer"
                >
                  🗝️ Chìa Khóa Vạn Năng (x{player.inventory.lockpick})
                </button>
              )}
            </div>
          )}

          {coinToss.outcomeText && (
            <button
              onClick={confirmCoinTossOutcome}
              className="df-btn-blood w-full py-2.5 font-bold text-sm uppercase cursor-pointer"
            >
              Chấp Nhận [Enter / Space]
            </button>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: TITLE SCREEN
  // ============================================================================
  if (screen === 'title') {
    const selectedClass = CONFIG.CLASSES.find((c) => c.id === selectedClassId) || CONFIG.CLASSES[0];
    return (
      <div className="h-screen bg-[#070609] text-[#e7dcc8] flex flex-col justify-between relative overflow-y-auto lg:overflow-hidden select-none">
        <div
          className="absolute inset-0 pointer-events-none opacity-35"
          style={{
            background:
              'radial-gradient(circle at 50% 28%, rgba(153, 27, 27, 0.35), rgba(15, 10, 18, 0.95) 70%)',
          }}
        />

        <main className="relative z-10 max-w-4xl w-full mx-auto px-5 py-3 flex items-center justify-center flex-1 min-h-0">
          {titleStep === 'menu' ? (
            <div className="w-full max-w-xl mx-auto text-center space-y-8 py-6">
              <div className="space-y-2">
                <h1
                  className="text-4xl sm:text-5xl font-bold tracking-tight text-[#f5ebd6] leading-tight"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  VAELIS
                  <span className="block text-xl sm:text-2xl font-normal text-[#c2410c] tracking-[0.12em] mt-1">
                    — THUNG LŨNG XƯƠNG TÀN —
                  </span>
                </h1>
              </div>

              <div className="flex flex-col gap-3.5 w-72 mx-auto">
                <button
                  type="button"
                  onClick={() => setTitleStep('char_select')}
                  className="w-full px-6 py-3 df-btn-blood font-bold tracking-wider uppercase text-xs sm:text-sm cursor-pointer"
                >
                  Bắt Đầu Hành Trình
                </button>
                <button
                  type="button"
                  onClick={() => setTitleSaveModalOpen(true)}
                  className="w-full px-6 py-3 df-btn-bronze font-bold tracking-wider uppercase text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2"
                  title="Mở danh sách 5 ô lưu ký ức"
                >
                  <FolderOpen className="w-4 h-4 text-[#c5a059]" />
                  <span>Tiếp Tục ({saveSlots.filter(Boolean).length}/5)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-[#d3d3d3] leading-none"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  CHỌN NHÂN VẬT <span className="text-lg sm:text-xl font-normal text-[#c5a059]">— KHỞI HÀNH</span>
                </h1>
                <button
                  type="button"
                  onClick={() => setTitleStep('menu')}
                  className="px-3.5 py-1.5 df-btn font-bold tracking-wider uppercase text-xs cursor-pointer"
                >
                  ← Quay Lại
                </button>
              </div>

              {/* Character Name Input & Class Selection */}
              <div className="p-4 df-panel space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] uppercase tracking-wider text-[#c5a059] mb-1">
                      Tên Nhân Vật
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={characterNameInput}
                        onChange={(e) => setCharacterNameInput(e.target.value)}
                        className="w-full px-3 py-1.5 df-well text-[#d3d3d3] font-serif text-xs focus:outline-none focus:border-[#c5a059]"
                        placeholder="Nhập tên..."
                      />
                      <button
                        type="button"
                        onClick={() => setCharacterNameInput(generateRandomCharacterName())}
                        className="px-2.5 py-1.5 df-btn-bronze flex items-center justify-center shrink-0 cursor-pointer"
                        title="Đặt Tên Ngẫu Nhiên"
                        aria-label="Đặt Tên Ngẫu Nhiên"
                      >
                        <Dices className="w-4 h-4 text-[#e5cfa0]" />
                      </button>
                    </div>
                  </div>
                  <div className="flex w-full sm:w-auto gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => enterPrologue()}
                      className="flex-1 sm:flex-initial px-5 py-2 df-btn-blood font-bold tracking-wider uppercase text-xs cursor-pointer"
                    >
                      Tiến Vào Hành Trình →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {CONFIG.CLASSES.map((cls) => {
                    const active = cls.id === selectedClassId;
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          const prevDefault = CONFIG.CLASSES.find((c) => c.id === selectedClassId)?.name;
                          setSelectedClassId(cls.id);
                          if (!characterNameInput.trim() || characterNameInput === prevDefault) {
                            setCharacterNameInput(cls.name);
                          }
                        }}
                        className={`text-left p-3 cursor-pointer flex flex-col justify-between ${
                          active
                            ? 'df-card-active text-[#d3d3d3]'
                            : 'df-card text-[#9e968c]'
                        }`}
                      >
                        <div>
                          <div className="flex items-start gap-2.5 mb-1.5">
                            <CharacterPortraitBox
                              spriteKey={cls.id}
                              portraitUrl={cls.combatPortraitUrl}
                              size={54}
                              alt={cls.name}
                              isError={Boolean(cls.combatPortraitUrl && portraitErrorMap[cls.combatPortraitUrl])}
                              onPortraitError={markPortraitError}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-bold text-xs sm:text-sm text-[#c5a059] truncate">{cls.name}</span>
                                {active && (
                                  <span className="text-[9px] uppercase tracking-widest text-[#d46a6a] font-bold shrink-0">
                                    ✦ Đã Chọn
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#b54848] font-semibold">{cls.title}</div>
                            </div>
                          </div>
                          <p className="text-[11px] leading-snug text-[#d3d3d3]">{cls.lore}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-[#d3d3d3] df-well px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[#c5a059] font-semibold">Khởi đầu:</span>{' '}
                    [{CONFIG.WEAPONS[selectedClass.startingWeapon]?.name}] • [{CONFIG.SKILLS.find((s) => s.id === selectedClass.startingSkill)?.name}]
                  </div>
                  <span className="text-[10px] text-[#9e968c] italic">
                    * Sinh Lực &amp; Lý Trí ẩn đến khi vào Thung Lũng.
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Title Screen 5-Slot Save Files Modal when clicking 'Tiếp Tục' */}
        {titleSaveModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/88 flex items-center justify-center p-4">
            <div className="max-w-lg w-full df-panel p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#c5a059]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#c5a059]">
                    Danh Sách File Save (5 Ô Lưu)
                  </h2>
                </div>
                <button
                  onClick={() => setTitleSaveModalOpen(false)}
                  className="px-2.5 py-1 df-btn text-xs font-bold cursor-pointer"
                >
                  Đóng [ESC]
                </button>
              </div>

              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const slot = saveSlots[idx];
                  return (
                    <div
                      key={idx}
                      className="p-2.5 df-card flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#d3d3d3]">
                          FILE SAVE #{idx + 1}{' '}
                          {slot?.player?.name ? (
                            <span className="text-[#c5a059]">— {slot.player.name}</span>
                          ) : null}
                        </div>
                        {slot ? (
                          <div className="text-[11px] text-[#a3998f] space-y-0.5 mt-0.5">
                            <div>
                              <span className="font-mono text-[#c5a059]">Seed: {slot.seed}</span> • Khu:{' '}
                              {slot.world.currentRoomId} • {slot.timestamp}
                            </div>
                            <div>
                              Sinh Lực {slot.player.hp}/{slot.player.maxHp} • Lý Trí {slot.player.mind}/{slot.player.maxMind} • Tha Hóa{' '}
                              {slot.player.corruption}%
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#6b635b] italic">Trống...</div>
                        )}
                      </div>
                      {slot && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => loadFromSlot(idx)}
                            className="px-3 py-1 df-btn-bronze text-xs font-bold cursor-pointer"
                          >
                            Tải
                          </button>
                          <button
                            onClick={() => deleteSaveSlot(idx)}
                            className="px-2 py-1 df-btn-blood text-[11px] cursor-pointer"
                            title="Xóa bản lưu này"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ============================================================================
  // RENDER: 3-FRAME ILLUSTRATED PROLOGUE & BACKSTORY CHOICE
  // ============================================================================
  if (screen === 'prologue') {
    const frame3Image =
      player.classId === 'forsaken_nun'
        ? prologueGateNunImg
        : player.classId === 'night_hunter'
        ? prologueGateHunterImg
        : prologueGateKnightImg;

    const prologueTexts = [
      {
        title: 'LÂU ĐÀI HẮC ÁM ĐÈ NÁT GIÁO ĐƯỜNG GOETHE',
        desc: 'Đêm Trăng Đỏ, Lâu Đài Hắc Ám từ trên cao giáng thẳng xuống đè sập tháp chuông Giáo Đường Goethe — vùi lấp mọi lối thoát dưới tầng tầng bóng tối.',
        image: prologueFrame1Img,
        alt: 'Lâu Đài Hắc Ám giáng xuống dưới Trăng Đỏ đè nát mái Giáo Đường Goethe',
      },
      {
        title: 'BỨC TƯỢNG THÁNH MẪU VỠ & ÁNH MẮT TRONG SƯƠNG',
        desc: 'Giữa sương mù tím đặc quánh, bức tượng Thánh Mẫu cổ nứt toác rỉ thứ dịch đen lạnh lẽo; từng cặp mắt đỏ rực dần hé mở dõi theo bất kỳ kẻ sống sót nào.',
        image: prologueFrame2Img,
        alt: 'Bức tượng Thánh Mẫu nứt vỡ rỉ dịch đen giữa sương mù tím và những cặp mắt đỏ rực',
      },
      {
        title: 'TRƯỚC CỔNG SẮT RĂNG CƯA NGOẠI VI',
        desc: 'Bức tường sương xám cuồn cuộn ép sát sau lưng đẩy bạn về phía cánh cổng sắt hoen gỉ — hãy khắc ghi 3 quyết định quá khứ của chính mình trước khi bước vào.',
        image: frame3Image,
        alt: 'Nhân vật đứng giữa làn sương xám nhạt trước cổng sắt răng cưa Ngoại Vi Đại Giáo Đường',
      },
    ];

    return (
      <div className="min-h-screen h-screen bg-[#070509] text-[#d3d3d3] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-3xl w-full df-panel p-5 space-y-3 my-auto">
          <div className="flex items-center justify-end border-b border-[#3a3a3a] pb-2">
            <button
              type="button"
              onClick={finishPrologueAndPlay}
              className="text-[11px] text-[#c5a059] hover:text-[#d3d3d3] underline cursor-pointer"
              title="Bỏ qua dẫn nhập và tự động nhận bộ trang bị + nhu yếu phẩm mặc định của nhân vật"
            >
              Bỏ qua (Nhận Đồ Mặc Định) → Vào Ngoại Vi
            </button>
          </div>

          <div className="relative w-full aspect-video overflow-hidden df-well bg-[#08060a]">
            <img
              src={prologueTexts[prologueFrame].image}
              alt={prologueTexts[prologueFrame].alt}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover pixelated select-none"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at center, transparent 58%, rgba(7, 5, 9, 0.72) 100%)',
              }}
            />
          </div>

          <div className="space-y-1">
            <h2
              className="text-lg sm:text-xl font-bold text-[#c5a059]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {prologueTexts[prologueFrame].title}
            </h2>
            <p className="text-xs text-[#d3d3d3] leading-snug">{prologueTexts[prologueFrame].desc}</p>
          </div>

          {/* Class-Specific 3-Step Intro Choices on Frame 3 */}
          {prologueFrame === 2 && (
            <div className="p-4 df-well space-y-3 max-h-[42vh] overflow-y-auto">
              {(() => {
                const clsKey =
                  (player.classId as 'fallen_knight' | 'forsaken_nun' | 'night_hunter') ||
                  'fallen_knight';
                const steps = CHARACTER_INTRO_STEPS[clsKey] || CHARACTER_INTRO_STEPS.fallen_knight;
                const currentStep = steps[introStepIdx];
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#c5a059]">
                        Ký Ức & Hành Trang Của {player.name} — Bước {introStepIdx + 1}/3
                      </div>
                      <span className="text-[11px] text-[#a3998f] font-mono">
                        Tha Hóa: {player.corruption}% • Lý Trí: {player.mind}/{player.maxMind}
                      </span>
                    </div>

                    {!backstoryChosen && currentStep ? (
                      <div className="space-y-2.5">
                        <div className="text-xs font-semibold text-[#d3d3d3]">
                          {currentStep.prompt}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {currentStep.options.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => {
                                const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                                applyIntroChoiceToPlayer(pCopy, opt);
                                setPlayer(pCopy);
                                setPreviewItemId(pCopy.equippedWeapon);
                                if (opt.revealFloor1Map) {
                                  setWorld((wPrev) => ({
                                    ...wPrev,
                                    visitedRoomIds: Array.from(
                                      new Set([...wPrev.visitedRoomIds, 'F1_R0', 'F1_R1'])
                                    ),
                                  }));
                                }
                                if (introStepIdx < 2) {
                                  setIntroStepIdx((s) => (s + 1) as 0 | 1 | 2);
                                } else {
                                  setBackstoryChosen(true);
                                }
                              }}
                              className="p-3 df-card text-left text-xs cursor-pointer flex flex-col justify-between gap-1.5"
                            >
                              <div className="font-bold text-[#c5a059]">{opt.label}</div>
                              <div className="text-[11px] text-[#9ab08e] leading-snug">
                                {opt.effectText}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 df-card-active text-xs text-[#d3d3d3] space-y-1">
                        <div className="font-bold text-[#c5a059]">
                          ✓ Bạn đã định hình xong 3 bước quá khứ trước Cổng Sắt Goethe!
                        </div>
                        <div>
                          Vũ khí: <b>{CONFIG.WEAPONS[player.equippedWeapon]?.name}</b> • Bạc:{' '}
                          <b>{player.silverCoins}</b> • Tha Hóa: <b>{player.corruption}%</b> • Lý Trí:{' '}
                          <b>{player.mind}/{player.maxMind}</b>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              disabled={prologueFrame === 0}
              onClick={() => setPrologueFrame((f) => (f > 0 ? ((f - 1) as 0 | 1 | 2) : f))}
              className="px-4 py-2 df-btn text-xs disabled:opacity-40 cursor-pointer"
            >
              ← Khung Trước
            </button>
            {prologueFrame < 2 ? (
              <button
                onClick={() => setPrologueFrame((f) => ((f + 1) as 0 | 1 | 2))}
                className="px-6 py-2 df-btn-blood text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Tiếp Tục Khung Hình →
              </button>
            ) : (
              <button
                onClick={finishPrologueAndPlay}
                className="px-6 py-2.5 df-btn-bronze text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Bước Vào Ngoại Vi Đại Giáo Đường →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ENDING SCREEN
  // ============================================================================
  if (screen === 'ending' && endingInfo) {
    return (
      <div className="min-h-screen bg-[#070509] text-[#d3d3d3] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full df-panel p-8 space-y-6 text-center max-h-[90vh] overflow-y-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 df-well border-[#8b0000] text-xs uppercase tracking-widest text-[#c96b6b]">
            <Sparkles className="w-3.5 h-3.5" /> Kết Cục Định Mệnh
          </div>
          <h1
            className="text-4xl font-bold text-[#c5a059]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {endingInfo.title}
          </h1>
          <div className="text-sm uppercase tracking-widest text-[#b54848]">{endingInfo.subtitle}</div>
          <p className="text-base text-[#d3d3d3] leading-relaxed border-y border-[#3a3a3a] py-5 max-h-[40vh] overflow-y-auto px-2">
            {endingInfo.epilogue}
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={() => {
                const freshSeed = seedInput === world.seed ? generateRandomSeed() : seedInput;
                setSeedInput(freshSeed);
                enterPrologue(freshSeed, player.classId);
              }}
              className="px-6 py-2.5 df-btn-blood font-bold text-sm uppercase tracking-wider cursor-pointer"
            >
              🎲 Chơi Ván Mới (Seed Ngẫu Nhiên: {seedInput})
            </button>
            <button
              onClick={() => setScreen('title')}
              className="px-6 py-2.5 df-btn text-sm uppercase tracking-wider cursor-pointer"
            >
              Về Màn Hình Chính
            </button>
          </div>

          {/* Quick Load Saved Game to Restore Old Seed */}
          {saveSlots.some((s) => s !== null) && (
            <div className="pt-4 border-t border-[#3a3a3a] space-y-2 text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-[#c5a059] text-center">
                Hoặc Tải Lại Bản Lưu (Khôi Phục Về Seed Cũ Đã Lưu)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const slot = saveSlots[idx];
                  if (!slot) return null;
                  return (
                    <button
                      key={idx}
                      onClick={() => loadFromSlot(idx)}
                      className="p-2.5 df-card text-left text-xs cursor-pointer"
                    >
                      <div className="font-bold text-[#c5a059]">Tải Ô Lưu #{idx + 1}</div>
                      <div className="font-mono text-[11px] text-[#d3d3d3]">Seed: {slot.seed}</div>
                      <div className="text-[11px] text-[#a3998f]">
                        Phòng {slot.world.currentRoomId} • Sinh Lực {slot.player.hp}/{slot.player.maxHp}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: FIRST-PERSON PARTY COMBAT STAGE (68% UPPER / 32% LOWER SILVER DOCK)
  // ============================================================================
  if (screen === 'combat' && activeCombatEnemy) {
    const tpl = CONFIG.ENEMIES[activeCombatEnemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
    const reticleMap = getLimbReticlePositions(tpl.spriteKey);
    const activeAlly = activeActorIdx > 0 ? player.party[activeActorIdx - 1] || null : null;
    const isPureTankTurn = Boolean(activeAlly && isPureTankSummon(activeAlly));
    const actingName = activeAlly ? activeAlly.name : player.name;
    const activeWeapon = activeAlly ? getAllyEffectiveWeapon(activeAlly) : getEffectiveWeapon(player);
    const activeSkillIds = activeAlly
      ? getAllyAvailableSkills(activeAlly)
      : Object.entries(player.skillLevels)
          .filter(([, lv]) => lv > 0)
          .map(([id]) => id);

    const usableCombatItems = Object.entries(player.inventory).filter(
      ([itemId, count]) => count > 0 && CONFIG.ITEMS[itemId]?.combatUsable
    );

    const currentTargetLimb =
      activeCombatEnemy.limbs.find((l) => l.id === selectedLimbId) || activeCombatEnemy.limbs[0];
    const showBossPortrait = Boolean(
      tpl.combatPortraitUrl && !portraitErrorMap[tpl.combatPortraitUrl]
    );
    const enemyWeaponLost = isEnemyWeaponLimbSevered(activeCombatEnemy, tpl);

    return (
      <div className="h-screen w-screen overflow-hidden bg-[#060508] text-[#d3d3d3] flex flex-col select-none">
        {/* UPPER COMBAT STAGE (~64%, flex-fills remaining height safely) */}
        <div
          className={`relative flex-1 min-h-0 w-full bg-[#09070c] border-b border-[#c5a059]/45 flex flex-col items-center justify-between overflow-hidden ${
            screenShakeMode === 'heavy'
              ? 'animate-heavy-shake'
              : screenShakeMode === 'normal'
              ? 'animate-screen-shake'
              : ''
          }`}
        >
          {/* Atmospheric Dark Dungeon / Void / Blood Backdrop for Portrait Mode */}
          {showBossPortrait && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  currentRoom.floor === 3
                    ? 'radial-gradient(circle at 50% 42%, rgba(42, 22, 66, 0.92), rgba(14, 7, 24, 0.98) 58%, #050308 100%)'
                    : currentRoom.floor === 1
                    ? 'radial-gradient(circle at 50% 42%, rgba(62, 18, 20, 0.92), rgba(20, 7, 10, 0.98) 58%, #060304 100%)'
                    : 'radial-gradient(circle at 50% 42%, rgba(41, 34, 29, 0.92), rgba(16, 12, 14, 0.98) 58%, #060508 100%)',
              }}
            />
          )}

          {/* Top Chamfered Telegraph & Enemy Header Banner */}
          <div className="z-20 w-full max-w-5xl mt-1.5 px-3 shrink-0">
            <div
              className={`df-well px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                activeCombatEnemy.telegraphCoinFlip ? 'border-[#dc2626] bg-[#1e070a]/95' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs sm:text-sm uppercase tracking-widest text-[#c96b6b] font-bold flex items-center gap-2 flex-wrap">
                  <span>Hiệp #{activeCombatEnemy.turnCount + 1} • {activeCombatEnemy.customName || tpl.name}</span>
                  {enemyWeaponLost && (
                    <span className="px-1.5 py-0.5 bg-[#2a0c10] border border-[#8b0000] text-[11px] text-[#e5cfa0]">
                      Mất Tay Vũ Khí — Đòn Tay Không
                    </span>
                  )}
                  {(player.poisonCoatTurns || 0) > 0 && (
                    <span className="px-1.5 py-0.5 bg-[#0e2618] border border-[#4ade80] text-[11px] text-[#4ade80]">
                      ☠️ Tẩm Độc ({player.poisonCoatTurns} đòn)
                    </span>
                  )}
                  {(player.fireCoatTurns || 0) > 0 && (
                    <span className="px-1.5 py-0.5 bg-[#2c1507] border border-[#f59e0b] text-[11px] text-[#fbbf24]">
                      🔥 Dầu Lửa ({player.fireCoatTurns} đòn)
                    </span>
                  )}
                  {isResolvingTurn && (
                    <span className="text-[11px] text-[#c5a059] animate-pulse">
                      ✦ Đang giao phong...
                    </span>
                  )}
                </div>
                {(activeCombatEnemy.telegraphCoinFlip || activeCombatEnemy.telegraphing) && (
                  <div
                    className={`text-sm truncate mt-0.5 ${
                      activeCombatEnemy.telegraphCoinFlip
                        ? 'text-[#fca5a5] font-bold animate-pulse'
                        : 'text-[#fbbf24] font-semibold'
                    }`}
                  >
                    {activeCombatEnemy.telegraphCoinFlip
                      ? `⚠️ ĐÒN TỬ THẦN BÁO TRƯỚC: [${tpl.coinFlipSkill?.name || tpl.telegraphName}] — Chọn [3] PHÒNG THỦ hoặc chuẩn bị Tung Đồng Xu!`
                      : `⚠️ SẮP TUNG: [${tpl.telegraphName}]`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs sm:text-sm uppercase tracking-wider text-[#a3998f] font-mono">
                <span>⌖ Chọn:</span>
                <span className="text-[#c5a059] font-bold">{currentTargetLimb?.name}</span>
              </div>
            </div>
          </div>

          {/* Center Responsive 16:11 Stage Wrapper with Portrait Backdrop, Weapon VFX & On-Body Anatomical Reticles */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center py-0.5 relative z-10">
            <div className="relative h-full aspect-[16/11] max-w-full flex items-center justify-center">
              {showBossPortrait && tpl.combatPortraitUrl && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-[10%] top-[0%] w-[80%] h-[94%] overflow-hidden combat-portrait-stage-mask">
                    <img
                      src={tpl.combatPortraitUrl}
                      alt={activeCombatEnemy.customName || tpl.name}
                      onError={() => markPortraitError(tpl.combatPortraitUrl!)}
                      className={`w-full h-full object-cover object-top animate-monster-breathe ${
                        activeCombatEnemy.telegraphing ? 'brightness-110 saturate-125' : ''
                      }`}
                      style={{
                        filter: activeCombatEnemy.blindTurns > 0
                          ? 'brightness(0.66) contrast(1.06) saturate(0.45)'
                          : 'brightness(0.88) contrast(1.08) saturate(0.86)',
                      }}
                    />
                    {/* Multi-edge dark vignette dissolving portrait cleanly into dungeon backdrop */}
                    <div className="absolute inset-0 combat-portrait-vignette-overlay pointer-events-none" />
                    {/* Anatomical darkened zones + crimson arterial slashes aligned with severed limbs */}
                    {activeCombatEnemy.severedLimbs.map((sevId) => {
                      const pos = reticleMap[sevId];
                      if (!pos) return null;
                      const localX = Math.max(8, Math.min(92, ((pos.nx - 0.10) / 0.80) * 100));
                      const localY = Math.max(8, Math.min(92, (pos.ny / 0.94) * 100));
                      return (
                        <React.Fragment key={`gash_${sevId}`}>
                          <div
                            style={{
                              left: `${localX}%`,
                              top: `${localY}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            className="absolute w-24 h-24 rounded-full combat-severed-darkness pointer-events-none"
                          />
                          <div
                            style={{
                              left: `${localX}%`,
                              top: `${localY}%`,
                              transform: 'translate(-50%, -50%) rotate(-24deg)',
                            }}
                            className="absolute w-16 h-2.5 bg-[#450a0a]/95 border-y border-[#dc2626] shadow-[0_0_12px_rgba(185,28,28,0.92)] pointer-events-none"
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              <canvas
                ref={combatStageCanvasRef}
                width={640}
                height={440}
                className="w-full h-full pointer-events-none relative z-10"
              />

              {activeVfx && activeVfx.category !== 'unarmed' && (
                <div
                  key={activeVfx.key}
                  className={`vfx-overlay vfx-${activeVfx.category} z-20`}
                  style={{ '--vfx-color': activeVfx.color } as React.CSSProperties}
                />
              )}

            {/* Compact On-Body Anatomical Target Reticles with Damage Preview Tooltip & Pixel-Art Debuff Badges */}
            {!activeCombatEnemy.defeated &&
              activeCombatEnemy.limbs.map((limb, idx) => {
                const pos = reticleMap[limb.id] || {
                  nx: 0.25 + (idx % 2) * 0.5,
                  ny: 0.25 + Math.floor(idx / 2) * 0.22,
                };
                const isSevered = limb.hp <= 0;
                const isSelected = selectedLimbId === limb.id;
                const isFocused = combatFocusPhase === 'limb' && isSelected;
                const showExpanded = isSelected || isFocused;
                const targetable = canTargetEnemyLimb(activeCombatEnemy, tpl, limb.id).allowed;
                const preview = combatEngineRef.current.getDamagePreview(
                  player,
                  activeCombatEnemy,
                  tpl,
                  limb
                );
                const badges = combatEngineRef.current.getLimbBadges(activeCombatEnemy, limb.id);
                const tooltipOnLeft = pos.nx < 0.48;

                return (
                  <div
                    key={limb.id}
                    style={{
                      left: `${pos.nx * 100}%`,
                      top: `${pos.ny * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`pointer-events-none absolute ${showExpanded ? 'z-30' : 'z-20'}`}
                  >
                    {/* Pixel-Art Debuff Status Badges with Remaining Turn Count right above the Reticle */}
                    {!isSevered && badges.length > 0 && (
                      <div className="flex items-center justify-center gap-1 mb-0.5 pointer-events-none">
                        {badges.map((b) => (
                          <span
                            key={b.type}
                            style={{ borderColor: b.color, color: b.color }}
                            className="px-1.5 py-0.5 bg-[#09070d]/95 border text-[11px] font-mono font-bold flex items-center gap-0.5 shadow"
                          >
                            <span>
                              {b.type === 'acid'
                                ? '🧪'
                                : b.type === 'oil'
                                ? '🟣'
                                : b.type === 'poison'
                                ? '☠️'
                                : b.type === 'locked'
                                ? '⛓'
                                : b.type === 'blind'
                                ? '👁'
                                : '🔥'}
                            </span>
                            <span>
                              {b.label} {b.turns}T
                            </span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      className={`pointer-events-none select-none ${
                        isSevered
                          ? 'px-1.5 py-0.5 df-well opacity-45 text-[#6b635b]'
                          : isFocused
                          ? 'px-2.5 py-1 df-card-active text-[#c5a059] scale-110 ring-1 ring-[#fbbf24]'
                          : showExpanded
                          ? 'px-2.5 py-1 df-card-active text-[#c5a059] scale-105'
                          : 'px-2 py-0.5 df-card text-[#d3d3d3]'
                      }`}
                    >
                      {showExpanded ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap">
                            <span className="text-[#c96b6b]">⌖</span>
                            <span>{limb.name}</span>
                            <span className="font-mono text-xs text-[#c5a059]">
                              {isSevered ? '[ĐỨT]' : !targetable ? '[KHÓA]' : `${preview.hitPct}%`}
                            </span>
                          </div>
                          {isFocused && !isSevered && (
                            <div className="text-[11px] text-[#fbbf24] font-bold uppercase tracking-tighter mt-0.5">
                              {pendingSkillId ? '[Enter: TUNG KỸ NĂNG]' : '[Enter: TẤN CÔNG] • [ESC: Hủy]'}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-mono font-bold whitespace-nowrap">
                          <span className="text-[#c96b6b]">⌖</span>
                          <span>{isSevered ? 'ĐỨT' : !targetable ? '🔒' : `${preview.hitPct}%`}</span>
                        </div>
                      )}
                    </div>

                    {/* Damage Preview Side Tooltip (Min-Max Dmg, Hit %, Crit %, Armor) on Hover / WASD Focus */}
                    {showExpanded && !isSevered && (
                      <div
                        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${
                          tooltipOnLeft ? 'right-full mr-2' : 'left-full ml-2'
                        } w-48 df-panel p-3 text-xs text-[#d3d3d3] space-y-1`}
                      >
                        <div className="font-bold text-[#c5a059] border-b border-[#3a3a3a] pb-0.5">
                          <span>DỰ KIẾN SÁT THƯƠNG</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a3998f]">Sát thương:</span>
                          <span className="font-mono font-bold text-[#c96b6b]">
                            {preview.minDmg}–{preview.maxDmg}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a3998f]">Tỷ lệ Trúng:</span>
                          <span className="font-mono font-bold text-[#9ab08e]">{preview.hitPct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a3998f]">Tỷ lệ Chí mạng:</span>
                          <span className="font-mono font-bold text-[#c5a059]">{preview.critPct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a3998f]">Giáp bộ phận:</span>
                          <span className="font-mono font-bold text-[#94a3b8]">
                            {preview.armorPoints} (-{preview.armorReductionPct}%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Strip of Upper Stage: Recent Combat Log Line & Active Weapon Hint */}
          <div className="z-20 w-full bg-[#0b090f]/90 border-t border-[#3a3a3a] px-5 py-1.5 flex items-center justify-between text-xs sm:text-sm">
            <div className="text-[#d3d3d3] truncate max-w-3xl">
              <span className="text-[#c5a059] font-bold mr-2">Diễn biến:</span>
              {combatLogs[0]}
            </div>
            <div className="text-[#a3998f] shrink-0 hidden md:block text-xs">
              Lượt: <span className="text-[#c5a059] font-semibold">{actingName}</span> • Vũ khí:{' '}
              <span className="text-[#d3d3d3] font-semibold">{activeWeapon.name}</span> • Mục tiêu:{' '}
              <span className="text-[#c96b6b] font-semibold">{currentTargetLimb?.name}</span> •{' '}
              <span className="font-mono text-[#c5a059]">
                {combatFocusPhase === 'limb'
                  ? '[WASD] Chọn Bộ Phận • [Enter] Chém • [ESC] Hủy'
                  : `[W/S] Chọn • [Enter] Xác nhận • Phím tắt ${activeActorIdx === 0 ? '[1..6]' : '[1..4]'}`}
              </span>
            </div>
          </div>
        </div>

        {/* LOWER 36% DARK FANTASY CONTROL DOCK (100% Keyboard-Driven) */}
        <div className="h-[36%] min-h-[245px] w-full bg-[#08070b] p-2.5 sm:p-3 flex gap-2.5 sm:gap-3">
          {/* LEFT BOX (295px): Vertical Serif Command Buttons with Number Hotkeys */}
          <div className="w-[275px] sm:w-[300px] shrink-0 df-panel p-2.5 flex flex-col justify-between gap-1 overflow-y-auto pointer-events-none">
            {!activeCombatEnemy.defeated ? (
              <>
                <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#c5a059] px-1 truncate border-b border-[#3a3a3a] pb-0.5">
                  Lượt: {actingName}
                </div>
                <div
                  className={`w-full py-1 px-3 text-left text-sm font-bold truncate ${
                    isPureTankTurn || isResolvingTurn
                      ? 'df-btn opacity-45'
                      : combatFocusPhase === 'action' && combatActionCursor === 0
                      ? 'df-btn-active ring-1 ring-[#fbbf24]'
                      : 'df-btn'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {isPureTankTurn
                    ? '[1] 🔒 Khóa Công (Thuần Thủ)'
                    : `[1] ⚔ Đ.Thường (${currentTargetLimb?.name})`}
                </div>
                <div
                  className={`w-full py-1 px-3 text-left text-sm font-bold ${
                    combatMenuMode === 'skills' ||
                    (combatFocusPhase === 'action' && combatActionCursor === 1)
                      ? 'df-btn-active ring-1 ring-[#fbbf24]'
                      : 'df-btn'
                  } ${activeSkillIds.length === 0 ? 'opacity-45' : ''}`}
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  [2] ✦ K.Năng ({activeSkillIds.length})
                </div>
                <div
                  className={`w-full py-1 px-3 text-left text-sm font-bold ${
                    (combatFocusPhase === 'action' && combatActionCursor === 2) || isPureTankTurn
                      ? 'df-btn-active ring-1 ring-[#fbbf24]'
                      : 'df-btn'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {isPureTankTurn ? '[3] 🛡 Khiên Linh Hồn (+Đội)' : '[3] 🛡 Phòng Thủ'}
                </div>
                <div
                  className={`w-full py-1 px-3 text-left text-sm font-bold ${
                    combatMenuMode === 'items' ||
                    (combatFocusPhase === 'action' && combatActionCursor === 3)
                      ? 'df-btn-active ring-1 ring-[#fbbf24]'
                      : 'df-btn'
                  } ${usableCombatItems.length === 0 ? 'opacity-45' : ''}`}
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  [4] 🧪 Vật Phẩm ({usableCombatItems.length})
                </div>
                {activeActorIdx === 0 && (
                  <>
                    <div
                      className={`w-full py-1 px-3 text-left text-sm font-bold text-[#9ab08e] ${
                        combatFocusPhase === 'action' && combatActionCursor === 4
                          ? 'df-btn-active ring-1 ring-[#fbbf24]'
                          : 'df-btn'
                      }`}
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      [5] 💬 Trò Chuyện
                    </div>
                    <div
                      className={`w-full py-1 px-3 text-left text-sm font-bold text-[#a3998f] ${
                        combatFocusPhase === 'action' && combatActionCursor === 5
                          ? 'df-btn-active ring-1 ring-[#fbbf24]'
                          : 'df-btn'
                      }`}
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      [6] 🏃 Bỏ Chạy
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="my-auto text-center space-y-2 p-2">
                <div className="text-base font-bold uppercase text-[#c5a059]">Chiến Thắng!</div>
                <div className="w-full py-2.5 df-btn-bronze font-bold text-sm uppercase">
                  [Enter] Thoát
                </div>
              </div>
            )}
          </div>

          {/* RIGHT BOX: Dynamic Sub-Menu OR Horizontal Party Status Table */}
          <div className="flex-1 df-panel p-3 overflow-y-auto flex flex-col justify-between pointer-events-none">
            {combatMenuMode === 'skills' && !activeCombatEnemy.defeated ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-1.5">
                  <span className="text-xs sm:text-sm font-bold uppercase text-[#c5a059]">
                    Chọn Kỹ Năng — {actingName}
                  </span>
                  <span className="text-xs text-[#a3998f] font-mono">
                    [WASD] Chọn • [Enter] Dùng • [ESC] Quay lại
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {activeSkillIds.map((skId, sIdx) => {
                    const sk = CONFIG.SKILLS.find((s) => s.id === skId);
                    if (!sk) return null;
                    const lv = activeAlly
                      ? activeAlly.isUndeadSummon
                        ? Math.max(1, player.skillLevels.necromancy || 1)
                        : 1
                      : player.skillLevels[skId] || 1;
                    const curMind = activeAlly ? activeAlly.mind : player.mind;
                    const lockedByHoly =
                      !activeAlly && !canUseHolySkill(player, sk).allowed;
                    const isCursor =
                      combatFocusPhase === 'skills_menu' &&
                      sIdx === combatSubCursor % Math.max(1, activeSkillIds.length);
                    return (
                      <div
                        key={sk.id}
                        className={`p-2.5 text-left text-xs sm:text-sm ${
                          curMind < sk.mindCost || lockedByHoly ? 'opacity-40' : ''
                        } ${isCursor ? 'df-card-active ring-1 ring-[#fbbf24]' : 'df-card'}`}
                      >
                        <div className="flex justify-between font-bold text-[#c5a059]">
                          <span>
                            {sk.name} (Cấp {lv})
                          </span>
                          <span>-{sk.mindCost} Lý Trí</span>
                        </div>
                        <div className="text-xs text-[#d3d3d3] mt-0.5">{sk.descLv1}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : combatMenuMode === 'items' && !activeCombatEnemy.defeated ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-1.5">
                  <span className="text-xs sm:text-sm font-bold uppercase text-[#c5a059]">
                    Chọn Vật Phẩm Thực Dụng ({actingName})
                  </span>
                  <span className="text-xs text-[#a3998f] font-mono">
                    [WASD] Chọn • [Enter] Dùng • [ESC] Quay lại
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {usableCombatItems.map(([itemId, count], iIdx) => {
                    const item = CONFIG.ITEMS[itemId];
                    if (!item) return null;
                    const isCursor =
                      combatFocusPhase === 'items_menu' &&
                      iIdx === combatSubCursor % Math.max(1, usableCombatItems.length);
                    return (
                      <div
                        key={itemId}
                        className={`p-2.5 flex items-center gap-2.5 text-left text-xs sm:text-sm ${
                          isCursor ? 'df-card-active ring-1 ring-[#fbbf24]' : 'df-card'
                        }`}
                      >
                        <ItemArtworkCanvas itemOrWeaponId={itemId} size={36} />
                        <div className="min-w-0">
                          <div className="font-bold text-[#c5a059] truncate">
                            {item.name} (x{count})
                          </div>
                          <div className="text-xs text-[#d3d3d3] truncate">{item.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* DEFAULT: HORIZONTAL PARTY STATUS ROWS */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-4 text-xs sm:text-sm uppercase tracking-wider text-[#a3998f] border-b border-[#3a3a3a] pb-1.5">
                  <span>Đội Hình & Trạng Thái Tứ Chi</span>
                  <span className="text-xs font-mono">W/S/A/D Chọn • Enter/Space Xác nhận • ESC Quay lại</span>
                </div>

                {/* Row 1: Main Character */}
                <div
                  className={`p-2.5 sm:p-3 grid grid-cols-12 items-center gap-3 text-sm ${
                    activeActorIdx === 0 && !activeCombatEnemy.defeated
                      ? 'df-card-active'
                      : 'df-card'
                  }`}
                >
                  <div className="col-span-3 flex items-center min-w-0">
                    <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                      <span className="text-sm sm:text-base font-bold text-[#c5a059] truncate">
                        {player.name}
                      </span>
                      {activeActorIdx === 0 && !activeCombatEnemy.defeated && (
                        <span className="text-xs text-[#c5a059] font-bold">
                          [ĐANG CHỌN]
                        </span>
                      )}
                      {player.statuses.guarding && (
                        <span className="text-xs text-[#94a3b8] font-bold">[THỦ]</span>
                      )}
                      {player.statuses.bleeding && (
                        <span className="text-xs text-[#c96b6b] font-bold">
                          🩸 CHẢY MÁU
                        </span>
                      )}
                      {Object.values(player.limbs.infected).some(Boolean) && (
                        <span className="text-xs text-[#d97706] font-bold">
                          ☣️ NHIỄM TRÙNG
                        </span>
                      )}
                      {!player.statuses.bleeding && (player.statuses.bleedImmunityTurns || 0) > 0 && (
                        <span className="text-xs text-[#9ab08e] font-bold">
                          🩹 ĐÃ CẦM MÁU
                        </span>
                      )}
                      {player.hunger < 50 && !player.statuses.bleeding && (
                        <span className="text-xs text-[#9ab08e] font-bold">[NHANH]</span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-[#c96b6b] font-semibold">Sinh Lực</span>
                      <span className="font-mono font-bold text-[#d3d3d3]">
                        {player.hp}/{player.maxHp}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-[#1a0b0d] border border-[#5e1414]">
                      <div
                        className="h-full bg-[#8b0000]"
                        style={{ width: `${Math.max(0, Math.min(100, (player.hp / Math.max(1, player.maxHp)) * 100))}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-[#94a3b8] font-semibold">Lý Trí</span>
                      <span className="font-mono font-bold text-[#d3d3d3]">
                        {player.mind}/{player.maxMind}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-[#11161d] border border-[#3a4a5e]">
                      <div
                        className="h-full bg-[#4d627a]"
                        style={{ width: `${Math.max(0, Math.min(100, (player.mind / Math.max(1, player.maxMind)) * 100))}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-4 flex flex-wrap gap-1.5 justify-end">
                    {(
                      [
                        ['leftArm', 'Tay T'],
                        ['rightArm', 'Tay P'],
                        ['leftLeg', 'Chân T'],
                        ['rightLeg', 'Chân P'],
                      ] as const
                    ).map(([k, label]) => {
                      const intact = player.limbs[k];
                      const inf = player.limbs.infected[k];
                      return (
                        <span
                          key={k}
                          className={`px-2 py-1 text-xs sm:text-sm font-medium border ${
                            !intact
                              ? 'bg-[#2a0c10] border-[#8b0000] text-[#c96b6b] line-through'
                              : inf
                              ? 'bg-[#261d0e] border-[#c5a059] text-[#c5a059]'
                              : 'bg-[#121914] border-[#3a3a3a] text-[#9ab08e]'
                          }`}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2+: Up to 3 Recruited Allies / Undead Summons */}
                {player.party.slice(0, 3).map((ally, idx) => {
                  const isTurn = activeActorIdx === idx + 1 && !activeCombatEnemy.defeated;
                  const isDead = ally.hp <= 0;
                  const isFrenzied = ally.mind < 30 && !isDead;
                  return (
                    <div
                      key={ally.id}
                      className={`p-2.5 sm:p-3 grid grid-cols-12 items-center gap-3 text-sm ${
                        isDead
                          ? 'df-well opacity-45'
                          : isTurn
                          ? 'df-card-active'
                          : 'df-card'
                      }`}
                    >
                      <div className="col-span-3 flex items-center min-w-0">
                        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                          <span className="text-sm sm:text-base font-bold text-[#d3d3d3] truncate">
                            {ally.name}
                          </span>
                          {isTurn && (
                            <span className="text-xs text-[#c5a059] font-bold">
                              [ĐANG CHỌN]
                            </span>
                          )}
                          <span className="text-xs font-bold text-[#a889b8]">
                            {ally.isUndeadSummon ? '[CHIÊU HỒN]' : '[ĐỒNG ĐỘI]'}
                          </span>
                          {isPureTankSummon(ally) && (
                            <span className="px-1.5 py-0.5 bg-[#191620] border border-[#3a3a3a] text-xs text-[#d3d3d3] font-bold">
                              [THUẦN THỦ]
                            </span>
                          )}
                          {ally.guarding && (
                            <span className="px-1.5 py-0.5 bg-[#1b1714] border border-[#c5a059] text-xs text-[#c5a059] font-bold">[THỦ]</span>
                          )}
                          {(ally.stunnedTurns || 0) > 0 && (
                            <span className="px-1.5 py-0.5 bg-[#291e0e] border border-[#c5a059] text-xs text-[#e5cfa0] font-bold">
                              [CHOÁNG]
                            </span>
                          )}
                          {isFrenzied && (
                            <span className="px-1.5 py-0.5 bg-[#2e0b0f] border border-[#8b0000] text-xs text-[#d3d3d3] font-bold">
                              {ally.isUndeadSummon ? '[CUỒNG LOẠN]' : '[HOẢNG LOẠN]'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="flex justify-between text-xs sm:text-sm mb-1">
                          <span className="text-[#c96b6b] font-semibold">Sinh Lực</span>
                          <span className="font-mono font-bold text-[#d3d3d3]">
                            {ally.hp}/{ally.maxHp}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-[#1a0a0d] border border-[#3a3a3a]">
                          <div
                            className="h-full bg-[#8b0000]"
                            style={{ width: `${Math.max(0, Math.min(100, (ally.hp / Math.max(1, ally.maxHp)) * 100))}%` }}
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex justify-between text-xs sm:text-sm mb-1">
                          <span className="text-[#a3b2c4] font-semibold">Lý Trí</span>
                          <span className="font-mono font-bold text-[#d3d3d3]">
                            {ally.mind}/{ally.maxMind}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-[#11151d] border border-[#3a3a3a]">
                          <div
                            className="h-full bg-[#5b6f8a]"
                            style={{ width: `${Math.max(0, Math.min(100, (ally.mind / Math.max(1, ally.maxMind)) * 100))}%` }}
                          />
                        </div>
                      </div>
                      <div className="col-span-4 flex flex-wrap gap-1.5 justify-end">
                        {(
                          [
                            ['leftArm', 'Tay T'],
                            ['rightArm', 'Tay P'],
                            ['leftLeg', 'Chân T'],
                            ['rightLeg', 'Chân P'],
                          ] as const
                        ).map(([k, label]) => {
                          const intact = ally.limbs?.[k] ?? true;
                          const inf = ally.limbs?.infected?.[k] ?? false;
                          return (
                            <span
                              key={k}
                              className={`px-2 py-1 text-xs sm:text-sm font-medium border ${
                                !intact
                                  ? 'bg-[#2a0c10] border-[#8b0000] text-[#c96b6b] line-through'
                                  : inf
                                  ? 'bg-[#261d0e] border-[#c5a059] text-[#c5a059]'
                                  : 'bg-[#121914] border-[#3a3a3a] text-[#9ab08e]'
                              }`}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {renderCoinTossModal()}
      </div>
    );
  }

  // ============================================================================
  // RENDER: EXPLORATION MODE (PLAYING)
  // ============================================================================
  const activeWeapon = getEffectiveWeapon(player);
  const computedStats = getComputedPlayerStats(player);

  return (
    <div className="h-screen w-screen bg-[#070609] text-[#e7dcc8] flex flex-col overflow-hidden select-none">
      {/* Minimalist Gothic Top Status Bar */}
      <header className="bg-[#0d0b0f] border-b border-[#3a3a3a] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div
            className={`w-36 sm:w-44 h-2.5 overflow-hidden border ${
              player.corruption >= 60
                ? 'bg-[#170b1c] border-[#8b0000]'
                : player.corruption > 0
                ? 'bg-[#1c0d12] border-[#8b0000]'
                : 'bg-[#0e1410] border-[#3a3a3a]'
            }`}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.max(10, Math.min(100, player.corruption))}%`,
                backgroundColor: '#2d4530',
                backgroundImage:
                  player.corruption <= 0
                    ? 'none'
                    : 'linear-gradient(90deg, #2d4530 0%, #8b0000 55%, #5b2e6e 100%)',
                backgroundSize: '176px 100%',
              }}
            />
          </div>
          {/* Compact 3-God Affinity Status Badges */}
          <div
            className="flex items-center gap-1"
            title="Tín Ngưỡng với 3 Thực Thể — Dùng để học phép nhánh Thánh Mẫu, Hư Vô và Huyết Quỷ tại Đài Cộng Hưởng"
          >
            {(
              [
                {
                  key: 'holyMother' as const,
                  icon: '✝',
                  name: 'Thánh Mẫu',
                  val: player.affinities?.holyMother || 0,
                  locked: player.holyMagicLocked,
                  activeClass: 'bg-[#261d0e] border-[#c5a059] text-[#dfd2b4]',
                  idleClass: 'bg-[#110f14] border-[#3a3a3a] text-[#8d857b]',
                },
                {
                  key: 'primordialVoid' as const,
                  icon: '🌌',
                  name: 'Hư Vô Nguyên Thủy',
                  val: player.affinities?.primordialVoid || 0,
                  locked: false,
                  activeClass: 'bg-[#1d1226] border-[#8e6ca3] text-[#d3d3d3]',
                  idleClass: 'bg-[#110f14] border-[#3a3a3a] text-[#8d857b]',
                },
                {
                  key: 'demonicPact' as const,
                  icon: '🩸',
                  name: 'Huyết Quỷ',
                  val: player.affinities?.demonicPact || 0,
                  locked: false,
                  activeClass: 'bg-[#2b0c10] border-[#8b0000] text-[#d3d3d3]',
                  idleClass: 'bg-[#110f14] border-[#3a3a3a] text-[#8d857b]',
                },
              ] as const
            ).map((g) => (
              <span
                key={g.key}
                title={`${g.name}: Tín Ngưỡng ${g.val}/3${
                  g.locked ? ' (Đã bị khóa)' : ''
                }`}
                className={`px-2 py-0.5 border font-mono text-xs leading-none flex items-center gap-1 transition-all ${
                  g.locked
                    ? 'bg-[#1a0b0d] border-[#8b0000] text-[#7f4950] line-through'
                    : g.val > 0
                    ? g.activeClass
                    : g.idleClass
                } ${
                  recentAffinityPillar === g.key
                    ? 'ring-2 ring-[#c5a059] scale-105 animate-pulse'
                    : ''
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.val}</span>
              </span>
            ))}
          </div>
          {(isPlayerPanicking(player) || player.party.some((a) => a.hp > 0 && a.mind < 30)) && (
            <span className="px-2 py-0.5 bg-[#2e0b0f] border border-[#8b0000] text-[#d3d3d3] font-bold animate-pulse">
              😱 HOẢNG LOẠN
            </span>
          )}
        </div>

        {/* Quick Modal Action Buttons (Hexen & Save/Load are strictly world interactions) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveModal('inventory')}
            className="df-btn px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Backpack className="w-3.5 h-3.5 text-[#c5a059]" /> Túi [I]
          </button>
          <button
            onClick={() => setActiveModal('lore')}
            className="df-btn px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#c5a059]" /> Sách ({player.readBookIds.length}/{CONFIG.BOOKS.length}) [L]
          </button>
          <button
            onClick={() => setActiveModal('guide')}
            className="df-btn px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="Sách Hướng Dẫn Sinh Tồn [?]"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#c5a059]" /> Cẩm Nang [?]
          </button>
          <button
            onClick={() => {
              setConfirmReturnTitle(false);
              setActiveModal('settings');
            }}
            className="df-btn px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="Cài Đặt Hệ Thống [ESC]"
          >
            <Settings className="w-3.5 h-3.5 text-[#c5a059]" /> Cài Đặt [ESC]
          </button>
          <button
            onClick={() => {
              const nextMuted = !muted;
              const updated = sfx.updateSettings({ muted: nextMuted });
              setAudioSettings(updated);
              setMuted(nextMuted);
            }}
            className="df-btn p-1.5 text-xs cursor-pointer"
            title="Bật/Tắt Âm Thanh"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-[#d3d3d3]" /> : <Volume2 className="w-3.5 h-3.5 text-[#c5a059]" />}
          </button>
        </div>
      </header>

      {/* Main Content: Full-Width Dungeon Stage with Right-Side Horizontal Action Confirmation & On-Demand Narrative Log */}
      <div className="flex-1 min-h-0 max-w-[1440px] w-full mx-auto p-2.5 flex flex-col">
        <div className="w-full h-full min-h-0 flex flex-col gap-2">
          {/* Canvas Container */}
          <div className="relative flex-1 min-h-0 flex flex-col df-panel overflow-hidden">
            {/* Top-Left Area Name Banner */}
            <div className="absolute top-2.5 left-2.5 z-10 df-well px-3 py-1.5 pointer-events-none">
              <div className="text-[11px] uppercase tracking-widest text-[#c5a059]">Khu Vực</div>
              <div
                className="text-sm sm:text-base font-bold text-[#d3d3d3]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {areaBannerText}
              </div>
            </div>

            {/* God Affinity Increase Notification Toast */}
            {affinityToast && (
              <div
                key={affinityToast.id}
                className={`absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] sm:w-auto px-4 py-2.5 df-panel flex items-start justify-between gap-3 ${
                  affinityToast.pillar === 'holyMother'
                    ? 'text-[#dfd2b4]'
                    : affinityToast.pillar === 'primordialVoid'
                    ? 'text-[#d3d3d3]'
                    : 'text-[#d68888]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#c5a059]">
                    <span>
                      {affinityToast.pillar === 'holyMother'
                        ? '✝'
                        : affinityToast.pillar === 'primordialVoid'
                        ? '🌌'
                        : '🩸'}
                    </span>
                    <span>
                      Tín Ngưỡng {affinityToast.godName} đã tăng! ({affinityToast.prevVal} →{' '}
                      {affinityToast.nextVal}/3)
                    </span>
                  </div>
                  <div className="text-[11px] text-[#d3d3d3]">
                    {affinityToast.unlockedSkills.length > 0
                      ? `✨ Khai mở tại Đài Cộng Hưởng: ${affinityToast.unlockedSkills.join(', ')}`
                      : `🔮 Cộng hưởng thần lực đạt bậc ${affinityToast.nextVal}.`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAffinityToast(null)}
                  className="text-xs opacity-70 hover:opacity-100 px-1 cursor-pointer text-[#d3d3d3]"
                  aria-label="Đóng thông báo Tín Ngưỡng"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="relative flex-1 min-h-0 flex items-center justify-center bg-[#050407] p-1 overflow-hidden">
              <DungeonMapViewport
                room={currentRoom}
                player={player}
                playerPos={playerPos}
                trailCoords={trailCoords}
                animTick={animTick}
                isInteractivePaused={Boolean(activeModal || coinToss || interactionMenu)}
                riftElixirCollected={riftElixirCollected}
                filmGrainEnabled={audioSettings.filmGrainEnabled}
                onTileClick={(tx, ty) => {
                  const dx = tx - playerPos.x;
                  const dy = ty - playerPos.y;
                  if (Math.abs(dx) + Math.abs(dy) === 1) {
                    attemptMove(dx, dy);
                  } else if (dx === 0 && dy === 0) {
                    handleTileInteraction();
                  }
                }}
                onEnemyCollidePlayer={(enemy) => {
                  startCombatWithEnemy(enemy);
                }}
              />
              {/* Continuous Pale Light-Gray Drifting Mist Ambient Overlays */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[-8%] z-10 df-explore-mist-a"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[-10%] z-10 df-explore-mist-b"
              />
            </div>

            {/* Fear & Hunger / Termina Style RPG Bottom Dialogue Box + Docked Right-Side Choice Window */}
            {(interactionMenu || logOverlayVisible) && (
              <div className="absolute inset-x-4 bottom-8 z-30">
                {/* Docked Right-Side Choice Window (Flush above the right side of the bottom dialogue box) */}
                {interactionMenu ? (
                  <div className="ml-auto w-fit min-w-[310px] max-w-[540px] mb-[2px] df-panel px-3.5 py-2.5 space-y-1">
                    {interactionMenu.choices.map((choice, idx) => {
                      const isSelected = idx === interactionMenu.selectedIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onMouseEnter={() =>
                            setInteractionMenu((prev) =>
                              prev ? { ...prev, selectedIndex: idx } : null
                            )
                          }
                          onClick={() => choice.onSelect()}
                          className={`w-full text-left px-4 py-1.5 font-serif text-sm sm:text-base tracking-wide transition cursor-pointer ${
                            isSelected
                              ? 'text-[#f3e6c4] font-semibold'
                              : 'text-[#d3d3d3]/75 hover:text-[#f3e6c4]'
                          }`}
                          style={
                            isSelected
                              ? {
                                  background:
                                    'radial-gradient(ellipse at center, rgba(139, 0, 0, 0.92) 0%, rgba(90, 8, 12, 0.65) 55%, rgba(15, 10, 12, 0) 100%)',
                                  textShadow: '0 0 8px rgba(197, 160, 89, 0.55)',
                                }
                              : undefined
                          }
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ml-auto w-fit min-w-[230px] mb-[2px] df-panel px-3.5 py-2">
                    <button
                      type="button"
                      onClick={() => setLogOverlayVisible(false)}
                      className="w-full text-left px-4 py-1 font-serif text-sm sm:text-base tracking-wide text-[#f3e6c4] font-semibold cursor-pointer"
                      style={{
                        background:
                          'radial-gradient(ellipse at center, rgba(139, 0, 0, 0.92) 0%, rgba(90, 8, 12, 0.65) 55%, rgba(15, 10, 12, 0) 100%)',
                        textShadow: '0 0 8px rgba(197, 160, 89, 0.55)',
                      }}
                    >
                      Tiếp tục hành trình [F]
                    </button>
                  </div>
                )}

                {/* Bottom RPG Dialogue Box with Gothic Illuminated Drop-Cap Nameplate ([L]EVI style) */}
                <div className="df-panel px-5 py-3.5 min-h-[112px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      {(() => {
                        const rawSpeaker = (interactionMenu?.title || 'NHẬT KÝ HÀNH TRÌNH').trim();
                        const firstChar = rawSpeaker.charAt(0).toUpperCase();
                        const restChars = rawSpeaker.slice(1).toUpperCase();
                        return (
                          <div className="inline-flex items-end gap-1 select-none">
                            <span
                              className="w-6 h-6 bg-[#d3d3d3] text-[#09070a] border border-[#c5a059] font-black text-base flex items-center justify-center leading-none shadow-sm"
                              style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                              {firstChar}
                            </span>
                            <span
                              className="text-xs sm:text-sm font-bold tracking-[0.14em] text-[#c5a059] uppercase leading-none pb-0.5"
                              style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                              {restChars}
                            </span>
                          </div>
                        );
                      })()}
                      <span className="text-[10px] text-[#9b8f82] font-mono">
                        {interactionMenu
                          ? '[W/S] Chọn • [F / Enter] Xác nhận • [ESC] Đóng'
                          : '[F / ESC] Đóng'}
                      </span>
                    </div>

                    {interactionMenu ? (
                      <div className="text-sm sm:text-base font-serif text-[#d3d3d3] leading-relaxed">
                        {interactionMenu.description.startsWith('“') ||
                        interactionMenu.description.startsWith('"')
                          ? interactionMenu.description
                          : `“${interactionMenu.description}”`}
                      </div>
                    ) : (
                      <div className="max-h-20 overflow-y-auto space-y-1 pr-1 text-xs sm:text-sm font-serif">
                        {narrativeLogs.slice(0, 4).map((log, i) => (
                          <div
                            key={i}
                            className={`leading-snug ${
                              i === 0 ? 'text-[#d3d3d3] font-semibold' : 'text-[#9b8f82] text-xs'
                            }`}
                          >
                            • {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Slim Bottom Sensory Line */}
            <div
              className="shrink-0 bg-[#0b090e]/95 border-t border-[#3b2f2d] px-3.5 py-1.5 text-xs sm:text-sm text-[#cfc0a9] italic flex items-center justify-between gap-2"
              title={currentRoom.sensoryLine}
            >
              <span className="truncate">“{currentRoom.sensoryLine}”</span>
              <span className="not-italic text-xs font-mono text-[#9c8c76] shrink-0">
                ({playerPos.x}, {playerPos.y})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          MODAL 1: 4-MEMBER PARTY EQUIPMENT, 6 STATS & ALCHEMY ([I])
      ======================================================================== */}
      {activeModal === 'inventory' && (() => {
        const safeInvIdx = selectedInvMemberIdx <= player.party.length ? selectedInvMemberIdx : 0;
        const selectedAlly = safeInvIdx > 0 ? player.party[safeInvIdx - 1] || null : null;
        const isAllyLocked = isAllyGearLocked(selectedAlly);
        const isSelectedPureTank = isPureTankSummon(selectedAlly);
        const allyComputed = selectedAlly ? getAllyComputedStats(selectedAlly, player) : null;
        const memberStats = selectedAlly && allyComputed
          ? {
              physAtk: allyComputed.physAtk,
              physDefPct: allyComputed.physDefPct,
              magAtk: allyComputed.magAtk,
              magDefPct: allyComputed.magDefPct,
              agility: allyComputed.agility,
              luck: Math.round(getAllyEffectiveWeapon(selectedAlly).critChance * 100),
            }
          : computedStats;
        const memberHp = selectedAlly ? selectedAlly.hp : player.hp;
        const memberMaxHp = selectedAlly ? selectedAlly.maxHp : player.maxHp;
        const memberMind = selectedAlly ? selectedAlly.mind : player.mind;
        const memberMaxMind = selectedAlly ? selectedAlly.maxMind : player.maxMind;
        const memberHunger = selectedAlly ? (selectedAlly.isUndeadSummon ? 0 : selectedAlly.hunger || 0) : player.hunger;
        const memberLimbs = selectedAlly ? selectedAlly.limbs : player.limbs;
        const memberStatuses = selectedAlly
          ? {
              bleeding: Boolean(selectedAlly.statuses?.bleeding),
              poisoned: Boolean(selectedAlly.statuses?.poisoned),
              parasite: Boolean(selectedAlly.statuses?.parasite),
              blindedTurns: 0,
            }
          : player.statuses;
        const curWpnId = selectedAlly ? selectedAlly.weaponId : player.equippedWeapon;
        const curShieldId = selectedAlly ? selectedAlly.equippedShield : player.equippedShield;
        const curHeadId = selectedAlly ? selectedAlly.equippedHead : player.equippedHead;
        const curBodyId = selectedAlly ? selectedAlly.equippedBody : player.equippedBody;
        const curAccId = selectedAlly ? selectedAlly.equippedAccessory : player.equippedAccessory;
        const selectedMemberName = selectedAlly ? selectedAlly.name : player.name;
        const isSelectedUndead = Boolean(selectedAlly?.isUndeadSummon);

        const renderMemberSurvivalPanel = (compact = false) => (
          <div className={`df-well ${compact ? 'p-3' : 'p-2.5'} space-y-2`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a3a3a]/60 pb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#c5a059]">
                Trạng Thái Sinh Tồn — {selectedMemberName}
              </span>
              <div className="flex items-center gap-1.5">
                {memberMind < 30 && (
                  <span className="px-1.5 py-0.5 bg-[#2e0b0f] border border-[#8b0000] text-[10px] font-bold text-[#d3d3d3]">
                    Lý Trí &lt; 30 (Hoảng Loạn)
                  </span>
                )}
                {!isSelectedUndead && memberHunger >= 80 ? (
                  <span className="px-1.5 py-0.5 bg-[#2e0b0f] border border-[#8b0000] text-[10px] font-bold text-[#c96b6b]">
                    Đói ≥ 80 (Kiệt Sức)
                  </span>
                ) : !isSelectedUndead && memberHunger >= 50 ? (
                  <span className="px-1.5 py-0.5 bg-[#261d0e] border border-[#c5a059] text-[10px] font-bold text-[#c5a059]">
                    Đói ≥ 50 (Cồn Cào -25% Sát Thương)
                  </span>
                ) : null}
              </div>
            </div>
            <div className={`grid ${compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'} gap-2.5`}>
              {/* Sinh Lực */}
              <div>
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="flex items-center gap-1 text-[#c96b6b] font-bold">
                    <Heart className="w-3 h-3" /> Sinh Lực
                  </span>
                  <span className="font-mono text-[#d3d3d3]">
                    {memberHp}/{memberMaxHp}
                  </span>
                </div>
                <div className="w-full h-2 bg-[#1a0a0d] border border-[#3a3a3a]">
                  <div
                    className="h-full bg-[#8b0000] transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, (memberHp / Math.max(1, memberMaxHp)) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Lý Trí */}
              <div>
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="flex items-center gap-1 text-[#a3b2c4] font-bold">
                    <Brain className="w-3 h-3" /> Lý Trí
                  </span>
                  <span className={`font-mono ${memberMind < 30 ? 'text-[#c96b6b] font-bold' : 'text-[#d3d3d3]'}`}>
                    {memberMind}/{memberMaxMind}
                  </span>
                </div>
                <div className="w-full h-2 bg-[#11151d] border border-[#3a3a3a]">
                  <div
                    className="h-full bg-[#5b6f8a] transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, (memberMind / Math.max(1, memberMaxMind)) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Độ Đói */}
              {(() => {
                const hungerDanger = !isSelectedUndead && memberHunger >= 80;
                return (
                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span
                        className={`font-bold transition-colors ${
                          hungerDanger ? 'text-[#ef4444]' : 'text-[#eab308]'
                        }`}
                      >
                        Độ Đói
                      </span>
                      {isSelectedUndead ? (
                        <span className="text-[10px] italic text-[#a889b8]">Bất tử — Không cần ăn</span>
                      ) : (
                        <span
                          className={`font-mono font-bold ${
                            hungerDanger
                              ? 'text-[#ef4444]'
                              : memberHunger >= 50
                              ? 'text-[#f59e0b]'
                              : 'text-[#e5c158]'
                          }`}
                        >
                          {memberHunger}/100
                        </span>
                      )}
                    </div>
                    {isSelectedUndead ? (
                      <div className="flex items-center gap-2">
                        <HungerBowlIcon className="w-4 h-4 shrink-0 opacity-40" />
                        <div className="flex-1 h-2 bg-[#1a1220] border border-[#3a3a3a]" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <HungerBowlIcon className="w-4 h-4 shrink-0" isDanger={hungerDanger} />
                        <div
                          className={`flex-1 h-2 border transition-colors ${
                            hungerDanger
                              ? 'bg-[#26090b] border-[#b91c1c]'
                              : 'bg-[#1d170f] border-[#6b531c]'
                          }`}
                        >
                          <div
                            className={`h-full transition-all duration-300 ${
                              hungerDanger
                                ? 'bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.85)]'
                                : 'bg-[#eab308]'
                            }`}
                            style={{ width: `${Math.max(0, Math.min(100, memberHunger))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full df-panel p-6 space-y-4 max-h-[92vh] overflow-y-auto">
              {/* Top Navigation Tabs */}
              <div className="flex flex-wrap items-center justify-between border-b border-[#3a3a3a] pb-3 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setInvTab('equip')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase cursor-pointer ${
                      invTab === 'equip' ? 'df-btn-active' : 'df-btn'
                    }`}
                  >
                    Trang Bị, Giải Phẫu &amp; 6 Chỉ Số
                  </button>
                  <button
                    onClick={() => setInvTab('items')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase cursor-pointer ${
                      invTab === 'items' ? 'df-btn-active' : 'df-btn'
                    }`}
                  >
                    Túi Đồ Thực Dụng &amp; Giả Kim
                  </button>
                  {isAmputating && (
                    <button
                      onClick={() => setInvTab('saw')}
                      className={`px-3 py-1.5 text-xs font-bold uppercase cursor-pointer ${
                        invTab === 'saw' ? 'df-btn-active' : 'df-btn'
                      }`}
                    >
                      Cưa Xương &amp; Giải Phẫu
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
                >
                  Đóng [ESC]
                </button>
              </div>

              {/* 4-Member Party Selector Strip with Mini 3 Survival Bars (hidden during 3-step Bone Saw workflow) */}
              {invTab !== 'saw' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvMemberIdx(0);
                    setPreviewItemId(player.equippedWeapon);
                    setInvFeedback(null);
                  }}
                  className={`p-2.5 text-left text-xs cursor-pointer space-y-1.5 ${
                    safeInvIdx === 0 ? 'df-card-active text-[#dfd2b4]' : 'df-card text-[#9b8f82]'
                  }`}
                >
                  <div className="font-bold truncate flex items-center justify-between gap-1">
                    <span className="truncate">★ {player.name}</span>
                    <span className="text-[11px] text-[#c5a059] shrink-0">[CHÍNH]</span>
                  </div>
                  <div className="space-y-1 text-[11px] font-mono">
                    <div>
                      <div className="flex justify-between text-[#c96b6b]">
                        <span>Sinh Lực</span>
                        <span>{player.hp}/{player.maxHp}</span>
                      </div>
                      <div className="w-full h-1 bg-[#1a0a0d] border border-[#3a3a3a]">
                        <div
                          className="h-full bg-[#8b0000]"
                          style={{ width: `${Math.max(0, Math.min(100, (player.hp / Math.max(1, player.maxHp)) * 100))}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[#a3b2c4]">
                        <span>Lý Trí</span>
                        <span>{player.mind}/{player.maxMind}</span>
                      </div>
                      <div className="w-full h-1 bg-[#11151d] border border-[#3a3a3a]">
                        <div
                          className="h-full bg-[#5b6f8a]"
                          style={{ width: `${Math.max(0, Math.min(100, (player.mind / Math.max(1, player.maxMind)) * 100))}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div
                        className={`flex justify-between items-center ${
                          player.hunger >= 80 ? 'text-[#ef4444] font-bold' : 'text-[#eab308]'
                        }`}
                      >
                        <span>Đói</span>
                        <span>{player.hunger}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <HungerBowlIcon
                          className="w-3 h-3 shrink-0"
                          isDanger={player.hunger >= 80}
                        />
                        <div
                          className={`flex-1 h-1 border ${
                            player.hunger >= 80
                              ? 'bg-[#26090b] border-[#b91c1c]'
                              : 'bg-[#1d170f] border-[#6b531c]'
                          }`}
                        >
                          <div
                            className={`h-full transition-all duration-300 ${
                              player.hunger >= 80
                                ? 'bg-[#ef4444] shadow-[0_0_6px_rgba(239,68,68,0.85)]'
                                : 'bg-[#eab308]'
                            }`}
                            style={{ width: `${Math.max(0, Math.min(100, player.hunger))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
                {[0, 1, 2].map((slotIdx) => {
                  const ally = player.party[slotIdx];
                  if (!ally) {
                    return (
                      <div
                        key={`empty_${slotIdx}`}
                        className="p-2 df-well opacity-45 text-xs text-[#7a7066] flex items-center justify-center"
                      >
                        [Ô Đồng Đội #{slotIdx + 1} Trống]
                      </div>
                    );
                  }
                  const active = safeInvIdx === slotIdx + 1;
                  const allyHunger = ally.isUndeadSummon ? 0 : ally.hunger || 0;
                  return (
                    <button
                      key={ally.id}
                      type="button"
                      onClick={() => {
                        setSelectedInvMemberIdx(slotIdx + 1);
                        setPreviewItemId(ally.weaponId || ally.equippedBody || 'rotten_wood_shield');
                        setInvFeedback(null);
                      }}
                      className={`p-2.5 text-left text-xs cursor-pointer space-y-1.5 ${
                        active ? 'df-card-active text-[#dfd2b4]' : 'df-card text-[#9b8f82]'
                      }`}
                    >
                      <div className="font-bold truncate flex items-center justify-between gap-1">
                        <span className="truncate">{ally.name}</span>
                        <span className="text-[11px] text-[#a889b8] shrink-0">
                          {ally.isUndeadSummon ? '[CHIÊU HỒN]' : '[ĐỒNG ĐỘI]'}
                        </span>
                      </div>
                      <div className="space-y-1 text-[11px] font-mono">
                        <div>
                          <div className="flex justify-between text-[#c96b6b]">
                            <span>Sinh Lực</span>
                            <span>{ally.hp}/{ally.maxHp}</span>
                          </div>
                          <div className="w-full h-1 bg-[#1a0a0d] border border-[#3a3a3a]">
                            <div
                              className="h-full bg-[#8b0000]"
                              style={{ width: `${Math.max(0, Math.min(100, (ally.hp / Math.max(1, ally.maxHp)) * 100))}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[#a3b2c4]">
                            <span>Lý Trí</span>
                            <span>{ally.mind}/{ally.maxMind}</span>
                          </div>
                          <div className="w-full h-1 bg-[#11151d] border border-[#3a3a3a]">
                            <div
                              className="h-full bg-[#5b6f8a]"
                              style={{ width: `${Math.max(0, Math.min(100, (ally.mind / Math.max(1, ally.maxMind)) * 100))}%` }}
                            />
                          </div>
                        </div>
                        {ally.isUndeadSummon ? (
                          <div className="text-[11px] italic text-[#a889b8] pt-0.5">
                            Bất tử — Không cần ăn
                          </div>
                        ) : (
                          <div>
                            <div
                              className={`flex justify-between items-center ${
                                allyHunger >= 80 ? 'text-[#ef4444] font-bold' : 'text-[#eab308]'
                              }`}
                            >
                              <span>Đói</span>
                              <span>{allyHunger}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <HungerBowlIcon
                                className="w-3 h-3 shrink-0"
                                isDanger={allyHunger >= 80}
                              />
                              <div
                                className={`flex-1 h-1 border ${
                                  allyHunger >= 80
                                    ? 'bg-[#26090b] border-[#b91c1c]'
                                    : 'bg-[#1d170f] border-[#6b531c]'
                                }`}
                              >
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    allyHunger >= 80
                                      ? 'bg-[#ef4444] shadow-[0_0_6px_rgba(239,68,68,0.85)]'
                                      : 'bg-[#eab308]'
                                  }`}
                                  style={{ width: `${Math.max(0, Math.min(100, allyHunger))}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              )}

              {/* Dismissed Living Companions Waiting to be Recalled */}
              {invTab !== 'saw' && (player.dismissedCompanions || []).length > 0 && (
                <div className="df-well p-3 space-y-2 border-[#c5a059]/45">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#c5a059]">
                    Đồng Hành Đã Rời Nhóm ({(player.dismissedCompanions || []).length}) — Có thể gọi lại từ bất cứ đâu hoặc tại Đài Cộng Hưởng
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(player.dismissedCompanions || []).map((dc) => (
                      <div
                        key={dc.id}
                        className="p-2 df-card flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[#dfd2b4] truncate">{dc.name}</div>
                          <div className="text-[11px] font-mono text-[#9b8f82]">
                            Sinh Lực {dc.hp}/{dc.maxHp} • Lý Trí {dc.mind}/{dc.maxMind}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={player.party.length >= 3}
                          onClick={() => {
                            sfx.playHealOrChime();
                            const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                            const res = recallDismissedCompanion(pCopy, dc.id);
                            if (res.success) {
                              setPlayer(pCopy);
                            }
                            setInvFeedback(res.message);
                            addLog(res.message);
                          }}
                          className="df-btn-bronze px-2.5 py-1 text-xs font-bold shrink-0 cursor-pointer disabled:opacity-40"
                        >
                          Gọi Nhập Đội
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Header: 64x64 Vector Artwork + Detailed Lore Description */}
              <div className="p-3.5 df-well flex items-center gap-4">
                <ItemArtworkCanvas itemOrWeaponId={previewItemId} size={64} />
                <div className="space-y-1 text-xs">
                  <div className="text-sm font-bold text-[#c5a059]">
                    {CONFIG.WEAPONS[previewItemId]?.name ||
                      CONFIG.SHIELDS[previewItemId]?.name ||
                      GEAR_ITEMS[previewItemId]?.name ||
                      CONFIG.ITEMS[previewItemId]?.name ||
                      'Vật Phẩm Cổ Đại'}
                  </div>
                  <p className="text-[#d3d3d3] leading-relaxed">
                    {CONFIG.WEAPONS[previewItemId]?.desc ||
                      CONFIG.SHIELDS[previewItemId]?.desc ||
                      GEAR_ITEMS[previewItemId]?.desc ||
                      CONFIG.ITEMS[previewItemId]?.desc}
                  </p>
                </div>
              </div>

              {invTab === 'equip' && (() => {
                const rightArmSevered = !(memberLimbs?.rightArm ?? true);
                const leftArmSevered = !(memberLimbs?.leftArm ?? true);
                const activeWpnDef = curWpnId ? CONFIG.WEAPONS[curWpnId] : undefined;
                const paperdollSpec: PaperdollSpec = {
                  spriteKey: selectedAlly ? selectedAlly.spriteKey || selectedAlly.classId : player.classId,
                  equippedWeapon: curWpnId || null,
                  weaponCategory: activeWpnDef?.weaponCategory || 'unarmed',
                  weaponHands: activeWpnDef?.hands || 1,
                  vfxColor: activeWpnDef?.vfxColor,
                  equippedShield: curShieldId || null,
                  equippedHead: curHeadId || null,
                  equippedBody: curBodyId || null,
                  limbs: {
                    leftArm: memberLimbs?.leftArm ?? true,
                    rightArm: memberLimbs?.rightArm ?? true,
                    leftLeg: memberLimbs?.leftLeg ?? true,
                    rightLeg: memberLimbs?.rightLeg ?? true,
                    infected: memberLimbs?.infected,
                  },
                };

                return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Left Column: Paperdoll Preview + 6 Character Stats + Integrated 6-Part Anatomy & Statuses */}
                  <div className="md:col-span-5 df-well p-4 space-y-4">
                    <div className="space-y-3">
                      {renderMemberSurvivalPanel(false)}

                      <div className="flex items-center gap-3 p-2 bg-[#0d0a10] border border-[#3a3a3a]">
                        <PaperdollPreviewCanvas spec={paperdollSpec} width={112} height={150} />
                        <div className="min-w-0 flex-1 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#c5a059] truncate">
                              {selectedMemberName}
                            </span>
                            {selectedAlly && (
                              <button
                                type="button"
                                onClick={() => {
                                  sfx.playSfx('ui_confirm');
                                  const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                                  const res = leaveOrDismissPartyMember(pCopy, safeInvIdx - 1, 'leave');
                                  if (res.success) {
                                    setPlayer(pCopy);
                                    setSelectedInvMemberIdx(0);
                                    setPreviewItemId(pCopy.equippedWeapon);
                                    setInvFeedback(res.message);
                                    addLog(res.message);
                                  }
                                }}
                                className="df-btn-blood px-2 py-0.5 text-[10px] font-bold shrink-0 cursor-pointer"
                              >
                                {selectedAlly.isUndeadSummon ? '💀 Giải Tán' : '🚪 Rời Nhóm'}
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-[#9b8f82]">
                            Vũ khí:{' '}
                            <span className="text-[#dfd2b4]">
                              {rightArmSevered
                                ? 'Đứt Tay Phải'
                                : activeWpnDef?.name || (isSelectedPureTank ? 'Hộ Thể Linh Hồn' : 'Tay Không')}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#9b8f82]">
                            Khiên:{' '}
                            <span className="text-[#dfd2b4]">
                              {leftArmSevered
                                ? 'Đứt Tay Trái'
                                : curShieldId
                                ? CONFIG.SHIELDS[curShieldId]?.name
                                : 'Không'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#9b8f82]">
                            Giáp thân:{' '}
                            <span className="text-[#dfd2b4]">
                              {curBodyId ? GEAR_ITEMS[curBodyId]?.name : 'Thường phục'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-b border-[#3a3a3a]/60 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#c5a059]">
                          6 Chỉ Số — {selectedMemberName}
                        </span>
                      </div>
                      {(
                        [
                          ['Sát Thương Vật Lý', `${memberStats.physAtk}`],
                          ['Kháng Vật Lý', `${memberStats.physDefPct}%`],
                          ['Sát Thương Phép', `${memberStats.magAtk}`],
                          ['Kháng Phép', `${memberStats.magDefPct}%`],
                          ['Nhanh Nhẹn', `${memberStats.agility}`],
                          ['May Mắn', `${memberStats.luck}`],
                        ] as Array<[string, string]>
                      ).map(([label, val]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between text-xs border-b border-[#3a3a3a]/40 pb-1.5"
                        >
                          <span className="text-[#d3d3d3]">{label}</span>
                          <span className="font-mono font-bold text-[#9ab08e]">
                            {val} <span className="text-[10px] text-[#c5a059]">▲</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Integrated 6-Part Anatomy & Active Body Statuses */}
                    <div className="space-y-2 pt-2 border-t border-[#3a3a3a]/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#c5a059] flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-[#8b0000]" /> Giải Phẫu 6 Bộ Phận
                        </span>
                        <span className="text-[10px] text-[#9b8f82]">Trạng thái cơ thể</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="px-2 py-1 bg-[#121914] border border-[#3a3a3a] text-[#9ab08e] flex justify-between">
                          <span>Đầu</span>
                          <span className="font-mono font-bold">
                            {memberStatuses.blindedTurns > 0 ? 'MÙ' : 'OK'}
                          </span>
                        </div>
                        <div
                          className={`px-2 py-1 border flex justify-between ${
                            memberStatuses.bleeding || memberStatuses.parasite
                              ? 'bg-[#261d0e] border-[#c5a059] text-[#c5a059]'
                              : 'bg-[#121914] border-[#3a3a3a] text-[#9ab08e]'
                          }`}
                        >
                          <span>Thân</span>
                          <span className="font-mono font-bold">
                            {memberStatuses.parasite ? 'K.SINH' : memberStatuses.bleeding ? 'MÁU' : 'OK'}
                          </span>
                        </div>
                        {(
                          [
                            ['leftArm', 'Tay Trái'],
                            ['rightArm', 'Tay Phải'],
                            ['leftLeg', 'Chân Trái'],
                            ['rightLeg', 'Chân Phải'],
                          ] as const
                        ).map(([limbKey, limbLabel]) => {
                          const intact = memberLimbs?.[limbKey] ?? true;
                          const infected = memberLimbs?.infected?.[limbKey] ?? false;
                          return (
                            <div
                              key={limbKey}
                              className={`px-2 py-1 border flex justify-between ${
                                !intact
                                  ? 'bg-[#2a0c10] border-[#8b0000] text-[#c96b6b] line-through'
                                  : infected
                                  ? 'bg-[#261d0e] border-[#c5a059] text-[#c5a059]'
                                  : 'bg-[#121914] border-[#3a3a3a] text-[#9ab08e]'
                              }`}
                            >
                              <span>{limbLabel}</span>
                              <span className="font-mono font-bold">
                                {!intact ? 'ĐỨT' : infected ? 'NHIỄM' : 'OK'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {(memberStatuses.bleeding ||
                        memberStatuses.poisoned ||
                        memberStatuses.parasite ||
                        (!selectedAlly && player.holyMagicLocked)) && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {memberStatuses.bleeding && (
                            <span className="px-1.5 py-0.5 bg-[#2e0b0f] border border-[#8b0000] text-[10px] text-[#c96b6b]">
                              🩸 Chảy máu
                            </span>
                          )}
                          {memberStatuses.poisoned && (
                            <span className="px-1.5 py-0.5 bg-[#121914] border border-[#3a3a3a] text-[10px] text-[#9ab08e]">
                              ☠️ Độc
                            </span>
                          )}
                          {memberStatuses.parasite && (
                            <span className="px-1.5 py-0.5 bg-[#1d1226] border border-[#8e6ca3] text-[10px] text-[#d3d3d3]">
                              🪱 Ký sinh
                            </span>
                          )}
                          {!selectedAlly && player.holyMagicLocked && (
                            <span className="px-1.5 py-0.5 bg-[#1a171c] border border-[#3a3a3a] text-[10px] text-[#d3d3d3]">
                              🔒 Khóa Phép Thánh
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Action Bar (Trang Bị | Tự Mặc | Lột Đồ) + 5 Equipment Slots */}
                  <div className="md:col-span-7 space-y-3">
                    {invFeedback && (
                      <div className="p-2 df-well border-[#c5a059] text-xs text-[#dfd2b4]">
                        {invFeedback}
                      </div>
                    )}
                    {isAllyLocked ? (
                      <div className="p-2.5 df-well border-[#8e6ca3] text-xs text-[#d3d3d3]">
                        {isSelectedPureTank
                          ? '👻 Oán Linh Thuần Phòng Thủ giữ nguyên bản thể linh hồn — không thể thay đổi vũ khí hay giáp trụ (tự động bảo vệ đội hình bằng Khiên Linh Hồn).'
                          : '💀 Đệ tử Chiêu Hồn đã tan rã thành tro bụi và rơi toàn bộ trang bị về kho đồ.'}
                      </div>
                    ) : selectedAlly?.isUndeadSummon ? (
                      <div className="p-2.5 df-well border-[#c5a059]/60 text-xs text-[#d3d3d3]">
                        💀⚔️ Đệ tử Chiêu Hồn có thể trang bị &amp; nâng cấp từ kho chung — toàn bộ trang bị đang mặc sẽ tự động thu hồi về kho khi đệ tử tử trận!
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 df-well p-2">
                      <span className="text-xs font-bold text-[#c5a059] px-2">Thao tác:</span>
                      <button
                        disabled={isAllyLocked}
                        onClick={() => {
                          if (selectedAlly) {
                            setPlayer((prev) => {
                              const nextParty = [...prev.party];
                              const ally = nextParty[safeInvIdx - 1];
                              if (!ally || isAllyGearLocked(ally)) return prev;
                              const candidateWeapons = Array.from(
                                new Set([...(ally.weaponId ? [ally.weaponId] : []), ...prev.unlockedWeapons])
                              ).filter((id) => Boolean(CONFIG.WEAPONS[id]));
                              const bestWep =
                                candidateWeapons.sort((a, b) => {
                                  const wa = CONFIG.WEAPONS[a];
                                  const wb = CONFIG.WEAPONS[b];
                                  return wb.dmg[0] + wb.dmg[1] - (wa.dmg[0] + wa.dmg[1]);
                                })[0] || ally.weaponId;
                              const tempAlly = { ...ally, weaponId: bestWep };
                              const validShield =
                                prev.unlockedShields.find((sId) => canAllyEquipShield(tempAlly, sId).allowed) ||
                                (ally.equippedShield && canAllyEquipShield(tempAlly, ally.equippedShield).allowed
                                  ? ally.equippedShield
                                  : null);
                              const validHead =
                                prev.unlockedGear.find(
                                  (g) => GEAR_ITEMS[g]?.slot === 'head' && canAllyEquipGear(tempAlly, g).allowed
                                ) || ally.equippedHead;
                              const validBody =
                                prev.unlockedGear.find(
                                  (g) => GEAR_ITEMS[g]?.slot === 'body' && canAllyEquipGear(tempAlly, g).allowed
                                ) || ally.equippedBody;
                              const validAccessory =
                                prev.unlockedGear.find(
                                  (g) => GEAR_ITEMS[g]?.slot === 'accessory' && canAllyEquipGear(tempAlly, g).allowed
                                ) || ally.equippedAccessory;
                              nextParty[safeInvIdx - 1] = {
                                ...ally,
                                weaponId: bestWep,
                                equippedShield: validShield,
                                equippedHead: validHead,
                                equippedBody: validBody,
                                equippedAccessory: validAccessory,
                              };
                              return { ...prev, party: nextParty };
                            });
                            addLog(`⚔️ [${selectedAlly.name}] đã khoác lên bộ trang bị tinh nhuệ nhất.`);
                            return;
                          }
                          const unlockCheck = canUnequipWeapon(player);
                          const bestWep =
                            player.unlockedWeapons[player.unlockedWeapons.length - 1] ||
                            player.equippedWeapon;
                          setPlayer((prev) => {
                            const nextWep = unlockCheck.allowed ? bestWep : prev.equippedWeapon;
                            const tempP = { ...prev, equippedWeapon: nextWep };
                            const validShield =
                              prev.unlockedShields.find(
                                (sId) => canPlayerEquipShield(tempP, sId).allowed
                              ) || null;
                            const validHead =
                              prev.unlockedGear.find(
                                (g) =>
                                  GEAR_ITEMS[g]?.slot === 'head' &&
                                  canPlayerEquipGear(tempP, g).allowed
                              ) || prev.equippedHead;
                            const validBody =
                              prev.unlockedGear.find(
                                (g) =>
                                  GEAR_ITEMS[g]?.slot === 'body' &&
                                  canPlayerEquipGear(tempP, g).allowed
                              ) || prev.equippedBody;
                            const validAccessory =
                              prev.unlockedGear.find(
                                (g) =>
                                  GEAR_ITEMS[g]?.slot === 'accessory' &&
                                  canPlayerEquipGear(tempP, g).allowed
                              ) || prev.equippedAccessory;
                            return {
                              ...prev,
                              equippedWeapon: nextWep,
                              equippedShield: validShield,
                              equippedHead: validHead,
                              equippedBody: validBody,
                              equippedAccessory: validAccessory,
                            };
                          });
                          addLog(
                            unlockCheck.allowed
                              ? '⚔️ Đã khoác bộ trang bị tinh nhuệ nhất phù hợp với thể trạng.'
                              : `⚠️ Lời nguyền giữ chặt vũ khí trên tay; đã khoác các mảnh giáp còn lại.`
                          );
                        }}
                        className="df-btn-bronze px-3 py-1 disabled:opacity-35 text-xs font-bold cursor-pointer"
                      >
                        Tự Mặc
                      </button>
                      <button
                        disabled={isAllyLocked}
                        onClick={() => {
                          if (selectedAlly) {
                            setPlayer((prev) => {
                              const nextParty = [...prev.party];
                              const ally = nextParty[safeInvIdx - 1];
                              if (!ally || isAllyGearLocked(ally)) return prev;
                              nextParty[safeInvIdx - 1] = {
                                ...ally,
                                equippedShield: null,
                                equippedHead: null,
                                equippedBody: null,
                                equippedAccessory: null,
                              };
                              return { ...prev, party: nextParty };
                            });
                            addLog(`🛡️ Đã gỡ bỏ giáp trụ phụ trợ của [${selectedAlly.name}].`);
                            return;
                          }
                          setPlayer((prev) => ({
                            ...prev,
                            equippedShield: null,
                            equippedHead: null,
                            equippedBody: null,
                            equippedAccessory: null,
                          }));
                          addLog('🛡️ Đã gỡ bỏ giáp trụ phụ trợ để nhẹ bước trong bóng tối.');
                        }}
                        className="df-btn-blood px-3 py-1 disabled:opacity-35 text-xs font-bold cursor-pointer"
                      >
                        Lột Đồ
                      </button>
                    </div>

                    {/* 5 Equipment Slots */}
                    <div className="space-y-2">
                      {(
                        [
                          [
                            'weapon',
                            'V.Khí',
                            (isSelectedPureTank && !curWpnId
                              ? 'Hộ Thể Linh Hồn'
                              : CONFIG.WEAPONS[curWpnId]?.name || 'Trống') +
                              (!selectedAlly && player.bloodForgedWeapons?.includes(curWpnId)
                                ? ' [Huyết Rèn +35%]'
                                : '') +
                              (!selectedAlly && player.cursedLockedWeapon === curWpnId
                                ? ' [🔒 KHÓA NGUYỀN]'
                                : ''),
                            curWpnId || 'rotten_wood_shield',
                          ],
                          [
                            'shield',
                            'Khiên',
                            curShieldId ? CONFIG.SHIELDS[curShieldId]?.name || 'Trống' : 'Trống',
                            curShieldId || 'rotten_wood_shield',
                          ],
                          [
                            'head',
                            'Đầu',
                            curHeadId ? GEAR_ITEMS[curHeadId]?.name : 'Trống',
                            curHeadId || 'iron_penitent_helm',
                          ],
                          [
                            'body',
                            'Thân',
                            curBodyId ? GEAR_ITEMS[curBodyId]?.name : 'Trống',
                            curBodyId || 'cathedral_chainmail',
                          ],
                          [
                            'accessory',
                            'P.Kiện',
                            curAccId ? GEAR_ITEMS[curAccId]?.name : 'Trống',
                            curAccId || 'bone_rosary_ring',
                          ],
                        ] as Array<[EquipSlotKey, string, string, string]>
                      ).map(([slotKey, slotLabel, equippedName, iconId]) => {
                        const isLimbSlotBroken =
                          (slotKey === 'weapon' && rightArmSevered) ||
                          (slotKey === 'shield' && leftArmSevered);
                        return (
                          <div
                            key={slotKey}
                            onClick={() => {
                              setSelectedEquipSlot(slotKey);
                              setPreviewItemId(iconId);
                            }}
                            className={`p-2.5 flex items-center justify-between cursor-pointer ${
                              selectedEquipSlot === slotKey ? 'df-card-active' : 'df-card'
                            } ${isLimbSlotBroken ? 'border-[#8b0000]/80' : ''}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-16 text-xs font-bold uppercase text-[#9b8f82] shrink-0">
                                {slotLabel}
                              </span>
                              <span
                                className={`text-xs font-bold truncate ${
                                  isLimbSlotBroken ? 'line-through text-[#c96b6b]' : 'text-[#d3d3d3]'
                                }`}
                              >
                                {equippedName}
                              </span>
                              {slotKey === 'weapon' && rightArmSevered && (
                                <span className="px-1.5 py-0.2 bg-[#2a0c10] border border-[#8b0000] text-[9px] text-[#c96b6b] font-bold shrink-0">
                                  [ĐỨT TAY PHẢI]
                                </span>
                              )}
                              {slotKey === 'shield' && leftArmSevered && (
                                <span className="px-1.5 py-0.2 bg-[#2a0c10] border border-[#8b0000] text-[9px] text-[#c96b6b] font-bold shrink-0">
                                  [ĐỨT TAY TRÁI]
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#c5a059] shrink-0">
                              {isLimbSlotBroken ? '[Khóa chi]' : '[Chọn đổi]'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Available items for the selected slot */}
                    <div className="p-3 df-well space-y-2">
                      <div className="text-[11px] uppercase text-[#c5a059]">
                        Kho chung khả dụng cho ô [{selectedEquipSlot === 'body' ? 'THÂN' : selectedEquipSlot === 'weapon' ? 'VŨ KHÍ' : selectedEquipSlot === 'shield' ? 'KHIÊN' : selectedEquipSlot === 'head' ? 'ĐẦU' : 'PHỤ KIỆN'}]:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedEquipSlot === 'weapon' &&
                          player.unlockedWeapons.map((wId) => {
                            const w = CONFIG.WEAPONS[wId];
                            if (!w) return null;
                            const isForged = !selectedAlly && player.bloodForgedWeapons?.includes(wId);
                            const isEquippedHere = curWpnId === wId;
                            const weaponLimbCheck = canMemberEquipWeapon(memberLimbs, wId);
                            return (
                              <button
                                key={wId}
                                disabled={isAllyLocked || !weaponLimbCheck.allowed}
                                onClick={() => {
                                  setPreviewItemId(wId);
                                  if (!weaponLimbCheck.allowed) {
                                    setInvFeedback(weaponLimbCheck.reason || 'Không đủ chi để cầm vũ khí này!');
                                    return;
                                  }
                                  if (selectedAlly) {
                                    setPlayer((p) => {
                                      const nextParty = [...p.party];
                                      const ally = nextParty[safeInvIdx - 1];
                                      if (!ally || isAllyGearLocked(ally)) return p;
                                      const needsDropShield = Boolean(w.isTwoHanded || w.hands === 2);
                                      nextParty[safeInvIdx - 1] = {
                                        ...ally,
                                        weaponId: wId,
                                        equippedShield: needsDropShield ? null : ally.equippedShield,
                                      };
                                      return { ...p, party: nextParty };
                                    });
                                    setInvFeedback(null);
                                    return;
                                  }
                                  const unequipCheck = canUnequipWeapon(player);
                                  if (!unequipCheck.allowed && wId !== player.equippedWeapon) {
                                    setInvFeedback(unequipCheck.reason || 'Vũ khí bị nguyền đang khóa chặt!');
                                    addLog(`🔒 ${unequipCheck.reason}`);
                                    return;
                                  }
                                  const needsDropShield = Boolean(w.isTwoHanded || w.hands === 2);
                                  setPlayer((p) => ({
                                    ...p,
                                    equippedWeapon: wId,
                                    equippedShield: needsDropShield ? null : p.equippedShield,
                                    cursedLockedWeapon: w.isCursed ? wId : p.cursedLockedWeapon,
                                  }));
                                  setInvFeedback(null);
                                }}
                                className={`p-2 disabled:opacity-40 text-left text-xs cursor-pointer ${
                                  isEquippedHere ? 'df-card-active' : 'df-card'
                                }`}
                              >
                                <div className="font-bold text-[#dfd2b4]">
                                  {w.name} {w.isTwoHanded || w.hands === 2 ? '[2 Tay]' : ''}{' '}
                                  {isForged ? '🩸' : ''} {w.isCursed ? '☠️' : ''}
                                </div>
                                <div className="text-[10px] text-[#9ab08e]">
                                  {!weaponLimbCheck.allowed
                                    ? `🔒 ${weaponLimbCheck.reason}`
                                    : `ST: ${w.dmg[0]}–${w.dmg[1]} ${isForged ? '(+35% Huyết Rèn)' : ''}`}
                                </div>
                              </button>
                            );
                          })}

                        {selectedEquipSlot === 'shield' &&
                          player.unlockedShields.map((sId) => {
                            const s = CONFIG.SHIELDS[sId];
                            if (!s) return null;
                            const check = selectedAlly
                              ? canAllyEquipShield(selectedAlly, sId)
                              : canPlayerEquipShield(player, sId);
                            const isEquippedHere = curShieldId === sId;
                            return (
                              <button
                                key={sId}
                                disabled={isAllyLocked || leftArmSevered}
                                onClick={() => {
                                  setPreviewItemId(sId);
                                  if (!check.allowed) {
                                    setInvFeedback(check.reason || 'Không thể trang bị khiên này!');
                                    addLog(`⚠️ ${check.reason}`);
                                    return;
                                  }
                                  if (selectedAlly) {
                                    setPlayer((p) => {
                                      const nextParty = [...p.party];
                                      const ally = nextParty[safeInvIdx - 1];
                                      if (!ally || isAllyGearLocked(ally)) return p;
                                      nextParty[safeInvIdx - 1] = { ...ally, equippedShield: sId };
                                      return { ...p, party: nextParty };
                                    });
                                    setInvFeedback(null);
                                    return;
                                  }
                                  setPlayer((p) => ({ ...p, equippedShield: sId }));
                                }}
                                className={`p-2 text-left text-xs cursor-pointer disabled:opacity-40 ${
                                  isEquippedHere
                                    ? 'df-card-active'
                                    : check.allowed
                                    ? 'df-card'
                                    : 'df-card border-[#8b0000] opacity-65'
                                }`}
                              >
                                <div className="font-bold text-[#dfd2b4]">{s.name}</div>
                                <div className="text-[10px] text-[#a3b2c4]">
                                  Giảm {Math.round(s.guardReduction * 100)}% ST khi Thủ
                                </div>
                                {!check.allowed && (
                                  <div className="text-[9px] text-[#c96b6b] mt-0.5">🔒 {check.reason}</div>
                                )}
                              </button>
                            );
                          })}

                        {(selectedEquipSlot === 'head' ||
                          selectedEquipSlot === 'body' ||
                          selectedEquipSlot === 'accessory') &&
                          player.unlockedGear
                            .filter((gId) => GEAR_ITEMS[gId]?.slot === selectedEquipSlot)
                            .map((gId) => {
                              const g = GEAR_ITEMS[gId];
                              const check = selectedAlly
                                ? canAllyEquipGear(selectedAlly, gId)
                                : canPlayerEquipGear(player, gId);
                              const isEquippedHere =
                                (selectedEquipSlot === 'head' && curHeadId === gId) ||
                                (selectedEquipSlot === 'body' && curBodyId === gId) ||
                                (selectedEquipSlot === 'accessory' && curAccId === gId);
                              return (
                                <button
                                  key={gId}
                                  disabled={isAllyLocked}
                                  onClick={() => {
                                    setPreviewItemId(gId);
                                    if (!check.allowed) {
                                      setInvFeedback(check.reason || 'Không đủ điều kiện mặc trang bị này!');
                                      addLog(`⚠️ ${check.reason}`);
                                      return;
                                    }
                                    if (selectedAlly) {
                                      setPlayer((p) => {
                                        const nextParty = [...p.party];
                                        const ally = nextParty[safeInvIdx - 1];
                                        if (!ally || isAllyGearLocked(ally)) return p;
                                        nextParty[safeInvIdx - 1] = {
                                          ...ally,
                                          equippedHead: selectedEquipSlot === 'head' ? gId : ally.equippedHead,
                                          equippedBody: selectedEquipSlot === 'body' ? gId : ally.equippedBody,
                                          equippedAccessory:
                                            selectedEquipSlot === 'accessory' ? gId : ally.equippedAccessory,
                                        };
                                        return { ...p, party: nextParty };
                                      });
                                      setInvFeedback(null);
                                      return;
                                    }
                                    setPlayer((p) => ({
                                      ...p,
                                      equippedHead:
                                        selectedEquipSlot === 'head' ? gId : p.equippedHead,
                                      equippedBody:
                                        selectedEquipSlot === 'body' ? gId : p.equippedBody,
                                      equippedAccessory:
                                        selectedEquipSlot === 'accessory'
                                          ? gId
                                          : p.equippedAccessory,
                                    }));
                                  }}
                                  className={`p-2 text-left text-xs cursor-pointer disabled:opacity-40 ${
                                    isEquippedHere
                                      ? 'df-card-active'
                                      : check.allowed
                                      ? 'df-card'
                                      : 'df-card border-[#8b0000] opacity-65'
                                  }`}
                                >
                                  <div className="font-bold text-[#dfd2b4]">{g.name}</div>
                                  <div className="text-[10px] text-[#9ab08e]">
                                    Kháng Vật Lý +{Math.round(g.physDef * 100)}% • Kháng Phép +{Math.round(g.magDef * 100)}%
                                  </div>
                                  {!check.allowed && (
                                    <div className="text-[9px] text-[#c96b6b] mt-0.5">🔒 {check.reason}</div>
                                  )}
                                </button>
                              );
                            })}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })()}

              {invTab === 'items' && (
                <div className="space-y-3">
                  {invFeedback && (
                    <div className="p-2.5 df-well border-[#c5a059] text-xs text-[#dfd2b4] flex items-center justify-between gap-2">
                      <span>{invFeedback}</span>
                      <button
                        onClick={() => setInvFeedback(null)}
                        className="text-[10px] text-[#9b8f82] hover:text-[#d3d3d3] cursor-pointer shrink-0"
                      >
                        [Ẩn]
                      </button>
                    </div>
                  )}

                  {renderMemberSurvivalPanel(true)}

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-7 space-y-2">
                      <div className="text-xs font-bold uppercase text-[#c5a059]">
                        Vật Phẩm Thực Dụng Trong Túi
                      </div>
                      {Object.entries(player.inventory).map(([itemId, count]) => {
                        const item = CONFIG.ITEMS[itemId];
                        if (!item || count <= 0) return null;
                        return (
                          <div
                            key={itemId}
                            onMouseEnter={() => setPreviewItemId(itemId)}
                            className="p-3 df-card flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <ItemArtworkCanvas itemOrWeaponId={itemId} size={44} />
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="font-bold text-sm text-[#dfd2b4] flex items-center gap-2 flex-wrap">
                                  <span>{item.name}</span>
                                  <span className="px-1.5 py-0.5 bg-[#1a151b] border border-[#3a3a3a] text-[11px] font-mono text-[#c5a059]">
                                    x{count}
                                  </span>
                                </div>
                                <div className="text-xs text-[#9b8f82] leading-snug">{item.desc}</div>
                              </div>
                            </div>
                            {itemId === 'crumpled_hunter_note' ? (
                              <button
                                onClick={() => setActiveModal('hunter_note')}
                                className="df-btn-bronze px-3 py-1.5 font-bold text-xs cursor-pointer shrink-0"
                              >
                                📜 Đọc Mảnh Giấy
                              </button>
                            ) : item.unlockRecipes && item.unlockRecipes.length > 0 ? (
                              (() => {
                                const missingRecs = item.unlockRecipes!.filter(
                                  (rid) => !player.unlockedRecipes.includes(rid)
                                );
                                return missingRecs.length === 0 ? (
                                  <span className="px-2.5 py-1 bg-[#121914] border border-[#3a3a3a] text-[10px] font-bold text-[#9ab08e] shrink-0">
                                    Đã Học Công Thức
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      sfx.playHealOrChime();
                                      setPlayer((prev) => ({
                                        ...prev,
                                        inventory: {
                                          ...prev.inventory,
                                          [itemId]: Math.max(0, (prev.inventory[itemId] || 0) - 1),
                                        },
                                        unlockedRecipes: Array.from(
                                          new Set([...prev.unlockedRecipes, ...(item.unlockRecipes || [])])
                                        ),
                                      }));
                                      const msg = `📖 Đã giải mã [${item.name}], mở khóa ${missingRecs.length} công thức Giả Kim mới!`;
                                      setInvFeedback(msg);
                                      addLog(msg);
                                    }}
                                    className="df-btn-bronze px-3 py-1.5 font-bold text-xs cursor-pointer shrink-0"
                                  >
                                    📖 Học Công Thức
                                  </button>
                                );
                              })()
                            ) : itemId === 'scroll_shadow_step' ? (
                              <button
                                onClick={() => {
                                  sfx.playSfx('ritual');
                                  setPlayer((prev) => ({
                                    ...prev,
                                    inventory: {
                                      ...prev.inventory,
                                      scroll_shadow_step: Math.max(0, (prev.inventory.scroll_shadow_step || 0) - 1),
                                    },
                                    stealthStepsTurns: Math.max(prev.stealthStepsTurns || 0, 8),
                                  }));
                                  const msg = '🌑 Niệm [Cuộn Bước Chân Bóng Tối]: Ẩn mình khỏi tầm nhìn quái vật trong 8 bước di chuyển!';
                                  setInvFeedback(msg);
                                  addLog(msg);
                                  setActiveModal(null);
                                  setLogOverlayVisible(true);
                                }}
                                className="df-btn-bronze px-3 py-1.5 font-bold text-xs cursor-pointer shrink-0"
                              >
                                🌑 Ẩn Thân (8 Bước)
                              </button>
                            ) : item.unlockSkillId ? (
                              (() => {
                                const skId = item.unlockSkillId!;
                                const skDef = CONFIG.SKILLS.find((s) => s.id === skId);
                                const alreadyUnlocked = (player.skillLevels[skId] || 0) >= 1;
                                return alreadyUnlocked ? (
                                  <span className="px-2.5 py-1 bg-[#121914] border border-[#3a3a3a] text-[10px] font-bold text-[#9ab08e] shrink-0">
                                    Đã Mở Cấp {player.skillLevels[skId]}
                                  </span>
                                ) : selectedAlly ? (
                                  <span className="px-2 py-1 bg-[#141118] border border-[#3a3a3a] text-[10px] text-[#9b8f82] shrink-0">
                                    Chỉ Nhân Vật Chính
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      sfx.playHealOrChime();
                                      setPlayer((prev) => ({
                                        ...prev,
                                        inventory: {
                                          ...prev.inventory,
                                          [itemId]: Math.max(0, (prev.inventory[itemId] || 0) - 1),
                                        },
                                        skillLevels: {
                                          ...prev.skillLevels,
                                          [skId]: Math.max(1, prev.skillLevels[skId] || 0),
                                        },
                                      }));
                                      const msg = `📜 Đã lĩnh hội [${item.name}], khai mở cổ thuật [${skDef?.name || skId}].`;
                                      setInvFeedback(msg);
                                      addLog(msg);
                                    }}
                                    className="df-btn-bronze px-3 py-1.5 font-bold text-xs cursor-pointer shrink-0"
                                  >
                                    📜 Lĩnh Hội (Mở Cấp 1)
                                  </button>
                                );
                              })()
                            ) : itemId === 'brown_vial' ? (
                              <button
                                onClick={() => {
                                  setActiveModal(null);
                                  promptCrackedWallExplosion();
                                }}
                                className="df-btn-blood px-3 py-1.5 font-bold text-xs cursor-pointer shrink-0"
                              >
                                Nổ Tường [F]
                              </button>
                            ) : itemId === 'rotten_meat' ? (
                              <button
                                onClick={() => {
                                  const curRoomId = world.currentRoomId;
                                  setPlayer((prev) => ({
                                    ...prev,
                                    inventory: {
                                      ...prev.inventory,
                                      rotten_meat: Math.max(0, (prev.inventory.rotten_meat || 0) - 1),
                                    },
                                  }));
                                  setWorld((prev) => {
                                    const curRoom = prev.rooms[curRoomId];
                                    if (!curRoom) return prev;
                                    const remaining = (curRoom.decoys || []).filter(
                                      (d) => !(d.x === playerPos.x && d.y === playerPos.y) && d.turnsLeft > 0
                                    );
                                    return {
                                      ...prev,
                                      rooms: {
                                        ...prev.rooms,
                                        [curRoomId]: {
                                          ...curRoom,
                                          decoys: [
                                            ...remaining,
                                            { x: playerPos.x, y: playerPos.y, turnsLeft: 18 },
                                          ],
                                        },
                                      },
                                    };
                                  });
                                  const msg =
                                    '🥩 Đã đặt [Thịt Thối] xuống nền đá lạnh. Mùi tanh nồng lan tỏa, thu hút lũ quái vật trong bóng tối.';
                                  setInvFeedback(msg);
                                  addLog(msg);
                                  setActiveModal(null);
                                  setLogOverlayVisible(true);
                                }}
                                className="df-btn-bronze px-3 py-1.5 font-bold text-xs cursor-pointer shrink-0"
                              >
                                🥩 Đặt Mồi Nhử
                              </button>
                            ) : itemId === 'bone_saw' || itemId === 'scroll_emergency_amputation' ? (
                              <button
                                onClick={() => {
                                  setIsAmputating(true);
                                  setSawTargetMemberIdx(null);
                                  setPreviewItemId(itemId);
                                  setInvFeedback(null);
                                  setInvTab('saw');
                                }}
                                className="df-btn-blood px-3 py-1.5 font-bold text-xs cursor-pointer shrink-0"
                              >
                                {itemId === 'scroll_emergency_amputation' ? '📜 Cắt Chi Khẩn Cấp' : 'Dùng'}
                              </button>
                            ) : item.mapUsable ? (
                              <button
                                disabled={Boolean(selectedAlly && selectedAlly.hp <= 0)}
                                onClick={() => {
                                  const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                                  const logs: string[] = [];
                                  if (selectedAlly) {
                                    applySupportItemToAlly(pCopy, safeInvIdx - 1, itemId, logs);
                                  } else {
                                    pCopy.inventory[itemId] = Math.max(0, (pCopy.inventory[itemId] || 0) - 1);
                                    applySupportItemEffects(pCopy, itemId, logs);
                                  }
                                  setPlayer(pCopy);
                                  if (logs.length > 0) {
                                    setInvFeedback(logs.join(' '));
                                    logs.forEach((l) => addLog(l));
                                  }
                                  if (itemId === 'elixir_of_ancients' && !selectedAlly && pCopy.classId === 'night_hunter') {
                                    if (pCopy.questFlags?.vaelisDefeated) {
                                      setActiveModal(null);
                                      setInteractionMenu({
                                        title: 'MỤC TIÊU CÁ NHÂN: ĐỘC HÓA ĐÁ ĐÃ GIẢI',
                                        description:
                                          'Bạn đã uống cạn [Tiên Dược Nguyên Sơ] giải trừ lời nguyền hóa đá và Kết Giới Chướng Khí của Vaelis đã tan vỡ. Bạn muốn rời khỏi Thung Lũng hoàn thành mục tiêu cá nhân hay ở lại Vết Rách định đoạt vận mệnh thế giới?',
                                        selectedIndex: 0,
                                        choices: [
                                          {
                                            label: '🏆 Hoàn Thành Mục Tiêu Cá Nhân: Rời Thung Lũng (S-Ending Gã Săn Di Vật)',
                                            onSelect: () => {
                                              const res = evaluateCanonEnding({
                                                classId: pCopy.classId,
                                                corruption: pCopy.corruption,
                                                holyMotherBanned: isHolyMotherBanned(pCopy),
                                                readBookIds: pCopy.readBookIds,
                                                inventory: pCopy.inventory,
                                                learnedSkillIds: Object.keys(pCopy.skillLevels),
                                                vaelisTalked: Boolean(pCopy.questFlags?.vaelisTalked),
                                                vaelisDefeated: true,
                                                curedPetrification: true,
                                                child13Rescued: Boolean(pCopy.questFlags?.child13Rescued),
                                                child13InParty: pCopy.party.some((a) => a.id === 'child_13' && a.hp > 0),
                                                endingAction: 'ESCAPE_EXTERIOR_GATE',
                                              });
                                              setInteractionMenu(null);
                                              setEndingInfo(res);
                                              setScreen('ending');
                                            },
                                          },
                                          {
                                            label: '🌌 Tiếp Tục Ở Lại Vết Rách Định Đoạt Thế Giới (World Endings)',
                                            onSelect: () => {
                                              setInteractionMenu(null);
                                              addLog('🌌 Bạn quyết định ở lại đáy Vực Sao để định đoạt Vết Rách Không Gian.');
                                              setLogOverlayVisible(true);
                                            },
                                          },
                                        ],
                                      });
                                    } else {
                                      addLog('✨ Độc hóa đá đã tan! Hãy hạ gục Vaelis ở Tầng 1 để phá Kết Giới và mở đường thoát thân, hoặc tiến tới Vết Rách Tầng 3.');
                                    }
                                  }
                                }}
                                className="df-btn-bronze px-3 py-1.5 disabled:opacity-35 font-bold text-xs cursor-pointer shrink-0"
                              >
                                {selectedAlly ? `Dùng cho ${selectedAlly.name}` : 'Dùng'}
                              </button>
                            ) : item.combatUsable ? (
                              <span className="px-2 py-1 bg-[#141118] border border-[#3a3a3a] text-[10px] text-[#9b8f82] shrink-0">
                                Dùng trong Trận
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-[#141118] border border-[#3a3a3a] text-[10px] text-[#9b8f82] shrink-0">
                                {item.category === 'currency'
                                  ? 'Tiền Tệ'
                                  : item.category === 'key'
                                  ? 'Chìa Khóa'
                                  : item.category === 'stone'
                                  ? 'Tinh Thạch'
                                  : 'Cổ Vật / Công Cụ'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Alchemy Crafting */}
                    <div className="md:col-span-5 space-y-2">
                      <div className="text-xs font-bold uppercase text-[#c5a059]">
                        Bàn Pha Chế Giả Kim
                      </div>
                      {CONFIG.RECIPES.map((rec) => {
                        const isRecipeUnlocked =
                          rec.id === 'recipe_herbal_salve' || player.unlockedRecipes.includes(rec.id);
                        const canCraft =
                          isRecipeUnlocked &&
                          Object.entries(rec.ingredients).every(
                            ([ingId, qty]) => (player.inventory[ingId] || 0) >= qty
                          );
                        return (
                          <div
                            key={rec.id}
                            className={`p-3 df-card flex items-center justify-between text-xs gap-2 ${
                              isRecipeUnlocked ? '' : 'opacity-65'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-[#dfd2b4]">
                                {rec.name}
                                {!isRecipeUnlocked && (
                                  <span className="ml-1.5 text-[10px] text-[#c96b6b] font-normal">
                                    [🔒 Cần Sách Công Thức]
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#9b8f82]">{rec.desc}</div>
                            </div>
                            <button
                              disabled={!canCraft}
                              onClick={() => {
                                setPlayer((prev) => {
                                  const nextInv = { ...prev.inventory };
                                  for (const [ingId, qty] of Object.entries(rec.ingredients)) {
                                    nextInv[ingId] = Math.max(0, (nextInv[ingId] || 0) - qty);
                                  }
                                  nextInv[rec.resultItemId] = (nextInv[rec.resultItemId] || 0) + 1;
                                  return { ...prev, inventory: nextInv };
                                });
                                addLog(`⚗️ Điều chế thành công [${CONFIG.ITEMS[rec.resultItemId]?.name || rec.name}].`);
                              }}
                              className="df-btn-bronze px-3 py-1.5 disabled:opacity-35 font-bold cursor-pointer shrink-0"
                            >
                              {isRecipeUnlocked ? 'Pha Chế' : '🔒 Khóa'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {invTab === 'saw' && isAmputating && (() => {
                const sawTargetAlly =
                  sawTargetMemberIdx !== null && sawTargetMemberIdx > 0
                    ? player.party[sawTargetMemberIdx - 1] || null
                    : null;
                const sawStep: 1 | 2 =
                  sawTargetMemberIdx === null || (sawTargetMemberIdx > 0 && !sawTargetAlly) ? 1 : 2;
                const targetName = sawTargetAlly ? sawTargetAlly.name : player.name;
                const targetHp = sawTargetAlly ? sawTargetAlly.hp : player.hp;
                const targetMaxHp = sawTargetAlly ? sawTargetAlly.maxHp : player.maxHp;
                const targetLimbs = sawTargetAlly ? sawTargetAlly.limbs : player.limbs;
                const limbDefs = [
                  ['leftArm', 'Tay Trái'],
                  ['rightArm', 'Tay Phải'],
                  ['leftLeg', 'Chân Trái'],
                  ['rightLeg', 'Chân Phải'],
                ] as const;

                const countInfectedLimbs = (limbsObj?: PlayerState['limbs']) =>
                  limbDefs.filter(
                    ([k]) => (limbsObj?.[k] ?? true) && Boolean(limbsObj?.infected?.[k])
                  ).length;

                return (
                  <div className="space-y-4 df-well border-[#8b0000]/60 p-4">
                    {/* 3-Step Surgical Progress Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a3a3a]/60 pb-3">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <span
                          className={`px-2 py-1 border ${
                            sawStep === 1
                              ? 'bg-[#2e0b0f] border-[#8b0000] text-[#dfd2b4]'
                              : 'bg-[#151217] border-[#3a3a3a] text-[#9b8f82]'
                          }`}
                        >
                          Bước 1: Chọn Thành Viên
                        </span>
                        <span className="text-[#7a7066]">→</span>
                        <span
                          className={`px-2 py-1 border ${
                            sawStep === 2
                              ? 'bg-[#2e0b0f] border-[#8b0000] text-[#dfd2b4]'
                              : 'bg-[#110e14] border-[#3a3a3a] text-[#7a7066]'
                          }`}
                        >
                          Bước 2: Sơ Đồ 4 Chi
                        </span>
                        <span className="text-[#7a7066]">→</span>
                        <span
                          className={`px-2 py-1 border ${
                            sawStep === 2
                              ? 'bg-[#261114] border-[#8b0000] text-[#c96b6b]'
                              : 'bg-[#110e14] border-[#3a3a3a] text-[#7a7066]'
                          }`}
                        >
                          Bước 3: Cắt Bỏ Chi Nhiễm Trùng (-12 Sinh Lực)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAmputating(false);
                          setSawTargetMemberIdx(null);
                          setInvTab('items');
                        }}
                        className="df-btn px-2.5 py-1 text-[11px] cursor-pointer"
                      >
                        ← Quay lại Túi Đồ
                      </button>
                    </div>

                    {invFeedback && (
                      <div className="p-2.5 df-well border-[#8b0000] text-xs text-[#dfd2b4] flex items-center justify-between gap-2">
                        <span>{invFeedback}</span>
                        <button
                          type="button"
                          onClick={() => setInvFeedback(null)}
                          className="text-[10px] text-[#9b8f82] hover:text-[#d3d3d3] cursor-pointer shrink-0"
                        >
                          [Ẩn]
                        </button>
                      </div>
                    )}

                    {/* STEP 1: Select Party Member */}
                    {sawStep === 1 && (
                      <div className="space-y-3">
                        <p className="text-xs text-[#d3d3d3]">
                          Chọn thành viên trong đội cần phẫu thuật bằng <b>Cưa Xương (x{player.inventory.bone_saw || 0})</b> hoặc <b>Cuộn Cắt Chi Khẩn Cấp (x{player.inventory.scroll_emergency_amputation || 0})</b>:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Main Player Card */}
                          {(() => {
                            const infCount = countInfectedLimbs(player.limbs);
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSawTargetMemberIdx(0);
                                  setSelectedInvMemberIdx(0);
                                  setInvFeedback(null);
                                }}
                                className="p-3 df-card text-left space-y-2 cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-xs text-[#dfd2b4] truncate">
                                    ★ {player.name}
                                  </span>
                                  <span className="text-[9px] text-[#c5a059] shrink-0">[CHÍNH]</span>
                                </div>
                                <div className="text-[11px] font-mono text-[#c96b6b]">
                                  Sinh Lực: <b>{player.hp}/{player.maxHp}</b>
                                </div>
                                <div
                                  className={`text-[10px] px-1.5 py-0.5 border inline-block ${
                                    infCount > 0
                                      ? 'bg-[#2e0b0f] border-[#8b0000] text-[#dfd2b4] font-bold'
                                      : 'bg-[#121914] border-[#3a3a3a] text-[#9ab08e]'
                                  }`}
                                >
                                  {infCount > 0 ? `⚠ ${infCount} Chi Nhiễm Trùng` : 'Không nhiễm trùng'}
                                </div>
                              </button>
                            );
                          })()}

                          {/* 3 Ally Slots */}
                          {[0, 1, 2].map((slotIdx) => {
                            const ally = player.party[slotIdx];
                            if (!ally) {
                              return (
                                <div
                                  key={`saw_empty_${slotIdx}`}
                                  className="p-3 df-well opacity-45 text-[11px] text-[#7a7066] flex items-center justify-center"
                                >
                                  [Ô Đồng Đội #{slotIdx + 1} Trống]
                                </div>
                              );
                            }
                            const infCount = countInfectedLimbs(ally.limbs);
                            const cannotOperate = ally.hp <= 0 || Boolean(ally.isUndeadSummon);
                            return (
                              <button
                                key={`saw_member_${ally.id}`}
                                type="button"
                                disabled={cannotOperate}
                                onClick={() => {
                                  setSawTargetMemberIdx(slotIdx + 1);
                                  setSelectedInvMemberIdx(slotIdx + 1);
                                  setInvFeedback(null);
                                }}
                                className="p-3 df-card disabled:opacity-45 text-left space-y-2 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-xs text-[#dfd2b4] truncate">
                                    {ally.name}
                                  </span>
                                  <span className="text-[9px] text-[#a889b8] shrink-0">
                                    {ally.isUndeadSummon ? '[CHIÊU HỒN]' : '[ĐỒNG ĐỘI]'}
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-[#c96b6b]">
                                  Sinh Lực: <b>{ally.hp}/{ally.maxHp}</b>
                                </div>
                                <div
                                  className={`text-[10px] px-1.5 py-0.5 border inline-block ${
                                    ally.isUndeadSummon
                                      ? 'bg-[#1d1226] border-[#8e6ca3] text-[#d3d3d3]'
                                      : ally.hp <= 0
                                      ? 'bg-[#2a0c10] border-[#8b0000] text-[#c96b6b]'
                                      : infCount > 0
                                      ? 'bg-[#2e0b0f] border-[#8b0000] text-[#dfd2b4] font-bold'
                                      : 'bg-[#121914] border-[#3a3a3a] text-[#9ab08e]'
                                  }`}
                                >
                                  {ally.isUndeadSummon
                                    ? 'Xác sống không nhiễm trùng'
                                    : ally.hp <= 0
                                    ? 'Đã gục ngã'
                                    : infCount > 0
                                    ? `⚠ ${infCount} Chi Nhiễm Trùng`
                                    : 'Không nhiễm trùng'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* STEP 2 & 3: Display 4 Limbs of Selected Member & Click Infected Limb to Amputate */}
                    {sawStep === 2 && sawTargetMemberIdx !== null && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 df-well px-3 py-2">
                          <div className="text-xs text-[#d3d3d3]">
                            Đối tượng phẫu thuật: <b className="text-[#c5a059]">{targetName}</b>{' '}
                            <span className="font-mono text-[#c96b6b] ml-2">
                              (Sinh Lực: {targetHp}/{targetMaxHp})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSawTargetMemberIdx(null);
                              setInvFeedback(null);
                            }}
                            className="df-btn px-2.5 py-1 text-[11px] cursor-pointer"
                          >
                            ← Đổi thành viên
                          </button>
                        </div>

                        <p className="text-xs text-[#d3d3d3]">
                          Bấm trực tiếp vào chi đang <b>NHIỄM TRÙNG</b> để tiến hành cưa xương (mất <b>-12 Sinh Lực</b> và gây Chảy máu vết mổ):
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {limbDefs.map(([limbKey, label]) => {
                            const intact = targetLimbs?.[limbKey] ?? true;
                            const infected = targetLimbs?.infected?.[limbKey] ?? false;
                            const hasScrollAmp =
                              !sawTargetAlly && (player.inventory.scroll_emergency_amputation || 0) > 0;
                            const hasBoneSaw = (player.inventory.bone_saw || 0) > 0;
                            const canAmputate = intact && infected && (hasScrollAmp || hasBoneSaw);
                            return (
                              <button
                                key={limbKey}
                                type="button"
                                disabled={!canAmputate}
                                onClick={() => {
                                  if (!canAmputate) return;
                                  sfx.playSever();
                                  const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                                  const res = sawTargetAlly
                                    ? amputateAllyLimbWithBoneSaw(pCopy, sawTargetMemberIdx - 1, limbKey)
                                    : hasScrollAmp
                                    ? useEmergencyAmputationScroll(pCopy, limbKey)
                                    : amputateInfectedLimbWithBoneSaw(pCopy, limbKey);
                                  setPlayer(pCopy);
                                  if (res.success) {
                                    const surgeryLog = res.message;
                                    setInvFeedback(surgeryLog);
                                    addLog(`🪚 ${surgeryLog}`);
                                  } else {
                                    setInvFeedback(res.message);
                                    addLog(res.message);
                                  }
                                }}
                                className={`p-3 text-left space-y-2 ${
                                  canAmputate
                                    ? 'df-card-active cursor-pointer'
                                    : 'df-card opacity-55 cursor-not-allowed'
                                }`}
                              >
                                <div className="font-bold text-sm text-[#dfd2b4]">{label}</div>
                                <div>
                                  {!intact ? (
                                    <span className="px-2 py-0.5 bg-[#1f1315] border border-[#3a3a3a] text-[10px] font-bold text-[#9ca3af]">
                                      Đã mất
                                    </span>
                                  ) : infected ? (
                                    <span className="px-2 py-0.5 bg-[#2e0b0f] border border-[#8b0000] text-[10px] font-bold text-[#dfd2b4] animate-pulse">
                                      NHIỄM TRÙNG
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-[#121914] border border-[#3a3a3a] text-[10px] font-bold text-[#9ab08e]">
                                      Bình thường
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#9b8f82]">
                                  {!intact
                                    ? 'Chi đã bị cắt rời.'
                                    : infected
                                    ? hasScrollAmp
                                      ? 'Dùng Cuộn Cắt Chi (-12 Sinh Lực)'
                                      : 'Bấm để cưa bỏ (-12 Sinh Lực)'
                                    : 'Không cần phẫu thuật'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* ========================================================================
          MODAL 2: LOCKED ANCIENT PARCHMENT LORE BOOKS ([L])
      ======================================================================== */}
      {activeModal === 'lore' && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full df-panel p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#c5a059]" />
                <h2 className="text-lg font-bold uppercase tracking-wider text-[#dfd2b4]">
                  Thư Viện Trang Giấy Da Dê Cổ ({player.readBookIds.length}/{CONFIG.BOOKS.length} Cuộn Đã Mở)
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
              >
                Đóng [ESC]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left List: Unfound books are strictly locked as [Cuộn ???] */}
              <div className="md:col-span-5 space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
                {CONFIG.BOOKS.map((book) => {
                  const unlocked = player.readBookIds.includes(book.id);
                  const active = selectedLoreBookId === book.id;
                  return (
                    <button
                      key={book.id}
                      disabled={!unlocked}
                      onClick={() => setSelectedLoreBookId(book.id)}
                      className={`w-full text-left p-2.5 text-xs transition ${
                        !unlocked
                          ? 'df-well opacity-45 text-[#7a7066] cursor-not-allowed'
                          : active
                          ? 'df-card-active text-[#dfd2b4] cursor-pointer'
                          : 'df-card text-[#d3d3d3] cursor-pointer'
                      }`}
                    >
                      {unlocked ? (
                        <div className="font-bold">
                          Cuộn #{book.vol}: {book.title}
                        </div>
                      ) : (
                        <div className="italic">
                          [Cuộn #{book.vol} ??? – Chưa tìm thấy trên kệ sách]
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Panel: Ancient Parchment Scroll Page (`Trang Giấy Da Dê Cổ`) */}
              <div className="md:col-span-7">
                {(() => {
                  const book =
                    CONFIG.BOOKS.find((b) => b.id === selectedLoreBookId) ||
                    CONFIG.BOOKS[0];
                  const isUnlocked = player.readBookIds.includes(book.id);

                  if (!isUnlocked) {
                    return (
                      <div className="h-full min-h-[320px] df-well flex flex-col items-center justify-center p-6 text-center space-y-2">
                        <ItemArtworkCanvas itemOrWeaponId="ancient_parchment" size={64} />
                        <div className="text-sm font-bold text-[#c5a059]">
                          CUỘN SÁCH DA DÊ NÀY CHƯA ĐƯỢC TÌM THẤY
                        </div>
                        <p className="text-xs text-[#9b8f82] max-w-sm">
                          Hãy lục soát các Kệ Sách Cổ (Bookshelf) trong Đại Giáo Đường Goethe để mở
                          khóa tri thức giải phẫu và cổ ngữ này.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      className="p-6 df-parchment-frame text-[#26190d] space-y-4 max-h-[60vh] overflow-y-auto"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                      }}
                    >
                      <div className="flex items-center justify-between border-b-2 border-[#6e5233]/50 pb-2">
                        <div>
                          <div className="text-xs uppercase tracking-widest font-bold text-[#8b0000]">
                            Ấn Bản Cổ Tự #{book.vol} • {book.floorHint}
                          </div>
                          <h3 className="text-2xl font-bold text-[#1f1308]">{book.title}</h3>
                        </div>
                        <ItemArtworkCanvas itemOrWeaponId="ancient_parchment" size={52} />
                      </div>

                      <p className="text-base leading-relaxed font-serif text-[#2b1b0e] whitespace-pre-line">
                        {book.content}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL 2B: CRUMPLED HUNTER NOTE (Gã Săn Di Vật Starter Clues)
      ======================================================================== */}
      {activeModal === 'hunter_note' && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="max-w-xl w-full df-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#c5a059]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#dfd2b4]">
                  Mảnh Giấy Nhàu Nát Của Lão Thần Y
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
              >
                Đóng [ESC]
              </button>
            </div>
            <div
              className="p-6 df-parchment-frame text-[#26190d] space-y-3 max-h-[65vh] overflow-y-auto"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              <div className="text-xs uppercase tracking-widest font-bold text-[#8b0000] border-b border-[#6e5233]/40 pb-1">
                Thư Mật Gửi Gã Săn Di Vật
              </div>
              <p className="text-base leading-relaxed whitespace-pre-line">
                {`“Khụ... Ta là Lão Thần Y dưới đáy Vực Sao. Đôi chân ta đã hóa đá quá nửa vì chướng khí Thung Lũng.\n\nNếu ngươi lần theo dấu máu xuống tới Tầng 3, bên mép Vết Rách Hư Vô chỉ còn ĐÚNG MỘT BÌNH [Tiên Dược Nguyên Sơ] đặt cạnh lồng sắt của Thánh Tử Thứ 13.\n\nTa không thể cứu nổi tất cả. Hoặc là ngươi dùng nó cho mục đích ích kỷ, hoặc tưới nó lên mầm sống duy nhất giữa vực sâu sau khi tìm đủ Lõi Khóa Hư Vô và trang Cuộn Da Dê IX trong thư viện...”`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL 3: ĐÀI CỘNG HƯỞNG ([H]) WITH AFFINITIES, STAT NODES, LIMB REGROWTH & 3-FLOOR PORTAL
      ======================================================================== */}
      {activeModal === 'hexen' && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="max-w-5xl w-full df-panel p-4 space-y-3 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#8b0000]" />
                <h2 className="text-base font-bold uppercase tracking-wider text-[#c5a059]">
                  Đài Cộng Hưởng – Thần Lực &amp; Kỹ Năng (Đá LH: {player.energyStones})
                </h2>
              </div>
              <button
                onClick={() => {
                  setHexenFeedback(null);
                  setActiveModal(null);
                }}
                className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
              >
                Đóng [ESC]
              </button>
            </div>

            {hexenFeedback && (
              <div className="p-2 df-well border-[#c5a059] text-xs text-[#dfd2b4]">
                {hexenFeedback}
              </div>
            )}

            {/* 3 Cosmic Pillars Affinity Bar (Earned purely through in-world actions) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 df-well p-2.5 text-xs">
              {(
                [
                  [
                    'holyMother',
                    '✝ Thánh Mẫu (Trật Tự)',
                    player.affinities?.holyMother || 0,
                    'Tín ngưỡng qua hành động thuần khiết (cấm khi Tha Hóa ≥ 25, Nuốt Xác hoặc học Huyết Quỷ).',
                    'text-[#c5a059]',
                  ],
                  [
                    'primordialVoid',
                    '🌌 Hư Vô Nguyên Thủy',
                    player.affinities?.primordialVoid || 0,
                    '-10 Lý Trí tối đa mỗi bậc; đổi lại tăng kháng Chướng Khí Vực Sao Tầng 3 (bậc 3 miễn nhiễm).',
                    'text-[#a889b8]',
                  ],
                  [
                    'demonicPact',
                    '🩸 Huyết Quỷ',
                    player.affinities?.demonicPact || 0,
                    '+15 Tha Hóa mỗi bậc; đạt bậc ≥ 2 khóa phép Thánh Mẫu bậc cao.',
                    'text-[#c96b6b]',
                  ],
                ] as const
              ).map(([pillarKey, label, lv, desc, col]) => (
                <div
                  key={pillarKey}
                  className={`p-2.5 space-y-1 ${lv > 0 ? 'df-card-active' : 'df-card'}`}
                >
                  <div className={`flex justify-between font-bold ${col}`}>
                    <span>{label}</span>
                    <span className="font-mono">Tín Ngưỡng {lv}/3</span>
                  </div>
                  <p className="text-[11px] text-[#d3d3d3]/85 leading-snug">{desc}</p>
                </div>
              ))}
            </div>

            {/* Lower Character Arc Nodes + Limb Regrowth + Exorcism + 3-Floor Void Portal */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 df-well p-3 text-xs">
              <div className="md:col-span-6 space-y-2">
                <div className="font-bold uppercase text-[#c5a059]">
                  Cung Thấp: Cường Hóa Chỉ Số Nội Tại (1 Đá Linh Hồn / Nốt)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['agility_1', '⚡ Nhanh Nhẹn +1 (+5% Né)'],
                      ['atk_1', '⚔️ Cường Lực (+15% ST)'],
                      ['def_1', '🛡️ Da Thép (+10% Kháng Vật Lý)'],
                      ['san_1', '🧠 Ý Chí (+25 Lý Trí Tối Đa)'],
                    ] as const
                  ).map(([nodeId, label]) => {
                    const owned = player.hexenStatNodes?.includes(nodeId);
                    return (
                      <button
                        key={nodeId}
                        disabled={owned || player.energyStones < 1}
                        onClick={() => {
                          const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                          const res = unlockHexenStatNode(pCopy, nodeId);
                          setPlayer(pCopy);
                          setHexenFeedback(res.message);
                          addLog(res.message);
                        }}
                        className={`p-2 text-left text-[11px] font-bold cursor-pointer ${
                          owned
                            ? 'df-card-active text-[#c5a059]'
                            : 'df-card text-[#d3d3d3] disabled:opacity-40'
                        }`}
                      >
                        {owned ? `✓ ${label}` : label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-6 space-y-2">
                <div className="font-bold uppercase text-[#c5a059]">
                  Nghi Thức Thánh Mẫu &amp; Cổng Dịch Chuyển Hư Vô 3 Tầng
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {player.cursedLockedWeapon && (
                    <button
                      onClick={() => {
                        const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                        const res = exorciseCursedWeapon(pCopy);
                        setPlayer(pCopy);
                        setHexenFeedback(res.message);
                        addLog(res.message);
                      }}
                      className="df-btn-bronze px-2.5 py-1.5 font-bold text-[11px] cursor-pointer"
                    >
                      ✝ Trục Xuất Vũ Khí Nguyền (-1 Đá LH)
                    </button>
                  )}
                  {(
                    [
                      ['leftArm', 'Tay Trái'],
                      ['rightArm', 'Tay Phải'],
                      ['leftLeg', 'Chân Trái'],
                      ['rightLeg', 'Chân Phải'],
                    ] as const
                  )
                    .filter(([k]) => !player.limbs[k])
                    .map(([k, lbl]) => (
                      <button
                        key={k}
                        onClick={() => {
                          const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                          const res = regrowLimbAtHexen(pCopy, k);
                          setPlayer(pCopy);
                          setHexenFeedback(res.message);
                          addLog(res.message);
                        }}
                        className="df-btn-bronze px-2.5 py-1.5 font-bold text-[11px] cursor-pointer"
                      >
                        🌟 Tái Tạo [{lbl}] (-2 Đá LH, -25 Lý Trí)
                      </button>
                    ))}
                  {(
                    [
                      ['F1_R0', '🌀 Dịch Chuyển → Tầng 1 (Lâu Đài)'],
                      ['F2_R0', '🌀 Dịch Chuyển → Tầng 2 (Giáo Đường)'],
                      ['F3_R0', '🌀 Dịch Chuyển → Tầng 3 (Vực Sao)'],
                    ] as const
                  ).map(([destId, label]) => (
                    <button
                      key={destId}
                      disabled={currentRoom.id === destId}
                      onClick={() => {
                        setActiveModal(null);
                        triggerCoinToss(
                          'CỔNG HƯ VÔ',
                          '',
                          (won) => {
                            if (!won) {
                              setPlayer((prev) => ({
                                ...prev,
                                hp: Math.max(5, prev.hp - 12),
                                mind: Math.max(0, prev.mind - 15),
                              }));
                              addLog('⚠️ Khe nứt Hư Vô cào rách da thịt trong khoảnh khắc xuyên qua không gian!');
                            } else {
                              addLog('🌀✨ Bước qua Cổng Hư Vô bình yên vô sự!');
                            }
                            movePlayerToRoom(destId, 'spawn');
                          }
                        );
                      }}
                      className="df-btn px-2.5 py-1.5 disabled:opacity-35 font-bold text-[11px] cursor-pointer"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 Skill Branches with Vertical SVG Connector Lines between Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['Chiến Kỹ', 'Thánh Mẫu', 'Huyết Quỷ', 'Hư Vô'] as const).map((branchName) => {
                const branchSkills = CONFIG.SKILLS.filter((s) => s.branch === branchName);
                const branchColor =
                  branchName === 'Chiến Kỹ'
                    ? 'border-[#c5a059] text-[#c5a059]'
                    : branchName === 'Thánh Mẫu'
                    ? 'border-[#c5a059] text-[#dfd2b4]'
                    : branchName === 'Huyết Quỷ'
                    ? 'border-[#8b0000] text-[#c96b6b]'
                    : 'border-[#8e6ca3] text-[#a889b8]';

                return (
                  <div
                    key={branchName}
                    className="df-well p-3 flex flex-col justify-start relative"
                  >
                    <div className={`border-b pb-2 mb-3 text-center ${branchColor}`}>
                      <div className="text-xs font-bold uppercase tracking-wider">
                        Nhánh {branchName}
                      </div>
                      <div className="text-[10px] text-[#9b8f82] mt-0.5">
                        {branchName === 'Chiến Kỹ'
                          ? 'Mở Cấp 1 qua Cuộn Bí Kíp (Kệ Sách)'
                          : 'Học & nâng bằng Tín Ngưỡng + Đá LH'}
                      </div>
                    </div>

                    <div className="space-y-4 relative">
                      {branchSkills.map((sk, sIdx) => {
                        const curLv = player.skillLevels[sk.id] || 0;
                        const lockedByBan =
                          sk.branch === 'Thánh Mẫu' && isHolyMotherBanned(player);
                        const lockedByDemonic =
                          sk.branch === 'Thánh Mẫu' && !lockedByBan && !canUseHolySkill(player, sk).allowed;
                        const lockedHoly = lockedByBan || lockedByDemonic;
                        const reqAff = sk.requiredAffinity;
                        const curAff = reqAff ? player.affinities?.[reqAff.pillar] || 0 : 0;
                        const affMet = !reqAff || curAff >= reqAff.level;

                        return (
                          <div key={sk.id} className="relative">
                            {/* Vertical SVG Connector Line to next skill in branch */}
                            {sIdx < branchSkills.length - 1 && (
                              <svg
                                className="w-6 h-5 mx-auto -mb-1 pointer-events-none"
                                viewBox="0 0 24 20"
                              >
                                <line
                                  x1="12"
                                  y1="0"
                                  x2="12"
                                  y2="20"
                                  stroke={curLv > 0 ? '#c5a059' : '#3a3a3a'}
                                  strokeWidth="2.5"
                                />
                              </svg>
                            )}

                            <div
                              className={`p-2.5 text-xs ${
                                curLv > 0 ? 'df-card-active' : 'df-card'
                              }`}
                            >
                              <div className="flex justify-between items-center gap-1">
                                <span className="font-bold text-[#dfd2b4]">{sk.name}</span>
                                <span
                                  className={`font-mono text-[10px] px-1.5 py-0.5 border ${
                                    curLv > 0
                                      ? 'bg-[#2e0b0f] border-[#c5a059] text-[#c5a059]'
                                      : 'bg-[#141116] border-[#3a3a3a] text-[#9b8f82]'
                                  }`}
                                >
                                  Cấp {curLv}/3
                                </span>
                              </div>

                              {/* Lv.1 -> Lv.2 -> Lv.3 Node Pip Bar */}
                              <div className="flex items-center gap-1 my-1.5">
                                {[1, 2, 3].map((pip) => (
                                  <React.Fragment key={pip}>
                                    <div
                                      className={`w-5 h-4 text-[9px] font-mono flex items-center justify-center border ${
                                        curLv >= pip
                                          ? 'bg-[#8b0000] border-[#c5a059] text-[#f3e6c4] font-bold'
                                          : 'bg-[#0d0a0e] border-[#3a3a3a] text-[#6e645b]'
                                      }`}
                                    >
                                      L{pip}
                                    </div>
                                    {pip < 3 && (
                                      <div
                                        className={`flex-1 h-0.5 ${
                                          curLv >= pip + 1 ? 'bg-[#c5a059]' : 'bg-[#3a3a3a]'
                                        }`}
                                      />
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>

                              <p className="text-[11px] text-[#d3d3d3]/85 leading-snug">
                                {curLv <= 1 ? sk.descLv1 : curLv === 2 ? sk.descLv2 : sk.descLv3}
                              </p>

                              {reqAff && curLv === 0 && (
                                <div
                                  className={`text-[10px] mt-1 font-mono ${
                                    affMet ? 'text-[#9ab08e]' : 'text-[#c96b6b]'
                                  }`}
                                >
                                  {affMet ? '✓' : '•'} Yêu cầu Tín Ngưỡng {branchName} ≥ {reqAff.level} (Hiện có: {curAff}/3)
                                </div>
                              )}

                              {lockedByBan && (
                                <div className="text-[10px] text-[#c96b6b] mt-1">
                                  * Bị Thánh Mẫu khước từ (Tha Hóa/Huyết Quỷ/Nuốt Xác)!
                                </div>
                              )}
                              {lockedByDemonic && (
                                <div className="text-[10px] text-[#c96b6b] mt-1">
                                  * Khóa phép Thánh Mẫu bậc cao do Huyết Quỷ ≥ 2!
                                </div>
                              )}

                              <div className="mt-2 pt-1.5 border-t border-[#3a3a3a]/60 flex items-center justify-between gap-1">
                                <span className="text-[10px] text-[#c5a059]">-{sk.mindCost} Lý Trí</span>
                                {curLv >= 3 ? (
                                  <span className="text-[10px] text-[#c5a059] font-bold">TỐI ĐA</span>
                                ) : curLv === 0 && !reqAff ? (
                                  <span
                                    className="text-[10px] text-[#9b8f82] italic text-right"
                                    title="Tìm Cuộn Bí Kíp trên Kệ Sách và đọc trong Túi [I] để mở khóa Cấp 1"
                                  >
                                    🔒 Đọc Cuộn Bí Kíp (Túi [I])
                                  </span>
                                ) : curLv === 0 && reqAff && (!affMet || lockedHoly) ? (
                                  <span className="text-[10px] text-[#9b8f82] italic text-right">
                                    {lockedHoly
                                      ? '🔒 Đã bị Thánh Mẫu khước từ'
                                      : `🔒 Cần Tín Ngưỡng ≥ ${reqAff.level}`}
                                  </span>
                                ) : (
                                  <button
                                    disabled={player.energyStones < 1 || lockedHoly}
                                    onClick={() => {
                                      const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                                      const res = learnOrUpgradeHexenSkill(pCopy, sk.id);
                                      if (res.success) {
                                        setPlayer(pCopy);
                                      }
                                      setHexenFeedback(res.message);
                                      addLog(res.message);
                                    }}
                                    className="df-btn-blood px-2.5 py-1 disabled:opacity-35 font-bold text-[10px] cursor-pointer"
                                  >
                                    {curLv === 0
                                      ? 'Học Cấp 1 (-1 Đá LH)'
                                      : `Nâng Cấp ${curLv + 1} (-1 Đá LH)`}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL 4: CANON FLOOR 1, 2, 3 NPCS, VOID RIFT & VAELIS CLIMAX
      ======================================================================== */}
      {/* All NPC & Void Rift / Throne Climax interactions now use the unified RPG Bottom Dialogue Box + Docked Right-Side Choice Window */}

      {/* ========================================================================
          MODAL 5: SAVE / LOAD SLOTS
      ======================================================================== */}
      {activeModal === 'saves' && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="max-w-lg w-full df-panel p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-[#c5a059]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#dfd2b4]">
                  Giường Đá Lưu Trữ – 5 Ô Hồ Sơ (Seed: {world.seed})
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
              {[0, 1, 2, 3, 4].map((idx) => {
                const slot = saveSlots[idx];
                return (
                  <div
                    key={idx}
                    className={`p-2.5 flex items-center justify-between gap-2 text-xs ${
                      slot ? 'df-card' : 'df-well'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[#dfd2b4]">
                        Ô LƯU #{idx + 1}{' '}
                        {slot?.player?.name ? <span className="text-[#c5a059]">— {slot.player.name}</span> : null}
                      </div>
                      {slot ? (
                        <div className="text-[#9b8f82] mt-0.5 text-[11px]">
                          {slot.timestamp} • Phòng {slot.world.currentRoomId} • Sinh Lực {slot.player.hp}/{slot.player.maxHp}
                        </div>
                      ) : (
                        <div className="text-[#7a7066] italic text-[11px]">Ô Trống — Có thể tạo Hồ Sơ Lưu mới</div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          saveToSlot(idx);
                          setActiveModal(null);
                          setLogOverlayVisible(true);
                        }}
                        className="df-btn-bronze px-2.5 py-1 font-bold cursor-pointer"
                      >
                        {slot ? 'Lưu Đè' : 'Lưu Mới'}
                      </button>
                      {slot && (
                        <>
                          <button
                            onClick={() => loadFromSlot(idx)}
                            className="df-btn px-2.5 py-1 font-bold cursor-pointer"
                          >
                            Tải Lại
                          </button>
                          <button
                            onClick={() => deleteSaveSlot(idx)}
                            className="df-btn-blood px-2 py-1 cursor-pointer"
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL 5B: SURVIVAL GUIDEBOOK MODAL (📖 CẨM NANG SINH TỒN [?])
      ======================================================================== */}
      {activeModal === 'guide' && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full df-panel p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#c5a059]" />
                <h2
                  className="text-xl font-bold uppercase tracking-wider text-[#dfd2b4]"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  📖 Sách Cẩm Nang Sinh Tồn – Thung Lũng Xương Tàn
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
              >
                Đóng [ESC]
              </button>
            </div>

            {/* 4 Concise Guide & Chronicle Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setGuideTab('lore')}
                className={`py-2 px-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer ${
                  guideTab === 'lore' ? 'df-btn-active' : 'df-btn'
                }`}
              >
                0. Biên Niên Sử
              </button>
              <button
                onClick={() => setGuideTab('move')}
                className={`py-2 px-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer ${
                  guideTab === 'move' ? 'df-btn-active' : 'df-btn'
                }`}
              >
                1. Di Chuyển [F]
              </button>
              <button
                onClick={() => setGuideTab('combat')}
                className={`py-2 px-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer ${
                  guideTab === 'combat' ? 'df-btn-active' : 'df-btn'
                }`}
              >
                2. Chặt Chi [1..5]
              </button>
              <button
                onClick={() => setGuideTab('survival')}
                className={`py-2 px-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer ${
                  guideTab === 'survival' ? 'df-btn-active' : 'df-btn'
                }`}
              >
                3. Sinh Tồn &amp; Lọ
              </button>
            </div>

            {/* Tab 0: Biên Niên Sử (Spoiler-Free) */}
            {guideTab === 'lore' && (
              <div className="df-well p-3 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] leading-snug text-[#d3d3d3]">
                <div className="p-2.5 df-card space-y-1">
                  <div className="font-bold text-[#c96b6b] uppercase">3 Tầng Thung Lũng</div>
                  <p>• <b>Tầng 1:</b> Lâu Đài Hắc Ám đổ nát phủ bóng xuống kinh thành.</p>
                  <p>• <b>Tầng 2:</b> Đại Giáo Đường Goethe nơi chướng khí bắt đầu dâng cao.</p>
                  <p>• <b>Tầng 3:</b> Vực Sao lạnh lẽo ẩn giấu vết rách tận đáy địa tầng.</p>
                </div>

                <div className="p-2.5 df-card space-y-1">
                  <div className="font-bold text-[#c5a059] uppercase">Các Thế Lực Cổ Xưa</div>
                  <p>• <b>Thánh Mẫu:</b> Đức tin cũ kỹ còn sót lại trên những Đài Cộng Hưởng rỉ máu.</p>
                  <p>• <b>Hư Vô &amp; Huyết Quỷ:</b> Nguồn sức mạnh cấm kỵ bào mòn Lý Trí và tâm hồn.</p>
                  <p>• <b>Bản Ghi Cổ:</b> Lục tìm trang da dê trên kệ sách để ghép nối sự thật.</p>
                </div>

                <div className="p-2.5 df-card space-y-1">
                  <div className="font-bold text-[#a889b8] uppercase">Tổ Đội &amp; Lựa Chọn</div>
                  <p>• Chiêu mộ đồng đội sống sót hoặc dùng Chiêu Hồn Thuật lập đội tối đa 4 người.</p>
                  <p>• Mọi hành động tàn nhẫn hay cứu rỗi dọc đường đều xoay chuyển số phận cuối cùng.</p>
                </div>
              </div>
            )}

            {/* Tab 1: Di chuyển & Tương tác */}
            {guideTab === 'move' && (
              <div className="df-well p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] leading-snug text-[#d3d3d3]">
                <div className="p-2.5 df-card">
                  <div className="font-bold text-[#c5a059] uppercase mb-0.5">WASD • Nhịp Sinh Tồn</div>
                  <p>Đi từng ô theo nhịp <b>220ms</b>. Mỗi bước tiêu hao nhẹ Độ Đói &amp; đẩy nhanh độc/chảy máu nếu chưa băng bó.</p>
                </div>

                <div className="p-2.5 df-card">
                  <div className="font-bold text-[#dfd2b4] uppercase mb-0.5">[F] • Cạy Đồ &amp; NPC</div>
                  <p>Nhấn <b>[F]</b> để tương tác Thùng, Rương, Kệ Sách, Đài Cộng Hưởng, xác quái hoặc đồng đội tiềm năng.</p>
                </div>

                <div className="p-2.5 df-card">
                  <div className="font-bold text-[#a889b8] uppercase mb-0.5">[F] • Nổ Tường Nứt</div>
                  <p>Đứng sát tường rạn nứt và nhấn <b>[F]</b> dùng <b>Lọ Nâu</b> để mở thông lối đi bí mật.</p>
                </div>

                <div className="p-2.5 df-card">
                  <div className="font-bold text-[#9ab08e] uppercase mb-0.5">Giường Lưu &amp; Thẻ Bài Bạc</div>
                  <p>Đoán đúng xu để hồi phục &amp; Lưu game (<b>Thẻ Bài Bạc</b> tung 2 xu; <b>Lý Trí &lt; 30</b> mất quyền chọn xu!).</p>
                </div>
              </div>
            )}

            {/* Tab 2: Chiến thuật Chặt Chi */}
            {guideTab === 'combat' && (
              <div className="df-well p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] leading-snug text-[#d3d3d3]">
                <div className="p-2.5 df-card">
                  <div className="font-bold text-[#c5a059] uppercase mb-0.5">WASD + Enter • Phím [1..5]</div>
                  <p>Chọn chi bằng WASD/chuột rồi Enter/Click lần 2 để chém. Phím nhanh: <b>[1] Đánh, [2] Kỹ Năng, [3] Thủ, [4] Vật Phẩm, [5] Nói</b>.</p>
                </div>

                <div className="p-2.5 df-card">
                  <div className="font-bold text-[#c96b6b] uppercase mb-0.5">1. Chặt Tay Vũ Khí</div>
                  <p>Phá tay cầm vũ khí của quái trước để tước đòn chí mạng và ngắt kỹ năng nguy hiểm.</p>
                </div>

                <div className="p-2.5 df-card">
                  <div className="font-bold text-[#9ab08e] uppercase mb-0.5">2. Chặt Chân → 95% Trúng Đầu</div>
                  <p>Quái mất chân sẽ quỵ ngã, đẩy tỉ lệ trúng <b>Đầu</b> lên <b>95%</b> để kết liễu nhanh.</p>
                </div>

                <div className="p-2.5 df-card">
                  <div className="font-bold text-[#c5a059] uppercase mb-0.5">3. Thủ &amp; Vũ Khí Nguyền</div>
                  <p>Dùng <b>[Phòng Thủ] / Thế Thủ</b> khi Boss tụ lực đỏ. <b>Vũ khí Nguyền</b> khóa tay &amp; phản chủ khi <b>Lý Trí &lt; 40</b>.</p>
                </div>
              </div>
            )}

            {/* Tab 3: 3 Thanh Sinh Tồn & Lọ Thực Dụng */}
            {guideTab === 'survival' && (
              <div className="df-well p-3 space-y-2.5 text-[11px] leading-snug text-[#d3d3d3]">
                <div className="p-2.5 df-card flex flex-wrap gap-x-4 gap-y-0.5">
                  <span>• <b>Đói ≥ 50%:</b> -25% Sát Thương; <b>≥ 90%:</b> Né &amp; Chí mạng = 0.</span>
                  <span>• <b>Lý Trí &lt; 30:</b> Hoảng Loạn / Cuồng Loạn.</span>
                  <span>• <b>Nuốt xác:</b> -45% Đói, +20% Tha Hóa.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="p-2 df-card flex items-center gap-2">
                    <ItemArtworkCanvas itemOrWeaponId="brown_vial" size={30} />
                    <div>
                      <div className="font-bold text-[#c5a059]">Lọ Nâu (Thuốc Nổ)</div>
                      <p className="text-[10.5px] text-[#9b8f82]">Phá Tường Nứt <b>[F]</b> hoặc nổ <b>650–850 sát thương</b>.</p>
                    </div>
                  </div>

                  <div className="p-2 df-card flex items-center gap-2">
                    <ItemArtworkCanvas itemOrWeaponId="red_vial" size={30} />
                    <div>
                      <div className="font-bold text-[#c96b6b]">Lọ Đỏ (Axit Mù Mắt)</div>
                      <p className="text-[10.5px] text-[#9b8f82]">Gây <b>Mù 3 lượt (-70% trúng)</b> &amp; bào 50% Giáp.</p>
                    </div>
                  </div>

                  <div className="p-2 df-card flex items-center gap-2">
                    <ItemArtworkCanvas itemOrWeaponId="blue_vial" size={30} />
                    <div>
                      <div className="font-bold text-[#a3b2c4]">Thuốc Hồi Huyết &amp; Thuốc Giải Độc</div>
                      <p className="text-[10.5px] text-[#9b8f82]"><b>Hồi Huyết:</b> +50% Sinh Lực. <b>Giải Độc:</b> Xóa Độc, Nhiễm Trùng, Ký Sinh.</p>
                    </div>
                  </div>

                  <div className="p-2 df-card flex items-center gap-2">
                    <ItemArtworkCanvas itemOrWeaponId="purple_vial" size={30} />
                    <div>
                      <div className="font-bold text-[#a889b8]">Thuốc An Thần &amp; Nhựa Cây Ngủ Say</div>
                      <p className="text-[10.5px] text-[#9b8f82]"><b>An Thần:</b> -80% áp lực Lý Trí / trốn 100%. <b>Nhựa Cây:</b> +30 Lý Trí.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL 5C: SETTINGS MODAL (⚙ CÀI ĐẶT HỆ THỐNG [ESC])
      ======================================================================== */}
      {activeModal === 'settings' && (() => {
        const curRoom = world.rooms[world.currentRoomId];
        const rW = curRoom?.width || curRoom?.grid[0]?.length || CONFIG.GRID_W;
        const rH = curRoom?.height || curRoom?.grid.length || CONFIG.GRID_H;
        let nearBed = false;
        if (curRoom) {
          for (let ry = 0; ry < rH && !nearBed; ry++) {
            for (let rx = 0; rx < rW; rx++) {
              if (
                curRoom.grid[ry]?.[rx] === TILE.BED_SAVE &&
                Math.abs(playerPos.x - rx) + Math.abs(playerPos.y - ry) <= 1
              ) {
                nearBed = true;
                break;
              }
            }
          }
        }
        return (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="max-w-xl w-full df-panel p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2.5">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#c5a059]" />
                  <h2
                    className="text-lg font-bold uppercase tracking-wider text-[#dfd2b4]"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    Cài Đặt Hệ Thống
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setConfirmReturnTitle(false);
                    setActiveModal(null);
                  }}
                  className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
                >
                  Đóng [ESC]
                </button>
              </div>

              {/* Audio Controls */}
              <div className="df-well p-3.5 space-y-3 text-xs">
                <div className="font-bold uppercase tracking-wider text-[#c5a059]">
                  Âm Thanh &amp; Nhạc Nền
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[#d3d3d3]">
                    <span>Âm Lượng Nhạc Nền (BGM)</span>
                    <span className="font-mono text-[#c5a059]">
                      {Math.round(audioSettings.bgmVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(audioSettings.bgmVolume * 100)}
                    onChange={(e) => {
                      const next = sfx.updateSettings({
                        bgmVolume: Number(e.target.value) / 100,
                      });
                      setAudioSettings(next);
                    }}
                    className="w-full accent-[#c5a059] cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[#d3d3d3]">
                    <span>Âm Lượng Hiệu Ứng (SFX)</span>
                    <span className="font-mono text-[#c5a059]">
                      {Math.round(audioSettings.sfxVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(audioSettings.sfxVolume * 100)}
                    onChange={(e) => {
                      const next = sfx.updateSettings({
                        sfxVolume: Number(e.target.value) / 100,
                      });
                      setAudioSettings(next);
                    }}
                    className="w-full accent-[#c5a059] cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#d3d3d3]">Tắt Toàn Bộ Âm Thanh</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMuted = !audioSettings.muted;
                      const next = sfx.updateSettings({ muted: nextMuted });
                      setAudioSettings(next);
                      setMuted(nextMuted);
                    }}
                    className={`px-3 py-1 font-bold cursor-pointer ${
                      audioSettings.muted ? 'df-btn-blood' : 'df-btn-bronze'
                    }`}
                  >
                    {audioSettings.muted ? 'Đang Tắt' : 'Đang Bật'}
                  </button>
                </div>
              </div>

              {/* Visual & Tactile Options */}
              <div className="df-well p-3.5 space-y-2.5 text-xs">
                <div className="font-bold uppercase tracking-wider text-[#c5a059]">
                  Hiển Thị &amp; Hiệu Ứng
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#d3d3d3]">Rung Màn Hình Khi Giao Tranh</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = sfx.updateSettings({
                        screenShakeEnabled: !audioSettings.screenShakeEnabled,
                      });
                      setAudioSettings(next);
                    }}
                    className={`px-3 py-1 font-bold cursor-pointer ${
                      audioSettings.screenShakeEnabled ? 'df-btn-active' : 'df-btn'
                    }`}
                  >
                    {audioSettings.screenShakeEnabled ? 'Bật' : 'Tắt'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#d3d3d3]">Hạt Nhiễu Điện Ảnh (Film Grain)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = sfx.updateSettings({
                        filmGrainEnabled: !audioSettings.filmGrainEnabled,
                      });
                      setAudioSettings(next);
                    }}
                    className={`px-3 py-1 font-bold cursor-pointer ${
                      audioSettings.filmGrainEnabled ? 'df-btn-active' : 'df-btn'
                    }`}
                  >
                    {audioSettings.filmGrainEnabled ? 'Bật' : 'Tắt'}
                  </button>
                </div>
              </div>

              {/* Keyboard Controls Summary */}
              <div className="df-well p-3.5 space-y-1.5 text-[11px] text-[#d3d3d3]">
                <div className="font-bold uppercase tracking-wider text-[#c5a059] text-xs mb-1">
                  Phím Tắt Điều Khiển
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <div>• <b className="text-[#dfd2b4]">WASD / Mũi tên:</b> Di chuyển / Chọn chi</div>
                  <div>• <b className="text-[#dfd2b4]">F / Space:</b> Tương tác bản đồ</div>
                  <div>• <b className="text-[#dfd2b4]">1..6 + Enter:</b> Điều khiển Chiến Đấu</div>
                  <div>• <b className="text-[#dfd2b4]">I / L / ? / ESC:</b> Túi / Sách / Cẩm Nang / Cài Đặt</div>
                </div>
              </div>

              {/* Quick Save & Return to Title */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  disabled={!nearBed}
                  onClick={() => {
                    if (!nearBed) return;
                    setActiveModal('saves');
                  }}
                  title={
                    nearBed
                      ? 'Mở bảng 5 ô Lưu Tiến Trình'
                      : 'Hãy đứng cạnh Giường Đá Cổ để lưu tiến trình'
                  }
                  className="df-btn-bronze px-3.5 py-2 text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  {nearBed ? '💾 Lưu Nhanh (Tại Giường Đá)' : '💾 Lưu Nhanh (Cần đứng cạnh Giường Đá)'}
                </button>

                {!confirmReturnTitle ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReturnTitle(true)}
                    className="df-btn-blood px-3.5 py-2 text-xs font-bold cursor-pointer"
                  >
                    🚪 Về Màn Hình Chính
                  </button>
                ) : (
                  <div className="flex items-center gap-2 df-card p-1.5 px-2.5">
                    <span className="text-[11px] text-[#dfd2b4]">Thoát về Màn Hình Chính?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmReturnTitle(false);
                        setActiveModal(null);
                        setInteractionMenu(null);
                        setScreen('title');
                      }}
                      className="df-btn-blood px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                    >
                      Xác Nhận
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReturnTitle(false)}
                      className="df-btn px-2.5 py-1 text-[11px] cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {renderCoinTossModal()}
    </div>
  );
}
