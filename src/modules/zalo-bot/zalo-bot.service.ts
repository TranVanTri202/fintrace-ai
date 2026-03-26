import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ExpenseService } from '../expense/expense.service';
import { ZaloBotListener } from './zalo-bot.listener';
// zca-js không có TypeScript types mặc định, dùng require
const { Zalo } = require('zca-js');

@Injectable()
export class ZaloBotService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ZaloBotService.name);
  private zaloInstances: Record<string, any> = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly expenseService: ExpenseService,
    private readonly zaloBotListener: ZaloBotListener,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Đang khôi phục (restore) session cho bot ZALO từ Database...');
    const dbBots = await this.prisma.bot.findMany({
      where: { platform: 'ZALO', isActive: true },
    });
    const bots = dbBots.filter((b) => b.sessionData !== null);

    for (const bot of bots) {
      if (bot.sessionData) {
        await this.loginFromDbSession(bot.id, bot.sessionData);
      }
    }
  }

  async generateQRCodeAndSaveToDb(botName = 'Zalo Personal Bot') {
    try {
      this.logger.log(`📢 Đang tạo mã QR mới cho ${botName}...`);
      const zalo = new Zalo({ selfListen: true, checkUpdate: true, logging: true });
      const api = await zalo.loginQR();

      const { uid, imei, cookie, userAgent } = api.getContext();

      const sessionData = {
        cookie: cookie.toJSON()?.cookies || cookie,
        imei,
        userAgent,
      };

      const bot = await this.prisma.bot.create({
        data: {
          name: botName,
          platform: 'ZALO',
          sessionData: sessionData as any,
          isActive: true,
        },
      });

      this.logger.log(`✅ Đăng nhập QR thành công cho Bot ID: ${bot.id}`);
      this.zaloInstances[bot.id] = api;
      
      // Sử dụng listener chuyên biệt
      await this.zaloBotListener.listen(bot.id, api);

      return { success: true, botId: bot.id, message: 'Đăng nhập Zalo thành công' };
    } catch (error: any) {
      this.logger.error(`❌ Lỗi tạo QR Zalo: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async loginFromDbSession(botId: string, credentials: any) {
    try {
      const { cookie, imei, userAgent } = credentials;
      const zalo = new Zalo({ selfListen: true, checkUpdate: false, logging: false });
      const api = await zalo.login({ cookie, imei, userAgent });

      if (typeof api.getContext === 'function') {
        this.logger.log(`✅ Khôi phục thành công ZALO Bot: ${botId}`);
        this.zaloInstances[botId] = api;
        
        // Khởi động listener sau khi login thành công bằng session
        await this.zaloBotListener.listen(botId, api);
      }
    } catch (error: any) {
      this.logger.error(`❌ Lỗi khôi phục Bot ${botId}: ${error.message}`);
      await this.prisma.bot.update({ where: { id: botId }, data: { isActive: false } });
    }
  }

  async sendMessage(toId: string, message: string) {
    const botIds = Object.keys(this.zaloInstances);
    if (botIds.length > 0) {
      const api = this.zaloInstances[botIds[0]];
      await api.sendMessage({ body: message }, toId);
    }
  }
}
