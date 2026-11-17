export interface IntroChoiceOption {
  id: string;
  label: string;
  effectText: string;
  items?: Record<string, number>;
  weapons?: string[];
  equipWeapon?: string;
  shields?: string[];
  equipShield?: string;
  skills?: string[];
  recipes?: string[];
  books?: string[];
  silverDelta?: number;
  energyStonesDelta?: number;
  maxMindDelta?: number;
  mindSet?: number;
  corruptionDelta?: number;
  agilityBonus?: number;
  magicResistBonus?: number;
  bleedStunResist?: boolean;
  panicImmune?: boolean;
  cursedWeapon?: boolean;
  holyMagicLocked?: boolean;
  revealFloor1Map?: boolean;
  affinityDelta?: {
    holyMother?: number;
    primordialVoid?: number;
    demonicPact?: number;
  };
}

export interface IntroStepDef {
  stepNumber: 1 | 2 | 3;
  prompt: string;
  options: IntroChoiceOption[];
}

export const CHARACTER_INTRO_STEPS: Record<'fallen_knight' | 'forsaken_nun' | 'night_hunter', IntroStepDef[]> = {
  fallen_knight: [
    {
      stepNumber: 1,
      prompt: '1. Cuộc sống sau khi giải ngũ khỏi Kỵ Đoàn:',
      options: [
        {
          id: 'fk_s1_smith',
          label: 'Rèn kiếm cô độc nơi lò rèn cũ',
          effectText: 'Nhận [Trường Kiếm Thép Tốt] + Kỹ năng [Thế Thủ Phản Kích (En Garde)]',
          weapons: ['fine_steel_longsword'],
          equipWeapon: 'fine_steel_longsword',
          skills: ['en_garde'],
        },
        {
          id: 'fk_s1_merc',
          label: 'Làm lính đánh thuê bảo vệ thương đoàn',
          effectText: 'Nhận +15 Đồng Bạc, [Giáp Da Đánh Thuê] & 2 Băng Gạc Y Tế',
          silverDelta: 15,
          items: { bandage: 2 },
        },
        {
          id: 'fk_s1_drink',
          label: 'Uống rượu giải sầu quên đi ác mộng chiến trường',
          effectText: 'Tâm Trí khởi đầu = 80, +3 Rượu Mạnh & Kháng trạng thái Hoảng Loạn',
          mindSet: 80,
          items: { strong_alcohol: 3 },
          panicImmune: true,
        },
      ],
    },
    {
      stepNumber: 2,
      prompt: '2. Cạy rương quân trang đóng bụi tại nhà:',
      options: [
        {
          id: 'fk_s2_manual',
          label: 'Cuốn sổ tay chiến thuật của đội trưởng',
          effectText: 'Học kỹ năng [Trói Gân (Chặt Khớp)] & +2 Nhanh Nhẹn',
          skills: ['hamstring_bind'],
          agilityBonus: 2,
        },
        {
          id: 'fk_s2_shield',
          label: 'Chiếc khiên sắt móp méo in huy hiệu kỵ đoàn',
          effectText: 'Nhận [Khiên Sắt Giáo Đường] & Kỹ năng [Hộ Thể]',
          shields: ['cathedral_iron_shield'],
          equipShield: 'cathedral_iron_shield',
          skills: ['divine_aegis'],
        },
        {
          id: 'fk_s2_cursed',
          label: 'Cờ hiệu thấm máu & đoản kiếm gãy bị nguyền',
          effectText: '+10 Tha Hóa, +1 Cộng Hưởng Ác Quỷ, nhận [Gươm Gãy Kỵ Đoàn (Bị Nguyền)]',
          corruptionDelta: 10,
          affinityDelta: { demonicPact: 1 },
          weapons: ['cursed_broken_bannerblade'],
          equipWeapon: 'cursed_broken_bannerblade',
          cursedWeapon: true,
        },
      ],
    },
    {
      stepNumber: 3,
      prompt: '3. Hành trang cuối trước khi bước vào Thung Lũng:',
      options: [
        {
          id: 'fk_s3_rations',
          label: 'Túi lương khô hành quân',
          effectText: 'Nhận +3 Thịt Khô Muối & +2 Bánh Mì Mốc',
          items: { dried_meat: 3, moldy_bread: 2 },
        },
        {
          id: 'fk_s3_meds',
          label: 'Hộp sơ cứu dã chiến',
          effectText: 'Nhận +2 Lọ Thuốc Xanh (Hồi 50% Sinh Lực) & +2 Băng Gạc',
          items: { blue_vial: 2, bandage: 2 },
        },
        {
          id: 'fk_s3_coins',
          label: 'Hai đồng xu vàng kỷ niệm của đồng đội',
          effectText: 'Nhận +2 Đồng Xu May Mắn (Tung 2 xu cùng lúc khi gặp vận rủi)',
          items: { lucky_coin: 2 },
        },
      ],
    },
  ],
  forsaken_nun: [
    {
      stepNumber: 1,
      prompt: '1. Nhiệm vụ cũ trước ngày bị Giáo Đoàn trục xuất:',
      options: [
        {
          id: 'fn_s1_scribe',
          label: 'Chép kinh trong thư viện cấm Goethe',
          effectText: '+25 Tâm Trí tối đa & mở khóa Cuộn Cổ Thư #1 (Thấu Thị Cổ Ngữ)',
          maxMindDelta: 25,
          books: ['book_1'],
        },
        {
          id: 'fn_s1_apothecary',
          label: 'Bào chế thuốc cứu thương cho bệnh xá',
          effectText: 'Mở công thức Giả Kim Viễn Chinh, +2 Thảo Dược Đỏ & +2 Băng Gạc',
          recipes: ['recipe_herbal_salve', 'recipe_bandage_poultice'],
          items: { red_herb: 2, bandage: 2 },
        },
        {
          id: 'fn_s1_crypt',
          label: 'Dọn dẹp hầm mộ dưới chân tượng Thánh Mẫu',
          effectText: 'Học phép [Chiêu Hồn Thuật] & +1 Đá Năng Lượng',
          skills: ['necromancy'],
          energyStonesDelta: 1,
        },
      ],
    },
    {
      stepNumber: 2,
      prompt: '2. Phản ứng khi tận mắt thấy Tượng Thánh Mẫu chảy máu đen:',
      options: [
        {
          id: 'fn_s2_silence',
          label: 'Giữ im lặng, bí mật ghi chép bằng chứng',
          effectText: 'Giữ vững 0% Tha Hóa, nhận [Chìa Khóa Hầm Mộ] & +1 Đèn Dầu',
          items: { crypt_key_f2: 1, oil_lamp: 1 },
        },
        {
          id: 'fn_s2_flagellate',
          label: 'Quỳ xuống tự hành xác cầu xin tha thứ',
          effectText: '+1 Cộng Hưởng Thánh Mẫu, học [Phép Lành] & nhận [Roi Gai]',
          affinityDelta: { holyMother: 1 },
          skills: ['blessed_heal'],
          weapons: ['thorns_whip'],
          equipWeapon: 'thorns_whip',
        },
        {
          id: 'fn_s2_curse',
          label: 'Nguyền rủa sự giả dối của Giáo hội',
          effectText: '+1 Cộng Hưởng Ác Quỷ, học [Xé Xác], +15 Tha Hóa',
          affinityDelta: { demonicPact: 1 },
          skills: ['flesh_rend'],
          corruptionDelta: 15,
        },
      ],
    },
    {
      stepNumber: 3,
      prompt: '3. Di vật của người em trai duy nhất còn sót lại:',
      options: [
        {
          id: 'fn_s3_amulet',
          label: 'Bùa bạc cầu bình an',
          effectText: 'Tăng +15% Kháng Phép & giảm tụt Tâm Trí khi gặp quái kinh dị',
          magicResistBonus: 0.15,
        },
        {
          id: 'fn_s3_dagger',
          label: 'Dao găm khắc gỗ của hai chị em',
          effectText: 'Nhận [Dao Găm Cong], +1 Thảo Dược Xanh & +1 Cưa Xương',
          weapons: ['curved_dagger'],
          items: { green_herb: 1, bone_saw: 1 },
        },
        {
          id: 'fn_s3_coins',
          label: 'Hai đồng xu cầu nguyện trong tay áo',
          effectText: 'Nhận +2 Đồng Xu May Mắn',
          items: { lucky_coin: 2 },
        },
      ],
    },
  ],
  night_hunter: [
    {
      stepNumber: 1,
      prompt: '1. Nghề cũ trước khi nhiễm độc tố hóa đá dị giới:',
      options: [
        {
          id: 'nh_s1_bounty',
          label: 'Thợ săn tiền thưởng vùng biên',
          effectText: 'Nhận [Dao Găm Cong], +2 Nhanh Nhẹn & Kỹ năng [Trói Gân]',
          weapons: ['curved_dagger'],
          equipWeapon: 'curved_dagger',
          agilityBonus: 2,
          skills: ['hamstring_bind'],
        },
        {
          id: 'nh_s1_thief',
          label: 'Đạo tặc chuyên phá khóa hầm ngục',
          effectText: 'Nhận +3 Chìa Khóa Vạn Năng & +2 Đồng Xu May Mắn',
          items: { lockpick: 3, lucky_coin: 2 },
        },
        {
          id: 'nh_s1_ranger',
          label: 'Thợ săn biên ải sống sót bằng bẫy thú',
          effectText: 'Nhận [Cung Ngắn Biên Ải] & +2 Bẫy Dây Thép',
          weapons: ['hunter_shortbow'],
          equipWeapon: 'hunter_shortbow',
          items: { steel_trap: 2, dried_meat: 1 },
        },
      ],
    },
    {
      stepNumber: 2,
      prompt: '2. Cách bạn đối mặt với độc tố hóa đá đang lan trên cánh tay:',
      options: [
        {
          id: 'nh_s2_splint',
          label: 'Nẹp sắt chặt lên cánh tay ngăn độc chạy vào tim',
          effectText: 'Kháng Chảy Máu / Choáng tốt hơn & nhận +2 Lọ Thuốc Tím',
          bleedStunResist: true,
          items: { opium_vial: 2 },
        },
        {
          id: 'nh_s2_void',
          label: 'Thực hiện nghi thức Hư Vô kìm hãm hóa đá',
          effectText: '+1 Cộng Hưởng Hư Vô, học [Che Mắt], +12 Tha Hóa',
          affinityDelta: { primordialVoid: 1 },
          skills: ['veil_of_blindness'],
          corruptionDelta: 12,
        },
        {
          id: 'nh_s2_herbs',
          label: 'Tích trữ thật nhiều thảo dược và thuốc giải',
          effectText: 'Nhận +2 Lọ Trắng, +2 Rượu Mạnh & +1 Lọ Thuốc Xanh',
          items: { white_vial: 2, strong_alcohol: 2, blue_vial: 1 },
        },
      ],
    },
    {
      stepNumber: 3,
      prompt: '3. Món đồ lấy vội trên bàn Lão Thần Y trước lúc chia tay:',
      options: [
        {
          id: 'nh_s3_vial',
          label: 'Bình thuốc chưa dán nhãn',
          effectText: 'Nhận +1 Lọ Axit Hư Vô & +1 Huyết Thanh Kích Thích',
          items: { void_acid_vial: 1, stimulant_serum: 1 },
        },
        {
          id: 'nh_s3_map',
          label: 'Tấm bản đồ vẽ tay đường lên Lâu Đài Tầng 1',
          effectText: 'Nhận +1 Chìa Khóa Huyết Ngục Tầng 1 & mở lộ thông tin Tầng 1',
          items: { castle_key_f1: 1 },
          revealFloor1Map: true,
        },
        {
          id: 'nh_s3_ash',
          label: 'Túi bột tro mù mắt & đá lửa',
          effectText: 'Nhận +3 Đuốc Sáng & +2 Lọ Đỏ (Axit & Tro Mù Mắt)',
          items: { torch: 3, red_vial: 2 },
        },
      ],
    },
  ],
};

export interface EndingResult {
  id: string;
  title: string;
  subtitle: string;
  epilogue: string;
}

export interface EndingEvalInput {
  classId: string;
  corruption: number;
  readBookIds: string[];
  inventory: Record<string, number>;
  learnedSkillIds: string[];
  vaelisTalked: boolean;
  vaelisDefeated: boolean;
  curedPetrification: boolean;
  child13Rescued: boolean;
  child13InParty?: boolean;
  endingAction:
    | 'SIT_THRONE'
    | 'LEAVE_AFTER_VAELIS'
    | 'SACRIFICE_CHILD13_RIFT'
    | 'POUR_ELIXIR_CHILD13_RIFT'
    | 'STAY_BUILD_GRAVES'
    | 'ESCAPE_EXTERIOR_GATE';
}

export function evaluateCanonEnding(input: EndingEvalInput): EndingResult {
  const hasVoidCore = (input.inventory.void_core || 0) > 0;
  const hasReconstruction = (input.inventory.reconstruction_scroll || 0) > 0;
  const hasElixir = (input.inventory.elixir_of_ancients || 0) > 0;

  // 2. Dark Ending: Tha Hóa >= 100 & sit on Blood Throne
  if (input.endingAction === 'SIT_THRONE' && input.corruption >= 100) {
    return {
      id: 'DARK_ENDING',
      title: 'KẾT CỤC II: KẺ KẾ THỪA NGAI VÀNG MÁU',
      subtitle: 'Vòng Lặp Xiềng Xích Vĩnh Cửu • Tha Hóa Cực Hạn',
      epilogue:
        'Sau khi hạ gục Vaelis, với tâm hồn bị Tha Hóa ăn mòn hoàn toàn, bạn bước lên bậc thềm đá đỏ và đặt mình xuống Ngai Vàng Xương Sắt. Hàng chục ống dẫn tủy sống cùng xiềng xích sắt lập tức đâm xuyên qua vai và ngực, ghim chặt bạn làm nắp hầm mới đè lên Vết Rách Không Gian. Vòng lặp địa ngục lại tiếp diễn thêm một thiên niên kỷ nữa.',
    };
  }

  // 3. Order Ending: Tha Hóa === 0, Void Core + 3 Mảnh Thần Chú Tái Thiết, sacrifice Child 13 at Rift
  if (
    input.endingAction === 'SACRIFICE_CHILD13_RIFT' &&
    input.corruption === 0 &&
    hasVoidCore &&
    hasReconstruction
  ) {
    return {
      id: 'ORDER_ENDING',
      title: 'KẾT CỤC III: KỶ NGUYÊN BẠCH KIM',
      subtitle: 'Sự Thuần Khiết Tuyệt Đối • Cái Giá Của Tự Do Ý Chí',
      epilogue:
        'Giữ tâm hồn hoàn toàn trong sạch không chút Tha Hóa, bạn dùng Lõi Khóa Hư Vô và 3 Mảnh Thần Chú Tái Thiết, hiến tế Thánh Tử Thứ 13 vào tâm trận pháp đáy Tầng 3. Thánh Quang Bạch Kim bùng nổ bịt kín hoàn toàn Vết Rách Không Gian. Thế giới bên ngoài bước vào Kỷ Nguyên Bạch Kim thái bình rực rỡ — nhưng mọi con người đều đánh mất tự do ý chí, trở thành những con rối ngoan đạo vĩnh viễn.',
    };
  }

  // 4. Secret / True Ending: Elixir + Void Core poured on Child 13 at Rift + alchemy lore
  if (
    input.endingAction === 'POUR_ELIXIR_CHILD13_RIFT' &&
    hasVoidCore &&
    hasElixir &&
    input.readBookIds.length >= 4
  ) {
    return {
      id: 'TRUE_ENDING',
      title: 'KẾT CỤC IV: THÁNH THỤ KHAI SÁNG',
      subtitle: 'Khai Sinh Thần Ý Chí • Thuần Hóa Hư Vô',
      epilogue:
        'Thay vì uống Tiên Dược Cổ Đại hay hiến tế đứa trẻ, bạn dùng Lõi Khóa Hư Vô làm mỏ neo và đổ cạn bình Tiên Dược lên lòng bàn tay Thánh Tử Thứ 13 ngay bên mép Vết Rách Tầng 3. Từ máu và mầm cổ thụ, Thánh Thụ — Thần Ý Chí — vươn rễ xuyên suốt ba tầng hầm ngục, dung hợp Khuôn Khổ của Trật Tự và Khát Vọng của Ác Quỷ để vá kín không gian. Nhân loại lần đầu giành lại quyền tự quyết vận mệnh của chính mình.',
    };
  }

  // 5. S-Ending Hiệp Sĩ
  if (
    input.endingAction === 'STAY_BUILD_GRAVES' &&
    input.classId === 'fallen_knight' &&
    input.corruption < 30 &&
    input.vaelisTalked &&
    input.vaelisDefeated &&
    input.readBookIds.length >= 3
  ) {
    return {
      id: 'S_ENDING_KNIGHT',
      title: 'KẾT CỤC V (S-ENDING HIỆP SĨ): GÁNH NẶNG CỦA KẺ SÓT LẠI',
      subtitle: 'Lời Thề Kỵ Đoàn Không Phản Bội',
      epilogue:
        'Bạn đã lắng nghe lời trăn trối bi tráng của Hiệp Sĩ Trưởng Vaelis trước khi vung nhát kiếm kết liễu để giải thoát ông khỏi Ngai Vàng Xương Sắt. Khi Vết Rách được vá lại, bạn từ chối rời khỏi thung lũng. Trong màn sương tan dần, người ta thấy bóng dáng vị cựu phó tướng lặng lẽ dựng từng tấm bia đá cho anh em kỵ đoàn đã ngã xuống và dẫn đường cho những lữ khách lạc lối.',
    };
  }

  // 6. S-Ending Nữ Tu
  if (
    input.endingAction === 'ESCAPE_EXTERIOR_GATE' &&
    input.classId === 'forsaken_nun' &&
    input.corruption < 15 &&
    input.child13Rescued &&
    (input.child13InParty ?? true) &&
    input.readBookIds.length >= 3
  ) {
    return {
      id: 'S_ENDING_NUN',
      title: 'KẾT CỤC VI (S-ENDING NỮ TU): TRO TÀN CỦA ĐỨC TIN',
      subtitle: 'Bằng Chứng Máu Đen & Giải Cứu Em Trai',
      epilogue:
        'Không khuất phục trước quyền năng giả tạo của Thánh Mẫu hay Ác Quỷ, bạn ôm theo toàn bộ Sổ Kiểm Kê Tế Lễ và dắt tay người em trai — Thánh Tử Thứ 13 — bước qua Cổng Sắt Răng Cưa trở về thế giới thực. Trước hàng ngàn tín đồ bàng hoàng ngoài cổng Đại Giáo Đường Goethe, bạn ném thẳng những trang giấy thấm máu đen xuống chân các Giám Mục, châm ngòi cho sự sụp đổ của một đức tin mục nát.',
    };
  }

  // 7. S-Ending Thợ Săn
  if (
    input.endingAction === 'ESCAPE_EXTERIOR_GATE' &&
    input.classId === 'night_hunter' &&
    input.curedPetrification &&
    input.vaelisDefeated
  ) {
    return {
      id: 'S_ENDING_HUNTER',
      title: 'KẾT CỤC VII (S-ENDING THỢ SĂN): KẺ SỐNG SÓT NGOÀI VÒNG PHÁP LUẬT',
      subtitle: 'Tự Chữa Độc Hóa Đá • Thoát Khỏi Kết Giới Chướng Khí',
      epilogue:
        'Bạn đã uống cạn bình Tiên Dược Cổ Đại tìm thấy nơi đáy Vực Sao để đánh tan lớp vảy đá chết chóc trên cánh tay, rồi quay ngược lên chém đứt xiềng xích của Vaelis để phá tan Kết Giới Chướng Khí. Không ngoái đầu nhìn lại khi Hư Vô trào lên nuốt chửng Đại Giáo Đường Goethe, bạn lao qua Cổng Sắt trước lúc bầu trời sụp xuống — một kẻ sống sót cô độc ngoài mọi luật lệ.',
    };
  }

  // 1. Normal Ending fallback
  return {
    id: 'NORMAL_ENDING',
    title: 'KẾT CỤC I: SỰ SỤP ĐỔ CỦA NẮP HẦM',
    subtitle: 'Vaelis Ngã Xuống • Kết Giới Phong Ấn Tan Vỡ',
    epilogue:
      'Bạn đã giết chết Ma Vương Vaelis và rời khỏi Ngai Vàng Xương Sắt mà không kịp phong ấn Vết Rách Không Gian dưới đáy Tầng 3. Khi "nắp hầm" cuối cùng biến mất, Chướng Khí Hư Vô trào ngược lên nuốt chửng toàn bộ Đại Giáo Đường Goethe cùng chính thân xác bạn. Phía bên ngoài dãy núi xa xăm, Giáo Hội Thánh Mẫu vẫn bình an vô sự và tiếp tục viết lại lịch sử theo ý mình.',
  };
}
