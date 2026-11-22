import React from 'react';
import { Flame } from 'lucide-react';
import { CONFIG } from '../game/config';
import { sfx } from '../game/audio';
import { RoomData } from '../game/mapGen';
import {
  PlayerState,
  isHolyMotherBanned,
  canUseHolySkill,
  exorciseCursedWeapon,
  regrowLimbAtHexen,
  unlockHexenStatNode,
  learnOrUpgradeHexenSkill,
} from '../game/combat';

export type HexenTab = 'skills' | 'rituals';

export interface HexenModalProps {
  player: PlayerState;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
  currentRoom: RoomData;
  hexenTab: HexenTab;
  setHexenTab: React.Dispatch<React.SetStateAction<HexenTab>>;
  selectedHexenSkillId: string | null;
  setSelectedHexenSkillId: React.Dispatch<React.SetStateAction<string | null>>;
  hexenFeedback: string | null;
  setHexenFeedback: React.Dispatch<React.SetStateAction<string | null>>;
  onClose: () => void;
  onAddLog: (msg: string) => void;
  onTriggerVoidPortal: (destId: 'F1_R0' | 'F2_R0' | 'F3_R0') => void;
}

type BranchKey = 'Chiến Kỹ' | 'Thánh Mẫu' | 'Huyết Quỷ' | 'Hư Vô';

interface BranchVisualMeta {
  name: BranchKey;
  symbol: string;
  stroke: string;
  glow: string;
  textClass: string;
  nodeBgLit: string;
  rowY: number;
}

const CIRCUIT_W = 640;
const CIRCUIT_H = 424;
const ROOT_X = 52;

const BRANCH_META: BranchVisualMeta[] = [
  {
    name: 'Chiến Kỹ',
    symbol: '✦',
    stroke: '#c5a059',
    glow: 'rgba(197,160,89,0.65)',
    textClass: 'text-[#c5a059]',
    nodeBgLit: 'bg-[#1f1910] border-[#c5a059]',
    rowY: 54,
  },
  {
    name: 'Thánh Mẫu',
    symbol: '†',
    stroke: '#e2e8f0',
    glow: 'rgba(226,232,240,0.62)',
    textClass: 'text-[#e2e8f0]',
    nodeBgLit: 'bg-[#181b22] border-[#e2e8f0]',
    rowY: 160,
  },
  {
    name: 'Huyết Quỷ',
    symbol: '◈',
    stroke: '#b91c1c',
    glow: 'rgba(185,28,28,0.7)',
    textClass: 'text-[#dc4c4c]',
    nodeBgLit: 'bg-[#220d10] border-[#b91c1c]',
    rowY: 266,
  },
  {
    name: 'Hư Vô',
    symbol: '⌖',
    stroke: '#9333ea',
    glow: 'rgba(147,51,234,0.7)',
    textClass: 'text-[#b97cf5]',
    nodeBgLit: 'bg-[#190e26] border-[#9333ea]',
    rowY: 372,
  },
];

// Build an exact 45-degree chamfered polyline between two circuit points
function build45TracePoints(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const dy = y2 - y1;
  if (Math.abs(dy) >= 2) {
    const halfStep = Math.abs(dy) / 2;
    return `${x1},${y1} ${midX - halfStep},${y1} ${midX + halfStep},${y2} ${x2},${y2}`;
  }
  // Subtle 45° rune-channel jog when points share the same Y
  const jog = 8;
  return `${x1},${y1} ${midX - 18},${y1} ${midX - 18 + jog},${y1 - jog} ${midX + 18 - jog},${y1 - jog} ${midX + 18},${y1} ${x2},${y2}`;
}

export const HexenModal: React.FC<HexenModalProps> = ({
  player,
  setPlayer,
  currentRoom,
  hexenTab,
  setHexenTab,
  selectedHexenSkillId,
  setSelectedHexenSkillId,
  hexenFeedback,
  setHexenFeedback,
  onClose,
  onAddLog,
  onTriggerVoidPortal,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-5xl w-full df-panel p-4 space-y-2.5 max-h-[86vh] flex flex-col overflow-hidden">
        {/* Modal Header with 2 Compact Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a3a3a] pb-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#8b0000]" />
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#c5a059]">
                Đài Cộng Hưởng (Đá LH: {player.energyStones})
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  sfx.playSfx('ui_confirm');
                  setHexenTab('skills');
                }}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider cursor-pointer ${
                  hexenTab === 'skills' ? 'df-card-active text-[#f3e6c4]' : 'df-btn text-[#a3998f]'
                }`}
              >
                Cây Kỹ Năng
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.playSfx('ui_confirm');
                  setHexenTab('rituals');
                }}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider cursor-pointer ${
                  hexenTab === 'rituals'
                    ? 'df-card-active text-[#f3e6c4]'
                    : 'df-btn text-[#a3998f]'
                }`}
              >
                Cường Hóa &amp; Cổng Hư Vô
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setHexenFeedback(null);
              onClose();
            }}
            className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
          >
            Đóng [ESC]
          </button>
        </div>

        {hexenFeedback && (
          <div className="px-2.5 py-1.5 df-well border-[#c5a059] text-xs text-[#dfd2b4] shrink-0">
            {hexenFeedback}
          </div>
        )}

        {hexenTab === 'skills' ? (
          /* TAB 1: STONE-CARVED 45° SVG RUNE CIRCUIT + MASTER-DETAIL */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
            {/* Left (8 cols): 45° Engraved Stone Rune Circuit Tablet */}
            <div
              className="lg:col-span-8 relative bg-[#0b090e] border border-[#3c3328] shadow-[inset_0_0_32px_rgba(0,0,0,0.88)] overflow-hidden min-h-[410px] flex items-center justify-center"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(197,160,89,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(197,160,89,0.055) 1px, transparent 1px), radial-gradient(ellipse at 32% 50%, rgba(110,82,45,0.09), transparent 72%)',
                backgroundSize: '24px 24px, 24px 24px, 100% 100%',
              }}
            >
              {/* Inner Altar Corner Etchings */}
              <div className="pointer-events-none absolute inset-1.5 border border-[#2a231c]/70" />

              {(() => {
                // Precompute node geometry & revelation status for all 4 left-to-right rune tracks
                const tracks = BRANCH_META.map((meta) => {
                  const branchSkills = CONFIG.SKILLS.filter((s) => s.branch === meta.name);
                  const xs =
                    branchSkills.length === 4
                      ? [180, 314, 448, 578]
                      : [204, 372, 540];

                  const nodes = branchSkills.map((sk, idx) => {
                    const curLv = player.skillLevels[sk.id] || 0;
                    const lockedByBan =
                      sk.branch === 'Thánh Mẫu' && isHolyMotherBanned(player);
                    const lockedByDemonic =
                      sk.branch === 'Thánh Mẫu' &&
                      !lockedByBan &&
                      !canUseHolySkill(player, sk).allowed;
                    const lockedHoly = lockedByBan || lockedByDemonic;
                    const reqAff = sk.requiredAffinity;
                    const curAff = reqAff ? player.affinities?.[reqAff.pillar] || 0 : 0;
                    const affMet = !reqAff || curAff >= reqAff.level;
                    const isRevealed =
                      curLv >= 1 || (Boolean(reqAff) && affMet && !lockedHoly);
                    const yOffset = idx % 2 === 0 ? -8 : 8;
                    return {
                      sk,
                      curLv,
                      isRevealed,
                      lockedHoly,
                      x: xs[idx] ?? 540,
                      y: meta.rowY + yOffset,
                    };
                  });

                  const anyActive = nodes.some((n) => n.curLv >= 1 || n.isRevealed);
                  return { meta, nodes, anyActive };
                });

                return (
                  <div className="relative w-full h-full min-h-[410px]">
                    {/* SVG 45° Rune Circuit Layer */}
                    <svg
                      viewBox={`0 0 ${CIRCUIT_W} ${CIRCUIT_H}`}
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      aria-hidden="true"
                    >
                      {/* Vertical engraved stone spine connecting the 4 root sigils */}
                      <polyline
                        points={`${ROOT_X},${BRANCH_META[0].rowY} ${ROOT_X},${BRANCH_META[3].rowY}`}
                        fill="none"
                        stroke="#2a262c"
                        strokeWidth={2}
                        strokeDasharray="3 5"
                        opacity={0.55}
                      />

                      {/* Faint horizontal rune guide rails for each track */}
                      {tracks.map(({ meta }) => (
                        <line
                          key={`rail-${meta.name}`}
                          x1={ROOT_X}
                          y1={meta.rowY}
                          x2={CIRCUIT_W - 22}
                          y2={meta.rowY}
                          stroke="#211d24"
                          strokeWidth={1}
                          opacity={0.5}
                        />
                      ))}

                      {/* 45° Angled Circuit Traces from Root -> Skill 1 -> Skill 2 -> ... */}
                      {tracks.map(({ meta, nodes }) =>
                        nodes.map((node, idx) => {
                          const prevX = idx === 0 ? ROOT_X : nodes[idx - 1].x;
                          const prevY = idx === 0 ? meta.rowY : nodes[idx - 1].y;
                          const isLit = node.curLv >= 1 || node.isRevealed;
                          const pts = build45TracePoints(prevX, prevY, node.x, node.y);

                          return (
                            <g key={`trace-${node.sk.id}`}>
                              {/* Recessed stone channel under-groove */}
                              <polyline
                                points={pts}
                                fill="none"
                                stroke="#060508"
                                strokeWidth={5.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.85}
                              />
                              {/* Active or Dormant Rune Energy Trace */}
                              <polyline
                                points={pts}
                                fill="none"
                                stroke={isLit ? meta.stroke : '#2a262c'}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray={isLit ? undefined : '5 4'}
                                opacity={
                                  isLit ? (node.curLv >= 1 ? 0.98 : 0.72) : 0.4
                                }
                                style={
                                  isLit
                                    ? {
                                        filter: `drop-shadow(0 0 4px ${meta.glow})`,
                                      }
                                    : undefined
                                }
                              />
                              {/* Tiny 45° etched junction diamond at segment midpoint */}
                              <circle
                                cx={(prevX + node.x) / 2}
                                cy={(prevY + node.y) / 2}
                                r={isLit ? 2.4 : 1.8}
                                fill={isLit ? meta.stroke : '#2a262c'}
                                opacity={isLit ? 0.9 : 0.4}
                              />
                            </g>
                          );
                        })
                      )}
                    </svg>

                    {/* Root Branch Sigils (Left Origin Column) */}
                    {tracks.map(({ meta, anyActive }) => (
                      <div
                        key={`root-${meta.name}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none select-none"
                        style={{
                          left: `${(ROOT_X / CIRCUIT_W) * 100}%`,
                          top: `${(meta.rowY / CIRCUIT_H) * 100}%`,
                        }}
                      >
                        <div
                          className={`w-9 h-9 flex items-center justify-center border text-sm transition-all ${
                            anyActive
                              ? `${meta.nodeBgLit} shadow-[0_0_12px_rgba(0,0,0,0.9)]`
                              : 'bg-[#121016] border-[#2d2830] opacity-55'
                          }`}
                          style={{
                            clipPath:
                              'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                            boxShadow: anyActive ? `0 0 10px ${meta.glow}` : undefined,
                          }}
                        >
                          <span className={anyActive ? meta.textClass : 'text-[#5b5560]'}>
                            {meta.symbol}
                          </span>
                        </div>
                        <span
                          className={`mt-1 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap px-1 bg-[#0b090e]/90 ${
                            anyActive ? meta.textClass : 'text-[#625b66]'
                          }`}
                        >
                          {meta.name}
                        </span>
                      </div>
                    ))}

                    {/* Interactive Rune Skill Nodes Mounted Directly on Circuit Vertices */}
                    {tracks.map(({ meta, nodes }) =>
                      nodes.map(({ sk, curLv, isRevealed, x, y }) => {
                        const isSelected = selectedHexenSkillId === sk.id;
                        const isLit = curLv >= 1 || isRevealed;
                        const shortName =
                          sk.name.length > 18 ? `${sk.name.slice(0, 17)}…` : sk.name;

                        return (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => {
                              sfx.playSfx('ui_confirm');
                              setSelectedHexenSkillId(sk.id);
                            }}
                            className="group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer focus:outline-none z-10"
                            style={{
                              left: `${(x / CIRCUIT_W) * 100}%`,
                              top: `${(y / CIRCUIT_H) * 100}%`,
                            }}
                            title={isRevealed ? sk.name : '???'}
                          >
                            {/* Octagonal / Circular Engraved Rune Node Socket */}
                            <div
                              className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-150 ${
                                isSelected
                                  ? 'ring-2 ring-[#c5a059] ring-offset-2 ring-offset-[#0b090e] scale-110'
                                  : 'group-hover:scale-105'
                              } ${
                                curLv >= 1
                                  ? meta.nodeBgLit
                                  : isRevealed
                                  ? 'bg-[#17141d] border-[#6a5c4a] group-hover:border-[#c5a059]'
                                  : 'bg-[#110f15] border-[#2d2830] opacity-70 group-hover:opacity-95'
                              }`}
                              style={{
                                boxShadow: isSelected
                                  ? '0 0 14px rgba(197,160,89,0.55)'
                                  : curLv >= 1
                                  ? `0 0 10px ${meta.glow}`
                                  : 'inset 0 0 8px rgba(0,0,0,0.85)',
                              }}
                            >
                              {/* Subtle inner octagonal rune ring */}
                              <span
                                className={`text-sm leading-none ${
                                  isLit ? meta.textClass : 'text-[#524c57]'
                                }`}
                              >
                                {isRevealed ? meta.symbol : '?'}
                              </span>
                            </div>

                            {/* Compact Label + 3 Level Dots Directly Beneath Node */}
                            <div className="mt-1 px-1.5 py-0.5 bg-[#0b090e]/92 border border-[#241f28]/80 flex flex-col items-center leading-none max-w-[116px]">
                              <span
                                className={`text-[10px] font-bold truncate max-w-[106px] ${
                                  !isRevealed
                                    ? 'tracking-widest text-[#706874]'
                                    : curLv > 0
                                    ? 'text-[#f3e6c4]'
                                    : 'text-[#cfc0a9]'
                                }`}
                              >
                                {isRevealed ? shortName : '???'}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5 text-[9px] leading-none">
                                {[1, 2, 3].map((pip) => (
                                  <span
                                    key={pip}
                                    style={
                                      curLv >= pip
                                        ? { color: meta.stroke }
                                        : undefined
                                    }
                                    className={
                                      curLv >= pip
                                        ? 'font-bold'
                                        : isRevealed
                                        ? 'text-[#554d47]'
                                        : 'text-[#39343d]'
                                    }
                                  >
                                    {curLv >= pip ? '●' : '○'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Right (4 cols): Fixed Detail Panel for the Selected Skill */}
            <div className="lg:col-span-4 df-well p-3.5 flex flex-col justify-between min-h-[240px]">
              {(() => {
                const sk = selectedHexenSkillId
                  ? CONFIG.SKILLS.find((s) => s.id === selectedHexenSkillId) || null
                  : null;

                if (!sk) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-3 space-y-2">
                      <Flame className="w-6 h-6 text-[#6e5638]" />
                      <p className="text-xs text-[#9b8f82] italic leading-relaxed">
                        Chọn một ấn ký trên mạch cổ ngữ để cảm nhận thần lực.
                      </p>
                    </div>
                  );
                }

                const curLv = player.skillLevels[sk.id] || 0;
                const lockedByBan = sk.branch === 'Thánh Mẫu' && isHolyMotherBanned(player);
                const lockedByDemonic =
                  sk.branch === 'Thánh Mẫu' &&
                  !lockedByBan &&
                  !canUseHolySkill(player, sk).allowed;
                const lockedHoly = lockedByBan || lockedByDemonic;
                const reqAff = sk.requiredAffinity;
                const curAff = reqAff ? player.affinities?.[reqAff.pillar] || 0 : 0;
                const affMet = !reqAff || curAff >= reqAff.level;
                const isRevealed = curLv >= 1 || (Boolean(reqAff) && affMet && !lockedHoly);

                if (!isRevealed) {
                  return (
                    <div className="flex-1 flex flex-col justify-center space-y-3">
                      <div className="border-b border-[#3a3a3a] pb-2">
                        <div className="text-[10px] uppercase tracking-wider text-[#7d746b]">
                          Nhánh {sk.branch}
                        </div>
                        <h3 className="text-lg font-bold tracking-widest text-[#7d746b] mt-0.5">
                          ???
                        </h3>
                      </div>
                      <p className="text-xs text-[#8e847b] italic leading-relaxed">
                        {sk.branch === 'Chiến Kỹ'
                          ? 'Bí kỹ thất lạc giữa các trang cổ thư...'
                          : lockedHoly
                          ? 'Ánh sáng khước từ chạm vào ấn ký này.'
                          : 'Ấn ký im lìm — chưa cảm nhận được lời hồi đáp...'}
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="space-y-3">
                      <div className="border-b border-[#3a3a3a] pb-2 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-[#c5a059]">
                            Nhánh {sk.branch}
                          </span>
                          <span className="font-mono text-[11px] px-1.5 py-0.5 border border-[#c5a059]/60 bg-[#1a130e] text-[#c5a059]">
                            Cấp {curLv}/3
                          </span>
                        </div>
                        <h3
                          className="text-lg font-bold text-[#f3e6c4] leading-tight"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                          {sk.name}
                        </h3>
                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="text-[#c5a059] font-semibold">
                            Tiêu hao: -{sk.mindCost} Lý Trí
                            {sk.hpCost ? ` • -${sk.hpCost} Sinh Lực` : ''}
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            {[1, 2, 3].map((pip) => (
                              <span
                                key={pip}
                                className={curLv >= pip ? 'text-[#c5a059]' : 'text-[#524940]'}
                              >
                                {curLv >= pip ? '●' : '○'}
                              </span>
                            ))}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#e7dcc8] leading-relaxed">
                        {curLv <= 1 ? sk.descLv1 : curLv === 2 ? sk.descLv2 : sk.descLv3}
                      </p>

                      {curLv >= 1 && curLv < 3 && (
                        <div className="p-2 bg-[#141017] border border-[#3a322a] space-y-0.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#c5a059]">
                            Cấp kế tiếp (Cấp {curLv + 1}):
                          </div>
                          <p className="text-[11px] text-[#cfc0a9] leading-relaxed">
                            {curLv === 1 ? sk.descLv2 : sk.descLv3}
                          </p>
                        </div>
                      )}

                      {lockedHoly && (
                        <p className="text-[11px] text-[#c96b6b] italic">
                          Ánh sáng khước từ chạm vào ấn ký này.
                        </p>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-[#3a3a3a]">
                      {curLv >= 3 ? (
                        <div className="w-full py-2 text-center text-xs font-bold uppercase tracking-wider text-[#c5a059] df-card-active">
                          ✦ Đã Đạt Cấp Tối Đa (3/3)
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={player.energyStones < 1 || lockedHoly}
                          onClick={() => {
                            const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                            const res = learnOrUpgradeHexenSkill(pCopy, sk.id);
                            if (res.success) {
                              sfx.playHealOrChime();
                              setPlayer(pCopy);
                            }
                            setHexenFeedback(res.message);
                            onAddLog(res.message);
                          }}
                          className="w-full df-btn-blood px-3 py-2 disabled:opacity-35 font-bold text-xs uppercase tracking-wider cursor-pointer"
                        >
                          {curLv === 0
                            ? 'Học Cấp 1 (-1 Đá LH)'
                            : `Nâng Cấp ${curLv + 1} (-1 Đá LH)`}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          /* TAB 2: CƯỜNG HÓA & CỔNG HƯ VÔ */
          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-0.5">
            {/* 3 Cosmic Pillars Diegetic Resonance Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 df-well p-2.5 text-xs">
              {(
                [
                  ['holyMother', '† Thánh Mẫu', player.affinities?.holyMother || 0, 'text-[#c5a059]'],
                  [
                    'primordialVoid',
                    '⌖ Hư Vô Nguyên Thủy',
                    player.affinities?.primordialVoid || 0,
                    'text-[#a889b8]',
                  ],
                  ['demonicPact', '◈ Huyết Quỷ', player.affinities?.demonicPact || 0, 'text-[#c96b6b]'],
                ] as const
              ).map(([pillarKey, label, lv, col]) => {
                const isBannedHoly = pillarKey === 'holyMother' && isHolyMotherBanned(player);
                const resonanceLine = isBannedHoly
                  ? 'Ánh sáng đã quay lưng.'
                  : lv <= 0
                  ? 'Chưa có cộng hưởng.'
                  : lv === 1
                  ? 'Khẽ hồi đáp.'
                  : lv === 2
                  ? 'Cộng hưởng sâu.'
                  : 'Khế ước trọn vẹn.';
                return (
                  <div
                    key={pillarKey}
                    className={`p-2.5 space-y-1 ${
                      isBannedHoly
                        ? 'df-well opacity-75'
                        : lv > 0
                        ? 'df-card-active'
                        : 'df-card opacity-75'
                    }`}
                  >
                    <div
                      className={`font-bold ${
                        isBannedHoly
                          ? 'text-[#8e5353]'
                          : lv > 0
                          ? col
                          : 'text-[#7d746b] tracking-widest'
                      }`}
                    >
                      {isBannedHoly || lv > 0 ? label : '???'}
                    </div>
                    <p
                      className={`text-[11px] leading-snug italic ${
                        isBannedHoly
                          ? 'text-[#b57a7a]'
                          : lv > 0
                          ? 'text-[#dfd2b4]'
                          : 'text-[#8e847b]'
                      }`}
                    >
                      {resonanceLine}
                    </p>
                  </div>
                );
              })}
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
                      ['agility_1', 'Nhanh Nhẹn +1 (+5% Né)'],
                      ['atk_1', 'Cường Lực (+15% ST)'],
                      ['def_1', 'Da Thép (+10% Kháng Vật Lý)'],
                      ['san_1', 'Ý Chí (+25 Lý Trí Tối Đa)'],
                    ] as const
                  ).map(([nodeId, label]) => {
                    const owned = player.hexenStatNodes?.includes(nodeId);
                    return (
                      <button
                        key={nodeId}
                        type="button"
                        disabled={owned || player.energyStones < 1}
                        onClick={() => {
                          const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                          const res = unlockHexenStatNode(pCopy, nodeId);
                          if (res.success) {
                            sfx.playHealOrChime();
                            setPlayer(pCopy);
                          }
                          setHexenFeedback(res.message);
                          onAddLog(res.message);
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
                      type="button"
                      onClick={() => {
                        const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                        const res = exorciseCursedWeapon(pCopy);
                        if (res.success) {
                          sfx.playHealOrChime();
                          setPlayer(pCopy);
                        }
                        setHexenFeedback(res.message);
                        onAddLog(res.message);
                      }}
                      className="df-btn-bronze px-2.5 py-1.5 font-bold text-[11px] cursor-pointer"
                    >
                      † Trục Xuất Vũ Khí Nguyền (-1 Đá LH)
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
                        type="button"
                        onClick={() => {
                          const pCopy: PlayerState = JSON.parse(JSON.stringify(player));
                          const res = regrowLimbAtHexen(pCopy, k);
                          if (res.success) {
                            sfx.playHealOrChime();
                            setPlayer(pCopy);
                          }
                          setHexenFeedback(res.message);
                          onAddLog(res.message);
                        }}
                        className="df-btn-bronze px-2.5 py-1.5 font-bold text-[11px] cursor-pointer"
                      >
                        ✦ Tái Tạo [{lbl}] (-2 Đá LH, -25 Lý Trí)
                      </button>
                    ))}
                  {(
                    [
                      ['F1_R0', '▸ Dịch Chuyển → Tầng 1 (Lâu Đài)'],
                      ['F2_R0', '▸ Dịch Chuyển → Tầng 2 (Giáo Đường)'],
                      ['F3_R0', '▸ Dịch Chuyển → Tầng 3 (Vực Sao)'],
                    ] as const
                  ).map(([destId, label]) => (
                    <button
                      key={destId}
                      type="button"
                      disabled={currentRoom.id === destId}
                      onClick={() => onTriggerVoidPortal(destId)}
                      className="df-btn px-2.5 py-1.5 disabled:opacity-35 font-bold text-[11px] cursor-pointer"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
