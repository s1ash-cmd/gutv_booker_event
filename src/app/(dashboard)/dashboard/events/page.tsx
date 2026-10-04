"use client";
import { AdminOnly } from "@/components/AdminOnly";
import { EventListPage } from "@/components/EventListPage";
export default function EventsDashboardPage() {
  return (
    <AdminOnly>
      <EventListPage scope="all" title="Все заявки" />
    </AdminOnly>
  );
}
