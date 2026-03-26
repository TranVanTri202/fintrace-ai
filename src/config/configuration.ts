export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  bot: {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    zaloToken: process.env.ZALO_ACCESS_TOKEN,
  },
});
