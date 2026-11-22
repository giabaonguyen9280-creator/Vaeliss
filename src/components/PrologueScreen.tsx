import React from 'react';
import { CONFIG } from '../game/config';
import { CHARACTER_INTRO_STEPS } from '../game/narrative';
import { sfx } from '../game/audio';
import { WorldMapState } from '../game/mapGen';
import { PlayerState, applyIntroChoiceToPlayer } from '../game/combat';
import prologueFrame1Img from '../assets/images/prologue_castle_colossal_1794938768880.webp';
import prologueFrame2Img from '../assets/images/prologue_statue_mother_1794938322367.webp';
import prologueGateKnightImg from '../assets/images/prologue_gate_knight_1794938325240.webp';
import prologueGateNunImg from '../assets/images/prologue_gate_nun_1794938324507.webp';
import prologueGateHunterImg from '../assets/images/prologue_gate_hunter_1794938325467.webp';

export interface IntroStepOutcome {
  choiceTitle: string;
  flavorText: string;
  effectText: string;
  stepIdx: 0 | 1 | 2;
}

export interface PrologueScreenProps {
  player: PlayerState;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
  setWorld: React.Dispatch<React.SetStateAction<WorldMapState>>;
  setPreviewItemId: React.Dispatch<React.SetStateAction<string>>;
  prologueFrame: 0 | 1 | 2;
  setPrologueFrame: React.Dispatch<React.SetStateAction<0 | 1 | 2>>;
  backstoryChosen: boolean;
  introStepIdx: 0 | 1 | 2;
  introStepOutcome: IntroStepOutcome | null;
  setIntroStepOutcome: React.Dispatch<React.SetStateAction<IntroStepOutcome | null>>;
  onConfirmIntroOutcome: () => void;
}

export const PrologueScreen: React.FC<PrologueScreenProps> = ({
  player,
  setPlayer,
  setWorld,
  setPreviewItemId,
  prologueFrame,
  setPrologueFrame,
  backstoryChosen,
  introStepIdx,
  introStepOutcome,
  setIntroStepOutcome,
  onConfirmIntroOutcome,
}) => {
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
        <div className="relative w-full aspect-video overflow-hidden df-well bg-[#08060a]">
          <img
            src={prologueTexts[prologueFrame].image}
            alt={prologueTexts[prologueFrame].alt}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover select-none"
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
          <p className="text-xs text-[#d3d3d3] leading-snug">
            {prologueTexts[prologueFrame].desc}
          </p>
        </div>

        {/* Class-Specific 3-Step Intro Choices on Frame 3 (Blind Selection → Outcome Reveal) */}
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
                      Ký Ức &amp; Hành Trang Của {player.name} — Bước{' '}
                      {(introStepOutcome?.stepIdx ?? introStepIdx) + 1}/3
                    </div>
                  </div>

                  {introStepOutcome ? (
                    <div className="p-3.5 df-card-active space-y-2.5 text-xs">
                      <div className="font-bold text-[#c5a059] text-sm">
                        {introStepOutcome.choiceTitle}
                      </div>
                      <p className="text-[#e7dcc8] leading-relaxed italic">
                        “{introStepOutcome.flavorText}”
                      </p>
                      <div className="pt-1.5 border-t border-[#3a2f26] text-[11px] text-[#b9c9a8] leading-snug">
                        <span className="text-[#c5a059] font-semibold">Kết quả:</span>{' '}
                        {introStepOutcome.effectText}
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={onConfirmIntroOutcome}
                          className="px-5 py-1.5 df-btn-bronze text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          {introStepOutcome.stepIdx < 2
                            ? 'Tiếp Tục →'
                            : 'Tiếp Tục Vào Ngoại Vi →'}
                        </button>
                      </div>
                    </div>
                  ) : !backstoryChosen && currentStep ? (
                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-[#d3d3d3]">
                        {currentStep.prompt}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {currentStep.options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              sfx.playSfx('ui_confirm');
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
                              setIntroStepOutcome({
                                choiceTitle: opt.label,
                                flavorText:
                                  opt.outcomeFlavor ||
                                  'Quyết định ấy đã khắc sâu vào ký ức và hành trang trước giờ bước qua Cổng Sắt.',
                                effectText: opt.effectText,
                                stepIdx: introStepIdx,
                              });
                            }}
                            className="p-3 df-card text-left text-xs cursor-pointer flex flex-col justify-between gap-1.5"
                          >
                            <div className="font-bold text-[#c5a059]">{opt.label}</div>
                            {opt.contextHint && (
                              <div className="text-[11px] text-[#b4a99d] italic leading-snug">
                                {opt.contextHint}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 df-card-active text-xs text-[#d3d3d3] space-y-1">
                      <div className="font-bold text-[#c5a059]">
                        ✓ Bạn đã định hình xong 3 bước quá khứ trước Cổng Sắt Goethe.
                      </div>
                      <div className="text-[11px] text-[#b4a99d]">
                        Vũ khí cầm tay:{' '}
                        <b className="text-[#e7dcc8]">
                          {CONFIG.WEAPONS[player.equippedWeapon]?.name}
                        </b>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {prologueFrame < 2 && (
          <div className="flex justify-end items-center pt-2">
            <button
              type="button"
              onClick={() => {
                sfx.playSfx('ui_confirm');
                setPrologueFrame((f) => (f + 1) as 0 | 1 | 2);
              }}
              className="px-6 py-2 df-btn-blood text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Tiếp Tục →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
