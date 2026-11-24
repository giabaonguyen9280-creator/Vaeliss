import React from 'react';
import { FolderOpen, Dices, Settings } from 'lucide-react';
import { CONFIG, DifficultyMode } from '../game/config';
import { sfx } from '../game/audio';
import { CharacterPortraitBox } from './CanvasWidgets';
import { SaveSlotData } from './SystemModals';

export interface TitleScreenProps {
  titleStep: 'menu' | 'char_select';
  setTitleStep: React.Dispatch<React.SetStateAction<'menu' | 'char_select'>>;
  characterNameInput: string;
  setCharacterNameInput: React.Dispatch<React.SetStateAction<string>>;
  selectedClassId: string;
  setSelectedClassId: React.Dispatch<React.SetStateAction<string>>;
  selectedDifficulty: DifficultyMode;
  setSelectedDifficulty: React.Dispatch<React.SetStateAction<DifficultyMode>>;
  portraitErrorMap: Record<string, boolean>;
  onMarkPortraitError: (url: string) => void;
  saveSlots: Array<SaveSlotData | null>;
  titleSaveModalOpen: boolean;
  setTitleSaveModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showSkipProloguePrompt: boolean;
  setShowSkipProloguePrompt: React.Dispatch<React.SetStateAction<boolean>>;
  onGenerateRandomName: () => string;
  onLoadSlot: (idx: number) => void;
  onDeleteSlot: (idx: number) => void;
  onStartDirectIntoExterior: () => void;
  onEnterPrologue: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  titleStep,
  setTitleStep,
  characterNameInput,
  setCharacterNameInput,
  selectedClassId,
  setSelectedClassId,
  selectedDifficulty,
  setSelectedDifficulty,
  portraitErrorMap,
  onMarkPortraitError,
  saveSlots,
  titleSaveModalOpen,
  setTitleSaveModalOpen,
  showSkipProloguePrompt,
  setShowSkipProloguePrompt,
  onGenerateRandomName,
  onLoadSlot,
  onDeleteSlot,
  onStartDirectIntoExterior,
  onEnterPrologue,
  onOpenSettings,
}) => {
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
              <button
                type="button"
                onClick={() => {
                  sfx.playSfx('ui_confirm');
                  onOpenSettings();
                }}
                className="w-full px-6 py-3 df-btn font-bold tracking-wider uppercase text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4 text-[#c5a059]" />
                <span>Cài Đặt</span>
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
                CHỌN NHÂN VẬT{' '}
                <span className="text-lg sm:text-xl font-normal text-[#c5a059]">— KHỞI HÀNH</span>
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
                      onClick={() => setCharacterNameInput(onGenerateRandomName())}
                      className="px-2.5 py-1.5 df-btn-bronze flex items-center justify-center shrink-0 cursor-pointer"
                      title="Đặt Tên Ngẫu Nhiên"
                      aria-label="Đặt Tên Ngẫu Nhiên"
                    >
                      <Dices className="w-4 h-4 text-[#e5cfa0]" />
                    </button>
                  </div>
                </div>
                <div className="w-full sm:w-auto shrink-0">
                  <label className="block text-[10px] uppercase tracking-wider text-[#c5a059] mb-1">
                    Chế Độ Sinh Tồn
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playSfx('ui_confirm');
                        setSelectedDifficulty('normal');
                      }}
                      className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer ${
                        selectedDifficulty === 'normal'
                          ? 'df-btn-bronze text-[#f5ebd6]'
                          : 'df-btn text-[#9b8f82]'
                      }`}
                      title="Chuẩn: Trải nghiệm khắc nghiệt nguyên bản của Thung Lũng Xương Tàn."
                    >
                      Normal (Chuẩn)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playSfx('ui_confirm');
                        setSelectedDifficulty('easy');
                      }}
                      className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer ${
                        selectedDifficulty === 'easy'
                          ? 'df-btn-bronze text-[#f5ebd6]'
                          : 'df-btn text-[#9b8f82]'
                      }`}
                      title="Dễ: -20% sát thương nhận vào, đuốc cháy lâu hơn 25% (nhưng vùng sáng hầm hẹp hơn ~18%), đói chậm hơn 30%. Mọi luật đứt chi & chết vĩnh viễn giữ nguyên."
                    >
                      Easy (Dễ)
                    </button>
                  </div>
                </div>
                <div className="flex w-full sm:w-auto gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      sfx.playSfx('ui_confirm');
                      setShowSkipProloguePrompt(true);
                    }}
                    className="flex-1 sm:flex-initial px-5 py-2 df-btn-blood font-bold tracking-wider uppercase text-xs cursor-pointer"
                  >
                    Tiến Vào Hành Trình →
                  </button>
                </div>
              </div>
              {selectedDifficulty === 'easy' && (
                <div className="text-[11px] text-[#c8bda8] df-well px-3 py-1.5 border-l-2 border-[#c5a059]">
                  <span className="text-[#c5a059] font-semibold">Easy (Dễ):</span> Giảm 20% sát thương nhận vào • Đuốc/đèn cháy lâu hơn 25% nhưng vùng sáng trong hầm hẹp hơn • Đói tăng chậm hơn 30% (đứt chi &amp; luật tử vong giữ nguyên).
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CONFIG.CLASSES.map((cls) => {
                  const active = cls.id === selectedClassId;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        const prevDefault = CONFIG.CLASSES.find(
                          (c) => c.id === selectedClassId
                        )?.name;
                        setSelectedClassId(cls.id);
                        if (!characterNameInput.trim() || characterNameInput === prevDefault) {
                          setCharacterNameInput(cls.name);
                        }
                      }}
                      className={`text-left p-3 cursor-pointer flex flex-col justify-between ${
                        active ? 'df-card-active text-[#d3d3d3]' : 'df-card text-[#9e968c]'
                      }`}
                    >
                      <div>
                        <div className="flex items-start gap-2.5 mb-1.5">
                          <CharacterPortraitBox
                            spriteKey={cls.id}
                            portraitUrl={cls.combatPortraitUrl}
                            size={54}
                            alt={cls.name}
                            isError={Boolean(
                              cls.combatPortraitUrl && portraitErrorMap[cls.combatPortraitUrl]
                            )}
                            onPortraitError={onMarkPortraitError}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-bold text-xs sm:text-sm text-[#c5a059] truncate">
                                {cls.name}
                              </span>
                              {active && (
                                <span className="text-[9px] uppercase tracking-widest text-[#d46a6a] font-bold shrink-0">
                                  ✦ Đã Chọn
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#b54848] font-semibold">
                              {cls.title}
                            </div>
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
                  <span className="text-[#c5a059] font-semibold">Khởi đầu:</span> [
                  {CONFIG.WEAPONS[selectedClass.startingWeapon]?.name}] • [
                  {CONFIG.SKILLS.find((s) => s.id === selectedClass.startingSkill)?.name}]
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
          <div className="max-w-xl w-full df-panel p-4 space-y-2.5 max-h-[86vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2 shrink-0">
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

            <div className="space-y-1.5">
              {[0, 1, 2, 3, 4].map((idx) => {
                const slot = saveSlots[idx];
                return (
                  <div
                    key={idx}
                    className={`px-3 py-2 flex items-center justify-between gap-2 text-xs ${
                      slot ? 'df-card' : 'df-well opacity-70'
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
                          <span className="text-[#7a7066] text-[11px] hidden sm:inline">
                            {' '}
                            • {slot.timestamp}
                          </span>
                        </>
                      ) : (
                        <span className="text-[#7a7066] italic"> — Ô Trống</span>
                      )}
                    </div>
                    {slot && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onLoadSlot(idx)}
                          className="px-2.5 py-1 df-btn-bronze text-[11px] font-bold cursor-pointer"
                        >
                          Tải
                        </button>
                        <button
                          onClick={() => onDeleteSlot(idx)}
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

      {/* Skip Prologue Confirmation Dialog after clicking 'Tiến Vào Hành Trình →' */}
      {showSkipProloguePrompt && (
        <div className="fixed inset-0 z-50 bg-black/88 flex items-center justify-center p-4">
          <div className="max-w-md w-full df-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2">
              <h2
                className="text-base font-bold uppercase tracking-wider text-[#c5a059]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                DẪN NHẬP &amp; QUÁ KHỨ
              </h2>
              <button
                type="button"
                onClick={() => setShowSkipProloguePrompt(false)}
                className="px-2.5 py-1 df-btn text-xs font-bold cursor-pointer"
              >
                Quay lại
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#e7dcc8] leading-relaxed">
              Bạn có muốn bỏ qua phần cốt truyện mở đầu và tự động nhận trang bị mặc định không?
            </p>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  sfx.playSfx('ui_confirm');
                  onStartDirectIntoExterior();
                }}
                className="w-full px-4 py-2.5 df-btn-bronze text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Có, vào thẳng Ngoại Vi
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.playSfx('ui_confirm');
                  setShowSkipProloguePrompt(false);
                  onEnterPrologue();
                }}
                className="w-full px-4 py-2.5 df-btn-blood text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Không, trải nghiệm cốt truyện
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
