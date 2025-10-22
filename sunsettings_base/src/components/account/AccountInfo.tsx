"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import BoringAvatar from "boring-avatars";
import { getRomanticNameForAddress } from "@/lib/romanticNames";

export default function AccountInfo({
  loading,
  avatarUrl,
  wallet,
  title,
  postTimes,
}: {
  loading: boolean;
  avatarUrl?: string | null;
  wallet?: string | null;
  title?: string | null;
  postTimes?: number[]; // unix seconds of posts (NFT mints)
}) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectors, connectAsync, status: connectStatus } = useConnect();

  const mask = (addr?: string | null) => {
    if (!addr) return "";
    const a = String(addr);
    if (a.length <= 10) return a;
    return `${a.slice(0, 6)}...${a.slice(-4)}`;
  };

  const onConnect = async () => {
    try {
      const coinbase = connectors.find((c) => /coinbase/i.test(c.name));
      await connectAsync({ connector: coinbase ?? connectors[0] });
    } catch {}
  };

  return (
    <div className="w-full h-full p-4">
      <div className="flex items-center gap-4">
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
        <div className="flex-1 space-y-2">
          {loading ? (
            <Skeleton className="h-4 w-1/3" />
          ) : (
            <div className="text-base font-semibold truncate">
              {getRomanticNameForAddress(wallet ?? address ?? null)} ·{" "}
              {mask(wallet ?? address ?? null)}
            </div>
          )}
          {loading ? (
            <Skeleton className="h-3 w-1/2" />
          ) : (
            <div className="text-sm opacity-80">
              {title || "sunset catcher"}
            </div>
          )}
        </div>
        {!loading &&
          (isConnected ? (
            <Button
              type="button"
              size="sm"
              variant="neutral"
              onClick={() => disconnect()}
            >
              Logout
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onConnect}
              disabled={connectStatus === "pending"}
            >
              {connectStatus === "pending" ? "Connecting…" : "Sign up / Log in"}
            </Button>
          ))}
      </div>
      {/* Stats and yearly tracker */}
      <YearlySunsetStats loading={loading} postTimes={postTimes} />
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
  // Build a set of local-date keys (YYYY-MM-DD) for posts
  const toKey = (d: Date) => d.toISOString().slice(0, 10);
  const postSet = React.useMemo(() => {
    const s = new Set<string>();
    (postTimes || []).forEach((ts) => {
      const d = new Date(ts * 1000);
      // Normalize to UTC date key for consistency
      s.add(toKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))));
    });
    return s;
  }, [postTimes]);

  const now = new Date();
  const year = now.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysElapsed = Math.floor((todayUTC.getTime() - jan1.getTime()) / 86_400_000) + 1; // inclusive
  // const isLeap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;

  // Count unique days with posts since Jan 1 to today
  let count = 0;
  for (let i = 0; i < daysElapsed; i++) {
    const d = new Date(jan1.getTime() + i * 86_400_000);
    if (postSet.has(toKey(d))) count++;
  }

  // Build GitHub-like weekly grid for last 90 rolling days
  const DAYS_WINDOW = 90;
  const startWindow = new Date(todayUTC.getTime() - (DAYS_WINDOW - 1) * 86_400_000);
  // Align to previous Sunday
  const startWeekday = startWindow.getUTCDay();
  const gridStart = new Date(startWindow.getTime() - startWeekday * 86_400_000);
  // Extend to end of current week (Saturday) to allow future days (white)
  const endWeekday = todayUTC.getUTCDay();
  const gridEnd = new Date(todayUTC.getTime() + (6 - endWeekday) * 86_400_000);
  const totalDays = Math.floor((gridEnd.getTime() - gridStart.getTime()) / 86_400_000) + 1;
  const weeks = Math.ceil(totalDays / 7);

  type Cell = { date: Date; key: string; inWindow: boolean; isFuture: boolean; hasPost: boolean };
  const weeksArr: Array<Array<Cell>> = [];
  for (let w = 0; w < weeks; w++) {
    const col: Array<Cell> = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      const date = new Date(gridStart.getTime() + idx * 86_400_000);
      const key = toKey(date);
      const inWindow = date >= startWindow && date <= todayUTC; // window is past 90 days including today
      const isFuture = date > todayUTC;
      const hasPost = postSet.has(key);
      col.push({ date, key, inWindow, isFuture, hasPost });
    }
    weeksArr.push(col);
  }

  // Group consecutive weeks into month chunks
  type MonthChunk = { label: string; weekStartIndex: number; weekEndIndex: number };
  const monthChunks: MonthChunk[] = [];
  const getWeekMonth = (w: number) => {
    // Use mid-week day (Wednesday) to determine month for this week
    const mid = new Date(gridStart.getTime() + (w * 7 + 3) * 86_400_000);
    return mid.getUTCMonth();
  };
  const getWeekMonthLabel = (w: number) => {
    const mid = new Date(gridStart.getTime() + (w * 7 + 3) * 86_400_000);
    return mid.toLocaleString(undefined, { month: "short" });
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

  return (
    <div className="mt-4">
      {/* Summary line */}
      <div className="text-sm md:text-base">
        {loading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <span>
            Sunsets this year: <span className="font-semibold">{count}</span> / {daysElapsed}
          </span>
        )}
      </div>

      {/* Contribution-like grid */}
      <div className="mt-3 overflow-x-auto">
        <div className="w-full flex justify-center">
          <div className="flex items-start">
            {monthChunks.map((chunk, idx) => (
              <div key={`chunk-${idx}`} className={"mx-2 first:ml-0 last:mr-0"}>
                {/* Month label centered above this month block */}
                <div className="h-4 mb-1 flex items-end justify-center">
                  <span className="text-[10px] leading-none opacity-80 select-none">
                    {chunk.label}
                  </span>
                </div>
                {/* This month's weeks */}
                <div className="inline-grid auto-cols-max grid-flow-col gap-1">
                  {weeksArr.slice(chunk.weekStartIndex, chunk.weekEndIndex + 1).map((col, i) => (
                    <div key={`w-${chunk.weekStartIndex + i}`} className="grid grid-rows-7 gap-1">
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
                            aria-label={`${cell.date.toDateString()} ${cell.hasPost ? "Posted" : cell.isFuture ? "Future" : "No post"}`}
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
      </div>
    </div>
  );
}
