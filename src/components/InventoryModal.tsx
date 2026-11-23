import React, { useMemo } from 'react';
import { Shield } from 'lucide-react';
import { CONFIG } from '../game/config';
import { sfx } from '../game/audio';
import { PaperdollSpec } from '../game/pixelArt';
import { WorldMapState } from '../game/mapGen';
import {
  PlayerState,
  getComputedPlayerStats,
  getAllyComputedStats,
  getAllyEffectiveWeapon,
  applySupportItemEffects,
  applySupportItemToAlly,
  amputateInfectedLimbWithBoneSaw,
  amputateAllyLimbWithBoneSaw,
  canUnequipWeapon,
  canMemberEquipWeapon,
  leaveOrDismissPartyMember,
  canPlayerEquipGear,
  canPlayerEquipShield,
  canAllyEquipGear,
  canAllyEquipShield,
  isPureTankSummon,
  isAllyGearLocked,
  useEmergencyAmputationScroll,
  GEAR_ITEMS,
} from '../game/combat';
import { ItemArtworkCanvas, PaperdollPreviewCanvas } from './CanvasWidgets';

export type EquipSlotKey = 'weapon' | 'shield' | 'head' | 'body' | 'accessory';
export type InventoryTab = 'equip' | 'items' | 'alchemy' | 'saw';

export interface InventoryModalProps {
  player: PlayerState;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
  world: WorldMapState;
  setWorld: React.Dispatch<React.SetStateAction<WorldMapState>>;
  playerPos: { x: number; y: number };
  computedStats: ReturnType<typeof getComputedPlayerStats>;
  invTab: InventoryTab;
  setInvTab: React.Dispatch<React.SetStateAction<InventoryTab>>;
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
  onClose: () => void;
  onOpenHunterNote: () => void;
  onAddLog: (msg: string) => void;
  onShowLogOverlay: () => void;
  onPromptCrackedWallExplosion: () => void;
  onTriggerNightHunterElixirEnding: (pCopy: PlayerState) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  setPlayer,
  world,
  setWorld,
  playerPos,
  computedStats,
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
  onClose,
  onOpenHunterNote,
  onAddLog,
  onShowLogOverlay,
  onPromptCrackedWallExplosion,
  onTriggerNightHunterElixirEnding,
}) => {
  const safeInvIdx = selectedInvMemberIdx <= player.party.length ? selectedInvMemberIdx : 0;
  const selectedAlly = safeInvIdx > 0 ? player.party[safeInvIdx - 1] || null : null;
  const isAllyLocked = isAllyGearLocked(selectedAlly);
  const isSelectedPureTank = isPureTankSummon(selectedAlly);
  const allyComputed = selectedAlly ? getAllyComputedStats(selectedAlly, player) : null;
  const memberStats =
    selectedAlly && allyComputed
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
  const memberHunger = selectedAlly
    ? selectedAlly.isUndeadSummon
      ? 0
      : selectedAlly.hunger || 0
    : player.hunger;
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

  const renderCompactSurvivalBars = () => {
    const hungerDanger = !isSelectedUndead && memberHunger >= 80;
    return (
      <div className="df-well p-2.5 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between gap-2 border-b border-[#3a3a3a]/60 pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#c5a059] truncate">
            {selectedMemberName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {memberMind < 30 && (
              <span className="px-1 py-0.5 bg-[#2e0b0f] border border-[#8b0000] text-[9px] font-bold text-[#d3d3d3]">
                Hoảng Loạn
              </span>
            )}
            {hungerDanger ? (
              <span className="px-1 py-0.5 bg-[#2e0b0f] border border-[#8b0000] text-[9px] font-bold text-[#c96b6b]">
                Kiệt Sức
              </span>
            ) : !isSelectedUndead && memberHunger >= 50 ? (
              <span className="px-1 py-0.5 bg-[#261d0e] border border-[#c5a059] text-[9px] font-bold text-[#c5a059]">
                Đói -25% ST
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-1 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="w-14 text-[#c96b6b] font-bold shrink-0">Sinh Lực</span>
            <div className="flex-1 h-1.5 bg-[#1a0a0d] border border-[#3a3a3a]">
              <div
                className="h-full bg-[#8b0000] transition-all"
                style={{
                  width: `${Math.max(0, Math.min(100, (memberHp / Math.max(1, memberMaxHp)) * 100))}%`,
                }}
              />
            </div>
            <span className="w-12 text-right font-mono text-[#d3d3d3] shrink-0">
              {memberHp}/{memberMaxHp}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-14 text-[#a3b2c4] font-bold shrink-0">Lý Trí</span>
            <div className="flex-1 h-1.5 bg-[#11151d] border border-[#3a3a3a]">
              <div
                className="h-full bg-[#5b6f8a] transition-all"
                style={{
                  width: `${Math.max(0, Math.min(100, (memberMind / Math.max(1, memberMaxMind)) * 100))}%`,
                }}
              />
            </div>
            <span
              className={`w-12 text-right font-mono shrink-0 ${
                memberMind < 30 ? 'text-[#c96b6b] font-bold' : 'text-[#d3d3d3]'
              }`}
            >
              {memberMind}/{memberMaxMind}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-14 font-bold shrink-0 ${
                hungerDanger ? 'text-[#ef4444]' : 'text-[#eab308]'
              }`}
            >
              Độ Đói
            </span>
            {isSelectedUndead ? (
              <div className="flex-1 text-[10px] italic text-[#a889b8]">Bất tử — Không đói</div>
            ) : (
              <>
                <div
                  className={`flex-1 h-1.5 border ${
                    hungerDanger ? 'bg-[#26090b] border-[#b91c1c]' : 'bg-[#1d170f] border-[#6b531c]'
                  }`}
                >
                  <div
                    className={`h-full transition-all ${
                      hungerDanger ? 'bg-[#ef4444]' : 'bg-[#eab308]'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, memberHunger))}%` }}
                  />
                </div>
                <span
                  className={`w-12 text-right font-mono shrink-0 ${
                    hungerDanger ? 'text-[#ef4444] font-bold' : 'text-[#e5c158]'
                  }`}
                >
                  {memberHunger}/100
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ownedItemEntries = useMemo(
    () =>
      Object.entries(player.inventory).filter(
        ([itemId, count]) => Boolean(CONFIG.ITEMS[itemId]) && count > 0
      ),
    [player.inventory]
  );
  const activeDetailId =
    CONFIG.ITEMS[previewItemId] ||
    CONFIG.WEAPONS[previewItemId] ||
    CONFIG.SHIELDS[previewItemId] ||
    GEAR_ITEMS[previewItemId]
      ? previewItemId
      : ownedItemEntries[0]?.[0] || player.equippedWeapon;
  const activeDetailName =
    CONFIG.ITEMS[activeDetailId]?.name ||
    CONFIG.WEAPONS[activeDetailId]?.name ||
    CONFIG.SHIELDS[activeDetailId]?.name ||
    GEAR_ITEMS[activeDetailId]?.name ||
    'Vật Phẩm Cổ Đại';
  const activeDetailDesc =
    CONFIG.ITEMS[activeDetailId]?.desc ||
    CONFIG.WEAPONS[activeDetailId]?.desc ||
    CONFIG.SHIELDS[activeDetailId]?.desc ||
    GEAR_ITEMS[activeDetailId]?.desc ||
    'Chọn một vật phẩm hoặc trang bị để xem chi tiết.';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-5xl w-full df-panel p-4 space-y-2.5 max-h-[86vh] flex flex-col overflow-hidden">
        {/* Top Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#3a3a3a] pb-2 gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setInvTab('equip');
                setPreviewItemId(curWpnId || '');
              }}
              className={`px-3 py-1 text-xs font-bold uppercase cursor-pointer ${
                invTab === 'equip' ? 'df-btn-active' : 'df-btn'
              }`}
            >
              Trang Bị
            </button>
            <button
              type="button"
              onClick={() => {
                setInvTab('items');
                if (!CONFIG.ITEMS[previewItemId] && ownedItemEntries[0]?.[0]) {
                  setPreviewItemId(ownedItemEntries[0][0]);
                }
              }}
              className={`px-3 py-1 text-xs font-bold uppercase cursor-pointer ${
                invTab === 'items' ? 'df-btn-active' : 'df-btn'
              }`}
            >
              Túi Đồ ({ownedItemEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setInvTab('alchemy')}
              className={`px-3 py-1 text-xs font-bold uppercase cursor-pointer ${
                invTab === 'alchemy' ? 'df-btn-active' : 'df-btn'
              }`}
            >
              Giả Kim
            </button>
            {isAmputating && (
              <button
                type="button"
                onClick={() => setInvTab('saw')}
                className={`px-3 py-1 text-xs font-bold uppercase cursor-pointer ${
                  invTab === 'saw' ? 'df-btn-active' : 'df-btn'
                }`}
              >
                Cưa Xương
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
          >
            Đóng [ESC]
          </button>
        </div>

        {/* Ultra-Compact 4-Member Party Selector Strip (max-h-[48px]) */}
        {invTab !== 'saw' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedInvMemberIdx(0);
                setPreviewItemId(player.equippedWeapon);
                setInvFeedback(null);
              }}
              title={`Sinh Lực ${player.hp}/${player.maxHp} • Lý Trí ${player.mind}/${player.maxMind} • Đói ${player.hunger}/100`}
              className={`h-11 px-2.5 py-1.5 text-left cursor-pointer flex flex-col justify-between ${
                safeInvIdx === 0 ? 'df-card-active text-[#dfd2b4]' : 'df-card text-[#9b8f82]'
              }`}
            >
              <div className="text-xs font-bold truncate leading-none">✦ {player.name}</div>
              <div className="grid grid-cols-3 gap-1">
                <div className="h-1 bg-[#1a0a0d] border border-[#3a3a3a]/80">
                  <div
                    className="h-full bg-[#8b0000]"
                    style={{
                      width: `${Math.max(0, Math.min(100, (player.hp / Math.max(1, player.maxHp)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="h-1 bg-[#11151d] border border-[#3a3a3a]/80">
                  <div
                    className="h-full bg-[#5b6f8a]"
                    style={{
                      width: `${Math.max(0, Math.min(100, (player.mind / Math.max(1, player.maxMind)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="h-1 bg-[#1d170f] border border-[#6b531c]/80">
                  <div
                    className={`h-full ${player.hunger >= 80 ? 'bg-[#ef4444]' : 'bg-[#eab308]'}`}
                    style={{ width: `${Math.max(0, Math.min(100, player.hunger))}%` }}
                  />
                </div>
              </div>
            </button>

            {[0, 1, 2].map((slotIdx) => {
              const ally = player.party[slotIdx];
              if (!ally) {
                return (
                  <div
                    key={`empty_${slotIdx}`}
                    className="h-11 px-2 df-well opacity-40 text-[11px] text-[#7a7066] flex items-center justify-center truncate"
                  >
                    [Trống #{slotIdx + 1}]
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
                    setPreviewItemId(ally.weaponId || ally.equippedBody || '');
                    setInvFeedback(null);
                  }}
                  title={`Sinh Lực ${ally.hp}/${ally.maxHp} • Lý Trí ${ally.mind}/${ally.maxMind}${
                    ally.isUndeadSummon ? ' • Bất tử' : ` • Đói ${allyHunger}/100`
                  }`}
                  className={`h-11 px-2.5 py-1.5 text-left cursor-pointer flex flex-col justify-between ${
                    active ? 'df-card-active text-[#dfd2b4]' : 'df-card text-[#9b8f82]'
                  }`}
                >
                  <div className="text-xs font-bold truncate leading-none">{ally.name}</div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="h-1 bg-[#1a0a0d] border border-[#3a3a3a]/80">
                      <div
                        className="h-full bg-[#8b0000]"
                        style={{
                          width: `${Math.max(0, Math.min(100, (ally.hp / Math.max(1, ally.maxHp)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="h-1 bg-[#11151d] border border-[#3a3a3a]/80">
                      <div
                        className="h-full bg-[#5b6f8a]"
                        style={{
                          width: `${Math.max(0, Math.min(100, (ally.mind / Math.max(1, ally.maxMind)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="h-1 bg-[#1d170f] border border-[#6b531c]/80">
                      <div
                        className={`h-full ${
                          ally.isUndeadSummon
                            ? 'bg-[#8e6ca3]/50'
                            : allyHunger >= 80
                            ? 'bg-[#ef4444]'
                            : 'bg-[#eab308]'
                        }`}
                        style={{
                          width: `${
                            ally.isUndeadSummon ? 0 : Math.max(0, Math.min(100, allyHunger))
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 1: TRANG BỊ, 6 CHỈ SỐ & GIẢI PHẪU */}
        {invTab === 'equip' &&
          (() => {
            const rightArmSevered = !(memberLimbs?.rightArm ?? true);
            const leftArmSevered = !(memberLimbs?.leftArm ?? true);
            const weaponSlotBroken = rightArmSevered && leftArmSevered;
            const shieldSlotBroken = rightArmSevered || leftArmSevered;
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
              isUndeadSummon: isSelectedUndead,
              isPureTank: isSelectedPureTank,
              limbs: {
                leftArm: memberLimbs?.leftArm ?? true,
                rightArm: memberLimbs?.rightArm ?? true,
                leftLeg: memberLimbs?.leftLeg ?? true,
                rightLeg: memberLimbs?.rightLeg ?? true,
                infected: memberLimbs?.infected,
              },
            };

            return (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
                {/* Left Column (5 cols): Paperdoll + Compact 6 Stats (2 cols) + Compact 6-Part Anatomy (3 cols) */}
                <div className="md:col-span-5 df-well p-3 flex flex-col justify-between gap-2.5 overflow-y-auto">
                  {/* Compact Portrait + Survival Summary */}
                  <div className="flex items-center gap-2.5 p-2 bg-[#0d0a10] border border-[#3a3a3a]">
                    <PaperdollPreviewCanvas spec={paperdollSpec} width={76} height={102} />
                    <div className="min-w-0 flex-1 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[#c5a059] truncate">
                          {selectedMemberName}
                        </span>
                        {selectedAlly && (
                          <button
                            type="button"
                            onClick={() => {
                              sfx.playSfx('ui_confirm');
                              const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                              const res = leaveOrDismissPartyMember(
                                pCopy,
                                safeInvIdx - 1,
                                selectedAlly.isUndeadSummon ? 'dismiss' : 'leave',
                                selectedAlly.isUndeadSummon
                                  ? undefined
                                  : {
                                      roomId: world.currentRoomId,
                                      x: playerPos.x,
                                      y: playerPos.y,
                                    }
                              );
                              if (res.success) {
                                setPlayer(pCopy);
                                setSelectedInvMemberIdx(0);
                                setPreviewItemId(pCopy.equippedWeapon);
                                setInvFeedback(res.message);
                                onAddLog(res.message);
                              }
                            }}
                            className="df-btn-blood px-1.5 py-0.5 text-[10px] font-bold shrink-0 cursor-pointer"
                          >
                            {selectedAlly.isUndeadSummon ? 'Giải Tán' : 'Rời Nhóm'}
                          </button>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-[#c96b6b]">
                        SL: {memberHp}/{memberMaxHp}{' '}
                        <span className="text-[#a3b2c4] ml-1.5">
                          LT: {memberMind}/{memberMaxMind}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-[#eab308]">
                        {isSelectedUndead ? 'Bất tử — Không đói' : `Đói: ${memberHunger}/100`}
                      </div>
                      <div className="text-[10px] text-[#9b8f82] truncate">
                        VK:{' '}
                        <span className="text-[#dfd2b4]">
                          {weaponSlotBroken
                            ? 'Đứt Cả 2 Tay'
                            : activeWpnDef?.name || (isSelectedPureTank ? 'Hộ Thể' : 'Tay Không')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gear Inspector Box */}
                  {(() => {
                    const pWpn = previewItemId ? CONFIG.WEAPONS[previewItemId] : undefined;
                    const pShield = previewItemId ? CONFIG.SHIELDS[previewItemId] : undefined;
                    const pGear = previewItemId ? GEAR_ITEMS[previewItemId] : undefined;
                    const hasPreview = Boolean(pWpn || pShield || pGear);

                    const renderDiff = (diff: number, suffix = '') => {
                      if (diff === 0) return null;
                      return (
                        <span
                          className={`ml-0.5 font-bold ${
                            diff > 0 ? 'text-[#4ade80]' : 'text-[#f87171]'
                          }`}
                        >
                          ({diff > 0 ? `+${diff}` : diff}
                          {suffix})
                        </span>
                      );
                    };

                    if (!hasPreview) {
                      return (
                        <div className="p-2 bg-[#0d0a10] border border-[#3a3a3a] min-h-[96px] flex items-center justify-center text-center">
                          <span className="text-[11px] italic text-[#7a7066]">
                            Chọn trang bị để xem chi tiết.
                          </span>
                        </div>
                      );
                    }

                    const slotBadge = pWpn
                      ? '[Vũ Khí]'
                      : pShield
                      ? '[Khiên]'
                      : pGear?.slot === 'head'
                      ? '[Đầu]'
                      : pGear?.slot === 'body'
                      ? '[Thân]'
                      : '[Phụ Kiện]';

                    const isTwoHand = Boolean(pWpn && (pWpn.isTwoHanded || pWpn.hands === 2));
                    const isForged = Boolean(
                      pWpn && !selectedAlly && player.bloodForgedWeapons?.includes(pWpn.id)
                    );
                    const isCursed = Boolean(pWpn?.isCursed);
                    const itemName = pWpn?.name || pShield?.name || pGear?.name || '';
                    const itemDesc = pWpn?.desc || pShield?.desc || pGear?.desc || '';

                    const curWpnDef = curWpnId ? CONFIG.WEAPONS[curWpnId] : undefined;
                    const curShieldDef = curShieldId ? CONFIG.SHIELDS[curShieldId] : undefined;
                    const curGearSlotId =
                      pGear?.slot === 'head'
                        ? curHeadId
                        : pGear?.slot === 'body'
                        ? curBodyId
                        : pGear?.slot === 'accessory'
                        ? curAccId
                        : null;
                    const curGearDef = curGearSlotId ? GEAR_ITEMS[curGearSlotId] : undefined;

                    return (
                      <div className="p-2 bg-[#0d0a10] border border-[#3a3a3a] min-h-[96px] flex flex-col justify-between gap-1">
                        <div className="flex items-start gap-2 min-w-0">
                          <ItemArtworkCanvas itemOrWeaponId={previewItemId} size={32} />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[11px] font-bold text-[#dfd2b4] truncate">
                                {itemName}
                              </span>
                              <span className="px-1 py-0.2 bg-[#1a1620] border border-[#3a3a3a] text-[9px] text-[#c5a059]">
                                {slotBadge}
                              </span>
                              {isTwoHand && (
                                <span className="px-1 bg-[#1e1712] border border-[#c5a059]/60 text-[9px] text-[#eab308]">
                                  [2T]
                                </span>
                              )}
                              {isForged && (
                                <span className="px-1 bg-[#2e0b0f] border border-[#8b0000] text-[9px] text-[#fca5a5]">
                                  [Huyết Rèn]
                                </span>
                              )}
                              {isCursed && (
                                <span className="px-1 bg-[#26091a] border border-[#9d174d] text-[9px] text-[#f472b6]">
                                  [NGUYỀN]
                                </span>
                              )}
                            </div>

                            {pWpn && (
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] font-mono text-[#cfc0a9]">
                                <span>
                                  ST {pWpn.dmg[0]}–{pWpn.dmg[1]}
                                  {curWpnDef && curWpnDef.id !== pWpn.id
                                    ? renderDiff(
                                        Math.round((pWpn.dmg[0] + pWpn.dmg[1]) / 2) -
                                          Math.round((curWpnDef.dmg[0] + curWpnDef.dmg[1]) / 2)
                                      )
                                    : null}
                                </span>
                                <span>
                                  CM {Math.round(pWpn.critChance * 100)}%
                                  {curWpnDef && curWpnDef.id !== pWpn.id
                                    ? renderDiff(
                                        Math.round(pWpn.critChance * 100) -
                                          Math.round(curWpnDef.critChance * 100),
                                        '%'
                                      )
                                    : null}
                                </span>
                                {(pWpn.hitBonus !== 0 || (curWpnDef?.hitBonus || 0) !== 0) && (
                                  <span>
                                    Trúng {pWpn.hitBonus >= 0 ? '+' : ''}
                                    {Math.round(pWpn.hitBonus * 100)}%
                                    {curWpnDef && curWpnDef.id !== pWpn.id
                                      ? renderDiff(
                                          Math.round(pWpn.hitBonus * 100) -
                                            Math.round(curWpnDef.hitBonus * 100),
                                          '%'
                                        )
                                      : null}
                                  </span>
                                )}
                              </div>
                            )}

                            {pShield && (
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] font-mono text-[#cfc0a9]">
                                <span>
                                  Thủ {Math.round(pShield.guardReduction * 100)}%
                                  {curShieldDef && curShieldDef.id !== pShield.id
                                    ? renderDiff(
                                        Math.round(pShield.guardReduction * 100) -
                                          Math.round(curShieldDef.guardReduction * 100),
                                        '%'
                                      )
                                    : null}
                                </span>
                                {((pShield.defBonus || 0) !== 0 ||
                                  (curShieldDef?.defBonus || 0) !== 0) && (
                                  <span>
                                    Giáp +{Math.round((pShield.defBonus || 0) * 100)}%
                                    {curShieldDef && curShieldDef.id !== pShield.id
                                      ? renderDiff(
                                          Math.round((pShield.defBonus || 0) * 100) -
                                            Math.round((curShieldDef.defBonus || 0) * 100),
                                          '%'
                                        )
                                      : null}
                                  </span>
                                )}
                                {(pShield.thornsDmg > 0 || (curShieldDef?.thornsDmg || 0) > 0) && (
                                  <span>
                                    Gai {pShield.thornsDmg}
                                    {curShieldDef && curShieldDef.id !== pShield.id
                                      ? renderDiff(
                                          pShield.thornsDmg - (curShieldDef.thornsDmg || 0)
                                        )
                                      : null}
                                  </span>
                                )}
                                {pShield.preventLimbLoss && (
                                  <span className="text-[#9ab08e]">Chống chặt chi</span>
                                )}
                              </div>
                            )}

                            {pGear && (
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] font-mono text-[#cfc0a9]">
                                <span>
                                  VL +{Math.round(pGear.physDef * 100)}%
                                  {curGearDef && curGearDef.id !== pGear.id
                                    ? renderDiff(
                                        Math.round(pGear.physDef * 100) -
                                          Math.round(curGearDef.physDef * 100),
                                        '%'
                                      )
                                    : null}
                                </span>
                                <span>
                                  Phép +{Math.round(pGear.magDef * 100)}%
                                  {curGearDef && curGearDef.id !== pGear.id
                                    ? renderDiff(
                                        Math.round(pGear.magDef * 100) -
                                          Math.round(curGearDef.magDef * 100),
                                        '%'
                                      )
                                    : null}
                                </span>
                                {(pGear.agility !== 0 || (curGearDef?.agility || 0) !== 0) && (
                                  <span>
                                    Nhanh {pGear.agility >= 0 ? '+' : ''}
                                    {pGear.agility}
                                    {curGearDef && curGearDef.id !== pGear.id
                                      ? renderDiff(pGear.agility - (curGearDef.agility || 0))
                                      : null}
                                  </span>
                                )}
                                {(pGear.magAtk !== 0 || (curGearDef?.magAtk || 0) !== 0) && (
                                  <span>
                                    ST Phép {pGear.magAtk >= 0 ? '+' : ''}
                                    {pGear.magAtk}
                                    {curGearDef && curGearDef.id !== pGear.id
                                      ? renderDiff(pGear.magAtk - (curGearDef.magAtk || 0))
                                      : null}
                                  </span>
                                )}
                                {((pGear.hitBonus || 0) !== 0 ||
                                  (curGearDef?.hitBonus || 0) !== 0) && (
                                  <span>
                                    Trúng +{Math.round((pGear.hitBonus || 0) * 100)}%
                                    {curGearDef && curGearDef.id !== pGear.id
                                      ? renderDiff(
                                          Math.round((pGear.hitBonus || 0) * 100) -
                                            Math.round((curGearDef.hitBonus || 0) * 100),
                                          '%'
                                        )
                                      : null}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] italic text-[#9b8f82] line-clamp-2 leading-snug">
                          {itemDesc}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 6 Stats in 2-Column Grid (3 rows) */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#c5a059] border-b border-[#3a3a3a]/60 pb-1">
                      6 Chỉ Số
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      {(
                        [
                          ['ST Vật Lý', `${memberStats.physAtk}`],
                          ['Kháng Vật Lý', `${memberStats.physDefPct}%`],
                          ['ST Phép', `${memberStats.magAtk}`],
                          ['Kháng Phép', `${memberStats.magDefPct}%`],
                          ['Nhanh Nhẹn', `${memberStats.agility}`],
                          ['May Mắn', `${memberStats.luck}%`],
                        ] as Array<[string, string]>
                      ).map(([label, val]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between border-b border-[#3a3a3a]/35 pb-0.5"
                        >
                          <span className="text-[#cfc0a9]">{label}</span>
                          <span className="font-mono font-bold text-[#9ab08e]">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6-Part Anatomy in Ultra-Compact 3-Column Grid */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#c5a059] flex items-center gap-1 border-b border-[#3a3a3a]/60 pb-1">
                      <Shield className="w-3 h-3 text-[#8b0000]" /> Giải Phẫu 6 Bộ Phận
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <div className="px-1.5 py-1 bg-[#121914] border border-[#3a3a3a] text-[#9ab08e] flex justify-between">
                        <span>Đầu</span>
                        <span className="font-mono font-bold">
                          {memberStatuses.blindedTurns > 0 ? 'MÙ' : 'OK'}
                        </span>
                      </div>
                      <div
                        className={`px-1.5 py-1 border flex justify-between ${
                          memberStatuses.bleeding || memberStatuses.parasite
                            ? 'bg-[#261d0e] border-[#c5a059] text-[#c5a059]'
                            : 'bg-[#121914] border-[#3a3a3a] text-[#9ab08e]'
                        }`}
                      >
                        <span>Thân</span>
                        <span className="font-mono font-bold">
                          {memberStatuses.parasite ? 'KS' : memberStatuses.bleeding ? 'MÁU' : 'OK'}
                        </span>
                      </div>
                      {(
                        [
                          ['leftArm', 'T.Trái'],
                          ['rightArm', 'T.Phải'],
                          ['leftLeg', 'C.Trái'],
                          ['rightLeg', 'C.Phải'],
                        ] as const
                      ).map(([limbKey, limbLabel]) => {
                        const intact = memberLimbs?.[limbKey] ?? true;
                        const infected = memberLimbs?.infected?.[limbKey] ?? false;
                        return (
                          <div
                            key={limbKey}
                            className={`px-1.5 py-1 border flex justify-between ${
                              !intact
                                ? 'bg-[#2a0c10] border-[#8b0000] text-[#c96b6b] line-through'
                                : infected
                                ? 'bg-[#261d0e] border-[#c5a059] text-[#c5a059]'
                                : 'bg-[#121914] border-[#3a3a3a] text-[#9ab08e]'
                            }`}
                          >
                            <span>{limbLabel}</span>
                            <span className="font-mono font-bold">
                              {!intact ? 'ĐỨT' : infected ? 'NH' : 'OK'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {(memberStatuses.bleeding ||
                      memberStatuses.poisoned ||
                      memberStatuses.parasite ||
                      (!selectedAlly && player.holyMagicLocked)) && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {memberStatuses.bleeding && (
                          <span className="px-1.5 py-0.5 bg-[#2e0b0f] border border-[#8b0000] font-mono text-[9px] font-bold text-[#c96b6b]">
                            [CHẢY MÁU]
                          </span>
                        )}
                        {memberStatuses.poisoned && (
                          <span className="px-1.5 py-0.5 bg-[#121914] border border-[#3a3a3a] font-mono text-[9px] font-bold text-[#9ab08e]">
                            [ĐỘC]
                          </span>
                        )}
                        {memberStatuses.parasite && (
                          <span className="px-1.5 py-0.5 bg-[#1d1226] border border-[#8e6ca3] font-mono text-[9px] font-bold text-[#d3d3d3]">
                            [KÝ SINH]
                          </span>
                        )}
                        {!selectedAlly && player.holyMagicLocked && (
                          <span className="px-1.5 py-0.5 bg-[#1a171c] border border-[#3a3a3a] font-mono text-[9px] font-bold text-[#d3d3d3]">
                            [KHÓA PHÉP THÁNH]
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column (7 cols): Quick Actions + 5 Slim Equipment Slots + Locally Scrollable Available Gear */}
                <div className="md:col-span-7 flex flex-col gap-2 min-h-0 overflow-hidden">
                  {invFeedback && (
                    <div className="px-2.5 py-1.5 df-well border-[#c5a059] text-[11px] text-[#dfd2b4] shrink-0">
                      {invFeedback}
                    </div>
                  )}
                  {isAllyLocked ? (
                    <div className="px-2.5 py-1.5 df-well border-[#8e6ca3] text-[11px] text-[#d3d3d3] shrink-0">
                      {isSelectedPureTank
                        ? 'Oán Linh thuần phòng thủ không đổi trang bị (tự kích hoạt Khiên Linh Hồn).'
                        : 'Đệ tử Chiêu Hồn đã tan rã và hoàn trả trang bị về kho.'}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-2 df-well px-2.5 py-1.5 shrink-0">
                    <span className="text-[11px] font-bold uppercase text-[#c5a059]">
                      Trang Bị — {selectedMemberName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isAllyLocked}
                        onClick={() => {
                          if (selectedAlly) {
                            setPlayer((prev) => {
                              const nextParty = [...prev.party];
                              const ally = nextParty[safeInvIdx - 1];
                              if (!ally || isAllyGearLocked(ally)) return prev;
                              const candidateWeapons = Array.from(
                                new Set([
                                  ...(ally.weaponId ? [ally.weaponId] : []),
                                  ...prev.unlockedWeapons,
                                ])
                              ).filter(
                                (id) =>
                                  Boolean(CONFIG.WEAPONS[id]) &&
                                  canMemberEquipWeapon(ally.limbs, id).allowed
                              );
                              const bestWep =
                                candidateWeapons.sort((a, b) => {
                                  const wa = CONFIG.WEAPONS[a];
                                  const wb = CONFIG.WEAPONS[b];
                                  return wb.dmg[0] + wb.dmg[1] - (wa.dmg[0] + wa.dmg[1]);
                                })[0] || 'bite_headbutt';
                              const tempAlly = { ...ally, weaponId: bestWep };
                              const validShield =
                                prev.unlockedShields.find(
                                  (sId) => canAllyEquipShield(tempAlly, sId).allowed
                                ) ||
                                (ally.equippedShield &&
                                canAllyEquipShield(tempAlly, ally.equippedShield).allowed
                                  ? ally.equippedShield
                                  : null);
                              const validHead =
                                prev.unlockedGear.find(
                                  (g) =>
                                    GEAR_ITEMS[g]?.slot === 'head' &&
                                    canAllyEquipGear(tempAlly, g).allowed
                                ) || ally.equippedHead;
                              const validBody =
                                prev.unlockedGear.find(
                                  (g) =>
                                    GEAR_ITEMS[g]?.slot === 'body' &&
                                    canAllyEquipGear(tempAlly, g).allowed
                                ) || ally.equippedBody;
                              const validAccessory =
                                prev.unlockedGear.find(
                                  (g) =>
                                    GEAR_ITEMS[g]?.slot === 'accessory' &&
                                    canAllyEquipGear(tempAlly, g).allowed
                                ) || ally.equippedAccessory;
                              const nextUnlockedWeapons = [...prev.unlockedWeapons];
                              if (
                                ally.weaponId &&
                                ally.weaponId !== 'bite_headbutt' &&
                                ally.weaponId !== bestWep &&
                                CONFIG.WEAPONS[ally.weaponId] &&
                                !nextUnlockedWeapons.includes(ally.weaponId)
                              ) {
                                nextUnlockedWeapons.push(ally.weaponId);
                              }
                              const nextUnlockedShields = [...prev.unlockedShields];
                              if (
                                ally.equippedShield &&
                                ally.equippedShield !== validShield &&
                                CONFIG.SHIELDS[ally.equippedShield] &&
                                !nextUnlockedShields.includes(ally.equippedShield)
                              ) {
                                nextUnlockedShields.push(ally.equippedShield);
                              }
                              const nextUnlockedGear = [...prev.unlockedGear];
                              for (const [prevGearId, nextGearId] of [
                                [ally.equippedHead, validHead],
                                [ally.equippedBody, validBody],
                                [ally.equippedAccessory, validAccessory],
                              ] as Array<[string | null, string | null]>) {
                                if (
                                  prevGearId &&
                                  prevGearId !== nextGearId &&
                                  GEAR_ITEMS[prevGearId] &&
                                  !nextUnlockedGear.includes(prevGearId)
                                ) {
                                  nextUnlockedGear.push(prevGearId);
                                }
                              }
                              nextParty[safeInvIdx - 1] = {
                                ...ally,
                                weaponId: bestWep,
                                equippedShield: validShield,
                                equippedHead: validHead,
                                equippedBody: validBody,
                                equippedAccessory: validAccessory,
                              };
                              return {
                                ...prev,
                                party: nextParty,
                                unlockedWeapons: nextUnlockedWeapons,
                                unlockedShields: nextUnlockedShields,
                                unlockedGear: nextUnlockedGear,
                              };
                            });
                            onAddLog(`[${selectedAlly.name}] đã khoác lên bộ trang bị tinh nhuệ nhất.`);
                            return;
                          }
                          const unlockCheck = canUnequipWeapon(player);
                          setPlayer((prev) => {
                            const candidateWeapons = Array.from(
                              new Set([prev.equippedWeapon, ...prev.unlockedWeapons])
                            ).filter(
                              (id) =>
                                Boolean(CONFIG.WEAPONS[id]) &&
                                canMemberEquipWeapon(prev.limbs, id).allowed
                            );
                            const bestWep =
                              candidateWeapons.sort((a, b) => {
                                const wa = CONFIG.WEAPONS[a];
                                const wb = CONFIG.WEAPONS[b];
                                return wb.dmg[0] + wb.dmg[1] - (wa.dmg[0] + wa.dmg[1]);
                              })[0] || 'bite_headbutt';
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
                          onAddLog(
                            unlockCheck.allowed
                              ? 'Đã khoác bộ trang bị tinh nhuệ nhất phù hợp với thể trạng.'
                              : `Lời nguyền giữ chặt vũ khí trên tay; đã khoác các mảnh giáp còn lại.`
                          );
                        }}
                        className="df-btn-bronze px-2.5 py-0.5 disabled:opacity-35 text-[11px] font-bold cursor-pointer"
                      >
                        Tự Mặc
                      </button>
                      <button
                        type="button"
                        disabled={isAllyLocked}
                        onClick={() => {
                          if (selectedAlly) {
                            setPlayer((prev) => {
                              const nextParty = [...prev.party];
                              const ally = nextParty[safeInvIdx - 1];
                              if (!ally || isAllyGearLocked(ally)) return prev;
                              const nextUnlockedShields = [...prev.unlockedShields];
                              if (
                                ally.equippedShield &&
                                CONFIG.SHIELDS[ally.equippedShield] &&
                                !nextUnlockedShields.includes(ally.equippedShield)
                              ) {
                                nextUnlockedShields.push(ally.equippedShield);
                              }
                              const nextUnlockedGear = [...prev.unlockedGear];
                              for (const prevGearId of [
                                ally.equippedHead,
                                ally.equippedBody,
                                ally.equippedAccessory,
                              ]) {
                                if (
                                  prevGearId &&
                                  GEAR_ITEMS[prevGearId] &&
                                  !nextUnlockedGear.includes(prevGearId)
                                ) {
                                  nextUnlockedGear.push(prevGearId);
                                }
                              }
                              nextParty[safeInvIdx - 1] = {
                                ...ally,
                                equippedShield: null,
                                equippedHead: null,
                                equippedBody: null,
                                equippedAccessory: null,
                              };
                              return {
                                ...prev,
                                party: nextParty,
                                unlockedShields: nextUnlockedShields,
                                unlockedGear: nextUnlockedGear,
                              };
                            });
                            onAddLog(`Đã gỡ bỏ giáp trụ phụ trợ của [${selectedAlly.name}].`);
                            return;
                          }
                          setPlayer((prev) => ({
                            ...prev,
                            equippedShield: null,
                            equippedHead: null,
                            equippedBody: null,
                            equippedAccessory: null,
                          }));
                          onAddLog('Đã gỡ bỏ giáp trụ phụ trợ để nhẹ bước trong bóng tối.');
                        }}
                        className="df-btn-blood px-2.5 py-0.5 disabled:opacity-35 text-[11px] font-bold cursor-pointer"
                      >
                        Lột Đồ
                      </button>
                    </div>
                  </div>

                  {/* 5 Slim Equipment Slots (py-1.5) */}
                  <div className="space-y-1 shrink-0">
                    {(
                      [
                        [
                          'weapon',
                          'V.Khí',
                          (isSelectedPureTank && !curWpnId
                            ? 'Hộ Thể Linh Hồn'
                            : CONFIG.WEAPONS[curWpnId]?.name || 'Trống') +
                            (!selectedAlly && player.bloodForgedWeapons?.includes(curWpnId)
                              ? ' [Huyết Rèn]'
                              : '') +
                            (!selectedAlly && player.cursedLockedWeapon === curWpnId
                              ? ' [NGUYỀN]'
                              : ''),
                          curWpnId || '',
                        ],
                        [
                          'shield',
                          'Khiên',
                          curShieldId ? CONFIG.SHIELDS[curShieldId]?.name || 'Trống' : 'Trống',
                          curShieldId || '',
                        ],
                        [
                          'head',
                          'Đầu',
                          curHeadId ? GEAR_ITEMS[curHeadId]?.name : 'Trống',
                          curHeadId || '',
                        ],
                        [
                          'body',
                          'Thân',
                          curBodyId ? GEAR_ITEMS[curBodyId]?.name : 'Trống',
                          curBodyId || '',
                        ],
                        [
                          'accessory',
                          'P.Kiện',
                          curAccId ? GEAR_ITEMS[curAccId]?.name : 'Trống',
                          curAccId || '',
                        ],
                      ] as Array<[EquipSlotKey, string, string, string]>
                    ).map(([slotKey, slotLabel, equippedName, iconId]) => {
                      const isLimbSlotBroken =
                        (slotKey === 'weapon' && weaponSlotBroken) ||
                        (slotKey === 'shield' && shieldSlotBroken);
                      return (
                        <div
                          key={slotKey}
                          onClick={() => {
                            setSelectedEquipSlot(slotKey);
                            setPreviewItemId(iconId);
                          }}
                          className={`px-2.5 py-1.5 flex items-center justify-between cursor-pointer ${
                            selectedEquipSlot === slotKey ? 'df-card-active' : 'df-card'
                          } ${isLimbSlotBroken ? 'border-[#8b0000]/80' : ''}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-12 text-[11px] font-bold uppercase text-[#9b8f82] shrink-0">
                              {slotLabel}
                            </span>
                            <span
                              className={`text-xs font-bold truncate ${
                                isLimbSlotBroken ? 'line-through text-[#c96b6b]' : 'text-[#d3d3d3]'
                              }`}
                            >
                              {equippedName}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#c5a059] shrink-0">
                            {isLimbSlotBroken ? '[Khóa chi]' : '[Đổi]'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Available Gear for Selected Slot (Locally Scrollable) */}
                  <div className="p-2.5 df-well flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 shrink-0">
                      <span className="text-[11px] uppercase font-bold text-[#c5a059]">
                        Kho [
                        {selectedEquipSlot === 'body'
                          ? 'THÂN'
                          : selectedEquipSlot === 'weapon'
                          ? 'VŨ KHÍ'
                          : selectedEquipSlot === 'shield'
                          ? 'KHIÊN'
                          : selectedEquipSlot === 'head'
                          ? 'ĐẦU'
                          : 'PHỤ KIỆN'}
                        ]
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-y-auto pr-1 flex-1 min-h-0 content-start">
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
                              type="button"
                              disabled={isAllyLocked || !weaponLimbCheck.allowed}
                              onMouseEnter={() => setPreviewItemId(wId)}
                              onClick={() => {
                                setPreviewItemId(wId);
                                if (!weaponLimbCheck.allowed) {
                                  setInvFeedback(
                                    weaponLimbCheck.reason || 'Không đủ chi để cầm vũ khí này!'
                                  );
                                  return;
                                }
                                if (selectedAlly) {
                                  setPlayer((p) => {
                                    const nextParty = [...p.party];
                                    const ally = nextParty[safeInvIdx - 1];
                                    if (!ally || isAllyGearLocked(ally)) return p;
                                    const nextUnlockedWeapons = [...p.unlockedWeapons];
                                    if (
                                      ally.weaponId &&
                                      ally.weaponId !== 'bite_headbutt' &&
                                      ally.weaponId !== wId &&
                                      CONFIG.WEAPONS[ally.weaponId] &&
                                      !nextUnlockedWeapons.includes(ally.weaponId)
                                    ) {
                                      nextUnlockedWeapons.push(ally.weaponId);
                                    }
                                    const needsDropShield = Boolean(w.isTwoHanded || w.hands === 2);
                                    const nextUnlockedShields = [...p.unlockedShields];
                                    if (
                                      needsDropShield &&
                                      ally.equippedShield &&
                                      CONFIG.SHIELDS[ally.equippedShield] &&
                                      !nextUnlockedShields.includes(ally.equippedShield)
                                    ) {
                                      nextUnlockedShields.push(ally.equippedShield);
                                    }
                                    nextParty[safeInvIdx - 1] = {
                                      ...ally,
                                      weaponId: wId,
                                      equippedShield: needsDropShield ? null : ally.equippedShield,
                                    };
                                    return {
                                      ...p,
                                      party: nextParty,
                                      unlockedWeapons: nextUnlockedWeapons,
                                      unlockedShields: nextUnlockedShields,
                                    };
                                  });
                                  setInvFeedback(null);
                                  return;
                                }
                                const unequipCheck = canUnequipWeapon(player);
                                if (!unequipCheck.allowed && wId !== player.equippedWeapon) {
                                  setInvFeedback(
                                    unequipCheck.reason || 'Vũ khí bị nguyền đang khóa chặt!'
                                  );
                                  onAddLog(`${unequipCheck.reason}`);
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
                              className={`px-2 py-1.5 disabled:opacity-40 text-left text-xs cursor-pointer ${
                                isEquippedHere ? 'df-card-active' : 'df-card'
                              }`}
                            >
                              <div className="font-bold text-[#dfd2b4] truncate">
                                {w.name} {w.isTwoHanded || w.hands === 2 ? '[2T]' : ''}{' '}
                                {isForged ? '[HUYẾT RÈN]' : ''} {w.isCursed ? '[NGUYỀN]' : ''}
                              </div>
                              <div className="text-[10px] text-[#9ab08e] truncate">
                                {!weaponLimbCheck.allowed
                                  ? `${weaponLimbCheck.reason}`
                                  : `ST: ${w.dmg[0]}–${w.dmg[1]}${isForged ? ' (+35%)' : ''}`}
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
                              type="button"
                              disabled={isAllyLocked || shieldSlotBroken}
                              onMouseEnter={() => setPreviewItemId(sId)}
                              onClick={() => {
                                setPreviewItemId(sId);
                                if (!check.allowed) {
                                  setInvFeedback(check.reason || 'Không thể trang bị khiên này!');
                                  onAddLog(`${check.reason}`);
                                  return;
                                }
                                if (selectedAlly) {
                                  setPlayer((p) => {
                                    const nextParty = [...p.party];
                                    const ally = nextParty[safeInvIdx - 1];
                                    if (!ally || isAllyGearLocked(ally)) return p;
                                    const nextUnlockedShields = [...p.unlockedShields];
                                    if (
                                      ally.equippedShield &&
                                      ally.equippedShield !== sId &&
                                      CONFIG.SHIELDS[ally.equippedShield] &&
                                      !nextUnlockedShields.includes(ally.equippedShield)
                                    ) {
                                      nextUnlockedShields.push(ally.equippedShield);
                                    }
                                    nextParty[safeInvIdx - 1] = { ...ally, equippedShield: sId };
                                    return {
                                      ...p,
                                      party: nextParty,
                                      unlockedShields: nextUnlockedShields,
                                    };
                                  });
                                  setInvFeedback(null);
                                  return;
                                }
                                setPlayer((p) => ({ ...p, equippedShield: sId }));
                              }}
                              className={`px-2 py-1.5 text-left text-xs cursor-pointer disabled:opacity-40 ${
                                isEquippedHere
                                  ? 'df-card-active'
                                  : check.allowed
                                  ? 'df-card'
                                  : 'df-card border-[#8b0000] opacity-65'
                              }`}
                            >
                              <div className="font-bold text-[#dfd2b4] truncate">{s.name}</div>
                              <div className="text-[10px] text-[#a3b2c4] truncate">
                                {!check.allowed
                                  ? `${check.reason}`
                                  : `Giảm ${Math.round(s.guardReduction * 100)}% ST khi Thủ`}
                              </div>
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
                                type="button"
                                disabled={isAllyLocked}
                                onMouseEnter={() => setPreviewItemId(gId)}
                                onClick={() => {
                                  setPreviewItemId(gId);
                                  if (!check.allowed) {
                                    setInvFeedback(
                                      check.reason || 'Không đủ điều kiện mặc trang bị này!'
                                    );
                                    onAddLog(`${check.reason}`);
                                    return;
                                  }
                                  if (selectedAlly) {
                                    setPlayer((p) => {
                                      const nextParty = [...p.party];
                                      const ally = nextParty[safeInvIdx - 1];
                                      if (!ally || isAllyGearLocked(ally)) return p;
                                      const prevSlotGear =
                                        selectedEquipSlot === 'head'
                                          ? ally.equippedHead
                                          : selectedEquipSlot === 'body'
                                          ? ally.equippedBody
                                          : ally.equippedAccessory;
                                      const nextUnlockedGear = [...p.unlockedGear];
                                      if (
                                        prevSlotGear &&
                                        prevSlotGear !== gId &&
                                        GEAR_ITEMS[prevSlotGear] &&
                                        !nextUnlockedGear.includes(prevSlotGear)
                                      ) {
                                        nextUnlockedGear.push(prevSlotGear);
                                      }
                                      nextParty[safeInvIdx - 1] = {
                                        ...ally,
                                        equippedHead:
                                          selectedEquipSlot === 'head' ? gId : ally.equippedHead,
                                        equippedBody:
                                          selectedEquipSlot === 'body' ? gId : ally.equippedBody,
                                        equippedAccessory:
                                          selectedEquipSlot === 'accessory'
                                            ? gId
                                            : ally.equippedAccessory,
                                      };
                                      return {
                                        ...p,
                                        party: nextParty,
                                        unlockedGear: nextUnlockedGear,
                                      };
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
                                className={`px-2 py-1.5 text-left text-xs cursor-pointer disabled:opacity-40 ${
                                  isEquippedHere
                                    ? 'df-card-active'
                                    : check.allowed
                                    ? 'df-card'
                                    : 'df-card border-[#8b0000] opacity-65'
                                }`}
                              >
                                <div className="font-bold text-[#dfd2b4] truncate">{g.name}</div>
                                <div className="text-[10px] text-[#9ab08e] truncate">
                                  {!check.allowed
                                    ? `${check.reason}`
                                    : `VL +${Math.round(g.physDef * 100)}% • Phép +${Math.round(
                                        g.magDef * 100
                                      )}%`}
                                </div>
                              </button>
                            );
                          })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* TAB 2: TÚI ĐỒ (MASTER-DETAIL, 1 LINE PER ITEM) */}
        {invTab === 'items' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
            {/* Left (7 cols): Scrollable 1-Line Item List */}
            <div className="md:col-span-7 df-well p-2.5 flex flex-col gap-2 min-h-0 overflow-hidden">
              {invFeedback && (
                <div className="px-2.5 py-1.5 bg-[#1a130e] border border-[#c5a059] text-[11px] text-[#dfd2b4] flex items-center justify-between gap-2 shrink-0">
                  <span className="truncate">{invFeedback}</span>
                  <button
                    type="button"
                    onClick={() => setInvFeedback(null)}
                    className="text-[10px] text-[#9b8f82] hover:text-[#d3d3d3] cursor-pointer shrink-0"
                  >
                    [Ẩn]
                  </button>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                {ownedItemEntries.length === 0 ? (
                  <div className="p-6 text-center text-xs italic text-[#7a7066]">
                    Túi đồ hiện đang trống...
                  </div>
                ) : (
                  ownedItemEntries.map(([itemId, count]) => {
                    const item = CONFIG.ITEMS[itemId];
                    if (!item) return null;
                    const isSelected = activeDetailId === itemId;
                    return (
                      <div
                        key={itemId}
                        onClick={() => setPreviewItemId(itemId)}
                        onMouseEnter={() => setPreviewItemId(itemId)}
                        className={`px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs cursor-pointer ${
                          isSelected ? 'df-card-active' : 'df-card'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <ItemArtworkCanvas itemOrWeaponId={itemId} size={28} />
                          <span className="font-bold text-[#dfd2b4] truncate">{item.name}</span>
                          <span className="font-mono text-[11px] text-[#c5a059] shrink-0">
                            • x{count}
                          </span>
                        </div>

                        {itemId === 'crumpled_hunter_note' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenHunterNote();
                            }}
                            className="df-btn-bronze px-2.5 py-1 font-bold text-[11px] cursor-pointer shrink-0"
                          >
                            Đọc
                          </button>
                        ) : item.unlockRecipes && item.unlockRecipes.length > 0 ? (
                          (() => {
                            const missingRecs = item.unlockRecipes!.filter(
                              (rid) => !player.unlockedRecipes.includes(rid)
                            );
                            return missingRecs.length === 0 ? (
                              <span className="px-2 py-0.5 bg-[#121914] border border-[#3a3a3a] text-[10px] font-bold text-[#9ab08e] shrink-0">
                                Đã Học
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sfx.playHealOrChime();
                                  setPlayer((prev) => ({
                                    ...prev,
                                    inventory: {
                                      ...prev.inventory,
                                      [itemId]: Math.max(0, (prev.inventory[itemId] || 0) - 1),
                                    },
                                    unlockedRecipes: Array.from(
                                      new Set([
                                        ...prev.unlockedRecipes,
                                        ...(item.unlockRecipes || []),
                                      ])
                                    ),
                                  }));
                                  const msg = `Đã giải mã [${item.name}], mở khóa ${missingRecs.length} công thức Giả Kim mới!`;
                                  setInvFeedback(msg);
                                  onAddLog(msg);
                                }}
                                className="df-btn-bronze px-2.5 py-1 font-bold text-[11px] cursor-pointer shrink-0"
                              >
                                Học CT
                              </button>
                            );
                          })()
                        ) : itemId === 'scroll_shadow_step' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              sfx.playSfx('ritual');
                              setPlayer((prev) => ({
                                ...prev,
                                inventory: {
                                  ...prev.inventory,
                                  scroll_shadow_step: Math.max(
                                    0,
                                    (prev.inventory.scroll_shadow_step || 0) - 1
                                  ),
                                },
                                stealthStepsTurns: Math.max(prev.stealthStepsTurns || 0, 8),
                              }));
                              const msg =
                                'Niệm [Cuộn Bước Chân Bóng Tối]: Ẩn mình khỏi tầm nhìn quái vật trong 8 bước di chuyển!';
                              setInvFeedback(msg);
                              onAddLog(msg);
                              onClose();
                              onShowLogOverlay();
                            }}
                            className="df-btn-bronze px-2.5 py-1 font-bold text-[11px] cursor-pointer shrink-0"
                          >
                            Ẩn Thân
                          </button>
                        ) : item.unlockSkillId ? (
                          (() => {
                            const skId = item.unlockSkillId!;
                            const skDef = CONFIG.SKILLS.find((s) => s.id === skId);
                            const alreadyUnlocked = (player.skillLevels[skId] || 0) >= 1;
                            return alreadyUnlocked ? (
                              <span className="px-2 py-0.5 bg-[#121914] border border-[#3a3a3a] text-[10px] font-bold text-[#9ab08e] shrink-0">
                                Cấp {player.skillLevels[skId]}
                              </span>
                            ) : selectedAlly ? (
                              <span className="px-2 py-0.5 bg-[#141118] border border-[#3a3a3a] text-[10px] text-[#9b8f82] shrink-0">
                                Chỉ Chính
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
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
                                  const msg = `Đã lĩnh hội [${item.name}], khai mở cổ thuật [${skDef?.name || skId}].`;
                                  setInvFeedback(msg);
                                  onAddLog(msg);
                                }}
                                className="df-btn-bronze px-2.5 py-1 font-bold text-[11px] cursor-pointer shrink-0"
                              >
                                Lĩnh Hội
                              </button>
                            );
                          })()
                        ) : itemId === 'brown_vial' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              onPromptCrackedWallExplosion();
                            }}
                            className="df-btn-blood px-2.5 py-1 font-bold text-[11px] cursor-pointer shrink-0"
                          >
                            Nổ [F]
                          </button>
                        ) : itemId === 'rotten_meat' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
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
                                  (d) =>
                                    !(d.x === playerPos.x && d.y === playerPos.y) && d.turnsLeft > 0
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
                                'Đã đặt [Thịt Thối] xuống nền đá lạnh. Mùi tanh nồng lan tỏa, thu hút lũ quái vật trong bóng tối.';
                              setInvFeedback(msg);
                              onAddLog(msg);
                              onClose();
                              onShowLogOverlay();
                            }}
                            className="df-btn-bronze px-2.5 py-1 font-bold text-[11px] cursor-pointer shrink-0"
                          >
                            Đặt Mồi
                          </button>
                        ) : itemId === 'bone_saw' || itemId === 'scroll_emergency_amputation' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAmputating(true);
                              setSawTargetMemberIdx(null);
                              setPreviewItemId(itemId);
                              setInvFeedback(null);
                              setInvTab('saw');
                            }}
                            className="df-btn-blood px-2.5 py-1 font-bold text-[11px] cursor-pointer shrink-0"
                          >
                            Cắt Chi
                          </button>
                        ) : item.mapUsable ? (
                          <button
                            type="button"
                            disabled={Boolean(selectedAlly && selectedAlly.hp <= 0)}
                            onClick={(e) => {
                              e.stopPropagation();
                              const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                              const logs: string[] = [];
                              const isSharedLight = itemId === 'torch' || itemId === 'oil_lamp';
                              if (selectedAlly && !isSharedLight) {
                                applySupportItemToAlly(pCopy, safeInvIdx - 1, itemId, logs);
                              } else {
                                pCopy.inventory[itemId] = Math.max(
                                  0,
                                  (pCopy.inventory[itemId] || 0) - 1
                                );
                                applySupportItemEffects(pCopy, itemId, logs);
                                if (isSharedLight) {
                                  torchLowWarnedRef.current = false;
                                }
                              }
                              setPlayer(pCopy);
                              if (logs.length > 0) {
                                setInvFeedback(logs.join(' '));
                                logs.forEach((l) => onAddLog(l));
                              }
                              if (
                                itemId === 'elixir_of_ancients' &&
                                !selectedAlly &&
                                pCopy.classId === 'night_hunter'
                              ) {
                                if (pCopy.questFlags?.vaelisDefeated) {
                                  onTriggerNightHunterElixirEnding(pCopy);
                                } else {
                                  onAddLog(
                                    'Độc hóa đá đã tan! Hãy hạ gục Vaelis ở Tầng 1 để phá Kết Giới và mở đường thoát thân, hoặc tiến tới Vết Rách Tầng 3.'
                                  );
                                }
                              }
                            }}
                            className="df-btn-bronze px-2.5 py-1 disabled:opacity-35 font-bold text-[11px] cursor-pointer shrink-0"
                          >
                            Dùng
                          </button>
                        ) : item.combatUsable ? (
                          <span className="px-2 py-0.5 bg-[#141118] border border-[#3a3a3a] text-[10px] text-[#9b8f82] shrink-0">
                            Trong Trận
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#141118] border border-[#3a3a3a] text-[10px] text-[#9b8f82] shrink-0">
                            {item.category === 'currency'
                              ? 'Tiền Tệ'
                              : item.category === 'key'
                              ? 'Chìa Khóa'
                              : item.category === 'stone'
                              ? 'Tinh Thạch'
                              : 'Cổ Vật'}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right (5 cols): Fixed Item Detail Panel + Compact Member Survival Bars */}
            <div className="md:col-span-5 flex flex-col gap-2.5 min-h-0">
              <div className="df-well p-3.5 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 border-b border-[#3a3a3a] pb-2.5">
                    <ItemArtworkCanvas itemOrWeaponId={activeDetailId} size={56} />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-[#9b8f82]">
                        Chi Tiết Vật Phẩm
                      </div>
                      <h3
                        className="text-base font-bold text-[#c5a059] leading-tight"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        {activeDetailName}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-[#e7dcc8] leading-relaxed">{activeDetailDesc}</p>
                </div>
                <div className="text-[10px] text-[#8e847b] border-t border-[#3a3a3a]/60 pt-2">
                  Áp dụng vật phẩm lên: <b className="text-[#dfd2b4]">{selectedMemberName}</b>
                </div>
              </div>

              {renderCompactSurvivalBars()}
            </div>
          </div>
        )}

        {/* TAB 3: GIẢ KIM (2-COLUMN COMPACT RECIPE CARDS) */}
        {invTab === 'alchemy' && (() => {
          const unlockedRecipesList = CONFIG.RECIPES.filter((rec) =>
            player.unlockedRecipes.includes(rec.id)
          );
          return (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
              {invFeedback && (
                <div className="px-2.5 py-1.5 df-well border-[#c5a059] text-[11px] text-[#dfd2b4]">
                  {invFeedback}
                </div>
              )}
              {unlockedRecipesList.length === 0 ? (
                <div className="p-6 df-well text-center text-xs italic text-[#9b8f82]">
                  Chưa nắm giữ công thức giả kim nào. Hãy tìm các quyển sách Pha Chế Thuốc trong hầm ngục.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {unlockedRecipesList.map((rec) => {
                    const ingEntries = Object.entries(rec.ingredients);
                    const canCraft = ingEntries.every(
                      ([ingId, qty]) => (player.inventory[ingId] || 0) >= qty
                    );
                    return (
                      <div
                        key={rec.id}
                        onMouseEnter={() => setPreviewItemId(rec.resultItemId)}
                        className="p-2.5 df-card flex flex-col justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <ItemArtworkCanvas itemOrWeaponId={rec.resultItemId} size={28} />
                            <span className="font-bold text-[#dfd2b4] truncate">{rec.name}</span>
                          </div>
                          <button
                            type="button"
                            disabled={!canCraft}
                            onClick={() => {
                              sfx.playHealOrChime();
                              setPlayer((prev) => {
                                const nextInv = { ...prev.inventory };
                                for (const [ingId, qty] of ingEntries) {
                                  nextInv[ingId] = Math.max(0, (nextInv[ingId] || 0) - qty);
                                }
                                nextInv[rec.resultItemId] = (nextInv[rec.resultItemId] || 0) + 1;
                                return { ...prev, inventory: nextInv };
                              });
                              const msg = `Điều chế thành công [${CONFIG.ITEMS[rec.resultItemId]?.name || rec.name}].`;
                              setInvFeedback(msg);
                              onAddLog(msg);
                            }}
                            className="df-btn-bronze px-2.5 py-1 disabled:opacity-35 text-[11px] font-bold cursor-pointer shrink-0"
                          >
                            Pha Chế
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {ingEntries.map(([ingId, qty]) => {
                            const owned = player.inventory[ingId] || 0;
                            const enough = owned >= qty;
                            const ingName = CONFIG.ITEMS[ingId]?.name || ingId;
                            return (
                              <span
                                key={ingId}
                                className={`px-1.5 py-0.5 text-[10px] border font-mono ${
                                  enough
                                    ? 'bg-[#121914] border-[#4a6b48] text-[#9ab08e]'
                                    : 'bg-[#2a0c10] border-[#8b0000]/75 text-[#c96b6b]'
                                }`}
                              >
                                {ingName} {owned}/{qty}
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
          );
        })()}

        {/* TAB 4: CƯA XƯƠNG & GIẢI PHẪU */}
        {invTab === 'saw' &&
          isAmputating &&
          (() => {
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
              limbDefs.filter(([k]) => (limbsObj?.[k] ?? true) && Boolean(limbsObj?.infected?.[k]))
                .length;

            return (
              <div className="space-y-3 df-well border-[#8b0000]/60 p-3.5 flex-1 min-h-0 overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a3a3a]/60 pb-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    <span
                      className={`px-2 py-0.5 border ${
                        sawStep === 1
                          ? 'bg-[#2e0b0f] border-[#8b0000] text-[#dfd2b4]'
                          : 'bg-[#151217] border-[#3a3a3a] text-[#9b8f82]'
                      }`}
                    >
                      1. Chọn Thành Viên
                    </span>
                    <span className="text-[#7a7066]">→</span>
                    <span
                      className={`px-2 py-0.5 border ${
                        sawStep === 2
                          ? 'bg-[#2e0b0f] border-[#8b0000] text-[#dfd2b4]'
                          : 'bg-[#110e14] border-[#3a3a3a] text-[#7a7066]'
                      }`}
                    >
                      2. Cắt Chi Nhiễm Trùng (-12 SL)
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
                    ← Túi Đồ
                  </button>
                </div>

                {invFeedback && (
                  <div className="p-2 df-well border-[#8b0000] text-xs text-[#dfd2b4] flex items-center justify-between gap-2">
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

                {sawStep === 1 && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-[#d3d3d3]">
                      Chọn thành viên cần phẫu thuật —{' '}
                      <b>Cưa Xương (x{player.inventory.bone_saw || 0})</b> •{' '}
                      <b>Cuộn Cắt Chi (x{player.inventory.scroll_emergency_amputation || 0})</b>:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
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
                            className="p-2.5 df-card text-left space-y-1.5 cursor-pointer"
                          >
                            <div className="font-bold text-xs text-[#dfd2b4] truncate">
                              ✦ {player.name}
                            </div>
                            <div className="text-[11px] font-mono text-[#c96b6b]">
                              SL:{' '}
                              <b>
                                {player.hp}/{player.maxHp}
                              </b>
                            </div>
                            <div
                              className={`text-[10px] px-1.5 py-0.5 border inline-block ${
                                infCount > 0
                                  ? 'bg-[#2e0b0f] border-[#8b0000] text-[#dfd2b4] font-bold'
                                  : 'bg-[#121914] border-[#3a3a3a] text-[#9ab08e]'
                              }`}
                            >
                              {infCount > 0 ? `[${infCount} CHI NHIỄM]` : 'Bình thường'}
                            </div>
                          </button>
                        );
                      })()}

                      {[0, 1, 2].map((slotIdx) => {
                        const ally = player.party[slotIdx];
                        if (!ally) {
                          return (
                            <div
                              key={`saw_empty_${slotIdx}`}
                              className="p-2.5 df-well opacity-45 text-[11px] text-[#7a7066] flex items-center justify-center"
                            >
                              [Trống #{slotIdx + 1}]
                            </div>
                          );
                        }
                        const hasBoneSaw = (player.inventory.bone_saw || 0) > 0;
                        const infCount = countInfectedLimbs(ally.limbs);
                        const cannotOperate =
                          !hasBoneSaw || ally.hp <= 0 || Boolean(ally.isUndeadSummon);
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
                            className="p-2.5 df-card disabled:opacity-45 text-left space-y-1.5 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <div className="font-bold text-xs text-[#dfd2b4] truncate">
                              {ally.name}
                            </div>
                            <div className="text-[11px] font-mono text-[#c96b6b]">
                              SL:{' '}
                              <b>
                                {ally.hp}/{ally.maxHp}
                              </b>
                            </div>
                            <div
                              className={`text-[10px] px-1.5 py-0.5 border inline-block ${
                                ally.isUndeadSummon
                                  ? 'bg-[#1d1226] border-[#8e6ca3] text-[#d3d3d3]'
                                  : ally.hp <= 0
                                  ? 'bg-[#2a0c10] border-[#8b0000] text-[#c96b6b]'
                                  : !hasBoneSaw
                                  ? 'bg-[#1a1518] border-[#6b531c] text-[#9b8f82]'
                                  : infCount > 0
                                  ? 'bg-[#2e0b0f] border-[#8b0000] text-[#dfd2b4] font-bold'
                                  : 'bg-[#121914] border-[#3a3a3a] text-[#9ab08e]'
                              }`}
                            >
                              {ally.isUndeadSummon
                                ? 'Bất tử'
                                : ally.hp <= 0
                                ? 'Đã gục'
                                : !hasBoneSaw
                                ? 'Chỉ dùng cho nhân vật chính'
                                : infCount > 0
                                ? `[${infCount} CHI NHIỄM]`
                                : 'Bình thường'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sawStep === 2 && sawTargetMemberIdx !== null && (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 df-well px-3 py-1.5">
                      <div className="text-xs text-[#d3d3d3]">
                        Đối tượng: <b className="text-[#c5a059]">{targetName}</b>{' '}
                        <span className="font-mono text-[#c96b6b] ml-1.5">
                          (SL: {targetHp}/{targetMaxHp})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSawTargetMemberIdx(null);
                          setInvFeedback(null);
                        }}
                        className="df-btn px-2 py-0.5 text-[11px] cursor-pointer"
                      >
                        ← Đổi người
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {limbDefs.map(([limbKey, label]) => {
                        const intact = targetLimbs?.[limbKey] ?? true;
                        const infected = targetLimbs?.infected?.[limbKey] ?? false;
                        const isCursedArm =
                          !sawTargetAlly &&
                          Boolean(player.cursedLockedWeapon) &&
                          (limbKey === 'rightArm' || limbKey === 'leftArm');
                        const hasScrollAmp =
                          !sawTargetAlly &&
                          (player.inventory.scroll_emergency_amputation || 0) > 0;
                        const hasBoneSaw = (player.inventory.bone_saw || 0) > 0;
                        const canAmputate =
                          intact && (infected || isCursedArm) && (hasBoneSaw || hasScrollAmp);
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
                                : hasBoneSaw
                                ? amputateInfectedLimbWithBoneSaw(pCopy, limbKey)
                                : useEmergencyAmputationScroll(pCopy, limbKey);
                              setPlayer(pCopy);
                              if (res.success) {
                                setInvFeedback(res.message);
                                onAddLog(`${res.message}`);
                              } else {
                                setInvFeedback(res.message);
                                onAddLog(res.message);
                              }
                            }}
                            className={`p-2.5 text-left space-y-1.5 ${
                              canAmputate
                                ? 'df-card-active cursor-pointer'
                                : 'df-card opacity-55 cursor-not-allowed'
                            }`}
                          >
                            <div className="font-bold text-xs text-[#dfd2b4]">{label}</div>
                            <div>
                              {!intact ? (
                                <span className="px-1.5 py-0.5 bg-[#1f1315] border border-[#3a3a3a] text-[10px] font-bold text-[#9ca3af]">
                                  Đã mất
                                </span>
                              ) : infected ? (
                                <span className="px-1.5 py-0.5 bg-[#2e0b0f] border border-[#8b0000] text-[10px] font-bold text-[#dfd2b4] animate-pulse">
                                  NHIỄM TRÙNG
                                </span>
                              ) : isCursedArm ? (
                                <span className="px-1.5 py-0.5 bg-[#241126] border border-[#8e6ca3] text-[10px] font-bold text-[#e9d5ff]">
                                  [VŨ KHÍ NGUYỀN]
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-[#121914] border border-[#3a3a3a] text-[10px] font-bold text-[#9ab08e]">
                                  Bình thường
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#9b8f82]">
                              {!intact
                                ? 'Đã cắt rời'
                                : infected || isCursedArm
                                ? 'Bấm cưa (-12 SL)'
                                : 'An toàn'}
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
};
