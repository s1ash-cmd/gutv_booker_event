import { format } from "date-fns";
import { telegramBackendApi } from "../backendApi";
import type { TelegramClient } from "../client";
import type { ICommand } from "./types";

export class BookingFilterCommand implements ICommand {
  private readonly status: string;
  public readonly name: string;

  constructor(status: string, displayName: string) {
    this.status = status;
    this.name = displayName;
  }

  public async executeAsync(
    client: TelegramClient,
    message: any,
  ): Promise<void> {
    const chatId = BigInt(message.chat.id);
    const user = await telegramBackendApi.getUserByTelegramChatId(chatId);
    if (!user) return;

    try {
      const allBookings =
        await telegramBackendApi.getBookingsByTelegramChatId(chatId);
      let bookings = allBookings;

      if (this.status !== "all") {
        bookings = allBookings.filter(
          (b) => b.status.toLowerCase() === this.status.toLowerCase(),
        );
      }

      if (bookings.length === 0) {
        await client.sendMessage({
          chat_id: chatId,
          text: `❌ Нет бронирований со статусом <b>${this.getStatusName(this.status)}</b>`,
          parse_mode: "HTML",
        });
        return;
      }

      const responseParts: string[] = [
        `📆 <b>${this.getStatusName(this.status)}</b>\n`,
      ];

      for (const booking of bookings) {
        let part = `🔹 <b>ID: ${booking.id}</b>\n`;
        part += `   ${this.getStatusEmoji(booking.status)} ${this.getStatusNameByString(booking.status)}\n`;
        part += `   📅 ${format(new Date(booking.startTime), "dd.MM.yyyy HH:mm")} - ${format(new Date(booking.endTime), "dd.MM.yyyy HH:mm")}\n`;
        part += `   📝 ${booking.reason}\n`;

        if (booking.equipmentModelIds && booking.equipmentModelIds.length > 0) {
          part += "   📦 Оборудование:\n";
          for (const item of booking.equipmentModelIds) {
            part += `      • ${item.modelName} (${item.inventoryNumber})\n`;
          }
        }

        if (booking.comment) part += `   💭 ${booking.comment}\n`;
        if (booking.adminComment)
          part += `   💬 Админ: ${booking.adminComment}\n`;

        responseParts.push(part);
      }

      let text = responseParts.join("\n");
      if (text.length > 4000) {
        text =
          text.substring(0, 4000) + "\n\n... (показаны первые бронирования)";
      }

      await client.sendMessage({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      });
    } catch (error: any) {
      if (error.message.includes("нет бронирований")) {
        await client.sendMessage({
          chat_id: chatId,
          text: "📆 У вас пока нет бронирований",
        });
      } else {
        console.error("Ошибка при получении бронирований:", error);
      }
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case "Pending":
        return "⏳";
      case "Approved":
        return "✅";
      case "Completed":
        return "🏁";
      case "Cancelled":
        return "❌";
      default:
        return "🔹";
    }
  }

  private getStatusNameByString(status: string): string {
    switch (status) {
      case "Pending":
        return "Ожидает";
      case "Approved":
        return "Одобрено";
      case "Completed":
        return "Завершено";
      case "Cancelled":
        return "Отменено";
      default:
        return status;
    }
  }

  private getStatusName(status: string): string {
    switch (status.toLowerCase()) {
      case "pending":
        return "Ожидают подтверждения";
      case "approved":
        return "Одобренные";
      case "completed":
        return "Завершенные";
      case "cancelled":
        return "Отмененные";
      case "all":
        return "Все бронирования";
      default:
        return status;
    }
  }
}
