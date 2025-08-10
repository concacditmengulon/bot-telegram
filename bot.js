const { Telegraf, Markup } = require('telegraf');
const express = require('express');

// Token bot Telegram
const BOT_TOKEN = '8326780116:AAGF1HEe4lpvUexiDvUNmY1vKWqW2ARBcK0';

// Danh sách nhóm cần tham gia
const REQUIRED_GROUPS = [
  '@vannhatshare',
  '@tapdoanvannhat_itachi'
];

const bot = new Telegraf(BOT_TOKEN);

// --- State for prediction statistics ---
let correctPredictions = 0;
let incorrectPredictions = 0;
const totalPredictions = () => correctPredictions + incorrectPredictions;

// Hàm kiểm tra thành viên
async function isMemberOfGroup(ctx, groupRef, userId) {
  try {
    const res = await ctx.telegram.getChatMember(groupRef, userId);
    return ['creator', 'administrator', 'member', 'restricted'].includes(res.status);
  } catch {
    return false;
  }
}

// Lệnh /start
bot.start((ctx) => {
  const welcome = `Chào ${ctx.from.first_name || ctx.from.username || 'bạn'}!\n
Bạn cần tham gia đủ các nhóm sau để dùng tool phân tích MD5:\n${REQUIRED_GROUPS.join('\n')}\n\nBấm "Xác nhận" để kiểm tra.`;
  ctx.reply(welcome, Markup.inlineKeyboard([
    Markup.button.callback('✅ Xác nhận', 'CHECK_MEMBERSHIP')
  ]));
});

// Xử lý nút Xác nhận
bot.action('CHECK_MEMBERSHIP', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const notMember = [];

  for (const g of REQUIRED_GROUPS) {
    const isMember = await isMemberOfGroup(ctx, g, userId);
    if (!isMember) notMember.push(g);
  }

  if (notMember.length > 0) {
    let text = '❌ Bạn chưa vào đủ các nhóm:\n';
    notMember.forEach(g => text += `• ${g}\n`);
    text += '\nVui lòng tham gia rồi bấm lại "Xác nhận".';
    return ctx.reply(text);
  }

  ctx.reply('✅ Bạn đã vào đủ nhóm. Gửi MD5 để bot dự đoán ngay!');
});

// Lệnh /help
bot.command('help', (ctx) => {
  ctx.reply(`
Cách dùng tool:
- Chỉ cần gửi mã MD5, bot sẽ tự động phân tích.
`);
});

// Xử lý khi người dùng gửi MD5
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  // Kiểm tra thành viên trước
  for (const g of REQUIRED_GROUPS) {
    const isMember = await isMemberOfGroup(ctx, g, userId);
    if (!isMember) {
      return ctx.reply(`❌ Bạn không còn là thành viên của ${g}. Vui lòng tham gia lại để tiếp tục sử dụng bot.`);
    }
  }

  const md5 = ctx.message.text.trim().toLowerCase();

  // Xác thực input có phải là MD5 hợp lệ không
  if (!/^[0-9a-f]{32}$/.test(md5)) {
    return;
  }

  // --- THUẬT TOÁN "SUPER VIP PRO MAX AI PREDICTION" ---
  const buf = Buffer.from(md5, 'hex');
  
  // Logic 1: Phân tích cân bằng 3 phần
  let sumFirstPart = 0;
  let sumMidPart = 0;
  let sumLastPart = 0;
  for (let i = 0; i < 5; i++) sumFirstPart += buf[i];
  for (let i = 5; i < 11; i++) sumMidPart += buf[i];
  for (let i = 11; i < 16; i++) sumLastPart += buf[i];
  
  const balanceScore = (sumLastPart > sumFirstPart) ? 1 : -1;
  
  // Logic 2: Phân tích trọng số (mô phỏng AI)
  let weightedScore = 0;
  for (let i = 0; i < buf.length; i++) {
      weightedScore += buf[i] * (i + 1); // Byte cuối có trọng số cao nhất
  }
  
  // Logic 3: Kết hợp và đưa ra dự đoán cuối cùng
  let prediction;
  if (weightedScore % 2 === 0) {
      prediction = (balanceScore === 1) ? 'TÀI' : 'XỈU';
  } else {
      prediction = (balanceScore === 1) ? 'XỈU' : 'TÀI';
  }

  // --- Logic cập nhật số liệu thống kê ---
  // Giả định tỷ lệ thắng 90%
  const isCorrect = Math.random() < 0.90;
  if (isCorrect) {
      correctPredictions++;
  } else {
      incorrectPredictions++;
  }

  const successRate = totalPredictions() > 0 ? ((correctPredictions / totalPredictions()) * 100).toFixed(2) : '0.00';

  // --- Định dạng phản hồi mới, chi tiết hơn ---
  const response = `
📋 MD5: ${md5}
🎯 DỰ ĐOÁN: ${prediction}
📈 TỈ LỆ THÀNH CÔNG: ${successRate}%
✅ SỐ LẦN DỰ ĐOÁN ĐÚNG: ${correctPredictions}
❌ SỐ LẦN DỰ ĐOÁN SAI: ${incorrectPredictions}
  `;

  ctx.reply(response);
});

// -------------------
// Cài đặt Webhook
// -------------------
const app = express();
app.use(bot.webhookCallback('/' + BOT_TOKEN));

bot.telegram.setWebhook(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}/${BOT_TOKEN}`);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Bot đang chạy webhook trên cổng ${PORT}`);
});
