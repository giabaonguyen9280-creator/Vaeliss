import React from 'react';
import { Save, HelpCircle, Settings } from 'lucide-react';
import { CONFIG } from '../game/config';
import { sfx, AudioVisualSettings } from '../game/audio';
import { TILE, WorldMapState } from '../game/mapGen';
import { PlayerState } from '../game/combat';
import { EngravedGoldCoinCanvas } from './CanvasWidgets';

export type CoinOutcomeTier = 'win' | 'partial' | 'lose';
export type GuideTab = 'lore' | 'move' | 'combat' | 'survival';

export interface SaveSlotData {
  slot: number;
  timestamp: string;
  seed: string;
  player: PlayerState;
  playerPos: { x: number; y: number };
  world: WorldMapState;
}

export interface CoinTossState {
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

export interface SavesModalProps {
  worldSeed: string;
  saveSlots: Array<SaveSlotData | null>;
  onSaveSlot: (idx: number) => void;
  onLoadSlot: (idx: number) => void;
  onDeleteSlot: (idx: number) => void;
  onClose: () => void;
}

export const SavesModal: React.FC<SavesModalProps> = ({
  worldSeed,
  saveSlots,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
    <div className="max-w-xl w-full df-panel p-4 space-y-2.5 max-h-[86vh] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Save className="w-4 h-4 text-[#c5a059]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#dfd2b4]">
            Giường Đá Lưu Trữ – 5 Ô Hồ Sơ (Seed: {worldSeed})
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
        >
          Đóng [ESC]
        </button>
      </div>

      <div className="space-y-1.5">
        {[0, 1, 2, 3, 4].map((idx) => {
          const slot = saveSlots[idx];
          return (
            <div
              key={idx}
              className={`px-3 py-2 flex items-center justify-between gap-2 text-xs ${
                slot ? 'df-card' : 'df-well opacity-75'
              }`}
            >
              <div className="min-w-0 truncate">
                <span className="font-bold text-[#c5a059] font-mono">#{idx + 1}</span>
                {slot ? (
                  <>
                    <span className="font-bold text-[#dfd2b4]"> — {slot.player.name}</span>
                    <span className="text-[#9b8f82]"> • {slot.world.currentRoomId}</span>
                    <span className="text-[#c96b6b] font-mono">
                      {' '}
                      • SL {slot.player.hp}/{slot.player.maxHp}
                    </span>
                  </>
                ) : (
                  <span className="text-[#7a7066] italic"> — Ô Trống</span>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSaveSlot(idx)}
                  className="df-btn-bronze px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                >
                  {slot ? 'Lưu Đè' : 'Lưu'}
                </button>
                {slot && (
                  <>
                    <button
                      type="button"
                      onClick={() => onLoadSlot(idx)}
                      className="df-btn px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                    >
                      Tải
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSlot(idx)}
                      className="df-btn-blood px-2 py-1 text-[11px] cursor-pointer"
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
);

export interface GuideModalProps {
  guideTab: GuideTab;
  setGuideTab: React.Dispatch<React.SetStateAction<GuideTab>>;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ guideTab, setGuideTab, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
    <div className="max-w-2xl w-full df-panel p-4 space-y-2.5 max-h-[86vh] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#c5a059]" />
          <h2
            className="text-base font-bold uppercase tracking-wider text-[#dfd2b4]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Cẩm Nang Sinh Tồn
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
        >
          Đóng [ESC]
        </button>
      </div>

      {/* 4 Compact Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setGuideTab('lore')}
          className={`py-1.5 px-2 text-xs font-bold uppercase cursor-pointer ${
            guideTab === 'lore' ? 'df-btn-active' : 'df-btn'
          }`}
        >
          0. Thế Giới
        </button>
        <button
          type="button"
          onClick={() => setGuideTab('move')}
          className={`py-1.5 px-2 text-xs font-bold uppercase cursor-pointer ${
            guideTab === 'move' ? 'df-btn-active' : 'df-btn'
          }`}
        >
          1. Di Chuyển
        </button>
        <button
          type="button"
          onClick={() => setGuideTab('combat')}
          className={`py-1.5 px-2 text-xs font-bold uppercase cursor-pointer ${
            guideTab === 'combat' ? 'df-btn-active' : 'df-btn'
          }`}
        >
          2. Chặt Chi
        </button>
        <button
          type="button"
          onClick={() => setGuideTab('survival')}
          className={`py-1.5 px-2 text-xs font-bold uppercase cursor-pointer ${
            guideTab === 'survival' ? 'df-btn-active' : 'df-btn'
          }`}
        >
          3. Sinh Tồn
        </button>
      </div>

      {guideTab === 'lore' && (
        <ul className="df-well p-3.5 space-y-1.5 text-xs text-[#d3d3d3]">
          <li>
            • <b className="text-[#c5a059]">Ba Tầng Thung Lũng:</b> Lâu Đài Hắc Ám, Đại Giáo Đường và Vực Sao bị ép chặt vào nhau giữa màn sương đặc quánh.
          </li>
          <li>
            • <b className="text-[#c5a059]">Cổ Thư [L]:</b> Lục tìm những trang da dê rải rác trên kệ sách để ghép nối sự thật bị vùi lấp.
          </li>
          <li>
            • <b className="text-[#c5a059]">Đài Cộng Hưởng:</b> Dâng Đá Linh Hồn để khắc ấn kỹ năng và chạm tới các thế lực cổ xưa.
          </li>
          <li>
            • <b className="text-[#c5a059]">Tổ Đội Sinh Tồn:</b> Chiêu mộ người sống sót hoặc kẻ đồng hành; cái chết trong hầm ngục là vĩnh viễn.
          </li>
        </ul>
      )}

      {guideTab === 'move' && (
        <ul className="df-well p-3.5 space-y-1.5 text-xs text-[#d3d3d3]">
          <li>
            • <b className="text-[#c5a059]">WASD / Mũi tên:</b> Bước đi qua từng phiến đá lạnh; giữ <b>Shift</b> để lướt nhanh qua hành lang trống.
          </li>
          <li>
            • <b className="text-[#c5a059]">[F] / Enter / Space:</b> Kiểm tra rương, kệ sách, đài đá, người sống sót và xác quái trên đường.
          </li>
          <li>
            • <b className="text-[#c5a059]">[T] / [I] / [L]:</b> Bật tắt Đuốc <b>[T]</b>, mở Túi Đồ <b>[I]</b>, tra Cổ Thư <b>[L]</b> hoặc Cẩm Nang <b>[? / ESC]</b>.
          </li>
          <li>
            • <b className="text-[#c5a059]">Giường Đá Lưu:</b> Ngả lưng bên ngọn lửa yếu ớt để ghi dấu hành trình và lấy lại hơi thở.
          </li>
        </ul>
      )}

      {guideTab === 'combat' && (
        <ul className="df-well p-3.5 space-y-1.5 text-xs text-[#d3d3d3]">
          <li>
            • <b className="text-[#c5a059]">Phím Tắt Chiến Đấu:</b> Dùng <b>[1..6]</b>, <b>[W/A/S/D]</b> và <b>[Enter / F]</b> để chọn hành động, mục tiêu hoặc <b>[ESC]</b> lùi lại.
          </li>
          <li>
            • <b className="text-[#c96b6b]">Nhắm Bộ Phận:</b> Quái vật mang nhiều chi thể khác nhau — quan sát để chặt đứt tay cầm vũ khí hoặc chân trụ của chúng.
          </li>
          <li>
            • <b className="text-[#9ab08e]">Phòng Thủ Đúng Nhịp:</b> Khi kẻ thù tụ lực sát khí đỏ rực, giơ khiên thủ thế trước khi đòn tử thần giáng xuống.
          </li>
          <li>
            • <b className="text-[#c5a059]">Đàm Thoại &amp; Thoát Thân:</b> Một số kẻ địch dao động trước lời chất vấn, hoặc dùng vật phẩm nghi binh để mở đường lui.
          </li>
        </ul>
      )}

      {guideTab === 'survival' && (
        <ul className="df-well p-3.5 space-y-1.5 text-xs text-[#d3d3d3]">
          <li>
            • <b className="text-[#eab308]">Cơn Đói &amp; Lý Trí:</b> Bóng tối, mùi máu và cơn đói âm ỉ gặm nhấm cả thân xác lẫn tinh thần — đừng để bản thân cạn kiệt quá lâu.
          </li>
          <li>
            • <b className="text-[#c5a059]">Vết Thương &amp; Độc Tố:</b> Chảy máu, nhiễm độc hay vết thương mưng mủ sẽ rút cạn sinh lực theo từng bước chân nếu không xử lý kịp.
          </li>
          <li>
            • <b className="text-[#a3b2c4]">Vật Phẩm &amp; Pha Chế:</b> Tìm thảo dược, lọ dung dịch và các quyển sách <b>Pha Chế Thuốc</b> để tự điều chế thuốc cứu mạng.
          </li>
          <li>
            • <b className="text-[#a889b8]">Cưa Xương Bất Đắc Dĩ:</b> Khi một chi thể đã hoại tử không thể cứu vãn, đôi khi phải hy sinh nó để giữ lại mạng sống.
          </li>
        </ul>
      )}
    </div>
  </div>
);

export interface SettingsModalProps {
  world: WorldMapState;
  playerPos: { x: number; y: number };
  audioSettings: AudioVisualSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioVisualSettings>>;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
  confirmReturnTitle: boolean;
  setConfirmReturnTitle: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenSaves: () => void;
  onReturnToTitle: () => void;
  onClose: () => void;
  isTitleScreen?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  world,
  playerPos,
  audioSettings,
  setAudioSettings,
  setMuted,
  confirmReturnTitle,
  setConfirmReturnTitle,
  onOpenSaves,
  onReturnToTitle,
  onClose,
  isTitleScreen = false,
}) => {
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
      <div className="max-w-xl w-full df-panel p-4 space-y-2.5 max-h-[86vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#c5a059]" />
            <h2
              className="text-base font-bold uppercase tracking-wider text-[#dfd2b4]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Cài Đặt Hệ Thống
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmReturnTitle(false);
              onClose();
            }}
            className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
          >
            Đóng [ESC]
          </button>
        </div>

        {/* Audio Controls */}
        <div className="df-well p-3 space-y-2 text-xs">
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
            <div>
              • <b className="text-[#dfd2b4]">WASD / Mũi tên:</b> Di chuyển / Chọn chi
            </div>
            <div>
              • <b className="text-[#dfd2b4]">F / Space:</b> Tương tác bản đồ
            </div>
            <div>
              • <b className="text-[#dfd2b4]">1..6 + Enter:</b> Điều khiển Chiến Đấu
            </div>
            <div>
              • <b className="text-[#dfd2b4]">I / L / ? / ESC:</b> Túi / Sách / Cẩm Nang / Cài Đặt
            </div>
          </div>
        </div>

        {/* Quick Save & Return to Title (hidden on Title Screen) */}
        {!isTitleScreen && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={!nearBed}
              onClick={() => {
                if (!nearBed) return;
                onOpenSaves();
              }}
              title={
                nearBed
                  ? 'Mở bảng 5 ô Lưu Tiến Trình'
                  : 'Hãy đứng cạnh Giường Đá Cổ để lưu tiến trình'
              }
              className="df-btn-bronze px-3.5 py-2 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              {nearBed
                ? 'Lưu Nhanh (Tại Giường Đá)'
                : 'Lưu Nhanh (Cần đứng cạnh Giường Đá)'}
            </button>

            {!confirmReturnTitle ? (
              <button
                type="button"
                onClick={() => setConfirmReturnTitle(true)}
                className="df-btn-blood px-3.5 py-2 text-xs font-bold cursor-pointer"
              >
                Về Màn Hình Chính
              </button>
            ) : (
              <div className="flex items-center gap-2 df-card p-1.5 px-2.5">
                <span className="text-[11px] text-[#dfd2b4]">Thoát về Màn Hình Chính?</span>
                <button
                  type="button"
                  onClick={onReturnToTitle}
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
        )}
      </div>
    </div>
  );
};

export interface CoinTossModalProps {
  coinToss: CoinTossState | null;
  shiftHeld: boolean;
  coinCursorSide: 'HEADS' | 'TAILS';
  setCoinCursorSide: React.Dispatch<React.SetStateAction<'HEADS' | 'TAILS'>>;
  luckyCoinCount: number;
  lockpickCount: number;
  onChooseCoinSide: (side: 'HEADS' | 'TAILS', useShift: boolean) => void;
  onUseLockpick: () => void;
  onConfirmOutcome: () => void;
}

export const CoinTossModal: React.FC<CoinTossModalProps> = ({
  coinToss,
  shiftHeld,
  coinCursorSide,
  setCoinCursorSide,
  luckyCoinCount,
  lockpickCount,
  onChooseCoinSide,
  onUseLockpick,
  onConfirmOutcome,
}) => {
  if (!coinToss) return null;
  const isDualPreview = Boolean(coinToss.secondResultSide || (!coinToss.resultSide && shiftHeld));
  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
      <div className="inline-silver-float pointer-events-auto max-w-md w-full px-5 py-4 text-center space-y-3 bg-[#09080d]/74 backdrop-blur-[2px] border border-[#c5a059]/65 shadow-[0_18px_48px_rgba(0,0,0,0.88)]">
        <div className="space-y-0.5">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#cbd5e1] font-bold">
            THẺ BÀI BẠC ĐỊNH MỆNH {coinToss.isPanicAuto ? '• HOẢNG LOẠN' : ''}
          </div>
          <h3
            className="text-xl sm:text-2xl font-bold text-[#f2ead9] tracking-wide uppercase"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              textShadow: '0 2px 8px rgba(0,0,0,0.9)',
            }}
          >
            {coinToss.title}
          </h3>
          {coinToss.subtitle && (
            <p className="text-xs sm:text-sm text-[#d6c9b8] leading-snug px-1">
              {coinToss.subtitle}
            </p>
          )}
        </div>

        {/* Floating 3D Embossed Sterling Silver Coin directly over the live Arena / Map */}
        <div className="py-1.5 flex flex-col items-center justify-center gap-1.5">
          <div className="flex items-center justify-center gap-4">
            <EngravedGoldCoinCanvas
              side={coinToss.resultSide || coinToss.chosenSide || coinCursorSide}
              flipping={coinToss.flipping}
              size={isDualPreview ? 124 : 156}
            />
            {isDualPreview && (
              <EngravedGoldCoinCanvas
                side={coinToss.secondResultSide || coinToss.chosenSide || 'TAILS'}
                flipping={coinToss.flipping}
                size={124}
              />
            )}
          </div>
          {coinToss.resultSide && (
            <div
              className="text-sm font-bold tracking-[0.2em] uppercase text-[#e2e8f0]"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
            >
              {coinToss.secondResultSide
                ? `${coinToss.resultSide === 'HEADS' ? 'MẶT NGỬA' : 'MẶT SẤP'} • ${
                    coinToss.secondResultSide === 'HEADS' ? 'MẶT NGỬA' : 'MẶT SẤP'
                  }`
                : coinToss.resultSide === 'HEADS'
                ? 'MẶT NGỬA'
                : 'MẶT SẤP'}
            </div>
          )}
        </div>

        {!coinToss.chosenSide && !coinToss.isPanicAuto && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onMouseEnter={() => setCoinCursorSide('HEADS')}
                onClick={(e) => onChooseCoinSide('HEADS', e.shiftKey || shiftHeld)}
                className={`py-2 px-2 text-sm font-bold uppercase cursor-pointer ${
                  coinCursorSide === 'HEADS'
                    ? 'df-btn-active ring-1 ring-[#e2e8f0]'
                    : 'df-btn-bronze opacity-85'
                }`}
              >
                {coinCursorSide === 'HEADS' ? '▸ ' : ''}[A/1] Mặt Ngửa
              </button>
              <button
                onMouseEnter={() => setCoinCursorSide('TAILS')}
                onClick={(e) => onChooseCoinSide('TAILS', e.shiftKey || shiftHeld)}
                className={`py-2 px-2 text-sm font-bold uppercase cursor-pointer ${
                  coinCursorSide === 'TAILS'
                    ? 'df-btn-active ring-1 ring-[#e2e8f0]'
                    : 'df-btn-bronze opacity-85'
                }`}
              >
                {coinCursorSide === 'TAILS' ? '▸ ' : ''}[D/2] Mặt Sấp
              </button>
            </div>
            <div className="text-[11px] text-[#cbd5e1]/85 font-mono">
              [A/D] Đổi Mặt • [F / Enter / Space] Tung Thẻ Bạc
              {luckyCoinCount > 0 ? ` • Giữ [Shift] Tung 2 Xu (x${luckyCoinCount})` : ''}
            </div>

            {coinToss.onLockpick && (
              <button
                onClick={onUseLockpick}
                className="df-btn w-full py-1.5 text-xs sm:text-sm font-bold text-[#dfd2b4] cursor-pointer"
              >
                Dùng Chìa Khóa Vạn Năng (x{lockpickCount})
              </button>
            )}
          </div>
        )}

        {coinToss.outcomeText && (
          <button
            onClick={onConfirmOutcome}
            className="df-btn-blood w-full py-2 font-bold text-sm uppercase cursor-pointer"
          >
            Chấp Nhận [F / Enter / Space]
          </button>
        )}
      </div>
    </div>
  );
};
