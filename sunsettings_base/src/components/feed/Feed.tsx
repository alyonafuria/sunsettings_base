"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import Image from "next/image";

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
      setItems((prev) => [...prev, ...next]);
      setHasMore(Boolean(data?.hasMore) && next.length > 0);
      setPage((p) => p + 1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load feed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [chainId, hasMore, loading, page]);

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
  }, [loadPage]);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto w-full max-w-md px-0">
        {items.length === 0 && loading ? (
          <div className="p-4 text-sm opacity-80">Loading feed…</div>
        ) : null}
        {error ? <div className="p-4 text-sm text-red-600">{error}</div> : null}

        <ul className="flex flex-col">
          {items.map((it) => (
            <li
              key={`${it.id}-${it.author}`}
              className="border-b-2 border-black"
            >
              {/* Header with avatar placeholder + author */}
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="h-8 w-8 rounded-full bg-secondary-background border-2 border-black" />
                <div className="flex-1 truncate text-sm font-medium">{mask(it.author)}</div>
                <div className="opacity-50 text-lg leading-none select-none">⋯</div>
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
              <div className="px-3 py-2 text-xs opacity-90">
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                  <span className="font-medium">{mask(it.author)}</span>
                  <span>•</span>
                  <span>
                    {new Date(it.time * 1000).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {it.locationLabel ? (
                    <>
                      <span>•</span>
                      <span className="truncate">{it.locationLabel}</span>
                    </>
                  ) : null}
                </div>
              </div>
              {/* Likes placeholder (non-functional) */}
              <div className="px-3 pb-3 pt-1 text-xs flex items-center gap-4">
                <button
                  type="button"
                  className="flex items-center gap-1 opacity-80 cursor-default"
                  aria-label="Like"
                  disabled
                >
                  <span aria-hidden="true">♡</span>
                  <span>Like</span>
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div
          ref={sentinelRef}
          className="h-12 flex items-center justify-center text-xs"
        >
          {hasMore ? (loading ? "Loading…" : "⬇︎ Load more") : "End of feed"}
        </div>
      </div>
    </div>
  );
}
