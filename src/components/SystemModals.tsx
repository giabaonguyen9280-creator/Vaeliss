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
            • <b className="text-[#c5a059]">Ba Tầng Thung Lũng:</b> Từ Lâu Đài Hắc Ám, qua Đại Giáo
            Đường đổ nát, xuống tới đáy Vực Sao không ánh sáng.
          </li>
          <li>
            • <b className="text-[#c5a059]">Cổ Thư [L]:</b> Những trang da dê còn sót lại trên kệ
            sách lưu giữ mảnh ký ức của những kẻ đi trước.
          </li>
          <li>
            • <b className="text-[#c5a059]">Đài Cộng Hưởng:</b> Bệ đá cổ nơi các nghi thức khắc ấn
            và đánh đổi linh hồn diễn ra.
          </li>
          <li>
            • <b className="text-[#c5a059]">Đồng Hành:</b> Bạn có thể đi cùng những kẻ sống sót trên
            đường; ai ngã xuống sẽ vĩnh viễn nằm lại bóng tối.
          </li>
        </ul>
      )}

      {guideTab === 'move' && (
        <ul className="df-well p-3.5 space-y-1.5 text-xs text-[#d3d3d3]">
          <li>
            • <b className="text-[#c5a059]">WASD / Mũi tên:</b> Di chuyển từng bước qua hành lang
            và sảnh đá.
          </li>
          <li>
            • <b className="text-[#c5a059]">F / Enter / Space:</b> Tương tác với rương, kệ sách, đài
            đá, người sống sót và xác quái.
          </li>
          <li>
            • <b className="text-[#c5a059]">I / L / ESC:</b> Mở Túi Đồ, đọc Cổ Thư hoặc đóng bảng
            đang mở.
          </li>
          <li>
            • <b className="text-[#c5a059]">Giường Đá:</b> Chỗ ngả lưng hiếm hoi để nghỉ sức và ghi
            lại dấu vết hành trình.
          </li>
        </ul>
      )}

      {guideTab === 'combat' && (
        <ul className="df-well p-3.5 space-y-1.5 text-xs text-[#d3d3d3]">
          <li>
            • <b className="text-[#c5a059]">Điều Khiển:</b> Dùng <b>W/S</b> hoặc chuột chọn lệnh và
            bộ phận, <b>Enter / F</b> xác nhận, <b>ESC</b> quay lại; phím tắt <b>1..5</b>.
          </li>
          <li>
            • <b className="text-[#c96b6b]">Nhắm Bộ Phận:</b> Kẻ địch gồm nhiều chi riêng biệt — hãy
            quan sát đòn thế để chọn mục tiêu phù hợp.
          </li>
          <li>
            • <b className="text-[#9ab08e]">Thế Thủ:</b> Thu mình chống đỡ trước những đòn đánh nặng
            nề khi quái vật tụ lực.
          </li>
          <li>
            • <b className="text-[#c5a059]">Rút Lui &amp; Khí Cụ:</b> Không phải cuộc chạm trán nào
            cũng đáng để đổi bằng máu thịt.
          </li>
        </ul>
      )}

      {guideTab === 'survival' && (
        <ul className="df-well p-3.5 space-y-1.5 text-xs text-[#d3d3d3]">
          <li>
            • <b className="text-[#eab308]">Cơn Đói &amp; Lý Trí:</b> Bóng tối và đói khát âm thầm
            bào mòn thân xác lẫn tinh thần; hãy giữ lương thực và ánh đuốc bên mình.
          </li>
          <li>
            • <b className="text-[#c96b6b]">Thương Tích:</b> Chảy máu, độc tố hay nhiễm trùng đều có
            thể đoạt mạng nếu để kéo dài.
          </li>
          <li>
            • <b className="text-[#a3b2c4]">Dược Thảo &amp; Dụng Cụ:</b> Băng gạc, thảo mộc, bình
            thuốc và công cụ thô sơ đều ẩn chứa công dụng riêng chờ bạn tự thử nghiệm.
          </li>
          <li>
            • <b className="text-[#a889b8]">Sách Pha Chế:</b> Tìm những cuốn sách giả kim trong hầm
            ngục để tự điều chế thuốc từ nguyên liệu nhặt được.
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
