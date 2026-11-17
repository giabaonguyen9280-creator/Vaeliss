import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Skull,
  Shield,
  BookOpen,
  Flame,
  Heart,
  Brain,
  Utensils,
  Compass,
  Sparkles,
  Backpack,
  Save,
  FolderOpen,
  Coins,
  Volume2,
  VolumeX,
  HelpCircle,
  Users,
} from 'lucide-react';
import { CONFIG } from './game/config';
import { CHARACTER_INTRO_STEPS, evaluateCanonEnding } from './game/narrative';
import { SeededRNG } from './game/prng';
import { sfx } from './game/audio';
import {
  drawPixelSprite,
  drawPartyBackSprite,
  drawItemIcon,
  drawPrologueScene,
  getLimbReticlePositions,
  drawEngravedGoldCoin,
} from './game/pixelArt';
import { DungeonMapViewport } from './components/DungeonMapViewport';
import {
  generateWorld,
  TILE,
  WorldMapState,
  RoomData,
  MapEnemyInstance,
  isWalkableTile,
} from './game/mapGen';
import {
  PlayerState,
  createInitialPlayer,
  getComputedPlayerStats,
  getPlayerStepCooldownMs,
  getEffectiveWeapon,
  canTargetEnemyLimb,
  applySupportItemEffects,
  devourEnemyCorpse,
  amputateInfectedLimbWithBoneSaw,
  applyIntroChoiceToPlayer,
  applyDefaultIntroLoadoutForRemainingSteps,
  isPlayerPanicking,
  canUnequipWeapon,
  canPlayerEquipGear,
  canPlayerEquipShield,
  bloodForgeWeapon,
  exorciseCursedWeapon,
  regrowLimbAtHexen,
  unlockHexenStatNode,
  prayAffinityAtHexen,
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
  | 'npc_priest'
  | 'npc_smuggler'
  | 'npc_prisoner'
  | 'npc_child_12'
  | 'npc_broken_knight'
  | 'npc_smith'
  | 'npc_glass_lady'
  | 'npc_physician'
  | 'npc_chronicler'
  | 'void_rift'
  | 'vaelis_climax';

type CombatMenuMode = 'main' | 'skills' | 'items';
type EquipSlotKey = 'weapon' | 'shield' | 'head' | 'body' | 'accessory';
export type CoinOutcomeTier = 'win' | 'partial' | 'lose';

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
    drawEngravedGoldCoin(ctx, side, size);
  }, [side, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={`transition-transform duration-700 ${
        flipping ? 'animate-spin scale-110' : 'hover:scale-105'
      }`}
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
  const [hoveredLimbId, setHoveredLimbId] = useState<string | null>(null);
  const [combatMenuMode, setCombatMenuMode] = useState<CombatMenuMode>('main');

  // Prologue state
  const [prologueFrame, setPrologueFrame] = useState<0 | 1 | 2>(0);
  const [backstoryChosen, setBackstoryChosen] = useState<boolean>(false);
  const [introStepIdx, setIntroStepIdx] = useState<0 | 1 | 2>(0);
  const [riftElixirCollected, setRiftElixirCollected] = useState<boolean>(false);
  const [hexenFeedback, setHexenFeedback] = useState<string | null>(null);

  // Modals & Equipment UI
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [invTab, setInvTab] = useState<'equip' | 'items' | 'saw'>('equip');
  const [invFeedback, setInvFeedback] = useState<string | null>(null);
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
    'Lâu Đài Ma Vương Vaelis từ vết rách không gian giáng xuống đè nát mái vòm Đại giáo đường Goethe.',
    'Bạn tỉnh dậy tại Ngoại Vi Đại Giáo Đường Goethe giữa sương mù và mùi máu tanh.',
  ]);
  const [lastStepTime, setLastStepTime] = useState<number>(0);
  const [animTick, setAnimTick] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
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

  // Trail coordinates so recruited party members follow behind the player on the map
  const [trailCoords, setTrailCoords] = useState<Array<{ x: number; y: number }>>([
    { x: 3, y: 10 },
    { x: 2, y: 10 },
  ]);

  const prologueCanvasRef = useRef<HTMLCanvasElement | null>(null);
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

  // Draw Prologue Canvas
  useEffect(() => {
    if (screen !== 'prologue') return;
    const canvas = prologueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPrologueScene(ctx, prologueFrame, canvas.width, canvas.height, player.classId);
  }, [screen, prologueFrame, player.classId]);

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
          subtitle: `${subtitle} [HOẢNG LOẠN SAN < 30: Mất quyền chọn mặt xu!]`,
          chosenSide: autoSide,
          flipping: true,
          resultSide: null,
          isPanicAuto: true,
          outcomeText: null,
          onResolve,
          onLockpick,
        });
        setTimeout(() => {
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
                  outcomeText: won
                    ? '😱 TRONG CƠN HOẢNG LOẠN, BẠN VẪN MAY MẮN THOÁT HIỂM!'
                    : '💀 HOẢNG LOẠN CHI PHỐI! Đồng xu ngẫu nhiên rơi vào mặt tử thần.',
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

  const handleChooseCoinSide = (side: 'HEADS' | 'TAILS', tossTwoWithShift: boolean = false) => {
    if (!coinToss || coinToss.flipping || coinToss.resultSide) return;
    sfx.playHealOrChime();
    setCoinToss({
      ...coinToss,
      chosenSide: side,
      flipping: true,
      useTwoCoinsShift: tossTwoWithShift,
    });

    setTimeout(() => {
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
      let text = win1
        ? '🪙 ĐỒNG XU VÀNG HỘ MỆNH! Bạn đã đoán đúng mặt xu định mệnh.'
        : '💀 ĐỒNG XU BÁO TỬ! Định mệnh quay lưng với bạn.';

      if (tossTwoWithShift) {
        win2 = rng.chance(winChance);
        landed2 = win2 ? side : side === 'HEADS' ? 'TAILS' : 'HEADS';
        if (win1 && win2) {
          tier = 'win';
          totalWon = true;
          text =
            '🪙🪙 CẢ 2 ĐỒNG XU ĐỀU TRÚNG MẶT CHỌN! Phần thưởng trọn vẹn như thắng với 1 đồng!';
        } else if (win1 || win2) {
          tier = 'partial';
          totalWon = true;
          text =
            '🪙⚖️ KẾT QUẢ 1 NGỬA – 1 SẤP (Giữ Shift tung 2 xu): Vẫn qua ải nhưng vật phẩm/hiệu quả kém hơn so với thắng bằng 1 đồng!';
        } else {
          tier = 'lose';
          totalWon = false;
          text = '💀 CẢ 2 ĐỒNG XU ĐỀU TRẬT! Định mệnh giáng hình phạt như thua 1 đồng.';
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
  };

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
      ]);
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
        '🗡️ Lời Nguyền Hóa Đá: Lớp vảy đá xám trên cánh tay lại nhói buốt. Chỉ có bình Tiên Dược Cổ Đại dưới đáy Vực Sao và Lõi Khóa Hư Vô mới giúp bạn thoát khỏi Thung Lũng Xương Tàn.',
    };
    setScreen('playing');
    setNarrativeLogs([
      `[Seed: ${world.seed}] Bạn đứng trước Cổng Sắt Răng Cưa tại ${startRoom.name}.`,
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
    addLog(`Đã khắc ấn ký lưu tiến trình vào Ô Lưu #${slotIdx + 1}.`);
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
    setWorld(restoredWorld);
    setPlayer(data.player);
    setPlayerPos(spawnPos);
    setSeedInput(restoredSeed);
    setAreaBannerText(restoredRoom?.name || 'Ngoại Vi Đại Giáo Đường Goethe');
    setTrailCoords([
      { x: Math.max(1, spawnPos.x - 1), y: spawnPos.y },
      { x: Math.max(1, spawnPos.x - 2), y: spawnPos.y },
    ]);
    setActiveEnemyUid(null);
    setEndingInfo(null);
    setActiveModal(null);
    setTitleSaveModalOpen(false);
    setScreen('playing');
    addLog(`Đã khôi phục ký ức từ Ô Lưu #${slotIdx + 1} (Quay về Seed cũ: ${restoredSeed}).`);
  };

  const deleteSaveSlot = (slotIdx: number) => {
    localStorage.removeItem(`${CONFIG.SAVE_KEY_PREFIX}${slotIdx}`);
    refreshSaveSlots();
  };

  const currentRoom: RoomData = world.rooms[world.currentRoomId];
  const activeCombatEnemy: MapEnemyInstance | undefined = currentRoom.enemies.find(
    (e) => e.uid === activeEnemyUid
  );

  // Enter Combat against a map enemy instance
  const startCombatWithEnemy = useCallback(
    (enemyInst: MapEnemyInstance) => {
      const tpl = CONFIG.ENEMIES[enemyInst.templateId];
      if (!tpl) return;
      setActiveEnemyUid(enemyInst.uid);
      const defaultLimb =
        enemyInst.limbs.find((l) => l.isWeaponArm && l.hp > 0)?.id ||
        enemyInst.limbs.find((l) => l.hp > 0)?.id ||
        'torso';
      setSelectedLimbId(defaultLimb);
      setFocusedLimbId(null);
      setCombatMenuMode('main');
      combatEngineRef.current.resetStageEffects();
      setCombatLogs([
        `⚔️ CHẠM TRÁN: ${enemyInst.customName || tpl.name}!`,
        enemyInst.isTutorialGatekeeper
          ? '💡 MẸO TÂN THỦ: Nhắm chặt [Tay Phải (Kiếm Gãy)] của Kẻ Gác Cổng trước để phế bỏ vũ khí!'
          : `Quan sát kỹ các khớp chi của ${tpl.name} trước khi tung đòn.`,
      ]);
      setScreen('combat');
      setInteractionMenu(null);
      setLogOverlayVisible(false);
      addLog(`⚔️ Giao chiến với ${enemyInst.customName || tpl.name}!`);
    },
    [addLog]
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
      const msg = '⚠️ Bạn không còn Lọ Nâu (Dung Dịch Nổ) trong túi!';
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

    // Check within 2 tiles of playerPos so standing near a Cracked Wall reliably blows it open
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
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
        '⚠️ Chưa thể kích nổ (Lọ Nâu vẫn còn nguyên)! Hãy di chuyển đến đứng gần bức Tường Đá Rạn Nứt rồi nhấn phím [F] để phá tường mở Mật Thất!';
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
    const okMsg = '💥 ẦM! Lọ Nâu phá tung bức tường nứt, mở toang khoang Mật Thất ẩn giấu!';
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
        'Bức tường đá có nhiều vết nứt sâu dẫn vào Mật Thất ẩn giấu. Bạn có muốn châm nổ bức tường bằng Lọ Nâu (Thuốc Nổ) không?',
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

  // Opens Fear & Hunger / Termina style RPG Dialogue Box + Docked Right-Side Choice Menu for any NPC, Void Rift, or Throne Climax
  const openNpcRpgDialogue = useCallback(
    (npcId: string, customSpeech?: string) => {
      const closePrompt = () => {
        setInteractionMenu(null);
        setLogOverlayVisible(false);
      };

      if (npcId === 'npc_priest') {
        const speech =
          customSpeech ||
          '“Khụ... Ta tự chọc mù mắt sau khi nhìn thấy máu đen rỉ ra từ tượng Thánh Mẫu. Kẻ mà thế gian gọi là Ma Vương — Hiệp Sĩ Trưởng Vaelis — thật ra đang dùng thân xác mình làm nắp hầm chặn Vết Rách Vực Sao!”';
        const choices: InteractionChoice[] = [
          {
            label: '"Chuyện gì đã xảy ra với 13 Thánh Tử dưới tầng hầm?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_priest',
                '“Các giám mục đã giam 13 đứa trẻ vô tội dưới hầm ngầm để rút máu vàng nuôi ánh sáng giả tạo. Đứa thứ 12 đang hấp hối ở Hậu Cung, còn đứa thứ 13 đã bị kéo xuống tận đáy Vực Sao...”'
              ),
          },
          {
            label: '"Làm sao để chấm dứt bi kịch của Thung Lũng này?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_priest',
                '“Hãy tìm Lõi Khóa Hư Vô nơi Ngai Vàng Máu Tầng 1, rồi mang xuống Vết Rách Tầng 3. Nhưng coi chừng — chỉ cần vấy bẩn dù chỉ 1% Tha Hóa (COR > 0), Thánh Mẫu sẽ khước từ ngươi!”'
              ),
          },
        ];

        if (!player.npcFlags.priestHelped) {
          const canHeal =
            (player.inventory.green_herb || 0) > 0 || (player.inventory.white_vial || 0) > 0;
          choices.push({
            label: canHeal
              ? '🌿 Trao Thảo Dược / Lọ Trắng cứu chữa (+2 Đá NL & Sổ Kiểm Kê Tế Lễ)'
              : '🌿 Trao Thảo Dược cứu chữa (Cần Thảo Dược Xanh hoặc Lọ Trắng)',
            onSelect: () => {
              if (!canHeal) {
                openNpcRpgDialogue(
                  'npc_priest',
                  '“Khụ khụ... Ngươi chưa có Thảo Dược Xanh hay Lọ Thuốc Trắng nào trong hành trang cả...”'
                );
                return;
              }
              const useWhite = (player.inventory.green_herb || 0) <= 0;
              const secondBookId = CONFIG.BOOKS[1].id;
              setPlayer((prev) => ({
                ...prev,
                energyStones: prev.energyStones + 2,
                readBookIds: prev.readBookIds.includes(secondBookId)
                  ? prev.readBookIds
                  : [...prev.readBookIds, secondBookId],
                inventory: {
                  ...prev.inventory,
                  green_herb: useWhite
                    ? prev.inventory.green_herb
                    : Math.max(0, (prev.inventory.green_herb || 0) - 1),
                  white_vial: useWhite
                    ? Math.max(0, (prev.inventory.white_vial || 0) - 1)
                    : prev.inventory.white_vial,
                },
                npcFlags: { ...prev.npcFlags, priestHelped: true },
              }));
              setInteractionMenu(null);
              addLog(
                '✨ Giáo Sĩ Mù trao tặng +2 Đá Năng Lượng và [Sổ Kiểm Kê Tế Lễ 13 Thánh Tử]!'
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
        const speech =
          customSpeech ||
          (player.questFlags?.child12Resolved
            ? '“Chỉ còn bộ khung sắt lạnh lẽo và chiếc áo lễ trắng đẫm máu trên tế đàn...”'
            : '“Đừng... đừng nhìn vào đôi mắt ta... Các giám mục đã cắm 7 ống đồng rút cạn máu tủy của bọn ta để nuôi hào quang Thánh Mẫu. Thánh Tử Thứ 13 — em út của bọn ta — đã bị kéo xuống Vết Rách Tầng 3 rồi...”');
        const choices: InteractionChoice[] = [];
        if (!player.questFlags?.child12Resolved) {
          choices.push(
            {
              label: '"Ai đã dựng nên cỗ máy sáp trắng kinh tởm này?"',
              onSelect: () =>
                openNpcRpgDialogue(
                  'npc_child_12',
                  '“Chính Hồng Y Sáp Trắng... Hắn bảo máu của 13 đứa trẻ mang ấn ký sẽ giữ cho Đại Giáo Đường bất tử, nhưng thứ rỉ ra từ tượng Thánh Mẫu chỉ toàn là máu đen của Hư Vô...”'
                ),
            },
            {
              label: '✝ Giải thoát nhẹ nhàng (-10 Tha Hóa & nhận [Mảnh Linh Hồn Thuần Khiết])',
              onSelect: () => {
                setPlayer((prev) => ({
                  ...prev,
                  corruption: Math.max(0, prev.corruption - 10),
                  inventory: {
                    ...prev.inventory,
                    pure_soul_shard: (prev.inventory.pure_soul_shard || 0) + 1,
                  },
                  questFlags: { ...prev.questFlags, child12Resolved: true },
                }));
                setInteractionMenu(null);
                addLog(
                  '✝️ Bạn rút nhẹ các ống kim loại, giải thoát linh hồn Thánh Tử Thứ 12 (-10 COR, nhận [Mảnh Linh Hồn Thuần Khiết]).'
                );
                setLogOverlayVisible(true);
              },
            },
            {
              label: '🩸 Rút cạn máu vàng tế đàn (+15 COR, +2 Đá NL & +2 Bình Máu)',
              onSelect: () => {
                setPlayer((prev) => ({
                  ...prev,
                  corruption: Math.min(100, prev.corruption + 15),
                  energyStones: prev.energyStones + 2,
                  inventory: {
                    ...prev.inventory,
                    blood_vial: (prev.inventory.blood_vial || 0) + 2,
                  },
                  questFlags: { ...prev.questFlags, child12Resolved: true },
                }));
                setInteractionMenu(null);
                addLog(
                  '🩸 Bạn rút cạn ống máu vàng của Thánh Tử Thứ 12 (+15 COR, +2 Đá NL, +2 Bình Máu).'
                );
                setLogOverlayVisible(true);
              },
            }
          );
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
        const speech =
          customSpeech ||
          (player.questFlags?.brokenKnightResolved
            ? '“Hãy mang chiếc nhẫn ấy lên Tầng 1 cho Quý Cô trong Lồng Kính... và giải thoát cho Đội trưởng Vaelis...”'
            : '“Các giáo sĩ đã khóa chặt cổng sắt sau lưng bọn ta... Trước khi bước lên Ngai Vàng Máu, Đội trưởng Vaelis đã nhờ ta giữ chiếc nhẫn đính hôn này. Xin ngươi... hãy mang nó lên Tầng 1 trao lại cho tiểu thư trong Lồng Kính...”');
        const choices: InteractionChoice[] = [
          {
            label: '"Vì sao Đội trưởng Vaelis lại trở thành Ma Vương?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_broken_knight',
                '“Ngài ấy không hề phản bội nhân loại! Khi thấy Vết Rách Vực Sao sắp nuốt chửng thế giới, Vaelis đã tự cắm hàng chục thanh đại kiếm ghim thân xác mình xuống Ngai Vàng Máu làm nắp hầm phong ấn!”'
              ),
          },
        ];
        if (!player.questFlags?.brokenKnightResolved) {
          choices.push(
            {
              label: '💍 Nhận [Nhẫn Kỵ Sĩ Của Vaelis] & băng bó cho anh ta',
              onSelect: () => {
                setPlayer((prev) => ({
                  ...prev,
                  inventory: {
                    ...prev.inventory,
                    knight_ring: (prev.inventory.knight_ring || 0) + 1,
                  },
                  questFlags: { ...prev.questFlags, brokenKnightResolved: true },
                }));
                setInteractionMenu(null);
                addLog('💍 Nhận [Nhẫn Kỵ Sĩ Của Vaelis] từ người lính gãy chân.');
                setLogOverlayVisible(true);
              },
            },
            {
              label: '⚔️ Ban cái chết êm ái (+8 COR, +12 Bạc & nhận [Nhẫn Kỵ Sĩ])',
              onSelect: () => {
                setPlayer((prev) => ({
                  ...prev,
                  corruption: Math.min(100, prev.corruption + 8),
                  silverCoins: prev.silverCoins + 12,
                  inventory: {
                    ...prev.inventory,
                    knight_ring: (prev.inventory.knight_ring || 0) + 1,
                  },
                  questFlags: { ...prev.questFlags, brokenKnightResolved: true },
                }));
                setInteractionMenu(null);
                addLog(
                  '⚔️ Bạn ban nhát kiếm giải thoát cho Kỵ Sĩ Gãy Chân (+8 COR, +12 Bạc, nhận [Nhẫn Kỵ Sĩ]).'
                );
                setLogOverlayVisible(true);
              },
            }
          );
        }
        choices.push({ label: 'Rời đi', onSelect: closePrompt });
        setInteractionMenu({
          title: 'KỴ SĨ GÃY CHÂN',
          description: speech,
          selectedIndex: 0,
          choices,
        });
        return;
      }

      if (npcId === 'npc_smith') {
        const speech =
          customSpeech ||
          '“...” (Từ vết sẹo cổ cụt ngang phát ra tiếng thở khò khè như bễ lò rèn. Bốn cánh tay khổng lồ giơ búa tạ chỉ vào chảo sắt sôi máu quỷ — sẵn sàng tôi luyện vũ khí lên bậc Huyết Rèn +35% sát thương, đổi lấy +15 COR).';
        const choices: InteractionChoice[] = [
          {
            label: '"Ngươi từng là thợ rèn của Kỵ Đoàn Vaelis sao?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_smith',
                '“...Khộc... Khộc...” (Gã gõ nhịp búa lên đe sắt đẫm máu, chỉ lên bức tường đá đen nơi khắc phù hiệu Quân Đoàn Thập Tự đã bị gạch chéo bằng lửa địa ngục).'
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
                ? `✓ [${w.name}] đã tôi luyện Huyết Rèn (+35% DMG)`
                : `🔥 Huyết Rèn [${w.name}] (+35% DMG vĩnh viễn, +15 COR)`,
              onSelect: () => {
                if (forged) {
                  openNpcRpgDialogue(
                    'npc_smith',
                    `“ Thanh [${w.name}] đã uống no máu quỷ trong lò rèn rồi... Hãy chọn vũ khí khác.”`
                  );
                  return;
                }
                const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                const res = bloodForgeWeapon(pCopy, wId);
                pCopy.questFlags.smithUsed = true;
                setPlayer(pCopy);
                setInteractionMenu(null);
                addLog(res.message);
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
            : '“Vaelis đã giam ta trong chiếc lồng pha lê này để Chướng Khí không thể ăn mòn tâm trí ta... Ngươi có nhìn thấy chiếc nhẫn đính hôn của chàng nơi tầng dưới không?”');
        const choices: InteractionChoice[] = [
          {
            label: '"Vaelis vẫn đang chờ ở phòng Ngai Vàng phía trước sao?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_glass_lady',
                '“Phải... Chàng tự trói mình bằng hàng chục thanh đại kiếm trên Ngai Vàng Máu. Nếu gặp chàng trong trận chiến, xin hãy Trò Chuyện [5] để đánh thức chút nhân tính cuối cùng của chàng...”'
              ),
          },
        ];
        if (!player.questFlags?.glassLadyResolved) {
          const hasRing = (player.inventory.knight_ring || 0) > 0;
          choices.push(
            {
              label: hasRing
                ? '💍 Trao lại [Nhẫn Kỵ Sĩ Của Vaelis] (Hồi 100% HP/SAN + Chìa Khóa Tư Liệu Mật)'
                : '💍 Trao lại [Nhẫn Kỵ Sĩ Của Vaelis] (Chưa có Nhẫn Kỵ Sĩ)',
              onSelect: () => {
                if (!hasRing) {
                  openNpcRpgDialogue(
                    'npc_glass_lady',
                    '“Ngươi vẫn chưa tìm thấy chiếc nhẫn đính hôn của Vaelis ư? Người cận vệ giữ nhẫn đã kẹt lại ở Hầm Rượu Tầng 2 rồi...”'
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
                  '💍✨ Quý Cô ôm chiếc nhẫn bật khóc: Hồi 100% HP & SAN, nhận [Chìa Khóa Tư Liệu Mật Goethe] & Hồ Sơ Tội Đồ!'
                );
                setLogOverlayVisible(true);
              },
            },
            {
              label: '💥 Đập vỡ Lồng Kính cướp Đá Năng Lượng (+2 Đá NL, +15 COR)',
              onSelect: () => {
                setPlayer((prev) => ({
                  ...prev,
                  corruption: Math.min(100, prev.corruption + 15),
                  energyStones: prev.energyStones + 2,
                  questFlags: { ...prev.questFlags, glassLadyResolved: true },
                }));
                setInteractionMenu(null);
                addLog(
                  '💔 Bạn đập vỡ Lồng Kính lấy đi mảnh kết tinh (+15 COR, +2 Đá Năng Lượng).'
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
        const speech =
          customSpeech ||
          '“Hắc hắc! Ngươi xuống tới Vực Sao rồi sao? Ở chỗ Vết Rách Không Gian kia chỉ còn ĐÚNG MỘT BÌNH [Tiên Dược Cổ Đại]! Hoặc ngươi uống nó để tẩy sạch độc hóa đá mà chạy trốn, hoặc tưới nó lên Thánh Tử Thứ 13 cùng Lõi Khóa của Vaelis để khai sinh Thần Ý Chí!”';
        const choices: InteractionChoice[] = [
          {
            label: '"Cánh tay và đôi chân hóa đá của ông là do Chướng Khí Vực Sao ư?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_physician',
                '“Chính xác! Chướng khí ở Tầng 3 biến máu thịt thành đá vôi xám xịt. Ta đã tự gắn bánh xe gỗ vào hông mình để tiếp tục nghiên cứu công thức Giả Kim Cấm!”'
              ),
          },
        ];
        if (!player.questFlags?.physicianTalked) {
          choices.push({
            label: '🧪 Học 2 Công Thức Giả Kim Cấm & nhận +1 Lọ Thuốc Xanh',
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
                '🧪 Lão Thần Y trao tặng 1 Lọ Thuốc Xanh và mở khóa 2 công thức Giả Kim Cấm!'
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
          '“Thánh Mẫu chọn Khuôn Khổ Trật Tự. Ác Quỷ chọn Tham Vọng. Còn Thánh Thụ chỉ nảy mầm từ Ý Chí Tự Do! Nếu ngươi giữ tâm hồn thuần khiết (COR = 0), hãy cầm lấy [3 Mảnh Thần Chú Tái Thiết] này cùng Lõi Khóa Hư Vô để đóng vĩnh viễn Vết Rách.”';
        const choices: InteractionChoice[] = [
          {
            label: '"Bia đá cổ ngữ này ghi chép gì về nguồn gốc Vết Rách?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_chronicler',
                '“Trước khi Giáo Đường Goethe được xây dựng, nơi đây là rễ của Thánh Thụ Cổ Đại. Khi giáo hội chặt đứt gốc cây để dựng tượng Thánh Mẫu, Vết Rách Hư Vô đã toạc mở dưới đáy vực!”'
              ),
          },
        ];
        if (!player.questFlags?.chroniclerTalked) {
          choices.push({
            label: '📜 Nhận [3 Mảnh Thần Chú Tái Thiết] & Giải mã Cổ Thư #1–4',
            onSelect: () => {
              const loreBooks = CONFIG.BOOKS.slice(0, 4).map((b) => b.id);
              setPlayer((prev) => ({
                ...prev,
                readBookIds: Array.from(new Set([...prev.readBookIds, ...loreBooks])),
                inventory: {
                  ...prev.inventory,
                  reconstruction_scroll: (prev.inventory.reconstruction_scroll || 0) + 1,
                },
                questFlags: { ...prev.questFlags, chroniclerTalked: true },
              }));
              setInteractionMenu(null);
              addLog(
                '📜 Kẻ Chép Sử Hóa Thạch trao [3 Mảnh Thần Chú Tái Thiết] & giải mã Cổ Thư #1–4!'
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
            'Kẻ Buôn Lậu Đeo Mặt Nạ đã khóa chặt sạp hàng và biến mất vì bạn trả giá quá rẻ mạt.'
          );
          setLogOverlayVisible(true);
          return;
        }
        const speech =
          customSpeech ||
          `“Hề hề... Túi của ngươi hiện có ${player.silverCoins} Đồng Bạc. Kể từ khi Kết Giới Chướng Khí khóa chặt Thung Lũng, đám giáo sĩ chết rục đều bỏ lại bạc trắng cả. Chọn món hàng ngươi cần đi!”`;
        const wares: Array<{ id: string; name: string; price: number }> = [
          { id: 'brown_vial', name: 'Lọ Nâu (Thuốc Nổ Phá Tường)', price: 6 },
          { id: 'red_vial', name: 'Lọ Đỏ (Axit Sôi Mù Mắt)', price: 6 },
          { id: 'bone_saw', name: 'Cưa Xương Rỉ Máu', price: 8 },
          { id: 'butcher_cleaver', name: 'Đao Phay Đồ Tể', price: 12 },
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
              setPlayer((prev) => ({
                ...prev,
                silverCoins: prev.silverCoins - w.price,
                unlockedWeapons:
                  w.id === 'butcher_cleaver' && !prev.unlockedWeapons.includes('butcher_cleaver')
                    ? [...prev.unlockedWeapons, 'butcher_cleaver']
                    : prev.unlockedWeapons,
                inventory:
                  w.id === 'butcher_cleaver'
                    ? prev.inventory
                    : {
                        ...prev.inventory,
                        [w.id]: (prev.inventory[w.id] || 0) + 1,
                      },
              }));
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
          '“Bọn giám mục đã lừa cả đội viễn chinh tiến vào rồi khóa trái Cổng Sắt sau lưng bọn ta để che giấu bí mật 13 Thánh Tử... Hãy cởi xích giúp ta, ta sẽ cầm trường kiếm đi theo bảo vệ ngươi cho tới tận Ngai Vàng của Đội trưởng Vaelis!”';
        const choices: InteractionChoice[] = [
          {
            label: '"Anh còn đủ sức cầm kiếm chiến đấu cùng tôi chứ?"',
            onSelect: () =>
              openNpcRpgDialogue(
                'npc_prisoner',
                '“Đôi tay này vẫn còn nguyên vẹn! Chỉ cần phá chốt cũi sắt, ta sẽ đi theo sau ngươi và chém hỗ trợ mỗi hiệp giao chiến!”'
              ),
          },
        ];
        if (!player.npcFlags.prisonerRecruited) {
          choices.push({
            label: '⛓️ Phá xiềng xích & Chiêu mộ Kael vào Đội Hình',
            onSelect: () => {
              setPlayer((prev) => ({
                ...prev,
                npcFlags: { ...prev.npcFlags, prisonerRecruited: true },
                party: [
                  {
                    id: 'ally_kael',
                    name: 'Kael (Tù Nhân)',
                    classId: 'fallen_knight',
                    hp: 95,
                    maxHp: 95,
                    mind: 80,
                    maxMind: 80,
                    weaponId: 'broad_iron_sword',
                    guarding: false,
                    limbs: {
                      leftArm: true,
                      rightArm: true,
                      leftLeg: true,
                      rightLeg: true,
                    },
                  },
                ],
              }));
              setInteractionMenu(null);
              addLog(
                '🤝 Tù Nhân Kael đã gia nhập Đội Hình! Anh ta sẽ đi theo sau bạn và cùng tấn công mỗi hiệp.'
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
          '“Trước mặt bạn là khe nứt không gian tím thẫm đang gầm rú giữa những ngôi sao chết. Bên trong chiếc lồng sắt mở hé là Thánh Tử Thứ 13 đang run rẩy — và trên bệ đá rêu phong đặt độc nhất một bình Tiên Dược Cổ Đại.”';
        const choices: InteractionChoice[] = [];

        if (!riftElixirCollected) {
          choices.push({
            label: '🏺 Thu lấy [Tiên Dược Cổ Đại] trên bệ đá (Vật phẩm độc nhất)',
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
              addLog('🏺 Bạn thu giữ bình [Tiên Dược Cổ Đại] duy nhất bên mép Vết Rách!');
              setLogOverlayVisible(true);
            },
          });
        }

        const canTrueEnding =
          (player.inventory.void_core || 0) > 0 &&
          (player.inventory.elixir_of_ancients || 0) > 0 &&
          player.readBookIds.length >= 4;
        choices.push({
          label: `🌳 Tưới [Tiên Dược] lên Thánh Tử 13 & cắm [Lõi Khóa] (TRUE ENDING • Sách ${player.readBookIds.length}/4)`,
          onSelect: () => {
            if (!canTrueEnding) {
              openNpcRpgDialogue(
                'void_rift',
                `“Chưa đủ điều kiện Khai Sinh Thần Ý Chí! Cần: Lõi Khóa Hư Vô (${
                  player.inventory.void_core || 0
                }/1), Tiên Dược Cổ Đại chưa uống (${
                  player.inventory.elixir_of_ancients || 0
                }/1), và đọc tối thiểu 4 Cổ Thư (${player.readBookIds.length}/4).”`
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
              vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
              curedPetrification: Boolean(player.questFlags?.curedPetrification),
              child13Rescued: Boolean(player.questFlags?.child13Rescued),
              endingAction: 'POUR_ELIXIR_CHILD13_RIFT',
            });
            setInteractionMenu(null);
            setActiveModal(null);
            setEndingInfo(res);
            setScreen('ending');
          },
        });

        const canOrderEnding =
          player.corruption === 0 &&
          (player.inventory.void_core || 0) > 0 &&
          (player.inventory.reconstruction_scroll || 0) > 0;
        choices.push({
          label: `✝️ Hiến tế Thánh Tử 13 + Thần Chú Tái Thiết (ORDER ENDING • COR ${player.corruption}%)`,
          onSelect: () => {
            if (!canOrderEnding) {
              openNpcRpgDialogue(
                'void_rift',
                `“Chưa đủ điều kiện Order Ending! Cần: COR = 0% (Hiện tại: ${
                  player.corruption
                }%), Lõi Khóa Hư Vô (${
                  player.inventory.void_core || 0
                }/1), và 3 Mảnh Thần Chú Tái Thiết (${
                  player.inventory.reconstruction_scroll || 0
                }/1).”`
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
              vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
              curedPetrification: Boolean(player.questFlags?.curedPetrification),
              child13Rescued: Boolean(player.questFlags?.child13Rescued),
              endingAction: 'SACRIFICE_CHILD13_RIFT',
            });
            setInteractionMenu(null);
            setActiveModal(null);
            setEndingInfo(res);
            setScreen('ending');
          },
        });

        if (!player.questFlags?.child13Rescued) {
          choices.push({
            label: '🔓 Phá xiềng xích giải cứu Thánh Tử Thứ 13 (Mở đường S-Ending Nữ Tu)',
            onSelect: () => {
              setPlayer((prev) => ({
                ...prev,
                questFlags: { ...prev.questFlags, child13Rescued: true },
              }));
              setInteractionMenu(null);
              addLog(
                '🤝💔 Bạn bẻ gãy xiềng xích giải cứu Thánh Tử Thứ 13! Hãy đưa đứa trẻ quay lại Cổng Sắt Ngoại Vi (F2_EXTERIOR).'
              );
              setLogOverlayVisible(true);
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
          '“Hiệp Sĩ Trưởng Vaelis đã ngã gục trước bậc thềm xương. Trong tay bạn là [Lõi Khóa Hư Vô] — chìa khóa duy nhất giữ cho Vết Rách Tầng 3 không nuốt chửng cả Đại Giáo Đường Goethe. Bạn sẽ lựa chọn định mệnh nào?”';
        const choices: InteractionChoice[] = [
          {
            label: `👑 Ngồi lên Ngai Vàng Máu (DARK ENDING • Yêu cầu COR = 100%, hiện tại ${player.corruption}%)`,
            onSelect: () => {
              if (player.corruption < 100) {
                openNpcRpgDialogue(
                  'vaelis_climax',
                  `“Ngai Vàng Máu đẩy lùi bạn! Chỉ kẻ đạt tới đỉnh điểm Tha Hóa (COR = 100%, hiện tại ${player.corruption}%) mới có thể kế thừa ngôi vị Ma Vương!”`
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
            label: '⚔️ Ở lại Thung Lũng dựng Bia Mộ Kỵ Đoàn (S-ENDING HIỆP SĨ)',
            onSelect: () => {
              if (
                player.corruption >= 30 ||
                !player.questFlags?.vaelisTalked ||
                player.readBookIds.length < 3
              ) {
                openNpcRpgDialogue(
                  'vaelis_climax',
                  `“Chưa đủ điều kiện S-Ending Hiệp Sĩ! Cần: Đã Trò Chuyện [5] với Vaelis (${
                    player.questFlags?.vaelisTalked ? '✓' : '✗'
                  }), COR < 30% (${player.corruption}%), và đọc ≥ 3 Cổ Thư (${
                    player.readBookIds.length
                  }/3).”`
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
            label: '🌌 Giữ [Lõi Khóa Hư Vô] & tiếp tục xuống Vết Rách Tầng 3 / Ngoại Vi',
            onSelect: () => {
              setInteractionMenu(null);
              setActiveModal(null);
              addLog(
                '🌀 Bạn nắm chặt [Lõi Khóa Hư Vô] và tiếp tục hành trình xuống Vết Rách Tầng 3 hoặc quay về Ngoại Vi!'
              );
              setLogOverlayVisible(true);
            },
          },
          {
            label: '🚪 Bỏ lại Vết Rách & rời khỏi Lâu Đài ngay (NORMAL ENDING)',
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

    // Search offsets: 1-tile neighbors first, then 2-tile ring for multi-tile landmarks & NPCs
    const searchOffsets: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
      [2, 1],
      [-2, 1],
      [2, -1],
      [-2, -1],
      [1, 2],
      [-1, 2],
      [1, -2],
      [-1, -2],
      [2, 2],
      [-2, 2],
      [2, -2],
      [-2, -2],
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
      [TILE.VOID_RIFT]: 'void_rift',
    };

    for (const [dx, dy] of searchOffsets) {
      const cx = playerPos.x + dx;
      const cy = playerPos.y + dy;
      if (cy < 0 || cy >= roomH || cx < 0 || cx >= roomW) continue;
      const tile = room.grid[cy][cx];
      const coordKey = `${cx},${cy}`;
      const manhattan = Math.abs(dx) + Math.abs(dy);
      const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));

      const isMultiTileOrNpc =
        tile === TILE.HEXEN_ALTAR ||
        tile === TILE.RITUAL_CIRCLE ||
        tile === TILE.VOID_RIFT ||
        tile === TILE.BOOKSHELF ||
        Boolean(npcTileToModalMap[tile]);

      if (!isMultiTileOrNpc && manhattan > 1) continue;
      if (isMultiTileOrNpc && chebyshev > 2) continue;

      if (npcTileToModalMap[tile]) {
        if (tile === TILE.NPC_PRISONER && player.npcFlags.prisonerRecruited) continue;
        openNpcRpgDialogue(npcTileToModalMap[tile]);
        return;
      }

      // Bed Save / Rest (50% chance of Coin Toss before sleeping, then opens 5-Slot Save/Load modal)
      if (tile === TILE.BED_SAVE) {
        setInteractionMenu({
          title: 'GIƯỜNG ĐÁ CỔ',
          description:
            'Chiếc giường đá phủ chăn rách giữa bóng tối. Bạn có thể nằm nghỉ để Lưu tiến trình (có tỉ lệ phải Tung Đồng Xu Định Mệnh trước khi ngủ) hoặc Tải lại Hồ Sơ Lưu.',
          selectedIndex: 0,
          choices: [
            {
              label: 'Nằm xuống ngủ & Lưu tiến trình',
              onSelect: () => {
                setInteractionMenu(null);
                const needsCoinToss = Math.random() < 0.5;
                if (!needsCoinToss) {
                  sfx.playHealOrChime();
                  setPlayer((prev) => ({
                    ...prev,
                    hp: Math.min(prev.maxHp, prev.hp + 35),
                    mind: Math.min(prev.maxMind, prev.mind + 30),
                  }));
                  addLog(
                    '🛏️ Giấc ngủ bình yên hiếm hoi (+35 Thể Xác, +30 Tâm Trí)! Hãy chọn Ô Lưu (1–5) để ghi lại hành trình.'
                  );
                  setActiveModal('saves');
                  return;
                }
                triggerCoinToss(
                  'NGỦ TRÊN GIƯỜNG ĐÁ CỔ & LƯU TIẾN TRÌNH',
                  'Tung Đồng Xu Định Mệnh trước khi ngủ: Thắng sẽ hồi phục Thể Xác/Tâm Trí; Thua sẽ bị ác mộng cào xé trong lúc ngủ trước khi mở bảng 5 Ô Lưu!',
                  (won, tier) => {
                    if (won && tier === 'win') {
                      setPlayer((prev) => ({
                        ...prev,
                        hp: Math.min(prev.maxHp, prev.hp + 35),
                        mind: Math.min(prev.maxMind, prev.mind + 30),
                      }));
                      addLog(
                        '🛏️ Giấc ngủ bình yên (+35 Thể Xác, +30 Tâm Trí)! Hãy chọn Ô Lưu (1–5) để Lưu mới hoặc Lưu đè.'
                      );
                    } else if (won && tier === 'partial') {
                      setPlayer((prev) => ({
                        ...prev,
                        hp: Math.min(prev.maxHp, prev.hp + 15),
                        mind: Math.min(prev.maxMind, prev.mind + 12),
                      }));
                      addLog(
                        '🛏️ Giấc ngủ chập chờn (1 Ngửa 1 Sấp: +15 Thể Xác, +12 Tâm Trí)! Hãy chọn Ô Lưu (1–5) để Lưu tiến trình.'
                      );
                    } else {
                      setPlayer((prev) => ({
                        ...prev,
                        hp: Math.max(5, prev.hp - 14),
                        mind: Math.max(0, prev.mind - 12),
                      }));
                      addLog(
                        '⚠️ Cơn ác mộng cào xé trong lúc ngủ (-14 Thể Xác, -12 Tâm Trí)! Hãy chọn Ô Lưu (1–5) để Lưu tiến trình.'
                      );
                    }
                    setActiveModal('saves');
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

      // CRATE: Instant loot on [F] — Grants AT MOST 1 random item (1 món bất kì)
      if (tile === TILE.CRATE && !room.lootedCoords.includes(coordKey)) {
        sfx.playHealOrChime();
        const rng = new SeededRNG(`${world.seed}_${room.id}_${coordKey}`);
        const lootTable = [
          'brown_vial',
          'red_vial',
          'blue_vial',
          'opium_vial',
          'green_herb',
          'red_herb',
          'white_herb',
          'bandage',
          'dried_meat',
          'moldy_bread',
          'bone_saw',
          'lockpick',
          'torch',
        ];
        const item1 = rng.pick(lootTable);

        setPlayer((prev) => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            [item1]: (prev.inventory[item1] || 0) + 1,
          },
        }));

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
        addLog(`📦 Lục thùng gỗ tiếp tế: Nhận +1 ${CONFIG.ITEMS[item1]?.name || item1}!`);
        setLogOverlayVisible(true);
        return;
      }

      // WILD HERB: Instant forage on [F]
      if (tile === TILE.HERB && !room.lootedCoords.includes(coordKey)) {
        sfx.playHealOrChime();
        const rng = new SeededRNG(`${world.seed}_herb_${room.id}_${coordKey}`);
        const herbPool = ['green_herb', 'red_herb', 'white_herb', 'calm_flower'];
        const h1 = rng.pick(herbPool);

        setPlayer((prev) => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            [h1]: (prev.inventory[h1] || 0) + 1,
          },
        }));

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
        addLog(`🌿 Hái thảo dược hoang dã: Nhận +1 ${CONFIG.ITEMS[h1]?.name || h1}!`);
        setLogOverlayVisible(true);
        return;
      }

      // CHEST: Grants AT MOST 2 items (tối đa 2 món). Partial (1 Heads 1 Tails with Shift) gives lesser items.
      if (tile === TILE.CHEST && !room.lootedCoords.includes(coordKey)) {
        const isSecretChamberChest = room.secretWallBlown || cy <= 2;
        const grantChestRewards = (tier: CoinOutcomeTier) => {
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

          if (tier === 'win') {
            // Win (1 coin win, or 2 coins both win): 1 Rare Equipment/Weapon + 1 Rare Vial (Max 2 items)
            const rollEquipType = rng.next();
            const rareVials = ['white_vial', 'purple_vial', 'blue_vial', 'silver_sword_oil'];
            const vialId = rng.pick(rareVials);
            let equipRewardName = '';

            if (rollEquipType < 0.45 && allGearIds.length > 0) {
              const pickedGear = rng.pick(allGearIds);
              equipRewardName = GEAR_ITEMS[pickedGear]?.name || pickedGear;
              setPlayer((prev) => ({
                ...prev,
                unlockedGear: prev.unlockedGear.includes(pickedGear)
                  ? prev.unlockedGear
                  : [...prev.unlockedGear, pickedGear],
                inventory: {
                  ...prev.inventory,
                  [vialId]: (prev.inventory[vialId] || 0) + 1,
                },
              }));
            } else if (rollEquipType < 0.7 && allShieldIds.length > 0) {
              const pickedShield = rng.pick(allShieldIds);
              equipRewardName = CONFIG.SHIELDS[pickedShield]?.name || pickedShield;
              setPlayer((prev) => ({
                ...prev,
                unlockedShields: prev.unlockedShields.includes(pickedShield)
                  ? prev.unlockedShields
                  : [...prev.unlockedShields, pickedShield],
                inventory: {
                  ...prev.inventory,
                  [vialId]: (prev.inventory[vialId] || 0) + 1,
                },
              }));
            } else {
              const chosenWeapon =
                weaponKeys.length > 0 ? rng.pick(weaponKeys) : 'claymore_greatsword';
              equipRewardName = CONFIG.WEAPONS[chosenWeapon]?.name || chosenWeapon;
              setPlayer((prev) => ({
                ...prev,
                unlockedWeapons: prev.unlockedWeapons.includes(chosenWeapon)
                  ? prev.unlockedWeapons
                  : [...prev.unlockedWeapons, chosenWeapon],
                inventory: {
                  ...prev.inventory,
                  [vialId]: (prev.inventory[vialId] || 0) + 1,
                },
              }));
            }

            sfx.playHealOrChime();
            addLog(
              `🗝️ Mở Rương Kho Báu thành công (2 vật phẩm): Thu được [${equipRewardName}] và +1 [${CONFIG.ITEMS[vialId]?.name}]!`
            );
          } else if (tier === 'partial') {
            // Partial (Shift 2 coins -> 1 Heads + 1 Tails): Inferior loot compared to 1-coin win (Max 2 common items)
            const common1 = rng.pick(['bandage', 'green_herb', 'dried_meat']);
            const common2 = rng.pick(['red_vial', 'moldy_bread', 'torch']);
            setPlayer((prev) => ({
              ...prev,
              inventory: {
                ...prev.inventory,
                [common1]: (prev.inventory[common1] || 0) + 1,
                [common2]: (prev.inventory[common2] || 0) + 1,
              },
            }));
            sfx.playHealOrChime();
            addLog(
              `🗝️⚖️ Mở Rương (Kết quả 1 Ngửa – 1 Sấp): Tránh được bẫy nhưng chỉ lấy được 2 món thường (+1 ${CONFIG.ITEMS[common1]?.name}, +1 ${CONFIG.ITEMS[common2]?.name})!`
            );
          } else {
            // Lose: Poison needle trap + only 1 salvaged item
            const salvaged = rng.pick(['bandage', 'red_vial']);
            setPlayer((prev) => ({
              ...prev,
              hp: Math.max(5, prev.hp - 15),
              statuses: { ...prev.statuses, poisoned: true },
              inventory: {
                ...prev.inventory,
                [salvaged]: (prev.inventory[salvaged] || 0) + 1,
              },
            }));
            addLog(
              `🩸 Bẫy kim độc trong Rương Sắt phóng ra (-15 Thể Xác & Trúng Độc), bạn chỉ vớt vát được +1 [${CONFIG.ITEMS[salvaged]?.name}]!`
            );
          }
          setLogOverlayVisible(true);
        };

        const chestChoices: InteractionChoice[] = [
          {
            label: isSecretChamberChest
              ? 'Mở Rương Kho Báu Mật Thất (Tối đa 2 món)'
              : 'Mở nắp rương sắt (Tung Đồng Xu Định Mệnh — Tối đa 2 món)',
            onSelect: () => {
              setInteractionMenu(null);
              if (isSecretChamberChest) {
                grantChestRewards('win');
                return;
              }
              triggerCoinToss(
                'MỞ RƯƠNG SẮT CỔ ĐẠI',
                'Tung Đồng Xu (Giữ Shift để tung 2 xu): Thắng nhận Vũ Khí/Trang Bị Hiếm + Lọ Quý (tối đa 2 món); 1 Sấp 1 Ngửa nhận đồ thường kém hơn; Thua dính bẫy kim độc!',
                (_won, tier) => grantChestRewards(tier),
                (player.inventory.lockpick || 0) > 0
                  ? () => {
                      setPlayer((prev) => ({
                        ...prev,
                        inventory: {
                          ...prev.inventory,
                          lockpick: Math.max(0, (prev.inventory.lockpick || 0) - 1),
                        },
                      }));
                      grantChestRewards('win');
                      addLog(
                        '🗝️ Bạn dùng [Chìa Khóa Vạn Năng] bẻ khóa êm ru mà không kích hoạt bẫy kim độc!'
                      );
                    }
                  : undefined
              );
            },
          },
        ];

        if (!isSecretChamberChest && (player.inventory.lockpick || 0) > 0) {
          chestChoices.push({
            label: `Dùng Chìa Khóa Vạn Năng mở an toàn (Còn ${player.inventory.lockpick})`,
            onSelect: () => {
              setInteractionMenu(null);
              setPlayer((prev) => ({
                ...prev,
                inventory: {
                  ...prev.inventory,
                  lockpick: Math.max(0, (prev.inventory.lockpick || 0) - 1),
                },
              }));
              grantChestRewards('win');
              addLog('🗝️ Bạn dùng [Chìa Khóa Vạn Năng] bẻ khóa êm ru mà không kích hoạt bẫy kim độc!');
              setLogOverlayVisible(true);
            },
          });
        }

        chestChoices.push({ label: 'Rời đi', onSelect: closePrompt });

        setInteractionMenu({
          title: 'RƯƠNG SẮT CỔ ĐẠI',
          description:
            'Chiếc rương sắt cổ đại khóa chặt bằng chốt đồng (tối đa 2 vật phẩm). Có thể giữ phím [Shift] khi tung xu để tung 2 đồng cùng lúc.',
          selectedIndex: 0,
          choices: chestChoices,
        });
        return;
      }

      // BOOKSHELF: Grants AT MOST 1 item (tối đa 1).
      // Split into Note/Lore Shelves (direct 1 note) vs Skill Scroll Shelves (requires Coin Toss: Win -> 1 Scroll, Partial -> 1 lesser item, Lose -> nothing).
      if (tile === TILE.BOOKSHELF && !room.lootedCoords.includes(coordKey)) {
        const shelfRng = new SeededRNG(`${world.seed}_bookshelf_type_${room.id}_${coordKey}`);
        const isScrollShelf = shelfRng.chance(0.55);

        setInteractionMenu({
          title: isScrollShelf
            ? 'KỆ SÁCH CỔ — NGĂN BÍ KÍP KỸ NĂNG'
            : 'KỆ SÁCH CỔ — NGĂN BIÊN NIÊN SỬ',
          description: isScrollShelf
            ? 'Giữa những tầng sách mục nát thấp thoáng ánh sáng của một Cuộn Bí Kíp Kỹ Năng cổ xưa. Bạn cần Tung Đồng Xu Định Mệnh để tìm ra nó (Thắng nhận Bí Kíp; 1 Sấp 1 Ngửa nhận đồ thường; Thua không có gì).'
            : 'Kệ sách gỗ mục nát lưu giữ 1 trang Ghi Chép Biên Niên Sử cổ đại của Đại Giáo Đường Goethe.',
          selectedIndex: 0,
          choices: [
            {
              label: isScrollShelf
                ? 'Tung Đồng Xu tìm Cuộn Bí Kíp Kỹ Năng (Tối đa 1 món)'
                : 'Đọc & Thu thập Ghi Chép Cổ (Tối đa 1 món)',
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

                // Skill Scroll Shelf: Requires Coin Toss!
                triggerCoinToss(
                  'LỤC TÌM CUỘN BÍ KÍP KỸ NĂNG',
                  'Tung Đồng Xu Định Mệnh để lục tìm Bí Kíp giữa kệ sách mục nát: Thắng nhận 1 Cuộn Bí Kíp Kỹ Năng; 1 Ngửa 1 Sấp (Giữ Shift) chỉ nhận vật phẩm thường; Thua không tìm thấy gì!',
                  (_won, tier) => {
                    if (tier === 'win') {
                      const uncollectedScrollSkills = CONFIG.SKILLS.filter(
                        (s) =>
                          (player.skillLevels[s.id] || 0) === 0 &&
                          (player.inventory[`scroll_${s.id}`] || 0) === 0
                      );
                      const pickedSkill =
                        uncollectedScrollSkills.length > 0
                          ? rng.pick(uncollectedScrollSkills)
                          : rng.pick(CONFIG.SKILLS);
                      const scrollItemId = `scroll_${pickedSkill.id}`;

                      setPlayer((prev) => ({
                        ...prev,
                        inventory: {
                          ...prev.inventory,
                          [scrollItemId]: (prev.inventory[scrollItemId] || 0) + 1,
                        },
                      }));
                      sfx.playHealOrChime();
                      addLog(
                        `📜✨ Tìm thấy [${CONFIG.ITEMS[scrollItemId]?.name || pickedSkill.name}] trên kệ sách! (Mở Túi [I] đọc để lĩnh hội Lv.1).`
                      );
                    } else if (tier === 'partial') {
                      // 1 Heads + 1 Tails with Shift -> inferior reward (1 common herb/bandage instead of Scroll)
                      const lesserItem = rng.pick(['green_herb', 'bandage', 'white_herb']);
                      setPlayer((prev) => ({
                        ...prev,
                        inventory: {
                          ...prev.inventory,
                          [lesserItem]: (prev.inventory[lesserItem] || 0) + 1,
                        },
                      }));
                      addLog(
                        `📜⚖️ Kết quả 1 Ngửa – 1 Sấp: Không tìm thấy Cuộn Bí Kíp, chỉ nhặt được +1 [${CONFIG.ITEMS[lesserItem]?.name}] kẹp giữa khe tủ!`
                      );
                    } else {
                      // Lose -> Nothing!
                      addLog(
                        '📜💨 Lục kệ sách thất bại: Chỉ toàn giấy mục nát và tro bụi, không tìm thấy cuốn sách nào!'
                      );
                    }
                    setLogOverlayVisible(true);
                  }
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
          const itemPick = rng.pick(['lockpick', 'bandage', 'blue_vial']);
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
              label: 'Thiền định hấp thụ Chướng Khí (-18 SAN, +8 COR → +1 Thiện cảm Hư Vô)',
              onSelect: () => {
                setInteractionMenu(null);
                setPlayer((prev) => ({
                  ...prev,
                  mind: Math.max(2, prev.mind - 18),
                  corruption: Math.min(100, prev.corruption + 8),
                  affinities: {
                    ...prev.affinities,
                    primordialVoid: prev.affinities.primordialVoid + 1,
                  },
                }));
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
                  '🌌 Bạn hít sâu luồng Chướng Khí tím (-18 SAN, +8 COR): Thiện cảm Hư Vô Nguyên Thủy tăng +1!'
                );
                setLogOverlayVisible(true);
              },
            },
            { label: 'Rời đi', onSelect: closePrompt },
          ],
        });
        return;
      }

      // NEW SURVIVAL TILE 3: RITUAL_CIRCLE (Sacrificial / Order Sigil Circle)
      if (tile === TILE.RITUAL_CIRCLE && !room.lootedCoords.includes(coordKey)) {
        setInteractionMenu({
          title: 'VÒNG TRÒN HIẾN TẾ CỔ ĐẠI',
          description:
            'Vòng tròn cổ ngữ khắc trên đá lạnh. Bạn có thể khắc Ấn Ký Thánh Mẫu (nếu giữ mình thuần khiết COR = 0) hoặc cắt máu Huyết Tế Ác Quỷ.',
          selectedIndex: 0,
          choices: [
            {
              label: 'Khắc ấn ký Thánh Mẫu (Yêu cầu COR = 0, -10 SAN → +1 Thiện cảm Thánh Mẫu)',
              onSelect: () => {
                setInteractionMenu(null);
                if (player.corruption > 0 || player.holyMagicLocked) {
                  addLog(
                    '❌ Thánh Mẫu khước từ lời cầu nguyện vì dòng máu của bạn đã vấy bẩn Tha Hóa!'
                  );
                  setLogOverlayVisible(true);
                  return;
                }
                setPlayer((prev) => ({
                  ...prev,
                  mind: Math.max(5, prev.mind - 10),
                  affinities: {
                    ...prev.affinities,
                    holyMother: prev.affinities.holyMother + 1,
                  },
                }));
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
                addLog('✝️ Ánh sáng trắng rực lên từ Vòng Tròn Cổ Ngữ: Thiện cảm Thánh Mẫu +1!');
                setLogOverlayVisible(true);
              },
            },
            {
              label: 'Huyết Tế Vòng Tròn Máu (-20 HP, +10 COR → +1 Thiện cảm Ác Quỷ & +15 SAN)',
              onSelect: () => {
                setInteractionMenu(null);
                setPlayer((prev) => ({
                  ...prev,
                  hp: Math.max(5, prev.hp - 20),
                  mind: Math.min(prev.maxMind, prev.mind + 15),
                  corruption: Math.min(100, prev.corruption + 10),
                  affinities: {
                    ...prev.affinities,
                    demonicPact: prev.affinities.demonicPact + 1,
                  },
                }));
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
                  '🩸 Máu tươi thấm vào cổ ngữ (-20 HP, +10 COR): Thiện cảm Ác Quỷ +1 & hồi +15 SAN!'
                );
                setLogOverlayVisible(true);
              },
            },
            { label: 'Rời đi', onSelect: closePrompt },
          ],
        });
        return;
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
          title: 'BÀN THỜ HEXEN',
          description: 'Bàn thờ đá khắc ấn ký cổ thần tỏa ra ánh sáng tím lạnh lẽo.',
          selectedIndex: 0,
          choices: [
            {
              label: 'Chạm vào Bàn Thờ Hexen',
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

    // Check within 2 tiles for Cracked Wall (explosive interaction unified on [F])
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = playerPos.x + dx;
        const ny = playerPos.y + dy;
        if (ny >= 0 && ny < roomH && nx >= 0 && nx < roomW) {
          if (room.grid[ny][nx] === TILE.CRACKED_WALL) {
            promptCrackedWallExplosion();
            return;
          }
        }
      }
    }

    // Check adjacent slain enemy corpse (Supports Looting Weapons/Keys/Boss Relics AND Devouring Corpse)
    const corpse = room.enemies.find(
      (e) =>
        e.defeated &&
        (!e.corpseDevoured || !e.corpseLooted) &&
        Math.abs(e.x - playerPos.x) + Math.abs(e.y - playerPos.y) <= 1
    );
    if (corpse) {
      const tpl = CONFIG.ENEMIES[corpse.templateId];
      const corpseName = corpse.customName || tpl?.name || 'Quái vật';
      const corpseChoices: InteractionChoice[] = [];

      if (!corpse.corpseLooted) {
        corpseChoices.push({
          label: '🗡️ Lục soát xác quái (Tìm Vũ Khí / Chìa Khóa / Chiến Lợi Phẩm)',
          onSelect: () => {
            setInteractionMenu(null);
            sfx.playHealOrChime();
            const rng = new SeededRNG(`${world.seed}_corpse_loot_${corpse.uid}`);
            const lootMessages: string[] = [];

            const nextPlayer: PlayerState = JSON.parse(JSON.stringify(player));

            // 1. Boss / Mini-Boss guaranteed signature weapon or key relic
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

            // 2. If normal enemy or additional drop: Weapon, Key (lockpick), or Gear/Shield
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
            setWorld((prev) => ({
              ...prev,
              rooms: {
                ...prev.rooms,
                [room.id]: {
                  ...room,
                  enemies: room.enemies.map((e) =>
                    e.uid === corpse.uid ? { ...e, corpseLooted: true } : e
                  ),
                },
              },
            }));
            addLog(`🗡️ Lục soát xác [${corpseName}]: Thu được ${lootMessages.join(' & ')}!`);
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
            setPlayer(pCopy);
            setWorld((prev) => ({
              ...prev,
              rooms: {
                ...prev.rooms,
                [room.id]: {
                  ...room,
                  enemies: room.enemies.map((e) => (e.uid === eCopy.uid ? eCopy : e)),
                },
              },
            }));
            addLog(res.message);
            setLogOverlayVisible(true);
          },
        });
      }

      corpseChoices.push({ label: 'Rời đi', onSelect: closePrompt });

      setInteractionMenu({
        title: `XÁC CỦA ${corpseName.toUpperCase()}`,
        description:
          'Xác kẻ địch nằm bất động trên nền đá đẫm máu. Bạn có thể lục soát lấy Vũ Khí / Chìa Khóa đặc trưng hoặc nuốt xác để cầm cự cơn đói.',
        selectedIndex: 0,
        choices: corpseChoices,
      });
      return;
    }

    // Check S-Ending Iron Gate Escape in F2_EXTERIOR
    if (
      room.id === 'F2_EXTERIOR' &&
      (player.questFlags?.child13Rescued ||
        (player.questFlags?.curedPetrification && player.questFlags?.vaelisDefeated))
    ) {
      setInteractionMenu({
        title: 'CỔNG SẮT RỜI THUNG LŨNG (KẾT CỤC S)',
        description:
          'Kết Giới Chướng Khí nơi Cổng Sắt Ngoại Vi đã suy yếu. Bạn đã hoàn thành tâm nguyện và có thể rời khỏi Thung Lũng Xương Tàn ngay lúc này.',
        selectedIndex: 0,
        choices: [
          {
            label: '🚪 Mở Cổng Sắt rời khỏi Thung Lũng (Kết Cục S)',
            onSelect: () => {
              setInteractionMenu(null);
              const outEnding = evaluateCanonEnding({
                classId: player.classId,
                corruption: player.corruption,
                readBookIds: player.readBookIds,
                inventory: player.inventory,
                learnedSkillIds: Object.keys(player.skillLevels),
                vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
                vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
                curedPetrification: Boolean(player.questFlags?.curedPetrification),
                child13Rescued: Boolean(player.questFlags?.child13Rescued),
                endingAction: 'ESCAPE_EXTERIOR_GATE',
              });
              setEndingInfo(outEnding);
              setScreen('ending');
            },
          },
          { label: 'Ở lại thêm', onSelect: closePrompt },
        ],
      });
      return;
    }

    if (logOverlayVisible) {
      setLogOverlayVisible(false);
      return;
    }

    addLog('Không có vật thể tương tác nào ngay sát cạnh bạn.');
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
  ]);

  // Sokoban Step Movement with STEP_COOLDOWN = 220ms & Hunger Loop + Dynamic Room Bounds & Survival Tile Triggers
  const attemptMove = useCallback(
    (dx: number, dy: number) => {
      if (screen !== 'playing' || activeModal || coinToss || interactionMenu) return;
      if (logOverlayVisible) {
        setLogOverlayVisible(false);
      }
      const now = performance.now();
      const cooldown = getPlayerStepCooldownMs(player);
      if (now - lastStepTime < cooldown) return;

      const room = world.rooms[world.currentRoomId];
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
        addLog('🥀 Cơn Đói Cực Hạn (≥ 80%) rút cạn 3 Thể Xác mỗi bước chân!');
      }

      // Step hazard: MIASMA_VENT deals -3 SAN, +2 COR unless wearing Beak Mask or Star-Pelt Coat
      if (targetTile === TILE.MIASMA_VENT) {
        const immuneMiasma =
          player.equippedHead === 'beak_mask' || player.equippedBody === 'star_pelt_coat';
        if (immuneMiasma) {
          addLog('🦅 Trang bị kháng Chướng Khí giúp bạn bước qua Khe Nứt Hư Vô mà không mất Tâm Trí!');
        } else {
          nextMind = Math.max(0, nextMind - 3);
          nextCor = Math.min(100, nextCor + 2);
          addLog('🌫️ Bước qua Khe Nứt Chướng Khí (-3 SAN, +2 COR)! Nhấn [F] nếu muốn hấp thụ.');
        }
      }

      const updatedPlayer: PlayerState = {
        ...player,
        hp: nextHp,
        mind: nextMind,
        corruption: nextCor,
        hunger: nextHunger,
        stats: {
          ...player.stats,
          stepsTaken: nextSteps,
        },
      };

      setPlayerPos({ x: nx, y: ny });
      setTrailCoords((prev) => [{ x: playerPos.x, y: playerPos.y }, prev[0] || { x: playerPos.x, y: playerPos.y }]);
      setPlayer(updatedPlayer);

      // Step hazard: FLOOR_TRAP triggers Coin Toss if not yet sprung
      const stepCoordKey = `${nx},${ny}`;
      if (targetTile === TILE.FLOOR_TRAP && !room.lootedCoords.includes(stepCoordKey)) {
        setWorld((prev) => ({
          ...prev,
          rooms: {
            ...prev.rooms,
            [room.id]: {
              ...room,
              lootedCoords: [...room.lootedCoords, stepCoordKey],
            },
          },
        }));
        triggerCoinToss(
          'BẪY ĐÁ NGẦM BẬT NẨY!',
          'Bạn vừa giẫm phải phiến đá bẫy ngầm! Tung Đồng Xu Định Mệnh để nhảy lùi tránh hàm răng sắt!',
          (_won, tier) => {
            if (tier === 'win') {
              addLog('⚡ Nhảy lùi kịp thời! Bạn thoát khỏi Bẫy Đá Ngầm mà không hề hấn gì.');
            } else if (tier === 'partial') {
              setPlayer((prev) => ({ ...prev, hp: Math.max(5, prev.hp - 8) }));
              addLog('🩸⚖️ Kết quả 1 Ngửa – 1 Sấp: Mũi chông sượt qua bắp chân (-8 Thể Xác)!');
            } else {
              setPlayer((prev) => ({
                ...prev,
                hp: Math.max(5, prev.hp - 18),
                statuses: { ...prev.statuses, bleeding: true },
              }));
              addLog('🩸 Bẫy sắt sập trúng chân (-18 Thể Xác & Chảy Máu)!');
            }
            setLogOverlayVisible(true);
          }
        );
        return;
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
    },
    [
      screen,
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
      movePlayerToRoom,
      generateRandomSeed,
      triggerCoinToss,
    ]
  );

  // Execute a combat turn action via standalone CombatEngine Manager (no setTimeout!)
  const runCombatTurn = useCallback(
    (
      action: CombatActionType,
      opts?: { limbId?: string; skillId?: string; itemId?: string }
    ) => {
      if (!activeCombatEnemy) return;
      try {
        if (action === 'ATTACK' || action === 'SKILL') {
          sfx.playSlash(false);
        }

        const outcome = combatEngineRef.current.executeTurn(
          player,
          activeCombatEnemy,
          world.seed,
          action,
          selectedLimbId,
          opts
        );

        const { updatedPlayer, updatedEnemy, result, endingTrigger } = outcome;

        if (result.severedAnyLimb) {
          sfx.playSever();
        }

        setPlayer(updatedPlayer);
        setWorld((prev) => ({
          ...prev,
          rooms: {
            ...prev.rooms,
            [currentRoom.id]: {
              ...currentRoom,
              enemies: currentRoom.enemies.map((e) => (e.uid === updatedEnemy.uid ? updatedEnemy : e)),
            },
          },
        }));
        setCombatLogs((prev) => [...result.logs, ...prev.slice(0, 15)]);
        setFocusedLimbId(null);

        // Automatically advance selectedLimbId if the targeted limb was severed on this turn
        const activeTargetAfter =
          updatedEnemy.limbs.find((l) => l.id === (result.targetLimbId || selectedLimbId));
        if (!activeTargetAfter || activeTargetAfter.hp <= 0) {
          const nextIntact =
            updatedEnemy.limbs.find((l) => l.id === 'torso' && l.hp > 0) ||
            updatedEnemy.limbs.find((l) => l.hp > 0);
          if (nextIntact) {
            setSelectedLimbId(nextIntact.id);
          }
        } else if (result.targetLimbId && result.targetLimbId !== selectedLimbId) {
          setSelectedLimbId(result.targetLimbId);
        }

        if (result.fledSuccess) {
          setActiveEnemyUid(null);
          setScreen('playing');
          addLog('🏃 Bạn đã thoát khỏi cuộc giao tranh trong gang tấc.');
          return;
        }

        if (endingTrigger) {
          if (endingTrigger.id === 'VAELIS_CLIMAX_CHOICE') {
            setActiveEnemyUid(null);
            setScreen('playing');
            openNpcRpgDialogue('vaelis_climax');
            return;
          }
          if (endingTrigger.id === 'SLAIN_IN_COMBAT') {
            const nextRandomSeed = generateRandomSeed();
            setSeedInput(nextRandomSeed);
            setEndingInfo({
              ...endingTrigger,
              subtitle: `Thể Xác Bị Nghiền Nát • Seed ngẫu nhiên mới: ${nextRandomSeed}`,
            });
          } else {
            setEndingInfo(endingTrigger);
          }
          setScreen('ending');
        }
      } catch (err) {
        console.error('Combat turn execution error:', err);
        setCombatLogs((prev) => ['⚡ Đòn kỹ năng va chạm dữ dội trong bóng tối!', ...prev]);
      }
    },
    [activeCombatEnemy, player, world.seed, selectedLimbId, currentRoom, addLog, generateRandomSeed]
  );

  // Keyboard Controls (Exploration + 2-Step Combat Limb Selection + 1-5 Quick Action Hotkeys)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (coinToss) return;

      // Combat 2-Step WASD Limb Reticle Navigation + Enter/Space + Number Hotkeys 1..5
      if (screen === 'combat' && activeCombatEnemy && !activeCombatEnemy.defeated && !activeModal) {
        const aliveLimbs = activeCombatEnemy.limbs.filter((l) => l.hp > 0);
        if (aliveLimbs.length === 0) return;

        // Number Hotkeys 1-5 for fast tactical combat input
        if (e.key === '1') {
          e.preventDefault();
          setCombatMenuMode('main');
          runCombatTurn('ATTACK', { limbId: selectedLimbId });
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          setCombatMenuMode((m) => (m === 'skills' ? 'main' : 'skills'));
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          setCombatMenuMode('main');
          runCombatTurn('GUARD');
          return;
        }
        if (e.key === '4') {
          e.preventDefault();
          setCombatMenuMode((m) => (m === 'items' ? 'main' : 'items'));
          return;
        }
        if (e.key === '5') {
          e.preventDefault();
          setCombatMenuMode('main');
          runCombatTurn('TALK');
          return;
        }

        const key = e.key.toLowerCase();
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
          const curIdx = aliveLimbs.findIndex((l) => l.id === selectedLimbId);
          const step = key === 'w' || key === 'a' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
          const nextLimb = aliveLimbs[(curIdx + step + aliveLimbs.length) % aliveLimbs.length];
          if (nextLimb) {
            setSelectedLimbId(nextLimb.id);
            setFocusedLimbId(nextLimb.id);
          }
          return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          runCombatTurn('ATTACK', { limbId: selectedLimbId });
          return;
        }
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
        setActiveModal(null);
        return;
      }

      if (interactionMenu && !activeModal) {
        if (key === 'w' || e.key === 'ArrowUp') {
          e.preventDefault();
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
    titleSaveModalOpen,
    titleStep,
    interactionMenu,
    logOverlayVisible,
    coinToss,
    selectedLimbId,
    attemptMove,
    handleTileInteraction,
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

          // 2. Central Anatomical Vector Monster with Per-Limb Sinusoidal Breathing
          const tpl = CONFIG.ENEMIES[activeCombatEnemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
          const severedSet = new Set<string>(activeCombatEnemy.severedLimbs);
          const animState = engine.getStageAnimState();

          const enemyW =
            tpl.spriteScale === '3x3'
              ? 465
              : tpl.spriteScale === '2x3'
              ? 430
              : tpl.spriteScale === '2x2'
              ? 375
              : 310;
          const enemyH =
            tpl.spriteScale === '3x3'
              ? 420
              : tpl.spriteScale === '2x3'
              ? 395
              : tpl.spriteScale === '2x2'
              ? 365
              : 345;
          const enemyX = w * 0.5 - enemyW * 0.5;
          const enemyY = h * 0.04;

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

          // Render Eased Blade Slash Arcs & Physics Particles (gravity = 0.5)
          engine.renderCanvasEffects(ctx);

          // 3. Foreground Party Back-Sprites
          const partyShakeX = animState === 'playerHit' ? (Math.sin(now * 0.08) * 10) : 0;
          const mainBackX = (player.party.length > 0 ? w * 0.07 : w * 0.12) + partyShakeX;
          const mainBackY = h * 0.54;
          drawPartyBackSprite(
            ctx,
            player.classId,
            mainBackX,
            mainBackY,
            172,
            198,
            { leftArm: player.limbs.leftArm, rightArm: player.limbs.rightArm },
            animState === 'playerAttack',
            animState === 'playerHit'
          );

          if (animState === 'playerHit') {
            ctx.save();
            const hitCx = mainBackX + 86;
            const hitCy = mainBackY + 75;
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

          if (player.party.length > 0 && player.party[0].hp > 0) {
            drawPartyBackSprite(
              ctx,
              player.party[0].classId,
              w * 0.68,
              h * 0.56,
              162,
              188,
              { leftArm: player.party[0].limbs.leftArm, rightArm: player.party[0].limbs.rightArm },
              animState === 'playerAttack',
              animState === 'playerHit'
            );
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
  }, [screen, activeCombatEnemy, currentRoom.floor, player]);

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

        <header className="relative z-10 flex items-center justify-between px-6 py-2.5 border-b border-[#2e2325] shrink-0">
          <div className="flex items-center gap-2.5">
            <Skull className="w-5 h-5 text-[#dc2626]" />
            <span className="text-xs tracking-[0.2em] uppercase text-[#a89882]">
              Đại Giáo Đường Goethe • Thung Lũng Xương Tàn
            </span>
          </div>
        </header>

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
                  className="w-full px-6 py-3 bg-[#991b1b] hover:bg-[#b91c1c] text-[#fef2f2] font-bold tracking-wider uppercase text-xs sm:text-sm border border-[#f87171]/50 shadow-[0_0_20px_rgba(153,27,27,0.35)] transition cursor-pointer"
                >
                  Bắt Đầu Hành Trình
                </button>
                <button
                  type="button"
                  onClick={() => setTitleSaveModalOpen(true)}
                  className="w-full px-6 py-3 bg-[#1b1521] hover:bg-[#2a2033] text-[#f3e5ab] font-bold tracking-wider uppercase text-xs sm:text-sm border border-[#6e5a44] transition cursor-pointer flex items-center justify-center gap-2"
                  title="Mở danh sách 5 ô lưu ký ức"
                >
                  <FolderOpen className="w-4 h-4 text-[#fbbf24]" />
                  <span>Tiếp Tục ({saveSlots.filter(Boolean).length}/5)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f5ebd6] leading-none"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  CHỌN NHÂN VẬT <span className="text-lg sm:text-xl font-normal text-[#c2410c]">— KHỞI HÀNH</span>
                </h1>
                <button
                  type="button"
                  onClick={() => setTitleStep('menu')}
                  className="px-3.5 py-1.5 bg-[#1b1521] hover:bg-[#2a2033] text-[#e7dcc8] font-bold tracking-wider uppercase text-xs border border-[#52404c] transition cursor-pointer"
                >
                  ← Quay Lại
                </button>
              </div>

              {/* Character Name Input & Class Selection */}
              <div className="p-3.5 bg-[#110e14]/90 border border-[#33272a] space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2.5 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] uppercase tracking-wider text-[#9c8c76] mb-1">
                      Tên Nhân Vật
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={characterNameInput}
                        onChange={(e) => setCharacterNameInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#09070b] border border-[#473639] text-[#f5ebd6] font-serif text-xs focus:outline-none focus:border-[#dc2626]"
                        placeholder="Nhập tên..."
                      />
                      <button
                        type="button"
                        onClick={() => setCharacterNameInput(generateRandomCharacterName())}
                        className="px-2.5 py-1.5 bg-[#1c1621] hover:bg-[#2a2030] border border-[#52404c] text-[11px] font-bold text-[#fbbf24] shrink-0 cursor-pointer"
                        title="Đặt Tên Ngẫu Nhiên"
                      >
                        🎲 Ngẫu Nhiên
                      </button>
                    </div>
                  </div>
                  <div className="flex w-full sm:w-auto gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => enterPrologue()}
                      className="flex-1 sm:flex-initial px-5 py-2 bg-[#991b1b] hover:bg-[#b91c1c] text-[#fef2f2] font-bold tracking-wider uppercase text-xs border border-[#f87171]/40 transition cursor-pointer"
                    >
                      Tiến Vào Hành Trình →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {CONFIG.CLASSES.map((cls) => {
                    const active = cls.id === selectedClassId;
                    const startWpn = CONFIG.WEAPONS[cls.startingWeapon];
                    const startSkill = CONFIG.SKILLS.find((s) => s.id === cls.startingSkill);
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
                        className={`text-left p-2.5 border transition cursor-pointer flex flex-col justify-between ${
                          active
                            ? 'bg-[#261317] border-[#dc2626] text-[#f5ebd6] shadow-[0_0_12px_rgba(220,38,38,0.25)]'
                            : 'bg-[#0b090e] border-[#2c2225] text-[#9c8c76] hover:border-[#574347]'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-[#f3e5ab]">{cls.name}</div>
                          <div className="text-[10px] text-[#c2410c] font-semibold mb-1">{cls.title}</div>
                          <p className="text-[11px] leading-snug text-[#cfc0a9]">{cls.lore}</p>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-[#2c2225] space-y-0.5 text-[10px] font-mono">
                          <div className="flex items-center justify-between whitespace-nowrap">
                            <span className="text-[#a89882]">ATK / CRIT:</span>
                            <span>
                              <b className="text-[#f87171]">{startWpn ? `${startWpn.dmg[0]}–${startWpn.dmg[1]}` : '150–200'}</b>
                              <span className="text-[#5e5246]"> • </span>
                              <b className="text-[#facc15]">{startWpn ? `${Math.round(startWpn.critChance * 100)}%` : '15%'}</b>
                            </span>
                          </div>
                          <div className="flex items-center justify-between whitespace-nowrap">
                            <span className="text-[#a89882]">DEF / Né / Chạy:</span>
                            <span>
                              <b className="text-[#93c5fd]">{Math.round(cls.naturalArmor * 100)}%</b>
                              <span className="text-[#5e5246]"> • </span>
                              <b className="text-[#4ade80]">+{Math.round(cls.evasionBonus * 100)}%/{Math.round(cls.baseFleeChance * 100)}%</b>
                            </span>
                          </div>
                          <div className="flex items-center justify-between whitespace-nowrap">
                            <span className="text-[#a89882]">Kỹ năng đầu:</span>
                            <span className="text-[#e9d5ff] font-bold">{startSkill?.name}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-[#d6c5ad] bg-[#18131a] px-2.5 py-1.5 border border-[#2e2428] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[#fbbf24] font-semibold">Khởi đầu:</span>{' '}
                    [{CONFIG.WEAPONS[selectedClass.startingWeapon]?.name}] • [{CONFIG.SKILLS.find((s) => s.id === selectedClass.startingSkill)?.name}]
                  </div>
                  <span className="text-[10px] text-[#9c8c76] italic">
                    * HP &amp; Tâm Trí ẩn đến khi vào Thung Lũng.
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Title Screen 5-Slot Save Files Modal when clicking 'Tiếp Tục' */}
        {titleSaveModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-[#120e17] border-2 border-[#6e5a44] p-4 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#2e2428] pb-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#fbbf24]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#f3e5ab]">
                    Danh Sách File Save (Tối Đa 5 Ô Lưu)
                  </h2>
                </div>
                <button
                  onClick={() => setTitleSaveModalOpen(false)}
                  className="px-2.5 py-1 bg-[#261e24] hover:bg-[#382b34] text-xs font-bold border border-[#524046] cursor-pointer"
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
                      className="p-2.5 bg-[#09070c] border border-[#2a2024] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#f3e5ab]">
                          FILE SAVE #{idx + 1}{' '}
                          {slot?.player?.name ? (
                            <span className="text-[#fbbf24]">— {slot.player.name}</span>
                          ) : null}
                        </div>
                        {slot ? (
                          <div className="text-[11px] text-[#a89882] space-y-0.5 mt-0.5">
                            <div>
                              <span className="font-mono text-[#fde68a]">Seed: {slot.seed}</span> • Khu:{' '}
                              {slot.world.currentRoomId} • {slot.timestamp}
                            </div>
                            <div>
                              HP {slot.player.hp}/{slot.player.maxHp} • SAN {slot.player.mind}/{slot.player.maxMind} • COR{' '}
                              {slot.player.corruption}%
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#5e5246] italic">Trống...</div>
                        )}
                      </div>
                      {slot && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => loadFromSlot(idx)}
                            className="px-3 py-1 bg-[#15803d] hover:bg-[#16a34a] text-white text-xs font-bold cursor-pointer"
                          >
                            Tải
                          </button>
                          <button
                            onClick={() => deleteSaveSlot(idx)}
                            className="px-2 py-1 bg-[#3f161b] hover:bg-[#5c1c24] border border-[#7f1d1d] text-[#fca5a5] text-[11px] cursor-pointer"
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

        <footer className="relative z-10 px-6 py-2 border-t border-[#241b1d] text-[11px] text-[#7d6e5d] flex flex-wrap justify-between gap-2 shrink-0">
          <span>WASD: Di chuyển/Ngắm • F/Enter: Tương tác/Chém • I: Túi • L: Sách • ?: Cẩm Nang</span>
          <span>Vaelis – Thung Lũng Xương Tàn</span>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // RENDER: 3-FRAME ILLUSTRATED PROLOGUE & BACKSTORY CHOICE
  // ============================================================================
  if (screen === 'prologue') {
    const prologueTexts = [
      {
        title: 'KHUNG I: LÂU ĐÀI HẮC ÁM ĐÈ NÁT GIÁO ĐƯỜNG GOETHE',
        desc: 'Đêm Trăng Đỏ, Hiệp Sĩ Trưởng Vaelis kéo Lâu Đài Hắc Ám giáng thẳng xuống đè nát mái vòm Goethe — nén 3 tầng (Lâu Đài, Giáo Đường, Vực Sao) dưới Kết Giới Chướng Khí không cho ai quay đầu.',
      },
      {
        title: 'KHUNG II: MÁU ĐEN THÁNH MẪU & VẾT RÁCH HƯ VÔ',
        desc: 'Tượng Thánh Mẫu rỉ MÁU ĐEN che giấu 13 Thánh Tử bị tế sống; dưới vực sâu, Hư Vô Nguyên Thủy và Giao Kèo Ác Quỷ tràn lên vặn xoắn mọi kẻ sống sót thành quái vật.',
      },
      {
        title: 'KHUNG III: TRƯỚC CỔNG SẮT RĂNG CƯA NGOẠI VI',
        desc: 'Trước khi bước vào địa ngục ba tầng để đối mặt Vaelis, Thánh Tử 13 hay Tiên Dược Cổ Đại — hãy khắc ghi 3 quyết định quá khứ của chính bạn.',
      },
    ];

    return (
      <div className="h-screen bg-[#070509] text-[#e7dcc8] flex items-center justify-center p-3 overflow-y-auto lg:overflow-hidden">
        <div className="max-w-3xl w-full bg-[#110d14] border-2 border-[#6e5a44] p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#362b28] pb-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#fbbf24]">
              Dẫn Nhập Vaelis ({prologueFrame + 1}/3)
            </span>
            <button
              onClick={finishPrologueAndPlay}
              className="text-[11px] text-[#fde68a] hover:text-white underline cursor-pointer"
              title="Bỏ qua dẫn nhập và tự động nhận bộ trang bị + nhu yếu phẩm mặc định của nhân vật"
            >
              Bỏ qua (Nhận Đồ Mặc Định) → Vào Ngoại Vi
            </button>
          </div>

          <canvas
            ref={prologueCanvasRef}
            width={640}
            height={270}
            className="w-full max-h-[175px] object-contain border border-[#4a3b32] bg-[#08060a]"
          />

          <div className="space-y-1">
            <h2
              className="text-lg sm:text-xl font-bold text-[#f3e5ab]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {prologueTexts[prologueFrame].title}
            </h2>
            <p className="text-xs text-[#cfc0a9] leading-snug">{prologueTexts[prologueFrame].desc}</p>
          </div>

          {/* Class-Specific 3-Step Intro Choices on Frame 3 */}
          {prologueFrame === 2 && (
            <div className="p-4 bg-[#18121c] border border-[#4a393f] space-y-3">
              {(() => {
                const clsKey =
                  (player.classId as 'fallen_knight' | 'forsaken_nun' | 'night_hunter') ||
                  'fallen_knight';
                const steps = CHARACTER_INTRO_STEPS[clsKey] || CHARACTER_INTRO_STEPS.fallen_knight;
                const currentStep = steps[introStepIdx];
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">
                        Ký Ức & Hành Trang Của {player.name} — Bước {introStepIdx + 1}/3
                      </div>
                      <span className="text-[11px] text-[#a89882] font-mono">
                        COR: {player.corruption} • SAN: {player.mind}/{player.maxMind}
                      </span>
                    </div>

                    {!backstoryChosen && currentStep ? (
                      <div className="space-y-2.5">
                        <div className="text-xs font-semibold text-[#f3e5ab]">
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
                              className="p-3 bg-[#0e0b11] hover:bg-[#231922] border border-[#4d3942] hover:border-[#fbbf24] text-left text-xs cursor-pointer transition flex flex-col justify-between gap-1.5"
                            >
                              <div className="font-bold text-[#f3e5ab]">{opt.label}</div>
                              <div className="text-[11px] text-[#86efac] leading-snug">
                                {opt.effectText}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#101c14] border border-[#285436] text-xs text-[#bbf7d0] space-y-1">
                        <div className="font-bold text-[#fde68a]">
                          ✓ Bạn đã định hình xong 3 bước quá khứ trước Cổng Sắt Goethe!
                        </div>
                        <div>
                          Vũ khí: <b>{CONFIG.WEAPONS[player.equippedWeapon]?.name}</b> • Bạc:{' '}
                          <b>{player.silverCoins}</b> • COR: <b>{player.corruption}</b> • SAN:{' '}
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
              className="px-4 py-2 bg-[#1c161f] border border-[#3d3038] text-xs disabled:opacity-40 cursor-pointer"
            >
              ← Khung Trước
            </button>
            {prologueFrame < 2 ? (
              <button
                onClick={() => setPrologueFrame((f) => ((f + 1) as 0 | 1 | 2))}
                className="px-6 py-2 bg-[#991b1b] hover:bg-[#b91c1c] text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Tiếp Tục Khung Hình →
              </button>
            ) : (
              <button
                onClick={finishPrologueAndPlay}
                className="px-6 py-2.5 bg-[#b45309] hover:bg-[#d97706] text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
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
      <div className="min-h-screen bg-[#070509] text-[#e7dcc8] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-[#120e16] border-2 border-[#7f1d1d] p-8 space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#261014] border border-[#991b1b] text-xs uppercase tracking-widest text-[#fca5a5]">
            <Sparkles className="w-3.5 h-3.5" /> Kết Cục Định Mệnh ({endingInfo.id})
          </div>
          <h1
            className="text-4xl font-bold text-[#f3e5ab]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {endingInfo.title}
          </h1>
          <div className="text-sm uppercase tracking-widest text-[#d97706]">{endingInfo.subtitle}</div>
          <p className="text-base text-[#cfc0a9] leading-relaxed border-y border-[#2d2327] py-5">
            {endingInfo.epilogue}
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={() => {
                const freshSeed = seedInput === world.seed ? generateRandomSeed() : seedInput;
                setSeedInput(freshSeed);
                enterPrologue(freshSeed, player.classId);
              }}
              className="px-6 py-2.5 bg-[#991b1b] hover:bg-[#b91c1c] text-white font-bold text-sm uppercase tracking-wider cursor-pointer"
            >
              🎲 Chơi Ván Mới (Seed Ngẫu Nhiên: {seedInput})
            </button>
            <button
              onClick={() => setScreen('title')}
              className="px-6 py-2.5 bg-[#1f1922] hover:bg-[#2d2532] border border-[#4a3b42] text-sm uppercase tracking-wider cursor-pointer"
            >
              Về Màn Hình Chính
            </button>
          </div>

          {/* Quick Load Saved Game to Restore Old Seed */}
          {saveSlots.some((s) => s !== null) && (
            <div className="pt-4 border-t border-[#2d2327] space-y-2 text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-[#fbbf24] text-center">
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
                      className="p-2.5 bg-[#19141f] hover:bg-[#261e2e] border border-[#52435c] text-left text-xs cursor-pointer transition"
                    >
                      <div className="font-bold text-[#f3e5ab]">Tải Ô Lưu #{idx + 1}</div>
                      <div className="font-mono text-[11px] text-[#fbbf24]">Seed: {slot.seed}</div>
                      <div className="text-[11px] text-[#a89882]">
                        Phòng {slot.world.currentRoomId} • HP {slot.player.hp}/{slot.player.maxHp}
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
    const activeWeapon = getEffectiveWeapon(player);

    // Reticle Click Handler: clicking the currently selected limb attacks immediately; clicking a different limb selects and focuses it
    const handleReticleClick = (limbId: string) => {
      if (activeCombatEnemy.defeated) return;
      if (selectedLimbId !== limbId && focusedLimbId !== limbId) {
        setSelectedLimbId(limbId);
        setFocusedLimbId(limbId);
      } else {
        setSelectedLimbId(limbId);
        runCombatTurn('ATTACK', { limbId });
      }
    };

    const currentTargetLimb =
      activeCombatEnemy.limbs.find((l) => l.id === selectedLimbId) || activeCombatEnemy.limbs[0];

    return (
      <div className="h-screen w-screen overflow-hidden bg-[#060508] text-[#e7dcc8] flex flex-col select-none">
        {/* UPPER 68% COMBAT STAGE */}
        <div className="relative h-[68%] w-full bg-[#09070c] border-b-2 border-[#a8a29e] flex flex-col items-center justify-between overflow-hidden">
          {/* Top Silver-Bordered Telegraph & Enemy Header Banner (Enemy HP is calculated behind the scenes) */}
          <div className="z-20 w-full max-w-4xl mt-1.5 px-3 shrink-0">
            <div className="bg-[#0e0c12]/95 border-2 border-[#a8a29e] px-3 py-1.5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-[#fca5a5] font-bold">
                  Hiệp #{activeCombatEnemy.turnCount + 1} • {activeCombatEnemy.customName || tpl.name}
                </div>
                <div className="text-xs text-[#f5ebd6] italic truncate">
                  {activeCombatEnemy.telegraphing
                    ? `⚠️ SẮP TUNG: [${tpl.telegraphName}] — ${tpl.telegraphDesc}`
                    : `“${tpl.telegraphDesc}”`}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-[10px] uppercase tracking-wider text-[#d6c5ad] font-mono">
                <span>⌖ Chọn Bộ Phận:</span>
                <span className="text-[#fbbf24] font-bold">{currentTargetLimb?.name}</span>
              </div>
            </div>
          </div>

          {/* Center Responsive 16:11 Stage Wrapper with On-Body Anatomical Reticles */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center py-1">
            <div className="relative h-full max-h-[440px] aspect-[16/11] max-w-full flex items-center justify-center">
              <canvas
                ref={combatStageCanvasRef}
                width={640}
                height={440}
                className="w-full h-full pointer-events-none"
              />

            {/* Compact On-Body Anatomical Target Reticles with Damage Preview Tooltip & Pixel-Art Debuff Badges */}
            {!activeCombatEnemy.defeated &&
              activeCombatEnemy.limbs.map((limb, idx) => {
                const pos = reticleMap[limb.id] || {
                  nx: 0.25 + (idx % 2) * 0.5,
                  ny: 0.25 + Math.floor(idx / 2) * 0.22,
                };
                const isSevered = limb.hp <= 0;
                const isSelected = selectedLimbId === limb.id;
                const isFocused = focusedLimbId === limb.id;
                const isHovered = hoveredLimbId === limb.id;
                const showExpanded = isSelected || isFocused || isHovered;
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
                    className={`absolute ${showExpanded ? 'z-30' : 'z-20'}`}
                  >
                    {/* Pixel-Art Debuff Status Badges with Remaining Turn Count right above the Reticle */}
                    {!isSevered && badges.length > 0 && (
                      <div className="flex items-center justify-center gap-1 mb-0.5 pointer-events-none">
                        {badges.map((b) => (
                          <span
                            key={b.type}
                            style={{ borderColor: b.color, color: b.color }}
                            className="px-1 py-0.2 bg-[#09070d]/95 border text-[9px] font-mono font-bold flex items-center gap-0.5 shadow"
                          >
                            <span>
                              {b.type === 'acid'
                                ? '🧪'
                                : b.type === 'oil'
                                ? '🟣'
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

                    <button
                      disabled={isSevered}
                      onMouseEnter={() => setHoveredLimbId(limb.id)}
                      onMouseLeave={() => setHoveredLimbId(null)}
                      onClick={() => handleReticleClick(limb.id)}
                      className={`transition cursor-pointer ${
                        isSevered
                          ? 'px-1.5 py-0.5 bg-[#1a0d10]/70 border border-[#451a1f] text-[#6e5a5f] opacity-50 cursor-not-allowed'
                          : showExpanded
                          ? 'px-2.5 py-1 bg-[#2b090d]/95 border-2 border-[#fbbf24] text-[#fef08a] scale-105 shadow-[0_0_14px_rgba(251,191,36,0.55)]'
                          : 'px-1.5 py-0.5 bg-[#0b090e]/75 border border-[#9ca3af]/65 text-[#e7dcc8] hover:border-[#fbbf24]'
                      }`}
                    >
                      {showExpanded ? (
                        <>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold whitespace-nowrap">
                            <span className="text-[#ef4444]">⌖</span>
                            <span>{limb.name}</span>
                            <span className="font-mono text-[10px] text-[#fde047]">
                              {isSevered ? '[ĐỨT]' : !targetable ? '[KHÓA]' : `${preview.hitPct}%`}
                            </span>
                          </div>
                          {isFocused && !isSevered && (
                            <div className="text-[9px] text-[#fbbf24] font-bold uppercase tracking-tighter mt-0.5">
                              [Nhấn lần 2 / Enter: CHÉM!]
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold whitespace-nowrap">
                          <span className="text-[#ef4444]">⌖</span>
                          <span>{isSevered ? 'ĐỨT' : !targetable ? '🔒' : `${preview.hitPct}%`}</span>
                        </div>
                      )}
                    </button>

                    {/* Damage Preview Side Tooltip (Min-Max Dmg, Hit %, Crit %, Armor) on Hover / WASD Focus */}
                    {showExpanded && !isSevered && (
                      <div
                        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${
                          tooltipOnLeft ? 'right-full mr-2' : 'left-full ml-2'
                        } w-44 bg-[#0b0910]/95 border border-[#fbbf24] p-2 text-[10px] text-[#e7dcc8] shadow-xl space-y-0.5`}
                      >
                        <div className="font-bold text-[#fde68a] border-b border-[#2e242c] pb-0.5">
                          <span>DỰ KIẾN SÁT THƯƠNG</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a89882]">Sát thương:</span>
                          <span className="font-mono font-bold text-[#f87171]">
                            {preview.minDmg}–{preview.maxDmg}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a89882]">Tỷ lệ Trúng:</span>
                          <span className="font-mono font-bold text-[#4ade80]">{preview.hitPct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a89882]">Tỷ lệ Crit:</span>
                          <span className="font-mono font-bold text-[#facc15]">{preview.critPct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a89882]">Giáp bộ phận:</span>
                          <span className="font-mono font-bold text-[#93c5fd]">
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
          <div className="z-20 w-full bg-[#0b090f]/90 border-t border-[#3b322c] px-5 py-1.5 flex items-center justify-between text-xs">
            <div className="text-[#d6c5ad] truncate max-w-3xl">
              <span className="text-[#fbbf24] font-bold mr-2">Diễn biến:</span>
              {combatLogs[0]}
            </div>
            <div className="text-[#a89882] shrink-0 hidden md:block">
              Vũ khí: <span className="text-[#f3e5ab] font-semibold">{activeWeapon.name}</span> • Mục tiêu:{' '}
              <span className="text-[#fca5a5] font-semibold">{currentTargetLimb?.name}</span> • Phím tắt:{' '}
              <span className="font-mono text-[#fbbf24]">[1..5]</span>
            </div>
          </div>
        </div>

        {/* LOWER 32% CLASSIC SILVER-BORDERED CONTROL DOCK */}
        <div className="h-[32%] w-full bg-[#08070b] p-2.5 flex gap-2.5">
          {/* LEFT BOX (220px): Vertical Serif Command Buttons with Number Hotkeys 1..5 */}
          <div className="w-[220px] shrink-0 bg-[#0d0b12] border-2 border-[#a8a29e] p-1.5 flex flex-col justify-between gap-1">
            {!activeCombatEnemy.defeated ? (
              <>
                <button
                  onClick={() => {
                    setCombatMenuMode('main');
                    runCombatTurn('ATTACK', { limbId: selectedLimbId });
                  }}
                  className={`w-full py-1 px-2.5 text-left text-xs font-bold border transition cursor-pointer truncate ${
                    combatMenuMode === 'main'
                      ? 'bg-[#2b1216] border-[#f87171] text-[#fef2f2]'
                      : 'bg-[#14111a] border-[#3f3847] text-[#d6c5ad] hover:border-[#a8a29e]'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  [1] ⚔ Đ.Thường ({currentTargetLimb?.name})
                </button>
                <button
                  onClick={() => setCombatMenuMode((m) => (m === 'skills' ? 'main' : 'skills'))}
                  className={`w-full py-1 px-2.5 text-left text-xs font-bold border transition cursor-pointer ${
                    combatMenuMode === 'skills'
                      ? 'bg-[#241432] border-[#c084fc] text-[#f3e8ff]'
                      : 'bg-[#14111a] border-[#3f3847] text-[#d6c5ad] hover:border-[#a8a29e]'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  [2] ✦ K.Năng ({Object.keys(player.skillLevels).length})
                </button>
                <button
                  onClick={() => runCombatTurn('GUARD')}
                  className="w-full py-1 px-2.5 text-left text-xs font-bold bg-[#14111a] border border-[#3f3847] text-[#d6c5ad] hover:border-[#a8a29e] cursor-pointer"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  [3] 🛡 P.Thủ (+DEF)
                </button>
                <button
                  onClick={() => setCombatMenuMode((m) => (m === 'items' ? 'main' : 'items'))}
                  className={`w-full py-1 px-2.5 text-left text-xs font-bold border transition cursor-pointer ${
                    combatMenuMode === 'items'
                      ? 'bg-[#291d12] border-[#fbbf24] text-[#fef3c7]'
                      : 'bg-[#14111a] border-[#3f3847] text-[#d6c5ad] hover:border-[#a8a29e]'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  [4] 🧪 Item Thực Dụng
                </button>
                <button
                  onClick={() => runCombatTurn('TALK')}
                  className="w-full py-1 px-2.5 text-left text-xs font-bold bg-[#14111a] border border-[#3f3847] text-[#6ee7b7] hover:border-[#a8a29e] cursor-pointer"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  [5] 💬 Trò Chuyện
                </button>
                <button
                  onClick={() => runCombatTurn('FLEE')}
                  className="w-full py-1 px-2.5 text-left text-xs font-bold bg-[#14111a] border border-[#3f3847] text-[#9ca3af] hover:border-[#a8a29e] cursor-pointer"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  🏃 Bỏ Chạy
                </button>
              </>
            ) : (
              <div className="my-auto text-center space-y-2 p-2">
                <div className="text-xs font-bold uppercase text-[#fbbf24]">Chiến Thắng!</div>
                <button
                  onClick={() => {
                    setActiveEnemyUid(null);
                    setScreen('playing');
                  }}
                  className="w-full py-2 bg-[#15803d] hover:bg-[#16a34a] text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Thu Chiến Lợi Phẩm
                </button>
              </div>
            )}
          </div>

          {/* RIGHT BOX: Dynamic Sub-Menu OR Horizontal Party Status Table */}
          <div className="flex-1 bg-[#0d0b12] border-2 border-[#a8a29e] p-2.5 overflow-y-auto flex flex-col justify-between">
            {combatMenuMode === 'skills' && !activeCombatEnemy.defeated ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-[#2e2633] pb-1">
                  <span className="text-xs font-bold uppercase text-[#c084fc]">
                    Chọn Kỹ Năng / Phép Thuật (Nhắm vào: {currentTargetLimb?.name})
                  </span>
                  <button
                    onClick={() => setCombatMenuMode('main')}
                    className="text-xs text-[#9ca3af] hover:text-white cursor-pointer"
                  >
                    [Đóng]
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(player.skillLevels)
                    .filter(([, lv]) => lv > 0)
                    .map(([skId, lv]) => {
                      const sk = CONFIG.SKILLS.find((s) => s.id === skId);
                      if (!sk) return null;
                      return (
                        <button
                          key={sk.id}
                          disabled={player.mind < sk.mindCost}
                          onClick={() => {
                            runCombatTurn('SKILL', { limbId: selectedLimbId, skillId: sk.id });
                            setCombatMenuMode('main');
                          }}
                          className="p-2 bg-[#16121e] hover:bg-[#221a30] border border-[#4c3963] text-left text-xs disabled:opacity-40 cursor-pointer"
                        >
                          <div className="flex justify-between font-bold text-[#e9d5ff]">
                            <span>
                              {sk.name} (Lv.{lv})
                            </span>
                            <span>-{sk.mindCost} Tâm Trí</span>
                          </div>
                          <div className="text-[11px] text-[#a89882]">{sk.descLv1}</div>
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : combatMenuMode === 'items' && !activeCombatEnemy.defeated ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-[#2e2633] pb-1">
                  <span className="text-xs font-bold uppercase text-[#fbbf24]">
                    Chọn Lọ Thực Dụng / Thảo Dược Trong Trận
                  </span>
                  <button
                    onClick={() => setCombatMenuMode('main')}
                    className="text-xs text-[#9ca3af] hover:text-white cursor-pointer"
                  >
                    [Đóng]
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(player.inventory)
                    .filter(([itemId, count]) => count > 0 && CONFIG.ITEMS[itemId]?.combatUsable)
                    .map(([itemId, count]) => {
                      const item = CONFIG.ITEMS[itemId];
                      if (!item) return null;
                      return (
                        <button
                          key={itemId}
                          onClick={() => {
                            runCombatTurn('ITEM', { limbId: selectedLimbId, itemId });
                            setCombatMenuMode('main');
                          }}
                          className="p-1.5 bg-[#16131a] hover:bg-[#261f29] border border-[#4d3f35] flex items-center gap-2 text-left text-xs cursor-pointer"
                        >
                          <ItemArtworkCanvas itemOrWeaponId={itemId} size={32} />
                          <div className="min-w-0">
                            <div className="font-bold text-[#f3e5ab] truncate">
                              {item.name} (x{count})
                            </div>
                            <div className="text-[10px] text-[#a89882] truncate">{item.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* DEFAULT: HORIZONTAL PARTY STATUS ROWS */
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-wider text-[#a89882] border-b border-[#2b2530] pb-1">
                  <span>Đội Hình & Trạng Thái Tứ Chi</span>
                  <span>WASD chọn chi • Enter/Click 2 lần để Chém</span>
                </div>

                {/* Row 1: Main Character */}
                <div className="p-2 bg-[#14111a] border border-[#3d3545] grid grid-cols-12 items-center gap-2 text-xs">
                  <div className="col-span-3 flex flex-wrap items-center gap-1">
                    <span className="font-bold text-[#f3e5ab] truncate">{player.name}</span>
                    {player.statuses.guarding && (
                      <span className="px-1 py-0.5 bg-[#1e3a8a] text-[9px] text-white font-bold">[DEF]</span>
                    )}
                    {player.statuses.bleeding && (
                      <span className="px-1 py-0.5 bg-[#7f1d1d] border border-[#f87171] text-[9px] text-[#fecaca] font-bold">
                        🩸 CHẢY MÁU
                      </span>
                    )}
                    {!player.statuses.bleeding && (player.statuses.bleedImmunityTurns || 0) > 0 && (
                      <span className="px-1 py-0.5 bg-[#14532d] border border-[#4ade80] text-[9px] text-[#bbf7d0] font-bold">
                        🩹 ĐÃ CẦM MÁU
                      </span>
                    )}
                    {player.hunger < 50 && !player.statuses.bleeding && (
                      <span className="px-1 py-0.5 bg-[#14532d] text-[9px] text-[#86efac] font-bold">[SPD]</span>
                    )}
                  </div>
                  <div className="col-span-3">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-[#fca5a5]">Thể Xác</span>
                      <span className="font-mono">
                        {player.hp}/{player.maxHp}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#241316] border border-[#5c232a]">
                      <div
                        className="h-full bg-[#dc2626]"
                        style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-[#93c5fd]">Tâm Trí</span>
                      <span className="font-mono">
                        {player.mind}/{player.maxMind}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#121c2d] border border-[#274472]">
                      <div
                        className="h-full bg-[#2563eb]"
                        style={{ width: `${(player.mind / player.maxMind) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-4 flex flex-wrap gap-1 justify-end">
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
                          className={`px-1.5 py-0.5 text-[10px] border ${
                            !intact
                              ? 'bg-[#2e1115] border-[#991b1b] text-[#fca5a5] line-through'
                              : inf
                              ? 'bg-[#2b1f11] border-[#854d0e] text-[#fde047]'
                              : 'bg-[#122117] border-[#285436] text-[#86efac]'
                          }`}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2+: Recruited Party Allies */}
                {player.party.map((ally) => (
                  <div
                    key={ally.id}
                    className="p-2 bg-[#14111a] border border-[#3d3545] grid grid-cols-12 items-center gap-2 text-xs"
                  >
                    <div className="col-span-3 flex items-center gap-1.5">
                      <span className="font-bold text-[#e9d5ff] truncate">{ally.name}</span>
                      <span className="px-1 py-0.5 bg-[#3b1d5e] text-[9px] text-[#e9d5ff] font-bold">
                        [ĐỒNG ĐỘI]
                      </span>
                    </div>
                    <div className="col-span-3">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-[#fca5a5]">Thể Xác</span>
                        <span className="font-mono">
                          {ally.hp}/{ally.maxHp}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#241316] border border-[#5c232a]">
                        <div
                          className="h-full bg-[#dc2626]"
                          style={{ width: `${(ally.hp / ally.maxHp) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-[#93c5fd]">Tâm Trí</span>
                        <span className="font-mono">
                          {ally.mind}/{ally.maxMind}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#121c2d] border border-[#274472]">
                        <div
                          className="h-full bg-[#2563eb]"
                          style={{ width: `${(ally.mind / ally.maxMind) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-4 flex flex-wrap gap-1 justify-end text-[10px] text-[#86efac]">
                      <span className="px-1.5 py-0.5 bg-[#122117] border border-[#285436]">Tay T</span>
                      <span className="px-1.5 py-0.5 bg-[#122117] border border-[#285436]">Tay P</span>
                      <span className="px-1.5 py-0.5 bg-[#122117] border border-[#285436]">Chân T</span>
                      <span className="px-1.5 py-0.5 bg-[#122117] border border-[#285436]">Chân P</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
      {/* Compact Top 3-Bar Survival HUD */}
      <header className="bg-[#0e0b12] border-b border-[#2d2326] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Body HP */}
          <div className="w-28">
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="flex items-center gap-1 text-[#f87171] font-bold">
                <Heart className="w-3 h-3" /> HP
              </span>
              <span className="font-mono">
                {player.hp}/{player.maxHp}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#241316] border border-[#5c232a]">
              <div
                className="h-full bg-[#dc2626] transition-all"
                style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
              />
            </div>
          </div>

          {/* Mind */}
          <div className="w-28">
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="flex items-center gap-1 text-[#60a5fa] font-bold">
                <Brain className="w-3 h-3" /> SAN
              </span>
              <span className="font-mono">
                {player.mind}/{player.maxMind}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#121c2d] border border-[#274472]">
              <div
                className="h-full bg-[#2563eb] transition-all"
                style={{ width: `${(player.mind / player.maxMind) * 100}%` }}
              />
            </div>
          </div>

          {/* Hunger */}
          <div className="w-28">
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="flex items-center gap-1 text-[#fbbf24] font-bold">
                <Utensils className="w-3 h-3" /> Đói
              </span>
              <span className="font-mono">
                {player.hunger}%{player.hunger >= 50 ? ' (-ST)' : ''}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#261c10] border border-[#6b4c23]">
              <div
                className="h-full bg-[#d97706] transition-all"
                style={{ width: `${Math.min(100, player.hunger)}%` }}
              />
            </div>
          </div>

          {/* Resources, Panic & Order Lock Flags */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] border-l border-[#2e2428] pl-3">
            <span className="px-2 py-0.5 bg-[#1b1521] border border-[#4a3759] text-[#d8b4fe]" title="Đá Năng Lượng">
              Đá NL: <b>{player.energyStones}</b>
            </span>
            <span className="px-2 py-0.5 bg-[#1c1914] border border-[#574932] text-[#fde68a]" title="Đồng Bạc">
              Bạc: <b>{player.silverCoins}</b>
            </span>
            <span
              className={`px-2 py-0.5 border ${
                player.corruption > 0
                  ? 'bg-[#2e1018] border-[#dc2626] text-[#fda4af]'
                  : 'bg-[#101f15] border-[#285436] text-[#86efac]'
              }`}
              title="Tha Hóa (COR) > 0 sẽ khóa Order Ending"
            >
              COR: <b>{player.corruption}%</b>
              {player.corruption > 0 ? ' 🔒' : ' ✓'}
            </span>
            {isPlayerPanicking(player) && (
              <span className="px-2 py-0.5 bg-[#7f1d1d] border border-[#f87171] text-[#fef2f2] font-bold animate-pulse">
                😱 HOẢNG LOẠN
              </span>
            )}
          </div>
        </div>

        {/* Quick Modal Action Buttons (Hexen & Save/Load are strictly world interactions) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveModal('inventory')}
            className="px-2.5 py-1 bg-[#1b161f] hover:bg-[#28202e] border border-[#4a3b47] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Backpack className="w-3.5 h-3.5 text-[#fbbf24]" /> Túi [I]
          </button>
          <button
            onClick={() => setActiveModal('lore')}
            className="px-2.5 py-1 bg-[#1b161f] hover:bg-[#28202e] border border-[#4a3b47] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#38bdf8]" /> Sách ({player.readBookIds.length}/12) [L]
          </button>
          <button
            onClick={() => setActiveModal('guide')}
            className="px-2.5 py-1 bg-[#231915] hover:bg-[#33241c] border border-[#b45309] text-[11px] font-semibold text-[#fde68a] flex items-center gap-1 cursor-pointer"
            title="Sách Hướng Dẫn Sinh Tồn [?]"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#fbbf24]" /> Cẩm Nang [?]
          </button>
          <button
            onClick={() => {
              sfx.muted = !muted;
              setMuted(!muted);
            }}
            className="p-1 bg-[#1b161f] border border-[#4a3b47] text-xs cursor-pointer"
            title="Bật/Tắt Âm Thanh"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Content: Full-Width Dungeon Stage with Right-Side Horizontal Action Confirmation & On-Demand Narrative Log */}
      <div className="flex-1 min-h-0 max-w-[1440px] w-full mx-auto p-2.5 flex flex-col">
        <div className="w-full h-full min-h-0 flex flex-col gap-2">
          {/* Canvas Container */}
          <div className="relative flex-1 min-h-0 flex flex-col border-2 border-[#4d3c36] bg-[#050407] shadow-2xl overflow-hidden">
            {/* Top-Left Area Name Banner */}
            <div className="absolute top-2 left-2 z-10 bg-[#0d0a10]/90 border border-[#8c785c] px-2.5 py-1 pointer-events-none">
              <div className="text-[9px] uppercase tracking-widest text-[#fbbf24]">Khu Vực</div>
              <div
                className="text-xs sm:text-sm font-bold text-[#f5ebd6]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {areaBannerText}
              </div>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center bg-[#050407] p-1">
              <DungeonMapViewport
                room={currentRoom}
                player={player}
                playerPos={playerPos}
                trailCoords={trailCoords}
                animTick={animTick}
                isInteractivePaused={Boolean(activeModal || coinToss || interactionMenu)}
                riftElixirCollected={riftElixirCollected}
                onTileClick={(tx, ty) => {
                  const dx = tx - playerPos.x;
                  const dy = ty - playerPos.y;
                  if (Math.abs(dx) + Math.abs(dy) === 1) {
                    attemptMove(dx, dy);
                  } else if (dx === 0 && dy === 0) {
                    handleTileInteraction();
                  }
                }}
                onUpdateEnemies={(updater) => {
                  const roomId = currentRoom.id;
                  setWorld((prev) => {
                    const r = prev.rooms[roomId];
                    if (!r) return prev;
                    return {
                      ...prev,
                      rooms: {
                        ...prev.rooms,
                        [roomId]: {
                          ...r,
                          enemies: updater(r.enemies),
                        },
                      },
                    };
                  });
                }}
                onEnemyCollidePlayer={(enemy) => {
                  startCombatWithEnemy(enemy);
                }}
              />
            </div>

            {/* Fear & Hunger / Termina Style RPG Bottom Dialogue Box + Docked Right-Side Choice Window */}
            {(interactionMenu || logOverlayVisible) && (
              <div className="absolute inset-x-4 bottom-8 z-30">
                {/* Docked Right-Side Choice Window (Flush above the right side of the bottom dialogue box) */}
                {interactionMenu ? (
                  <div className="ml-auto w-fit min-w-[310px] max-w-[540px] mb-[2px] bg-[#1a1417]/96 border-2 border-[#a89f96] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),0_10px_32px_rgba(0,0,0,0.95)] px-3.5 py-2.5 space-y-1">
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
                              ? 'text-white font-semibold'
                              : 'text-[#e5ddd3] hover:text-white'
                          }`}
                          style={
                            isSelected
                              ? {
                                  background:
                                    'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.92) 0%, rgba(29, 78, 216, 0.62) 55%, rgba(15, 23, 42, 0) 100%)',
                                  textShadow: '0 0 8px rgba(191, 219, 254, 0.65)',
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
                  <div className="ml-auto w-fit min-w-[230px] mb-[2px] bg-[#1a1417]/96 border-2 border-[#a89f96] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),0_10px_32px_rgba(0,0,0,0.95)] px-3.5 py-2">
                    <button
                      type="button"
                      onClick={() => setLogOverlayVisible(false)}
                      className="w-full text-left px-4 py-1 font-serif text-sm sm:text-base tracking-wide text-white font-semibold cursor-pointer"
                      style={{
                        background:
                          'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.92) 0%, rgba(29, 78, 216, 0.62) 55%, rgba(15, 23, 42, 0) 100%)',
                        textShadow: '0 0 8px rgba(191, 219, 254, 0.65)',
                      }}
                    >
                      Tiếp tục hành trình [F]
                    </button>
                  </div>
                )}

                {/* Bottom RPG Dialogue Box with Gothic Illuminated Drop-Cap Nameplate ([L]EVI style) */}
                <div className="bg-[#1a1417]/95 border-2 border-[#a89f96] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),0_12px_40px_rgba(0,0,0,0.96)] px-5 py-3.5 min-h-[112px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      {(() => {
                        const rawSpeaker = (interactionMenu?.title || 'NHẬT KÝ HÀNH TRÌNH').trim();
                        const firstChar = rawSpeaker.charAt(0).toUpperCase();
                        const restChars = rawSpeaker.slice(1).toUpperCase();
                        return (
                          <div className="inline-flex items-end gap-1 select-none">
                            <span
                              className="w-6 h-6 bg-[#f5efe6] text-[#09070a] border border-[#3d342f] font-black text-base flex items-center justify-center leading-none shadow-sm"
                              style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                              {firstChar}
                            </span>
                            <span
                              className="text-xs sm:text-sm font-bold tracking-[0.14em] text-[#f5efe6] uppercase leading-none pb-0.5"
                              style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                              {restChars}
                            </span>
                          </div>
                        );
                      })()}
                      <span className="text-[10px] text-[#b8afa6] font-mono">
                        {interactionMenu
                          ? '[W/S] Chọn • [F / Enter] Xác nhận • [ESC] Đóng'
                          : '[F / ESC] Đóng'}
                      </span>
                    </div>

                    {interactionMenu ? (
                      <div className="text-sm sm:text-base font-serif text-[#f5efe6] leading-relaxed">
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
                              i === 0 ? 'text-[#f5efe6] font-semibold' : 'text-[#b8afa6] text-xs'
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
              className="shrink-0 bg-[#0b090e]/95 border-t border-[#3b2f2d] px-3 py-1 text-[11px] text-[#cfc0a9] italic flex items-center justify-between gap-2"
              title={currentRoom.sensoryLine}
            >
              <span className="truncate">“{currentRoom.sensoryLine}”</span>
              <span className="not-italic text-[10px] font-mono text-[#9c8c76] shrink-0">
                ({playerPos.x}, {playerPos.y})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          MODAL 1: 5-SLOT EQUIPMENT, 6 STATS & ALCHEMY ([I])
      ======================================================================== */}
      {activeModal === 'inventory' && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#110d14] border-2 border-[#a8a29e] p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Top Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between border-b border-[#382e32] pb-3 gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInvTab('equip')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase border cursor-pointer ${
                    invTab === 'equip'
                      ? 'bg-[#7f1d1d] border-[#f87171] text-white'
                      : 'bg-[#1a1520] border-[#3d3345] text-[#a89882]'
                  }`}
                >
                  Trang Bị, Giải Phẫu & 6 Chỉ Số
                </button>
                <button
                  onClick={() => setInvTab('items')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase border cursor-pointer ${
                    invTab === 'items'
                      ? 'bg-[#7f1d1d] border-[#f87171] text-white'
                      : 'bg-[#1a1520] border-[#3d3345] text-[#a89882]'
                  }`}
                >
                  Túi Đồ Thực Dụng & Giả Kim
                </button>
                <button
                  onClick={() => setInvTab('saw')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase border cursor-pointer ${
                    invTab === 'saw'
                      ? 'bg-[#7f1d1d] border-[#f87171] text-white'
                      : 'bg-[#1a1520] border-[#3d3345] text-[#a89882]'
                  }`}
                >
                  Cưa Xương Giải Phẫu
                </button>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="px-3 py-1 bg-[#261e24] text-xs font-bold border border-[#524046] cursor-pointer"
              >
                Đóng [ESC]
              </button>
            </div>

            {/* Top Header: 64x64 Vector Artwork + Detailed Lore Description */}
            <div className="p-3.5 bg-[#09070c] border border-[#4a3e3d] flex items-center gap-4">
              <ItemArtworkCanvas itemOrWeaponId={previewItemId} size={64} />
              <div className="space-y-1 text-xs">
                <div className="text-sm font-bold text-[#f3e5ab]">
                  {CONFIG.WEAPONS[previewItemId]?.name ||
                    CONFIG.SHIELDS[previewItemId]?.name ||
                    GEAR_ITEMS[previewItemId]?.name ||
                    CONFIG.ITEMS[previewItemId]?.name ||
                    'Vật Phẩm Cổ Đại'}
                </div>
                <p className="text-[#cfc0a9] leading-relaxed">
                  {CONFIG.WEAPONS[previewItemId]?.desc ||
                    CONFIG.SHIELDS[previewItemId]?.desc ||
                    GEAR_ITEMS[previewItemId]?.desc ||
                    CONFIG.ITEMS[previewItemId]?.desc}
                </p>
              </div>
            </div>

            {invTab === 'equip' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left Column: 6 Character Stats + Integrated 6-Part Anatomy & Statuses */}
                <div className="md:col-span-5 bg-[#0b090e] border border-[#3b3136] p-4 space-y-4">
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#fbbf24] border-b border-[#292226] pb-2">
                      6 Chỉ Số Nhân Vật
                    </div>
                    {(
                      [
                        ['Đ.Thường (ATK)', `${computedStats.physAtk}`],
                        ['Kháng Vật Lý (DEF)', `${computedStats.physDefPct}%`],
                        ['ST Phép (M.ATK)', `${computedStats.magAtk}`],
                        ['Kháng Phép (M.DEF)', `${computedStats.magDefPct}%`],
                        ['Nhanh Nhẹn (AGI)', `${computedStats.agility}`],
                        ['May Mắn (LUK)', `${computedStats.luck}`],
                      ] as Array<[string, string]>
                    ).map(([label, val]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between text-xs border-b border-[#1c171f] pb-1.5"
                      >
                        <span className="text-[#cfc0a9]">{label}</span>
                        <span className="font-mono font-bold text-[#86efac]">
                          {val} <span className="text-[10px] text-[#fbbf24]">▲</span>
                        </span>
                      </div>
                    ))}
                    {player.hunger >= 50 && (
                      <div className="text-[11px] text-[#f87171] pt-1">
                        * Cơn Đói ≥ 50% đang làm giảm 25% Sát thương Vật lý!
                      </div>
                    )}
                  </div>

                  {/* Integrated 6-Part Anatomy & Active Body Statuses */}
                  <div className="space-y-2 pt-2 border-t border-[#292226]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#f3e5ab] flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-[#dc2626]" /> Giải Phẫu 6 Bộ Phận
                      </span>
                      <span className="text-[10px] text-[#a89882]">Trạng thái cơ thể</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="px-2 py-1 bg-[#101f15] border border-[#285436] text-[#86efac] flex justify-between">
                        <span>Đầu</span>
                        <span className="font-mono font-bold">
                          {player.statuses.blindedTurns > 0 ? 'MÙ' : 'OK'}
                        </span>
                      </div>
                      <div
                        className={`px-2 py-1 border flex justify-between ${
                          player.statuses.bleeding || player.statuses.parasite
                            ? 'bg-[#2b1f11] border-[#854d0e] text-[#fde047]'
                            : 'bg-[#101f15] border-[#285436] text-[#86efac]'
                        }`}
                      >
                        <span>Thân</span>
                        <span className="font-mono font-bold">
                          {player.statuses.parasite ? 'K.SINH' : player.statuses.bleeding ? 'MÁU' : 'OK'}
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
                        const intact = player.limbs[limbKey];
                        const infected = player.limbs.infected[limbKey];
                        return (
                          <div
                            key={limbKey}
                            className={`px-2 py-1 border flex justify-between ${
                              !intact
                                ? 'bg-[#2e1115] border-[#991b1b] text-[#fca5a5] line-through'
                                : infected
                                ? 'bg-[#2b1f11] border-[#854d0e] text-[#fde047]'
                                : 'bg-[#101f15] border-[#285436] text-[#86efac]'
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

                    {(player.statuses.bleeding ||
                      player.statuses.poisoned ||
                      player.statuses.parasite ||
                      player.holyMagicLocked ||
                      player.party.length > 0) && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {player.statuses.bleeding && (
                          <span className="px-1.5 py-0.5 bg-[#450a0a] border border-[#dc2626] text-[10px] text-[#fca5a5]">
                            🩸 Chảy máu
                          </span>
                        )}
                        {player.statuses.poisoned && (
                          <span className="px-1.5 py-0.5 bg-[#14532d] border border-[#22c55e] text-[10px] text-[#bbf7d0]">
                            ☠️ Độc
                          </span>
                        )}
                        {player.statuses.parasite && (
                          <span className="px-1.5 py-0.5 bg-[#3b0764] border border-[#a855f7] text-[10px] text-[#e9d5ff]">
                            🪱 Ký sinh
                          </span>
                        )}
                        {player.holyMagicLocked && (
                          <span className="px-1.5 py-0.5 bg-[#27272a] border border-[#71717a] text-[10px] text-[#d4d4d8]">
                            🔒 Khóa Phép Thánh
                          </span>
                        )}
                        {player.party.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-[#16111f] border border-[#4c3766] text-[10px] text-[#e9d5ff]">
                            🛡 {player.party[0].name} ({player.party[0].hp}/{player.party[0].maxHp})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Action Bar (Trang Bị | Tự Mặc | Lột Đồ) + 5 Equipment Slots */}
                <div className="md:col-span-7 space-y-3">
                  <div className="flex items-center gap-2 bg-[#16121c] border border-[#3d3242] p-2">
                    <span className="text-xs font-bold text-[#f3e5ab] px-2">Thao tác:</span>
                    <button
                      onClick={() => {
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
                            ? 'Đã Tự Mặc bộ trang bị tối ưu nhất phù hợp với cơ thể và nghề nghiệp.'
                            : `⚠️ Giữ nguyên vũ khí bị nguyền đang khóa chặt vào tay; đã mặc tối ưu các giáp còn lại!`
                        );
                      }}
                      className="px-3 py-1 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-xs font-bold text-white cursor-pointer"
                    >
                      Tự Mặc (Optimize)
                    </button>
                    <button
                      onClick={() => {
                        setPlayer((prev) => ({
                          ...prev,
                          equippedShield: null,
                          equippedHead: null,
                          equippedBody: null,
                          equippedAccessory: null,
                        }));
                        addLog('Đã Lột Đồ phụ trợ để giảm tải trọng.');
                      }}
                      className="px-3 py-1 bg-[#3f1d24] hover:bg-[#5c2430] text-xs font-bold text-[#fca5a5] cursor-pointer"
                    >
                      Lột Đồ (Unequip)
                    </button>
                  </div>

                  {/* 5 Equipment Slots */}
                  <div className="space-y-2">
                    {(
                      [
                        [
                          'weapon',
                          'V.Khí',
                          (CONFIG.WEAPONS[player.equippedWeapon]?.name || 'Trống') +
                            (player.bloodForgedWeapons?.includes(player.equippedWeapon)
                              ? ' [Huyết Rèn +35%]'
                              : '') +
                            (player.cursedLockedWeapon === player.equippedWeapon
                              ? ' [🔒 KHÓA NGUYỀN]'
                              : ''),
                          player.equippedWeapon,
                        ],
                        [
                          'shield',
                          'Khiên',
                          player.equippedShield
                            ? CONFIG.SHIELDS[player.equippedShield]?.name || 'Trống'
                            : 'Trống',
                          player.equippedShield || 'rotten_wood_shield',
                        ],
                        [
                          'head',
                          'Đầu',
                          player.equippedHead ? GEAR_ITEMS[player.equippedHead]?.name : 'Trống',
                          player.equippedHead || 'iron_penitent_helm',
                        ],
                        [
                          'body',
                          'Thể Xác',
                          player.equippedBody ? GEAR_ITEMS[player.equippedBody]?.name : 'Trống',
                          player.equippedBody || 'cathedral_chainmail',
                        ],
                        [
                          'accessory',
                          'P.Kiện',
                          player.equippedAccessory
                            ? GEAR_ITEMS[player.equippedAccessory]?.name
                            : 'Trống',
                          player.equippedAccessory || 'bone_rosary_ring',
                        ],
                      ] as Array<[EquipSlotKey, string, string, string]>
                    ).map(([slotKey, slotLabel, equippedName, iconId]) => (
                      <div
                        key={slotKey}
                        onClick={() => {
                          setSelectedEquipSlot(slotKey);
                          setPreviewItemId(iconId);
                        }}
                        className={`p-2.5 border flex items-center justify-between cursor-pointer ${
                          selectedEquipSlot === slotKey
                            ? 'bg-[#26151c] border-[#fbbf24]'
                            : 'bg-[#0b090e] border-[#2e252c]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-16 text-xs font-bold uppercase text-[#a89882]">
                            {slotLabel}
                          </span>
                          <span className="text-xs font-bold text-[#f5ebd6]">{equippedName}</span>
                        </div>
                        <span className="text-[10px] text-[#fbbf24]">[Chọn đổi]</span>
                      </div>
                    ))}
                  </div>

                  {/* Available items for the selected slot */}
                  <div className="p-3 bg-[#09070c] border border-[#2e252c] space-y-2">
                    <div className="text-[11px] uppercase text-[#a89882]">
                      Danh sách khả dụng cho ô [{selectedEquipSlot.toUpperCase()}]:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedEquipSlot === 'weapon' &&
                        player.unlockedWeapons.map((wId) => {
                          const w = CONFIG.WEAPONS[wId];
                          if (!w) return null;
                          const isForged = player.bloodForgedWeapons?.includes(wId);
                          return (
                            <button
                              key={wId}
                              onClick={() => {
                                setPreviewItemId(wId);
                                const unequipCheck = canUnequipWeapon(player);
                                if (!unequipCheck.allowed && wId !== player.equippedWeapon) {
                                  setInvFeedback(unequipCheck.reason || 'Vũ khí bị nguyền đang khóa chặt!');
                                  addLog(`🔒 ${unequipCheck.reason}`);
                                  return;
                                }
                                setPlayer((p) => ({
                                  ...p,
                                  equippedWeapon: wId,
                                  cursedLockedWeapon: w.isCursed ? wId : p.cursedLockedWeapon,
                                }));
                              }}
                              className="p-2 bg-[#16121b] hover:bg-[#241c2c] border border-[#433548] text-left text-xs cursor-pointer"
                            >
                              <div className="font-bold text-[#f3e5ab]">
                                {w.name} {isForged ? '🩸' : ''} {w.isCursed ? '☠️' : ''}
                              </div>
                              <div className="text-[10px] text-[#86efac]">
                                ST: {w.dmg[0]}–{w.dmg[1]} {isForged ? '(+35% Huyết Rèn)' : ''}
                              </div>
                            </button>
                          );
                        })}

                      {selectedEquipSlot === 'shield' &&
                        player.unlockedShields.map((sId) => {
                          const s = CONFIG.SHIELDS[sId];
                          if (!s) return null;
                          const check = canPlayerEquipShield(player, sId);
                          return (
                            <button
                              key={sId}
                              onClick={() => {
                                setPreviewItemId(sId);
                                if (!check.allowed) {
                                  setInvFeedback(check.reason || 'Không thể trang bị khiên này!');
                                  addLog(`⚠️ ${check.reason}`);
                                  return;
                                }
                                setPlayer((p) => ({ ...p, equippedShield: sId }));
                              }}
                              className={`p-2 border text-left text-xs cursor-pointer ${
                                check.allowed
                                  ? 'bg-[#16121b] hover:bg-[#241c2c] border-[#433548]'
                                  : 'bg-[#1a1114] border-[#7f1d1d] opacity-75'
                              }`}
                            >
                              <div className="font-bold text-[#f3e5ab]">{s.name}</div>
                              <div className="text-[10px] text-[#93c5fd]">
                                Giảm {Math.round(s.guardReduction * 100)}% ST khi Thủ
                              </div>
                              {!check.allowed && (
                                <div className="text-[9px] text-[#fca5a5] mt-0.5">🔒 {check.reason}</div>
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
                            const check = canPlayerEquipGear(player, gId);
                            return (
                              <button
                                key={gId}
                                onClick={() => {
                                  setPreviewItemId(gId);
                                  if (!check.allowed) {
                                    setInvFeedback(check.reason || 'Không đủ điều kiện mặc trang bị này!');
                                    addLog(`⚠️ ${check.reason}`);
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
                                className={`p-2 border text-left text-xs cursor-pointer ${
                                  check.allowed
                                    ? 'bg-[#16121b] hover:bg-[#241c2c] border-[#433548]'
                                    : 'bg-[#1a1114] border-[#7f1d1d] opacity-75'
                                }`}
                              >
                                <div className="font-bold text-[#f3e5ab]">{g.name}</div>
                                <div className="text-[10px] text-[#86efac]">
                                  DEF +{Math.round(g.physDef * 100)}% • M.DEF +{Math.round(g.magDef * 100)}%
                                </div>
                                {!check.allowed && (
                                  <div className="text-[9px] text-[#fca5a5] mt-0.5">🔒 {check.reason}</div>
                                )}
                              </button>
                            );
                          })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {invTab === 'items' && (
              <div className="space-y-3">
                {invFeedback && (
                  <div className="p-2.5 bg-[#1c1318] border border-[#fbbf24] text-xs text-[#fef08a] flex items-center justify-between gap-2">
                    <span>{invFeedback}</span>
                    <button
                      onClick={() => setInvFeedback(null)}
                      className="text-[10px] text-[#a89882] hover:text-white cursor-pointer shrink-0"
                    >
                      [Ẩn]
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-7 space-y-2">
                    <div className="text-xs font-bold uppercase text-[#fbbf24]">
                      Vật Phẩm Thực Dụng Trong Túi
                    </div>
                    {Object.entries(player.inventory).map(([itemId, count]) => {
                      const item = CONFIG.ITEMS[itemId];
                      if (!item || count <= 0) return null;
                      return (
                        <div
                          key={itemId}
                          onMouseEnter={() => setPreviewItemId(itemId)}
                          className="p-3 bg-[#09070c] border border-[#352a30] hover:border-[#6e5a4f] flex items-center justify-between gap-3 text-xs transition"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <ItemArtworkCanvas itemOrWeaponId={itemId} size={44} />
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="font-bold text-sm text-[#f3e5ab] flex items-center gap-2 flex-wrap">
                                <span>{item.name}</span>
                                <span className="px-1.5 py-0.5 bg-[#1f1924] border border-[#52435c] text-[11px] font-mono text-[#fbbf24]">
                                  x{count}
                                </span>
                              </div>
                              <div className="text-xs text-[#b8a993] leading-snug">{item.desc}</div>
                            </div>
                          </div>
                          {item.unlockSkillId ? (
                            (() => {
                              const skId = item.unlockSkillId!;
                              const skDef = CONFIG.SKILLS.find((s) => s.id === skId);
                              const alreadyUnlocked = (player.skillLevels[skId] || 0) >= 1;
                              return alreadyUnlocked ? (
                                <span className="px-2.5 py-1 bg-[#142b1c] border border-[#22c55e] text-[10px] font-bold text-[#86efac] shrink-0">
                                  Đã Mở Lv.{player.skillLevels[skId]}
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
                                    const msg = `📜 Đã đọc [${item.name}] và mở khóa kỹ năng [${skDef?.name || skId} Lv.1]! Hãy đến Bàn Thờ Hexen để nâng cấp thêm.`;
                                    setInvFeedback(msg);
                                    addLog(msg);
                                  }}
                                  className="px-3 py-1.5 bg-[#581c87] hover:bg-[#6b21a8] border border-[#c084fc] text-[#f3e8ff] font-bold text-xs cursor-pointer shrink-0"
                                >
                                  📜 Lĩnh Hội (Mở Lv.1)
                                </button>
                              );
                            })()
                          ) : itemId === 'brown_vial' ? (
                            <button
                              onClick={() => {
                                setActiveModal(null);
                                promptCrackedWallExplosion();
                              }}
                              className="px-3 py-1.5 bg-[#7c2d12] hover:bg-[#9a3412] border border-[#fb923c]/50 text-white font-bold text-xs cursor-pointer shrink-0"
                            >
                              Nổ Tường [F]
                            </button>
                          ) : itemId === 'bone_saw' ? (
                            <button
                              onClick={() => setInvTab('saw')}
                              className="px-3 py-1.5 bg-[#7f1d1d] hover:bg-[#991b1b] border border-[#f87171]/40 text-white font-bold text-xs cursor-pointer shrink-0"
                            >
                              Mổ Cưa Chi
                            </button>
                          ) : item.mapUsable ? (
                            <button
                              onClick={() => {
                                const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                                pCopy.inventory[itemId] = Math.max(0, (pCopy.inventory[itemId] || 0) - 1);
                                const logs: string[] = [];
                                applySupportItemEffects(pCopy, itemId, logs);
                                setPlayer(pCopy);
                                if (logs.length > 0) {
                                  setInvFeedback(logs.join(' '));
                                  logs.forEach((l) => addLog(l));
                                }
                              }}
                              className="px-3 py-1.5 bg-[#14532d] hover:bg-[#166534] border border-[#4ade80]/40 text-white font-bold text-xs cursor-pointer shrink-0"
                            >
                              Dùng
                            </button>
                          ) : (
                            <span className="px-2 py-1 bg-[#18131d] border border-[#2f2538] text-[10px] text-[#a89882] shrink-0">
                              Dùng trong Trận
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Alchemy Crafting */}
                  <div className="md:col-span-5 space-y-2">
                  <div className="text-xs font-bold uppercase text-[#c084fc]">
                    Bàn Pha Chế Giả Kim
                  </div>
                  {CONFIG.RECIPES.map((rec) => {
                    const canCraft = Object.entries(rec.ingredients).every(
                      ([ingId, qty]) => (player.inventory[ingId] || 0) >= qty
                    );
                    return (
                      <div
                        key={rec.id}
                        className="p-3 bg-[#09070c] border border-[#2d2428] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#f3e5ab]">{rec.name}</div>
                          <div className="text-[11px] text-[#9c8c76]">{rec.desc}</div>
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
                            addLog(`⚗️ Đã pha chế thành công: ${rec.name}!`);
                          }}
                          className="px-3 py-1.5 bg-[#4c1d95] hover:bg-[#5b21b6] disabled:opacity-35 text-white font-bold cursor-pointer shrink-0"
                        >
                          Pha Chế
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            )}

            {invTab === 'saw' && (
              <div className="space-y-3">
                <p className="text-xs text-[#cfc0a9]">
                  Khi tứ chi bị Nhiễm Trùng Hoại Tử mà không còn Thảo Dược Xanh, bạn có thể dùng{' '}
                  <b>Cưa Xương Rỉ Máu (x{player.inventory.bone_saw || 0})</b> để tự cưa đứt chi đó.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      ['leftArm', 'Tay Trái'],
                      ['rightArm', 'Tay Phải'],
                      ['leftLeg', 'Chân Trái'],
                      ['rightLeg', 'Chân Phải'],
                    ] as const
                  ).map(([limbKey, label]) => {
                    const intact = player.limbs[limbKey];
                    const infected = player.limbs.infected[limbKey];
                    return (
                      <div key={limbKey} className="p-3 bg-[#09070c] border border-[#2e2428] space-y-2 text-xs">
                        <div className="font-bold text-[#f3e5ab]">{label}</div>
                        <div className="text-[11px] text-[#a89882]">
                          Trạng thái: {!intact ? 'ĐÃ ĐỨT' : infected ? 'NHIỄM TRÙNG' : 'Bình thường'}
                        </div>
                        <button
                          disabled={!intact || (player.inventory.bone_saw || 0) <= 0}
                          onClick={() => {
                            sfx.playSever();
                            const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                            const res = amputateInfectedLimbWithBoneSaw(pCopy, limbKey);
                            setPlayer(pCopy);
                            addLog(res.message);
                          }}
                          className="w-full py-1.5 bg-[#7f1d1d] hover:bg-[#991b1b] disabled:opacity-35 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Tự Cưa Chi
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL 2: LOCKED ANCIENT PARCHMENT LORE BOOKS ([L])
      ======================================================================== */}
      {activeModal === 'lore' && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#120e17] border-2 border-[#8c7853] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2e2428] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#fbbf24]" />
                <h2 className="text-lg font-bold uppercase tracking-wider text-[#f3e5ab]">
                  Thư Viện Trang Giấy Da Dê Cổ ({player.readBookIds.length}/12 Cuộn Đã Mở)
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="px-3 py-1 bg-[#261e24] text-xs font-bold border border-[#524046] cursor-pointer"
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
                      className={`w-full text-left p-2.5 border text-xs transition ${
                        !unlocked
                          ? 'bg-[#09070c] border-[#1f1922] text-[#574c5e] cursor-not-allowed'
                          : active
                          ? 'bg-[#2b2118] border-[#fbbf24] text-[#fef3c7] cursor-pointer'
                          : 'bg-[#120f17] border-[#33293a] text-[#d6c5ad] hover:border-[#8c7853] cursor-pointer'
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
                      <div className="h-full min-h-[320px] bg-[#0a080d] border border-[#2c2229] flex flex-col items-center justify-center p-6 text-center space-y-2">
                        <ItemArtworkCanvas itemOrWeaponId="ancient_parchment" size={64} />
                        <div className="text-sm font-bold text-[#9c8c76]">
                          CUỘN SÁCH DA DÊ NÀY CHƯA ĐƯỢC TÌM THẤY
                        </div>
                        <p className="text-xs text-[#6e5f68] max-w-sm">
                          Hãy lục soát các Kệ Sách Cổ (Bookshelf) trong Đại Giáo Đường Goethe để mở
                          khóa tri thức giải phẫu và cổ ngữ này.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      className="p-6 border-4 border-[#6e5233] text-[#26190d] space-y-4 shadow-inner"
                      style={{
                        background:
                          'radial-gradient(circle at 50% 45%, #e7d4b5 0%, #cfb48c 70%, #a8895c 100%)',
                        fontFamily: "'Cormorant Garamond', serif",
                      }}
                    >
                      <div className="flex items-center justify-between border-b-2 border-[#6e5233]/50 pb-2">
                        <div>
                          <div className="text-xs uppercase tracking-widest font-bold text-[#6e261a]">
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
          MODAL 3: HEXEN SOUL ALTAR ([H]) WITH AFFINITIES, STAT NODES, LIMB REGROWTH & 3-FLOOR PORTAL
      ======================================================================== */}
      {activeModal === 'hexen' && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="max-w-5xl w-full bg-[#120e17] border-2 border-[#6d28d9] p-4 space-y-3 max-h-[88vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2e2438] pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#c084fc]" />
                <h2 className="text-base font-bold uppercase tracking-wider text-[#f3e5ab]">
                  Bàn Thờ Hexen – Thần Lực & Kỹ Năng (Đá NL: {player.energyStones})
                </h2>
              </div>
              <button
                onClick={() => {
                  setHexenFeedback(null);
                  setActiveModal(null);
                }}
                className="px-3 py-1 bg-[#261e24] text-xs font-bold border border-[#524046] cursor-pointer"
              >
                Đóng [ESC]
              </button>
            </div>

            {hexenFeedback && (
              <div className="p-2 bg-[#1b1224] border border-[#c084fc] text-xs text-[#f3e8ff]">
                {hexenFeedback}
              </div>
            )}

            {/* 3 Cosmic Pillars Affinity & Holy/Void Rituals Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-[#09070d] border border-[#322440] p-2.5 text-xs">
              {(
                [
                  [
                    'holyMother',
                    '✝ Thánh Mẫu (Trật Tự)',
                    player.affinities?.holyMother || 0,
                    'Cần để học phép Trật Tự, Tái Tạo Chi Thể & Trục Xuất.',
                    'border-[#eab308] text-[#fef08a]',
                  ],
                  [
                    'primordialVoid',
                    '🌌 Hư Vô Nguyên Thủy',
                    player.affinities?.primordialVoid || 0,
                    'Mở khóa Cổng Hư Vô dịch chuyển & phép Vực Sao (-10 SAN).',
                    'border-[#9333ea] text-[#e9d5ff]',
                  ],
                  [
                    'demonicPact',
                    '🩸 Giao Kèo Ác Quỷ',
                    player.affinities?.demonicPact || 0,
                    'Cường hóa Huyết Thuật nhưng cộng +10 COR (Khóa Order Ending).',
                    'border-[#dc2626] text-[#fca5a5]',
                  ],
                ] as const
              ).map(([pillarKey, label, lv, desc, col]) => (
                <div key={pillarKey} className={`p-2.5 bg-[#120e18] border ${col} space-y-1.5`}>
                  <div className="flex justify-between font-bold">
                    <span>{label}</span>
                    <span className="font-mono">Affinity {lv}</span>
                  </div>
                  <p className="text-[11px] text-[#a89882]">{desc}</p>
                  <button
                    disabled={player.energyStones < 1}
                    onClick={() => {
                      const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                      const res = prayAffinityAtHexen(pCopy, pillarKey);
                      setPlayer(pCopy);
                      setHexenFeedback(res.message);
                      addLog(res.message);
                    }}
                    className="w-full py-1 bg-[#2a1d3d] hover:bg-[#3e295c] disabled:opacity-35 border border-[#6d28d9] text-[11px] font-bold text-white cursor-pointer"
                  >
                    Cầu Nguyện / Hiến Tế (-1 Đá NL)
                  </button>
                </div>
              ))}
            </div>

            {/* Lower Character Arc Nodes + Limb Regrowth + Exorcism + 3-Floor Void Portal */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#09070d] border border-[#322440] p-3 text-xs">
              <div className="md:col-span-6 space-y-2">
                <div className="font-bold uppercase text-[#fbbf24]">
                  Cung Thấp: Cường Hóa Chỉ Số Nội Tại (1 Đá Năng Lượng / Nốt)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['agility_1', '⚡ Nhanh Nhẹn +1 (+5% Né)'],
                      ['atk_1', '⚔️ Cường Lực (+15% ST)'],
                      ['def_1', '🛡️ Da Thép (+10% DEF)'],
                      ['san_1', '🧠 Ý Chí (+25 Max SAN)'],
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
                        className={`p-2 border text-left text-[11px] font-bold cursor-pointer ${
                          owned
                            ? 'bg-[#142b1c] border-[#22c55e] text-[#86efac]'
                            : 'bg-[#17121f] hover:bg-[#241b30] border-[#4c3766] text-[#f3e5ab] disabled:opacity-40'
                        }`}
                      >
                        {owned ? `✓ ${label}` : label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-6 space-y-2">
                <div className="font-bold uppercase text-[#e9d5ff]">
                  Nghi Thức Thánh Mẫu & Cổng Dịch Chuyển Hư Vô 3 Tầng
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
                      className="px-2.5 py-1.5 bg-[#854d0e] hover:bg-[#a16207] text-white font-bold text-[11px] cursor-pointer"
                    >
                      ✝ Trục Xuất Vũ Khí Nguyền (-1 Đá NL)
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
                        className="px-2.5 py-1.5 bg-[#065f46] hover:bg-[#047857] text-white font-bold text-[11px] cursor-pointer"
                      >
                        🌟 Tái Tạo [{lbl}] (-2 Đá NL, -25 SAN)
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
                          'CỔNG DỊCH CHUYỂN HƯ VÔ',
                          'Tung Đồng Xu Vàng trước khi bước vào khe nứt Hư Vô: Thắng dịch chuyển bình an; Thua bị Chướng Khí cào xé (-12 HP, -15 SAN) khi xuyên không gian!',
                          (won) => {
                            if (!won) {
                              setPlayer((prev) => ({
                                ...prev,
                                hp: Math.max(5, prev.hp - 12),
                                mind: Math.max(0, prev.mind - 15),
                              }));
                              addLog('⚠️ Khe nứt Hư Vô cào rách thể xác khi dịch chuyển (-12 HP, -15 SAN)!');
                            } else {
                              addLog('🌀✨ Bước qua Cổng Hư Vô an toàn tuyệt đối!');
                            }
                            movePlayerToRoom(destId, 'spawn');
                          }
                        );
                      }}
                      className="px-2.5 py-1.5 bg-[#3b0764] hover:bg-[#581c87] disabled:opacity-35 border border-[#a855f7] text-[#f3e8ff] font-bold text-[11px] cursor-pointer"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 Skill Branches with Vertical SVG Connector Lines between Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['Chiến Kỹ', 'Thánh Mẫu', 'Ác Quỷ', 'Hư Vô'] as const).map((branchName) => {
                const branchSkills = CONFIG.SKILLS.filter((s) => s.branch === branchName);
                const branchColor =
                  branchName === 'Chiến Kỹ'
                    ? 'border-[#d97706] text-[#fbbf24]'
                    : branchName === 'Thánh Mẫu'
                    ? 'border-[#eab308] text-[#fef08a]'
                    : branchName === 'Ác Quỷ'
                    ? 'border-[#dc2626] text-[#f87171]'
                    : 'border-[#9333ea] text-[#c084fc]';

                return (
                  <div
                    key={branchName}
                    className="bg-[#0b0811] border border-[#2f233d] p-3 flex flex-col justify-start relative"
                  >
                    <div className={`text-xs font-bold uppercase tracking-wider border-b pb-2 mb-3 text-center ${branchColor}`}>
                      Nhánh {branchName}
                    </div>

                    <div className="space-y-4 relative">
                      {branchSkills.map((sk, sIdx) => {
                        const curLv = player.skillLevels[sk.id] || 0;
                        const lockedByDevour =
                          sk.branch === 'Thánh Mẫu' && player.holyMagicLocked;

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
                                  stroke={curLv > 0 ? '#c084fc' : '#3b2d4a'}
                                  strokeWidth="2.5"
                                />
                              </svg>
                            )}

                            <div
                              className={`p-2.5 border text-xs transition ${
                                curLv > 0
                                  ? 'bg-[#1b1326] border-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                                  : 'bg-[#09070c] border-[#2c2138]'
                              }`}
                            >
                              <div className="flex justify-between items-center gap-1">
                                <span className="font-bold text-[#f3e5ab]">{sk.name}</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#241933] text-[#e9d5ff]">
                                  Lv.{curLv}/3
                                </span>
                              </div>

                              {/* Lv.1 -> Lv.2 -> Lv.3 Node Pip Bar */}
                              <div className="flex items-center gap-1 my-1.5">
                                {[1, 2, 3].map((pip) => (
                                  <React.Fragment key={pip}>
                                    <div
                                      className={`w-5 h-4 text-[9px] font-mono flex items-center justify-center border ${
                                        curLv >= pip
                                          ? 'bg-[#7e22ce] border-[#fde047] text-white font-bold'
                                          : 'bg-[#120e17] border-[#3b2d4a] text-[#6e5f68]'
                                      }`}
                                    >
                                      L{pip}
                                    </div>
                                    {pip < 3 && (
                                      <div
                                        className={`flex-1 h-0.5 ${
                                          curLv >= pip + 1 ? 'bg-[#fde047]' : 'bg-[#2c2138]'
                                        }`}
                                      />
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>

                              <p className="text-[11px] text-[#a89882] leading-snug">
                                {curLv <= 1 ? sk.descLv1 : curLv === 2 ? sk.descLv2 : sk.descLv3}
                              </p>

                              {lockedByDevour && (
                                <div className="text-[10px] text-[#f87171] mt-1">
                                  * Khóa do Nuốt Chửng Xác Quái!
                                </div>
                              )}

                              <div className="mt-2 pt-1.5 border-t border-[#1e1629] flex items-center justify-between gap-1">
                                <span className="text-[10px] text-[#fbbf24]">-{sk.mindCost} Mind</span>
                                {curLv >= 3 ? (
                                  <span className="text-[10px] text-[#4ade80] font-bold">TỐI ĐA</span>
                                ) : curLv === 0 ? (
                                  <span
                                    className="text-[10px] text-[#a89882] italic text-right"
                                    title="Tìm Cuộn Bí Kíp trên Kệ Sách và đọc trong Túi [I] để mở khóa Lv.1"
                                  >
                                    🔒 Đọc Cuộn Bí Kíp (Túi [I])
                                  </span>
                                ) : (
                                  <button
                                    disabled={player.energyStones < 1 || lockedByDevour}
                                    onClick={() => {
                                      setPlayer((prev) => ({
                                        ...prev,
                                        energyStones: prev.energyStones - 1,
                                        skillLevels: {
                                          ...prev.skillLevels,
                                          [sk.id]: (prev.skillLevels[sk.id] || 0) + 1,
                                        },
                                      }));
                                      const msg = `🔮 Đã nâng cấp kỹ năng [${sk.name}] lên Lv.${curLv + 1} tại Bàn Thờ Hexen!`;
                                      setHexenFeedback(msg);
                                      addLog(msg);
                                    }}
                                    className="px-2.5 py-1 bg-[#6d28d9] hover:bg-[#7c3aed] disabled:opacity-35 text-white font-bold text-[10px] cursor-pointer"
                                  >
                                    Nâng Lv.{curLv + 1} (-1 Đá NL)
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
          <div className="max-w-lg w-full bg-[#120e17] border-2 border-[#47383d] p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2e2428] pb-2">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-[#4ade80]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#f3e5ab]">
                  Giường Đá Lưu Trữ – 5 Ô Hồ Sơ (Seed: {world.seed})
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="px-3 py-1 bg-[#261e24] text-xs font-bold border border-[#524046] cursor-pointer"
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
                    className="p-2.5 bg-[#09070c] border border-[#2d2428] flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#f3e5ab]">
                        Ô LƯU #{idx + 1}{' '}
                        {slot?.player?.name ? <span className="text-[#fbbf24]">— {slot.player.name}</span> : null}
                      </div>
                      {slot ? (
                        <div className="text-[#9c8c76] mt-0.5 text-[11px]">
                          {slot.timestamp} • Phòng {slot.world.currentRoomId} • HP {slot.player.hp}/{slot.player.maxHp}
                        </div>
                      ) : (
                        <div className="text-[#5e5246] italic text-[11px]">Ô Trống — Có thể tạo Hồ Sơ Lưu mới</div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          saveToSlot(idx);
                          setActiveModal(null);
                          setLogOverlayVisible(true);
                        }}
                        className="px-2.5 py-1 bg-[#15803d] hover:bg-[#16a34a] text-white font-bold cursor-pointer"
                      >
                        {slot ? 'Lưu Đè' : 'Lưu Mới'}
                      </button>
                      {slot && (
                        <>
                          <button
                            onClick={() => loadFromSlot(idx)}
                            className="px-2.5 py-1 bg-[#1e293b] hover:bg-[#334155] text-white font-bold cursor-pointer"
                          >
                            Tải Lại
                          </button>
                          <button
                            onClick={() => deleteSaveSlot(idx)}
                            className="px-2 py-1 bg-[#3f161b] hover:bg-[#5c1c24] border border-[#7f1d1d] text-[#fca5a5] cursor-pointer"
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
          <div className="max-w-3xl w-full bg-[#120e17] border-2 border-[#b45309] p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(180,83,9,0.28)]">
            <div className="flex items-center justify-between border-b border-[#3b2c26] pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#fbbf24]" />
                <h2
                  className="text-xl font-bold uppercase tracking-wider text-[#fde68a]"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  📖 Sách Cẩm Nang Sinh Tồn – Thung Lũng Xương Tàn
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="px-3 py-1 bg-[#261e24] hover:bg-[#382b34] text-xs font-bold border border-[#524046] cursor-pointer"
              >
                Đóng [ESC]
              </button>
            </div>

            {/* 4 Concise Guide & Chronicle Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setGuideTab('lore')}
                className={`py-2 px-2.5 border text-xs font-bold uppercase tracking-wider cursor-pointer transition ${
                  guideTab === 'lore'
                    ? 'bg-[#4c1d24] border-[#fbbf24] text-[#fef3c7]'
                    : 'bg-[#17121d] border-[#382d42] text-[#a89882] hover:text-white'
                }`}
              >
                0. Biên Niên Sử
              </button>
              <button
                onClick={() => setGuideTab('move')}
                className={`py-2 px-2.5 border text-xs font-bold uppercase tracking-wider cursor-pointer transition ${
                  guideTab === 'move'
                    ? 'bg-[#7c2d12] border-[#fbbf24] text-[#fef3c7]'
                    : 'bg-[#17121d] border-[#382d42] text-[#a89882] hover:text-white'
                }`}
              >
                1. Di Chuyển [F]
              </button>
              <button
                onClick={() => setGuideTab('combat')}
                className={`py-2 px-2.5 border text-xs font-bold uppercase tracking-wider cursor-pointer transition ${
                  guideTab === 'combat'
                    ? 'bg-[#7f1d1d] border-[#fbbf24] text-[#fef3c7]'
                    : 'bg-[#17121d] border-[#382d42] text-[#a89882] hover:text-white'
                }`}
              >
                2. Chặt Chi [1..5]
              </button>
              <button
                onClick={() => setGuideTab('survival')}
                className={`py-2 px-2.5 border text-xs font-bold uppercase tracking-wider cursor-pointer transition ${
                  guideTab === 'survival'
                    ? 'bg-[#3b1d5e] border-[#fbbf24] text-[#fef3c7]'
                    : 'bg-[#17121d] border-[#382d42] text-[#a89882] hover:text-white'
                }`}
              >
                3. Sinh Tồn & Lọ
              </button>
            </div>

            {/* Tab 0: Biên Niên Sử & 4 Trụ Cột Thế Giới Vaelis */}
            {guideTab === 'lore' && (
              <div className="bg-[#0b0910] border border-[#2f242c] p-3 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] leading-snug text-[#e5d7c3]">
                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#dc2626] space-y-1">
                  <div className="font-bold text-[#fca5a5] uppercase">3 Tầng Chồng Lên Nhau</div>
                  <p>• <b>Tầng 1:</b> Lâu Đài Hắc Ám (Vaelis làm &ldquo;Nắp Hầm&rdquo; trên Ngai Vàng Máu).</p>
                  <p>• <b>Tầng 2:</b> Giáo Đường Goethe (nơi khởi đầu &amp; tế 13 Thánh Tử).</p>
                  <p>• <b>Tầng 3:</b> Vực Sao (Vết Rách Không Gian &amp; Thánh Tử 13).</p>
                </div>

                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#fbbf24] space-y-1">
                  <div className="font-bold text-[#fde68a] uppercase">4 Trụ Cột Thần Linh</div>
                  <p>• <b>Thánh Mẫu:</b> Trật Tự &amp; Máu Đen (tế 13 Thánh Tử).</p>
                  <p>• <b>Thánh Thụ:</b> Thần Ý Chí (Tiên Dược + Lõi Khóa tại Vết Rách).</p>
                  <p>• <b>Hư Vô &amp; Ác Quỷ:</b> Sức mạnh hủy diệt đổi bằng Tha Hóa (COR).</p>
                </div>

                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#a855f7] space-y-1">
                  <div className="font-bold text-[#e9d5ff] uppercase">7 Kết Cục Định Mệnh</div>
                  <p>• <b>COR = 0:</b> Order Ending | <b>COR = 100:</b> Dark Ending.</p>
                  <p>• <b>Tiên Dược + Lõi Khóa:</b> True Ending (Thánh Thụ).</p>
                  <p>• <b>Talk Vaelis / Giải cứu / Thuốc giải:</b> Mở 3 S-Ending.</p>
                </div>
              </div>
            )}

            {/* Tab 1: Di chuyển & Tương tác */}
            {guideTab === 'move' && (
              <div className="bg-[#0b0910] border border-[#2f242c] p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] leading-snug text-[#e5d7c3]">
                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#fbbf24]">
                  <div className="font-bold text-[#fde68a] uppercase mb-0.5">WASD • Nhịp Sokoban</div>
                  <p>Đi từng ô theo nhịp <b>220ms</b>. Mỗi bước tiêu hao nhẹ Đói &amp; đẩy nhanh độc/máu chảy nếu chưa băng.</p>
                </div>

                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#38bdf8]">
                  <div className="font-bold text-[#bae6fd] uppercase mb-0.5">[F] • Cạy Đồ &amp; NPC</div>
                  <p>Nhấn <b>[F]</b> để mở hộp xác nhận tương tác Thùng, Rương, Kệ Sách, Bàn Thờ Hexen hoặc NPC.</p>
                </div>

                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#c084fc]">
                  <div className="font-bold text-[#e9d5ff] uppercase mb-0.5">[F] • Nổ Tường Nứt</div>
                  <p>Đứng sát tường rạn sáng và nhấn <b>[F]</b> xác nhận ném <b>Lọ Nâu</b> để mở Khoang Mật Thất ẩn.</p>
                </div>

                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#4ade80]">
                  <div className="font-bold text-[#bbf7d0] uppercase mb-0.5">Giường Lưu &amp; Đồng Xu</div>
                  <p>Đoán đúng xu để hồi phục &amp; Lưu game (<b>Lucky Coin</b> tung 2 xu; <b>SAN &lt; 30</b> mất quyền chọn xu!).</p>
                </div>
              </div>
            )}

            {/* Tab 2: Chiến thuật Chặt Chi */}
            {guideTab === 'combat' && (
              <div className="bg-[#0b0910] border border-[#2f242c] p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] leading-snug text-[#e5d7c3]">
                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#fbbf24]">
                  <div className="font-bold text-[#fde68a] uppercase mb-0.5">WASD + Enter • Phím [1..5]</div>
                  <p>Chọn chi bằng WASD/chuột rồi Enter/Click lần 2 để chém. Phím nhanh: <b>[1] Đánh, [2] Skill, [3] Thủ, [4] Item, [5] Nói</b>.</p>
                </div>

                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#f87171]">
                  <div className="font-bold text-[#fecaca] uppercase mb-0.5">1. Chặt Tay Vũ Khí</div>
                  <p>Phá tay cầm vũ khí của quái trước để tước đòn chí mạng và ngắt kỹ năng nguy hiểm.</p>
                </div>

                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#4ade80]">
                  <div className="font-bold text-[#bbf7d0] uppercase mb-0.5">2. Chặt Chân → 95% Trúng Đầu</div>
                  <p>Quái mất chân sẽ quỵ ngã, đẩy tỉ lệ trúng <b>Đầu</b> lên <b>95%</b> để kết liễu nhanh.</p>
                </div>

                <div className="p-2.5 bg-[#16121c] border-l-2 border-[#fb923c]">
                  <div className="font-bold text-[#fed7aa] uppercase mb-0.5">3. Thủ &amp; Vũ Khí Nguyền</div>
                  <p>Dùng <b>[P.Thủ] / En Garde</b> khi Boss tụ lực đỏ. <b>Vũ khí Nguyền</b> khóa tay &amp; phản chủ khi <b>SAN &lt; 40</b>.</p>
                </div>
              </div>
            )}

            {/* Tab 3: 3 Thanh Sinh Tồn & Lọ Thực Dụng */}
            {guideTab === 'survival' && (
              <div className="bg-[#0b0910] border border-[#2f242c] p-3 space-y-2.5 text-[11px] leading-snug text-[#e5d7c3]">
                <div className="p-2 bg-[#16121c] border-l-2 border-[#fbbf24] flex flex-wrap gap-x-4 gap-y-0.5">
                  <span>• <b>Đói ≥ 50%:</b> -25% Sát Thương; <b>≥ 90%:</b> Né &amp; Crit = 0.</span>
                  <span>• <b>SAN &lt; 30:</b> Hoảng Loạn.</span>
                  <span>• <b>Nuốt xác:</b> -45% Đói, +20% COR (Khóa Thánh Mẫu).</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="p-2 bg-[#16121c] border border-[#4d3b2c] flex items-center gap-2">
                    <ItemArtworkCanvas itemOrWeaponId="brown_vial" size={30} />
                    <div>
                      <div className="font-bold text-[#fde68a]">Lọ Nâu (Thuốc Nổ)</div>
                      <p className="text-[10.5px] text-[#cfc0a9]">Phá Tường Nứt <b>[F]</b> hoặc nổ <b>650–850 dmg</b>.</p>
                    </div>
                  </div>

                  <div className="p-2 bg-[#16121c] border border-[#5c2424] flex items-center gap-2">
                    <ItemArtworkCanvas itemOrWeaponId="red_vial" size={30} />
                    <div>
                      <div className="font-bold text-[#fca5a5]">Lọ Đỏ (Axit Mù Mắt)</div>
                      <p className="text-[10.5px] text-[#cfc0a9]">Gây <b>Mù 3 lượt (-70% trúng)</b> &amp; bào 50% Giáp.</p>
                    </div>
                  </div>

                  <div className="p-2 bg-[#16121c] border border-[#364d59] flex items-center gap-2">
                    <ItemArtworkCanvas itemOrWeaponId="blue_vial" size={30} />
                    <div>
                      <div className="font-bold text-[#93c5fd]">Lọ Thuốc Xanh &amp; Lọ Trắng</div>
                      <p className="text-[10.5px] text-[#cfc0a9]"><b>Xanh:</b> +50% HP. <b>Trắng:</b> Xóa Độc, Nhiễm Trùng, Ký Sinh.</p>
                    </div>
                  </div>

                  <div className="p-2 bg-[#16121c] border border-[#4c2863] flex items-center gap-2">
                    <ItemArtworkCanvas itemOrWeaponId="purple_vial" size={30} />
                    <div>
                      <div className="font-bold text-[#e9d5ff]">Lọ Tím &amp; Opium</div>
                      <p className="text-[10.5px] text-[#cfc0a9]"><b>Tím:</b> Dễ cháy (<b>x2.5 Lửa/Thánh</b>) hoặc trốn 100%. <b>Opium:</b> +30 SAN.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL 6: 160x160 3D EMBOSSED GOLD COIN TOSS MODAL (HEADS / TAILS + HOLD SHIFT FOR 2 COINS)
      ======================================================================== */}
      {coinToss && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#120e14] border-2 border-[#fbbf24] p-6 text-center space-y-4 shadow-[0_0_50px_rgba(251,191,36,0.25)]">
            <div className="text-xs uppercase tracking-[0.2em] text-[#fbbf24] font-bold">
              ĐỒNG XU VÀNG ĐỊNH MỆNH {coinToss.isPanicAuto ? '• HOẢNG LOẠN!' : ''}
            </div>
            <h3
              className="text-2xl font-bold text-[#f5ebd6]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {coinToss.title}
            </h3>
            <p className="text-xs text-[#cfc0a9] leading-relaxed">{coinToss.subtitle}</p>

            {/* 160x160 3D Embossed Gold Coin Canvas (or Dual 2-Coin Shift view) */}
            <div className="py-2 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center justify-center gap-3">
                <EngravedGoldCoinCanvas
                  side={coinToss.resultSide || coinToss.chosenSide || 'HEADS'}
                  flipping={coinToss.flipping}
                  size={coinToss.secondResultSide || shiftHeld ? 120 : 160}
                />
                {(coinToss.secondResultSide || (!coinToss.resultSide && shiftHeld)) && (
                  <EngravedGoldCoinCanvas
                    side={coinToss.secondResultSide || coinToss.chosenSide || 'TAILS'}
                    flipping={coinToss.flipping}
                    size={120}
                  />
                )}
              </div>
              <div className="text-xs font-bold tracking-widest uppercase text-[#fef08a]">
                {coinToss.resultSide
                  ? coinToss.secondResultSide
                    ? `XU 1: ${coinToss.resultSide === 'HEADS' ? 'NGỬA' : 'SẤP'} • XU 2: ${
                        coinToss.secondResultSide === 'HEADS' ? 'NGỬA' : 'SẤP'
                      }`
                    : coinToss.resultSide === 'HEADS'
                    ? 'MẶT NGỬA: CHÂN DUNG THÁNH MẪU'
                    : 'MẶT SẤP: ẤN KÝ NHẬT THỰC GOETHE'
                  : shiftHeld
                  ? '🪙x2 ĐANG GIỮ [SHIFT]: TUNG 2 ĐỒNG XU CÙNG LÚC'
                  : 'CHỌN MẶT NGỬA HOẶC MẶT SẤP (GIỮ [SHIFT] ĐỂ TUNG 2 XU)'}
              </div>
            </div>

            {!coinToss.chosenSide && !coinToss.isPanicAuto && (
              <div className="space-y-2.5">
                <div
                  className={`px-3 py-1.5 border text-[11px] transition ${
                    shiftHeld
                      ? 'bg-[#3b1d5e] border-[#fde047] text-[#fef08a] font-bold'
                      : 'bg-[#17121b] border-[#3d313a] text-[#a89882]'
                  }`}
                >
                  {shiftHeld
                    ? '✨ Chế độ 2 Xu [SHIFT]: Cả 2 trúng = Thưởng chuẩn • 1 Sấp 1 Ngửa = Đồ kém hơn • Cả 2 trượt = Thất bại'
                    : '💡 Mẹo: Ấn đè phím [SHIFT] khi bấm chọn Ngửa/Sấp để tung 2 đồng xu cùng lúc'}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={(e) => handleChooseCoinSide('HEADS', e.shiftKey || shiftHeld)}
                    className="py-2.5 px-2 bg-[#92400e] hover:bg-[#b45309] border border-[#fde68a] text-xs font-bold uppercase text-white cursor-pointer"
                  >
                    {shiftHeld ? '🪙x2 Mặt Ngửa (Thánh Mẫu)' : 'Mặt Ngửa (Thánh Mẫu)'}
                  </button>
                  <button
                    onClick={(e) => handleChooseCoinSide('TAILS', e.shiftKey || shiftHeld)}
                    className="py-2.5 px-2 bg-[#92400e] hover:bg-[#b45309] border border-[#fde68a] text-xs font-bold uppercase text-white cursor-pointer"
                  >
                    {shiftHeld ? '🪙x2 Mặt Sấp (Nhật Thực)' : 'Mặt Sấp (Nhật Thực)'}
                  </button>
                </div>

                {coinToss.onLockpick && (
                  <button
                    onClick={() => {
                      const lp = coinToss.onLockpick;
                      setCoinToss(null);
                      lp?.();
                    }}
                    className="w-full py-2 bg-[#065f46] hover:bg-[#047857] border border-[#34d399] text-xs font-bold text-white cursor-pointer"
                  >
                    🗝️ Dùng Chìa Khóa Vạn Năng (Lockpick x{player.inventory.lockpick}) — Mở 100%
                  </button>
                )}
              </div>
            )}

            {coinToss.outcomeText && (
              <div className="space-y-3">
                <div className="p-2.5 bg-[#1f1619] border border-[#fbbf24] text-xs font-bold text-[#fef08a]">
                  {coinToss.outcomeText}
                </div>
                <button
                  onClick={() => {
                    const won =
                      coinToss.wonOutcome !== undefined
                        ? coinToss.wonOutcome
                        : coinToss.chosenSide === coinToss.resultSide;
                    const tier: CoinOutcomeTier =
                      coinToss.outcomeTier || (won ? 'win' : 'lose');
                    const cb = coinToss.onResolve;
                    setCoinToss(null);
                    cb(won, tier);
                  }}
                  className="w-full py-2 bg-[#b45309] hover:bg-[#d97706] text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Chấp Nhận Định Mệnh
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
