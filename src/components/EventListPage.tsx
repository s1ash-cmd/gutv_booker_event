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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EventResponseDto } from "@/app/models/event/event";
import { ErrorMessage } from "@/components/ErrorMessage";
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
import { type EventPage, eventApi } from "@/lib/eventApi";
import { requestTypeLabels } from "@/lib/eventRequirements";
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

export function EventListPage({
  scope = "my",
  userId,
  title = "Мои заявки",
  onSummary,
}: {
  scope?: "my" | "all" | "user";
  userId?: number;
  title?: string;
  onSummary?: (summary: EventPage["summary"]) => void;
}) {
  const router = useRouter();
  const [events, setEvents] = useState<EventResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>(
    scope === "user" ? "all" : "Pending",
  );

  const [sortOrder, setSortOrder] = useState<"createdDesc" | "createdAsc">(
    "createdDesc",
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const latestRequestId = useRef(0);

  const loadEvents = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    try {
      setLoading(true);
      setError(null);
      const data = await eventApi.list({
        scope,
        userId,
        page,
        status: selectedStatus,
        query: debouncedQuery,
        sort: sortOrder,
      });
      if (requestId === latestRequestId.current) {
        setEvents(data.items);
        onSummary?.(data.summary);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.page !== page) setPage(data.page);
      }
    } catch (loadError: unknown) {
      if (requestId !== latestRequestId.current) return;
      setEvents([]);
      setError(getErrorMessage(loadError, "Не удалось загрузить ваши заявки"));
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  }, [
    scope,
    userId,
    page,
    selectedStatus,
    debouncedQuery,
    sortOrder,
    onSummary,
  ]);

  useEffect(() => {
    void loadEvents();
    return () => {
      latestRequestId.current += 1;
    };
  }, [loadEvents]);

  function clearFilters() {
    setPage(1);
    setSearchQuery("");
    setSelectedStatus("all");
    setSortOrder("createdDesc");
    setError(null);
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filteredEvents = events;
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedStatus !== "all" ||
    sortOrder !== "createdDesc";

  return (
    <section className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
        </div>

        <div className="bg-card/50 backdrop-blur border border-border rounded-xl p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="min-w-0 flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                aria-label="Поиск заявок"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                setSelectedStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Статус заявки"
                className="w-full md:w-[200px]"
              >
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

            <Select
              value={sortOrder}
              onValueChange={(value) => {
                setSortOrder(value as "createdDesc" | "createdAsc");
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Сортировка заявок"
                className="w-full md:w-[220px]"
              >
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdDesc">Сначала новые</SelectItem>
                <SelectItem value="createdAsc">Сначала старые</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                className="shrink-0"
                title="Сбросить все фильтры"
                aria-label="Сбросить все фильтры"
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
              {sortOrder !== "createdDesc" && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  Сначала старые
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <ErrorMessage message={error} onRetry={() => void loadEvents()} />
        )}

        {loading ? (
          <div aria-live="polite" className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p>Загрузка...</p>
            </div>
          </div>
        ) : error ? null : filteredEvents.length === 0 ? (
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
                <Link
                  key={event.id}
                  href={`/dashboard/events/${event.id}`}
                  className="block w-full text-left bg-card border border-border rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
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

                  {event.details && (
                    <p className="mb-3 text-xs font-medium text-primary">
                      {requestTypeLabels[event.details.requestType]}
                    </p>
                  )}
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
                        {event.details && (
                          <p className="text-xs text-muted-foreground break-words">
                            {event.details.organization}
                          </p>
                        )}
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
                </Link>
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
                    <TableHead>Период (МСК)</TableHead>
                    <TableHead className="max-w-[220px]">Комментарии</TableHead>
                    <TableHead className="w-[220px]">Предупреждения</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary"
                      tabIndex={0}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                          keyEvent.preventDefault();
                          router.push(`/dashboard/events/${event.id}`);
                        }
                      }}
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
                        {event.details && (
                          <p className="text-xs font-medium text-primary">
                            {requestTypeLabels[event.details.requestType]}
                          </p>
                        )}
                        {event.details && (
                          <p className="text-xs text-muted-foreground break-words">
                            {event.details.organization}
                          </p>
                        )}
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
        {!error && (
          <nav
            aria-label="Страницы заявок"
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <span className="text-muted-foreground">
              Всего: {total}. Страница {page} из {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Далее
              </Button>
            </div>
          </nav>
        )}
      </div>
    </section>
  );
}
