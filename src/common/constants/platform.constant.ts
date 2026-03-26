import { Platform } from '@prisma/client';

export const BOT_PLATFORM = {
  ZALO: Platform.ZALO,
  TELEGRAM: Platform.TELEGRAM,
} as const;

export const BOT_NAMES = {
  ZALO_DEFAULT: 'Zalo Personal Bot',
  TELEGRAM_DEFAULT: 'Telegram Personal Bot',
} as const;

export const USER_DISPLAY_NAMES = {
  ZALO_USER: 'Zalo User',
  TELEGRAM_USER: 'Telegram User',
} as const;
