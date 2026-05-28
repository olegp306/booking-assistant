import "dotenv/config";
import { createTelegramBot } from "./bot/telegram.js";
import { createServer } from "./http/server.js";
import { LocalCrmExporter } from "./integrations/crm.js";
import { createDatabase } from "./storage/database.js";
import { parseSuperAdminIds } from "./domain/roles.js";

const port = Number(process.env.PORT ?? 3000);
const database = createDatabase(process.env.DATABASE_PATH ?? "slotly-ai.sqlite");
const crm = new LocalCrmExporter();
const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "slotly_ai_bot";
const superAdminTelegramIds = parseSuperAdminIds(process.env.SUPER_ADMIN_TELEGRAM_IDS);
const app = createServer({ database, crm, botUsername, superAdminTelegramIds });

app.listen(port, () => {
  console.log(`Slotly AI admin is running at http://localhost:${port}`);
});

if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = createTelegramBot({ token: process.env.TELEGRAM_BOT_TOKEN, database, crm, superAdminTelegramIds });
  void bot.launch().then(() => {
    console.log("Telegram bot is running.");
  });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
} else {
  console.log("TELEGRAM_BOT_TOKEN is not set; running admin/API only.");
}
