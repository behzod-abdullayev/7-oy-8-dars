import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Product, ProductDocument } from "src/schema/product.schema";
import TelegramBot from "node-telegram-bot-api";

@Injectable()
export class ProductService implements OnModuleInit {
  private bot: TelegramBot;
  private userCarts: Map<number, { title: string; price: number }[]> = new Map();

  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {

    this.bot = new TelegramBot(process.env.BOT_TOKEN as string, { polling: true });
  }

  async onModuleInit() {
    await this.seedDatabase();
    this.initializeBotListeners();
  }

  private initializeBotListeners() {

    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.productModel.findOneAndUpdate(
        { chatId },
        { lastState: "waiting_contact", first_name: msg.from?.first_name },
        { upsert: true }
      );

      this.bot.sendMessage(chatId, "Xush kelibsiz! Botdan foydalanish uchun telefon raqamingizni yuboring:", {
        reply_markup: {
          keyboard: [[{ text: "📞 Kontaktni yuborish", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    });

    // 2. Kontakt 
    this.bot.on('contact', async (msg) => {
      const chatId = msg.chat.id;
      await this.productModel.findOneAndUpdate({ chatId }, { 
        phoneNumber: msg.contact?.phone_number,
        lastState: 'waiting_location' 
      });

      this.bot.sendMessage(chatId, "Endi lokatsiyangizni yuboring:", {
        reply_markup: {
          keyboard: [[{ text: "📍 Lokatsiyani yuborish", request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    });

    // 3. Lokatsiya
    this.bot.on('location', async (msg) => {
      const chatId = msg.chat.id;
      await this.productModel.findOneAndUpdate({ chatId }, { 
        location: { lat: msg.location?.latitude, lng: msg.location?.longitude },
        lastState: 'main_menu' 
      });

      this.showMainMenu(chatId);
    });

    // 4. Xabarlarni qayta ishlash (Kategoriyalar va Savatcha)
    this.bot.on('message', async (msg) => {
      if (!msg.text || msg.text.startsWith('/')) return;
      
      const chatId = msg.chat.id;
      const text = msg.text;

      const categoryMap: Record<string, string> = {
        '🥤 Ichimliklar': 'drinks',
        '🍔 Yeguliklar': 'foods',
        '🍰 Shirinliklar': 'sweets'
      };

      if (categoryMap[text]) {
        await this.sendProductsByCategory(chatId, categoryMap[text]);
      } else if (text === '🛒 Savatcha') {
        this.showCart(chatId);
      }
    });

    // 5. Sotib olish va Tasdiqlash tugmalari
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id;
      const data = query.data;
      if (!chatId || !data) return;

      if (data.startsWith('buy_')) {
        const prodId = data.split('_')[1];
        const product = await this.productModel.findById(prodId);
        if (product) {
          const cart = this.userCarts.get(chatId) || [];
          cart.push({ title: product.title, price: product.price });
          this.userCarts.set(chatId, cart);
          this.bot.answerCallbackQuery(query.id, { text: "Savatchaga qo'shildi! ✅" });
        }
      }

      if (data === 'confirm_order') {
        await this.bot.sendMessage(chatId, "Buyurtmangiz qabul qilindi! Operatorlarimiz bog'lanishadi. ✅");
        this.userCarts.delete(chatId);
        this.showMainMenu(chatId);
      }
    });
  }

  private async sendProductsByCategory(chatId: number, category: string) {
    const products = await this.productModel.find({ category });
    
    if (products.length === 0) {
      return this.bot.sendMessage(chatId, "Hozircha bu bo'limda mahsulot yo'q.");
    }

    for (const prod of products) {
      const caption = `<b>${prod.title}</b>\n\n📜 ${prod.description}\n💰 Narxi: ${prod.price?.toLocaleString()} so'm`;
      
      await this.bot.sendPhoto(chatId, prod.imageUrl, {
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: "Sotib olish 🛒", callback_data: `buy_${prod._id}` }]]
        }
      }).catch(() => {
        this.bot.sendMessage(chatId, caption, { 
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: "Sotib olish 🛒", callback_data: `buy_${prod._id}` }]]
            }
        });
      });
    }
  }

  private showMainMenu(chatId: number) {
    this.bot.sendMessage(chatId, "Menyudan tanlang:", {
      reply_markup: {
        keyboard: [
          [{ text: "🥤 Ichimliklar" }, { text: "🍔 Yeguliklar" }],
          [{ text: "🍰 Shirinliklar" }],
          [{ text: "🛒 Savatcha" }]
        ],
        resize_keyboard: true,
      },
    });
  }

  private showCart(chatId: number) {
    const cart = this.userCarts.get(chatId) || [];
    if (cart.length === 0) {
      return this.bot.sendMessage(chatId, "Sizning savatchangiz bo'sh.");
    }

    let total = 0;
    let response = "🛒 <b>Sizning savatchangiz:</b>\n\n";
    cart.forEach((item, i) => {
      response += `${i + 1}. ${item.title} - ${item.price.toLocaleString()} so'm\n`;
      total += item.price;
    });
    response += `\n💰 <b>Jami: ${total.toLocaleString()} so'm</b>`;

    this.bot.sendMessage(chatId, response, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: "Buyurtmani tasdiqlash ✅", callback_data: 'confirm_order' }]]
      }
    });
  }

  private async seedDatabase() {

    // await this.productModel.deleteMany({});
    const count = await this.productModel.countDocuments({ category: { $exists: true } });
    if (count > 0) return;

    const data = [
    //  ICHIMLIKLAR
    { title: "Coca-Cola 1.5L", price: 14000, category: "drinks", description: "Muzdek ichimlik", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSywE3TX4dIhIDJkR_ZKoROup2GwX1O0HzsrA&s" },
    { title: "Pepsi 1.5L", price: 13500, category: "drinks", description: "Chanqoqbosti Pepsi", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ90pBhti56F0VEPpu1A3ItikhKxbPFVUwxqA&s" },
    { title: "Fanta 1.5L", price: 14000, category: "drinks", description: "Apelsinli shirin suv", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2CGmQZrs94JTYobQToK08VDbjxGhbspApLQ&s" },
    { title: "Nestle Suv 0.5L", price: 3000, category: "drinks", description: "Gazsiz toza suv", imageUrl: "https://shop.tegen.uz/wp-content/uploads/2021/05/imgonline-com-ua-Resize-a1Qdrw1NxWN9Cp.jpg" },
    { title: "Fuse Tea", price: 9000, category: "drinks", description: "Muzli choy", imageUrl: "https://ir.ozone.ru/s3/multimedia-1-l/7247743005.jpg" },
    { title: "Sharbat (Sok)", price: 12000, category: "drinks", description: "Tabiiy meva sharbati", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4sPnqnfzjBGaPDvkZqTYSEvNqjrMQixrfvw&s" },

    //  YEGULIKLAR
    { title: "Gamburger", price: 28000, category: "foods", description: "Issiq burger", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQuDfL3jtIrlPQzCmvRwmZeN93TWtq8zl3Ytg&s" },
    { title: "Chizburger", price: 32000, category: "foods", description: "Pishloqli burger", imageUrl: "https://yukber.uz/image/cache/catalog/product_1314_280821341-700x700.png" },
    { title: "Lavash Standart", price: 30000, category: "foods", description: "Go'shtli lavash", imageUrl: "https://imageproxy.wolt.com/assets/67335f1db248216911b35a6f" },
    { title: "Donar", price: 25000, category: "foods", description: "Turkcha donar kaba", imageUrl: "https://avatars.mds.yandex.net/get-eda/3534679/a3a19c9f7ea94d1b8bcf5eaa82a3a0fa/M_height" },
    { title: "Hot-dog", price: 15000, category: "foods", description: "Sosiskali bulochka", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHeLkcqgOn3kYqsOfP0m7pfCNh2OOQXuL4hg&s" },
    { title: "Fri Kartoshkasi", price: 12000, category: "foods", description: "Qisir-qisir fri", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzkAEOloDj35YrrvZT0DQ39mVwEtqWBCRtiQ&s" },

    // SHIRINLIKLAR 
    { title: "Medovik", price: 18000, category: "sweets", description: "Asalli tort", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRh0S-ChWgiNZb8z2pslLW6RlP3f5zZlTYSXQ&s" },
    { title: "Cheesecake", price: 22000, category: "sweets", description: "Pishloqli desert", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpS6yaJcvttjlTPYohqV_7Kgc-WjBUwY8iYw&s" },
    { title: "Napoleon", price: 17000, category: "sweets", description: "Qatlamli shirinlik", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdueZ0aqD4qWRoGGU9sb2z-c8GZIBFoT7oxg&s" },
    { title: "Donat", price: 10000, category: "sweets", description: "Shokoladli ponchik", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3HM_FC6rXHZX1S_Xa__2CCR88I_2CZXC4-g&s" },
    { title: "Muzqaymoq", price: 15000, category: "sweets", description: "3 xil sharikli", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Ice_cream_with_whipped_cream%2C_chocolate_syrup%2C_and_a_wafer_%28cropped%29.jpg/250px-Ice_cream_with_whipped_cream%2C_chocolate_syrup%2C_and_a_wafer_%28cropped%29.jpg" },
    { title: "Pahlava", price: 20000, category: "sweets", description: "Sharqona shirinlik", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpym9zZpbckEpjgVMm91qiv6CbYUfmqpoqKA&s" }
  ];

    await this.productModel.insertMany(data);
    console.log("Mahsulotlar yuklandi! ✅");
  }
}