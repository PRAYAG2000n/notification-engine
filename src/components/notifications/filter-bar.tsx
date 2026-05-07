"use client";

import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationStore } from "@/stores/notification-store";

const notificationTypes = [
  "SYSTEM",
  "ALERT",
  "MESSAGE",
  "TASK",
  "REMINDER",
  "UPDATE",
] as const;

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export function FilterBar() {
  const { filters, setFilter, resetFilters } = useNotificationStore();
  const hasActiveFilters =
    filters.type || filters.priority || filters.isRead !== null;

  return (
    <div className="border-b border-surface-200 px-4 py-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
        <Filter className="h-4 w-4 shrink-0 text-surface-400" />

        {/* Read status */}
        <div className="flex gap-1">
          {[
            { label: "All", value: null },
            { label: "Unread", value: false },
            { label: "Read", value: true },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setFilter("isRead", opt.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filters.isRead === opt.value
                  ? "bg-brand-100 text-brand-700"
                  : "text-surface-500 hover:bg-surface-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-surface-200" />

        {/* Type filter */}
        <div className="flex gap-1">
          {notificationTypes.map((type) => (
            <button
              key={type}
              onClick={() =>
                setFilter("type", filters.type === type ? null : type)
              }
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filters.type === type
                  ? "bg-brand-100 text-brand-700"
                  : "text-surface-500 hover:bg-surface-100"
              }`}
            >
              {type.charAt(0) + type.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-surface-200" />

        {/* Priority filter */}
        <div className="flex gap-1">
          {priorities.map((p) => (
            <button
              key={p}
              onClick={() =>
                setFilter("priority", filters.priority === p ? null : p)
              }
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filters.priority === p
                  ? "bg-brand-100 text-brand-700"
                  : "text-surface-500 hover:bg-surface-100"
              }`}
            >
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
