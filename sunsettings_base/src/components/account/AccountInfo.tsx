"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAccount, useDisconnect } from "wagmi";
import BoringAvatar from "boring-avatars";
import { getRomanticNameForAddress } from "@/lib/romanticNames";

export default function AccountInfo({
  loading,
  avatarUrl,
  wallet,
  title,
  displayName,
  postTimes,
}: {
  loading: boolean;
  avatarUrl?: string | null;
  wallet?: string | null;
  title?: string | null;
  displayName?: string | null;
  postTimes?: number[]; // unix seconds of posts (NFT mints)
}) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  // No connect usage here; Account page handles connection CTA when logged out
  // const { connectors, connectAsync } = useConnect();

  const mask = (addr?: string | null) => {
    if (!addr) return "";
    const a = String(addr);
    if (a.length <= 10) return a;
    return `${a.slice(0, 6)}...${a.slice(-4)}`;
  };

  // no connect button in header when not connected; keep helper for potential future use

  // Compute yearly level (unique local calendar days with at least one post in the current year)
  const yearlyLevel = React.useMemo(() => {
    const toKeyLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const now = new Date();
    const year = now.getFullYear();

    // Build a set of unique local-date keys limited to this year
    const set = new Set<string>();
    for (const ts of postTimes || []) {
      const d = new Date(ts * 1000);
      if (d.getFullYear() === year) {
        set.add(toKeyLocal(new Date(d.getFullYear(), d.getMonth(), d.getDate())));
      }
    }
    return set.size;
  }, [postTimes]);

  return (
    <div className="w-full h-full p-4">
      <div className="flex items-center gap-4">
        {isConnected && (
          <>
            {loading ? (
              <Skeleton className="h-16 w-16 rounded-full" />
            ) : (
              <Avatar className="h-16 w-16">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="avatar" />
                ) : (
                  <AvatarFallback className="p-0">
                    <BoringAvatar
                      size={64}
                      name={String(wallet ?? address ?? "sunsettings")}
                      variant="bauhaus"
                      colors={[
                        "#ffe3b3",
                        "#ff9a52",
                        "#ff5252",
                        "#c91e5a",
                        "#3d2922",
                      ]}
                    />
                  </AvatarFallback>
                )}
              </Avatar>
            )}
            <div className="flex-1 space-y-1">
              {loading ? (
                <Skeleton className="h-4 w-1/3" />
              ) : (
                <div className="text-base font-semibold truncate">
                  {displayName ?? getRomanticNameForAddress(wallet ?? address ?? null)}
                </div>
              )}

              {loading ? (
                <Skeleton className="h-3 w-24" />
              ) : (wallet ?? address) ? (
                <div className="text-xs text-muted-foreground truncate">
                  {mask(wallet ?? address ?? null)}
                </div>
              ) : null}

              {loading ? (
                <Skeleton className="h-3 w-1/2" />
              ) : (
                <div className="text-sm opacity-80 flex items-center gap-2">
                  <span className="truncate">{title || "sunset catcher"}</span>
                  <span className="whitespace-nowrap">
                    LVL <span className="font-semibold">{yearlyLevel}</span>
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {isConnected && (
          <Button
            type="button"
            size="sm"
            variant="neutral"
            onClick={() => disconnect()}
          >
            Logout
          </Button>
        )}
      </div>
      {/* Stats and yearly tracker */}
      {isConnected && (
        <YearlySunsetStats loading={loading} postTimes={postTimes} />
      )}
    </div>
  );
}

function YearlySunsetStats({
  loading,
  postTimes,
}: {
  loading: boolean;
  postTimes?: number[];
}) {
  // Helpers for local-calendar arithmetic and keys
  const toKeyLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const addDaysLocal = (d: Date, days: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

  // Build a set of local-date keys (YYYY-MM-DD) for posts, limited to current year where relevant
  const now = React.useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const jan1 = React.useMemo(() => new Date(year, 0, 1), [year]);
  const dec31 = React.useMemo(() => new Date(year, 11, 31), [year]);
  const todayLocal = React.useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    [now]
  );

  const postSet = React.useMemo(() => {
    const s = new Set<string>();
    for (const ts of postTimes || []) {
      const d = new Date(ts * 1000);
      // Normalize to local calendar day key
      s.add(toKeyLocal(new Date(d.getFullYear(), d.getMonth(), d.getDate())));
    }
    return s;
  }, [postTimes]);
  const isLeap = new Date(year, 1, 29).getMonth() === 1;
  const yearDays = isLeap ? 366 : 365;
  // Count unique posting days for the entire calendar year using local dates
  const countYear = React.useMemo(() => {
    let count = 0;
    for (let i = 0; i < yearDays; i++) {
      const d = new Date(year, 0, 1 + i);
      if (d > dec31) break;
      if (postSet.has(toKeyLocal(d))) count++;
    }
    return count;
  }, [postSet, yearDays, dec31, year]);

  // Compute longest and current streaks (within current year, up to today)
  const { longestStreak, currentStreak } = React.useMemo(() => {
    // Longest streak within current year (local)
    let longest = 0;
    let rolling = 0;
    const daysToToday = Math.floor(
      (todayLocal.getTime() - jan1.getTime()) / 86_400_000
    );
    for (let i = 0; i <= daysToToday; i++) {
      const d = new Date(year, 0, 1 + i);
      const key = toKeyLocal(d);
      if (postSet.has(key)) {
        rolling += 1;
        if (rolling > longest) longest = rolling;
      } else {
        rolling = 0;
      }
    }

    // Current streak: count continuous local days starting from today backwards
    let cur = 0;
    let probe = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());
    while (true) {
      const key = toKeyLocal(probe);
      if (postSet.has(key)) {
        cur += 1;
        // move to previous day (local)
        probe = new Date(probe.getFullYear(), probe.getMonth(), probe.getDate() - 1);
      } else {
        break;
      }
    }

    return { longestStreak: longest, currentStreak: cur };
  }, [postSet, jan1, todayLocal, year]);

  // Build GitHub-like weekly grid for full current year (Jan 1 to Dec 31) using local calendar
  const startWindow = jan1;
  // Align grid to previous Sunday and next Saturday around the full year (local)
  const startWeekday = startWindow.getDay();
  const gridStart = new Date(
    startWindow.getFullYear(),
    startWindow.getMonth(),
    startWindow.getDate() - startWeekday
  );
  const endWeekdayDec31 = dec31.getDay();
  const gridEnd = new Date(
    dec31.getFullYear(),
    dec31.getMonth(),
    dec31.getDate() + (6 - endWeekdayDec31)
  );
  const totalDays = Math.floor((gridEnd.getTime() - gridStart.getTime()) / 86_400_000) + 1;
  const weeks = Math.ceil(totalDays / 7);

  type Cell = {
    date: Date;
    key: string;
    inWindow: boolean;
    isFuture: boolean;
    hasPost: boolean;
  };
  const weeksArr: Array<Array<Cell>> = [];
  for (let w = 0; w < weeks; w++) {
    const col: Array<Cell> = [];
    for (let d = 0; d < 7; d++) {
  const idx = w * 7 + d;
  const date = addDaysLocal(gridStart, idx);
  const key = toKeyLocal(date);
  const inWindow = date >= startWindow && date <= dec31; // entire year range (local)
  const isFuture = date > todayLocal && date <= dec31;
      const hasPost = postSet.has(key);
      col.push({ date, key, inWindow, isFuture, hasPost });
    }
    weeksArr.push(col);
  }

  // Group consecutive weeks into month chunks
  type MonthChunk = {
    label: string;
    weekStartIndex: number;
    weekEndIndex: number;
  };
  const monthChunks: MonthChunk[] = [];
  const MONTHS_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ] as const;
  const getWeekMonth = (w: number) => {
    // Use mid-week day (Wednesday) to determine month for this week (local)
    const mid = addDaysLocal(gridStart, w * 7 + 3);
    return mid.getMonth();
  };
  const getWeekMonthLabel = (w: number) => {
    const mid = addDaysLocal(gridStart, w * 7 + 3);
    return MONTHS_SHORT[mid.getMonth()];
  };
  let currentMonth = getWeekMonth(0);
  let startIdx = 0;
  for (let w = 1; w < weeks; w++) {
    const m = getWeekMonth(w);
    if (m !== currentMonth) {
      monthChunks.push({
        label: getWeekMonthLabel(startIdx),
        weekStartIndex: startIdx,
        weekEndIndex: w - 1,
      });
      currentMonth = m;
      startIdx = w;
    }
  }
  monthChunks.push({
    label: getWeekMonthLabel(startIdx),
    weekStartIndex: startIdx,
    weekEndIndex: weeks - 1,
  });

  // Scroll container ref to position today's cell after load
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (loading) return; // wait until content is rendered
    const container = scrollRef.current;
    if (!container) return;
    const todayEl = container.querySelector(
      '[data-today="true"]'
    ) as HTMLElement | null;
    if (!todayEl) return;
    const scrollNow = () => {
      // Place today's center at ~75% of visible width
      const targetCenter = todayEl.offsetLeft + todayEl.offsetWidth / 2;
      const desiredCenter = container.clientWidth * 0.75;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const next = Math.min(
        Math.max(targetCenter - desiredCenter, 0),
        Math.max(maxScroll, 0)
      );
      container.scrollLeft = next;
    };
    // Defer to next frame to ensure layout is final
    const raf = window.requestAnimationFrame(scrollNow);
    return () => window.cancelAnimationFrame(raf);
  }, [loading, postTimes]);

  return (
    <div className="mt-4">
      {/* Streak stats */}
      <div className="mt-1 space-y-1 text-sm md:text-base">
        {loading ? (
          <>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-28" />
          </>
        ) : (
          <>
            <div>
              Longest streak: <span className="font-semibold">{longestStreak}</span>
            </div>
            <div>
              Current streak: <span className="font-semibold">{currentStreak}</span>
            </div>
          </>
        )}
      </div>

      {/* Summary line moved below streaks */}
      <div className="mt-1 text-sm md:text-base">
        {loading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <span>
            Sunsets caught: <span className="font-semibold">{countYear}</span>/{yearDays}
          </span>
        )}
      </div>

      {/* Contribution-like grid */}
      <div
        ref={scrollRef}
        className="mt-3 overflow-x-auto px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {loading ? (
          <div className="w-full">
            <Skeleton className="h-40 md:h-44 w-full" />
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="flex items-start">
              {monthChunks.map((chunk, idx) => (
                <div
                  key={`chunk-${idx}`}
                  className={"mx-2 first:ml-0 last:mr-0"}
                >
                  {/* Month label centered above this month block */}
                  <div className="h-4 mb-1 flex items-end justify-center">
                    <span className="text-[10px] leading-none opacity-80 select-none">
                      {chunk.label}
                    </span>
                  </div>
                  {/* This month's weeks */}
                  <div className="inline-grid auto-cols-max grid-flow-col gap-1">
                    {weeksArr
                      .slice(chunk.weekStartIndex, chunk.weekEndIndex + 1)
                      .map((col, i) => (
                        <div
                          key={`w-${chunk.weekStartIndex + i}`}
                          className="grid grid-rows-7 gap-1"
                        >
                          {col.map((cell) => {
                            const colorClass = cell.isFuture
                              ? "bg-white"
                              : cell.inWindow
                              ? cell.hasPost
                                ? "bg-amber-400"
                                : "bg-[#1a1a1a]" // graphite black
                              : "bg-transparent";
                            return (
                              <div
                                key={cell.key}
                                className={[
                                  "size-3 md:size-3.5 rounded-full border border-border",
                                  colorClass,
                                ].join(" ")}
                                data-key={cell.key}
                                data-today={cell.key === toKeyLocal(todayLocal) ? "true" : undefined}
                                aria-label={`${cell.date.toDateString()} ${
                                  cell.hasPost
                                    ? "Posted"
                                    : cell.isFuture
                                    ? "Future"
                                    : "No post"
                                }`}
                                title={cell.date.toDateString()}
                              />
                            );
                          })}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
