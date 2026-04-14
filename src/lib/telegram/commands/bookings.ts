import { telegramBackendApi } from "../backendApi";
import type { TelegramClient } from "../client";
import type { ICommand } from "./types";

export class BookingCommand implements ICommand {
  public name = "📆 Мои бронирования";

  public async executeAsync(
    client: TelegramClient,
    message: any,
  ): Promise<void> {
    const chatId = BigInt(message.chat.id);
    const user = await telegramBackendApi.getUserByTelegramChatId(chatId);

    if (!user) {
      await client.sendMessage({
        chat_id: chatId,
        text: "❌ Пользователь не зарегистрирован.\nИспользуйте /link для привязки аккаунта.",
      });
      return;
    }

    const keyboard = {
      keyboard: [
        [{ text: "⏳ Ожидают" }, { text: "✅ Одобренные" }],
        [{ text: "🏁 Завершенные" }, { text: "❌ Отмененные" }],
        [{ text: "📋 Все бронирования" }],
        [{ text: "« Назад в меню" }],
      ],
      resize_keyboard: true,
    };

    await client.sendMessage({
      chat_id: chatId,
      text: "📆 <b>Мои бронирования</b>\n\nВыберите категорию:",
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }
}
