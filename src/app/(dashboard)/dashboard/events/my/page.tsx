"use client";

import {
  AlertCircle,
  Calendar,
  Clock,
  Filter,
  Search,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { EventResponseDto } from "@/app/models/event/event";
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function MyEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventResponseDto[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("Pending");

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventApi.get_my();
      setEvents(data);
      setFilteredEvents(data);
    } catch (loadError: unknown) {
      setEvents([]);
      setFilteredEvents([]);
      setError(getErrorMessage(loadError, "Не удалось загрузить ваши заявки"));
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback(() => {
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
  }, [events, searchQuery, selectedStatus]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 300);

    return () => clearTimeout(timer);
  }, [applyFilters]);

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
          <h1 className="text-2xl md:text-3xl font-bold">Мои заявки</h1>
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

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  {/^\d+$/.test(searchQuery.trim()) ? "ID: " : "Поиск: "}
                  {searchQuery}
                </span>
              )}
              {selectedStatus !== "all" && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  {statusNames[selectedStatus]}
                </span>
              )}
            </div>
          )}
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

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p>Загрузка...</p>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-card/30 border border-border/50 rounded-xl">
            <div className="max-w-md mx-auto px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hasActiveFilters ? "Ничего не найдено" : "Заявки отсутствуют"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? "Попробуйте изменить параметры поиска или фильтры"
                  : "В данный момент у вас нет заявок"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Сбросить фильтры
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-4">
              {filteredEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => router.push(`/dashboard/events/${event.id}`)}
                  className="w-full text-left bg-card border border-border rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          statusColors[event.status] || "bg-gray-500",
                        )}
                      ></div>
                      <span className="text-sm font-medium">
                        {statusNames[event.status] || event.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      #{event.id}
                    </span>
                  </div>

                  {formatWarningMessages(event.warnings).length > 0 && (
                    <div className="mb-3 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                        <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          Предупреждения
                        </p>
                      </div>
                      <div className="space-y-1">
                        {formatWarningMessages(event.warnings).map(
                          (message) => (
                            <p
                              key={message}
                              className="text-xs text-orange-600 dark:text-orange-400"
                            >
                              {message}
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {event.client}
                        </p>
                      </div>
                    </div>

                    <div className="bg-secondary/30 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Причина
                      </p>
                      <p className="text-sm line-clamp-2">{event.reason}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate">
                          {formatDateTime(event.startTime)}
                        </p>
                        <p className="text-muted-foreground truncate">
                          {formatDateTime(event.endTime)}
                        </p>
                      </div>
                    </div>

                    {(event.comment || event.adminComment) && (
                      <div className="pt-2 border-t border-border space-y-1">
                        {event.comment && (
                          <div className="text-xs bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1">
                            <p className="text-blue-600 dark:text-blue-400 font-medium mb-0.5">
                              Пользователь:
                            </p>
                            <p className="line-clamp-2">{event.comment}</p>
                          </div>
                        )}
                        {event.adminComment && (
                          <div className="text-xs bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1">
                            <p className="text-purple-600 dark:text-purple-400 font-medium mb-0.5">
                              Админ:
                            </p>
                            <p className="line-clamp-2">{event.adminComment}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead className="w-[100px]">Статус</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead className="max-w-[240px]">Причина</TableHead>
                    <TableHead>Период</TableHead>
                    <TableHead className="max-w-[220px]">Комментарии</TableHead>
                    <TableHead className="w-[220px]">Предупреждения</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/dashboard/events/${event.id}`)
                      }
                    >
                      <TableCell className="font-mono text-muted-foreground">
                        #{event.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              statusColors[event.status] || "bg-gray-500",
                            )}
                          ></div>
                          <span className="text-sm">
                            {statusNames[event.status] || event.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{event.client}</p>
                      </TableCell>
                      <TableCell>
                        <p
                          className="line-clamp-2 max-w-[240px]"
                          title={event.reason}
                        >
                          {event.reason}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm whitespace-nowrap">
                          <p>{formatDateTime(event.startTime)}</p>
                          <p className="text-muted-foreground">
                            {formatDateTime(event.endTime)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-[220px]">
                          {event.comment && (
                            <div className="text-xs bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1">
                              <p className="text-blue-600 dark:text-blue-400 font-medium mb-0.5">
                                Пользователь:
                              </p>
                              <p className="line-clamp-2">{event.comment}</p>
                            </div>
                          )}
                          {event.adminComment && (
                            <div className="text-xs bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1">
                              <p className="text-purple-600 dark:text-purple-400 font-medium mb-0.5">
                                Админ:
                              </p>
                              <p className="line-clamp-2">
                                {event.adminComment}
                              </p>
                            </div>
                          )}
                          {!event.comment && !event.adminComment && (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatWarningMessages(event.warnings).length > 0 ? (
                          <div className="space-y-1 w-full">
                            {formatWarningMessages(event.warnings).map(
                              (message) => (
                                <div
                                  key={message}
                                  className="text-xs bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1"
                                >
                                  <p className="text-orange-600 dark:text-orange-400 font-medium break-words whitespace-normal">
                                    {message}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
