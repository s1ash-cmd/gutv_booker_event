"use client";

import {
  AlertCircle,
  Calendar,
  Clock,
  Filter,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EventResponseDto } from "@/app/models/event/event";
import { eventApi } from "@/lib/eventApi";
import { formatWarningMessages } from "@/lib/userFacingMessages";
import { cn } from "@/lib/utils";

const statusNames: Record<string, string> = {
  Pending: "Ожидает",
  Cancelled: "Отменено",
  Approved: "Одобрено",
  Completed: "Завершено",
};

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500",
  Cancelled: "bg-red-500",
  Approved: "bg-green-500",
  Completed: "bg-blue-500",
};

export default function MyEventsPage() {
  const [events, setEvents] = useState<EventResponseDto[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    void loadEvents();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedStatus, events]);

  async function loadEvents() {
    try {
      setLoading(true);
      setError(null);
      const data = await eventApi.get_my();
      setEvents(data);
      setFilteredEvents(data);
    } catch (loadError: any) {
      setEvents([]);
      setFilteredEvents([]);
      setError(loadError?.message || "Не удалось загрузить ваши заявки");
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    const query = searchQuery.trim().toLowerCase();
    const filtered = events.filter((event) => {
      const matchesStatus =
        selectedStatus === "all" || event.status === selectedStatus;
      const matchesSearch =
        !query ||
        String(event.id) === query ||
        event.client.toLowerCase().includes(query) ||
        event.reason.toLowerCase().includes(query) ||
        (event.comment?.toLowerCase().includes(query) ?? false) ||
        (event.adminComment?.toLowerCase().includes(query) ?? false);

      return matchesStatus && matchesSearch;
    });

    setFilteredEvents(filtered);
  }

  function clearFilters() {
    setSearchQuery("");
    setSelectedStatus("all");
    setError(null);
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const hasActiveFilters = Boolean(searchQuery) || selectedStatus !== "all";

  return (
    <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Мои заявки</h1>
            <p className="text-sm text-muted-foreground">
              Ваши заявки на съемку мероприятий
            </p>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-[220px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(statusNames).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                className="shrink-0"
                title="Сбросить все фильтры"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-3 h-3 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">
                  Произошла ошибка
                </p>
                <p className="text-sm text-destructive/80">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadEvents()}
                  className="mt-3"
                >
                  Попробовать снова
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card/50 backdrop-blur border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Загрузка заявок...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-lg font-medium">Ничего не найдено</p>
              <p className="text-sm text-muted-foreground">
                Попробуйте изменить фильтры или создайте новую заявку на
                мероприятие.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Клиент</TableHead>
                      <TableHead>Период</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Комментарий</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => {
                      const warningMessages = formatWarningMessages(
                        event.warnings,
                      );

                      return (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">#{event.id}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{event.client}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {event.reason}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                {formatDateTime(event.startTime)}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                {formatDateTime(event.endTime)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-2 text-sm font-medium">
                              <span
                                className={cn(
                                  "w-2.5 h-2.5 rounded-full",
                                  statusColors[event.status] || "bg-muted",
                                )}
                              />
                              {statusNames[event.status] || event.status}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="space-y-1">
                              {event.comment && (
                                <p className="text-sm line-clamp-2">{event.comment}</p>
                              )}
                              {event.adminComment && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  Ответ администратора: {event.adminComment}
                                </p>
                              )}
                              {warningMessages.length > 0 && (
                                <p className="text-xs text-amber-600">
                                  {warningMessages.join(", ")}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden divide-y divide-border">
                {filteredEvents.map((event) => {
                  const warningMessages = formatWarningMessages(event.warnings);

                  return (
                    <div key={event.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">#{event.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.client}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-2 text-xs font-medium">
                          <span
                            className={cn(
                              "w-2.5 h-2.5 rounded-full",
                              statusColors[event.status] || "bg-muted",
                            )}
                          />
                          {statusNames[event.status] || event.status}
                        </span>
                      </div>

                      <p className="text-sm">{event.reason}</p>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateTime(event.startTime)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDateTime(event.endTime)}
                        </div>
                      </div>

                      {(event.comment || event.adminComment) && (
                        <div className="space-y-1 text-sm">
                          {event.comment && <p>Комментарий: {event.comment}</p>}
                          {event.adminComment && (
                            <p className="text-muted-foreground">
                              Ответ администратора: {event.adminComment}
                            </p>
                          )}
                        </div>
                      )}

                      {warningMessages.length > 0 && (
                        <p className="text-xs text-amber-600">
                          {warningMessages.join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
