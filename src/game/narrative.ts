export interface IntroChoiceOption {
  id: string;
  label: string;
  effectText: string;
  items?: Record<string, number>;
  weapons?: string[];
  equipWeapon?: string;
  shields?: string[];
  equipShield?: string;
  gear?: string[];
  equipGear?: string;
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
      prompt: '1. Những năm tháng sau khi giải ngũ khỏi Kỵ Đoàn:',
      options: [
        {
          id: 'fk_s1_smith',
          label: 'A. Rèn kiếm cô độc nơi lò rèn cũ',
          effectText: 'Kỹ năng [Chém Phủ Đầu] + [Trường Kiếm Thép Tốt]',
          weapons: ['fine_steel_longsword'],
          equipWeapon: 'fine_steel_longsword',
          skills: ['en_garde'],
        },
        {
          id: 'fk_s1_merc',
          label: 'B. Làm lính đánh thuê bảo vệ thương đoàn',
          effectText: '+15 Đồng Bạc + [Giáp Ngực Da Cứng] + 2 Băng Gạc',
          silverDelta: 15,
          gear: ['hardened_leather_cuirass'],
          equipGear: 'hardened_leather_cuirass',
          items: { bandage: 2 },
        },
        {
          id: 'fk_s1_drink',
          label: 'C. Uống rượu giải sầu quên ác mộng chiến trường',
          effectText: '80 Lý Trí + 3 Rượu Mạnh + Kháng Hoảng Loạn',
          mindSet: 80,
          items: { strong_alcohol: 3 },
          panicImmune: true,
        },
      ],
    },
    {
      stepNumber: 2,
      prompt: '2. Cạy rương quân trang đóng bụi trước giờ khởi hành:',
      options: [
        {
          id: 'fk_s2_manual',
          label: 'A. Sổ tay Phá Khớp của đội trưởng',
          effectText: 'Kỹ năng [Trói Gân] +1 Nhanh Nhẹn',
          skills: ['hamstring_bind'],
          agilityBonus: 1,
        },
        {
          id: 'fk_s2_shield',
          label: 'B. Chiếc khiên khắc huy hiệu kỵ đoàn',
          effectText: '[Khiên Gỗ Bọc Sắt] + Kỹ năng [Thế Thủ Kỵ Đoàn]',
          shields: ['rimmed_shield'],
          equipShield: 'rimmed_shield',
          skills: ['divine_aegis'],
        },
        {
          id: 'fk_s2_cursed',
          label: 'C. Lá cờ rách & đoản kiếm gãy Bị Nguyền Sơ Cấp',
          effectText: '[Đoản Kiếm Gãy Bị Nguyền Sơ Cấp] (khóa tay không tháo được), +10 Tha Hóa, +1 Tín Ngưỡng Huyết Quỷ',
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
      prompt: '3. Hành trang cuối cùng mang vào Thung Lũng:',
      options: [
        {
          id: 'fk_s3_rations',
          label: 'A. Túi lương khô hành quân',
          effectText: '3 Thịt Khô + 2 Bánh Mì Cứng',
          items: { dried_meat: 3, moldy_bread: 2 },
        },
        {
          id: 'fk_s3_meds',
          label: 'B. Hộp thuốc sơ cứu chiến trường',
          effectText: '2 Thuốc Hồi Huyết + 2 Băng Gạc',
          items: { blue_vial: 2, bandage: 2 },
        },
        {
          id: 'fk_s3_coins',
          label: 'C. Hai thẻ bài bạc kỷ niệm của đồng đội',
          effectText: '2 Thẻ Bài Bạc',
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
          label: 'A. Thấu Thị Cổ Ngữ trong thư viện cấm',
          effectText: 'Thấu Thị Cổ Ngữ (+25 Lý Trí tối đa) + Cuộn Da Dê I',
          maxMindDelta: 25,
          books: ['book_1'],
        },
        {
          id: 'fn_s1_apothecary',
          label: 'B. Bào chế thảo dược tại bệnh xá',
          effectText: '[Thảo Dược Chí Viễn Chinh] + 2 Cỏ Huyết Dụ + 2 Vải Băng',
          recipes: ['recipe_herbal_salve', 'recipe_bandage_poultice'],
          items: { recipe_book_expedition: 1, red_herb: 2, bandage: 2 },
        },
        {
          id: 'fn_s1_crypt',
          label: 'C. Canh giữ hầm mộ dưới tượng Thánh Mẫu',
          effectText: 'Thao Túng Thi Thể [Chiêu Hồn Thuật] + 1 Đá Linh Hồn Rỗng',
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
          label: 'A. Giữ im lặng, bí mật cất giữ chìa khóa hầm',
          effectText: '0 Tha Hóa + [Chìa Khóa Hầm Nhỏ] + 1 Đèn Dầu',
          items: { crypt_key_f2: 1, oil_lamp: 1 },
        },
        {
          id: 'fn_s2_flagellate',
          label: 'B. Quỳ xuống hành xác cầu xin Thánh Mẫu',
          effectText: '+1 Tín Ngưỡng Thánh Mẫu + [Khổ Hạnh] + [Roi Gai]',
          affinityDelta: { holyMother: 1 },
          skills: ['blessed_heal'],
          weapons: ['thorns_whip'],
          equipWeapon: 'thorns_whip',
        },
        {
          id: 'fn_s2_curse',
          label: 'C. Nguyền rủa sự giả dối của Giáo hội',
          effectText: '+1 Tín Ngưỡng Huyết Quỷ + [Huyết Hỏa] + 15 Tha Hóa (khóa sẵn Order Ending)',
          affinityDelta: { demonicPact: 1 },
          skills: ['flesh_rend'],
          corruptionDelta: 15,
          holyMagicLocked: true,
        },
      ],
    },
    {
      stepNumber: 3,
      prompt: '3. Di vật của người em trai duy nhất còn sót lại:',
      options: [
        {
          id: 'fn_s3_amulet',
          label: 'A. Bùa hộ mệnh bạc',
          effectText: 'Bùa hộ mệnh bạc (+15% Kháng Phép & giảm tụt Lý Trí)',
          magicResistBonus: 0.15,
        },
        {
          id: 'fn_s3_dagger',
          label: 'B. Con dao găm rỉ & kỹ thuật giải phẫu',
          effectText: '[Dao Găm Rỉ] + [Thu Hoạch Nội Tạng (Cuộn Giải Phẫu)] + 1 Thảo Dược Xanh',
          weapons: ['rusty_knife'],
          equipWeapon: 'rusty_knife',
          items: { scroll_field_dissection: 1, green_herb: 1, bone_saw: 1 },
        },
        {
          id: 'fn_s3_coins',
          label: 'C. Hai thẻ bài bạc cầu nguyện',
          effectText: '2 Thẻ Bài Bạc',
          items: { lucky_coin: 2 },
        },
      ],
    },
  ],
  night_hunter: [
    {
      stepNumber: 1,
      prompt: '1. Nghề cũ trước khi trúng kịch độc hóa đá dị giới:',
      options: [
        {
          id: 'nh_s1_bounty',
          label: 'A. Kẻ săn lùng di vật vùng biên',
          effectText: '[Lướt Bóng] + [Dao Găm Cong] + 1 Nhanh Nhẹn + [Trói Gân]',
          weapons: ['curved_dagger'],
          equipWeapon: 'curved_dagger',
          agilityBonus: 1,
          skills: ['hamstring_bind'],
          items: { scroll_shadow_step: 1 },
        },
        {
          id: 'nh_s1_thief',
          label: 'B. Đạo Chích chuyên phá khóa hầm ngục',
          effectText: 'Đạo Chích (3 Chìa Khóa Vạn Năng + 2 Thẻ Bài Bạc)',
          items: { lockpick: 3, lucky_coin: 2 },
        },
        {
          id: 'nh_s1_ranger',
          label: 'C. Xạ thủ săn thú rừng biên ải',
          effectText: '[Cung Ngắn] + 10 Mũi Tên + [Bẫy Dây Thép]',
          weapons: ['hunter_shortbow'],
          equipWeapon: 'hunter_shortbow',
          items: { hunter_arrows: 10, steel_trap: 2, dried_meat: 1 },
        },
      ],
    },
    {
      stepNumber: 2,
      prompt: '2. Cách kìm hãm lớp vảy hóa đá lan trên cánh tay:',
      options: [
        {
          id: 'nh_s2_splint',
          label: 'A. Nẹp sắt khóa mạch máu',
          effectText: 'Nẹp sắt (Kháng Chảy Máu/Choáng + 2 Thuốc An Thần)',
          bleedStunResist: true,
          items: { opium_vial: 2 },
        },
        {
          id: 'nh_s2_void',
          label: 'B. Lĩnh hội Hơi Thở Phân Rã từ khe nứt',
          effectText: '[Hơi Thở Phân Rã] + 1 Tín Ngưỡng Hư Vô + 12 Tha Hóa',
          affinityDelta: { primordialVoid: 1 },
          skills: ['veil_of_blindness'],
          corruptionDelta: 12,
        },
        {
          id: 'nh_s2_herbs',
          label: 'C. Lóc Thịt Sinh Tồn & tích trữ thuốc giải',
          effectText: '[Lóc Thịt Sinh Tồn] + 2 Thuốc Giải Độc + 2 Rượu Mạnh + 1 Thuốc Hồi Huyết',
          items: { scroll_field_dissection: 1, white_vial: 2, strong_alcohol: 2, blue_vial: 1 },
        },
      ],
    },
    {
      stepNumber: 3,
      prompt: '3. Món đồ lấy vội trên bàn Lão Thần Y trước lúc chia tay:',
      options: [
        {
          id: 'nh_s3_vial',
          label: 'A. Bình thuốc chưa dán nhãn',
          effectText: '1 Lọ Axit Hư Vô + 1 Huyết Thanh Kích Thích',
          items: { void_acid_vial: 1, stimulant_serum: 1 },
        },
        {
          id: 'nh_s3_map',
          label: 'B. Bản đồ Tầng 1 & chìa khóa ngục',
          effectText: 'Bản đồ Tầng 1 + Chìa Khóa Huyết Ngục Tầng 1',
          items: { castle_key_f1: 1 },
          revealFloor1Map: true,
        },
        {
          id: 'nh_s3_ash',
          label: 'C. Túi tro mù & đá lửa',
          effectText: 'Ném Tro Mù (3 Đuốc + 2 Lọ Đỏ + Cuộn Đánh Lạc Hướng)',
          items: { torch: 3, red_vial: 2, scroll_distract_ash: 1 },
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
  holyMotherBanned?: boolean;
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
  const hasSeedScroll = input.readBookIds.includes('book_9') || input.readBookIds.length >= 4;

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

  // 3. Order Ending: Không bị cấm Thánh Mẫu, Tha Hóa === 0, Void Core + 3 Mảnh Thần Chú Tái Thiết, sacrifice Child 13 at Rift
  if (
    input.endingAction === 'SACRIFICE_CHILD13_RIFT' &&
    !input.holyMotherBanned &&
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

  // 4. Secret / True Ending: Elixir + Void Core poured on Child 13 at Rift + Cuộn Da Dê IX alchemy lore
  if (
    input.endingAction === 'POUR_ELIXIR_CHILD13_RIFT' &&
    hasVoidCore &&
    hasElixir &&
    hasSeedScroll
  ) {
    return {
      id: 'TRUE_ENDING',
      title: 'KẾT CỤC IV: THÁNH THỤ KHAI SÁNG',
      subtitle: 'Khai Sinh Thần Ý Chí • Thuần Hóa Hư Vô',
      epilogue:
        'Thay vì uống Tiên Dược Nguyên Sơ hay hiến tế đứa trẻ, bạn dùng Lõi Khóa Hư Vô làm mỏ neo và đổ cạn bình Tiên Dược lên lòng bàn tay Thánh Tử Thứ 13 ngay bên mép Vết Rách Tầng 3. Từ máu và mầm cổ thụ, Thánh Thụ — Thần Ý Chí — vươn rễ xuyên suốt ba tầng hầm ngục, dung hợp Khuôn Khổ của Trật Tự và Khát Vọng Phản Kháng để vá kín không gian. Nhân loại lần đầu giành lại quyền tự quyết vận mệnh của chính mình.',
    };
  }

  // 5. S-Ending Hiệp Sĩ (Kẻ Gác Mộ Vô Danh)
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
      title: 'KẾT CỤC V (S-ENDING KẺ GÁC MỘ): GÁNH NẶNG CỦA KẺ SÓT LẠI',
      subtitle: 'Lời Thề Kỵ Đoàn Không Phản Bội',
      epilogue:
        'Bạn đã lắng nghe lời trăn trối bi tráng của Hiệp Sĩ Trưởng Vaelis trước khi vung nhát kiếm kết liễu để giải thoát ông khỏi Ngai Vàng Xương Sắt. Khi Vết Rách được vá lại, bạn từ chối rời khỏi thung lũng. Trong màn sương tan dần, người ta thấy bóng dáng vị cựu phó tướng lặng lẽ dựng từng tấm bia đá cho anh em kỵ đoàn đã ngã xuống và dẫn đường cho những lữ khách lạc lối.',
    };
  }

  // 6. S-Ending Nữ Tu (Kẻ Dị Giáo Mang Dấu Ấn)
  if (
    input.endingAction === 'ESCAPE_EXTERIOR_GATE' &&
    input.classId === 'forsaken_nun' &&
    input.corruption < 15 &&
    input.child13Rescued &&
    Boolean(input.child13InParty) &&
    input.readBookIds.length >= 3
  ) {
    return {
      id: 'S_ENDING_NUN',
      title: 'KẾT CỤC VI (S-ENDING KẺ DỊ GIÁO): TRO TÀN CỦA ĐỨC TIN',
      subtitle: 'Bằng Chứng Máu Đen & Giải Cứu Em Trai',
      epilogue:
        'Không khuất phục trước quyền năng giả tạo của Thánh Mẫu hay Huyết Quỷ, bạn ôm theo toàn bộ Sổ Kiểm Kê Tế Lễ và dắt tay người em trai — Thánh Tử Thứ 13 — bước qua Cổng Sắt Răng Cưa trở về thế giới thực. Trước hàng ngàn tín đồ bàng hoàng ngoài cổng Đại Giáo Đường Goethe, bạn ném thẳng những trang giấy thấm máu đen xuống chân các Giám Mục, châm ngòi cho sự sụp đổ của một đức tin mục nát.',
    };
  }

  // 7. S-Ending Thợ Săn (Gã Săn Di Vật)
  if (
    input.endingAction === 'ESCAPE_EXTERIOR_GATE' &&
    input.classId === 'night_hunter' &&
    input.curedPetrification &&
    input.vaelisDefeated
  ) {
    return {
      id: 'S_ENDING_HUNTER',
      title: 'KẾT CỤC VII (S-ENDING GÃ SĂN DI VẬT): KẺ SỐNG SÓT NGOÀI VÒNG PHÁP LUẬT',
      subtitle: 'Tự Chữa Độc Hóa Đá • Thoát Khỏi Kết Giới Chướng Khí',
      epilogue:
        'Bạn đã uống cạn bình Tiên Dược Nguyên Sơ tìm thấy nơi đáy Vực Sao để đánh tan lớp vảy đá chết chóc trên cánh tay, rồi quay ngược lên chém đứt xiềng xích của Vaelis để phá tan Kết Giới Chướng Khí. Không ngoái đầu nhìn lại khi Hư Vô trào lên nuốt chửng Đại Giáo Đường Goethe, bạn lao qua Cổng Sắt trước lúc bầu trời sụp xuống — một kẻ sống sót cô độc ngoài mọi luật lệ.',
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
