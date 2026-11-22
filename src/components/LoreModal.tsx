import React from 'react';
import { BookOpen } from 'lucide-react';
import { CONFIG } from '../game/config';
import { PlayerState, isHolyMotherBanned } from '../game/combat';
import { ItemArtworkCanvas } from './CanvasWidgets';

export type LoreModalTab = 'books' | 'destiny';

export interface LoreModalProps {
  player: PlayerState;
  loreModalTab: LoreModalTab;
  setLoreModalTab: React.Dispatch<React.SetStateAction<LoreModalTab>>;
  selectedLoreBookId: string;
  setSelectedLoreBookId: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
}

export const LoreModal: React.FC<LoreModalProps> = ({
  player,
  loreModalTab,
  setLoreModalTab,
  selectedLoreBookId,
  setSelectedLoreBookId,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-4xl w-full df-panel p-4 space-y-2.5 max-h-[86vh] flex flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a3a3a] pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#c5a059]" />
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#dfd2b4]">
              {loreModalTab === 'books'
                ? `Thư Viện Cổ Thư (${player.readBookIds.length}/${CONFIG.BOOKS.length})`
                : 'Dấu Vết Định Mệnh'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLoreModalTab('books')}
              className={`px-3 py-1 text-xs font-bold cursor-pointer ${
                loreModalTab === 'books'
                  ? 'df-card-active text-[#f3e6c4]'
                  : 'df-btn text-[#a3998f]'
              }`}
            >
              Cổ Thư ({player.readBookIds.length}/{CONFIG.BOOKS.length})
            </button>
            <button
              type="button"
              onClick={() => setLoreModalTab('destiny')}
              className={`px-3 py-1 text-xs font-bold cursor-pointer ${
                loreModalTab === 'destiny'
                  ? 'df-card-active text-[#f3e6c4]'
                  : 'df-btn text-[#a3998f]'
              }`}
            >
              ✦ Dấu Vết Định Mệnh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="df-btn px-3 py-1 text-xs font-bold cursor-pointer"
            >
              Đóng [ESC]
            </button>
          </div>
        </div>

        {loreModalTab === 'books' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
            {/* Left List: Slim 1-line book rows, locally scrollable */}
            <div className="md:col-span-5 space-y-1 overflow-y-auto pr-1 min-h-0">
              {CONFIG.BOOKS.map((book) => {
                const unlocked = player.readBookIds.includes(book.id);
                const active = selectedLoreBookId === book.id;
                return (
                  <button
                    key={book.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setSelectedLoreBookId(book.id)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs transition truncate ${
                      !unlocked
                        ? 'df-well opacity-45 text-[#7a7066] cursor-not-allowed'
                        : active
                        ? 'df-card-active text-[#dfd2b4] cursor-pointer font-bold'
                        : 'df-card text-[#d3d3d3] cursor-pointer'
                    }`}
                  >
                    {unlocked ? (
                      <span className="truncate block">
                        #{book.vol}. {book.title}
                      </span>
                    ) : (
                      <span className="italic truncate block">
                        [Cuộn #{book.vol} ??? — Chưa tìm thấy]
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Panel: Parchment Scroll Page (internal scroll only) */}
            <div className="md:col-span-7 flex flex-col min-h-0 overflow-hidden">
              {(() => {
                const book =
                  CONFIG.BOOKS.find((b) => b.id === selectedLoreBookId) || CONFIG.BOOKS[0];
                const isUnlocked = player.readBookIds.includes(book.id);

                if (!isUnlocked) {
                  return (
                    <div className="flex-1 min-h-[240px] df-well flex flex-col items-center justify-center p-5 text-center space-y-2">
                      <ItemArtworkCanvas itemOrWeaponId="ancient_parchment" size={56} />
                      <div className="text-sm font-bold text-[#c5a059]">
                        CHƯA TÌM THẤY
                      </div>
                      <p className="text-xs text-[#9b8f82] max-w-xs">
                        Ẩn giấu trên các Kệ Sách Cổ trong hầm ngục.
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    className="p-5 df-parchment-frame text-[#26190d] space-y-3 flex-1 min-h-0 overflow-y-auto"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    <div className="flex items-center justify-between border-b-2 border-[#6e5233]/50 pb-2">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-widest font-bold text-[#8b0000]">
                          Ấn Bản #{book.vol} • {book.floorHint}
                        </div>
                        <h3 className="text-xl font-bold text-[#1f1308] leading-tight">
                          {book.title}
                        </h3>
                      </div>
                      <ItemArtworkCanvas itemOrWeaponId="ancient_parchment" size={44} />
                    </div>

                    <p className="text-base leading-relaxed font-serif text-[#2b1b0e] whitespace-pre-line">
                      {book.content}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          (() => {
            const hasVoidCore = (player.inventory.void_core || 0) > 0;
            const hasReconScroll = (player.inventory.reconstruction_scroll || 0) > 0;
            const reconFragCount = player.inventory.reconstruction_fragment || 0;
            const hasElixir = (player.inventory.elixir_of_ancients || 0) > 0;
            const child13InParty = player.party.some((a) => a.id === 'child_13' && a.hp > 0);
            const child13Rescued = Boolean(player.questFlags?.child13Rescued);
            const hasBook9 = player.readBookIds.includes('book_9');
            const holyBanned = isHolyMotherBanned(player);

            const voidCoreDiscovered =
              hasVoidCore ||
              Boolean(player.questFlags?.vaelisTalked) ||
              Boolean(player.questFlags?.vaelisDefeated) ||
              player.readBookIds.includes('book_1') ||
              player.readBookIds.includes('book_7');

            const reconDiscovered =
              hasReconScroll ||
              reconFragCount > 0 ||
              player.readBookIds.includes('book_13') ||
              Boolean(player.questFlags?.chroniclerTalked);

            const elixirDiscovered =
              hasElixir ||
              Boolean(player.questFlags?.curedPetrification) ||
              player.classId === 'night_hunter' ||
              player.readBookIds.includes('book_9') ||
              Boolean(player.questFlags?.physicianTalked);

            const child13Discovered =
              child13InParty ||
              child13Rescued ||
              player.classId === 'forsaken_nun' ||
              player.readBookIds.includes('book_4') ||
              Boolean(player.questFlags?.child12Resolved);

            const book9Discovered =
              hasBook9 ||
              Boolean(player.questFlags?.chroniclerTalked) ||
              player.readBookIds.includes('book_2') ||
              player.readBookIds.includes('book_6');

            const worldMilestones = [
              {
                key: 'void_core',
                discovered: voidCoreDiscovered,
                title: voidCoreDiscovered ? 'Lõi Khóa Hư Vô' : '???',
                done: hasVoidCore,
                clue: !voidCoreDiscovered
                  ? 'Chưa rõ tung tích.'
                  : hasVoidCore
                  ? 'Đã thu thập trong túi đồ.'
                  : 'Dị vật khống chế Kết Giới ở tầng sâu.',
              },
              {
                key: 'recon_scroll',
                discovered: reconDiscovered,
                title: reconDiscovered ? 'Thần Chú Tái Thiết' : '???',
                done: hasReconScroll,
                clue: !reconDiscovered
                  ? 'Chưa rõ tung tích.'
                  : hasReconScroll
                  ? 'Đã ghép trọn vẹn Cuộn Thần Chú.'
                  : reconFragCount > 0
                  ? `Đang giữ ${reconFragCount}/3 mảnh rời.`
                  : '3 mảnh cổ chú thất lạc trong Thung Lũng.',
              },
              {
                key: 'elixir',
                discovered: elixirDiscovered,
                title: elixirDiscovered ? 'Tiên Dược Nguyên Sơ' : '???',
                done: hasElixir || Boolean(player.questFlags?.curedPetrification),
                clue: !elixirDiscovered
                  ? 'Chưa rõ tung tích.'
                  : hasElixir
                  ? 'Đang giữ bình Tiên Dược trong túi.'
                  : player.questFlags?.curedPetrification
                  ? 'Đã uống để hóa giải lời nguyền.'
                  : 'Bình dược cổ xưa ẩn dưới đáy Vực Sao.',
              },
              {
                key: 'child_13',
                discovered: child13Discovered,
                title: child13Discovered ? 'Thánh Tử Thứ 13' : '???',
                done: child13InParty,
                clue: !child13Discovered
                  ? 'Chưa rõ tung tích.'
                  : child13InParty
                  ? 'Đang đồng hành cùng Tổ Đội.'
                  : child13Rescued
                  ? 'Đã giải thoát (chưa đi cùng Tổ Đội).'
                  : 'Đứa trẻ cuối cùng còn sống sót dưới vực sâu.',
              },
              {
                key: 'book_9',
                discovered: book9Discovered,
                title: book9Discovered ? 'Cuộn Da Dê IX' : '???',
                done: hasBook9,
                clue: !book9Discovered
                  ? 'Chưa rõ tung tích.'
                  : hasBook9
                  ? 'Đã đọc qua ghi chép.'
                  : 'Một trang cổ thư thất lạc trên kệ sách.',
              },
            ];

            const personalLabel =
              player.classId === 'fallen_knight'
                ? 'Lời Thề Kỵ Đoàn'
                : player.classId === 'forsaken_nun'
                ? 'Máu Đen & Em Trai'
                : 'Hóa Giải Lời Nguyền Hóa Đá';

            const personalShortClue =
              player.classId === 'fallen_knight'
                ? 'Tìm sự thật về Vaelis, đừng để bóng tối nuốt chửng.'
                : player.classId === 'forsaken_nun'
                ? 'Đưa em trai rời hầm ngục, giữ đức tin vẹn nguyên.'
                : 'Tìm Tiên Dược Nguyên Sơ xóa vảy đá và phá Kết Giới rời Thung Lũng.';

            const personalDone =
              (player.classId === 'fallen_knight' &&
                Boolean(player.questFlags?.vaelisTalked) &&
                Boolean(player.questFlags?.vaelisDefeated) &&
                player.corruption < 30 &&
                player.readBookIds.length >= 3) ||
              (player.classId === 'forsaken_nun' &&
                child13InParty &&
                player.corruption < 15 &&
                player.readBookIds.length >= 3) ||
              (player.classId === 'night_hunter' &&
                Boolean(player.questFlags?.curedPetrification) &&
                Boolean(player.questFlags?.vaelisDefeated));

            const corruptionLimit =
              player.classId === 'fallen_knight'
                ? 29
                : player.classId === 'forsaken_nun'
                ? 14
                : null;
            const corruptionExceeded =
              corruptionLimit !== null && player.corruption > corruptionLimit;

            return (
              <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
                <div className="df-well px-3 py-2 text-xs text-[#cfc0a9] flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Trạng thái tâm hồn:{' '}
                    <strong className="text-[#c5a059]">
                      {holyBanned
                        ? 'Bị Thánh Mẫu Khước Từ'
                        : player.corruption === 0
                        ? 'Thuần Khiết'
                        : player.corruption < 30
                        ? 'Hơi Rạn Nứt'
                        : player.corruption < 70
                        ? 'Đã Vấy Bẩn'
                        : 'Chìm Trong Bóng Tối'}
                    </strong>
                  </span>
                  <span className="font-mono text-[11px] text-[#9b8f82]">
                    Cổ thư: {player.readBookIds.length}/{CONFIG.BOOKS.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {worldMilestones.map((m) => (
                    <div
                      key={m.key}
                      className={`p-2.5 space-y-1 ${
                        m.done ? 'df-card-active' : m.discovered ? 'df-well' : 'df-well opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold truncate ${
                            m.discovered ? 'text-[#dfd2b4]' : 'text-[#8e847b] tracking-widest'
                          }`}
                        >
                          {m.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold shrink-0 ${
                            m.done
                              ? 'text-[#9ab08e]'
                              : m.discovered
                              ? 'text-[#c5a059]'
                              : 'text-[#6e665f]'
                          }`}
                        >
                          {m.done ? '✦ ĐÃ ĐẠT' : m.discovered ? '◐ LẦN DẤU' : '○ CHƯA RÕ'}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] leading-snug truncate ${
                          m.discovered ? 'text-[#cfc0a9]' : 'text-[#8e847b] italic'
                        }`}
                      >
                        {m.clue}
                      </div>
                    </div>
                  ))}

                  {/* Compact Personal Obsession Card */}
                  <div
                    className={`p-2.5 space-y-1 ${personalDone ? 'df-card-active' : 'df-well'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#c5a059] truncate">
                        ✦ {personalLabel}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold shrink-0 ${
                          personalDone ? 'text-[#9ab08e]' : 'text-[#8e847b]'
                        }`}
                      >
                        {personalDone ? '✦ ĐÃ ĐẠT' : '○ CHẤP NIỆM'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#cfc0a9] leading-snug truncate">
                      {personalShortClue}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] font-mono text-[#9b8f82] pt-0.5 border-t border-[#3a3a3a]/60">
                      {(player.classId === 'fallen_knight' ||
                        player.classId === 'forsaken_nun') && (
                        <span>Sách {player.readBookIds.length}/3</span>
                      )}
                      {corruptionLimit !== null && (
                        <span
                          className={
                            corruptionExceeded ? 'text-[#ef4444] font-bold' : 'text-[#9ab08e]'
                          }
                        >
                          {corruptionExceeded ? 'Đã vấy bẩn' : 'Tâm hồn vẹn nguyên'}
                        </span>
                      )}
                      {player.classId === 'fallen_knight' && player.questFlags?.vaelisTalked && (
                        <span className="text-[#9ab08e]">• Đã đối chất</span>
                      )}
                      {player.classId === 'fallen_knight' && player.questFlags?.vaelisDefeated && (
                        <span className="text-[#9ab08e]">• Hạ Vaelis</span>
                      )}
                      {player.classId === 'forsaken_nun' && child13InParty && (
                        <span className="text-[#9ab08e]">• Em trai cùng đội</span>
                      )}
                      {player.classId === 'night_hunter' && (
                        <span
                          className={player.questFlags?.curedPetrification ? 'text-[#9ab08e]' : ''}
                        >
                          {player.questFlags?.curedPetrification ? 'Độc đã tan' : 'Còn nhiễm độc'}
                        </span>
                      )}
                      {player.classId === 'night_hunter' && player.questFlags?.vaelisDefeated && (
                        <span className="text-[#9ab08e]">• Chướng khí tan</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export interface HunterNoteModalProps {
  onClose: () => void;
}

export const HunterNoteModal: React.FC<HunterNoteModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
    <div className="max-w-xl w-full df-panel p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#c5a059]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#dfd2b4]">
            Mảnh Giấy Nhàu Nát Của Lão Thần Y
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
      <div
        className="p-6 df-parchment-frame text-[#26190d] space-y-3 max-h-[65vh] overflow-y-auto"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        <div className="text-xs uppercase tracking-widest font-bold text-[#8b0000] border-b border-[#6e5233]/40 pb-1">
          Thư Mật Gửi Gã Săn Di Vật
        </div>
        <p className="text-base leading-relaxed whitespace-pre-line">
          {`“Nửa thân dưới ta đã hóa đá.\n\nNếu xuống được tới đáy Vực Sao, bên mép Vết Rách vẫn còn một bình Tiên Dược.\n\nTa không cứu nổi tất cả — dùng cho mình hay cho kẻ khác, tùy ngươi.”`}
        </p>
      </div>
    </div>
  </div>
);
