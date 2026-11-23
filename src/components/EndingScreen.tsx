import React from 'react';
import prologueFrame1Img from '../assets/images/prologue_castle_colossal_1794938768880.webp';
import prologueGateKnightImg from '../assets/images/prologue_gate_knight_1794938325240.webp';
import prologueGateNunImg from '../assets/images/prologue_gate_nun_1794938324507.webp';
import prologueGateHunterImg from '../assets/images/prologue_gate_hunter_1794938325467.webp';
import endingNormalImg from '../assets/images/ending_normal_collapse_1795083658799.webp';
import endingDarkImg from '../assets/images/ending_dark_throne_1795083660377.webp';
import endingOrderImg from '../assets/images/ending_order_platinum_1795083661030.webp';
import endingTrueImg from '../assets/images/ending_true_worldtree_1795083661084.webp';

export interface EndingInfo {
  id: string;
  title: string;
  subtitle: string;
  epilogue: string;
  endingBannerLabel?: string;
  isPersonal?: boolean;
}

export interface EndingScreenProps {
  endingInfo: EndingInfo;
  worldSeed: string;
  seedInput: string;
  setSeedInput: React.Dispatch<React.SetStateAction<string>>;
  playerClassId: string;
  onGenerateRandomSeed: () => string;
  onStartNewRun: (freshSeed: string, classId: string) => void;
  onReturnToTitle: () => void;
}

export const EndingScreen: React.FC<EndingScreenProps> = ({
  endingInfo,
  worldSeed,
  seedInput,
  setSeedInput,
  playerClassId,
  onGenerateRandomSeed,
  onStartNewRun,
  onReturnToTitle,
}) => {
  const endingArtworkMap: Record<string, string> = {
    NORMAL_ENDING: endingNormalImg,
    DARK_ENDING: endingDarkImg,
    ORDER_ENDING: endingOrderImg,
    TRUE_ENDING: endingTrueImg,
    S_ENDING_KNIGHT: prologueGateKnightImg,
    S_ENDING_NUN: prologueGateNunImg,
    S_ENDING_HUNTER: prologueGateHunterImg,
  };
  const endingArtSrc = endingArtworkMap[endingInfo.id] || prologueFrame1Img;
  const bannerHeading = endingInfo.endingBannerLabel || endingInfo.title;

  const isDefeat =
    endingInfo.id === 'SLAIN_IN_COMBAT' || endingInfo.id === 'STARVED_IN_DARKNESS';
  const displayEpilogue = isDefeat
    ? endingInfo.epilogue || 'Hành trình của bạn đã kết thúc.'
    : endingInfo.epilogue;

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#050408] text-[#e7dcc8] flex flex-col justify-between select-none">
      {/* Full-Bleed 16:9 Dark Gothic Ending Painting */}
      <img
        src={endingArtSrc}
        alt={endingInfo.title}
        className="absolute inset-0 w-full h-full object-cover ending-pan-bg pointer-events-none"
      />
      {/* Cinematic Dark Gradient Scrim: Upper 45% preserves artwork, Lower 55% frames text with crisp contrast */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(5,4,8,0.98) 0%, rgba(7,5,10,0.92) 34%, rgba(9,7,14,0.42) 66%, rgba(5,4,8,0.38) 100%)',
        }}
      />

      {/* Subtle Top Metadata Strip */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-4 text-xs uppercase tracking-[0.2em] text-[#d6c9b4]/85">
        <span style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
          VAELIS • THUNG LŨNG XƯƠNG TÀN
        </span>
        <span
          className="font-mono text-[#c5a059]"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
        >
          SEED: {worldSeed}
        </span>
      </div>

      {/* Bottom Panoramic Narrative & Action Overlay */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pb-6 pt-4 space-y-4 text-center">
        <div className="space-y-1.5">
          <h1
            className="text-3xl sm:text-5xl font-bold text-[#f3ead6] tracking-wide leading-tight"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              textShadow: '0 4px 18px rgba(0,0,0,0.96), 0 0 24px rgba(197,160,89,0.28)',
            }}
          >
            {bannerHeading}
          </h1>
        </div>

        <div className="df-panel bg-[#0a080e]/82 px-6 py-4 text-left sm:text-center max-h-[26vh] overflow-y-auto">
          <p className="text-sm sm:text-base text-[#e2d7c5] leading-relaxed">
            {displayEpilogue}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              const freshSeed = seedInput === worldSeed ? onGenerateRandomSeed() : seedInput;
              setSeedInput(freshSeed);
              onStartNewRun(freshSeed, playerClassId);
            }}
            className="px-6 py-2.5 df-btn-blood font-bold text-sm uppercase tracking-wider cursor-pointer"
          >
            Chơi Ván Mới
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="px-6 py-2.5 df-btn text-sm uppercase tracking-wider cursor-pointer"
          >
            Về Màn Hình Chính
          </button>
        </div>
      </div>
    </div>
  );
};
