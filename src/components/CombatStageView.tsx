import React from 'react';
import { CONFIG, WeaponCategory } from '../game/config';
import { getLimbReticlePositions } from '../game/pixelArt';
import { MapEnemyInstance } from '../game/mapGen';
import {
  PlayerState,
  getEffectiveWeapon,
  getAllyEffectiveWeapon,
  getAllyAvailableSkills,
  canTargetEnemyLimb,
  isPlayerPanicking,
  isPureTankSummon,
  canUseHolySkill,
  isEnemyWeaponLimbSevered,
} from '../game/combat';
import { CombatEngine } from '../game/combatEngine';
import { ItemArtworkCanvas } from './CanvasWidgets';

export type CombatMenuMode = 'main' | 'skills' | 'items';
export type CombatFocusPhase = 'action' | 'skills_menu' | 'items_menu';

export interface CombatVfxState {
  category: WeaponCategory;
  color: string;
  key: number;
}

const combatLogsKeyMap = new WeakMap<string[], number>();
let nextCombatLogsKey = 1;

function getCombatLogsKey(logs: string[]): number {
  let id = combatLogsKeyMap.get(logs);
  if (id === undefined) {
    id = nextCombatLogsKey++;
    combatLogsKeyMap.set(logs, id);
  }
  return id;
}

export interface CombatStageViewProps {
  combatStageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  combatEngine: CombatEngine;
  activeCombatEnemy: MapEnemyInstance;
  player: PlayerState;
  combatLogs: string[];
  activeVfx: CombatVfxState | null;
  screenShakeMode: 'none' | 'normal' | 'heavy';
  isResolvingTurn: boolean;
  selectedLimbId: string;
  combatMenuMode: CombatMenuMode;
  activeActorIdx: number;
  combatFocusPhase: CombatFocusPhase;
  combatActionCursor: number;
  combatSubCursor: number;
  pendingAction: 'ATTACK' | 'SKILL' | null;
  pendingSkillId: string | null;
  coinTossNode?: React.ReactNode;
  onHoverLimb?: (limbId: string) => void;
  onClickLimb?: (limbId: string) => void;
  onVictoryExit?: () => void;
}

export const CombatStageView: React.FC<CombatStageViewProps> = ({
  combatStageCanvasRef,
  combatEngine,
  activeCombatEnemy,
  player,
  combatLogs,
  activeVfx,
  screenShakeMode,
  isResolvingTurn,
  selectedLimbId,
  combatMenuMode,
  activeActorIdx,
  combatFocusPhase,
  combatActionCursor,
  combatSubCursor,
  pendingAction,
  pendingSkillId: _pendingSkillId,
  coinTossNode,
  onHoverLimb,
  onClickLimb,
  onVictoryExit,
}) => {
  const [hoveredLimbId, setHoveredLimbId] = React.useState<string | null>(null);
  const tpl = CONFIG.ENEMIES[activeCombatEnemy.templateId] || CONFIG.ENEMIES.fanatic_zealot;
  const reticleMap = getLimbReticlePositions(tpl.spriteKey);
  const activeAlly = activeActorIdx > 0 ? player.party[activeActorIdx - 1] || null : null;
  const isPureTankTurn = Boolean(activeAlly && isPureTankSummon(activeAlly));
  const actingName = activeAlly ? activeAlly.name : player.name;
  const activeWeapon = activeAlly ? getAllyEffectiveWeapon(activeAlly) : getEffectiveWeapon(player);
  const activeSkillIds = activeAlly
    ? getAllyAvailableSkills(activeAlly)
    : Object.entries(player.skillLevels)
        .filter(([id, lv]) => lv > 0 && id !== 'necromancy')
        .map(([id]) => id);

  const usableCombatItems = Object.entries(player.inventory).filter(
    ([itemId, count]) => count > 0 && CONFIG.ITEMS[itemId]?.combatUsable
  );

  const currentTargetLimb =
    activeCombatEnemy.limbs.find((l) => l.id === selectedLimbId) || activeCombatEnemy.limbs[0];
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
        {activeCombatEnemy.telegraphCoinFlip && (
          <div
            className="pointer-events-none absolute inset-0 z-10 animate-pulse"
            style={{ boxShadow: 'inset 0 0 95px rgba(185, 28, 28, 0.55)' }}
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
                <span>
                  Hiệp #{activeCombatEnemy.turnCount + 1} • {activeCombatEnemy.customName || tpl.name}
                </span>
                {enemyWeaponLost && (
                  <span className="px-1.5 py-0.5 bg-[#2a0c10] border border-[#8b0000] text-[11px] text-[#e5cfa0]">
                    Mất Tay Vũ Khí — Đòn Tay Không
                  </span>
                )}
                {(player.poisonCoatTurns || 0) > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#0e2618] border border-[#4ade80] text-[11px] text-[#4ade80]">
                    [TẨM ĐỘC · {player.poisonCoatTurns} đòn]
                  </span>
                )}
                {(player.fireCoatTurns || 0) > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#2c1507] border border-[#f59e0b] text-[11px] text-[#fbbf24]">
                    [DẦU LỬA · {player.fireCoatTurns} đòn]
                  </span>
                )}
                {isResolvingTurn && (
                  <span className="text-[11px] text-[#c5a059] animate-pulse">
                    ✦ Đang giao phong...
                  </span>
                )}
              </div>
              {!activeCombatEnemy.telegraphCoinFlip && activeCombatEnemy.telegraphing && (
                <div className="text-sm mt-0.5 text-[#fbbf24] font-semibold">
                  {`▸ SẮP TUNG: [${tpl.telegraphName}]`}
                </div>
              )}
            </div>
            <div className="flex items-center shrink-0 text-xs sm:text-sm uppercase tracking-wider text-[#c5a059] font-mono font-bold">
              <span>⌖ {currentTargetLimb?.name}</span>
            </div>
          </div>

          {activeCombatEnemy.telegraphCoinFlip && (
            <div className="mt-1 px-4 py-1.5 bg-[#2a070b]/95 border border-[#dc2626] shadow-[0_0_18px_rgba(220,38,38,0.45)] text-xs sm:text-sm text-[#fca5a5] font-bold tracking-wide animate-pulse">
              {`▸ TỬ THẦN BÁO TRƯỚC: [${tpl.coinFlipSkill?.name || tpl.telegraphName}] — Bấm [3] PHÒNG THỦ hoặc chuẩn bị Tung Xu!`}
            </div>
          )}
        </div>

        {/* Center Responsive 16:11 Unified Canvas Stage with Weapon VFX & Minimalist Anatomical Reticles */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center py-0.5 relative z-10">
          <div className="relative h-full aspect-[16/11] max-w-full flex items-center justify-center">
            <canvas
              ref={combatStageCanvasRef}
              width={1280}
              height={880}
              className="w-full h-full pointer-events-none relative z-10"
            />

            {activeVfx && activeVfx.category !== 'unarmed' && (
              <div
                key={activeVfx.key}
                className={`vfx-overlay vfx-${activeVfx.category.replace(/_/g, '-')} z-20`}
                style={{ '--vfx-color': activeVfx.color } as React.CSSProperties}
              />
            )}

            {/* Compact On-Body Anatomical Target Hitboxes & Pixel-Art Debuff Badges */}
            {!activeCombatEnemy.defeated &&
              activeCombatEnemy.limbs.map((limb, idx) => {
                const pos = reticleMap[limb.id] || {
                  nx: 0.25 + (idx % 2) * 0.5,
                  ny: 0.25 + Math.floor(idx / 2) * 0.22,
                };
                const isSevered =
                  limb.hp <= 0 || activeCombatEnemy.severedLimbs.includes(limb.id);
                const badges = combatEngine.getLimbBadges(activeCombatEnemy, limb.id);

                return (
                  <div
                    key={limb.id}
                    style={{
                      left: `${pos.nx * 100}%`,
                      top: `${pos.ny * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="pointer-events-none absolute z-20"
                  >
                    {/* Pixel-Art Debuff Status Badges with Remaining Turn Count right above the Limb */}
                    {!isSevered && badges.length > 0 && (
                      <div className="flex items-center justify-center gap-1 mb-0.5 pointer-events-none">
                        {badges.map((b) => (
                          <span
                            key={b.type}
                            style={{ borderColor: b.color, color: b.color }}
                            className="px-1.5 py-0.5 bg-[#09070d]/95 border text-[11px] font-mono font-bold flex items-center gap-0.5 shadow"
                          >
                            <span>
                              [{b.label} {b.turns}T]
                            </span>
                          </span>
                        ))}
                      </div>
                    )}

                    {isSevered ? (
                      <div
                        className="pointer-events-none select-none flex items-center gap-1 px-1.5 py-0.5 bg-[#160608]/85 border border-[#7f1d1d]/75 opacity-75"
                        aria-hidden="true"
                      >
                        <span className="text-[10px] text-[#dc2626] font-bold leading-none">✕</span>
                        <span className="text-[10px] text-[#8f6a6a] line-through whitespace-nowrap leading-none">
                          {limb.name}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={limb.name}
                        onMouseEnter={() => {
                          setHoveredLimbId(limb.id);
                          onHoverLimb?.(limb.id);
                        }}
                        onMouseLeave={() =>
                          setHoveredLimbId((cur) => (cur === limb.id ? null : cur))
                        }
                        onClick={() => onClickLimb?.(limb.id)}
                        className={`pointer-events-auto relative w-11 h-11 bg-transparent border-0 cursor-pointer focus:outline-none flex items-center justify-center ${
                          limb.id === selectedLimbId ? 'limb-target-pulse' : ''
                        }`}
                      >
                        {limb.id === selectedLimbId && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none block w-7 h-7 rounded-full border border-[#fff8e7]/65 bg-[#fff8e7]/12 shadow-[0_0_12px_rgba(255,250,235,0.45)]"
                          />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Fixed Bottom-Right Limb Damage Preview Tooltip */}
          {!activeCombatEnemy.defeated &&
            (pendingAction !== null || hoveredLimbId !== null) &&
            (() => {
              const tooltipLimb =
                (hoveredLimbId
                  ? activeCombatEnemy.limbs.find((l) => l.id === hoveredLimbId)
                  : null) || currentTargetLimb;
              if (
                !tooltipLimb ||
                tooltipLimb.hp <= 0 ||
                activeCombatEnemy.severedLimbs.includes(tooltipLimb.id)
              ) {
                return null;
              }
              const targetable = canTargetEnemyLimb(activeCombatEnemy, tpl, tooltipLimb.id).allowed;
              const preview = combatEngine.getDamagePreview(
                player,
                activeCombatEnemy,
                tpl,
                tooltipLimb,
                activeActorIdx
              );
              return (
                <div className="pointer-events-none absolute bottom-3 right-3 z-30 df-card-active px-2.5 py-1.5 ring-1 ring-[#fbbf24] whitespace-nowrap space-y-0.5 shadow-[0_0_16px_rgba(0,0,0,0.9)]">
                  <div className="text-xs font-bold text-[#e7dcc8]">
                    ⌖ {tooltipLimb.name}
                    {!targetable && <span className="text-[#fca5a5] ml-1.5">[KHÓA]</span>}
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] font-mono">
                    <span className="text-[#fca5a5]">
                      {preview.minDmg}-{preview.maxDmg} ST
                    </span>
                    <span className="text-[#86efac]">{preview.hitPct}% Trúng</span>
                    <span className="text-[#fde047]">{preview.critPct}% CM</span>
                  </div>
                  {preview.armorPoints > 0 && (
                    <div className="text-[11px] font-mono text-[#94a3b8]">
                      Giáp: {preview.armorPoints} (-{preview.armorReductionPct}%)
                    </div>
                  )}
                </div>
              );
            })()}
        </div>

        {/* Bottom Strip of Upper Stage: Recent Combat Log Line & Active Weapon Hint */}
        <div className="z-20 w-full bg-[#0b090f]/90 border-t border-[#3a3a3a] px-5 py-1.5 flex items-center justify-between gap-4 text-xs sm:text-sm">
          <div className="text-[#d3d3d3] flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
            <span className="text-[#c5a059] font-bold shrink-0">Diễn biến:</span>
            {combatLogs[0] ? (
              <span key={getCombatLogsKey(combatLogs)} className="min-w-0 combat-log-slide-in">
                {combatLogs[0]}
              </span>
            ) : null}
          </div>
          <div className="text-[#a3998f] shrink-0 hidden md:block text-xs">
            Vũ khí: <span className="text-[#d3d3d3] font-semibold">{activeWeapon.name}</span>
          </div>
        </div>
      </div>

      {/* LOWER 30% COMPACT DARK FANTASY CONTROL DOCK (~70% UPPER ARENA STAGE) */}
      <div className="h-[30%] min-h-[210px] w-full bg-[#08070b] p-2 flex gap-2.5">
        {/* LEFT BOX (275px): Vertical Serif Command Buttons with Number Hotkeys */}
        <div className="w-[265px] sm:w-[285px] shrink-0 df-panel p-2 flex flex-col justify-between gap-0.5 overflow-y-auto pointer-events-none">
          {!activeCombatEnemy.defeated ? (
            <>
              <div className="text-xs font-bold uppercase tracking-wider text-[#c5a059] px-1 truncate border-b border-[#3a3a3a] pb-0.5">
                Lượt: {actingName}
              </div>
              <div
                className={`w-full py-0.5 px-2.5 text-left text-sm font-bold truncate ${
                  isPureTankTurn || isResolvingTurn
                    ? 'df-btn opacity-45'
                    : pendingAction === 'ATTACK' ||
                      (pendingAction === null &&
                        combatFocusPhase === 'action' &&
                        combatActionCursor === 0)
                    ? 'df-btn-active ring-1 ring-[#fbbf24]'
                    : 'df-btn'
                }`}
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {isPureTankTurn ? '[1] Khóa Công (Thuần Thủ)' : '[1] Tấn Công'}
              </div>
              <div
                className={`w-full py-0.5 px-2.5 text-left text-sm font-bold ${
                  pendingAction === 'SKILL' ||
                  combatMenuMode === 'skills' ||
                  (pendingAction === null &&
                    combatFocusPhase === 'action' &&
                    combatActionCursor === 1)
                    ? 'df-btn-active ring-1 ring-[#fbbf24]'
                    : 'df-btn'
                } ${activeSkillIds.length === 0 ? 'opacity-45' : ''}`}
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                [2] ✦ K.Năng ({activeSkillIds.length})
              </div>
              <div
                className={`w-full py-0.5 px-2.5 text-left text-sm font-bold ${
                  (pendingAction === null &&
                    combatFocusPhase === 'action' &&
                    combatActionCursor === 2) ||
                  isPureTankTurn
                    ? 'df-btn-active ring-1 ring-[#fbbf24]'
                    : 'df-btn'
                } ${
                  activeCombatEnemy.telegraphCoinFlip
                    ? 'border-[#dc2626] text-[#fca5a5]! outline-1 outline-[#dc2626] ring-1 ring-[#fbbf24]/80 animate-pulse'
                    : ''
                }`}
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {isPureTankTurn ? '[3] Thế Thủ Linh Hồn' : '[3] Phòng Thủ'}
              </div>
              <div
                className={`w-full py-0.5 px-2.5 text-left text-sm font-bold ${
                  combatMenuMode === 'items' ||
                  (pendingAction === null &&
                    combatFocusPhase === 'action' &&
                    combatActionCursor === 3)
                    ? 'df-btn-active ring-1 ring-[#fbbf24]'
                    : 'df-btn'
                } ${usableCombatItems.length === 0 ? 'opacity-45' : ''}`}
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                [4] Vật Phẩm ({usableCombatItems.length})
              </div>
              {activeActorIdx === 0 && (
                <>
                  <div
                    className={`w-full py-0.5 px-2.5 text-left text-sm font-bold text-[#9ab08e] ${
                      pendingAction === null &&
                      combatFocusPhase === 'action' &&
                      combatActionCursor === 4
                        ? 'df-btn-active ring-1 ring-[#fbbf24]'
                        : 'df-btn'
                    }`}
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    [5] Trò Chuyện
                  </div>
                  <div
                    className={`w-full py-0.5 px-2.5 text-left text-sm font-bold text-[#a3998f] ${
                      pendingAction === null &&
                      combatFocusPhase === 'action' &&
                      combatActionCursor === 5
                        ? 'df-btn-active ring-1 ring-[#fbbf24]'
                        : 'df-btn'
                    }`}
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    [6] Bỏ Chạy
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="my-auto text-center space-y-2 p-2 pointer-events-auto">
              <div className="text-base font-bold uppercase text-[#c5a059]">Chiến Thắng!</div>
              <button
                type="button"
                onClick={() => onVictoryExit?.()}
                className="pointer-events-auto w-full py-2 df-btn-bronze font-bold text-sm uppercase cursor-pointer"
              >
                Thoát
              </button>
            </div>
          )}
        </div>

        {/* RIGHT BOX: Dynamic Sub-Menu OR Streamlined 2x2 Party Status Cards */}
        <div className="flex-1 df-panel p-2.5 overflow-y-auto flex flex-col justify-between pointer-events-none">
          {combatMenuMode === 'skills' && !activeCombatEnemy.defeated ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-1">
                <span className="text-xs sm:text-sm font-bold uppercase text-[#c5a059]">
                  Chọn Kỹ Năng — {actingName}
                </span>
                <span className="text-xs text-[#a3998f] font-mono">
                  [WASD] Chọn • [F/Enter] Dùng • [ESC] Quay lại
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activeSkillIds.map((skId, sIdx) => {
                  const sk = CONFIG.SKILLS.find((s) => s.id === skId);
                  if (!sk) return null;
                  const lv = activeAlly
                    ? activeAlly.isUndeadSummon
                      ? Math.max(1, player.skillLevels.necromancy || 1)
                      : 1
                    : player.skillLevels[skId] || 1;
                  const curMind = activeAlly ? activeAlly.mind : player.mind;
                  const lockedByHoly = !activeAlly && !canUseHolySkill(player, sk).allowed;
                  const isCursor =
                    combatFocusPhase === 'skills_menu' &&
                    sIdx === combatSubCursor % Math.max(1, activeSkillIds.length);
                  return (
                    <div
                      key={sk.id}
                      className={`p-2 text-left text-xs ${
                        curMind < sk.mindCost || lockedByHoly ? 'opacity-40' : ''
                      } ${isCursor ? 'df-card-active ring-1 ring-[#fbbf24]' : 'df-card'}`}
                    >
                      <div className="flex justify-between font-bold text-[#c5a059]">
                        <span>
                          {sk.name} (Cấp {lv})
                        </span>
                        <span>
                          -{sk.mindCost} Lý Trí{sk.hpCost ? ` • -${sk.hpCost} SL` : ''}
                        </span>
                      </div>
                      <div className="text-xs text-[#d3d3d3] mt-0.5 truncate">
                        {lv <= 1 ? sk.descLv1 : lv === 2 ? sk.descLv2 : sk.descLv3}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : combatMenuMode === 'items' && !activeCombatEnemy.defeated ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-1">
                <span className="text-xs sm:text-sm font-bold uppercase text-[#c5a059]">
                  Chọn Vật Phẩm ({actingName})
                </span>
                <span className="text-xs text-[#a3998f] font-mono">
                  [WASD] Chọn • [F/Enter] Dùng • [ESC] Quay lại
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {usableCombatItems.map(([itemId, count], iIdx) => {
                  const item = CONFIG.ITEMS[itemId];
                  if (!item) return null;
                  const isCursor =
                    combatFocusPhase === 'items_menu' &&
                    iIdx === combatSubCursor % Math.max(1, usableCombatItems.length);
                  return (
                    <div
                      key={itemId}
                      className={`p-2 flex items-center gap-2 text-left text-xs ${
                        isCursor ? 'df-card-active ring-1 ring-[#fbbf24]' : 'df-card'
                      }`}
                    >
                      <ItemArtworkCanvas itemOrWeaponId={itemId} size={32} />
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
            /* STREAMLINED COMPACT PARTY HUD: Name + Status Icons + Slim Thể Xác / Lý Trí Bars */
            <div className="h-full flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#a3998f] border-b border-[#3a3a3a] pb-1">
                <span>Đội Hình ({1 + player.party.filter((a) => a.hp > 0).slice(0, 3).length})</span>
                <span className="font-mono text-[#c5a059]/85">
                  [WASD] Chọn • [F/Enter] Xác nhận • [Shift] Tua • [ESC] Hủy
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 content-start">
                {/* Player Compact Card */}
                {(() => {
                  const isTurn = activeActorIdx === 0 && !activeCombatEnemy.defeated;
                  const lostLimbsCount = (
                    ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as const
                  ).filter((k) => !player.limbs[k]).length;
                  const hasInfection = Object.values(player.limbs.infected).some(Boolean);
                  return (
                    <div
                      className={`px-3 py-2 flex flex-col justify-between gap-1.5 ${
                        isTurn ? 'df-card-active' : 'df-card'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isTurn && <span className="text-[#fbbf24] text-xs font-bold">▸</span>}
                          <span className="text-sm font-bold text-[#e5cfa0] truncate">
                            {player.name}
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap justify-end gap-1 shrink-0">
                          {player.statuses.guarding && (
                            <span
                              className="px-1 py-0.5 bg-[#1f1c14] border border-[#c5a059]/70 text-[#e5cfa0] font-mono text-[9px] font-bold leading-none"
                              title="Phòng Thủ"
                            >
                              [THỦ]
                            </span>
                          )}
                          {(player.statuses.divineAegisTurns || 0) > 0 && (
                            <span
                              className="px-1 py-0.5 bg-[#231d10] border border-[#eab308] text-[#fde047] font-mono text-[9px] font-bold leading-none"
                              title="Hộ Thể"
                            >
                              [HỘ THỂ]
                            </span>
                          )}
                          {player.statuses.bleeding && (
                            <span
                              className="px-1 py-0.5 bg-[#2a0c10] border border-[#b91c1c] text-[#f87171] font-mono text-[9px] font-bold leading-none"
                              title="Chảy Máu"
                            >
                              [CHẢY MÁU]
                            </span>
                          )}
                          {player.statuses.poisoned && (
                            <span
                              className="px-1 py-0.5 bg-[#0f2216] border border-[#16a34a] text-[#4ade80] font-mono text-[9px] font-bold leading-none"
                              title="Trúng Độc"
                            >
                              [ĐỘC]
                            </span>
                          )}
                          {player.statuses.parasite && (
                            <span
                              className="px-1 py-0.5 bg-[#1d1226] border border-[#8e6ca3] text-[#d8b4fe] font-mono text-[9px] font-bold leading-none"
                              title="Ký Sinh"
                            >
                              [KÝ SINH]
                            </span>
                          )}
                          {(player.statuses.blindedTurns || 0) > 0 && (
                            <span
                              className="px-1 py-0.5 bg-[#18181b] border border-[#71717a] text-[#d4d4d8] font-mono text-[9px] font-bold leading-none"
                              title="Mù Lòa"
                            >
                              [MÙ]
                            </span>
                          )}
                          {hasInfection && (
                            <span
                              className="px-1 py-0.5 bg-[#172414] border border-[#65a30d] text-[#a3e635] font-mono text-[9px] font-bold leading-none"
                              title="Nhiễm Trùng"
                            >
                              [NHIỄM TRÙNG]
                            </span>
                          )}
                          {!player.statuses.bleeding &&
                            (player.statuses.bleedImmunityTurns || 0) > 0 && (
                              <span
                                className="px-1 py-0.5 bg-[#1a1816] border border-[#a89f91] text-[#d6c9b8] font-mono text-[9px] font-bold leading-none"
                                title="Đã Cầm Máu"
                              >
                                [CẦM MÁU]
                              </span>
                            )}
                          {isPlayerPanicking(player) && (
                            <span
                              className="px-1 py-0.5 bg-[#2a0c10] border border-[#dc2626] text-[#fca5a5] font-mono text-[9px] font-bold leading-none"
                              title="Hoảng Loạn"
                            >
                              [HOẢNG LOẠN]
                            </span>
                          )}
                          {lostLimbsCount > 0 && (
                            <span
                              className="px-1 py-0.5 bg-[#220e12] border border-[#8b0000] text-[#c96b6b] font-mono text-[9px] font-bold leading-none"
                              title="Mất Chi"
                            >
                              [MẤT CHI ×{lostLimbsCount}]
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <div className="flex justify-between text-[11px] leading-none mb-1">
                            <span className="text-[#c96b6b] font-semibold">Thể Xác</span>
                            <span className="font-mono font-bold text-[#e7dcc8]">
                              {player.hp}/{player.maxHp}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#1a0b0d] border border-[#5e1414]">
                            <div
                              className="h-full bg-[#991b1b] transition-all duration-200"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(100, (player.hp / Math.max(1, player.maxHp)) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] leading-none mb-1">
                            <span className="text-[#94a3b8] font-semibold">Lý Trí</span>
                            <span className="font-mono font-bold text-[#e7dcc8]">
                              {player.mind}/{player.maxMind}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#11161d] border border-[#3a4a5e]">
                            <div
                              className="h-full bg-[#4d627a] transition-all duration-200"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(100, (player.mind / Math.max(1, player.maxMind)) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Recruited Living Allies / Undead Summons Compact Cards (fallen 0 HP companions auto-removed) */}
                {player.party
                  .map((ally, idx) => ({ ally, idx }))
                  .filter(({ ally }) => ally.hp > 0)
                  .slice(0, 3)
                  .map(({ ally, idx }) => {
                    const isTurn = activeActorIdx === idx + 1 && !activeCombatEnemy.defeated;
                    const isFrenzied = ally.mind < 30;
                    const lostLimbsCount = (
                      ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as const
                    ).filter((k) => !(ally.limbs?.[k] ?? true)).length;
                    const hasInfection = Object.values(ally.limbs?.infected || {}).some(Boolean);
                    return (
                      <div
                        key={ally.id}
                        className={`px-3 py-2 flex flex-col justify-between gap-1.5 ${
                          isTurn ? 'df-card-active' : 'df-card'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isTurn && <span className="text-[#fbbf24] text-xs font-bold">▸</span>}
                            <span className="text-sm font-bold text-[#d3d3d3] truncate">
                              {ally.name}
                            </span>
                            {ally.isUndeadSummon && (
                              <span className="text-[9px] text-[#a889b8] font-mono font-bold shrink-0">
                                [VONG]
                              </span>
                            )}
                          </div>
                          <div className="flex items-center flex-wrap justify-end gap-1 shrink-0">
                            {ally.guarding && (
                              <span
                                className="px-1 py-0.5 bg-[#1f1c14] border border-[#c5a059]/70 text-[#e5cfa0] font-mono text-[9px] font-bold leading-none"
                                title="Phòng Thủ"
                              >
                                [THỦ]
                              </span>
                            )}
                            {(ally.stunnedTurns || 0) > 0 && (
                              <span
                                className="px-1 py-0.5 bg-[#241b0a] border border-[#d97706] text-[#fbbf24] font-mono text-[9px] font-bold leading-none"
                                title="Choáng"
                              >
                                [CHOÁNG]
                              </span>
                            )}
                            {ally.statuses?.bleeding && (
                              <span
                                className="px-1 py-0.5 bg-[#2a0c10] border border-[#b91c1c] text-[#f87171] font-mono text-[9px] font-bold leading-none"
                                title="Chảy Máu"
                              >
                                [CHẢY MÁU]
                              </span>
                            )}
                            {ally.statuses?.poisoned && (
                              <span
                                className="px-1 py-0.5 bg-[#0f2216] border border-[#16a34a] text-[#4ade80] font-mono text-[9px] font-bold leading-none"
                                title="Trúng Độc"
                              >
                                [ĐỘC]
                              </span>
                            )}
                            {hasInfection && (
                              <span
                                className="px-1 py-0.5 bg-[#172414] border border-[#65a30d] text-[#a3e635] font-mono text-[9px] font-bold leading-none"
                                title="Nhiễm Trùng"
                              >
                                [NHIỄM TRÙNG]
                              </span>
                            )}
                            {isFrenzied && (
                              <span
                                className="px-1 py-0.5 bg-[#2a0c10] border border-[#dc2626] text-[#fca5a5] font-mono text-[9px] font-bold leading-none"
                                title="Hoảng Loạn / Cuồng Loạn"
                              >
                                [HOẢNG LOẠN]
                              </span>
                            )}
                            {lostLimbsCount > 0 && (
                              <span
                                className="px-1 py-0.5 bg-[#220e12] border border-[#8b0000] text-[#c96b6b] font-mono text-[9px] font-bold leading-none"
                                title="Mất Chi"
                              >
                                [MẤT CHI ×{lostLimbsCount}]
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <div className="flex justify-between text-[11px] leading-none mb-1">
                              <span className="text-[#c96b6b] font-semibold">Thể Xác</span>
                              <span className="font-mono font-bold text-[#d3d3d3]">
                                {ally.hp}/{ally.maxHp}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-[#1a0a0d] border border-[#3a3a3a]">
                              <div
                                className="h-full bg-[#991b1b] transition-all duration-200"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(100, (ally.hp / Math.max(1, ally.maxHp)) * 100)
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] leading-none mb-1">
                              <span className="text-[#a3b2c4] font-semibold">Lý Trí</span>
                              <span className="font-mono font-bold text-[#d3d3d3]">
                                {ally.mind}/{ally.maxMind}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-[#11151d] border border-[#3a3a3a]">
                              <div
                                className="h-full bg-[#5b6f8a] transition-all duration-200"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(100, (ally.mind / Math.max(1, ally.maxMind)) * 100)
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
      {coinTossNode}
    </div>
  );
};
