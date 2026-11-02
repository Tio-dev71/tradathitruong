import type { PlayerRole } from '../../types/game';

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  options?: { label: string; nextId: string }[];
}

export const NPC_ACCEPT_QUOTES: string[] = [
  'Thôi được rồi, hôm nay thấy cháu cũng có duyên với chén trà. Để cô soi cho một tí.',
  'Từ từ nhé, kèo không chạy mất, chỉ có tài khoản cháu chạy thôi! Đợi cô mở sổ.',
  'Được, cô mở sổ ra xem. Nhưng nhớ quản lý vốn đấy, đừng all-in như tuần trước!',
  'Thấy mặt mũi sáng sủa nhưng chắc vừa bị stop-loss quét? Đây, cô cho một kèo tham khảo.',
  'Uống ngụm trà cho ấm bụng đã. Kèo này cô chấm điểm 8/10, nhớ cài SL kẻo cháy tài khoản.',
  'Trời hôm nay nắng đẹp, nến cũng đang xanh mơn mởn. Cô tặng cháu một tín hiệu demo lướt sóng.',
  'Cô soi kính lúp thấy nến 1H đang có tín hiệu đảo chiều. Vào xem sổ tay của cô này.',
  'Cá mập đang bơi lượn ngoài kia, cháu lướt nhẹ theo sóng thôi nhé. Kèo đây!',
  'Cô pha xong ấm trà mới rồi. Lại đây cô chỉ cho một điểm entry hợp lý.',
  'Kèo này thơm như trà lài, nhưng nhớ chia lệnh ra mà đi, đừng cắm cả sổ đỏ!',
];

export const NPC_REJECT_QUOTES: string[] = [
  'Hôm nay cô không cho kèo, cô cho cháu lời khuyên: giữ tiền trước đã!',
  'Thôi cháu ơi, nến hôm nay nhìn như điện tâm đồ, cô xin phép nghỉ bán kèo!',
  'Không có kèo đâu, uống cốc trà đá đi cho mát cái đầu rồi tính tiếp.',
  'Cô đã bảo đừng FOMO, ngồi xuống ăn hạt hướng dương ngắm thiên hạ gồng lỗ với cô.',
  'Thị trường đang đi ngang như cua bò, vào lệnh chỉ cúng phí sàn. Uống nước đi!',
  'Cháu nhìn mắt cô có giống máy in tiền không? Hôm nay bảo toàn vốn là thắng rồi!',
  'Cô vừa thấy cá voi quét râu hai đầu, cháu chui vào là thành tép riu ngay. Nghỉ đi!',
  'Kèo cọt gì tầm này, về ăn cơm mẹ nấu đi cháu, nến đỏ lòm thế kia cơ mà.',
  'Đừng vội, kiên nhẫn cũng là một vị thế. Chén trà này cô đãi, không soi kèo!',
  'Cô soi rồi mà thấy thần may mắn hôm nay đi vắng, tốt nhất ngồi yên giữ tiền.',
];

export const GENERAL_DIALOGUES: Record<string, string[]> = {
  market_status: [
    'Hôm nay thị trường đỏ lửa như ấm nước sôi của cô, các chiến thần đu đỉnh đang xếp hàng ngoài kia kìa.',
    'Sóng êm biển lặng nhưng coi chừng bão ngầm. Nến sideway lâu quá dễ có cú giật quét thanh khoản lắm đấy.',
    'Thị trường hôm nay như thời tiết Hà Nội đầu đông: sáng nắng chiều mưa, trưa sideway khó lường.',
    'Thanh khoản hôm nay hẻo lánh như ngõ vắng lúc 2 giờ trưa, tốt nhất là ngồi nhâm nhi trà đá đợi xu hướng rõ ràng.',
    'Phe bò phe gấu đang húc nhau túi bụi ở mốc cản, cháu đứng ngoài xem kịch hay hơn vào đu!',
    'Hôm nay cô thấy Volume giảm dần, nến Doji liên tục. Thị trường đang phân vân như cháu lúc chọn trà đá hay nhân trần vậy.',
    'Chỉ số tham lam và sợ hãi hôm nay đang chạm đáy, nhưng đáy của hôm nay có khi là đỉnh của ngày mai đấy cháu ơi!',
    'Các hội nhóm đang hô hào bắt đáy rầm rộ, theo kinh nghiệm bán nước 20 năm của cô thì đấy là lúc nên cẩn thận nhất.',
  ],
  tea_order: [
    'Có ngay! Trà đá đậm vị, ít đá nhiều trà, giải nhiệt cơn khát sau cú cháy tài khoản nhé!',
    'Đây, cốc trà đá mát lạnh kèm đĩa hướng dương giòn rụm. Vừa cắn hạt vừa soi chart cho bình tâm.',
    'Trà đá 5k, nhưng bài học cắt lỗ của cháu thì đáng giá tiền tỷ đấy nhé. Uống từ từ thôi!',
    'Trà này cô ủ bằng sương sớm đỉnh đồi, uống vào tâm tịnh như nến tuần không râu.',
    'Một ly trà đá đậm đà! Uống xong nhớ hít một hơi thật sâu, đừng nhìn bảng điện tử 1 phút nữa.',
    'Trà xanh mát lành giải độc tâm lý FOMO. Cô thêm cho cháu hai viên đá lạnh ngắt cho tỉnh người!',
  ],
  stories: [
    'Hôm qua có cậu vác 3 màn hình ra quán cô ngồi bấm lia lịa, lát sau thấy gục xuống bàn thở dài: "Cô ơi cho cháu xin nợ tiền trà!".',
    'Chuyện trader ấy à? Nhiều người lúc thắng thì đòi bao cả quán, lúc gồng lỗ thì điếu cày cũng chẳng buồn rít.',
    'Có anh chàng kia tự xưng "Chiến thần bắt đáy", bắt đúng 4 cái dao rơi liên tiếp, giờ đang phụ cô rửa cốc trà chén đĩa đây này.',
    'Thị trường này lạ lắm, 95% người đến đây đều mơ biệt thự xe sang, nhưng cuối cùng chỉ ước về bờ để uống cốc trà đá thanh thản.',
    'Cô nhớ năm ngoái có bác tóc bạc ngồi góc kia, đánh đúng một lệnh chuẩn chỉ rồi nghỉ cả năm du lịch, đấy mới là cao thủ!',
    'Cậu thanh niên tuần trước khoe lãi X10 tài khoản, cô bảo chốt đi thì không nghe, giờ lại ra đây ngồi cắn hướng dương than thở.',
  ],
  sitting_chill: [
    'Ừ, ngồi xuống ghế nhựa đi cháu. Gió mát dưới bóng đa, ngắm mây trôi hơn là ngắm nến đỏ.',
    'Cứ ngồi tự nhiên, quán cô không thu phí ngồi hóng chuyện đâu. Lúc nào rảnh thì gọi cốc trà.',
    'Người khôn ngoan là người biết lúc nào nên vào lệnh, lúc nào nên ngồi im uống trà ngắm cảnh.',
    'Ngồi hóng cũng tốt, học từ sai lầm của người khác là cách đầu tư không tốn học phí nhất đấy.',
    'Dưới bóng cây đa này râm mát lắm, tâm không động thì sóng gió thị trường chẳng làm gì được cháu đâu.',
  ],
  role_greetings: [
    'Chào {role} {name}! Lại ra góc quen ngồi ngắm bảng điện tử à?',
    'Ơ kìa {role} {name}, hôm nay sắc mặt hồng hào thế, chắc vừa chốt lời đúng đỉnh hả?',
    'Ngồi xuống đây {name}! {role} gì mà trông bồn chồn thế kia, nến chưa đóng mà tim đã đập loạn nhịp rồi à?',
    'Kính chào {role} danh bất hư truyền! Quán cô hôm nay hân hạnh đón tiếp một cao thủ ghé chơi.',
    'Lại đây {name}, để cô rót cho chén trà giải tỏa áp lực của một {role} chân chính nhé.',
  ],
};

export class DialogueService {
  public getRandomLine(list: string[]): string {
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }

  public getGreeting(name: string, role: PlayerRole): string {
    const template = this.getRandomLine(GENERAL_DIALOGUES.role_greetings);
    return template.replace('{name}', name).replace('{role}', role);
  }

  public getMarketComment(): string {
    return this.getRandomLine(GENERAL_DIALOGUES.market_status);
  }

  public getTeaOrderResponse(): string {
    return this.getRandomLine(GENERAL_DIALOGUES.tea_order);
  }

  public getTraderStory(): string {
    return this.getRandomLine(GENERAL_DIALOGUES.stories);
  }

  public getChillComment(): string {
    return this.getRandomLine(GENERAL_DIALOGUES.sitting_chill);
  }

  public getSignalAcceptQuote(): string {
    return this.getRandomLine(NPC_ACCEPT_QUOTES);
  }

  public getSignalRejectQuote(): string {
    return this.getRandomLine(NPC_REJECT_QUOTES);
  }
}

export const dialogueService = new DialogueService();
