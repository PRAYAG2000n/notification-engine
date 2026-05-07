import { describe, it, expect } from "vitest";
import { formatRelativeTime, truncate, cn } from "@/lib/utils";

describe("formatRelativeTime", () => {
  it("returns 'just now' for timestamps less than 60 seconds ago", () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("returns minutes ago for timestamps less than 60 minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago for timestamps less than 24 hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago for timestamps less than 7 days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoDaysAgo)).toBe("2d ago");
  });

  it("returns formatted date for timestamps older than 7 days", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(tenDaysAgo);
    // Should be in "Mon DD" format
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});

describe("truncate", () => {
  it("returns original string if shorter than maxLength", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and adds ellipsis for long strings", () => {
    expect(truncate("this is a long string", 10)).toBe("this is...");
  });

  it("returns original string if equal to maxLength", () => {
    expect(truncate("exact", 5)).toBe("exact");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
  });

  it("deduplicates tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "extra")).toBe("base extra");
  });
});
