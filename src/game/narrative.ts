export interface IntroChoiceOption {
  id: string;
  label: string;
  contextHint?: string;
  outcomeFlavor?: string;
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
          label: 'A. Rèn kiếm cô độc trong căn chòi cũ',
          contextHint: 'Mỗi đêm khuya chỉ còn tiếng búa đập vang trên đe thép lạnh.',
          outcomeFlavor: 'Đôi tay chai sần rèn nên lưỡi trường kiếm mới, ký ức về đòn bổ dọc của Kỵ Đoàn bỗng trở về sắc bén.',
          effectText: 'Nhận [Trường Kiếm Thép Tốt] • Lĩnh hội chiến kỹ [Chém Phủ Đầu]',
          weapons: ['fine_steel_longsword'],
          equipWeapon: 'fine_steel_longsword',
          skills: ['en_garde'],
        },
        {
          id: 'fk_s1_merc',
          label: 'B. Làm lính đánh thuê hộ tống thương đoàn',
          contextHint: 'Đổi máu thịt trên những con đường biên ải để kiếm bạc trắng.',
          outcomeFlavor: 'Những chuyến áp tải đẫm máu để lại trong hành trang lớp giáp da dày, vài cuộn vải băng và túi bạc nặng trĩu.',
          effectText: 'Nhận 15 Đồng Bạc • [Giáp Ngực Da Cứng] • 2 Băng Gạc',
          silverDelta: 15,
          gear: ['hardened_leather_cuirass'],
          equipGear: 'hardened_leather_cuirass',
          items: { bandage: 2 },
        },
        {
          id: 'fk_s1_drink',
          label: 'C. Chìm trong men rượu quên ác mộng chiến trường',
          contextHint: 'Hơi rượu cay xé cổ họng để dìm tiếng kêu gào của đồng đội cũ.',
          outcomeFlavor: 'Đầu óc có phần nặng nề vì men say, nhưng đôi mắt bạn giờ đây chai lì trước mọi cơn kinh hoàng.',
          effectText: 'Nhận 3 Rượu Mạnh • Tâm trí chai lì trước nỗi hoảng loạn',
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
          label: 'A. Lấy cuốn sổ tay ghi chép của đội trưởng',
          contextHint: 'Những trang giấy ố vàng vẽ chi tiết khớp xương kẻ địch.',
          outcomeFlavor: 'Bạn lật vội những nét mực đen mờ, ghi khắc cách chém đứt gân chân và bước né nhẹ nhàng của người chỉ huy năm xưa.',
          effectText: 'Lĩnh hội chiến kỹ [Trói Gân] • Thân pháp trở nên nhanh nhẹn hơn',
          skills: ['hamstring_bind'],
          agilityBonus: 1,
        },
        {
          id: 'fk_s2_shield',
          label: 'B. Nâng chiếc khiên khắc huy hiệu Kỵ Đoàn',
          contextHint: 'Vành sắt vẫn còn hằn dấu chém từ trận tử thủ cuối cùng.',
          outcomeFlavor: 'Sức nặng quen thuộc của tấm khiên bọc sắt tựa lên cẳng tay, đánh thức bản năng phòng thủ thép của Kỵ Đoàn.',
          effectText: 'Nhận [Khiên Gỗ Bọc Sắt] • Lĩnh hội chiến kỹ [Thế Thủ Kỵ Đoàn]',
          shields: ['rimmed_shield'],
          equipShield: 'rimmed_shield',
          skills: ['divine_aegis'],
        },
        {
          id: 'fk_s2_cursed',
          label: 'C. Cạy đáy rương lấy lá cờ thấm máu và lưỡi kiếm gãy',
          contextHint: 'Một luồng hơi lạnh rỉ ra từ mảnh thép đen kịt bọc vải rách.',
          outcomeFlavor: 'Ngay khi ngón tay chạm vào chuôi thép, mảnh kiếm gãy bám chặt vào da thịt — tiếng thì thầm khàn đặc vang lên trong đầu.',
          effectText: 'Gắn chặt [Đoản Kiếm Gãy Bị Nguyền Sơ Cấp] • Cảm nhận khí tức Huyết Quỷ len vào huyết quản',
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
          label: 'A. Gói túi lương khô hành quân',
          contextHint: 'Khẩu phần mặn chát nhưng đủ cầm cự qua những hầm tối dài ngày.',
          outcomeFlavor: 'Bạn buộc chặt túi lương thực khô bên hông, chuẩn bị cho cuộc hành trình không hẹn ngày trở lại.',
          effectText: 'Nhận 3 Thịt Khô • 2 Bánh Mì Cứng',
          items: { dried_meat: 3, moldy_bread: 2 },
        },
        {
          id: 'fk_s3_meds',
          label: 'B. Mang theo hộp thuốc sơ cứu chiến trường',
          contextHint: 'Lọ thuốc xanh lạnh và những cuộn vải sạch hiếm hoi.',
          outcomeFlavor: 'Bạn kiểm tra lại nút chai thủy tinh và xếp gọn băng gạc vào ngăn túi gần tay nhất.',
          effectText: 'Nhận 2 Thuốc Hồi Huyết • 2 Băng Gạc',
          items: { blue_vial: 2, bandage: 2 },
        },
        {
          id: 'fk_s3_coins',
          label: 'C. Cất hai thẻ bài bạc kỷ niệm của đồng đội',
          contextHint: 'Hai đồng bạc cũ khắc hình mặt trăng và lưỡi kiếm.',
          outcomeFlavor: 'Bạn siết hai thẻ bài bạc lạnh lẽo trong túi áo — thứ duy nhất còn sót lại của những kẻ từng đứng cạnh bạn.',
          effectText: 'Nhận 2 Thẻ Bài Bạc',
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
          label: 'A. Chép lại cổ thư trong thư viện cấm',
          contextHint: 'Đọc những dòng chữ bị giáo hội niêm phong dưới ánh nến leo lét.',
          outcomeFlavor: 'Những năm tháng nghiền ngẫm cổ ngữ rèn cho tâm trí bạn sự tỉnh táo hiếm có, cùng một cuộn da dê kịp giấu trong tay áo.',
          effectText: 'Tâm trí vững vàng hơn • Lưu giữ [Cuộn Da Dê I]',
          maxMindDelta: 25,
          books: ['book_1'],
        },
        {
          id: 'fn_s1_apothecary',
          label: 'B. Bào chế thảo dược tại bệnh xá',
          contextHint: 'Ghi nhớ từng vị thuốc đắng dùng để cầm máu cho các tu sĩ.',
          outcomeFlavor: 'Bạn mang theo cuốn sổ ghi chép bào chế quen thuộc cùng vài nhành cỏ đỏ và vải băng sạch.',
          effectText: 'Nhận [Thảo Dược Chí Viễn Chinh] • 2 Cỏ Huyết Dụ • 2 Băng Gạc',
          recipes: ['recipe_herbal_salve', 'recipe_bandage_poultice'],
          items: { recipe_book_expedition: 1, red_herb: 2, bandage: 2 },
        },
        {
          id: 'fn_s1_crypt',
          label: 'C. Canh giữ hầm mộ dưới tượng Thánh Mẫu',
          contextHint: 'Lắng nghe tiếng rì rầm kỳ lạ vọng ra từ những cỗ quan tài đá.',
          outcomeFlavor: 'Bóng tối dưới hầm mộ dạy bạn thứ cấm thuật đánh thức xác chết — cùng một viên đá lạnh buốt nhặt bên bia mộ vỡ.',
          effectText: 'Lĩnh hội [Chiêu Hồn Thuật] • Nhận 1 Đá Linh Hồn Rỗng',
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
          label: 'A. Lặng lẽ lùi bước, bí mật giấu chìa khóa hầm',
          contextHint: 'Không thốt nên lời, chỉ kịp cầm theo chiếc đèn dầu bên bệ đá.',
          outcomeFlavor: 'Bạn nuốt ngược nỗi kinh hoàng vào trong, giấu chặt chiếc chìa khóa sắt lạnh và ngọn đèn dầu dưới lớp áo tu.',
          effectText: 'Nhận [Chìa Khóa Hầm Nhỏ] • 1 Đèn Dầu',
          items: { crypt_key_f2: 1, oil_lamp: 1 },
        },
        {
          id: 'fn_s2_flagellate',
          label: 'B. Quỳ xuống hành xác cầu xin Thánh Mẫu',
          contextHint: 'Tự quất roi gai lên vai để giữ vẹn niềm tin mong manh.',
          outcomeFlavor: 'Giữa cơn đau rát da thịt, một tia sáng trắng dịu khẽ chạm vào trán bạn; sợi roi gai thấm máu giờ nằm gọn trong tay.',
          effectText: 'Nhận [Roi Gai] • Lĩnh hội phép [Khổ Hạnh] • Thánh Mẫu khẽ hồi đáp lời cầu nguyện',
          affinityDelta: { holyMother: 1 },
          skills: ['blessed_heal'],
          weapons: ['thorns_whip'],
          equipWeapon: 'thorns_whip',
        },
        {
          id: 'fn_s2_curse',
          label: 'C. Nguyền rủa sự giả dối của Giáo hội và Thánh Mẫu',
          contextHint: 'Xé toạc chuỗi tràng hạt ngay trước đôi mắt rỉ máu của pho tượng.',
          outcomeFlavor: 'Lời nguyền rủa vang vọng giữa sảnh đường tĩnh lặng. Ngọn lửa máu bùng lên trong lòng bàn tay bạn, còn tiếng thì thầm thánh thiện bỗng im bặt mãi mãi.',
          effectText: 'Lĩnh hội phép [Huyết Hỏa] • Bóng tối Huyết Quỷ đáp lời, ánh sáng Thánh Mẫu quay lưng',
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
          label: 'A. Đeo chiếc bùa hộ mệnh bằng bạc lên cổ',
          contextHint: 'Mặt bạc đã xỉn màu nhưng vẫn giữ hơi ấm ký ức thuở nhỏ.',
          outcomeFlavor: 'Sợi dây bạc áp sát ngực như tấm màn chắn mỏng manh bảo vệ tâm trí bạn khỏi tà thuật.',
          effectText: 'Đeo [Bùa Hộ Mệnh Bạc] • Tăng khả năng chống chịu phép thuật và giữ tâm trí',
          magicResistBonus: 0.15,
        },
        {
          id: 'fn_s3_dagger',
          label: 'B. Cầm lấy con dao găm rỉ và sổ giải phẫu cũ',
          contextHint: 'Lưỡi thép mòn vẹt cùng vài trang vẽ cách tách lọc thân xác sạch sẽ.',
          outcomeFlavor: 'Bạn bọc gọn con dao găm, chiếc cưa xương nhỏ và tờ giấy giải phẫu cùng nhành thảo dược xanh vào túi áo.',
          effectText: 'Nhận [Dao Găm Rỉ] • [Cuộn Giải Phẫu Thực Địa] • Cưa Xương • 1 Thảo Dược Xanh',
          weapons: ['rusty_knife'],
          equipWeapon: 'rusty_knife',
          items: { scroll_field_dissection: 1, green_herb: 1, bone_saw: 1 },
        },
        {
          id: 'fn_s3_coins',
          label: 'C. Giữ lại hai thẻ bài bạc cầu nguyện',
          contextHint: 'Thứ duy nhất cậu bé từng nắm chặt mỗi đêm giông bão.',
          outcomeFlavor: 'Hai thẻ bài bạc khẽ chạm nhau lách cách trong lòng bàn tay bạn giữa cơn gió lạnh ngoại vi.',
          effectText: 'Nhận 2 Thẻ Bài Bạc',
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
          label: 'A. Săn lùng di vật và cổ vật vùng biên',
          contextHint: 'Sống sót nhờ bước chân lặng lẽ và nhát dao cắt gân dứt khoát.',
          outcomeFlavor: 'Bạn kiểm tra lưỡi dao săn cong quen thuộc cùng cuộn bí kíp ẩn thân, đôi chân vẫn giữ nguyên phản xạ sắc bén.',
          effectText: 'Nhận [Dao Găm Cong] • [Cuộn Lướt Bóng] • Chiến kỹ [Trói Gân] • Thân pháp nhanh nhẹn hơn',
          weapons: ['curved_dagger'],
          equipWeapon: 'curved_dagger',
          agilityBonus: 1,
          skills: ['hamstring_bind'],
          items: { scroll_shadow_step: 1 },
        },
        {
          id: 'nh_s1_thief',
          label: 'B. Đạo chích chuyên mở khóa hầm ngục cổ',
          contextHint: 'Không ổ khóa sắt nào giữ được đôi tay mảnh khảnh của ngươi.',
          outcomeFlavor: 'Những thanh thép mỏng mở khóa và hai thẻ bài bạc đã được giấu kỹ trong lớp lót áo khoác.',
          effectText: 'Nhận 3 Chìa Khóa Vạn Năng • 2 Thẻ Bài Bạc',
          items: { lockpick: 3, lucky_coin: 2 },
        },
        {
          id: 'nh_s1_ranger',
          label: 'C. Xạ thủ săn thú nơi bìa rừng sương mù',
          contextHint: 'Dây cung căng cứng và những chiếc bẫy sắt ẩn dưới lá khô.',
          outcomeFlavor: 'Bạn khoác cây cung ngắn lên vai, đeo ống tên đầy đặn cùng vài chiếc bẫy dây thép và miếng thịt khô.',
          effectText: 'Nhận [Cung Ngắn] • 10 Mũi Tên • 2 Bẫy Dây Thép • 1 Thịt Khô',
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
          label: 'A. Siết nẹp sắt khóa chặt mạch máu',
          contextHint: 'Đau đến tê dại, nhưng giữ cho cổ tay không vỡ vụn khi giao tranh.',
          outcomeFlavor: 'Vòng nẹp sắt lạnh ngắt ghìm chặt lấy cánh tay, kèm hai lọ thuốc an thần giúp bạn chịu đựng cơn nhức buốt.',
          effectText: 'Gắn nẹp sắt giảm nguy cơ chảy máu và choáng • Nhận 2 Thuốc An Thần',
          bleedStunResist: true,
          items: { opium_vial: 2 },
        },
        {
          id: 'nh_s2_void',
          label: 'B. Hít luồng khói tím từ khe nứt để làm tê liệt cơn đau',
          contextHint: 'Cơn đau dịu đi tức khắc, nhưng bóng đêm bắt đầu thì thầm trong tai.',
          outcomeFlavor: 'Làn khói lạnh buốt tràn vào phổi. Cơn đau tắt lịm, nhưng tiếng rì rầm từ vực sâu không bao giờ dứt nữa.',
          effectText: 'Lĩnh hội phép [Hơi Thở Phân Rã] • Cảm nhận nhịp thở của Hư Vô Nguyên Thủy',
          affinityDelta: { primordialVoid: 1 },
          skills: ['veil_of_blindness'],
          corruptionDelta: 12,
        },
        {
          id: 'nh_s2_herbs',
          label: 'C. Tích trữ thuốc giải và học cách tách lọc thịt thú',
          contextHint: 'Không tin vào tà thuật — chỉ tin vào dao sắc, rượu mạnh và thảo dược.',
          outcomeFlavor: 'Hành trang bạn đầy ắp thuốc giải, rượu mạnh và cuộn ghi chép cách giải phẫu sạch sẽ ngoài thực địa.',
          effectText: 'Nhận [Cuộn Giải Phẫu Thực Địa] • 2 Thuốc Giải Độc • 2 Rượu Mạnh • 1 Thuốc Hồi Huyết',
          items: { scroll_field_dissection: 1, white_vial: 2, strong_alcohol: 2, blue_vial: 1 },
        },
      ],
    },
    {
      stepNumber: 3,
      prompt: '3. Lục tìm vội trên bàn Lão Thần Y trước lúc chia tay:',
      options: [
        {
          id: 'nh_s3_vial',
          label: 'A. Chộp lấy hai bình thủy tinh chưa dán nhãn',
          contextHint: 'Chất lỏng bên trong sủi bọt nhẹ với sắc tím và đỏ thẫm kỳ dị.',
          outcomeFlavor: 'Bạn nhét vội hai ống thuốc nặng mùi hóa chất vào túi da — thứ vũ khí giả kim nguy hiểm nhưng có thể cứu mạng lúc nguy cấp.',
          effectText: 'Nhận 1 Lọ Axit Hư Vô • 1 Huyết Thanh Kích Thích',
          items: { void_acid_vial: 1, stimulant_serum: 1 },
        },
        {
          id: 'nh_s3_map',
          label: 'B. Cuộn tờ bản đồ rách cùng chùm chìa khóa sắt',
          contextHint: 'Nét mực vẽ nguệch ngoạc những hành lang tầng trên của lâu đài.',
          outcomeFlavor: 'Bản đồ phác thảo những căn phòng đầu tiên của Lâu Đài Ma Vương cùng chiếc chìa khóa ngục sắt lạnh giờ thuộc về bạn.',
          effectText: 'Ghi nhớ sơ đồ Tầng 1 • Nhận [Chìa Khóa Huyết Ngục Tầng 1]',
          items: { castle_key_f1: 1 },
          revealFloor1Map: true,
        },
        {
          id: 'nh_s3_ash',
          label: 'C. Gom túi tro mù, đá lửa và vài bó đuốc',
          contextHint: 'Bóng tối dưới hầm sâu nuốt chửng mọi kẻ đi mà không có lửa.',
          outcomeFlavor: 'Ba bó đuốc khô, hai lọ bụi đỏ và cuộn tro đánh lạc hướng nằm gọn trong hành trang của bạn.',
          effectText: 'Nhận 3 Đuốc Sáng • 2 Lọ Đỏ • 1 Cuộn Đánh Lạc Hướng',
          items: { torch: 3, red_vial: 2, scroll_distract_ash: 1 },
        },
      ],
    },
  ],
};

export interface EndingResult {
  id: string;
  title: string;
  endingBannerLabel: string;
  isPersonal?: boolean;
  subtitle: string;
  epilogue: string;
}

export interface EndingEvalInput {
  classId: string;
  corruption: number;
  demonicPactAffinity?: number;
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

export interface VoidRiftEvalInput {
  classId: string;
  corruption: number;
  demonicPactAffinity?: number;
  holyMotherBanned?: boolean;
  readBookIds: string[];
  inventory: Record<string, number>;
  vaelisTalked: boolean;
  vaelisDefeated: boolean;
  curedPetrification: boolean;
  child13Rescued: boolean;
  child13InParty: boolean;
  riftElixirCollected: boolean;
}

export interface VoidRiftAvailability {
  hasVoidCore: boolean;
  hasElixir: boolean;
  hasReconScroll: boolean;
  hasSeedLore: boolean;
  hasChild13Ready: boolean;
  canCollectElixir: boolean;
  canRescueChild13: boolean;
  trueEnding: {
    ready: boolean;
    missing: string[];
  };
  orderEnding: {
    ready: boolean;
    missing: string[];
  };
  darkEnding: {
    ready: boolean;
  };
  personalEnding: {
    ready: boolean;
    variant: 'knight' | 'nun' | 'hunter' | null;
    action: 'STAY_BUILD_GRAVES' | 'ESCAPE_EXTERIOR_GATE' | null;
    label: string | null;
  };
  normalEnding: {
    ready: boolean;
  };
}

export function evaluateVoidRiftRequirements(input: VoidRiftEvalInput): VoidRiftAvailability {
  const hasVoidCore = (input.inventory.void_core || 0) > 0;
  const hasElixir = (input.inventory.elixir_of_ancients || 0) > 0;
  const hasReconScroll = (input.inventory.reconstruction_scroll || 0) > 0;
  const hasSeedLore = input.readBookIds.includes('book_9') || input.readBookIds.length >= 4;
  const hasChild13Ready = Boolean(input.child13InParty || input.child13Rescued);
  const demonicAff = input.demonicPactAffinity || 0;
  const holyBanned = Boolean(input.holyMotherBanned);

  const trueMissing: string[] = [];
  if (!hasVoidCore) trueMissing.push('Lõi Khóa Hư Vô');
  if (!hasElixir) trueMissing.push('Tiên Dược Nguyên Sơ');
  if (!hasChild13Ready) trueMissing.push('Thánh Tử 13');
  if (!hasSeedLore) trueMissing.push('Cuộn Da Dê IX hoặc tri thức Cổ Thư');

  const orderMissing: string[] = [];
  if (holyBanned || input.corruption > 0) orderMissing.push('Tâm hồn thuần khiết');
  if (!hasVoidCore) orderMissing.push('Lõi Khóa Hư Vô');
  if (!hasReconScroll) orderMissing.push('Thần Chú Tái Thiết');

  const darkReady = Boolean(input.vaelisDefeated) && (input.corruption >= 70 || demonicAff >= 2);

  const knightReady =
    input.classId === 'fallen_knight' &&
    input.corruption < 30 &&
    Boolean(input.vaelisTalked) &&
    Boolean(input.vaelisDefeated) &&
    input.readBookIds.length >= 3;
  const nunReady =
    input.classId === 'forsaken_nun' &&
    input.corruption < 15 &&
    Boolean(input.child13Rescued) &&
    Boolean(input.child13InParty) &&
    input.readBookIds.length >= 3;
  const hunterReady =
    input.classId === 'night_hunter' &&
    Boolean(input.curedPetrification) &&
    Boolean(input.vaelisDefeated);

  let personalEnding: VoidRiftAvailability['personalEnding'] = {
    ready: false,
    variant: null,
    action: null,
    label: null,
  };
  if (knightReady) {
    personalEnding = {
      ready: true,
      variant: 'knight',
      action: 'STAY_BUILD_GRAVES',
      label: 'Ở lại Thung Lũng dựng bia mộ cho Kỵ Đoàn',
    };
  } else if (nunReady) {
    personalEnding = {
      ready: true,
      variant: 'nun',
      action: 'ESCAPE_EXTERIOR_GATE',
      label: 'Đưa Thánh Tử 13 rời khỏi Thung Lũng qua Cổng Sắt',
    };
  } else if (hunterReady) {
    personalEnding = {
      ready: true,
      variant: 'hunter',
      action: 'ESCAPE_EXTERIOR_GATE',
      label: 'Phá Kết Giới và rời khỏi Thung Lũng',
    };
  }

  return {
    hasVoidCore,
    hasElixir,
    hasReconScroll,
    hasSeedLore,
    hasChild13Ready,
    canCollectElixir: !input.riftElixirCollected,
    canRescueChild13: !input.child13Rescued,
    trueEnding: {
      ready: trueMissing.length === 0,
      missing: trueMissing,
    },
    orderEnding: {
      ready: orderMissing.length === 0,
      missing: orderMissing,
    },
    darkEnding: {
      ready: darkReady,
    },
    personalEnding,
    normalEnding: {
      ready: Boolean(input.vaelisDefeated),
    },
  };
}

export function evaluateCanonEnding(input: EndingEvalInput): EndingResult {
  const hasVoidCore = (input.inventory.void_core || 0) > 0;
  const hasReconstruction = (input.inventory.reconstruction_scroll || 0) > 0;
  const hasElixir = (input.inventory.elixir_of_ancients || 0) > 0;
  const hasSeedScroll = input.readBookIds.includes('book_9') || input.readBookIds.length >= 4;
  const hasChild13 = Boolean(input.child13Rescued || input.child13InParty);

  // 2. Dark Ending: Tha Hóa >= 70 hoặc Tín ngưỡng Huyết Quỷ >= 2 & sit on Blood Throne
  if (
    input.endingAction === 'SIT_THRONE' &&
    (input.corruption >= 70 || (input.demonicPactAffinity || 0) >= 2)
  ) {
    return {
      id: 'DARK_ENDING',
      title: 'KẾT CỤC II: KẺ KẾ THỪA NGAI VÀNG MÁU',
      endingBannerLabel: 'DARK ENDING — KẺ KẾ THỪA NGAI VÀNG MÁU',
      isPersonal: false,
      subtitle: 'Vòng Lặp Xiềng Xích Vĩnh Cửu • Tha Hóa Cực Hạn',
      epilogue:
        'Sau khi hạ gục Vaelis, với tâm hồn bị Tha Hóa ăn mòn sâu sắc hoặc đã ký khế ước Huyết Quỷ, bạn bước lên bậc thềm đá đỏ và đặt mình xuống Ngai Vàng Xương Sắt. Hàng chục ống dẫn tủy sống cùng xiềng xích sắt lập tức đâm xuyên qua vai và ngực, ghim chặt bạn làm nắp hầm mới đè lên Vết Rách Không Gian. Vòng lặp địa ngục lại tiếp diễn thêm một thiên niên kỷ nữa.',
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
      endingBannerLabel: 'ORDER ENDING — KỶ NGUYÊN BẠCH KIM',
      isPersonal: false,
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
    hasSeedScroll &&
    hasChild13
  ) {
    return {
      id: 'TRUE_ENDING',
      title: 'KẾT CỤC IV: THÁNH THỤ KHAI SÁNG',
      endingBannerLabel: 'TRUE ENDING — THÁNH THỤ KHAI SÁNG',
      isPersonal: false,
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
      endingBannerLabel: 'PERSONAL ENDING — GÁNH NẶNG CỦA KẺ SÓT LẠI',
      isPersonal: true,
      subtitle: 'Lời Thề Kỵ Đoàn Không Phản Bội',
      epilogue:
        'Bạn đã lắng nghe lời trăn trối bi tráng của Hiệp Sĩ Trưởng Vaelis trước khi vung nhát kiếm kết liễu để giải thoát ông khỏi Ngai Vàng Xương Sắt. Khi Vết Rách được vá lại, bạn từ chối rời khỏi thung lũng. Trong màn sương tan dần, người ta thấy bóng dáng vị cựu phó tướng lặng lẽ dựng từng tấm bia đá cho anh em kỵ đoàn đã ngã xuống và dẫn đường cho những lữ khách lạc lối.',
    };
  }

  // 6. S-Ending Nữ Tu Oan Khuất
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
      title: 'KẾT CỤC VI (S-ENDING NỮ TU OAN KHUẤT): TRO TÀN CỦA ĐỨC TIN',
      endingBannerLabel: 'PERSONAL ENDING — TRO TÀN CỦA ĐỨC TIN',
      isPersonal: true,
      subtitle: 'Bằng Chứng Máu Đen & Giải Cứu Em Trai',
      epilogue:
        'Không khuất phục trước quyền năng giả tạo của Thánh Mẫu hay Huyết Quỷ, bạn ôm theo toàn bộ Sổ Kiểm Kê Tế Lễ và dắt tay người em trai — Thánh Tử Thứ 13 — bước qua Cổng Sắt Răng Cưa, bỏ lại bóng tối phía sau. Trước hàng ngàn tín đồ bàng hoàng ngoài cổng Đại Giáo Đường Goethe, bạn ném thẳng những trang giấy thấm máu đen xuống chân các Giám Mục, châm ngòi cho sự sụp đổ của một đức tin mục nát.',
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
      endingBannerLabel: 'PERSONAL ENDING — KẺ SỐNG SÓT NGOÀI VÒNG PHÁP LUẬT',
      isPersonal: true,
      subtitle: 'Tự Chữa Độc Hóa Đá • Thoát Khỏi Kết Giới Chướng Khí',
      epilogue:
        'Bạn đã uống cạn bình Tiên Dược Nguyên Sơ tìm thấy nơi đáy Vực Sao để đánh tan lớp vảy đá chết chóc trên cánh tay, rồi quay ngược lên chém đứt xiềng xích của Vaelis để phá tan Kết Giới Chướng Khí. Không ngoái đầu nhìn lại khi Hư Vô trào lên nuốt chửng Đại Giáo Đường Goethe, bạn lao qua Cổng Sắt trước lúc bầu trời sụp xuống — một kẻ sống sót cô độc ngoài mọi luật lệ.',
    };
  }

  // 1. Normal Ending fallback
  return {
    id: 'NORMAL_ENDING',
    title: 'KẾT CỤC I: SỰ SỤP ĐỔ CỦA NẮP HẦM',
    endingBannerLabel: 'NORMAL ENDING — SỰ SỤP ĐỔ CỦA NẮP HẦM',
    isPersonal: false,
    subtitle: 'Vaelis Ngã Xuống • Kết Giới Phong Ấn Tan Vỡ',
    epilogue:
      'Bạn đã giết chết Ma Vương Vaelis và rời khỏi Ngai Vàng Xương Sắt mà không kịp phong ấn Vết Rách Không Gian dưới đáy Tầng 3. Khi phong ấn cuối cùng sụp đổ, Chướng Khí Hư Vô trào ngược lên nuốt chửng toàn bộ Đại Giáo Đường Goethe cùng chính thân xác bạn. Phía bên ngoài dãy núi xa xăm, Giáo Hội Thánh Mẫu vẫn bình an vô sự và tiếp tục viết lại lịch sử theo ý mình.',
  };
}

export type SmugglerHaggleTactic = 'discount_25' | 'discount_40' | 'question_origin';

export interface SmugglerHaggleOutcome {
  accepted: boolean;
  refusedItem: boolean;
  newPrice: number;
  dialogue: string;
}

export const SMUGGLER_VALUABLE_IDS = new Set<string>([
  'lucky_coin',
  'white_herb',
  'oil_lamp',
  'butcher_cleaver',
  'bone_saw',
  'ancient_ash',
]);

export function evaluateSmugglerHaggle(
  itemId: string,
  itemName: string,
  basePrice: number,
  tactic: SmugglerHaggleTactic,
  roll01: number
): SmugglerHaggleOutcome {
  if (tactic === 'discount_25') {
    if (roll01 < 0.65) {
      const lowered = Math.max(2, Math.round(basePrice * 0.75));
      return {
        accepted: true,
        refusedItem: false,
        newPrice: lowered,
        dialogue: `“Ngươi nhìn ra được giá trị thật của nó. Cầm lấy [${itemName}] với ${lowered} Đồng Bạc, trước khi ta đổi ý.”`,
      };
    }
    const raised = Math.ceil(basePrice * 1.15);
    return {
      accepted: false,
      refusedItem: false,
      newPrice: raised,
      dialogue: `“Mặc cả giữa mồ chôn này là một sai lầm. [${itemName}] giờ là ${raised} Đồng Bạc.”`,
    };
  }

  if (tactic === 'discount_40') {
    if (roll01 < 0.32) {
      const lowered = Math.max(2, Math.round(basePrice * 0.6));
      return {
        accepted: true,
        refusedItem: false,
        newPrice: lowered,
        dialogue: `“Ánh mắt của kẻ không còn gì để mất... Được, ${lowered} Đồng Bạc cho [${itemName}]. Coi như ta cược vào mạng sống của ngươi.”`,
      };
    }
    if (roll01 < 0.72) {
      const raised = Math.ceil(basePrice * 1.25);
      return {
        accepted: false,
        refusedItem: false,
        newPrice: raised,
        dialogue: `“Đừng thử lòng kiên nhẫn của ta. [${itemName}] lên ${raised} Đồng Bạc — trả đủ hoặc bước đi.”`,
      };
    }
    return {
      accepted: false,
      refusedItem: true,
      newPrice: basePrice,
      dialogue: `“Cất bạc lại. [${itemName}] không còn dành cho ngươi nữa.”`,
    };
  }

  // question_origin
  const loreLine =
    itemId === 'lucky_coin'
      ? '“Đồng bạc khắc hai mặt trăng máu này ta lột từ tay một kỵ sĩ chết khô trước cánh cửa Ngai Vàng. Hắn đã đặt cược sai ở cú lật cuối cùng...”'
      : itemId === 'white_herb'
      ? '“Thứ thảo dược trắng này mọc sát tường hầm rượu nơi tro thánh rơi xuống. Giáo sĩ nào trúng độc chướng khí đều phải quỳ xin một nhúm...”'
      : itemId === 'oil_lamp'
      ? '“Chiếc đèn dầu đồng này vốn thuộc về đoàn thám hiểm Vực Sao. Dầu cháy lâu hơn bó đuốc thường gấp đôi — thứ duy nhất giữ ngươi không hóa điên trong bóng tối.”'
      : '“Món này lấy từ kho quân nhu bị niêm phong của Kỵ Đoàn cũ... Giờ chủ nhân chúng đều hóa xương trắng cả rồi.”';

  if (roll01 < 0.55) {
    const lowered = Math.max(2, Math.round(basePrice * 0.8));
    return {
      accepted: true,
      refusedItem: false,
      newPrice: lowered,
      dialogue: `${loreLine} “Ngươi biết thứ mình đang mua. Ta bớt còn ${lowered} Đồng Bạc.”`,
    };
  }
  return {
    accepted: false,
    refusedItem: false,
    newPrice: basePrice,
    dialogue: `${loreLine} “Đúng ${basePrice} Đồng Bạc. Không bớt một đồng.”`,
  };
}

