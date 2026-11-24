import { useEffect, useRef, useState, useCallback } from 'react';
import {
  BookOpen,
  Flame,
  Backpack,
  Volume2,
  VolumeX,
  HelpCircle,
  Settings,
} from 'lucide-react';
import { CONFIG, DifficultyMode, EnemyTemplate, WeaponCategory } from './game/config';
import {
  evaluateCanonEnding,
  evaluateVoidRiftRequirements,
  SMUGGLER_VALUABLE_IDS,
  SmugglerHaggleTactic,
  evaluateSmugglerHaggle,
} from './game/narrative';
import { SeededRNG } from './game/prng';
import { sfx, AudioVisualSettings } from './game/audio';
import {
  drawPixelSprite,
  drawPartyBackSprite,
  drawCombatBackdrop,
  getLimbReticlePositions,
} from './game/pixelArt';
import { DungeonMapViewport, getParkedCompanionSpots } from './components/DungeonMapViewport';
import { TitleScreen } from './components/TitleScreen';
import { PrologueScreen } from './components/PrologueScreen';
import { EndingScreen } from './components/EndingScreen';
import { CombatStageView, CombatMenuMode, CombatStageNotice } from './components/CombatStageView';
import { InventoryModal, EquipSlotKey } from './components/InventoryModal';
import { HexenModal } from './components/HexenModal';
import { LoreModal, HunterNoteModal } from './components/LoreModal';
import {
  SavesModal,
  GuideModal,
  SettingsModal,
  CoinTossModal,
  CoinOutcomeTier,
  SaveSlotData,
  CoinTossState,
} from './components/SystemModals';
import {
  generateWorld,
  getHerbTypeAtCoord,
  TILE,
  NPC_TILE_SET,
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
  getPlayerStepCooldownMs,
  getAllyAvailableSkills,
  canTargetEnemyLimb,
  devourEnemyCorpse,
  evaluateZeroMindStepDespair,
  applyDefaultIntroLoadoutForRemainingSteps,
  isPlayerPanicking,
  leaveOrDismissPartyMember,
  pruneDeadCompanions,
  recallDismissedCompanion,
  getAmputationSanityMultiplier,
  resolveCombatCoinFlipOutcome,
  isPureTankSummon,
  isHolyMotherBanned,
  banHolyMother,
  syncCorruptionHolyBan,
  checkCorruptionDiegeticWarning,
  canUseHolySkill,
  getFloor3MiasmaMultiplier,
  getEligibleChestWeaponIds,
  getEligibleChestGearIds,
  getEligibleNormalCorpseWeaponIds,
  dissectEnemyCorpseCleanly,
  grantAffinityOnce,
  HOLY_MOTHER_REFUSAL_MSG,
  ALTAR_EXHAUSTED_MSG,
  HOLY_ALTAR_REFUSAL_MSG,
  buildAltarKey,
  performAltarAffinityRitual,
  bloodForgeWeapon,
  GEAR_ITEMS,
} from './game/combat';
import { CombatEngine, CombatActionType } from './game/combatEngine';

export type { CoinOutcomeTier };

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

interface InteractionChoice {
  label: string;
  hint?: string;
  muted?: boolean;
  onSelect: () => void;
}

interface InteractionPromptState {
  title: string;
  description: string;
  choices: InteractionChoice[];
  selectedIndex: number;
}

// ============================================================================
// CONFIGURATION CONSTANTS & PURE HELPERS
// ============================================================================

const DEFAULT_CLASS_DEF = CONFIG.CLASSES[0];
const DEFAULT_CLASS_ID = DEFAULT_CLASS_DEF?.id ?? 'fallen_knight';
const DEFAULT_CLASS_NAME = DEFAULT_CLASS_DEF?.name ?? 'Kỵ Sĩ Sa Ngã';
const DEFAULT_BOOK_ID = CONFIG.BOOKS[0]?.id ?? '';

const COMBAT_TIMING_MS = {
  FLEE_EXIT_DELAY: 350,
  OFFENSE_FAST_DELAY: 250,
  OFFENSE_NORMAL_DELAY: 660,
  UTILITY_FAST_DELAY: 200,
  UTILITY_NORMAL_DELAY: 340,
  ENEMY_FAST_DELAY: 250,
  ENEMY_NORMAL_DELAY: 700,
  VFX_CLEAR: 560,
  SHAKE_NORMAL: 280,
  SHAKE_HEAVY: 380,
  COIN_FLIP_RESOLVE: 650,
  HEAVY_DMG_THRESHOLD: 500,
  ENEMY_HEAVY_DMG_THRESHOLD: 35,
} as const;

const EXPLORATION_CONSTANTS = {
  ANIM_TICK_MS: 95,
  SANITY_TICK_MS: 1000,
  SANITY_DECAY_SECONDS: 30,
  AI_TICK_MS: 400,
  TORCH_LOW_RATIO: 0.3,
  TORCH_DURATION_SEC: 120,
  OIL_LAMP_DURATION_SEC: 240,
  EASY_TORCH_DECAY: 0.75,
  NORMAL_TORCH_DECAY: 1,
  DARKNESS_SANITY_MULT: 1.5,
  DASH_COOLDOWN_MULT: 0.48,
  DASH_MIN_COOLDOWN_MS: 95,
  EASY_HUNGER_PER_STEP: 0.28,
  NORMAL_HUNGER_STEP_MOD: 5,
  NORMAL_HUNGER_GAIN: 2,
  STARVATION_THRESHOLD: 80,
  STARVATION_HP_LOSS: 3,
  FLOOR_TRAP_HP_LOSS: 22,
  FLOOR_TRAP_MIND_LOSS: 6,
  PLATINUM_CUIRASS_BURN_HP: 5,
  MAX_COMBAT_LOGS: 18,
  MAX_NARRATIVE_LOGS: 35,
  MAX_PARTY_ALLIES: 3,
} as const;

const COIN_TOSS_BALANCING = {
  PANIC_WIN_CHANCE: 0.38,
  BASE_WIN_CHANCE: 0.5,
  MAX_WIN_CHANCE: 0.88,
  CLAW_ACCESSORY_BONUS: 0.15,
} as const;

const CANVAS_STAGE_DIMS = {
  WIDTH: 640,
  HEIGHT: 440,
  ENEMY_BY_SCALE: {
    '3x3': { w: 500, h: 430 },
    '2x3': { w: 465, h: 420 },
    '2x2': { w: 425, h: 405 },
    '1x2': { w: 375, h: 395 },
  },
} as const;

const SELF_UTILITY_SKILLS = new Set([
  'blessed_heal',
  'divine_aegis',
  'purification',
  'blood_pact',
  'veil_of_blindness',
  'necromancy',
]);

const SEED_PREFIXES = ['VAELIS', 'GOETHE', 'ABYSS', 'HEXEN', 'ECLIPSE', 'BONE'] as const;
const CHARACTER_NAMES = [
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
] as const;

const CLASS_OPENING_LORE: Record<string, string> = {
  fallen_knight:
    'Ký ức Kỵ Đoàn: Bạn siết chặt chuôi kiếm trước Cổng Sắt Goethe. Đội trưởng Vaelis từng thề bảo vệ nhân loại — vì sao ngài lại kéo cả Lâu Đài Hắc Ám đè nát thánh địa này?',
  forsaken_nun:
    'Tội Ác Máu Đen: Giữa sương mù, hình ảnh bức tượng Thánh Mẫu khóc ra máu đen lại hiện về. Đứa em trai duy nhất của bạn — Thánh Tử Thứ 13 — vẫn đang bị giam dưới đáy địa ngục này.',
  night_hunter:
    'Lời Nguyền Hóa Đá: Lớp vảy đá xám trên cánh tay lại nhói buốt. Chỉ có bình Tiên Dược Nguyên Sơ dưới đáy Vực Sao và Lõi Khóa Hư Vô mới giúp bạn thoát khỏi Thung Lũng Xương Tàn.',
};

const INITIAL_NARRATIVE_LOGS: string[] = [
  'Lâu Đài Hắc Ám từ vòm trời đêm giáng xuống, nghiền nát mái vòm Đại Giáo Đường Goethe.',
  'Bạn tỉnh dậy tại Ngoại Vi Đại Giáo Đường Goethe giữa sương mù và mùi máu tanh.',
];

const LOG_TEXT = {
  TORCH_LIT: 'Bạn châm ngọn đuốc mới, ánh lửa bập bùng đẩy lùi bóng tối.',
  OIL_LAMP_LIT: 'Bạn châm lửa Đèn Dầu Cổ, ánh sáng ổn định đẩy lùi bóng tối đặc quánh.',
  NO_LIGHT_SOURCE: 'Trong hành trang không còn Đuốc hay Đèn Dầu nào!',
  FLED_COMBAT: 'Cả đội đã thoát khỏi cuộc giao tranh trong gang tấc.',
  NO_ENOUGH_MIND: 'Không đủ Lý Trí để thi triển kỹ năng này!',
  SHIELDED_LIMB_FALLBACK: 'Bộ phận này đang bị che chắn!',
} as const;

function createDefaultTrailCoords(spawnX: number, spawnY: number): Array<{ x: number; y: number }> {
  return [
    { x: Math.max(1, spawnX - 1), y: spawnY },
    { x: Math.max(1, spawnX - 2), y: spawnY },
    { x: Math.max(1, spawnX - 2), y: Math.max(1, spawnY - 1) },
    { x: Math.max(1, spawnX - 3), y: Math.max(1, spawnY - 1) },
  ];
}

function appendCombatLogEntries(prev: string[], newLogs: string[]): string[] {
  if (newLogs.length === 0) return prev;
  return [...newLogs.slice().reverse(), ...prev.slice(0, EXPLORATION_CONSTANTS.MAX_COMBAT_LOGS)];
}

/**
 * Resolves a valid, intact, targetable limb ID for the active combat enemy.
 * If the preferred limb is severed or blocked, automatically re-routes to the
 * nearest geometric intact targetable limb using reticle coordinates.
 */
function resolveNearestValidLimbId(
  enemy: MapEnemyInstance,
  tpl: EnemyTemplate,
  preferredLimbId?: string | null
): string {
  const isAlive = (id: string) => {
    const limb = enemy.limbs.find((l) => l.id === id);
    return Boolean(limb && limb.hp > 0 && !enemy.severedLimbs.includes(limb.id));
  };

  if (preferredLimbId && isAlive(preferredLimbId) && canTargetEnemyLimb(enemy, tpl, preferredLimbId).allowed) {
    return preferredLimbId;
  }

  const aliveLimbs = enemy.limbs.filter((l) => l.hp > 0 && !enemy.severedLimbs.includes(l.id));
  if (aliveLimbs.length === 0) return preferredLimbId || 'torso';

  const targetable = aliveLimbs.filter((l) => canTargetEnemyLimb(enemy, tpl, l.id).allowed);
  const candidates = targetable.length > 0 ? targetable : aliveLimbs;

  if (preferredLimbId) {
    const reticleMap = getLimbReticlePositions(tpl.spriteKey);
    const refPos = reticleMap[preferredLimbId];
    if (refPos) {
      let best = candidates[0];
      let bestDist = Infinity;
      for (const cand of candidates) {
        const pos = reticleMap[cand.id];
        if (!pos) continue;
        const dist = Math.hypot(pos.nx - refPos.nx, pos.ny - refPos.ny);
        if (dist < bestDist) {
          bestDist = dist;
          best = cand;
        }
      }
      if (best) return best.id;
    }
  }

  return candidates.find((l) => l.id === 'torso')?.id || candidates[0]?.id || 'torso';
}

interface ExplorationHeaderBarProps {
  player: PlayerState;
  currentRoom: RoomData;
  muted: boolean;
  onLightTorch: () => void;
  onOpenInventory: () => void;
  onOpenLore: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
  onToggleMute: () => void;
}

function ExplorationHeaderBar({
  player,
  currentRoom,
  muted,
  onLightTorch,
  onOpenInventory,
  onOpenLore,
  onOpenGuide,
  onOpenSettings,
  onToggleMute,
}: ExplorationHeaderBarProps) {
  const tCur = player.torchTimer ?? EXPLORATION_CONSTANTS.TORCH_DURATION_SEC;
  const tMax = Math.max(1, player.torchMaxTimer ?? EXPLORATION_CONSTANTS.TORCH_DURATION_SEC);
  const tPct = Math.round((tCur / tMax) * 100);
  const partyPanicking = isPlayerPanicking(player) || player.party.some((a) => a.hp > 0 && a.mind < 30);

  return (
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
        {!currentRoom.isExterior && (
          <button
            type="button"
            onClick={onLightTorch}
            title="Nhiên liệu ánh sáng — Bấm [T] hoặc nhấp để thắp nhanh Đuốc Sáng / Đèn Dầu"
            className={`px-2 py-0.5 border font-mono text-xs leading-none flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-90 ${
              tCur <= 0
                ? 'bg-[#1a090c] border-[#8b0000] text-[#c96b6b] animate-pulse'
                : tPct < 30
                ? 'bg-[#241608] border-[#d97706] text-[#fbbf24]'
                : 'bg-[#17120c] border-[#5e4b30] text-[#dfd2b4]'
            }`}
          >
            {tCur <= 0 ? (
              <span>[TẮT ĐUỐC] [T]</span>
            ) : (
              <>
                <Flame className="w-3 h-3 text-[#c5a059] shrink-0" />
                <span>[ĐUỐC {tPct}%] [T]</span>
              </>
            )}
          </button>
        )}
        {partyPanicking && (
          <span className="px-2 py-0.5 bg-[#2e0b0f] border border-[#8b0000] text-[#fca5a5] font-mono text-xs font-bold animate-pulse">
            [HOẢNG LOẠN]
          </span>
        )}
      </div>

      {/* Quick Modal Action Buttons (Hexen & Save/Load are strictly world interactions) */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenInventory}
          className="df-btn px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Backpack className="w-3.5 h-3.5 text-[#c5a059]" /> Túi [I]
        </button>
        <button
          onClick={onOpenLore}
          className="df-btn px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#c5a059]" /> Sách ({player.readBookIds.length}/{CONFIG.BOOKS.length}) [L]
        </button>
        <button
          onClick={onOpenGuide}
          className="df-btn px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          title="Sách Hướng Dẫn Sinh Tồn [?]"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#c5a059]" /> Cẩm Nang [?]
        </button>
        <button
          onClick={onOpenSettings}
          className="df-btn px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          title="Cài Đặt Hệ Thống [ESC]"
        >
          <Settings className="w-3.5 h-3.5 text-[#c5a059]" /> Cài Đặt [ESC]
        </button>
        <button
          onClick={onToggleMute}
          className="df-btn p-1.5 text-xs cursor-pointer"
          title="Bật/Tắt Âm Thanh"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5 text-[#d3d3d3]" /> : <Volume2 className="w-3.5 h-3.5 text-[#c5a059]" />}
        </button>
      </div>
    </header>
  );
}

interface ExplorationDialogueOverlayProps {
  interactionMenu: InteractionPromptState | null;
  logOverlayVisible: boolean;
  narrativeLogs: string[];
  onHoverChoice: (idx: number) => void;
  onDismissLogOverlay: () => void;
}

function ExplorationDialogueOverlay({
  interactionMenu,
  logOverlayVisible,
  narrativeLogs,
  onHoverChoice,
  onDismissLogOverlay,
}: ExplorationDialogueOverlayProps) {
  if (!interactionMenu && !logOverlayVisible) return null;

  const rawSpeaker = (interactionMenu?.title || 'NHẬT KÝ HÀNH TRÌNH').trim();
  const firstChar = rawSpeaker.charAt(0).toUpperCase();
  const restChars = rawSpeaker.slice(1).toUpperCase();

  return (
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
                onMouseEnter={() => onHoverChoice(idx)}
                onClick={() => choice.onSelect()}
                className={`w-full text-left px-4 py-1.5 font-serif text-sm sm:text-base tracking-wide transition cursor-pointer ${
                  choice.muted
                    ? isSelected
                      ? 'text-[#b5aba0] font-semibold'
                      : 'text-[#847c74] hover:text-[#b5aba0]'
                    : isSelected
                    ? 'text-[#f3e6c4] font-semibold'
                    : 'text-[#d3d3d3]/75 hover:text-[#f3e6c4]'
                }`}
                style={
                  isSelected
                    ? {
                        background: choice.muted
                          ? 'radial-gradient(ellipse at center, rgba(64, 56, 54, 0.72) 0%, rgba(30, 26, 26, 0.45) 55%, rgba(15, 10, 12, 0) 100%)'
                          : 'radial-gradient(ellipse at center, rgba(139, 0, 0, 0.92) 0%, rgba(90, 8, 12, 0.65) 55%, rgba(15, 10, 12, 0) 100%)',
                        textShadow: choice.muted ? undefined : '0 0 8px rgba(197, 160, 89, 0.55)',
                      }
                    : undefined
                }
              >
                <div>{choice.label}</div>
                {choice.hint && (
                  <div className="text-[11px] font-sans font-normal text-[#968d85] mt-0.5 leading-snug">
                    ↳ {choice.hint}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="ml-auto w-fit min-w-[230px] mb-[2px] df-panel px-3.5 py-2">
          <button
            type="button"
            onClick={onDismissLogOverlay}
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

      {/* Bottom RPG Dialogue Box with Gothic Illuminated Drop-Cap Nameplate */}
      <div className="df-panel px-5 py-3.5 min-h-[112px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
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
  );
}

interface ExplorationModalLayerProps {
  activeModal: ActiveModal;
  player: PlayerState;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
  world: WorldMapState;
  setWorld: React.Dispatch<React.SetStateAction<WorldMapState>>;
  currentRoom: RoomData;
  playerPos: { x: number; y: number };
  invTab: 'equip' | 'items' | 'alchemy' | 'saw';
  setInvTab: React.Dispatch<React.SetStateAction<'equip' | 'items' | 'alchemy' | 'saw'>>;
  isAmputating: boolean;
  setIsAmputating: React.Dispatch<React.SetStateAction<boolean>>;
  sawTargetMemberIdx: number | null;
  setSawTargetMemberIdx: React.Dispatch<React.SetStateAction<number | null>>;
  selectedInvMemberIdx: number;
  setSelectedInvMemberIdx: React.Dispatch<React.SetStateAction<number>>;
  selectedEquipSlot: EquipSlotKey;
  setSelectedEquipSlot: React.Dispatch<React.SetStateAction<EquipSlotKey>>;
  previewItemId: string;
  setPreviewItemId: React.Dispatch<React.SetStateAction<string>>;
  invFeedback: string | null;
  setInvFeedback: React.Dispatch<React.SetStateAction<string | null>>;
  torchLowWarnedRef: React.MutableRefObject<boolean>;
  loreModalTab: 'books' | 'destiny';
  setLoreModalTab: React.Dispatch<React.SetStateAction<'books' | 'destiny'>>;
  selectedLoreBookId: string;
  setSelectedLoreBookId: React.Dispatch<React.SetStateAction<string>>;
  hexenTab: 'skills' | 'rituals';
  setHexenTab: React.Dispatch<React.SetStateAction<'skills' | 'rituals'>>;
  selectedHexenSkillId: string | null;
  setSelectedHexenSkillId: React.Dispatch<React.SetStateAction<string | null>>;
  hexenFeedback: string | null;
  setHexenFeedback: React.Dispatch<React.SetStateAction<string | null>>;
  saveSlots: Array<SaveSlotData | null>;
  guideTab: 'move' | 'combat' | 'survival' | 'lore';
  setGuideTab: React.Dispatch<React.SetStateAction<'move' | 'combat' | 'survival' | 'lore'>>;
  audioSettings: AudioVisualSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioVisualSettings>>;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
  confirmReturnTitle: boolean;
  setConfirmReturnTitle: React.Dispatch<React.SetStateAction<boolean>>;
  onSetActiveModal: React.Dispatch<React.SetStateAction<ActiveModal>>;
  onAddLog: (msg: string) => void;
  onShowLogOverlay: () => void;
  onPromptCrackedWallExplosion: () => void;
  onTriggerNightHunterElixirEnding: (pCopy: PlayerState) => void;
  onTriggerVoidPortal: (destId: string) => void;
  onSaveSlot: (idx: number) => void;
  onLoadSlot: (idx: number) => void;
  onDeleteSlot: (idx: number) => void;
  onReturnToTitle: () => void;
}

function ExplorationModalLayer({
  activeModal,
  player,
  setPlayer,
  world,
  setWorld,
  currentRoom,
  playerPos,
  invTab,
  setInvTab,
  isAmputating,
  setIsAmputating,
  sawTargetMemberIdx,
  setSawTargetMemberIdx,
  selectedInvMemberIdx,
  setSelectedInvMemberIdx,
  selectedEquipSlot,
  setSelectedEquipSlot,
  previewItemId,
  setPreviewItemId,
  invFeedback,
  setInvFeedback,
  torchLowWarnedRef,
  loreModalTab,
  setLoreModalTab,
  selectedLoreBookId,
  setSelectedLoreBookId,
  hexenTab,
  setHexenTab,
  selectedHexenSkillId,
  setSelectedHexenSkillId,
  hexenFeedback,
  setHexenFeedback,
  saveSlots,
  guideTab,
  setGuideTab,
  audioSettings,
  setAudioSettings,
  setMuted,
  confirmReturnTitle,
  setConfirmReturnTitle,
  onSetActiveModal,
  onAddLog,
  onShowLogOverlay,
  onPromptCrackedWallExplosion,
  onTriggerNightHunterElixirEnding,
  onTriggerVoidPortal,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
  onReturnToTitle,
}: ExplorationModalLayerProps) {
  if (!activeModal) return null;
  const computedStats = getComputedPlayerStats(player);

  return (
    <>
      {activeModal === 'inventory' && (
        <InventoryModal
          player={player}
          setPlayer={setPlayer}
          world={world}
          setWorld={setWorld}
          playerPos={playerPos}
          computedStats={computedStats}
          invTab={invTab}
          setInvTab={setInvTab}
          isAmputating={isAmputating}
          setIsAmputating={setIsAmputating}
          sawTargetMemberIdx={sawTargetMemberIdx}
          setSawTargetMemberIdx={setSawTargetMemberIdx}
          selectedInvMemberIdx={selectedInvMemberIdx}
          setSelectedInvMemberIdx={setSelectedInvMemberIdx}
          selectedEquipSlot={selectedEquipSlot}
          setSelectedEquipSlot={setSelectedEquipSlot}
          previewItemId={previewItemId}
          setPreviewItemId={setPreviewItemId}
          invFeedback={invFeedback}
          setInvFeedback={setInvFeedback}
          torchLowWarnedRef={torchLowWarnedRef}
          onClose={() => onSetActiveModal(null)}
          onOpenHunterNote={() => onSetActiveModal('hunter_note')}
          onAddLog={onAddLog}
          onShowLogOverlay={onShowLogOverlay}
          onPromptCrackedWallExplosion={onPromptCrackedWallExplosion}
          onTriggerNightHunterElixirEnding={onTriggerNightHunterElixirEnding}
        />
      )}

      {activeModal === 'lore' && (
        <LoreModal
          player={player}
          loreModalTab={loreModalTab}
          setLoreModalTab={setLoreModalTab}
          selectedLoreBookId={selectedLoreBookId}
          setSelectedLoreBookId={setSelectedLoreBookId}
          onClose={() => onSetActiveModal(null)}
        />
      )}

      {activeModal === 'hunter_note' && (
        <HunterNoteModal onClose={() => onSetActiveModal(null)} />
      )}

      {activeModal === 'hexen' && (
        <HexenModal
          player={player}
          setPlayer={setPlayer}
          currentRoom={currentRoom}
          hexenTab={hexenTab}
          setHexenTab={setHexenTab}
          selectedHexenSkillId={selectedHexenSkillId}
          setSelectedHexenSkillId={setSelectedHexenSkillId}
          hexenFeedback={hexenFeedback}
          setHexenFeedback={setHexenFeedback}
          onClose={() => onSetActiveModal(null)}
          onAddLog={onAddLog}
          onTriggerVoidPortal={onTriggerVoidPortal}
        />
      )}

      {activeModal === 'saves' && (
        <SavesModal
          worldSeed={world.seed}
          saveSlots={saveSlots}
          onSaveSlot={onSaveSlot}
          onLoadSlot={onLoadSlot}
          onDeleteSlot={onDeleteSlot}
          onClose={() => onSetActiveModal(null)}
        />
      )}

      {activeModal === 'guide' && (
        <GuideModal
          guideTab={guideTab}
          setGuideTab={setGuideTab}
          onClose={() => onSetActiveModal(null)}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          world={world}
          playerPos={playerPos}
          audioSettings={audioSettings}
          setAudioSettings={setAudioSettings}
          setMuted={setMuted}
          confirmReturnTitle={confirmReturnTitle}
          setConfirmReturnTitle={setConfirmReturnTitle}
          onOpenSaves={() => onSetActiveModal('saves')}
          onReturnToTitle={onReturnToTitle}
          onClose={() => onSetActiveModal(null)}
        />
      )}
    </>
  );
}

export default function App() {
  const [screen, setScreen] = useState<ScreenMode>('title');
  const [seedInput, setSeedInput] = useState<string>(CONFIG.DEFAULT_SEED);
  const [characterNameInput, setCharacterNameInput] = useState<string>(DEFAULT_CLASS_NAME);
  const [selectedClassId, setSelectedClassId] = useState<string>(DEFAULT_CLASS_ID);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyMode>('normal');
  const [world, setWorld] = useState<WorldMapState>(() => generateWorld(CONFIG.DEFAULT_SEED));
  const [player, setPlayer] = useState<PlayerState>(() => createInitialPlayer(DEFAULT_CLASS_ID));
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 3, y: 9 });
  const hungerStepAccumRef = useRef<number>(0);

  // Active combat enemy reference & standalone CombatEngine Manager
  const combatEngineRef = useRef<CombatEngine>(new CombatEngine());
  const [activeEnemyUid, setActiveEnemyUid] = useState<string | null>(null);
  const activeEnemyUidRef = useRef<string | null>(null);
  activeEnemyUidRef.current = activeEnemyUid;
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const [selectedLimbId, setSelectedLimbId] = useState<string>('torso');
  const selectedLimbIdRef = useRef<string>('torso');
  selectedLimbIdRef.current = selectedLimbId;
  const syncSelectedLimbId = useCallback((limbId: string) => {
    selectedLimbIdRef.current = limbId;
    setSelectedLimbId(limbId);
  }, []);
  const [combatMenuMode, setCombatMenuMode] = useState<CombatMenuMode>('main');
  const [activeActorIdx, setActiveActorIdx] = useState<number>(0);
  const activeActorIdxRef = useRef<number>(0);
  activeActorIdxRef.current = activeActorIdx;
  const syncActiveActorIdx = useCallback((actorIdx: number) => {
    activeActorIdxRef.current = actorIdx;
    setActiveActorIdx(actorIdx);
  }, []);
  const [combatFocusPhase, setCombatFocusPhase] = useState<
    'action' | 'skills_menu' | 'items_menu'
  >('action');
  const [combatActionCursor, setCombatActionCursor] = useState<number>(0);
  const [combatSubCursor, setCombatSubCursor] = useState<number>(0);
  const [pendingAction, setPendingAction] = useState<'ATTACK' | 'SKILL' | null>(null);
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
  const [combatNotice, setCombatNotice] = useState<CombatStageNotice | null>(null);
  const [screenShakeMode, setScreenShakeMode] = useState<'none' | 'normal' | 'heavy'>('none');
  const [isResolvingTurn, setIsResolvingTurn] = useState<boolean>(false);
  const isResolvingTurnRef = useRef<boolean>(false);
  const [portraitErrorMap, setPortraitErrorMap] = useState<Record<string, boolean>>({});
  const portraitErrorRef = useRef<Record<string, boolean>>({});
  const combatAbortRef = useRef<number>(0);
  const vfxTimerRef = useRef<number | null>(null);
  const combatNoticeTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);

  const markPortraitError = useCallback((url: string) => {
    if (!url || portraitErrorRef.current[url]) return;
    portraitErrorRef.current = { ...portraitErrorRef.current, [url]: true };
    setPortraitErrorMap((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  }, []);

  const triggerCombatNotice = useCallback((text: string, tone: 'miss' | 'evade') => {
    if (combatNoticeTimerRef.current) window.clearTimeout(combatNoticeTimerRef.current);
    setCombatNotice({
      key: Date.now() + Math.floor(Math.random() * 1000),
      text: text.replace(/^\[HỤT ĐÒN\]\s*/i, ''),
      tone,
    });
    combatNoticeTimerRef.current = window.setTimeout(() => {
      setCombatNotice(null);
      combatNoticeTimerRef.current = null;
    }, 1500);
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
        }, COMBAT_TIMING_MS.VFX_CLEAR);
      }
      if (audioSettings.screenShakeEnabled) {
        if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
        setScreenShakeMode(isHeavy ? 'heavy' : 'normal');
        shakeTimerRef.current = window.setTimeout(() => {
          setScreenShakeMode('none');
          shakeTimerRef.current = null;
        }, isHeavy ? COMBAT_TIMING_MS.SHAKE_HEAVY : COMBAT_TIMING_MS.SHAKE_NORMAL);
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
  const [introStepOutcome, setIntroStepOutcome] = useState<{
    choiceTitle: string;
    flavorText: string;
    effectText: string;
    stepIdx: 0 | 1 | 2;
  } | null>(null);
  const [riftElixirCollected, setRiftElixirCollected] = useState<boolean>(false);
  const [hexenFeedback, setHexenFeedback] = useState<string | null>(null);
  const [hexenTab, setHexenTab] = useState<'skills' | 'rituals'>('skills');
  const [selectedHexenSkillId, setSelectedHexenSkillId] = useState<string | null>(null);

  // Modals & Equipment UI
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [invTab, setInvTab] = useState<'equip' | 'items' | 'alchemy' | 'saw'>('equip');
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
    return () => {
      combatAbortRef.current += 1;
      if (vfxTimerRef.current) {
        window.clearTimeout(vfxTimerRef.current);
      }
      if (combatNoticeTimerRef.current) {
        window.clearTimeout(combatNoticeTimerRef.current);
      }
      if (shakeTimerRef.current) {
        window.clearTimeout(shakeTimerRef.current);
      }
    };
  }, []);
  const [selectedEquipSlot, setSelectedEquipSlot] = useState<EquipSlotKey>('weapon');
  const [previewItemId, setPreviewItemId] = useState<string>('broad_iron_sword');
  const [selectedLoreBookId, setSelectedLoreBookId] = useState<string>(DEFAULT_BOOK_ID);
  const [loreModalTab, setLoreModalTab] = useState<'books' | 'destiny'>('books');

  // 3D Silver Coin Toss Inline Overlay & Shift Key 2-Coin / Combat Fast-Forward State
  const [coinToss, setCoinToss] = useState<CoinTossState | null>(null);
  const [coinCursorSide, setCoinCursorSide] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [shiftHeld, setShiftHeld] = useState<boolean>(false);
  const shiftHeldRef = useRef<boolean>(false);
  const isTabHiddenRef = useRef<boolean>(
    typeof document !== 'undefined' ? document.hidden : false
  );
  const torchLowWarnedRef = useRef<boolean>(false);

  // Smuggler Haggle state (per-item negotiated prices & refusal flags)
  const [smugglerPrices, setSmugglerPrices] = useState<
    Record<string, { price: number; haggled?: boolean; refused?: boolean }>
  >({});
  const smugglerPricesRef = useRef(smugglerPrices);
  useEffect(() => {
    smugglerPricesRef.current = smugglerPrices;
  }, [smugglerPrices]);

  // Ending info
  const [endingInfo, setEndingInfo] = useState<{
    id: string;
    title: string;
    subtitle: string;
    epilogue: string;
    endingBannerLabel?: string;
    isPersonal?: boolean;
  } | null>(null);

  const [narrativeLogs, setNarrativeLogs] = useState<string[]>(INITIAL_NARRATIVE_LOGS);
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
  playerRef.current = player;
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
  const [titleSettingsOpen, setTitleSettingsOpen] = useState<boolean>(false);
  const [titleStep, setTitleStep] = useState<'menu' | 'char_select'>('menu');
  const [showSkipProloguePrompt, setShowSkipProloguePrompt] = useState<boolean>(false);
  const [interactionMenu, setInteractionMenu] = useState<InteractionPromptState | null>(null);
  const [logOverlayVisible, setLogOverlayVisible] = useState<boolean>(false);
  const [guideTab, setGuideTab] = useState<'lore' | 'move' | 'combat' | 'survival'>('lore');
  const [areaBannerText, setAreaBannerText] = useState<string>('Ngoại Vi Đại Giáo Đường Goethe');
  const [areaBannerKey, setAreaBannerKey] = useState<number>(1);

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
      return [msg, ...prev.slice(0, EXPLORATION_CONSTANTS.MAX_NARRATIVE_LOGS)];
    });
  }, []);

  // Track Shift key hold for 2-coin toss & combat fast-forward + Alt-Tab Auto-Pause
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
      if (e.key === 'Shift') {
        shiftHeldRef.current = true;
        setShiftHeld(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftHeldRef.current = false;
        setShiftHeld(false);
      }
    };
    const onBlur = () => {
      shiftHeldRef.current = false;
      setShiftHeld(false);
    };
    const onVisibilityChange = () => {
      const hidden = document.hidden;
      isTabHiddenRef.current = hidden;
      sfx.setTabHidden(hidden);
      if (hidden) {
        shiftHeldRef.current = false;
        setShiftHeld(false);
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
    }, EXPLORATION_CONSTANTS.ANIM_TICK_MS);
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
      const panicking = isPlayerPanicking(playerRef.current);
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
          const rng = new SeededRNG(`${worldRef.current.seed}_panic_coin_${Date.now()}`);
          const won = rng.chance(COIN_TOSS_BALANCING.PANIC_WIN_CHANCE);
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
        }, COMBAT_TIMING_MS.COIN_FLIP_RESOLVE);
        return;
      }

      setCoinCursorSide('HEADS');
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
    []
  );

  const handleChooseCoinSide = useCallback(
    (side: 'HEADS' | 'TAILS', tossTwoWithShift: boolean = false) => {
      if (!coinToss || coinToss.flipping || coinToss.resultSide) return;
      const latestPlayer = playerRef.current;
      const canUseLuckyCoin = tossTwoWithShift && (latestPlayer.inventory.lucky_coin || 0) > 0;
      if (canUseLuckyCoin) {
        setPlayer((prev) => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            lucky_coin: Math.max(0, (prev.inventory.lucky_coin || 0) - 1),
          },
        }));
      }
      sfx.playSfx('coin_flip');
      setCoinToss({
        ...coinToss,
        chosenSide: side,
        flipping: true,
        useTwoCoinsShift: canUseLuckyCoin,
      });

      setTimeout(() => {
        sfx.playSfx('coin_land');
        const currentPlayer = playerRef.current;
        const rng = new SeededRNG(`${worldRef.current.seed}_coin_${Date.now()}`);
        const computed = getComputedPlayerStats(currentPlayer);
        const hasClawBoost =
          currentPlayer.equippedAccessory === 'void_beast_claw' ||
          GEAR_ITEMS[currentPlayer.equippedAccessory || '']?.coinTossBoost;
        const winChance = Math.min(
          COIN_TOSS_BALANCING.MAX_WIN_CHANCE,
          COIN_TOSS_BALANCING.BASE_WIN_CHANCE +
            (computed.luck - 10) * 0.01 +
            (hasClawBoost ? COIN_TOSS_BALANCING.CLAW_ACCESSORY_BONUS : 0)
        );

        const win1 = rng.chance(winChance);
        const landed1: 'HEADS' | 'TAILS' = win1 ? side : side === 'HEADS' ? 'TAILS' : 'HEADS';

        let win2 = false;
        let landed2: 'HEADS' | 'TAILS' | null = null;
        let tier: CoinOutcomeTier = win1 ? 'win' : 'lose';
        let totalWon = win1;
        let text = landed1 === 'HEADS' ? 'Mặt Ngửa' : 'Mặt Sấp';

        if (canUseLuckyCoin) {
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
      }, COMBAT_TIMING_MS.COIN_FLIP_RESOLVE);
    },
    [coinToss]
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
    const prefix = SEED_PREFIXES[Math.floor(Math.random() * SEED_PREFIXES.length)] || 'VAELIS';
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${suffix}`;
  }, []);

  const generateRandomCharacterName = useCallback((): string => {
    return CHARACTER_NAMES[Math.floor(Math.random() * CHARACTER_NAMES.length)] || 'Vaelen';
  }, []);

  // Start new game -> enters 3-Frame Prologue first
  const enterPrologue = useCallback(
    (customSeed?: string, customClassId?: string, customDifficulty?: DifficultyMode) => {
      const finalSeed = customSeed?.trim() || generateRandomSeed();
      const finalClass = customClassId ?? selectedClassId;
      const finalDifficulty = customDifficulty ?? selectedDifficulty;
      const newWorld = generateWorld(finalSeed);
      const startRoom = newWorld.rooms[newWorld.currentRoomId];
      const newPlayer = createInitialPlayer(finalClass, characterNameInput, finalDifficulty);

      setSeedInput(finalSeed);
      setWorld(newWorld);
      setPlayer(newPlayer);
      setPlayerPos({ x: startRoom.spawnX, y: startRoom.spawnY });
      activeEnemyUidRef.current = null;
      setActiveEnemyUid(null);
      setEndingInfo(null);
      setActiveModal(null);
      setInvFeedback(null);
      setHexenFeedback(null);
      setPrologueFrame(0);
      setBackstoryChosen(false);
      setIntroStepIdx(0);
      setIntroStepOutcome(null);
      setRiftElixirCollected(false);
      setPreviewItemId(newPlayer.equippedWeapon);
      setAreaBannerText(startRoom.name);
      setAreaBannerKey((k) => k + 1);
      torchLowWarnedRef.current = false;
      hungerStepAccumRef.current = 0;
      setSmugglerPrices({});
      setTrailCoords(createDefaultTrailCoords(startRoom.spawnX, startRoom.spawnY));
      setSelectedInvMemberIdx(0);
      setShowSkipProloguePrompt(false);
      setScreen('prologue');
    },
    [selectedClassId, selectedDifficulty, characterNameInput, generateRandomSeed]
  );

  // Skip prologue directly from Character Select -> auto-apply default intro loadout & enter F2_EXTERIOR
  const startDirectIntoExterior = useCallback(() => {
    const finalSeed = generateRandomSeed();
    const newWorld = generateWorld(finalSeed);
    const startRoom = newWorld.rooms[newWorld.currentRoomId];
    const newPlayer = createInitialPlayer(selectedClassId, characterNameInput, selectedDifficulty);
    const loadoutRes = applyDefaultIntroLoadoutForRemainingSteps(newPlayer, 0);

    setSeedInput(finalSeed);
    setWorld(newWorld);
    setPlayer(newPlayer);
    setPlayerPos({ x: startRoom.spawnX, y: startRoom.spawnY });
    activeEnemyUidRef.current = null;
    setActiveEnemyUid(null);
    setEndingInfo(null);
    setActiveModal(null);
    setInvFeedback(null);
    setHexenFeedback(null);
    setPrologueFrame(2);
    setBackstoryChosen(true);
    setIntroStepIdx(2);
    setIntroStepOutcome(null);
    setRiftElixirCollected(false);
    setPreviewItemId(newPlayer.equippedWeapon);
    setAreaBannerText(startRoom.name);
    setAreaBannerKey((k) => k + 1);
    torchLowWarnedRef.current = false;
    hungerStepAccumRef.current = 0;
    setSmugglerPrices({});
    setTrailCoords(createDefaultTrailCoords(startRoom.spawnX, startRoom.spawnY));
    setSelectedInvMemberIdx(0);
    setShowSkipProloguePrompt(false);

    isInputLockedRef.current = false;
    setIsInputLocked(false);
    setScreen('playing');
    setNarrativeLogs([
      `Bạn đứng trước Cổng Sắt Răng Cưa tại ${startRoom.name}.`,
      ...(loadoutRes.summary ? [loadoutRes.summary] : []),
      CLASS_OPENING_LORE[newPlayer.classId] || startRoom.sensoryLine,
      startRoom.sensoryLine,
    ]);
  }, [selectedClassId, selectedDifficulty, characterNameInput, generateRandomSeed]);

  const finishPrologueAndPlay = useCallback(
    (alreadyCompletedBackstory = false) => {
      const startRoom = world.rooms[world.currentRoomId];
      let starterPackSummary: string | null = null;
      const doneBackstory = alreadyCompletedBackstory || backstoryChosen;
      if (!doneBackstory) {
        const nextRemainingStep = introStepOutcome ? introStepOutcome.stepIdx + 1 : introStepIdx;
        if (nextRemainingStep <= 2) {
          const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
          const res = applyDefaultIntroLoadoutForRemainingSteps(pCopy, nextRemainingStep);
          setPlayer(pCopy);
          setPreviewItemId(pCopy.equippedWeapon);
          starterPackSummary = res.summary;
        }
        setBackstoryChosen(true);
      }
      setIntroStepOutcome(null);
      isInputLockedRef.current = false;
      setIsInputLocked(false);
      setScreen('playing');
      setNarrativeLogs([
        `Bạn đứng trước Cổng Sắt Răng Cưa tại ${startRoom.name}.`,
        ...(starterPackSummary ? [starterPackSummary] : []),
        CLASS_OPENING_LORE[player.classId] || startRoom.sensoryLine,
        startRoom.sensoryLine,
      ]);
    },
    [world, player, backstoryChosen, introStepIdx, introStepOutcome]
  );

  const confirmIntroOutcome = useCallback(() => {
    if (!introStepOutcome) return;
    sfx.playSfx('ui_confirm');
    const finishedStep = introStepOutcome.stepIdx;
    setIntroStepOutcome(null);
    if (finishedStep < 2) {
      setIntroStepIdx((finishedStep + 1) as 0 | 1 | 2);
    } else {
      setBackstoryChosen(true);
      finishPrologueAndPlay(true);
    }
  }, [introStepOutcome, finishPrologueAndPlay]);

  // URL ?autostart=1 support for automated testing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const seedParam = params.get('seed') || CONFIG.DEFAULT_SEED;
      const newWorld = generateWorld(seedParam);
      const startRoom = newWorld.rooms[newWorld.currentRoomId];
      const newPlayer = createInitialPlayer(DEFAULT_CLASS_ID);
      applyDefaultIntroLoadoutForRemainingSteps(newPlayer, 0);
      setWorld(newWorld);
      setPlayer(newPlayer);
      setPreviewItemId(newPlayer.equippedWeapon);
      setBackstoryChosen(true);
      setPlayerPos({ x: startRoom.spawnX, y: startRoom.spawnY });
      setAreaBannerText(startRoom.name);
      setAreaBannerKey((k) => k + 1);
      torchLowWarnedRef.current = false;
      setSmugglerPrices({});
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
    addLog(`Đã khắc ấn ký lưu giữ hành trình vào trang ký ức thứ ${slotIdx + 1}.`);
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
    const restoredDifficulty: DifficultyMode =
      data.player.difficulty === 'easy' ? 'easy' : 'normal';
    const restoredPlayer: PlayerState = {
      ...data.player,
      difficulty: restoredDifficulty,
      corruptionWarningLogged: Boolean(data.player.corruptionWarningLogged),
      usedAltarKeys: Array.isArray(data.player.usedAltarKeys)
        ? [...data.player.usedAltarKeys]
        : [],
      unlockedRecipes: Array.isArray(data.player.unlockedRecipes)
        ? [...data.player.unlockedRecipes]
        : [],
      inventory: {
        ...data.player.inventory,
        energy_stone: data.player.inventory?.energy_stone ?? data.player.energyStones ?? 0,
        silver_coin: data.player.inventory?.silver_coin ?? data.player.silverCoins ?? 0,
      },
    };
    const f3RiftRoom = restoredWorld.rooms.F3_R3;
    let restoredRiftElixirCollected = false;
    if (f3RiftRoom) {
      for (let ry = 0; ry < f3RiftRoom.grid.length; ry++) {
        for (let rx = 0; rx < (f3RiftRoom.grid[ry]?.length || 0); rx++) {
          if (
            f3RiftRoom.grid[ry][rx] === TILE.VOID_RIFT &&
            f3RiftRoom.lootedCoords.includes(`${rx},${ry}`)
          ) {
            restoredRiftElixirCollected = true;
          }
        }
      }
    }
    setWorld(restoredWorld);
    setPlayer(restoredPlayer);
    setSelectedDifficulty(restoredDifficulty);
    setPlayerPos(spawnPos);
    setSeedInput(restoredSeed);
    setRiftElixirCollected(restoredRiftElixirCollected);
    setAreaBannerText(restoredRoom?.name || 'Ngoại Vi Đại Giáo Đường Goethe');
    setAreaBannerKey((k) => k + 1);
    torchLowWarnedRef.current = false;
    hungerStepAccumRef.current = 0;
    setSmugglerPrices({});
    setTrailCoords(createDefaultTrailCoords(spawnPos.x, spawnPos.y));
    setSelectedInvMemberIdx(0);
    setPreviewItemId(restoredPlayer.equippedWeapon || '');
    setInteractionMenu(null);
    setCoinToss(null);
    setLogOverlayVisible(false);
    activeEnemyUidRef.current = null;
    setActiveEnemyUid(null);
    setEndingInfo(null);
    setActiveModal(null);
    setTitleSaveModalOpen(false);
    isInputLockedRef.current = false;
    setIsInputLocked(false);
    setScreen('playing');
    addLog(`Ký ức từ trang thứ ${slotIdx + 1} đã được đánh thức giữa sương mù.`);
  };

  const deleteSaveSlot = (slotIdx: number) => {
    localStorage.removeItem(`${CONFIG.SAVE_KEY_PREFIX}${slotIdx}`);
    refreshSaveSlots();
  };

  const currentRoom: RoomData =
    world.rooms[world.currentRoomId] || Object.values(world.rooms)[0];
  const activeCombatEnemy: MapEnemyInstance | undefined = currentRoom?.enemies.find(
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
      activeEnemyUidRef.current = enemyInst.uid;
      setActiveEnemyUid(enemyInst.uid);
      const defaultLimb =
        enemyInst.limbs.find(
          (l) => l.isWeaponArm && l.hp > 0 && canTargetEnemyLimb(enemyInst, tpl, l.id).allowed
        )?.id || resolveNearestValidLimbId(enemyInst, tpl);
      (document.activeElement as HTMLElement | null)?.blur?.();
      syncSelectedLimbId(defaultLimb);
      setCombatMenuMode('main');
      syncActiveActorIdx(0);
      setCombatFocusPhase('action');
      setCombatActionCursor(0);
      setCombatSubCursor(0);
      setPendingAction(null);
      setPendingSkillId(null);
      combatEngineRef.current.resetStageEffects();

      const baseLogs = [
        `CHẠM TRÁN: ${enemyInst.customName || tpl.name}!`,
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
          `BỊ PHỤC KÍCH TRONG GIẤC NGỦ! ${enemyInst.customName || tpl.name} ra đòn trước!`,
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
          ? `Bị [${enemyInst.customName || tpl.name}] tập kích ngay khi đang ngủ!`
          : `Giao chiến với ${enemyInst.customName || tpl.name}!`
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

  // Real-Time 1s Exploration Loop: Dynamic Torchlight Burn + 30s Sanity Decay (+50% faster in pitch darkness)
  useEffect(() => {
    if (screen !== 'playing') {
      sanitySecondsRef.current = 0;
      return;
    }
    const timer = window.setInterval(() => {
      if (isTabHiddenRef.current || activeModal || interactionMenu || coinToss || logOverlayVisible) return;
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

      // Dynamic Torchlight depletion inside dark dungeon interiors (paused in Exterior & Safe Zones)
      let torchDepletedNow = false;
      if (!room.isExterior && !inSafeZone) {
        const curTorch = playerRef.current.torchTimer ?? EXPLORATION_CONSTANTS.TORCH_DURATION_SEC;
        const maxTorch = Math.max(
          1,
          playerRef.current.torchMaxTimer ?? EXPLORATION_CONSTANTS.TORCH_DURATION_SEC
        );
        const torchDecay =
          playerRef.current.difficulty === 'easy'
            ? EXPLORATION_CONSTANTS.EASY_TORCH_DECAY
            : EXPLORATION_CONSTANTS.NORMAL_TORCH_DECAY;
        if (curTorch > 0) {
          const nextTorch = Math.max(0, curTorch - torchDecay);
          const prevRatio = curTorch / maxTorch;
          const nextRatio = nextTorch / maxTorch;
          if (
            prevRatio >= EXPLORATION_CONSTANTS.TORCH_LOW_RATIO &&
            nextRatio < EXPLORATION_CONSTANTS.TORCH_LOW_RATIO &&
            !torchLowWarnedRef.current
          ) {
            torchLowWarnedRef.current = true;
            addLog('Bóng tối xung quanh dường như đang bao trùm lấy ngươi...');
          }
          if (nextTorch === 0) {
            torchDepletedNow = true;
            addLog('Ngọn lửa đã tắt hẳn! Bóng tối nuốt chửng tầm nhìn — Lý Trí tụt nhanh hơn +50%!');
          }
          setPlayer((prev) => ({
            ...prev,
            torchTimer: Math.max(
              0,
              (prev.torchTimer ?? EXPLORATION_CONSTANTS.TORCH_DURATION_SEC) -
                (prev.difficulty === 'easy'
                  ? EXPLORATION_CONSTANTS.EASY_TORCH_DECAY
                  : EXPLORATION_CONSTANTS.NORMAL_TORCH_DECAY)
            ),
          }));
        } else {
          torchDepletedNow = true;
        }
      }

      if (inSafeZone) {
        sanitySecondsRef.current = 0;
        return;
      }

      const sanityMult = getAmputationSanityMultiplier(playerRef.current);
      const darknessMult =
        !room.isExterior &&
        (torchDepletedNow ||
          (playerRef.current.torchTimer ?? EXPLORATION_CONSTANTS.TORCH_DURATION_SEC) <= 0)
          ? EXPLORATION_CONSTANTS.DARKNESS_SANITY_MULT
          : 1;
      sanitySecondsRef.current += sanityMult * darknessMult;
      if (sanitySecondsRef.current >= EXPLORATION_CONSTANTS.SANITY_DECAY_SECONDS) {
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
          darknessMult > 1
            ? 'Bóng tối đặc quánh không ánh đuốc đang siết chặt tâm trí — Lý Trí sụt giảm nhanh hơn (+50%)!'
            : sanityMult > 1
            ? 'Cơ thể tàn phế mất chi khiến nỗi tuyệt vọng trỗi dậy — Lý Trí bị bóng tối bào mòn nhanh hơn (+50%)!'
            : 'Bóng tối đặc quánh và sự tĩnh lặng chết chóc đang bào mòn Lý Trí...'
        );
      }
    }, EXPLORATION_CONSTANTS.SANITY_TICK_MS);
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
      setCombatNotice(null);
      if (combatNoticeTimerRef.current) {
        window.clearTimeout(combatNoticeTimerRef.current);
        combatNoticeTimerRef.current = null;
      }
      setScreenShakeMode('none');
      const roomId = worldRef.current.currentRoomId;
      if (opts?.defeatedEnemyUid) {
        setWorld((prev) => {
          const curRoom = prev.rooms[roomId];
          if (!curRoom) return prev;
          const defeatedInst = curRoom.enemies.find((e) => e.uid === opts.defeatedEnemyUid);
          const remainingEnemies = curRoom.enemies.filter((e) => e.uid !== opts.defeatedEnemyUid);
          const existingCorpses = curRoom.corpses || [];
          const isVaelisDefeat = defeatedInst?.templateId === 'demon_lord_vaelis';
          let nextGrid = curRoom.grid;
          if (isVaelisDefeat && defeatedInst) {
            nextGrid = curRoom.grid.map((row) => [...row]);
            if (nextGrid[defeatedInst.y]?.[defeatedInst.x] !== undefined) {
              nextGrid[defeatedInst.y][defeatedInst.x] = TILE.BLOOD_THRONE;
            }
          }
          const nextCorpses =
            defeatedInst && !isVaelisDefeat && !existingCorpses.some((c) => c.uid === defeatedInst.uid)
              ? [...existingCorpses, { ...defeatedInst, defeated: true }]
              : existingCorpses;
          return {
            ...prev,
            rooms: {
              ...prev.rooms,
              [roomId]: {
                ...curRoom,
                grid: nextGrid,
                enemies: remainingEnemies,
                corpses: nextCorpses,
              },
            },
          };
        });
      }
      isInputLockedRef.current = false;
      setIsInputLocked(false);
      activeEnemyUidRef.current = null;
      setActiveEnemyUid(null);
      syncActiveActorIdx(0);
      setCombatMenuMode('main');
      setCombatFocusPhase('action');
      setPendingAction(null);
      setPendingSkillId(null);
      setScreen(opts?.nextScreen || 'playing');
    },
    [syncActiveActorIdx]
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
      setTrailCoords(createDefaultTrailCoords(nextX, nextY));
      setAreaBannerText(nextRoom.name);
      setAreaBannerKey((k) => k + 1);
      setInteractionMenu(null);
      setLogOverlayVisible(false);
      addLog(`Bước vào ${nextRoom.name}. ${nextRoom.sensoryLine}`);
    },
    [world.rooms, addLog]
  );

  // Use Brown Vial on Cracked Wall (Shortcut / Secret Chamber)
  const useBrownVialOnMap = useCallback((): boolean => {
    if ((player.inventory.brown_vial || 0) <= 0) {
      const msg = 'Trong hành trang không còn Lọ Nâu nào.';
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
        'Quanh đây chưa thấy bức tường đá rạn nứt nào để châm nổ Lọ Nâu.';
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
    const okMsg = 'ẦM! Lọ Nâu nổ tung xé toạc bức tường nứt, hé lộ khoang Mật Thất ẩn giấu.';
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
          fallen_knight: 'KẺ GÁC MỘ VÔ DANH GARRICK',
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
            label: `Chiêu mộ ${titleMap[allyKey]} vào Tổ Đội`,
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
              addLog(`[${ally.name}] đã gia nhập Tổ Đội!`);
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
            label: 'Trao thảo dược cứu chữa',
            onSelect: () => {
              if (!canHeal) {
                openNpcRpgDialogue(
                  'npc_priest',
                  '“Khụ khụ... Ngươi chưa có Thảo Dược Xanh hay Thuốc Giải Độc nào trong hành trang cả...”'
                );
                return;
              }
              const useWhite = (player.inventory.green_herb || 0) <= 0;
              const secondBook = CONFIG.BOOKS[1];
              const secondBookId = secondBook?.id;
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
                if (secondBookId && !next.readBookIds.includes(secondBookId)) {
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
                `Giáo Sĩ Mù run rẩy trao hai viên Đá Linh Hồn Rỗng cùng [${secondBook?.title || 'Sổ Kiểm Kê Tế Lễ'}]${
                  learnedHolyLight ? ', thì thầm truyền lại [Ánh Sáng Thánh Mẫu]' : ''
                }.${gainedHolyAff ? ' Một hơi ấm dịu nhẹ khẽ chạm vào trái tim bạn.' : ''}`
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
              label: 'Ban cho cậu bé cái chết thanh thản',
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
                  `Bạn nhẹ nhàng tháo gỡ các ống đồng lạnh lẽo. Hơi thở yếu ớt tắt dần trong bình yên, để lại [Mảnh Linh Hồn Thuần Khiết] ấm nóng trong lòng bàn tay${
                    gainedHoly ? ' cùng một luồng sáng dịu khẽ xoa dịu tâm hồn.' : '.'
                  }`
                );
                setLogOverlayVisible(true);
              },
            },
            {
              label: 'Rút ống dẫn vàng trên tế đàn',
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
                  'Dòng máu vàng đặc quánh rút cạn khỏi tế đàn vào hai bình thủy tinh cùng hai viên Đá Linh Hồn Rỗng. Cơn ớn lạnh tà dị chạy dọc sống lưng — tiếng thì thầm của Thánh Mẫu lặng bặt.'
                );
                setLogOverlayVisible(true);
              },
            }
          );
        } else if (canNecroChild12) {
          choices.push({
            label: 'Niệm Chiêu Hồn Thuật lên thi thể',
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
              label: 'Băng bó vết thương và nhận di vật',
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
                addLog('Nhận [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis] từ Kỵ Sĩ Gãy Chân Roland.');
                if (updatedKnightReadOk) {
                  setInteractionMenu({
                    title: 'LỜI THỀ KỴ ĐOÀN',
                    description:
                      'Bạn đã đọc qua các trang Nhật Ký Viễn Chinh, hiểu trọn bi kịch của Vaelis và nắm trong tay [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis]. Bạn muốn ở lại dựng bia mộ cho đồng đội hay tiếp tục tiến xuống đáy vực?',
                    selectedIndex: 0,
                    choices: [
                      {
                        label: 'Ở lại Thung Lũng dựng bia mộ cho Kỵ Đoàn',
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
                        label: 'Tiếp tục tiến xuống đáy vực',
                        onSelect: () => {
                          setInteractionMenu(null);
                          addLog('Bạn cất [Thẻ Bài Kỵ Đoàn], quyết tâm tiến về Vết Rách Tầng 3.');
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
              label: 'Ban cho anh ta cái chết êm ái',
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
                  'Nhát kiếm chấm dứt cơn đau của người kỵ sĩ. Bạn lặng lẽ nhặt lấy [Thẻ Bài Kỵ Đoàn & Nhẫn Vaelis] cùng túi bạc nặng trĩu — bàn tay vấy máu bỗng lạnh buốt lạ thường.'
                );
                setLogOverlayVisible(true);
              },
            }
          );
        }
        if (player.questFlags?.brokenKnightResolved && !rolandInParty && player.npcLifecycle?.npc_broken_knight !== 'dead' && player.party.length < 3) {
          choices.push({
            label: 'Đỡ Roland đứng dậy & Chiêu mộ vào Tổ Đội',
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
              addLog(`[${roland.name}] chống kiếm đứng dậy và gia nhập Tổ Đội!`);
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
            ? '“...” (Đôi mắt trên chiếc đầu đeo thắt lưng gã khẽ nheo lại khi nhận ra dấu ấn kẻ săn di vật vùng biên. Gã giơ búa tạ chỉ vào chảo máu quỷ đang sôi sục).'
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
                ? `✓ [${w.name}] đã qua Huyết Rèn`
                : `Nhờ Huyết Rèn [${w.name}]`,
              onSelect: () => {
                const latest = playerRef.current;
                if (latest.bloodForgedWeapons?.includes(wId)) {
                  openNpcRpgDialogue(
                    'npc_smith',
                    `“Thanh [${w.name}] đã uống no máu quỷ trong lò rèn rồi... Hãy chọn vũ khí khác.”`
                  );
                  return;
                }
                const pCopy: PlayerState = JSON.parse(JSON.stringify(latest));
                const corBefore = pCopy.corruption;
                const wasBannedBefore = isHolyMotherBanned(pCopy);
                const res = bloodForgeWeapon(pCopy, wId);
                if (pCopy.classId === 'night_hunter' && res.success) {
                  pCopy.corruption = Math.min(100, corBefore + 8);
                  if (!wasBannedBefore && pCopy.corruption < 25) {
                    pCopy.holyMotherBanned = false;
                    pCopy.holyMagicLocked = false;
                  }
                  syncCorruptionHolyBan(pCopy);
                }
                const corWarn = checkCorruptionDiegeticWarning(pCopy);
                pCopy.questFlags.smithUsed = true;
                setPlayer(() => pCopy);
                setInteractionMenu(null);
                addLog(res.message);
                if (corWarn) addLog(corWarn);
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
              label: 'Trao lại chiếc nhẫn đính hôn',
              onSelect: () => {
                if (!hasRing) {
                  openNpcRpgDialogue(
                    'npc_glass_lady',
                    '“Ngươi vẫn chưa tìm thấy chiếc nhẫn đính hôn ấy ư? Có lẽ một người cận vệ đang giữ nó ở tầng dưới...”'
                  );
                  return;
                }
                const keyBookId = CONFIG.BOOKS[3]?.id;
                setPlayer((prev) => ({
                  ...prev,
                  hp: prev.maxHp,
                  mind: prev.maxMind,
                  readBookIds:
                    keyBookId && !prev.readBookIds.includes(keyBookId)
                      ? [...prev.readBookIds, keyBookId]
                      : prev.readBookIds,
                  inventory: {
                    ...prev.inventory,
                    knight_ring: Math.max(0, (prev.inventory.knight_ring || 0) - 1),
                    secret_archive_key: (prev.inventory.secret_archive_key || 0) + 1,
                  },
                  questFlags: { ...prev.questFlags, glassLadyResolved: true },
                }));
                setInteractionMenu(null);
                addLog(
                  'Quý Cô ôm chiếc nhẫn bật khóc: Một hơi ấm dịu dàng xoa dịu thương tích và tâm trí bạn, nhận [Chìa Khóa Tư Liệu Mật Goethe] cùng Hồ Sơ Tội Đồ.'
                );
                setLogOverlayVisible(true);
              },
            },
            {
              label: 'Đập vỡ lồng kính',
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
                  'Pha lê vỡ tan giữa tiếng khóc nghẹn tắt dần. Bạn gom hai viên Đá Linh Hồn Rỗng trong mảnh kính sắc, cảm thấy bóng tối âm ỉ len sâu vào huyết quản.'
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
            label: 'Lắng nghe bí thuật Giả Kim của lão',
            onSelect: () => {
              setPlayer((prev) => ({
                ...prev,
                inventory: {
                  ...prev.inventory,
                  blue_vial: (prev.inventory.blue_vial || 0) + 1,
                  recipe_book_forbidden: (prev.inventory.recipe_book_forbidden || 0) + 1,
                },
                questFlags: { ...prev.questFlags, physicianTalked: true },
              }));
              setInteractionMenu(null);
              addLog(
                'Lão Thần Y cười khàn, dúi vào tay bạn một bình [Thuốc Hồi Huyết] cùng quyển sách [Pha Chế Thuốc 3].'
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
            label: 'Lắng nghe lời giải mã cổ thư',
            onSelect: () => {
              const loreBooks = CONFIG.BOOKS.slice(0, 4)
                .map((b) => b?.id)
                .filter((id): id is string => Boolean(id));
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
                'Kẻ Chép Sử Hóa Thạch trao [Mảnh Thần Chú Tái Thiết] cùng những trang cổ thư phong ấn. Những ký tự xoắn vặn như ăn mòn một góc ký ức sâu thẳm trong đầu bạn.'
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
            `“Hề hề... Túi của ngươi hiện có ${player.silverCoins} Đồng Bạc. Kể từ khi sương mù khóa chặt Thung Lũng, đám giáo sĩ đều bỏ lại bạc trắng cả. Những món hàng quý có thể thương lượng giá cả — miễn đừng chọc giận ta!”`;
          const wares: Array<{ id: string; name: string; price: number }> = [
            { id: 'torch', name: 'Đuốc Sáng (120s Ánh Sáng)', price: 3 },
            { id: 'ritual_chalk', name: 'Phấn Khắc Ấn', price: 4 },
            { id: 'herbal_cigarette', name: 'Thuốc Quấn Thảo Mộc (+18 Lý Trí)', price: 5 },
            { id: 'dark_ale', name: 'Bia Đen Hầm Ngục (+16 Lý Trí, -12 Đói)', price: 6 },
            { id: 'aged_cheese', name: 'Phô Mai Hầm Cổ (-30 Đói, +8 Lý Trí)', price: 7 },
            { id: 'salted_meat', name: 'Thịt Muối Hun Khói (-45 Đói, +15 SL)', price: 9 },
            { id: 'abbey_wine', name: 'Rượu Vang Giáo Đường (+28 Lý Trí)', price: 11 },
            { id: 'lamp_oil', name: 'Dầu Đèn', price: 6 },
            { id: 'oil_lamp', name: 'Đèn Dầu Cổ (240s Ánh Sáng)', price: 7 },
            { id: 'poison_herb', name: 'Thảo Dược Độc', price: 7 },
            { id: 'ancient_ash', name: 'Tro Tàn Cổ', price: 8 },
            { id: 'poison_powder', name: 'Bột Độc', price: 9 },
            { id: 'white_herb', name: 'Thảo Dược Trắng (Giải Độc)', price: 9 },
            { id: 'red_vial', name: 'Lọ Đỏ', price: 10 },
            { id: 'brown_vial', name: 'Lọ Nâu', price: 12 },
            ...((player.inventory.bone_saw || 0) <= 0
              ? [{ id: 'bone_saw', name: 'Cưa Xương Rỉ Máu', price: 12 }]
              : []),
            ...(!player.unlockedWeapons.includes('butcher_cleaver')
              ? [{ id: 'butcher_cleaver', name: 'Đao Phay Đồ Tể', price: 20 }]
              : []),
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

          const completePurchase = (w: { id: string; name: string }, finalPrice: number) => {
            if (player.silverCoins < finalPrice) {
              openNpcRpgDialogue(
                'npc_smuggler',
                `“Ngươi chỉ có ${player.silverCoins} Đồng Bạc, không đủ ${finalPrice} Đồng Bạc để mua [${w.name}] đâu!”`
              );
              return;
            }
            sfx.playSfx('ui_confirm');
            setPlayer((prev) => {
              const nextSilver = Math.max(0, prev.silverCoins - finalPrice);
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
            addLog(`Đã mua [${w.name}] từ Kẻ Buôn Lậu với giá ${finalPrice} Đồng Bạc!`);
            setLogOverlayVisible(true);
          };

          const openSmugglerHaggleMenu = (
            w: { id: string; name: string; price: number },
            introOverride?: string
          ) => {
            const stateEntry = smugglerPricesRef.current[w.id];
            const curPrice = stateEntry?.price ?? w.price;
            const alreadyHaggled = Boolean(stateEntry?.haggled);
            const isRefused = Boolean(stateEntry?.refused);

            if (isRefused) {
              openNpcRpgDialogue(
                'npc_smuggler',
                `“Ta đã cất [${w.name}] vào hòm khóa rồi! Lần sau bớt làm giá kiểu đó đi!”`
              );
              return;
            }

            const runHaggle = (tactic: SmugglerHaggleTactic) => {
              const roll = Math.random();
              const outcome = evaluateSmugglerHaggle(w.id, w.name, curPrice, tactic, roll);
              const nextMap = {
                ...smugglerPricesRef.current,
                [w.id]: {
                  price: outcome.newPrice,
                  haggled: true,
                  refused: outcome.refusedItem,
                },
              };
              smugglerPricesRef.current = nextMap;
              setSmugglerPrices(nextMap);
              if (outcome.accepted) {
                sfx.playSfx('ui_confirm');
              } else if (outcome.refusedItem || outcome.newPrice > curPrice) {
                sfx.playSfx('hurt');
              }
              if (outcome.refusedItem) {
                openNpcRpgDialogue('npc_smuggler', outcome.dialogue);
              } else {
                openSmugglerHaggleMenu(w, outcome.dialogue);
              }
            };

            const haggleChoices: InteractionChoice[] = [
              {
                label: `Chốt mua [${w.name}] (${curPrice} Đồng Bạc — Đang có: ${player.silverCoins})`,
                onSelect: () => completePurchase(w, curPrice),
              },
              ...(!alreadyHaggled
                ? [
                    {
                      label: `Mặc cả nhẹ -25% (~${Math.max(2, Math.round(curPrice * 0.75))} Đồng Bạc — An toàn hơn)`,
                      onSelect: () => runHaggle('discount_25'),
                    },
                    {
                      label: `Ép giá mạnh -40% (~${Math.max(2, Math.round(curPrice * 0.6))} Bạc — Rủi ro bị từ chối/tăng giá)`,
                      onSelect: () => runHaggle('discount_40'),
                    },
                    {
                      label: 'Chất vấn nguồn gốc món hàng để dò giá',
                      onSelect: () => runHaggle('question_origin'),
                    },
                  ]
                : []),
              {
                label: '← Quay lại xem toàn bộ sạp hàng',
                onSelect: () => openNpcRpgDialogue('npc_smuggler'),
              },
            ];

            setInteractionMenu({
              title: `THƯƠNG LƯỢNG: ${w.name.toUpperCase()}`,
              description:
                introOverride ||
                `“Món [${w.name}] này giá niêm yết là ${curPrice} Đồng Bạc (Ngươi đang có ${player.silverCoins} Bạc). Ngươi định trả thẳng hay muốn mặc cả với ta?”`,
              selectedIndex: 0,
              choices: haggleChoices,
            });
          };

          const choices: InteractionChoice[] = [
            {
              label: '"Ngươi lấy những lọ thuốc và vũ khí này từ đâu?"',
              onSelect: () =>
                openNpcRpgDialogue(
                  'npc_smuggler',
                  '“Hề hề, từ những đội kỵ sĩ viễn chinh đi trước ngươi chứ đâu! Kẻ nào không biết dùng Lọ Nâu phá tường nứt hay dùng Lọ Đỏ làm mù mắt quái đều bỏ mạng cả!”'
                ),
            },
            ...wares.map((w) => {
              const entry = smugglerPricesRef.current[w.id];
              const effectivePrice = entry?.price ?? w.price;
              const isValuable = SMUGGLER_VALUABLE_IDS.has(w.id);
              const refusedTag = entry?.refused ? ' [ĐÃ CẤT HÀNG]' : '';
              const haggleTag =
                isValuable && !entry?.haggled && !entry?.refused ? ' • Có thể Mặc Cả' : '';
              return {
                label: `[${w.name}] (${effectivePrice} Bạc${haggleTag}${refusedTag})`,
                onSelect: () => {
                  if (isValuable) {
                    openSmugglerHaggleMenu(w);
                  } else {
                    completePurchase(w, effectivePrice);
                  }
                },
              };
            }),
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
            label: 'Phá xiềng xích & Chiêu mộ Kael vào Tổ Đội',
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
                'Tù Nhân Kael đã gia nhập Tổ Đội! Anh ta sẽ đi theo sau bạn và cùng chiến đấu.'
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
        return;
      }

      if (npcId === 'vaelis_climax') {
        const speech =
          customSpeech ||
          '“Ngai Vàng Máu bỏ trống đang tỏa ra hơi lạnh chết chóc. Trong tay bạn là [Lõi Khóa Hư Vô] — bạn sẽ bước lên ngai vàng, rời khỏi thung lũng hay tiếp tục tiến xuống tầng sâu?”';
        const demonicAff = player.affinities?.demonicPact || 0;
        const canSitThrone = player.corruption >= 70 || demonicAff >= 2;
        const child13AliveHere = player.party.some((a) => a.id === 'child_13' && a.hp > 0);
        const knightPersonalReady =
          player.classId === 'fallen_knight' &&
          player.corruption < 30 &&
          Boolean(player.questFlags?.vaelisTalked) &&
          player.readBookIds.length >= 3;
        const nunPersonalReady =
          player.classId === 'forsaken_nun' &&
          player.corruption < 15 &&
          Boolean(player.questFlags?.child13Rescued) &&
          child13AliveHere &&
          player.readBookIds.length >= 3;
        const hunterPersonalReady =
          player.classId === 'night_hunter' &&
          Boolean(player.questFlags?.curedPetrification);
        const hasPersonalReady = knightPersonalReady || nunPersonalReady || hunterPersonalReady;

        const choices: InteractionChoice[] = [
          {
            label: 'Bước lên Ngai Vàng Máu',
            muted: !canSitThrone,
            onSelect: () => {
              if (!canSitThrone) {
                openNpcRpgDialogue(
                  'vaelis_climax',
                  '“Ngai Vàng Máu đẩy lùi bạn trong im lặng — dòng máu trong người bạn chưa đủ sâu đậm với bóng tối để gánh lấy chiếc ngai này.”'
                );
                return;
              }
              const res = evaluateCanonEnding({
                classId: player.classId,
                corruption: player.corruption,
                demonicPactAffinity: demonicAff,
                holyMotherBanned: isHolyMotherBanned(player),
                readBookIds: player.readBookIds,
                inventory: player.inventory,
                learnedSkillIds: Object.keys(player.skillLevels),
                vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
                vaelisDefeated: true,
                curedPetrification: Boolean(player.questFlags?.curedPetrification),
                child13Rescued: Boolean(player.questFlags?.child13Rescued),
                child13InParty: child13AliveHere,
                endingAction: 'SIT_THRONE',
              });
              setInteractionMenu(null);
              setActiveModal(null);
              setEndingInfo(res);
              setScreen('ending');
            },
          },
          {
            label: hasPersonalReady
              ? knightPersonalReady
                ? 'Ở lại Thung Lũng dựng bia mộ cho Kỵ Đoàn'
                : 'Rời khỏi Thung Lũng Xương Tàn'
              : 'Rời khỏi Thung Lũng Xương Tàn',
            onSelect: () => {
              const action = knightPersonalReady
                ? 'STAY_BUILD_GRAVES'
                : nunPersonalReady || hunterPersonalReady
                ? 'ESCAPE_EXTERIOR_GATE'
                : 'LEAVE_AFTER_VAELIS';
              const res = evaluateCanonEnding({
                classId: player.classId,
                corruption: player.corruption,
                demonicPactAffinity: demonicAff,
                holyMotherBanned: isHolyMotherBanned(player),
                readBookIds: player.readBookIds,
                inventory: player.inventory,
                learnedSkillIds: Object.keys(player.skillLevels),
                vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
                vaelisDefeated: true,
                curedPetrification: Boolean(player.questFlags?.curedPetrification),
                child13Rescued: Boolean(player.questFlags?.child13Rescued),
                child13InParty: child13AliveHere,
                endingAction: action,
              });
              setInteractionMenu(null);
              setActiveModal(null);
              setEndingInfo(res);
              setScreen('ending');
            },
          },
          {
            label: 'Tiếp tục bước xuống tầng sâu',
            onSelect: () => {
              setInteractionMenu(null);
              setActiveModal(null);
              addLog(
                'Bạn nắm chặt [Lõi Khóa Hư Vô] và rời khỏi Ngai Vàng Máu để tiếp tục khám phá các tầng sâu.'
              );
              setLogOverlayVisible(true);
            },
          },
        ];

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

  // Specialized End-Game Dialogue Menu for TILE.VOID_RIFT (Lõi Khóa, Tiên Dược, Thánh Tử 13 & all Canon Endings)
  const openVoidRiftEndgameMenu = useCallback(
    (roomId: string, coordKey: string, elixirAlreadyCollected: boolean, customSpeech?: string) => {
      const closePrompt = () => {
        setInteractionMenu(null);
        setLogOverlayVisible(false);
      };

      const child13AliveAtRift = player.party.some((a) => a.id === 'child_13' && a.hp > 0);
      const demonicAff = player.affinities?.demonicPact || 0;
      const holyBanned = isHolyMotherBanned(player);

      const avail = evaluateVoidRiftRequirements({
        classId: player.classId,
        corruption: player.corruption,
        demonicPactAffinity: demonicAff,
        holyMotherBanned: holyBanned,
        readBookIds: player.readBookIds,
        inventory: player.inventory,
        vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
        vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
        curedPetrification: Boolean(player.questFlags?.curedPetrification),
        child13Rescued: Boolean(player.questFlags?.child13Rescued),
        child13InParty: child13AliveAtRift,
        riftElixirCollected: elixirAlreadyCollected,
      });

      const triggerEnding = (
        endingAction:
          | 'SIT_THRONE'
          | 'LEAVE_AFTER_VAELIS'
          | 'SACRIFICE_CHILD13_RIFT'
          | 'POUR_ELIXIR_CHILD13_RIFT'
          | 'STAY_BUILD_GRAVES'
          | 'ESCAPE_EXTERIOR_GATE',
        overrides?: { child13Rescued?: boolean; child13InParty?: boolean }
      ) => {
        const res = evaluateCanonEnding({
          classId: player.classId,
          corruption: player.corruption,
          demonicPactAffinity: demonicAff,
          holyMotherBanned: holyBanned,
          readBookIds: player.readBookIds,
          inventory: player.inventory,
          learnedSkillIds: Object.keys(player.skillLevels),
          vaelisTalked: Boolean(player.questFlags?.vaelisTalked),
          vaelisDefeated: Boolean(player.questFlags?.vaelisDefeated),
          curedPetrification: Boolean(player.questFlags?.curedPetrification),
          child13Rescued: overrides?.child13Rescued ?? Boolean(player.questFlags?.child13Rescued),
          child13InParty: overrides?.child13InParty ?? child13AliveAtRift,
          endingAction,
        });
        setInteractionMenu(null);
        setActiveModal(null);
        setEndingInfo(res);
        setScreen('ending');
      };

      const speech =
        customSpeech ||
        (elixirAlreadyCollected
          ? avail.canRescueChild13
            ? '“Trước mặt bạn là khe nứt không gian tím thẫm đang gầm rú giữa những ngôi sao chết. Bên trong chiếc lồng sắt mở hé là Thánh Tử Thứ 13 đang run rẩy chờ được giải thoát.”'
            : '“Trước mặt bạn là khe nứt không gian tím thẫm đang gầm rú giữa những ngôi sao chết. Số phận của Thung Lũng Xương Tàn và nhân loại đang đặt trọn trên bàn tay bạn.”'
          : '“Trước mặt bạn là khe nứt không gian tím thẫm đang gầm rú giữa những ngôi sao chết. Bên trong chiếc lồng sắt mở hé là Thánh Tử Thứ 13 đang run rẩy — và trên bệ đá rêu phong đặt độc nhất một bình Tiên Dược Nguyên Sơ.”');

      const choices: InteractionChoice[] = [];

      if (avail.canCollectElixir) {
        choices.push({
          label: 'Thu lấy [Tiên Dược Nguyên Sơ] trên bệ đá',
          onSelect: () => {
            sfx.playSfx('loot');
            setRiftElixirCollected(true);
            setWorld((prev) => {
              const curRoom = prev.rooms[roomId];
              if (!curRoom || curRoom.lootedCoords.includes(coordKey)) return prev;
              return {
                ...prev,
                rooms: {
                  ...prev.rooms,
                  [roomId]: {
                    ...curRoom,
                    lootedCoords: [...curRoom.lootedCoords, coordKey],
                  },
                },
              };
            });
            setPlayer((prev) => ({
              ...prev,
              inventory: {
                ...prev.inventory,
                elixir_of_ancients: (prev.inventory.elixir_of_ancients || 0) + 1,
              },
            }));
            setInteractionMenu(null);
            addLog('Bạn thu giữ bình [Tiên Dược Nguyên Sơ] duy nhất bên mép Vết Rách.');
            setLogOverlayVisible(true);
          },
        });
      }

      if (avail.canRescueChild13) {
        choices.push({
          label: 'Phá xiềng xích giải cứu Thánh Tử Thứ 13',
          onSelect: () => {
            sfx.playHealOrChime();
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
                ? 'Bạn bẻ gãy xiềng xích giải cứu Thánh Tử Thứ 13. Đứa trẻ run rẩy nép sau lưng bạn, ánh mắt hướng về Cổng Sắt Ngoại Vi.'
                : 'Hàng ngũ đồng hành đã kín chỗ; bạn phá khóa cũi sắt giải thoát cho Thánh Tử Thứ 13 ngay bên mép Vết Rách.'
            );
            if (nunReadyNow) {
              setInteractionMenu({
                title: 'THÁNH TỬ THỨ 13 ĐƯỢC GIẢI THOÁT',
                description:
                  'Bạn đã giải cứu thành công Thánh Tử Thứ 13 cùng bằng chứng về trận pháp của Giáo Hội. Bạn muốn đưa em trai rời khỏi đây ngay hay ở lại trước Vết Rách?',
                selectedIndex: 0,
                choices: [
                  {
                    label: 'Đưa Thánh Tử 13 rời khỏi Thung Lũng qua Cổng Sắt',
                    onSelect: () =>
                      triggerEnding('ESCAPE_EXTERIOR_GATE', {
                        child13Rescued: true,
                        child13InParty: updatedParty.some((a) => a.id === 'child_13' && a.hp > 0),
                      }),
                  },
                  {
                    label: 'Ở lại trước Vết Rách',
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

      // True Ending: Thánh Thụ Khai Sáng (Lõi Khóa Hư Vô + Tiên Dược Nguyên Sơ + Thánh Tử 13 + Cuộn Da Dê IX / Cổ Thư)
      choices.push({
        label: 'Tưới Tiên Dược lên Thánh Tử 13 và cắm Lõi Khóa vào Vết Rách',
        muted: !avail.trueEnding.ready,
        onSelect: () => {
          if (!avail.trueEnding.ready) {
            openVoidRiftEndgameMenu(
              roomId,
              coordKey,
              elixirAlreadyCollected,
              `“Mầm cổ thụ vẫn ngủ yên trong im lặng — nghi thức còn thiếu: ${avail.trueEnding.missing.join(', ')}.”`
            );
            return;
          }
          triggerEnding('POUR_ELIXIR_CHILD13_RIFT');
        },
      });

      // Order Ending: Kỷ Nguyên Bạch Kim (Thuần Khiết + Lõi Khóa Hư Vô + Thần Chú Tái Thiết)
      choices.push({
        label: 'Khởi động Nghi Thức Tái Thiết cùng Thánh Tử 13',
        muted: !avail.orderEnding.ready,
        onSelect: () => {
          if (!avail.orderEnding.ready) {
            openVoidRiftEndgameMenu(
              roomId,
              coordKey,
              elixirAlreadyCollected,
              `“Ánh sáng bạch kim đẩy lùi bàn tay bạn — nghi thức Trật Tự còn thiếu: ${avail.orderEnding.missing.join(', ')}.”`
            );
            return;
          }
          triggerEnding('SACRIFICE_CHILD13_RIFT');
        },
      });

      // Dark Ending: Kẻ Kế Thừa Ngai Vàng Máu
      if (avail.darkEnding.ready) {
        choices.push({
          label: 'Hiến thân làm nắp hầm mới trấn áp Vết Rách',
          onSelect: () => triggerEnding('SIT_THRONE'),
        });
      }

      // Personal S-Endings (Knight / Nun / Hunter)
      if (avail.personalEnding.ready && avail.personalEnding.action && avail.personalEnding.label) {
        const personalAction = avail.personalEnding.action;
        choices.push({
          label: avail.personalEnding.label,
          onSelect: () => triggerEnding(personalAction),
        });
      }

      // Normal Ending: Leave after defeating Vaelis
      if (avail.normalEnding.ready) {
        choices.push({
          label: 'Rời khỏi Thung Lũng Xương Tàn',
          onSelect: () => triggerEnding('LEAVE_AFTER_VAELIS'),
        });
      }

      choices.push({ label: 'Rời đi', onSelect: closePrompt });
      setInteractionMenu({
        title: 'VẾT RÁCH HƯ VÔ & THÁNH TỬ 13',
        description: speech,
        selectedIndex: 0,
        choices,
      });
    },
    [player, addLog]
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
      [TILE.BLOOD_THRONE]: 'vaelis_climax',
    };

    const canCastNecro = (player.skillLevels?.necromancy || 0) >= 1 && player.party.length < 3;
    const allCorpses = [...(room.corpses || []), ...room.enemies.filter((e) => e.defeated)];

    const openCorpsePrompt = (corpse: MapEnemyInstance) => {
      const tpl = CONFIG.ENEMIES[corpse.templateId];
      const corpseName = corpse.customName || tpl?.name || 'Quái vật';
      const corpseChoices: InteractionChoice[] = [];

      if (!corpse.corpseLooted) {
        corpseChoices.push({
          label: 'Lục soát xác',
          onSelect: () => {
            setInteractionMenu(null);
            sfx.playSfx('loot');
            const rng = new SeededRNG(`${world.seed}_corpse_loot_${corpse.uid}`);
            const lootMessages: string[] = [];

            const nextPlayer: PlayerState = JSON.parse(JSON.stringify(player));
            // Boss/Mini-Boss guaranteed drops (weapon, relic, lucky_coin) are already awarded in handleEnemyDeath.
            // Looting any corpse only grants regular secondary salvage so unique boss loot is never duplicated.
            const dropRoll = rng.next();
            const normalWeaponPool = getEligibleNormalCorpseWeaponIds(
              nextPlayer.unlockedWeapons
            );
            const lightGearPool = [
              'ashen_hood',
              'stalkers_cap',
              'mail_coif',
              'boiled_cuirass',
            ].filter((g) => !nextPlayer.unlockedGear.includes(g));

            if (dropRoll < 0.18) {
              if (normalWeaponPool.length > 0) {
                const wPick = rng.pick(normalWeaponPool);
                nextPlayer.unlockedWeapons.push(wPick);
                lootMessages.push(`Vũ khí [${CONFIG.WEAPONS[wPick]?.name || wPick}]`);
              } else {
                nextPlayer.silverCoins += 6;
                nextPlayer.inventory.silver_coin =
                  (nextPlayer.inventory.silver_coin || 0) + 6;
                lootMessages.push('+6 Đồng Bạc');
              }
            } else if (dropRoll < 0.5) {
              const utilityPool = [
                'lockpick',
                'bandage',
                'green_herb',
                'red_herb',
                'white_herb',
                'calm_flower',
              ];
              const uPick = rng.pick(utilityPool);
              nextPlayer.inventory[uPick] = (nextPlayer.inventory[uPick] || 0) + 1;
              lootMessages.push(`+1 [${CONFIG.ITEMS[uPick]?.name || uPick}]`);
            } else if (dropRoll < 0.7) {
              if (lightGearPool.length > 0) {
                const gPick = rng.pick(lightGearPool);
                nextPlayer.unlockedGear.push(gPick);
                lootMessages.push(`Trang bị [${GEAR_ITEMS[gPick]?.name || gPick}]`);
              } else {
                nextPlayer.silverCoins += 4;
                nextPlayer.inventory.silver_coin =
                  (nextPlayer.inventory.silver_coin || 0) + 4;
                lootMessages.push('+4 Đồng Bạc');
              }
            } else if (rng.chance(0.65)) {
              const silverGain = 3 + Math.floor(rng.next() * 4);
              nextPlayer.silverCoins += silverGain;
              nextPlayer.inventory.silver_coin =
                (nextPlayer.inventory.silver_coin || 0) + silverGain;
              lootMessages.push(`+${silverGain} Đồng Bạc`);
            } else {
              const survivalPool = [
                'bandage',
                'dried_meat',
                'salted_meat',
                'aged_cheese',
                'dark_ale',
                'herbal_cigarette',
                'torch',
                'ritual_chalk',
                'torn_cloth',
                'scrap_iron',
              ];
              const sPick = rng.pick(survivalPool);
              nextPlayer.inventory[sPick] = (nextPlayer.inventory[sPick] || 0) + 1;
              lootMessages.push(`+1 [${CONFIG.ITEMS[sPick]?.name || sPick}]`);
            }
            if (rng.chance(0.55)) {
              const rawPick = rng.pick(['torn_cloth', 'scrap_iron', 'dry_wood', 'pine_resin']);
              nextPlayer.inventory[rawPick] = (nextPlayer.inventory[rawPick] || 0) + 1;
              lootMessages.push(`+1 [${CONFIG.ITEMS[rawPick]?.name || rawPick}]`);
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
            addLog(`Lục soát xác [${corpseName}]: Thu được ${lootMessages.join(' & ')}!`);
            setLogOverlayVisible(true);
          },
        });
      }

      if (!corpse.corpseDevoured && (player.inventory.scroll_field_dissection || 0) > 0) {
        corpseChoices.push({
          label: 'Giải phẫu cái xác bằng Cuộn Giải Phẫu Thực Địa',
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
          label: 'Niệm Chiêu Hồn Thuật lên cái xác',
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

      const hasDemonicPact = (player.affinities?.demonicPact || 0) >= 1;
      if (!corpse.corpseDevoured && hasDemonicPact) {
        corpseChoices.push({
          label: 'Nuốt Chửng cái xác (Khế Ước Huyết Quỷ)',
          onSelect: () => {
            setInteractionMenu(null);
            const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
            const eCopy: MapEnemyInstance = JSON.parse(JSON.stringify(corpse));
            const res = devourEnemyCorpse(pCopy, eCopy);
            if (!res.success) {
              sfx.playSfx('ui_move');
              addLog(res.message);
              setLogOverlayVisible(true);
              return;
            }
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
        description: hasDemonicPact
          ? 'Xác kẻ địch nằm bất động trên nền đá đẫm máu. Bạn có thể lục soát chiến lợi phẩm, giải phẫu, niệm Chiêu Hồn Thuật hoặc Nuốt Chửng theo Khế Ước Huyết Quỷ.'
          : 'Xác kẻ địch nằm bất động trên nền đá đẫm máu. Bạn có thể lục soát chiến lợi phẩm hoặc dùng Cuộn Giải Phẫu Thực Địa.',
        selectedIndex: 0,
        choices: corpseChoices,
      });
    };

    const secretMaskSet = new Set<string>(
      !room.secretWallBlown ? room.secretChamberCoords || [] : []
    );
    const dismissedCompanionIds = new Set(
      (player.dismissedCompanions || []).map((c) => c.id)
    );

    for (const [dx, dy] of searchOffsets) {
      if (Math.abs(dx) + Math.abs(dy) > 1) continue;
      const cx = playerPos.x + dx;
      const cy = playerPos.y + dy;
      if (cy < 0 || cy >= roomH || cx < 0 || cx >= roomW) continue;
      const tile = room.grid[cy][cx];
      const coordKey = `${cx},${cy}`;
      if (secretMaskSet.has(coordKey)) continue;

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

      // Specialized End-Game Interaction: TILE.VOID_RIFT (Lõi Khóa, Tiên Dược, Thánh Tử 13 & Canon Endings)
      if (tile === TILE.VOID_RIFT) {
        const isElixirCollected = riftElixirCollected || room.lootedCoords.includes(coordKey);
        openVoidRiftEndgameMenu(room.id, coordKey, isElixirCollected);
        return;
      }

      if (npcTileToModalMap[tile]) {
        const modalId = npcTileToModalMap[tile];
        const lcState = player.npcLifecycle?.[modalId];
        if (lcState === 'recruited' || lcState === 'dead') continue;
        if (tile === TILE.NPC_SMUGGLER && player.npcFlags?.smugglerClosed) continue;
        if (
          tile === TILE.NPC_PRISONER &&
          (player.npcFlags.prisonerRecruited ||
            player.party.some((a) => a.id === 'ally_kael') ||
            dismissedCompanionIds.has('ally_kael'))
        ) {
          continue;
        }
        if (
          tile === TILE.NPC_BROKEN_KNIGHT &&
          (player.party.some((a) => a.id === 'broken_knight') ||
            dismissedCompanionIds.has('broken_knight'))
        ) {
          continue;
        }
        if (
          tile === TILE.NPC_RECRUIT_KNIGHT &&
          ((room.lootedCoords.includes(coordKey) && lcState !== 'map') ||
            player.classId === 'fallen_knight' ||
            player.party.some((a) => a.id === 'fallen_knight') ||
            dismissedCompanionIds.has('fallen_knight'))
        ) {
          continue;
        }
        if (
          tile === TILE.NPC_RECRUIT_NUN &&
          ((room.lootedCoords.includes(coordKey) && lcState !== 'map') ||
            player.classId === 'forsaken_nun' ||
            player.party.some((a) => a.id === 'forsaken_nun') ||
            dismissedCompanionIds.has('forsaken_nun'))
        ) {
          continue;
        }
        if (
          tile === TILE.NPC_RECRUIT_HUNTER &&
          ((room.lootedCoords.includes(coordKey) && lcState !== 'map') ||
            player.classId === 'night_hunter' ||
            player.party.some((a) => a.id === 'night_hunter') ||
            dismissedCompanionIds.has('night_hunter'))
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
              label: 'Nằm xuống chợp mắt & Lưu tiến trình',
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
                    'Giấc ngủ bình yên hiếm hoi xoa dịu vết thương và tâm trí giữa bóng tối.'
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
                        'May mắn thay, tiếng bước chân lướt qua ngoài cửa — bạn chợp mắt hồi sức an toàn.'
                      );
                      setActiveModal('saves');
                    } else {
                      const ambushEnemy = livingRoomEnemies[0];
                      addLog(
                        'BỊ PHỤC KÍCH! Bóng đen lao vào xé rách màn đêm khi bạn vừa khép mắt!'
                      );
                      if (ambushEnemy) {
                        startCombatWithEnemy(ambushEnemy, { ambushFirstStrike: true });
                      }
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
          'torch',
          'herbal_cigarette',
          'dark_ale',
          'abbey_wine',
          'torn_cloth',
          'dry_wood',
          'scrap_iron',
          'pine_resin',
        ];
        const foodTable = [
          'dried_meat',
          'moldy_bread',
          'salted_meat',
          'aged_cheese',
          'dark_ale',
          'abbey_wine',
        ];
        const rawMaterialPool = ['torn_cloth', 'dry_wood', 'scrap_iron', 'pine_resin'];

        let item1: string;
        let bonusFood: string | null = null;
        if (rng.chance(0.12)) {
          item1 = 'lucky_coin';
        } else if (rng.chance(0.48)) {
          item1 = rng.pick(foodTable);
        } else {
          item1 = rng.pick(supplyTable);
          if (rng.chance(0.35)) {
            bonusFood = rng.pick(foodTable);
          }
        }
        const bonusTorch = item1 !== 'torch' && rng.chance(0.18);
        const bonusRawMaterial = rng.chance(0.68) ? rng.pick(rawMaterialPool) : null;

        setPlayer((prev) => {
          const nextInv = { ...prev.inventory };
          nextInv[item1] = (nextInv[item1] || 0) + 1;
          if (bonusFood) nextInv[bonusFood] = (nextInv[bonusFood] || 0) + 1;
          if (bonusTorch) nextInv.torch = (nextInv.torch || 0) + 1;
          if (bonusRawMaterial) nextInv[bonusRawMaterial] = (nextInv[bonusRawMaterial] || 0) + 1;
          return {
            ...prev,
            inventory: nextInv,
          };
        });

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
        const extraLootNames: string[] = [];
        if (bonusFood) extraLootNames.push(`[${CONFIG.ITEMS[bonusFood]?.name || bonusFood}]`);
        if (bonusTorch) extraLootNames.push(`[${CONFIG.ITEMS.torch?.name || 'Đuốc Sáng'}]`);
        if (bonusRawMaterial) {
          extraLootNames.push(`[${CONFIG.ITEMS[bonusRawMaterial]?.name || bonusRawMaterial}]`);
        }
        addLog(
          item1 === 'lucky_coin'
            ? extraLootNames.length > 0
              ? `Lục thùng gỗ tiếp tế, bất ngờ tìm thấy [Thẻ Bài Bạc] cùng ${extraLootNames.join(' và ')} ẩn dưới lớp rơm!`
              : 'Lục thùng gỗ tiếp tế, bất ngờ tìm thấy [Thẻ Bài Bạc] ẩn dưới lớp rơm!'
            : extraLootNames.length > 0
            ? `Lục thùng gỗ tiếp tế, thu nhận [${CONFIG.ITEMS[item1]?.name || item1}] cùng ${extraLootNames.join(' và ')}.`
            : `Lục thùng gỗ tiếp tế, thu nhận [${CONFIG.ITEMS[item1]?.name || item1}].`
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
        addLog(`Hái được nhành [${CONFIG.ITEMS[h1]?.name || h1}] mọc bên kẽ đá ẩm.`);
        setLogOverlayVisible(true);
        return;
      }

      // CHEST: 45% sealed chests require a Coin Toss (or Lockpick) to open; grants gear, rare vial, high chance of food rations (~60%), and 28% Lucky Coin
      if (tile === TILE.CHEST && !room.lootedCoords.includes(coordKey)) {
        const lockRng = new SeededRNG(`${world.seed}_chest_lock_${room.id}_${coordKey}`);
        const requiresCoinToss = lockRng.chance(0.45);

        const openChestAndGrantRewards = (extraHealthDelta = 0, prefixLog?: string) => {
          const rng = new SeededRNG(`${world.seed}_chest_${room.id}_${coordKey}`);
          const allGearIds = getEligibleChestGearIds(room, player.unlockedGear);
          const allShieldIds = Object.keys(CONFIG.SHIELDS).filter(
            (s) => !player.unlockedShields.includes(s)
          );
          const weaponKeys = getEligibleChestWeaponIds(room, player.unlockedWeapons);

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
          const rareHerbs = ['white_herb', 'green_herb', 'red_herb', 'calm_flower'];
          const vialId = rng.pick(rareVials);
          const foundLuckyCoin = rng.chance(0.28);
          const hasFood = rng.chance(0.65);
          const foodId = rng.pick([
            'dried_meat',
            'salted_meat',
            'aged_cheese',
            'abbey_wine',
            'dark_ale',
            'herbal_cigarette',
            'moldy_bread',
          ]);
          const foodQty = hasFood ? (rng.chance(0.3) ? 2 : 1) : 0;
          let equipRewardName = '';

          const applyRewards = (
            prev: PlayerState,
            updates: Partial<Pick<PlayerState, 'unlockedGear' | 'unlockedShields' | 'unlockedWeapons'>>,
            extraItems: Record<string, number> = {}
          ): PlayerState => {
            const nextInv: Record<string, number> = {
              ...prev.inventory,
              [vialId]: (prev.inventory[vialId] || 0) + 1,
            };
            if (foodQty > 0) {
              nextInv[foodId] = (nextInv[foodId] || 0) + foodQty;
            }
            if (foundLuckyCoin) {
              nextInv.lucky_coin = (nextInv.lucky_coin || 0) + 1;
            }
            for (const [k, qty] of Object.entries(extraItems)) {
              nextInv[k] = (nextInv[k] || 0) + qty;
            }
            return {
              ...prev,
              ...updates,
              hp:
                extraHealthDelta < 0
                  ? Math.max(1, prev.hp + extraHealthDelta)
                  : prev.hp,
              inventory: nextInv,
            };
          };

          const grantFallbackSupplyPack = () => {
            const bonusVial = rng.pick(rareVials);
            equipRewardName = `Gói vật tư hiếm (+1 ${CONFIG.ITEMS[bonusVial]?.name || bonusVial} & +2 Băng Gạc)`;
            setPlayer((prev) =>
              applyRewards(prev, {}, { [bonusVial]: 1, bandage: 2 })
            );
          };

          if (rollEquipType < 0.5) {
            if (allGearIds.length > 0) {
              const pickedGear = rng.pick(allGearIds);
              equipRewardName = GEAR_ITEMS[pickedGear]?.name || pickedGear;
              setPlayer((prev) =>
                applyRewards(prev, {
                  unlockedGear: prev.unlockedGear.includes(pickedGear)
                    ? prev.unlockedGear
                    : [...prev.unlockedGear, pickedGear],
                })
              );
            } else {
              grantFallbackSupplyPack();
            }
          } else if (rollEquipType < 0.75) {
            if (allShieldIds.length > 0) {
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
              grantFallbackSupplyPack();
            }
          } else if (rollEquipType < 0.9) {
            if (weaponKeys.length > 0) {
              const chosenWeapon = rng.pick(weaponKeys);
              equipRewardName = CONFIG.WEAPONS[chosenWeapon]?.name || chosenWeapon;
              setPlayer((prev) =>
                applyRewards(prev, {
                  unlockedWeapons: prev.unlockedWeapons.includes(chosenWeapon)
                    ? prev.unlockedWeapons
                    : [...prev.unlockedWeapons, chosenWeapon],
                })
              );
            } else {
              grantFallbackSupplyPack();
            }
          } else {
            const bonusVial = rng.pick(rareVials);
            const bonusHerb = rng.pick(rareHerbs);
            equipRewardName = `Gói vật tư hiếm (+1 ${CONFIG.ITEMS[bonusVial]?.name || bonusVial} & +1 ${CONFIG.ITEMS[bonusHerb]?.name || bonusHerb})`;
            setPlayer((prev) =>
              applyRewards(prev, {}, { [bonusVial]: 1, [bonusHerb]: 1 })
            );
          }

          sfx.playSfx('loot');
          const foodPart =
            foodQty > 0
              ? ` & +${foodQty} [${CONFIG.ITEMS[foodId]?.name || foodId}]`
              : '';
          const coinPart = foundLuckyCoin ? ' & +1 [Thẻ Bài Bạc]' : '';
          addLog(
            `${prefixLog ? `${prefixLog} ` : ''}Mở nắp rương cổ: Thu được [${equipRewardName}], [${CONFIG.ITEMS[vialId]?.name || vialId}]${foodPart}${coinPart}.`
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
                openChestAndGrantRewards(0, 'Chìa Khóa Vạn Năng lách khẽ qua ổ khóa cổ.');
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
                'Lưỡi châm sượt qua ngón tay nhưng chốt khóa đã bật tung.'
              );
            } else {
              setPlayer((prev) => ({
                ...prev,
                hp: Math.max(1, prev.hp - 10),
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
              addLog('Mũi kim bật ra từ ổ khóa rương cổ. Cơ chế khóa gãy kẹt cứng trong bóng tối.');
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

                if (!isScrollShelf) {
                  // Note / Lore Shelf: Grants 1 Lore Book (max 1 item)
                  const latest = playerRef.current;
                  const uncollected = CONFIG.BOOKS.filter(
                    (b) => !latest.readBookIds.includes(b.id)
                  );
                  const pickedBook =
                    uncollected.length > 0 ? rng.pick(uncollected) : rng.pick(CONFIG.BOOKS);

                  setPlayer((prev) => ({
                    ...prev,
                    readBookIds: prev.readBookIds.includes(pickedBook.id)
                      ? prev.readBookIds
                      : [...prev.readBookIds, pickedBook.id],
                  }));
                  setSelectedLoreBookId(pickedBook.id);
                  addLog(`Kệ Sách Ghi Chép: Tìm thấy trang "${pickedBook.title}"!`);
                  setLogOverlayVisible(true);
                  setActiveModal('lore');
                  return;
                }

                const grantShelfTreasure = (tier: CoinOutcomeTier) => {
                  const latest = playerRef.current;
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
                      return recIds.some((rid) => !latest.unlockedRecipes.includes(rid));
                    });
                    const uncollectedSkillScrolls = CONFIG.SKILLS.filter(
                      (s) =>
                        s.branch === 'Chiến Kỹ' &&
                        (latest.skillLevels[s.id] || 0) === 0 &&
                        (latest.inventory[`scroll_${s.id}`] || 0) === 0
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
                        `Thu nhận được [${CONFIG.ITEMS[pickedId]?.name || pickedId}]. Hãy mở Túi [I] để đọc hoặc sử dụng!`
                      );
                    } else {
                      const uncollectedLore = CONFIG.BOOKS.filter(
                        (b) => !latest.readBookIds.includes(b.id)
                      );
                      if (uncollectedLore.length > 0) {
                        const b = rng.pick(uncollectedLore);
                        setPlayer((prev) => ({
                          ...prev,
                          readBookIds: prev.readBookIds.includes(b.id)
                            ? prev.readBookIds
                            : [...prev.readBookIds, b.id],
                        }));
                        setSelectedLoreBookId(b.id);
                        sfx.playHealOrChime();
                        addLog(`Giữa ngăn bí mật ẩn giấu trang Cổ Thư "${b.title}"!`);
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
                          `Tìm thấy [${CONFIG.ITEMS[rareArchiveItem]?.name}] cất giấu sau giá sách.`
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
                      `Cuộn giấy mục nát vỡ vụn giữa tay, chỉ sót lại [${CONFIG.ITEMS[lesserItem]?.name}] kẹp sau giá gỗ.`
                    );
                  } else {
                    // Cursed Book Trap!
                    const trapSnap: PlayerState = {
                      ...latest,
                      mind: Math.max(0, latest.mind - 10),
                      corruption: Math.min(100, latest.corruption + 4),
                    };
                    syncCorruptionHolyBan(trapSnap);
                    const corWarn = checkCorruptionDiegeticWarning(trapSnap);
                    setPlayer((prev) => {
                      const trapNext: PlayerState = {
                        ...prev,
                        mind: Math.max(0, prev.mind - 10),
                        corruption: Math.min(100, prev.corruption + 4),
                        corruptionWarningLogged: trapSnap.corruptionWarningLogged,
                      };
                      syncCorruptionHolyBan(trapNext);
                      return trapNext;
                    });
                    sfx.playSfx('hurt');
                    addLog(
                      'BẪY SÁCH NGUYỀN! Bụi cổ ngữ đen phụt thẳng vào mặt khiến đầu óc quay cuồng và lồng ngực lạnh buốt.'
                    );
                    if (corWarn) addLog(corWarn);
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
                  'Những dòng cổ ngữ trên bìa sách như đang cựa quậy trong bóng tối...',
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
            'herbal_cigarette',
            'dark_ale',
            'abbey_wine',
            'salted_meat',
            'aged_cheese',
          ]);
          const rawPick = rng.pick(['torn_cloth', 'scrap_iron', 'dry_wood', 'pine_resin']);
          rewardLog = `+1 ${CONFIG.ITEMS[itemPick]?.name} & +1 ${CONFIG.ITEMS[rawPick]?.name}`;
          setPlayer((prev) => ({
            ...prev,
            inventory: {
              ...prev.inventory,
              [itemPick]: (prev.inventory[itemPick] || 0) + 1,
              [rawPick]: (prev.inventory[rawPick] || 0) + 1,
            },
          }));
        }

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
        addLog(`Lục soát xác kỵ sĩ viễn chinh tử trận: Thu được ${rewardLog}!`);
        setLogOverlayVisible(true);
        return;
      }

      // NEW SURVIVAL TILE 2: MIASMA_VENT (Meditate to absorb Miasma for Primordial Void Affinity)
      if (tile === TILE.MIASMA_VENT && !room.lootedCoords.includes(coordKey)) {
        setInteractionMenu({
          title: 'KHE NỨT CHƯỚNG KHÍ HƯ VÔ',
          description:
            'Luồng khói tím lạnh lẽo rỉ ra từ vết nứt nền đá. Nhịp thở rì rầm từ đáy vực khẽ gọi tên bạn.',
          selectedIndex: 0,
          choices: [
            {
              label: 'Thiền định bên khe nứt',
              onSelect: () => {
                setInteractionMenu(null);
                const latest = playerRef.current;
                const miasmaNext: PlayerState = JSON.parse(JSON.stringify(latest));
                miasmaNext.mind = Math.max(2, miasmaNext.mind - 18);
                miasmaNext.corruption = Math.min(100, miasmaNext.corruption + 8);
                grantAffinityOnce(miasmaNext, `miasma_${room.id}_${coordKey}`, 'primordialVoid', 1);
                syncCorruptionHolyBan(miasmaNext);
                const corWarn = checkCorruptionDiegeticWarning(miasmaNext);
                setPlayer(() => miasmaNext);
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
                  'Hơi khói tím lạnh buốt tràn ngập lồng ngực. Tâm trí chao đảo giữa tiếng vọng xa xăm của Hư Vô Nguyên Thủy.'
                );
                if (corWarn) addLog(corWarn);
                setLogOverlayVisible(true);
              },
            },
            { label: 'Rời đi', onSelect: closePrompt },
          ],
        });
        return;
      }

      // RITUAL_CIRCLE: 4 Strictly Separated Deity Altars (uninscribed / holy_mother / demon_lord / void_god)
      if (tile === TILE.RITUAL_CIRCLE) {
        const circleMeta = room.ritualCircles?.[coordKey];
        const deityType: RitualDeityType = circleMeta?.deityType || 'uninscribed';
        const altarKey = buildAltarKey(room.id, cx, cy);
        const circleActionId = `ritual_${room.id}_${coordKey}`;
        const isCircleDone =
          (player.usedAltarKeys || []).includes(altarKey) ||
          Boolean(circleMeta?.used) ||
          (deityType !== 'uninscribed' && room.lootedCoords.includes(coordKey));

        const altarTitleByDeity: Record<RitualDeityType, string> = {
          uninscribed: 'ĐÀI ĐÁ TRỐNG',
          holy_mother: 'TẾ ĐÀN THÁNH MẪU',
          demon_lord: 'HUYẾT TRẬN HUYẾT QUỶ',
          void_god: 'BỆ THỜ HƯ VÔ',
        };

        if (isCircleDone) {
          addLog(ALTAR_EXHAUSTED_MSG);
          setLogOverlayVisible(true);
          setInteractionMenu({
            title: altarTitleByDeity[deityType],
            description: ALTAR_EXHAUSTED_MSG,
            selectedIndex: 0,
            choices: [{ label: 'Rời đi', onSelect: closePrompt }],
          });
          return;
        }

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
              title: 'ĐÀI ĐÁ TRỐNG',
              description:
                'Phiến đá xám cổ xưa chưa khắc bất kỳ ấn ký thần linh nào. Bạn cần có Phấn Khắc Ấn trong hành trang để khắc biểu tượng vị thần lên đá trước khi hành lễ.',
              selectedIndex: 0,
              choices: [{ label: 'Rời đi', onSelect: closePrompt }],
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
            title: 'ĐÀI ĐÁ TRỐNG',
            description:
              'Phiến đá xám cổ xưa chưa khắc ấn ký. Một khi dùng Phấn Khắc Ấn vẽ lên mặt đá, ấn ký vị thần ấy sẽ ngự lại vĩnh viễn và không thể tẩy xóa.',
            selectedIndex: 0,
            choices: [
              {
                label: 'Khắc ấn ký Thánh Mẫu lên đá',
                onSelect: () => {
                  if (isHolyMotherBanned(player)) {
                    setInteractionMenu(null);
                    addLog(HOLY_ALTAR_REFUSAL_MSG);
                    setLogOverlayVisible(true);
                    return;
                  }
                  consumeChalkAndInscribe(
                    'holy_mother',
                    'Bạn vẽ biểu tượng Thánh Mẫu lên mặt đá lạnh. Phiến đá vĩnh viễn hóa thành Tế Đàn Thánh Mẫu trong ánh sáng trắng mờ.'
                  );
                },
              },
              {
                label: 'Khắc ấn ký Huyết Quỷ lên đá',
                onSelect: () => {
                  consumeChalkAndInscribe(
                    'demon_lord',
                    'Nét phấn đỏ thẫm khắc sâu xuống mặt đá. Phiến đá vĩnh viễn hóa thành Huyết Trận Huyết Quỷ bốc hơi tanh nồng.'
                  );
                },
              },
              {
                label: 'Khắc ấn ký Hư Vô lên đá',
                onSelect: () => {
                  consumeChalkAndInscribe(
                    'void_god',
                    'Con mắt không mí hiện rõ bằng nét phấn tím nhạt. Phiến đá vĩnh viễn hóa thành Bệ Thờ Hư Vô lặng câm.'
                  );
                },
              },
              { label: 'Rời đi', onSelect: closePrompt },
            ],
          });
          return;
        }

        if (deityType === 'holy_mother') {
          const executeHolyPrayer = (holyMode: 'fasting' | 'white_herb') => {
            setInteractionMenu(null);
            const next: PlayerState = JSON.parse(JSON.stringify(playerRef.current));
            const res = performAltarAffinityRitual(next, {
              altarKey,
              deity: 'holy_mother',
              holyMode,
            });
            if (res.success) {
              sfx.playSfx('ritual');
              updateCircleState('holy_mother', true);
              setPlayer(() => next);
            }
            addLog(res.message);
            setLogOverlayVisible(true);
          };

          const holyChoices: InteractionChoice[] = [
            {
              label: 'Cầu nguyện & Nhịn ăn hành xác',
              onSelect: () => executeHolyPrayer('fasting'),
            },
          ];
          if ((player.inventory.white_herb || 0) > 0) {
            holyChoices.push({
              label: 'Dâng Thảo Dược Trắng cầu nguyện',
              onSelect: () => executeHolyPrayer('white_herb'),
            });
          }
          holyChoices.push({ label: 'Rời đi', onSelect: closePrompt });

          setInteractionMenu({
            title: 'TẾ ĐÀN THÁNH MẪU',
            description:
              'Ánh sáng trắng bạc dịu nhẹ tỏa ra từ bức tượng và cổ ngữ Thánh Mẫu, lặng lẽ soi rọi bóng tối quanh đây.',
            selectedIndex: 0,
            choices: holyChoices,
          });
          return;
        }

        if (deityType === 'demon_lord') {
          const demonChoices: InteractionChoice[] = [
            {
              label: 'Rạch cổ tay hiến máu',
              onSelect: () => {
                setInteractionMenu(null);
                const next: PlayerState = JSON.parse(JSON.stringify(playerRef.current));
                const res = performAltarAffinityRitual(next, {
                  altarKey,
                  deity: 'demon_lord',
                  bloodHpLossRatio: 0.25 + Math.random() * 0.05,
                });
                if (res.success) {
                  sfx.playSfx('ritual');
                  updateCircleState('demon_lord', true);
                  setPlayer(() => next);
                }
                addLog(res.message);
                setLogOverlayVisible(true);
              },
            },
          ];

          player.party.forEach((ally, idx) => {
            if (ally.hp <= 0) return;
            demonChoices.push({
              label: `Hiến tế đồng hành [${ally.name}]`,
              onSelect: () => {
                setInteractionMenu(null);
                sfx.playSfx('ritual');
                updateCircleState('demon_lord', true);
                setPlayer((prev) => {
                  const next: PlayerState = JSON.parse(JSON.stringify(prev));
                  next.usedAltarKeys = next.usedAltarKeys || [];
                  if (!next.usedAltarKeys.includes(altarKey)) {
                    next.usedAltarKeys.push(altarKey);
                  }
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
                addLog(
                  `Huyết Trận nuốt trọn sinh linh của [${ally.name}]. Sức mạnh tà dị tràn ngập thân xác bạn giữa sự tĩnh lặng rợn người, chỉ còn lại hành trang rơi trên nền đá.`
                );
                setLogOverlayVisible(true);
              },
            });
          });

          demonChoices.push({ label: 'Rời đi', onSelect: closePrompt });
          setInteractionMenu({
            title: 'HUYẾT TRẬN HUYẾT QUỶ',
            description:
              'Mặt đá nhuốm đỏ rỉ ra hơi nóng tanh nồng. Vòng tròn đói khát một lễ vật bằng máu thịt.',
            selectedIndex: 0,
            choices: demonChoices,
          });
          return;
        }

        if (deityType === 'void_god') {
          const voidChoices: InteractionChoice[] = [
            {
              label: 'Nhìn thẳng vào vết nứt vực thẳm',
              onSelect: () => {
                setInteractionMenu(null);
                const next: PlayerState = JSON.parse(JSON.stringify(playerRef.current));
                const res = performAltarAffinityRitual(next, {
                  altarKey,
                  deity: 'void_god',
                });
                if (res.success) {
                  sfx.playSfx('ritual');
                  updateCircleState('void_god', true);
                  setPlayer(() => next);
                }
                addLog(res.message);
                setLogOverlayVisible(true);
              },
            },
          ];

          if ((player.inventory.pure_soul_shard || 0) > 0) {
            voidChoices.push({
              label: 'Dâng [Mảnh Linh Hồn Thuần Khiết] vào bệ thờ',
              onSelect: () => {
                setInteractionMenu(null);
                sfx.playSfx('ritual');
                updateCircleState('void_god', true);
                setPlayer((prev) => {
                  const next: PlayerState = JSON.parse(JSON.stringify(prev));
                  next.usedAltarKeys = next.usedAltarKeys || [];
                  if (!next.usedAltarKeys.includes(altarKey)) {
                    next.usedAltarKeys.push(altarKey);
                  }
                  next.inventory.pure_soul_shard = Math.max(
                    0,
                    (next.inventory.pure_soul_shard || 0) - 1
                  );
                  next.energyStones += 2;
                  next.inventory.energy_stone =
                    (next.inventory.energy_stone ?? next.energyStones - 2) + 2;
                  grantAffinityOnce(next, circleActionId, 'primordialVoid', 1);
                  grantAffinityOnce(next, 'milestone_void_offering', 'primordialVoid', 1);
                  return next;
                });
                addLog(
                  'Mảnh Linh Hồn tan chảy thành ánh tím sâu thẳm, kết tinh lại thành hai viên Đá Linh Hồn Rỗng giữa tiếng thì thầm từ Vực Sao.'
                );
                setLogOverlayVisible(true);
              },
            });
          }
          const relicOfferId = (
            ['petrified_bone_shard', 'ancient_scroll', 'secret_archive_key'] as const
          ).find((id) => (player.inventory[id] || 0) > 0);
          if (relicOfferId) {
            const relicName = CONFIG.ITEMS[relicOfferId]?.name || 'Cổ Vật';
            voidChoices.push({
              label: `Dâng [${relicName}] vào bệ thờ`,
              onSelect: () => {
                setInteractionMenu(null);
                sfx.playSfx('ritual');
                updateCircleState('void_god', true);
                setPlayer((prev) => {
                  const next: PlayerState = JSON.parse(JSON.stringify(prev));
                  next.usedAltarKeys = next.usedAltarKeys || [];
                  if (!next.usedAltarKeys.includes(altarKey)) {
                    next.usedAltarKeys.push(altarKey);
                  }
                  next.inventory[relicOfferId] = Math.max(
                    0,
                    (next.inventory[relicOfferId] || 0) - 1
                  );
                  next.inventory.purple_vial = (next.inventory.purple_vial || 0) + 1;
                  grantAffinityOnce(next, circleActionId, 'primordialVoid', 1);
                  grantAffinityOnce(next, 'milestone_void_offering', 'primordialVoid', 1);
                  return next;
                });
                addLog(
                  `[${relicName}] tan biến vào vòng xoáy tím, để lại một chiếc lọ thủy tinh tỏa ánh sáng lạnh.`
                );
                setLogOverlayVisible(true);
              },
            });
          }
          if (player.readBookIds.length > 0) {
            const offeredBookId = player.readBookIds[player.readBookIds.length - 1];
            const offeredBookTitle =
              CONFIG.BOOKS.find((b) => b.id === offeredBookId)?.title || 'Sách Cổ';
            voidChoices.push({
              label: `Dâng trang sách [${offeredBookTitle}]`,
              onSelect: () => {
                setInteractionMenu(null);
                sfx.playSfx('ritual');
                updateCircleState('void_god', true);
                setPlayer((prev) => {
                  const next: PlayerState = JSON.parse(JSON.stringify(prev));
                  next.usedAltarKeys = next.usedAltarKeys || [];
                  if (!next.usedAltarKeys.includes(altarKey)) {
                    next.usedAltarKeys.push(altarKey);
                  }
                  next.readBookIds = next.readBookIds.filter((id) => id !== offeredBookId);
                  next.energyStones += 1;
                  next.inventory.energy_stone =
                    (next.inventory.energy_stone ?? next.energyStones - 1) + 1;
                  grantAffinityOnce(next, circleActionId, 'primordialVoid', 1);
                  grantAffinityOnce(next, 'milestone_void_offering', 'primordialVoid', 1);
                  return next;
                });
                addLog(
                  `Ký ức về trang [${offeredBookTitle}] bị Hư Vô nuốt chửng, để lại một viên Đá Linh Hồn Rỗng lạnh buốt.`
                );
                setLogOverlayVisible(true);
              },
            });
          }
          voidChoices.push({ label: 'Rời đi', onSelect: closePrompt });
          setInteractionMenu({
            title: 'BỆ THỜ HƯ VÔ',
            description:
              'Vết nứt tím thẫm uốn lượn như con mắt không mí mở giữa không gian câm lặng, chầm chậm kéo ánh nhìn của bạn vào vực sâu.',
            selectedIndex: 0,
            choices: voidChoices,
          });
          return;
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
                setWorld((prev) => {
                  const curRoom = prev.rooms[room.id] || room;
                  return {
                    ...prev,
                    rooms: {
                      ...prev.rooms,
                      [room.id]: {
                        ...curRoom,
                        shortcutOpened: true,
                      },
                    },
                  };
                });
                addLog('Gạt chốt sắt: Cổng Sắt Đường Tắt đã mở toang!');
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

      // Disarm adjacent armed FLOOR_TRAP on [F] -> transitions sprite to sprung/closed state
      if (
        tile === TILE.FLOOR_TRAP &&
        !room.lootedCoords.includes(coordKey) &&
        Math.abs(dx) + Math.abs(dy) === 1
      ) {
        sfx.playSfx('ui_confirm');
        setWorld((prev) => {
          const curRoom = prev.rooms[room.id] || room;
          if (curRoom.lootedCoords.includes(coordKey)) return prev;
          return {
            ...prev,
            rooms: {
              ...prev.rooms,
              [room.id]: {
                ...curRoom,
                lootedCoords: [...curRoom.lootedCoords, coordKey],
              },
            },
          };
        });
        addLog('Bạn cẩn thận gạt chốt sắt, kích hoạt cho Bẫy Chông bật đóng lại an toàn.');
        setLogOverlayVisible(true);
        return;
      }
    }

    // Looted wooden crates retain their intact sprite; approaching and checking them reports empty
    for (const [dx, dy] of searchOffsets) {
      const cx = playerPos.x + dx;
      const cy = playerPos.y + dy;
      if (cy < 0 || cy >= roomH || cx < 0 || cx >= roomW) continue;
      if (room.grid[cy][cx] === TILE.CRATE && room.lootedCoords.includes(`${cx},${cy}`)) {
        sfx.playSfx('ui_move');
        addLog('Thùng gỗ này trống rỗng, chẳng còn vật tư nào bên trong.');
        setLogOverlayVisible(true);
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
          description: `${parked.ally.name} đang kiên nhẫn chờ bạn tại đây (Sinh Lực ${parked.ally.hp}/${parked.ally.maxHp}, Lý Trí ${parked.ally.mind}/${parked.ally.maxMind}).`,
          selectedIndex: 0,
          choices: [
            {
              label: `Gọi [${parked.ally.name}] tái gia nhập đội hình`,
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
        title: 'CỔNG SẮT NGOẠI VI',
        description: knightGateOk
          ? 'Lời thề Kỵ Đoàn đã tròn. Bạn có thể ở lại Thung Lũng dựng bia mộ đồng đội ngay lúc này, hoặc quay xuống tầng sâu.'
          : 'Kết Giới Chướng Khí nơi Cổng Sắt Ngoại Vi đã suy yếu. Bạn có thể rời khỏi Thung Lũng Xương Tàn ngay, hoặc quay xuống tầng sâu.',
        selectedIndex: 0,
        choices: [
          {
            label: knightGateOk
              ? 'Ở lại Thung Lũng dựng bia mộ cho Kỵ Đoàn'
              : 'Mở Cổng Sắt rời khỏi Thung Lũng',
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
            label: 'Quay lại tầng sâu tiến về Vết Rách',
            onSelect: () => {
              closePrompt();
              addLog('Bạn chọn ở lại để tiếp tục tiến xuống Vết Rách Tầng 3 định đoạt vận mệnh thế giới.');
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
    openVoidRiftEndgameMenu,
    riftElixirCollected,
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

      // Play sharp startled horror sting when any enemy newly enters 'alert' (! yellow badge, 400ms reflex delay)
      const newlyAlerted = tickResult.enemies.some((nextE) => {
        if (nextE.defeated || nextE.aiState !== 'alert') return false;
        const prevE = curRoom.enemies.find((pe) => pe.uid === nextE.uid);
        return prevE && prevE.aiState !== 'alert';
      });
      if (newlyAlerted) {
        sfx.playSfx('enemy_alert');
      }

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
    }, EXPLORATION_CONSTANTS.AI_TICK_MS);

    return () => window.clearInterval(tickId);
  }, [canRunAiTick, triggerCombat]);

  // Grid Step Movement with STEP_COOLDOWN = 220ms (Shift Dash halves cooldown when legs allow) & Hunger Loop
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
      const lostLegs = (!player.limbs.leftLeg ? 1 : 0) + (!player.limbs.rightLeg ? 1 : 0);
      const baseCooldown = getPlayerStepCooldownMs(player);
      const cooldown =
        shiftHeldRef.current && lostLegs < 2
          ? Math.max(
              EXPLORATION_CONSTANTS.DASH_MIN_COOLDOWN_MS,
              Math.round(baseCooldown * EXPLORATION_CONSTANTS.DASH_COOLDOWN_MULT)
            )
          : baseCooldown;
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
      let hungerGain = 0;
      if (player.difficulty === 'easy') {
        // Easy mode: 30% reduced hunger gain while moving (normal = 0.4/step -> easy = 0.28/step)
        hungerStepAccumRef.current += EXPLORATION_CONSTANTS.EASY_HUNGER_PER_STEP;
        if (hungerStepAccumRef.current >= 1) {
          hungerGain = Math.floor(hungerStepAccumRef.current);
          hungerStepAccumRef.current -= hungerGain;
        }
      } else {
        hungerGain =
          nextSteps % EXPLORATION_CONSTANTS.NORMAL_HUNGER_STEP_MOD === 0
            ? EXPLORATION_CONSTANTS.NORMAL_HUNGER_GAIN
            : 0;
      }
      const nextHunger = Math.min(100, player.hunger + hungerGain);
      let nextHp = player.hp;
      let nextMind = player.mind;
      let nextCor = player.corruption;

      if (nextHunger >= EXPLORATION_CONSTANTS.STARVATION_THRESHOLD) {
        nextHp = Math.max(0, nextHp - EXPLORATION_CONSTANTS.STARVATION_HP_LOSS);
        addLog('Cơn Đói Cực Hạn rút cạn 3 Sinh Lực mỗi bước chân!');
      }

      // Step hazard: MIASMA_VENT deals -3 Lý Trí, +2 Tha Hóa scaled by Floor 3 Void Miasma resistance
      if (targetTile === TILE.MIASMA_VENT) {
        const immuneMiasma =
          player.equippedHead === 'beak_mask' || player.equippedBody === 'star_pelt_coat';
        const miasmaMult = getFloor3MiasmaMultiplier(player);
        if (immuneMiasma || miasmaMult <= 0) {
          addLog('Cộng hưởng Hư Vô hoặc Trang bị kháng Chướng Khí giúp bạn bước qua Khe Nứt mà không mất Lý Trí!');
        } else {
          const mindLoss = Math.max(1, Math.round(3 * miasmaMult));
          const corGain = Math.max(1, Math.round(2 * miasmaMult));
          nextMind = Math.max(0, nextMind - mindLoss);
          nextCor = Math.min(100, nextCor + corGain);
          addLog('Khói tím chướng khí tràn vào buồng phổi, bào mòn Lý Trí!');
        }
      }

      const nextStealth = Math.max(0, (player.stealthStepsTurns || 0) - 1);
      if ((player.stealthStepsTurns || 0) > 0 && nextStealth === 0) {
        addLog('Lớp sương ẩn thân [Bước Chân Bóng Tối] đã tan biến.');
      }

      if (player.equippedBody === 'platinum_cuirass' && nextCor > 0) {
        nextHp = Math.max(0, nextHp - EXPLORATION_CONSTANTS.PLATINUM_CUIRASS_BURN_HP);
        addLog('Giáp Bạch Kim rực nóng thiêu đốt 5 Sinh Lực vì vết nhơ Tha Hóa trên người bạn!');
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
      const stepCorWarn = checkCorruptionDiegeticWarning(updatedPlayer);
      if (stepCorWarn) {
        addLog(stepCorWarn);
        setLogOverlayVisible(true);
      }
      const mapFallenLogs: string[] = [];
      const mapFallen = pruneDeadCompanions(updatedPlayer, mapFallenLogs);
      if (mapFallen.length > 0) {
        for (const msg of mapFallenLogs) addLog(msg);
        setSelectedInvMemberIdx((prevIdx) => (prevIdx <= updatedPlayer.party.length ? prevIdx : 0));
        setLogOverlayVisible(true);
      }

      const zeroMindCheck =
        updatedPlayer.hp > 0
          ? evaluateZeroMindStepDespair(updatedPlayer, Math.random())
          : { triggered: false };

      setPlayerPos({ x: nx, y: ny });
      setTrailCoords((prev) => [{ x: playerPos.x, y: playerPos.y }, ...prev].slice(0, 4));
      setPlayer(updatedPlayer);

      if (zeroMindCheck.triggered && zeroMindCheck.ending) {
        sfx.playSfx('hurt');
        const nextRandomSeed = generateRandomSeed();
        setSeedInput(nextRandomSeed);
        setEndingInfo(zeroMindCheck.ending);
        setScreen('ending');
        return;
      }
      if (zeroMindCheck.warningMessage) {
        addLog(zeroMindCheck.warningMessage);
        setLogOverlayVisible(true);
      }

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
            'Ánh lửa cuối cùng tàn lụi trên nền đá lạnh lẽo. Cơn đói cồn cào cùng những vết thương rỉ máu rút cạn hơi thở sau cùng, để lại thân xác gầy rộc chìm vào bóng tối câm lặng của Đại Giáo Đường Goethe.',
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
          const nextHp = Math.max(1, prev.hp - EXPLORATION_CONSTANTS.FLOOR_TRAP_HP_LOSS);
          const nextMind = Math.max(0, prev.mind - EXPLORATION_CONSTANTS.FLOOR_TRAP_MIND_LOSS);
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
          'BẪY CHÔNG BẬT MẠNH! Răng sắt gỉ sét ngoạm sâu vào bắp chân (-22 Sinh Lực, -6 Lý Trí, Chảy Máu)!'
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

  // Execute sequential per-member combat action with dark-fantasy pacing (Hitstop + VFX + Sequential Ally/Enemy Beats).
  // ASYNC STATE & TARGET TRACKING FIX:
  // 1) Reads initial & ongoing state from `playerRef`, `worldRef`, `activeEnemyUidRef`, `activeActorIdxRef`, and
  //    `selectedLimbIdRef` instead of closed-over React render snapshots so `await sleepCombatStep()` never reads stale state.
  // 2) Applies functional state updates (`setPlayer(prev => ...)` / `setWorld(prev => ...)`) and mirrors `playerRef.current`
  //    synchronously on every combat beat so concurrent or chained updates never clobber prior deltas.
  // 3) Synchronizes `selectedLimbIdRef.current` immediately before attacks and re-routes to the nearest intact limb via
  //    `resolveNearestValidLimbId` if a targeted limb is severed mid-turn.
  const runCombatTurn = useCallback(
    async (
      action: CombatActionType,
      opts?: { limbId?: string; skillId?: string; itemId?: string }
    ) => {
      if (isResolvingTurnRef.current) return;
      const startRoomId = worldRef.current.currentRoomId;
      const startSeed = worldRef.current.seed;
      const startEnemyUid = activeEnemyUidRef.current;
      const startEnemy = worldRef.current.rooms[startRoomId]?.enemies.find(
        (e) => e.uid === startEnemyUid
      );
      if (!startEnemy) return;

      isResolvingTurnRef.current = true;
      setIsResolvingTurn(true);
      const turnRunId = combatAbortRef.current;

      // Helper to apply combat step state functionally while keeping playerRef synchronized
      const syncCombatState = (
        pState: PlayerState,
        eState: MapEnemyInstance,
        newLogs: string[]
      ) => {
        const extraFallenLogs: string[] = [];
        const fallenNow = pruneDeadCompanions(pState, extraFallenLogs);
        const mergedLogs = extraFallenLogs.length > 0 ? [...newLogs, ...extraFallenLogs] : newLogs;
        const permadeathNotices = mergedLogs.filter((l) => l.startsWith('['));
        for (const notice of permadeathNotices) addLog(notice);
        if (fallenNow.length > 0 || permadeathNotices.length > 0) {
          setSelectedInvMemberIdx((prevIdx) => (prevIdx <= pState.party.length ? prevIdx : 0));
          setActiveActorIdx((prevActor) => {
            const nextActor = prevActor <= pState.party.length ? prevActor : 0;
            activeActorIdxRef.current = nextActor;
            return nextActor;
          });
        }

        const nextPlayerSnapshot: PlayerState = JSON.parse(JSON.stringify(pState));
        playerRef.current = nextPlayerSnapshot;
        setPlayer((prev) => ({
          ...prev,
          ...nextPlayerSnapshot,
        }));

        setWorld((prev) => {
          const curRoom = prev.rooms[startRoomId];
          if (!curRoom) return prev;
          return {
            ...prev,
            rooms: {
              ...prev.rooms,
              [startRoomId]: {
                ...curRoom,
                enemies: curRoom.enemies.map((e) => (e.uid === eState.uid ? eState : e)),
              },
            },
          };
        });
        if (mergedLogs.length > 0) {
          setCombatLogs((prev) => appendCombatLogEntries(prev, mergedLogs));
        }
      };

      const syncLimbAfterStrike = (enemyState: MapEnemyInstance, preferredLimbId: string): string => {
        const tpl = CONFIG.ENEMIES[enemyState.templateId] || CONFIG.ENEMIES.fanatic_zealot;
        const nextValidLimb = resolveNearestValidLimbId(enemyState, tpl, preferredLimbId);
        if (nextValidLimb !== selectedLimbIdRef.current) {
          syncSelectedLimbId(nextValidLimb);
        }
        return nextValidLimb;
      };

      try {
        let pCur: PlayerState = JSON.parse(JSON.stringify(playerRef.current));
        let eCur: MapEnemyInstance = JSON.parse(JSON.stringify(startEnemy));
        const startActorIdx = activeActorIdxRef.current;
        const initTpl = CONFIG.ENEMIES[eCur.templateId] || CONFIG.ENEMIES.fanatic_zealot;

        // Synchronize target limb ref immediately before executing the attack
        let lastTargetLimb = resolveNearestValidLimbId(
          eCur,
          initTpl,
          opts?.limbId || selectedLimbIdRef.current
        );
        syncSelectedLimbId(lastTargetLimb);

        let finalEndingTrigger: ReturnType<CombatEngine['executeActorTurn']>['endingTrigger'] = undefined;
        let fledBattle = false;

        // 1. Execute action for current actor (startActorIdx)
        const outcome = combatEngineRef.current.executeActorTurn(
          pCur,
          eCur,
          startSeed,
          startActorIdx,
          action,
          lastTargetLimb,
          { ...opts, limbId: lastTargetLimb }
        );
        pCur = outcome.updatedPlayer;
        eCur = outcome.updatedEnemy;
        if (outcome.result.targetLimbId) lastTargetLimb = outcome.result.targetLimbId;
        if (outcome.result.fledSuccess) fledBattle = true;
        if (outcome.endingTrigger) finalEndingTrigger = outcome.endingTrigger;

        const isMissedAttack = Boolean(outcome.result.missed);
        const isOffensiveAction =
          action === 'ATTACK' ||
          action === 'SKILL' ||
          (action === 'ITEM' && (outcome.result.lastDealtDmg || 0) > 0);
        if (isMissedAttack) {
          sfx.playSfx('miss');
          triggerCombatNotice(
            outcome.result.logs[0] || 'Đòn tấn công sượt qua mục tiêu!',
            'miss'
          );
        } else if (isOffensiveAction) {
          sfx.playSfx(outcome.result.weaponCategory || 'unarmed');
          if (outcome.result.severedAnyLimb) sfx.playSfx('sever_limb');
          const isHeavyStrike =
            Boolean(outcome.result.wasCrit) ||
            (outcome.result.lastDealtDmg || 0) > COMBAT_TIMING_MS.HEAVY_DMG_THRESHOLD ||
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
        setCombatMenuMode('main');
        setCombatFocusPhase('action');
        setPendingAction(null);
        setPendingSkillId(null);

        // Immediately advance & sync target reticle if limb was severed during strike
        lastTargetLimb = syncLimbAfterStrike(eCur, lastTargetLimb);

        if (fledBattle) {
          await sleepCombatStep(COMBAT_TIMING_MS.FLEE_EXIT_DELAY);
          if (combatAbortRef.current !== turnRunId) return;
          handleCombatEnd({ fled: true });
          addLog(LOG_TEXT.FLED_COMBAT);
          return;
        }

        if (isOffensiveAction) {
          const fastOk = shiftHeldRef.current && !outcome.result.severedAnyLimb;
          await sleepCombatStep(
            fastOk ? COMBAT_TIMING_MS.OFFENSE_FAST_DELAY : COMBAT_TIMING_MS.OFFENSE_NORMAL_DELAY
          );
        } else {
          await sleepCombatStep(
            shiftHeldRef.current ? COMBAT_TIMING_MS.UTILITY_FAST_DELAY : COMBAT_TIMING_MS.UTILITY_NORMAL_DELAY
          );
        }
        if (combatAbortRef.current !== turnRunId) return;

        // Re-read latest playerRef after await in case non-turn state changed cleanly
        pCur = JSON.parse(JSON.stringify(playerRef.current));

        // 2. Sequentially resolve panicking / stunned living allies following startActorIdx
        let nextControllableActor: number | null = null;
        if (!finalEndingTrigger && !eCur.defeated) {
          let probeIdx = startActorIdx + 1;
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
            syncActiveActorIdx(probeIdx);
            lastTargetLimb = syncLimbAfterStrike(eCur, lastTargetLimb);
            const autoOut = combatEngineRef.current.executeActorTurn(
              pCur,
              eCur,
              startSeed,
              probeIdx,
              'ATTACK',
              lastTargetLimb
            );
            pCur = autoOut.updatedPlayer;
            eCur = autoOut.updatedEnemy;
            if (autoOut.result.missed) {
              sfx.playSfx('miss');
              triggerCombatNotice(
                autoOut.result.logs[0] || 'Đòn tấn công sượt qua mục tiêu!',
                'miss'
              );
            } else if ((autoOut.result.lastDealtDmg || 0) > 0) {
              sfx.playSfx(autoOut.result.weaponCategory || 'unarmed');
              if (autoOut.result.severedAnyLimb) sfx.playSfx('sever_limb');
              triggerCombatVfx(
                autoOut.result.weaponCategory || 'sword',
                autoOut.result.vfxColor || '#e2e8f0',
                Boolean(autoOut.result.wasCrit) ||
                  (autoOut.result.lastDealtDmg || 0) > COMBAT_TIMING_MS.HEAVY_DMG_THRESHOLD
              );
            }
            syncCombatState(pCur, eCur, autoOut.result.logs);
            lastTargetLimb = syncLimbAfterStrike(eCur, autoOut.result.targetLimbId || lastTargetLimb);
            if (autoOut.endingTrigger) {
              finalEndingTrigger = autoOut.endingTrigger;
              break;
            }
            if (eCur.defeated) break;
            const autoFastOk = shiftHeldRef.current && !autoOut.result.severedAnyLimb;
            await sleepCombatStep(
              autoFastOk ? COMBAT_TIMING_MS.OFFENSE_FAST_DELAY : COMBAT_TIMING_MS.OFFENSE_NORMAL_DELAY
            );
            if (combatAbortRef.current !== turnRunId) return;
            pCur = JSON.parse(JSON.stringify(playerRef.current));
            probeIdx++;
          }

          // 3. Resolve Enemy Round if no more sane allies remain in this round, then wrap to Actor 0
          if (nextControllableActor === null && !eCur.defeated && !finalEndingTrigger) {
            const enemyRound = combatEngineRef.current.resolveEnemyRound(pCur, eCur, startSeed);
            pCur = enemyRound.updatedPlayer;
            eCur = enemyRound.updatedEnemy;
            if (enemyRound.endingTrigger) finalEndingTrigger = enemyRound.endingTrigger;
            if ((enemyRound.result.lastTakenDmg || 0) > 0) {
              sfx.playSfx('hurt');
              triggerCombatVfx(
                enemyRound.result.weaponCategory || 'unarmed',
                enemyRound.result.vfxColor || '#dc2626',
                Boolean(enemyRound.result.wasCrit) ||
                  (enemyRound.result.lastTakenDmg || 0) > COMBAT_TIMING_MS.ENEMY_HEAVY_DMG_THRESHOLD
              );
            } else if (enemyRound.result.enemyMissed) {
              sfx.playSfx('miss');
              triggerCombatNotice(
                enemyRound.result.logs.find(
                  (l) => l.includes('TRƯỢT') || l.includes('sượt qua')
                ) || 'Bạn đã né được đòn tấn công!',
                'evade'
              );
            }
            syncCombatState(pCur, eCur, enemyRound.result.logs);
            const enemyFastOk = shiftHeldRef.current && !enemyRound.result.pendingCoinFlip;
            await sleepCombatStep(
              enemyFastOk ? COMBAT_TIMING_MS.ENEMY_FAST_DELAY : COMBAT_TIMING_MS.ENEMY_NORMAL_DELAY
            );
            if (combatAbortRef.current !== turnRunId) return;

            if (enemyRound.result.pendingCoinFlip && !finalEndingTrigger) {
              const cf = enemyRound.result.pendingCoinFlip;
              const enemySnapshot: MapEnemyInstance = JSON.parse(JSON.stringify(eCur));
              const playerSnapshot: PlayerState = JSON.parse(JSON.stringify(playerRef.current));
              const tpl = CONFIG.ENEMIES[enemySnapshot.templateId] || CONFIG.ENEMIES.fanatic_zealot;

              triggerCoinToss(
                `NÉ ĐÒN TỬ THẦN: ${cf.skillName.toUpperCase()}`,
                cf.telegraphText,
                (won) => {
                  if (combatAbortRef.current !== turnRunId) return;
                  const pAfter: PlayerState = JSON.parse(JSON.stringify(playerSnapshot));
                  const eAfter: MapEnemyInstance = JSON.parse(JSON.stringify(enemySnapshot));
                  const cfRng = new SeededRNG(
                    `${worldRef.current.seed}_combat_cf_${eAfter.uid}_${eAfter.turnCount}_${Date.now()}`
                  );
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
                  syncLimbAfterStrike(eAfter, selectedLimbIdRef.current);
                  if (cfRes.playerDefeated) {
                    const nextRandomSeed = generateRandomSeed();
                    setSeedInput(nextRandomSeed);
                    setEndingInfo({
                      id: 'SLAIN_IN_COMBAT',
                      title: 'MÁU NHUỘM ĐẠI GIÁO ĐƯỜNG GOETHE',
                      subtitle: `Gục Ngã Trước Đòn Tử Thần • Seed ngẫu nhiên mới: ${nextRandomSeed}`,
                      epilogue:
                        'Đồng xu định mệnh rơi xuống mặt đá lạnh buốt. Đòn tử thần giáng xuống không chút khoan nhượng, xé toạc phòng tuyến cuối cùng và nhuộm đỏ nền đá Đại Giáo Đường Goethe bằng chính máu của bạn.',
                    });
                    handleCombatEnd({ nextScreen: 'ending' });
                    return;
                  }
                  syncActiveActorIdx(0);
                  setCombatActionCursor(0);
                  setCombatFocusPhase('action');
                  setPendingAction(null);
                  setPendingSkillId(null);
                }
              );
              return;
            }

            nextControllableActor = 0;
          }
        }

        if (nextControllableActor !== null) {
          syncActiveActorIdx(nextControllableActor);
          const nextAlly =
            nextControllableActor > 0 ? pCur.party[nextControllableActor - 1] || null : null;
          setCombatActionCursor(nextAlly && isPureTankSummon(nextAlly) ? 2 : 0);
          setCombatFocusPhase('action');
          setPendingAction(null);
          setPendingSkillId(null);
        }

        syncLimbAfterStrike(eCur, lastTargetLimb);

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
        setCombatLogs((prev) => ['Đòn kỹ năng va chạm dữ dội trong bóng tối!', ...prev]);
      } finally {
        isResolvingTurnRef.current = false;
        setIsResolvingTurn(false);
      }
    },
    [
      addLog,
      handleCombatEnd,
      generateRandomSeed,
      openNpcRpgDialogue,
      triggerCombatVfx,
      triggerCombatNotice,
      sleepCombatStep,
      triggerCoinToss,
      syncSelectedLimbId,
      syncActiveActorIdx,
    ]
  );

  const handleLightTorchOrLamp = useCallback(() => {
    const latestInv = playerRef.current.inventory;
    const hasTorch = (latestInv.torch || 0) > 0;
    const hasOilLamp = (latestInv.oil_lamp || 0) > 0;
    if (hasTorch) {
      setPlayer((prev) => ({
        ...prev,
        torchTimer: EXPLORATION_CONSTANTS.TORCH_DURATION_SEC,
        torchMaxTimer: EXPLORATION_CONSTANTS.TORCH_DURATION_SEC,
        inventory: {
          ...prev.inventory,
          torch: Math.max(0, (prev.inventory.torch || 0) - 1),
        },
      }));
      torchLowWarnedRef.current = false;
      sfx.playHealOrChime();
      addLog(LOG_TEXT.TORCH_LIT);
      setLogOverlayVisible(true);
    } else if (hasOilLamp) {
      setPlayer((prev) => ({
        ...prev,
        torchTimer: EXPLORATION_CONSTANTS.OIL_LAMP_DURATION_SEC,
        torchMaxTimer: EXPLORATION_CONSTANTS.OIL_LAMP_DURATION_SEC,
        inventory: {
          ...prev.inventory,
          oil_lamp: Math.max(0, (prev.inventory.oil_lamp || 0) - 1),
        },
      }));
      torchLowWarnedRef.current = false;
      sfx.playHealOrChime();
      addLog(LOG_TEXT.OIL_LAMP_LIT);
      setLogOverlayVisible(true);
    } else {
      sfx.playSfx('ui_move');
      addLog(LOG_TEXT.NO_LIGHT_SOURCE);
      setLogOverlayVisible(true);
    }
  }, [addLog]);

  // KEYBOARD LISTENER OPTIMIZATION:
  // A mutable ref holds the latest keyboard handler so fast-changing state (`playerPos`, `player`,
  // `combatActionCursor`, `selectedLimbId`, etc.) never forces DOM listener detach/re-attach churn.
  const keydownHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keydownHandlerRef.current = (e: KeyboardEvent) => {
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
        if (cKey === 'a' || cKey === 'w' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          sfx.playSfx('ui_move');
          setCoinCursorSide('HEADS');
          return;
        }
        if (cKey === 'd' || cKey === 's' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          sfx.playSfx('ui_move');
          setCoinCursorSide('TAILS');
          return;
        }
        if (e.key === '1' || e.code === 'Digit1') {
          e.preventDefault();
          setCoinCursorSide('HEADS');
          handleChooseCoinSide('HEADS', e.shiftKey || shiftHeld);
          return;
        }
        if (e.key === '2' || e.code === 'Digit2') {
          e.preventDefault();
          setCoinCursorSide('TAILS');
          handleChooseCoinSide('TAILS', e.shiftKey || shiftHeld);
          return;
        }
        if (e.key === 'Enter' || cKey === 'f' || e.key === ' ') {
          e.preventDefault();
          handleChooseCoinSide(coinCursorSide, e.shiftKey || shiftHeld);
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
      const aliveLimbs = activeCombatEnemy.limbs.filter(
        (l) => l.hp > 0 && !activeCombatEnemy.severedLimbs.includes(l.id)
      );
      if (aliveLimbs.length === 0) return;

      const targetableLimbs = aliveLimbs.filter(
        (l) => canTargetEnemyLimb(activeCombatEnemy, tpl, l.id).allowed
      );
      const cycleLimbs = targetableLimbs.length > 0 ? targetableLimbs : aliveLimbs;

      // Early-return guard: lock ALL combat keyboard input to limb targeting while pendingAction is active
      if (pendingAction !== null) {
        e.preventDefault();
        if (
          ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(
            key
          )
        ) {
          sfx.playSfx('ui_move');
          const len = cycleLimbs.length;
          if (len <= 1) {
            if (cycleLimbs[0]) syncSelectedLimbId(cycleLimbs[0].id);
            return;
          }
          const curIdx = Math.max(0, cycleLimbs.findIndex((l) => l.id === selectedLimbIdRef.current));
          if (
            key === 'tab' ||
            key === 'a' ||
            key === 'arrowleft' ||
            key === 'd' ||
            key === 'arrowright'
          ) {
            const delta = key === 'a' || key === 'arrowleft' ? -1 : 1;
            const nextLimb = cycleLimbs[(curIdx + delta + len) % len];
            if (nextLimb) syncSelectedLimbId(nextLimb.id);
            return;
          }
          const getCoords = (id: string, i: number) =>
            reticleMap[id] || { nx: 0.25 + (i % 2) * 0.5, ny: 0.25 + Math.floor(i / 2) * 0.22 };
          const currentLimb = cycleLimbs[curIdx];
          if (!currentLimb) return;
          const curPos = getCoords(currentLimb.id, curIdx);
          const dirY = key === 'w' || key === 'arrowup' ? -1 : 1;

          let bestLimb = currentLimb;
          let bestScore = Infinity;
          cycleLimbs.forEach((cand, idx) => {
            if (cand.id === currentLimb.id) return;
            const p = getCoords(cand.id, idx);
            const dx = p.nx - curPos.nx;
            const dy = p.ny - curPos.ny;
            const primaryProj = dy * dirY;
            const ortho = Math.abs(dx);
            if (primaryProj > 0.02) {
              const score = primaryProj + ortho * 1.6;
              if (score < bestScore) {
                bestScore = score;
                bestLimb = cand;
              }
            }
          });

          if (bestLimb.id === currentLimb.id) {
            bestLimb = cycleLimbs[(curIdx + dirY + len) % len] || currentLimb;
          }

          syncSelectedLimbId(bestLimb.id);
          return;
        }

        // Pressing Key 1 during pendingAction === 'ATTACK' confirms the attack on the targeted limb
        const isConfirmAttackKey =
          pendingAction === 'ATTACK' && (e.key === '1' || e.code === 'Digit1');
        if (e.key === 'Enter' || e.key === ' ' || key === 'f' || isConfirmAttackKey) {
          const targetLimbId = resolveNearestValidLimbId(
            activeCombatEnemy,
            tpl,
            selectedLimbIdRef.current
          );
          const targetCheck = canTargetEnemyLimb(activeCombatEnemy, tpl, targetLimbId);
          if (!targetCheck.allowed) {
            sfx.playSfx('ui_move');
            setCombatLogs((prev) =>
              appendCombatLogEntries(prev, [
                targetCheck.reason || LOG_TEXT.SHIELDED_LIMB_FALLBACK,
              ])
            );
            return;
          }
          syncSelectedLimbId(targetLimbId);
          if (pendingAction === 'SKILL' && pendingSkillId) {
            const skId = pendingSkillId;
            setPendingAction(null);
            setPendingSkillId(null);
            runCombatTurn('SKILL', { limbId: targetLimbId, skillId: skId });
          } else {
            setPendingAction(null);
            setPendingSkillId(null);
            runCombatTurn('ATTACK', { limbId: targetLimbId });
          }
          return;
        }

        if (key === 'escape' || e.key === 'Backspace') {
          sfx.playSfx('ui_move');
          const wasSkill = pendingAction === 'SKILL';
          setPendingAction(null);
          setPendingSkillId(null);
          if (wasSkill) {
            setCombatMenuMode('skills');
            setCombatFocusPhase('skills_menu');
          } else {
            setCombatMenuMode('main');
            setCombatFocusPhase('action');
          }
          return;
        }

        return; // block ALL other keys from leaking to the main command menu
      }

      const snapLimbFocus = () => {
        const nextLimbId = resolveNearestValidLimbId(
          activeCombatEnemy,
          tpl,
          selectedLimbIdRef.current
        );
        syncSelectedLimbId(nextLimbId);
      };

      const activeAllyForKeys = activeActorIdx > 0 ? player.party[activeActorIdx - 1] || null : null;
      const isPureTankKeyTurn = Boolean(activeAllyForKeys && isPureTankSummon(activeAllyForKeys));
      const activeSkillIds = activeAllyForKeys
        ? getAllyAvailableSkills(activeAllyForKeys)
        : Object.entries(player.skillLevels)
            .filter(([id, lv]) => lv > 0 && id !== 'necromancy')
            .map(([id]) => id);
      const usableItems = Object.entries(player.inventory).filter(
        ([itemId, count]) => count > 0 && CONFIG.ITEMS[itemId]?.combatUsable
      );
      const maxActionIdx = activeActorIdx === 0 ? 5 : 3;

      // ESC / Backspace cancels Sub-Menus cleanly back to Action Dock
      if (key === 'escape' || e.key === 'Backspace') {
        e.preventDefault();
        sfx.playSfx('ui_move');
        if (combatFocusPhase === 'skills_menu' || combatFocusPhase === 'items_menu') {
          setCombatMenuMode('main');
          setCombatFocusPhase('action');
        }
        return;
      }

      // Number Hotkeys 1..6 for fast action selection
      if ((e.key === '1' || e.code === 'Digit1') && !isPureTankKeyTurn) {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.();
        sfx.playSfx('ui_confirm');
        setCombatActionCursor(0);
        setPendingSkillId(null);
        setCombatMenuMode('main');
        setCombatFocusPhase('action');
        snapLimbFocus();
        setPendingAction('ATTACK');
        return;
      }
      if ((e.key === '2' || e.code === 'Digit2') && activeSkillIds.length > 0) {
        e.preventDefault();
        sfx.playSfx('ui_confirm');
        setCombatActionCursor(1);
        setCombatSubCursor(0);
        setCombatMenuMode('skills');
        setCombatFocusPhase('skills_menu');
        return;
      }
      if (e.key === '3' || e.code === 'Digit3') {
        e.preventDefault();
        setCombatActionCursor(2);
        setCombatMenuMode('main');
        setCombatFocusPhase('action');
        runCombatTurn('GUARD');
        return;
      }
      if ((e.key === '4' || e.code === 'Digit4') && usableItems.length > 0) {
        e.preventDefault();
        sfx.playSfx('ui_confirm');
        setCombatActionCursor(3);
        setCombatSubCursor(0);
        setCombatMenuMode('items');
        setCombatFocusPhase('items_menu');
        return;
      }
      if ((e.key === '5' || e.code === 'Digit5') && activeActorIdx === 0) {
        e.preventDefault();
        setCombatActionCursor(4);
        setCombatMenuMode('main');
        setCombatFocusPhase('action');
        runCombatTurn('TALK');
        return;
      }
      if ((e.key === '6' || e.code === 'Digit6') && activeActorIdx === 0) {
        e.preventDefault();
        setCombatActionCursor(5);
        setCombatMenuMode('main');
        setCombatFocusPhase('action');
        runCombatTurn('FLEE');
        return;
      }

      // PHASE 1: Left Action Dock Navigation (A/D/ArrowLeft/ArrowRight are strict no-ops; only ESC/Backspace cancels sub-menus)
      if (combatFocusPhase === 'action') {
        if (
          key === 'a' ||
          key === 'd' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'Tab'
        ) {
          e.preventDefault();
          return;
        }
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
        if (e.key === 'Enter' || e.key === ' ' || key === 'f') {
          e.preventDefault();
          if (combatActionCursor === 0 && !isPureTankKeyTurn) {
            (document.activeElement as HTMLElement | null)?.blur?.();
            sfx.playSfx('ui_confirm');
            setPendingSkillId(null);
            setCombatMenuMode('main');
            snapLimbFocus();
            setPendingAction('ATTACK');
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
        if (key === 'w' || key === 'a' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
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
        if (e.key === 'Enter' || e.key === ' ' || key === 'f') {
          e.preventDefault();
          const skId = activeSkillIds[combatSubCursor % activeSkillIds.length];
          const sk = CONFIG.SKILLS.find((s) => s.id === skId);
          if (!sk) return;
          const curMind = activeAllyForKeys ? activeAllyForKeys.mind : player.mind;
          const holyCheck = !activeAllyForKeys ? canUseHolySkill(player, sk) : { allowed: true };
          const lockedByHoly = !holyCheck.allowed;
          if (curMind < sk.mindCost || lockedByHoly) {
            setCombatLogs((prev) =>
              appendCombatLogEntries(prev, [
                lockedByHoly
                  ? holyCheck.reason || HOLY_MOTHER_REFUSAL_MSG
                  : LOG_TEXT.NO_ENOUGH_MIND,
              ])
            );
            return;
          }
          if (SELF_UTILITY_SKILLS.has(sk.id)) {
            setCombatMenuMode('main');
            setCombatFocusPhase('action');
            runCombatTurn('SKILL', { limbId: selectedLimbIdRef.current, skillId: sk.id });
          } else {
            (document.activeElement as HTMLElement | null)?.blur?.();
            sfx.playSfx('ui_confirm');
            setPendingSkillId(sk.id);
            setCombatMenuMode('main');
            setCombatFocusPhase('action');
            snapLimbFocus();
            setPendingAction('SKILL');
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
        if (key === 'w' || key === 'a' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
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
        if (e.key === 'Enter' || e.key === ' ' || key === 'f') {
          e.preventDefault();
          const picked = usableItems[combatSubCursor % usableItems.length];
          if (!picked) return;
          setCombatMenuMode('main');
          setCombatFocusPhase('action');
          runCombatTurn('ITEM', { limbId: selectedLimbIdRef.current, itemId: picked[0] });
          return;
        }
        return;
      }
      return;
    }

    if (screen === 'prologue') {
      const pKey = e.key.toLowerCase();
      if (prologueFrame < 2) {
        if (e.key === 'Enter' || e.key === ' ' || pKey === 'f') {
          e.preventDefault();
          sfx.playSfx('ui_confirm');
          setPrologueFrame((f) => (f + 1) as 0 | 1 | 2);
        }
        return;
      }
      if (prologueFrame === 2 && introStepOutcome) {
        if (e.key === 'Enter' || e.key === ' ' || pKey === 'f') {
          e.preventDefault();
          confirmIntroOutcome();
        }
        return;
      }
    }

    if (e.key.toLowerCase() === 'escape' && showSkipProloguePrompt) {
      setShowSkipProloguePrompt(false);
      return;
    }

    if (e.key.toLowerCase() === 'escape' && titleSettingsOpen) {
      setTitleSettingsOpen(false);
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
    } else if (key === 't') {
      e.preventDefault();
      handleLightTorchOrLamp();
    }
  };

  // Bind global keydown listener exactly once to avoid re-binding on every render/tick
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keydownHandlerRef.current(e);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
          const w = CANVAS_STAGE_DIMS.WIDTH;
          const h = CANVAS_STAGE_DIMS.HEIGHT;
          const scaleX = canvas.width / w;
          const scaleY = canvas.height / h;

          ctx.save();
          ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, w, h);

          // Apply Damage-Proportional Screen Shake (Crit = 25px, >500 Dmg = 15px)
          ctx.translate(engine.currentShakeX, engine.currentShakeY);

          const tpl = CONFIG.ENEMIES[activeCombatEnemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
          const nowSec = now * 0.001;

          // 1. High-Res Floor Backdrop Image (/assets/combat/bg_floor1..3.jpg + vignette) with Dark Gothic Canvas fallback
          drawCombatBackdrop(
            ctx,
            w,
            h,
            currentRoom.floor,
            nowSec,
            currentRoom.isExterior ? 'F2_EXTERIOR' : currentRoom.id
          );

          // 2. Central High-Res Transparent PNG Monster (with destination-out limb severing) or Dark Gothic Canvas fallback
          const severedSet = new Set<string>(activeCombatEnemy.severedLimbs);
          for (const liveLimb of activeCombatEnemy.limbs) {
            if (liveLimb.hp <= 0) severedSet.add(liveLimb.id);
          }
          const animState = engine.getStageAnimState();

          const scaleDims = CANVAS_STAGE_DIMS.ENEMY_BY_SCALE[tpl.spriteScale];
          const enemyW = scaleDims.w;
          const enemyH = scaleDims.h;
          const enemyX = w * 0.5 - enemyW * 0.5;
          const enemyY = h * 0.015;

          const maskBoxByLimbId = new Map(tpl.limbs.map((l) => [l.id, l.maskBox]));
          const pngLimbEntries = activeCombatEnemy.limbs.map((l) => ({
            id: l.id,
            hp: l.hp,
            severed: severedSet.has(l.id) || l.hp <= 0,
            maskBox: maskBoxByLimbId.get(l.id),
          }));

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
            engine.breathPhase,
            currentRoom.floor,
            {
              combatSpriteUrl: tpl.combatSpriteUrl,
              limbs: pngLimbEntries,
              nowSec,
              selectedLimbId: !activeCombatEnemy.defeated ? selectedLimbIdRef.current : undefined,
              timeMs: now,
            }
          );

          // Render Eased Blade Slash Arcs & Physics Particles (gravity = 0.5)
          engine.renderCanvasEffects(ctx);

          // 3. Foreground Party Back-Sprites (read via refs so RAF loop avoids restarting on stat ticks)
          const livePlayer = playerRef.current;
          const liveActorIdx = activeActorIdxRef.current;
          const partyShakeX = animState === 'playerHit' ? Math.sin(now * 0.08) * 10 : 0;
          const livingSprites: Array<{
            spriteKey: string;
            arms: { leftArm: boolean; rightArm: boolean };
            actorIdx: number;
          }> = [
            {
              spriteKey: livePlayer.classId,
              arms: { leftArm: livePlayer.limbs.leftArm, rightArm: livePlayer.limbs.rightArm },
              actorIdx: 0,
            },
            ...livePlayer.party
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
            if (member.actorIdx === liveActorIdx) {
              ctx.save();
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.78)';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.ellipse(bx + spriteScaleW * 0.5, by + spriteScaleH * 0.9, spriteScaleW * 0.34, 11, 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
            const memberClassDef = CONFIG.CLASSES.find((c) => c.id === member.spriteKey);
            drawPartyBackSprite(
              ctx,
              member.spriteKey,
              bx,
              by,
              spriteScaleW,
              spriteScaleH,
              member.arms,
              animState === 'playerAttack' && member.actorIdx === liveActorIdx,
              animState === 'playerHit',
              currentRoom.floor,
              nowSec,
              memberClassDef?.combatSpriteUrl
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

          // 4. Render Floating Combat Damage Numbers / Miss Callouts with smooth delta-time fade
          for (const ft of engine.floatingTexts) {
            const alpha = Math.max(0, Math.min(1, ft.lifeMs / ft.maxLifeMs));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = "bold 20px 'Noto Serif', serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
            ctx.strokeText(ft.text, ft.x, ft.y);
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
  }, [
    screen,
    activeCombatEnemy,
    currentRoom.floor,
    currentRoom.id,
    currentRoom.isExterior,
  ]);

  const renderCoinTossModal = () => (
    <CoinTossModal
      coinToss={coinToss}
      shiftHeld={shiftHeld}
      coinCursorSide={coinCursorSide}
      setCoinCursorSide={setCoinCursorSide}
      luckyCoinCount={player.inventory.lucky_coin || 0}
      lockpickCount={player.inventory.lockpick || 0}
      onChooseCoinSide={handleChooseCoinSide}
      onUseLockpick={() => {
        const lp = coinToss?.onLockpick;
        setCoinToss(null);
        lp?.();
      }}
      onConfirmOutcome={confirmCoinTossOutcome}
    />
  );

  // ============================================================================
  // RENDER: TITLE SCREEN
  // ============================================================================
  if (screen === 'title') {
    return (
      <>
        <TitleScreen
          titleStep={titleStep}
          setTitleStep={setTitleStep}
          characterNameInput={characterNameInput}
          setCharacterNameInput={setCharacterNameInput}
          selectedClassId={selectedClassId}
          setSelectedClassId={setSelectedClassId}
          selectedDifficulty={selectedDifficulty}
          setSelectedDifficulty={setSelectedDifficulty}
          portraitErrorMap={portraitErrorMap}
          onMarkPortraitError={markPortraitError}
          saveSlots={saveSlots}
          titleSaveModalOpen={titleSaveModalOpen}
          setTitleSaveModalOpen={setTitleSaveModalOpen}
          showSkipProloguePrompt={showSkipProloguePrompt}
          setShowSkipProloguePrompt={setShowSkipProloguePrompt}
          onGenerateRandomName={generateRandomCharacterName}
          onLoadSlot={loadFromSlot}
          onDeleteSlot={deleteSaveSlot}
          onStartDirectIntoExterior={startDirectIntoExterior}
          onEnterPrologue={() => enterPrologue()}
          onOpenSettings={() => setTitleSettingsOpen(true)}
        />
        {titleSettingsOpen && (
          <SettingsModal
            isTitleScreen
            world={world}
            playerPos={playerPos}
            audioSettings={audioSettings}
            setAudioSettings={setAudioSettings}
            setMuted={setMuted}
            confirmReturnTitle={confirmReturnTitle}
            setConfirmReturnTitle={setConfirmReturnTitle}
            onOpenSaves={() => {}}
            onReturnToTitle={() => {}}
            onClose={() => setTitleSettingsOpen(false)}
          />
        )}
      </>
    );
  }

  // ============================================================================
  // RENDER: 3-FRAME ILLUSTRATED PROLOGUE & BACKSTORY CHOICE
  // ============================================================================
  if (screen === 'prologue') {
    return (
      <PrologueScreen
        player={player}
        setPlayer={setPlayer}
        setWorld={setWorld}
        setPreviewItemId={setPreviewItemId}
        prologueFrame={prologueFrame}
        setPrologueFrame={setPrologueFrame}
        backstoryChosen={backstoryChosen}
        introStepIdx={introStepIdx}
        introStepOutcome={introStepOutcome}
        setIntroStepOutcome={setIntroStepOutcome}
        onConfirmIntroOutcome={confirmIntroOutcome}
      />
    );
  }

  // ============================================================================
  // RENDER: FULL-BLEED PANORAMIC 16:9 ENDING SCREEN
  // ============================================================================
  if (screen === 'ending' && endingInfo) {
    return (
      <EndingScreen
        endingInfo={endingInfo}
        worldSeed={world.seed}
        seedInput={seedInput}
        setSeedInput={setSeedInput}
        playerClassId={player.classId}
        onGenerateRandomSeed={generateRandomSeed}
        onStartNewRun={(freshSeed, classId) => enterPrologue(freshSeed, classId)}
        onReturnToTitle={() => setScreen('title')}
      />
    );
  }

  // ============================================================================
  // RENDER: FIRST-PERSON PARTY COMBAT STAGE (68% UPPER / 32% LOWER SILVER DOCK)
  // ============================================================================
  if (screen === 'combat' && activeCombatEnemy) {
    return (
      <CombatStageView
        combatStageCanvasRef={combatStageCanvasRef}
        combatEngine={combatEngineRef.current}
        activeCombatEnemy={activeCombatEnemy}
        player={player}
        combatLogs={combatLogs}
        activeVfx={activeVfx}
        combatNotice={combatNotice}
        screenShakeMode={screenShakeMode}
        isResolvingTurn={isResolvingTurn}
        selectedLimbId={selectedLimbId}
        combatMenuMode={combatMenuMode}
        activeActorIdx={activeActorIdx}
        combatFocusPhase={combatFocusPhase}
        combatActionCursor={combatActionCursor}
        combatSubCursor={combatSubCursor}
        pendingAction={pendingAction}
        pendingSkillId={pendingSkillId}
        coinTossNode={renderCoinTossModal()}
        onHoverLimb={(limbId) => {
          if (isResolvingTurnRef.current || activeCombatEnemy.defeated) return;
          syncSelectedLimbId(limbId);
        }}
        onClickLimb={(limbId) => {
          if (isResolvingTurnRef.current || activeCombatEnemy.defeated) return;
          const activeAllyClick = activeActorIdx > 0 ? player.party[activeActorIdx - 1] || null : null;
          if (pendingAction === null && activeAllyClick && isPureTankSummon(activeAllyClick)) {
            return;
          }
          (document.activeElement as HTMLElement | null)?.blur?.();
          const tpl = CONFIG.ENEMIES[activeCombatEnemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
          if (pendingAction === null) {
            const validLimbId = resolveNearestValidLimbId(activeCombatEnemy, tpl, limbId);
            syncSelectedLimbId(validLimbId);
            sfx.playSfx('ui_confirm');
            setCombatMenuMode('main');
            setCombatFocusPhase('action');
            setPendingSkillId(null);
            setPendingAction('ATTACK');
            return;
          }
          const targetCheck = canTargetEnemyLimb(activeCombatEnemy, tpl, limbId);
          if (!targetCheck.allowed) {
            sfx.playSfx('ui_move');
            setCombatLogs((prev) =>
              appendCombatLogEntries(prev, [
                targetCheck.reason || LOG_TEXT.SHIELDED_LIMB_FALLBACK,
              ])
            );
            return;
          }
          syncSelectedLimbId(limbId);
          if (pendingAction === 'SKILL' && pendingSkillId) {
            const skId = pendingSkillId;
            setPendingAction(null);
            setPendingSkillId(null);
            runCombatTurn('SKILL', { limbId, skillId: skId });
          } else {
            setPendingAction(null);
            setPendingSkillId(null);
            runCombatTurn('ATTACK', { limbId });
          }
        }}
        onVictoryExit={() => handleCombatEnd({ defeatedEnemyUid: activeCombatEnemy.uid })}
      />
    );
  }

  // ============================================================================
  // RENDER: EXPLORATION MODE (PLAYING)
  // ============================================================================
  return (
    <div className="h-screen w-screen bg-[#070609] text-[#e7dcc8] flex flex-col overflow-hidden select-none">
      <ExplorationHeaderBar
        player={player}
        currentRoom={currentRoom}
        muted={muted}
        onLightTorch={handleLightTorchOrLamp}
        onOpenInventory={() => setActiveModal('inventory')}
        onOpenLore={() => setActiveModal('lore')}
        onOpenGuide={() => setActiveModal('guide')}
        onOpenSettings={() => {
          setConfirmReturnTitle(false);
          setActiveModal('settings');
        }}
        onToggleMute={() => {
          const nextMuted = !muted;
          const updated = sfx.updateSettings({ muted: nextMuted });
          setAudioSettings(updated);
          setMuted(nextMuted);
        }}
      />

      {/* Main Content: Full-Bleed 16:9 Dungeon Stage (94vw, max 1680px) */}
      <div className="flex-1 min-h-0 w-[94vw] max-w-[1680px] mx-auto py-1.5 flex flex-col">
        <div className="w-full h-full min-h-0 flex flex-col gap-2">
          {/* Canvas Container */}
          <div className="relative flex-1 min-h-0 flex flex-col df-panel overflow-hidden">
            {/* Minimalist Fading Top-Left Area Typography */}
            <div
              key={areaBannerKey}
              className="zone-title-toast absolute top-3.5 left-4 z-10 pointer-events-none select-none"
            >
              <div
                className="text-xl sm:text-2xl font-semibold tracking-wide text-[#f2ead9]"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  textShadow: '0 2px 10px rgba(0,0,0,0.96), 0 0 4px rgba(0,0,0,0.92)',
                }}
              >
                {areaBannerText}
              </div>
            </div>

            <div className="relative flex-1 min-h-0 w-full h-full bg-[#050407] overflow-hidden">
              <DungeonMapViewport
                room={currentRoom}
                worldSeed={world.seed}
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
                    const targetTile = currentRoom.grid[ty]?.[tx];
                    if (
                      targetTile !== undefined &&
                      !isWalkableTile(targetTile, currentRoom.shortcutOpened)
                    ) {
                      if (
                        targetTile === TILE.CRACKED_WALL ||
                        targetTile === TILE.SHORTCUT_GATE ||
                        targetTile === TILE.BLOOD_THRONE ||
                        NPC_TILE_SET.has(targetTile)
                      ) {
                        handleTileInteraction();
                      }
                    } else {
                      attemptMove(dx, dy);
                    }
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

            <ExplorationDialogueOverlay
              interactionMenu={interactionMenu}
              logOverlayVisible={logOverlayVisible}
              narrativeLogs={narrativeLogs}
              onHoverChoice={(idx) =>
                setInteractionMenu((prev) => (prev ? { ...prev, selectedIndex: idx } : null))
              }
              onDismissLogOverlay={() => setLogOverlayVisible(false)}
            />

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

      <ExplorationModalLayer
        activeModal={activeModal}
        player={player}
        setPlayer={setPlayer}
        world={world}
        setWorld={setWorld}
        currentRoom={currentRoom}
        playerPos={playerPos}
        invTab={invTab}
        setInvTab={setInvTab}
        isAmputating={isAmputating}
        setIsAmputating={setIsAmputating}
        sawTargetMemberIdx={sawTargetMemberIdx}
        setSawTargetMemberIdx={setSawTargetMemberIdx}
        selectedInvMemberIdx={selectedInvMemberIdx}
        setSelectedInvMemberIdx={setSelectedInvMemberIdx}
        selectedEquipSlot={selectedEquipSlot}
        setSelectedEquipSlot={setSelectedEquipSlot}
        previewItemId={previewItemId}
        setPreviewItemId={setPreviewItemId}
        invFeedback={invFeedback}
        setInvFeedback={setInvFeedback}
        torchLowWarnedRef={torchLowWarnedRef}
        loreModalTab={loreModalTab}
        setLoreModalTab={setLoreModalTab}
        selectedLoreBookId={selectedLoreBookId}
        setSelectedLoreBookId={setSelectedLoreBookId}
        hexenTab={hexenTab}
        setHexenTab={setHexenTab}
        selectedHexenSkillId={selectedHexenSkillId}
        setSelectedHexenSkillId={setSelectedHexenSkillId}
        hexenFeedback={hexenFeedback}
        setHexenFeedback={setHexenFeedback}
        saveSlots={saveSlots}
        guideTab={guideTab}
        setGuideTab={setGuideTab}
        audioSettings={audioSettings}
        setAudioSettings={setAudioSettings}
        setMuted={setMuted}
        confirmReturnTitle={confirmReturnTitle}
        setConfirmReturnTitle={setConfirmReturnTitle}
        onSetActiveModal={setActiveModal}
        onAddLog={addLog}
        onShowLogOverlay={() => setLogOverlayVisible(true)}
        onPromptCrackedWallExplosion={() => {
          setActiveModal(null);
          promptCrackedWallExplosion();
        }}
        onTriggerNightHunterElixirEnding={(pCopy) => {
          setActiveModal(null);
          setInteractionMenu({
            title: 'ĐỘC HÓA ĐÁ ĐÃ TAN',
            description:
              'Bạn uống cạn [Tiên Dược Nguyên Sơ], lớp vảy đá xám rạn vỡ rơi xuống nền đá và Kết Giới Chướng Khí đã tan biến. Bạn muốn rời khỏi Thung Lũng hay ở lại đáy Vực Sao?',
            selectedIndex: 0,
            choices: [
              {
                label: 'Rời khỏi Thung Lũng Xương Tàn',
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
                label: 'Ở lại đáy Vực Sao',
                onSelect: () => {
                  setInteractionMenu(null);
                  addLog('Bạn quyết định ở lại đáy Vực Sao để đối mặt với Vết Rách Không Gian.');
                  setLogOverlayVisible(true);
                },
              },
            ],
          });
        }}
        onTriggerVoidPortal={(destId) => {
          setActiveModal(null);
          triggerCoinToss('CỔNG HƯ VÔ', '', (won) => {
            if (!won) {
              setPlayer((prev) => ({
                ...prev,
                hp: Math.max(5, prev.hp - 12),
                mind: Math.max(0, prev.mind - 15),
              }));
              addLog('Khe nứt Hư Vô cào rách da thịt trong khoảnh khắc xuyên qua không gian!');
            } else {
              addLog('Bước qua Cổng Hư Vô bình yên vô sự!');
            }
            movePlayerToRoom(destId, 'spawn');
          });
        }}
        onSaveSlot={(idx) => {
          saveToSlot(idx);
          setActiveModal(null);
          setLogOverlayVisible(true);
        }}
        onLoadSlot={(idx) => loadFromSlot(idx)}
        onDeleteSlot={(idx) => deleteSaveSlot(idx)}
        onReturnToTitle={() => {
          setConfirmReturnTitle(false);
          setActiveModal(null);
          setInteractionMenu(null);
          setScreen('title');
        }}
      />

      {renderCoinTossModal()}
    </div>
  );
}
