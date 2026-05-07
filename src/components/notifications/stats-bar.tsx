"use client";

import { Bell, Mail, AlertTriangle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export function StatsBar() {
  const { data: stats, isLoading } = trpc.notification.stats.useQuery();

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-surface-100"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total",
      value: stats.total,
      icon: Bell,
      color: "text-brand-600 bg-brand-50",
    },
    {
      label: "Unread",
      value: stats.unread,
      icon: Mail,
      color: "text-orange-600 bg-orange-50",
    },
    {
      label: "Urgent",
      value:
        stats.byPriority.find((p) => p.priority === "URGENT")?.count ?? 0,
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50",
    },
    {
      label: "Read Rate",
      value:
        stats.total > 0
          ? `${Math.round(((stats.total - stats.unread) / stats.total) * 100)}%`
          : "0%",
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white p-4"
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              card.color
            )}
          >
            <card.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-surface-900">{card.value}</p>
            <p className="text-xs text-surface-500">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
