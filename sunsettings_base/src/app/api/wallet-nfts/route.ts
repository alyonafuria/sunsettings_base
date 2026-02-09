import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache (per server instance)
const CACHE_TTL_MS = 60_000; // 60s
const CACHE = new Map<string, { expiry: number; payload: unknown }>();

function getCache(key: string) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    CACHE.delete(key);
    return null;
  }
  return entry.payload;
}
function setCache(key: string, payload: unknown, ttlMs = CACHE_TTL_MS) {
  CACHE.set(key, { payload, expiry: Date.now() + ttlMs });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chainIdParam = searchParams.get("chainId");
  const contract = searchParams.get("contract"); // optional override
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  const chainId = Number(chainIdParam || 84532);
  const isBaseMainnet = chainId === 8453;

  const contractAddress =
    contract ||
    (isBaseMainnet
      ? process.env.NEXT_PUBLIC_SUNSET_BASE_NFT_CONTRACT_ADDRESS
      : process.env.NEXT_PUBLIC_SUNSET_SEPOLIA_NFT_CONTRACT_ADDRESS);

  console.log('[wallet-nfts] Request params:', { address, chainId, isBaseMainnet, contractAddress });

  if (!contractAddress) {
    return NextResponse.json({ items: [], reason: "missing_contract_env" });
  }

  // Note: Free Etherscan/Basescan API doesn't support Base Mainnet for tokennfttx
  // Solution: Call feed API internally and filter by address
  
  // Check cache first
  const cacheKey = `wallet-nfts:${address}:${chainId}:${contract || "auto"}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log('[wallet-nfts] Returning cached data:', cached);
    return NextResponse.json(cached);
  }
  console.log('[wallet-nfts] No cache hit, fetching from feed API');

  // Fetch from feed API (which uses Basescan getLogs that works on free tier)
  try {
    const feedUrl = `${req.nextUrl.origin}/api/feed?chainId=${chainId}&page=1&offset=50`;
    console.log('[wallet-nfts] Fetching from feed API:', feedUrl);
    const feedRes = await fetch(feedUrl);
    const feedData = await feedRes.json();
    console.log('[wallet-nfts] Feed API response:', { itemsCount: feedData?.items?.length });
    
    // Filter items by address
    const allItems = Array.isArray(feedData?.items) ? feedData.items : [];
    const myItems = allItems.filter((item: { author?: string }) => 
      String(item?.author).toLowerCase() === address.toLowerCase()
    );
    console.log('[wallet-nfts] Filtered items for address:', myItems.length);
    
    const result = {
      items: myItems.map((item: { image?: string; time?: number }) => ({
        image: item.image,
        time: item.time,
      })),
      count: myItems.length,
    };
    
    setCache(cacheKey, result);
    console.log('[wallet-nfts] Final items count:', result.count, 'with timestamps:', result.items.filter((i: { time?: number }) => i.time).length);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[wallet-nfts] Error fetching from feed API:', err);
    return NextResponse.json({ items: [], count: 0 });
  }
}
