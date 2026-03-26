import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ExpenseService } from '../expense/expense.service';
import { ZaloBotListener } from './zalo-bot.listener';
import { BOT_NAMES, BOT_PLATFORM } from '../../common/constants/platform.constant';
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
    this.logger.log('🔄 Đang kiểm tra và khôi phục session cho bot ZALO từ Database...');
    const dbBots = await this.prisma.bot.findMany({
      where: { platform: BOT_PLATFORM.ZALO, isActive: true },
    });
    
    const botsToRestore = dbBots.filter((b) => b.sessionData !== null);

    if (botsToRestore.length === 0) {
      this.logger.log('ℹ️ Không có Bot ZALO nào cần khôi phục.');
      return;
    }

    this.logger.log(`⏳ Tìm thấy ${botsToRestore.length} Bot ZALO đang active. Bắt đầu đăng nhập...`);

    for (const bot of botsToRestore) {
      await this.loginFromDbSession(bot.id, bot.name, bot.sessionData);
    }
  }

  async generateQRCodeAndSaveToDb(botName = BOT_NAMES.ZALO_DEFAULT) {
    try {
      this.logger.log(`📢 Đang tạo mã QR mới cho ${botName}...`);
      const zalo = new Zalo({ selfListen: false, checkUpdate: true, logging: true });
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
          platform: BOT_PLATFORM.ZALO,
          sessionData: sessionData as any,
          isActive: true,
        },
      });

      this.logger.log(`✅ Đăng nhập QR thành công cho Bot: ${bot.name} (ID: ${bot.id})`);
      this.zaloInstances[bot.id] = api;
      
      // Sử dụng listener chuyên biệt
      await this.zaloBotListener.listen(bot.id, api);

      return { success: true, botId: bot.id, message: 'Đăng nhập Zalo thành công' };
    } catch (error: any) {
      this.logger.error(`❌ Lỗi tạo QR Zalo: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async loginFromDbSession(botId: string, botName: string, credentials: any) {
    try {
      const { cookie, imei, userAgent } = credentials;
      const zalo = new Zalo({ selfListen: false, checkUpdate: false, logging: false });
      const api = await zalo.login({ cookie, imei, userAgent });

      if (typeof api.getContext === 'function') {
        this.logger.log(`🚀 Khôi phục thành công ZALO Bot: ${botName} (ID: ${botId})`);
        this.zaloInstances[botId] = api;
        
        // Khởi động listener sau khi login thành công bằng session
        await this.zaloBotListener.listen(botId, api);
      }
    } catch (error: any) {
      this.logger.error(`⚠️ Không thể khôi phục ZALO Bot: ${botName} (ID: ${botId}). Lỗi: ${error.message}`);
      // Nếu lỗi do session hết hạn, ta nên đánh dấu bot là inactive
      await this.prisma.bot.update({ where: { id: botId }, data: { isActive: false } });
    }
  }

  async sendMessage(toId: string, message: string) {
    const botIds = Object.keys(this.zaloInstances);
    if (botIds.length > 0) {
      const api = this.zaloInstances[botIds[0]];
      await api.sendMessage({ msg: message }, toId, 0);
    }
  }
}
