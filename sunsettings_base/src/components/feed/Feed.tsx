"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import Image from "next/image";
import BoringAvatar from "boring-avatars";
import { getRomanticNameForAddress } from "@/lib/romanticNames";

type FeedItem = {
  id: string;
  image: string;
  author: string;
  time: number; // unix seconds
  locationLabel?: string;
};

function mask(addr?: string | null) {
  if (!addr) return "";
  const a = String(addr);
  if (a.length <= 10) return a;
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export default function Feed() {
  const { chainId } = useAccount();
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [levels, setLevels] = React.useState<
    Record<string, number | undefined>
  >({});
  const itemKey = React.useCallback(
    (it: FeedItem) => `${it.id}-${it.author}-${it.time}` as const,
    []
  );

  const loadPage = React.useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (chainId) params.set("chainId", String(chainId));
      params.set("page", String(page));
      params.set("offset", "10");
      // Show full collection feed; no exclusion of current user
      const res = await fetch(`/api/feed?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const next: FeedItem[] = Array.isArray(data?.items) ? data.items : [];
      setItems((prev) => {
        const seen = new Set(prev.map(itemKey));
        const uniqueNext = next.filter((n) => !seen.has(itemKey(n)));
        // Update hasMore based on whether we actually appended anything
        setHasMore(Boolean(data?.hasMore) && uniqueNext.length > 0);
        return [...prev, ...uniqueNext];
      });
      setPage((p) => p + 1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load feed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [chainId, hasMore, loading, page, itemKey]);

  React.useEffect(() => {
    // initial load
    loadPage();
    // refresh on visibility re-gain
    const onVis = () => {
      if (
        document.visibilityState === "visible" &&
        items.length === 0 &&
        !loading
      ) {
        loadPage();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", onVis);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("visibilitychange", onVis);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute and cache yearly level per author (unique posting days in current year)
  const requestedAuthorsRef = React.useRef<Set<string>>(new Set());

  // Reset cached levels and requested authors when chain changes
  React.useEffect(() => {
    setLevels({});
    requestedAuthorsRef.current = new Set();
  }, [chainId]);

  React.useEffect(() => {
    const distinctAuthors = Array.from(new Set(items.map((i) => i.author)));
    const authorsToFetch = distinctAuthors.filter(
      (a) => !requestedAuthorsRef.current.has(a)
    );
    if (authorsToFetch.length === 0) return;

    const year = new Date().getUTCFullYear();
    const jan1 = new Date(Date.UTC(year, 0, 1));
    const isLeap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
    const yearDays = isLeap ? 366 : 365;
    const toKey = (d: Date) => d.toISOString().slice(0, 10);

    const fetchLevel = async (addr: string) => {
      try {
        // mark as in-flight to avoid duplicate requests
        setLevels((prev) =>
          addr in prev ? prev : { ...prev, [addr]: undefined }
        );
        const params = new URLSearchParams();
        params.set("address", addr);
        if (chainId) params.set("chainId", String(chainId));
        const res = await fetch(`/api/wallet-nfts?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        const arr: unknown = data?.items;
        type UnknownItem = { time?: unknown };
        const times: number[] = Array.isArray(arr)
          ? (arr as unknown[])
              .map((v) =>
                typeof v === "object" && v !== null ? (v as UnknownItem) : null
              )
              .map((v) =>
                v && typeof v.time === "number" ? v.time : undefined
              )
              .filter((t): t is number => typeof t === "number")
          : [];
        const set = new Set<string>();
        times.forEach((ts) => {
          const d = new Date(ts * 1000);
          const key = toKey(
            new Date(
              Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
            )
          );
          set.add(key);
        });
        let count = 0;
        for (let i = 0; i < yearDays; i++) {
          const d = new Date(jan1.getTime() + i * 86_400_000);
          if (set.has(toKey(d))) count++;
        }
        setLevels((prev) => ({ ...prev, [addr]: count }));
      } catch {
        setLevels((prev) => ({ ...prev, [addr]: 0 }));
      }
    };

    authorsToFetch.forEach((addr) => {
      requestedAuthorsRef.current.add(addr);
      fetchLevel(addr);
    });
  }, [items, chainId]);

  // infinite scroll via intersection observer
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        loadPage();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loadPage, items.length, hasMore]);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto w-full max-w-md px-0">
        {/* Show loading only in the centered sentinel below */}
        {error ? <div className="p-4 text-sm text-red-600">{error}</div> : null}

        {items.length === 0 && loading ? (
          <div className="h-[70vh] flex items-center justify-center">
            <div className="text-base opacity-80">Loading photo feed…</div>
          </div>
        ) : null}

        <ul className="flex flex-col">
          {items.map((it) => (
            <li key={itemKey(it)} className="border-b-2 border-black">
              {/* Header with avatar placeholder + author */}
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-border">
                  <BoringAvatar
                    size={40}
                    name={it.author}
                    variant="bauhaus"
                    colors={[
                      "#ffe3b3",
                      "#ff9a52",
                      "#ff5252",
                      "#c91e5a",
                      "#3d2922",
                    ]}
                  />
                </div>
                <div className="flex-1 truncate text-base font-medium">
                  {getRomanticNameForAddress(it.author)} · {mask(it.author)}{" "}
                  <span className="opacity-80">
                    · LVL {levels[it.author] ?? "…"}
                  </span>
                </div>
                <div className="opacity-50 text-lg leading-none select-none">
                  ⋯
                </div>
              </div>
              {/* Photo */}
              <div className="w-full bg-secondary-background">
                <Image
                  src={it.image}
                  alt="sunsettings photo"
                  width={1080}
                  height={1350}
                  className="w-full h-auto object-cover"
                  sizes="100vw"
                  priority={false}
                  unoptimized
                />
              </div>
              {/* Footer metadata */}
              <div className="px-3 py-2 text-sm opacity-90">
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                  {it.locationLabel ? (
                    <>
                      <span className="truncate">{it.locationLabel}</span>
                      <span>•</span>
                    </>
                  ) : null}
                  <span>
                    {new Date(it.time * 1000).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              {/* Likes placeholder (non-functional) */}
              <div className="px-3 pb-3 pt-1 text-sm flex items-center gap-4">
                <button
                  type="button"
                  className="flex items-center gap-2 opacity-80 cursor-default h-11 px-3 rounded-base"
                  aria-label="Like"
                  disabled
                >
                  <span aria-hidden="true" className="text-2xl leading-none">
                    ♡
                  </span>
                  <span className="text-base">Like</span>
                </button>
              </div>
            </li>
          ))}
        </ul>

        {items.length === 0 && loading ? null : (
          <div
            ref={sentinelRef}
            className="h-12 flex items-center justify-center text-xs"
          >
            {hasMore ? (loading ? "Loading…" : "⬇︎ Load more") : "End of feed"}
          </div>
        )}
      </div>
    </div>
  );
}
