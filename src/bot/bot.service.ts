import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Bot, BotDocument } from "src/schema/bot.schema";
import TelegramBot from "node-telegram-bot-api";

interface UserSession {
  variant: number;
  questionIndex: number;
  correctAnswers: number;
  timer?: NodeJS.Timeout;
  messageId?: number;
}

@Injectable()
export class BotService {
  private bot: TelegramBot;
  private readonly teacheId: number = Number(process.env.TEACHER_ID as string);

  private sessions = new Map<number, UserSession>();

  private mathQuestions = {
    1: [
      // Oson
      { q: "7 * 8 = ?", a: "56" },
      { q: "81 / 9 = ?", a: "9" },
      { q: "12 + 15 = ?", a: "27" },
      { q: "45 - 18 = ?", a: "27" },
      { q: "100 - 37 = ?", a: "63" },
      { q: "15 * 3 = ?", a: "45" },
      { q: "64 / 8 = ?", a: "8" },
      { q: "12 + 88 = ?", a: "100" },
      { q: "55 - 22 = ?", a: "33" },
      { q: "9 * 6 = ?", a: "54" },
    ],
    2: [
      // Oson
      { q: "25 + 25 = ?", a: "50" },
      { q: "100 / 4 = ?", a: "25" },
      { q: "12 * 4 = ?", a: "48" },
      { q: "90 - 45 = ?", a: "45" },
      { q: "7 * 7 = ?", a: "49" },
      { q: "36 / 6 = ?", a: "6" },
      { q: "14 + 16 = ?", a: "30" },
      { q: "200 - 150 = ?", a: "50" },
      { q: "8 * 4 = ?", a: "32" },
      { q: "11 * 11 = ?", a: "121" },
    ],
    3: [
      // O'rta
      { q: "15 + 15 + 15 = ?", a: "45" },
      { q: "120 - 45 = ?", a: "75" },
      { q: "13 * 3 = ?", a: "39" },
      { q: "48 / 4 = ?", a: "12" },
      { q: "25 * 4 = ?", a: "100" },
      { q: "150 / 5 = ?", a: "30" },
      { q: "17 + 14 = ?", a: "31" },
      { q: "99 / 9 = ?", a: "11" },
      { q: "6 * 15 = ?", a: "90" },
      { q: "200 / 8 = ?", a: "25" },
    ],
    4: [
      // O'rta
      { q: "20 + 5 * 2 = ?", a: "30" },
      { q: "40 - 10 / 2 = ?", a: "35" },
      { q: "6 * 6 + 4 = ?", a: "40" },
      { q: "50 / 5 + 10 = ?", a: "20" },
      { q: "100 - 25 * 2 = ?", a: "50" },
      { q: "12 * 2 + 6 = ?", a: "30" },
      { q: "80 / 4 - 5 = ?", a: "15" },
      { q: "7 * 3 + 9 = ?", a: "30" },
      { q: "15 * 2 - 10 = ?", a: "20" },
      { q: "60 / 3 + 40 = ?", a: "60" },
    ],
    5: [
      // O'rta
      { q: "(10 + 5) * 2 = ?", a: "30" },
      { q: "100 / (10 + 10) = ?", a: "5" },
      { q: "3 * (12 - 4) = ?", a: "24" },
      { q: "(20 + 30) / 2 = ?", a: "25" },
      { q: "50 - (5 * 5) = ?", a: "25" },
      { q: "4 * (15 - 5) = ?", a: "40" },
      { q: "(80 - 20) / 6 = ?", a: "10" },
      { q: "2 * (25 + 25) = ?", a: "100" },
      { q: "90 / (3 * 3) = ?", a: "10" },
      { q: "(14 + 16) * 3 = ?", a: "90" },
    ],
    6: [
      // Qiyin
      { q: "125 + 125 = ?", a: "250" },
      { q: "500 - 150 = ?", a: "350" },
      { q: "12 * 12 = ?", a: "144" },
      { q: "625 / 5 = ?", a: "125" },
      { q: "150 * 2 - 50 = ?", a: "250" },
      { q: "300 / 12 = ?", a: "25" },
      { q: "18 * 5 = ?", a: "90" },
      { q: "450 / 9 = ?", a: "50" },
      { q: "11 * 12 = ?", a: "132" },
      { q: "1000 / 25 = ?", a: "40" },
    ],
    7: [
      // Qiyin
      { q: "2^2 + 3^2 = ?", a: "13" },
      { q: "5^2 - 10 = ?", a: "15" },
      { q: "4^2 * 2 = ?", a: "32" },
      { q: "10^2 / 4 = ?", a: "25" },
      { q: "6^2 + 4 = ?", a: "40" },
      { q: "3^3 = ?", a: "27" },
      { q: "8^2 - 14 = ?", a: "50" },
      { q: "1^2 + 2^2 + 3^2 = ?", a: "14" },
      { q: "7^2 + 1 = ?", a: "50" },
      { q: "9^2 - 1 = ?", a: "80" },
    ],
    8: [
      // Murakkab
      { q: "2 * (15 + 5^2) = ?", a: "80" },
      { q: "(100 - 40) / 12 = ?", a: "5" },
      { q: "4^2 + 5 * 6 = ?", a: "46" },
      { q: "120 / (2 * 3) + 10 = ?", a: "30" },
      { q: "3 * 3 * 3 - 7 = ?", a: "20" },
      { q: "50 + 50 / 2 - 10 = ?", a: "65" },
      { q: "144 / 12 + 8 = ?", a: "20" },
      { q: "(20 - 5) * (10 / 2) = ?", a: "75" },
      { q: "10^2 - 9^2 = ?", a: "19" },
      { q: "2^5 = ?", a: "32" },
    ],
    9: [
      // Murakkab
      { q: "25 * 5 - 25 = ?", a: "100" },
      { q: "900 / 30 = ?", a: "30" },
      { q: "15 * 4 + 15 * 2 = ?", a: "90" },
      { q: "200 / 4 - 25 = ?", a: "25" },
      { q: "13 * 4 = ?", a: "52" },
      { q: "16 * 5 = ?", a: "80" },
      { q: "75 * 2 + 50 = ?", a: "200" },
      { q: "180 / 6 * 2 = ?", a: "60" },
      { q: "22 * 3 = ?", a: "66" },
      { q: "400 / 8 + 50 = ?", a: "100" },
    ],
    10: [
      // Ekspert
      { q: "((10 + 5) * 2) + 20 = ?", a: "50" },
      { q: "12^2 - 44 = ?", a: "100" },
      { q: "3^4 = ?", a: "81" },
      { q: "(50 * 2) / (10 / 2) = ?", a: "20" },
      { q: "2 * (3^2 + 1) = ?", a: "20" },
      { q: "150 / (15 + 10) = ?", a: "6" },
      { q: "7 * 8 + 4^2 = ?", a: "72" },
      { q: "10^3 / 100 = ?", a: "10" },
      { q: "(100 - 1) / 9 = ?", a: "11" },
      { q: "2^6 = ?", a: "64" },
    ],
  };

  constructor(@InjectModel(Bot.name) private botModel: Model<BotDocument>) {
    this.bot = new TelegramBot(process.env.BOT_TOKEN as string, { polling: true });

    this.bot.setMyCommands([
      { command: "/start", description: "Botdan ro'yxatdan o'tish" },
      { command: "/commands", description: "Tugmalarni ko'rish" },
    ]);

    this.initHandlers();
  }

  // ---TAYMER---
  private async startVisualTimer(chatId: number, timeLeft: number) {
    const session = this.sessions.get(chatId);
    if (!session || !session.messageId) return;

    if (timeLeft > 0) {
      session.timer = setTimeout(async () => {
        const nextTime = timeLeft - 1;
        try {
          await this.bot.editMessageReplyMarkup(
            {
              inline_keyboard: [[{ text: `⏰ Qolgan vaqt: ${nextTime}s`, callback_data: "none" }]],
            },
            { chat_id: chatId, message_id: session.messageId },
          );

          this.startVisualTimer(chatId, nextTime);
        } catch (e) {
          if (session.timer) clearTimeout(session.timer);
        }
      }, 1000);
    } else {
      await this.bot.sendMessage(chatId, "⏰ **Vaqt tugadi!**");
      this.handleTestLogic(chatId, "");
    }
  }

  private async handleTestLogic(chatId: number, userMessage: string) {
    const session = this.sessions.get(chatId);
    if (!session) return;

    if (session.timer) clearTimeout(session.timer);

    const variantQuestions = this.mathQuestions[session.variant];
    const currentQ = variantQuestions[session.questionIndex];

    if (userMessage.trim() === currentQ.a) {
      session.correctAnswers++;
    }

    session.questionIndex++;

    if (session.questionIndex < variantQuestions.length) {
      const nextIdx = session.questionIndex;
      const nextQ = variantQuestions[nextIdx].q;

      const sentMsg = await this.bot.sendMessage(chatId, `${nextIdx + 1}-savol: ${nextQ}`, {
        reply_markup: {
          inline_keyboard: [[{ text: `⏰ Qolgan vaqt: 20s`, callback_data: "none" }]],
        },
      });

      session.messageId = sentMsg.message_id;
      this.startVisualTimer(chatId, 20);
    } else {
      const total = variantQuestions.length;
      const correct = session.correctAnswers;
      const accuracy = (correct / total) * 100;

      const result = `🏁 **Test yakunlandi!**\n\n✅ To'g'ri: ${correct}/${total}\n🎯 Aniqlik: ${accuracy}%\n\nQaytadan boshlash uchun /commands bosing.`;
      this.sessions.delete(chatId);
      await this.bot.sendMessage(chatId, result, { parse_mode: "Markdown" });
    }
  }

  private initHandlers() {
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.from?.id as number;
      if (chatId === this.teacheId) await this.bot.sendMessage(chatId, "Siz ustoz sifatida belgilangansiz.");

      const foundUser = await this.botModel.findOne({ chatId });
      if (!foundUser) {
        await this.botModel.create({ name: msg.from?.first_name || "unknown", chatId });
        await this.bot.sendMessage(chatId, "Botdan foydalanishingiz mumkin.");
        return this.bot.sendMessage(this.teacheId, `Yangi foydalanuvchi: ${msg.from?.first_name}`);
      }
      await this.bot.sendMessage(chatId, "Siz botdan oldin ro'yxatdan o'tgansiz.");
    });

    this.bot.on("message", async (msg) => {
      const chatId = msg.from?.id as number;
      if (!chatId || !msg.text) return;

      const session = this.sessions.get(chatId);

      // 1. BUYRUQLAR
      if (msg.text === "/commands") {
        const buttons: any[][] = [
          [
            { text: "Kontakt ulashish", request_contact: true },
            { text: "Lokatsiya ulashish", request_location: true },
          ],
          [{ text: "Matematik savollar" }],
        ];
        if (chatId === this.teacheId) buttons.push([{ text: "Jami foydalanuvchilarni ko'rish" }]);

        return this.bot.sendMessage(chatId, "Amalni tanlang:", {
          reply_markup: { keyboard: buttons, resize_keyboard: true, one_time_keyboard: true },
        });
      }

      if (msg.text === "Matematik savollar") {
        return this.bot.sendMessage(chatId, "Variantni tanlang:", {
          reply_markup: {
            keyboard: [
              [{ text: "1-Variant" }, { text: "2-Variant" }],
              [{ text: "3-Variant" }, { text: "4-Variant" }],
              [{ text: "5-Variant" }, { text: "6-Variant" }],
              [{ text: "7-Variant" }, { text: "8-Variant" }],
              [{ text: "9-Variant" }, { text: "10-Variant" }],
            ],
            resize_keyboard: true,
          },
        });
      }

      if (msg.text.includes("-Variant")) {
        const varNum = parseInt(msg.text.split("-")[0]);
        if (isNaN(varNum) || !this.mathQuestions[varNum]) return;

        const firstQ = this.mathQuestions[varNum][0].q;

        const sentMsg = await this.bot.sendMessage(chatId, `🚀 Test boshlandi!\n\n1-savol: ${firstQ}`, {
          reply_markup: {
            inline_keyboard: [[{ text: `⏰ Qolgan vaqt: 20s`, callback_data: "none" }]],
          },
        });

        this.sessions.set(chatId, {
          variant: varNum,
          questionIndex: 0,
          correctAnswers: 0,
          messageId: sentMsg.message_id,
        });

        return this.startVisualTimer(chatId, 20);
      }

      // 2. TEST JAVOBI
      if (session && !msg.text.startsWith("/")) {
        return this.handleTestLogic(chatId, msg.text);
      }

      // 3. Statistika, kontakt, lokatsiya va chat
      if (msg.text === "Jami foydalanuvchilarni ko'rish" && chatId === this.teacheId) {
        const users = await this.botModel.find({});
        let report = `📊 Jami a'zolar: ${users.length}\n\n`;
        users.forEach((u) => (report += `\`${u.chatId}\` - ${u.name}\n`));
        return this.bot.sendMessage(chatId, report || "Bo'sh", { parse_mode: "Markdown" });
      }

      if (msg.contact) {
        await this.bot.sendContact(this.teacheId, msg.contact.phone_number, msg.contact.first_name);
        return this.bot.sendMessage(this.teacheId, `${chatId}-${msg.from?.first_name} kontakt yubordi.`);
      }

      if (msg.location) {
        await this.bot.sendLocation(this.teacheId, msg.location.latitude, msg.location.longitude);
        return this.bot.sendMessage(this.teacheId, `${chatId}-${msg.from?.first_name} lokatsiya yubordi.`);
      }

      if (msg.text && !msg.text.startsWith("/")) {
        if (chatId !== this.teacheId) {
          this.bot.sendMessage(this.teacheId, `${chatId}-${msg.from?.first_name}:\n${msg.text}`);
        }
        if (chatId === this.teacheId && msg.reply_to_message) {
          const studentId = parseInt(msg.reply_to_message.text?.split("-")[0] as string);
          if (!isNaN(studentId)) this.bot.sendMessage(studentId, msg.text);
        }
      }
    });
  }
}