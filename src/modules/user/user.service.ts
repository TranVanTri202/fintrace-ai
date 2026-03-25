import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Platform, User } from '@prisma/client';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateUserByPlatform(platformId: string, platform: Platform, fullName?: string): Promise<User> {
    let user = await this.prisma.user.findFirst({
      where: platform === 'TELEGRAM' ? { telegramId: platformId } : { zaloId: platformId },
    });

    if (!user) {
      this.logger.log(`Tạo người dùng mới cho nền tảng ${platform} với ID ${platformId}`);
      user = await this.prisma.user.create({
        data: {
          telegramId: platform === 'TELEGRAM' ? platformId : null,
          zaloId: platform === 'ZALO' ? platformId : null,
          fullName,
        },
      });
    }

    return user;
  }
}
