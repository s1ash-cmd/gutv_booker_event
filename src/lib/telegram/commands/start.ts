import { telegramBackendApi } from "../backendApi";
import type { TelegramClient } from "../client";
import type { ICommand } from "./types";

export class StartCommand implements ICommand {
  public name = "/start";

  public async executeAsync(
    client: TelegramClient,
    message: any,
  ): Promise<void> {
    const chatId = BigInt(message.chat.id);
    const username = message.from?.username;
    const text = message.text || "";

    const parts = text.split(/\s+/);
    const startParameter = parts.length > 1 ? parts[1] : null;

    if (startParameter && startParameter.startsWith("LINK_")) {
      const code = startParameter.replace("LINK_", "");

      if (code.length === 6 && /^\d+$/.test(code)) {
        console.log(`Попытка автопривязки. ChatId: ${chatId}, Code: ${code}`);

        try {
          const linkedUser = await telegramBackendApi.linkTelegramByCode(
            code,
            chatId,
            username || null,
          );

          const keyboard = {
            keyboard: [
              [{ text: "👤 Профиль" }, { text: "📆 Мои бронирования" }],
              [{ text: "ℹ️ Помощь" }],
            ],
            resize_keyboard: true,
          };

          await client.sendMessage({
            chat_id: chatId,
            text:
              `✅ <b>Telegram успешно привязан!</b>\n\n` +
              `👤 Имя: ${linkedUser.name}\n` +
              `📧 Логин: ${linkedUser.login}\n` +
              `💬 Telegram: @${username ?? "не установлен"}\n\n` +
              `Теперь вы можете использовать все функции бота.\n` +
              `Выберите действие из меню ниже:`,
            parse_mode: "HTML",
            reply_markup: keyboard,
          });
          return;
        } catch (error: any) {
          if (
            error.message === "Неверный код привязки" ||
            error.message.includes("истек")
          ) {
            await client.sendMessage({
              chat_id: chatId,
              text:
                "❌ <b>Неверный код привязки</b>\n\n" +
                "Код недействителен или устарел.\n" +
                "Получите новый код в личном кабинете на сайте gutvbooker.ru",
              parse_mode: "HTML",
            });
            return;
          }

          console.error(
            `Ошибка автопривязки. ChatId: ${chatId}, Code: ${code}`,
            error,
          );

          await client.sendMessage({
            chat_id: chatId,
            text: `❌ ${error.message || "Произошла ошибка при привязке аккаунта.\nПопробуйте вручную: /link КОД"}`,
          });
          return;
        }
      }
    }

    const user = await telegramBackendApi.getUserByTelegramChatId(chatId);

    if (!user) {
      await client.sendMessage({
        chat_id: chatId,
        text:
          "<b>👋 Добро пожаловать в GUtv Booker!</b>\n\n" +
          "Для использования бота необходимо привязать ваш аккаунт:\n\n" +
          "1️⃣ Зарегистрируйтесь на сайте gutvbooker.ru\n" +
          "2️⃣ В личном кабинете нажмите 'Привязать Telegram'\n" +
          "3️⃣ Нажмите на ссылку или скопируйте код\n" +
          "4️⃣ Отправьте код сюда: /link КОД\n\n" +
          `💬 Ваш Telegram: @${username ?? "не установлен"}`,
        parse_mode: "HTML",
      });
      return;
    }

    const keyboard = {
      keyboard: [
        [{ text: "👤 Профиль" }, { text: "📆 Мои бронирования" }],
        [{ text: "ℹ️ Помощь" }],
      ],
      resize_keyboard: true,
    };

    await client.sendMessage({
      chat_id: chatId,
      text: `👋 Здравствуйте, ${user.name}!\n\nВыберите действие:`,
      reply_markup: keyboard,
    });
  }
}
