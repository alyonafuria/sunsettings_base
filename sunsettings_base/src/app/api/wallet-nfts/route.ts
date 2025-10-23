import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";

function ipfsToHttp(uri: string): string {
  if (!uri) return "";
  return uri.startsWith("ipfs://")
    ? `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`
    : uri;
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

  if (!contractAddress) {
    return NextResponse.json({ items: [], reason: "missing_contract_env" });
  }

  const apiKey =
    process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "";
  const v2Params = new URLSearchParams({
    chainid: String(chainId),
    module: "account",
    action: "tokennfttx",
    contractaddress: contractAddress,
    address,
    page: "1",
    offset: "50",
    sort: "desc",
  });
  if (apiKey) v2Params.set("apikey", apiKey);

  // Try Etherscan V2
  type TokenTx = {
    to?: string;
    tokenID?: string;
    tokenId?: string;
    timeStamp?: string;
  };
  let txs: TokenTx[] = [];
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;
  const toTokenTxArray = (arr: unknown): TokenTx[] =>
    Array.isArray(arr)
      ? arr
          .map((v) => (isRecord(v) ? (v as Record<string, unknown>) : null))
          .filter((v): v is Record<string, unknown> => !!v)
          .map((v) => ({
            to: typeof v.to === "string" ? v.to : undefined,
            tokenID: typeof v.tokenID === "string" ? v.tokenID : undefined,
            tokenId: typeof v.tokenId === "string" ? v.tokenId : undefined,
            timeStamp:
              typeof v.timeStamp === "string" ? v.timeStamp : undefined,
          }))
      : [];
  try {
    const v2Url = `https://api.etherscan.io/v2/api?${v2Params.toString()}`;
    const v2Res = await fetch(v2Url, { next: { revalidate: 10 } });
    const v2Data = (await v2Res.json().catch(() => null)) as unknown;
    if (isRecord(v2Data)) {
      const result = (v2Data as Record<string, unknown>).result;
      txs = toTokenTxArray(result);
    }
  } catch {}

  // Fallback to Basescan if empty
  if (txs.length === 0) {
    try {
      const apiBase = isBaseMainnet
        ? "https://api.basescan.org/api"
        : "https://api-sepolia.basescan.org/api";
      const qs = new URLSearchParams({
        module: "account",
        action: "tokennfttx",
        contractaddress: contractAddress,
        address,
        page: "1",
        offset: "50",
        sort: "desc",
      });
      if (apiKey) qs.set("apikey", apiKey);
      const url = `${apiBase}?${qs.toString()}`;
      const res = await fetch(url, { next: { revalidate: 10 } });
      const data = (await res.json().catch(() => null)) as unknown;
      if (isRecord(data)) {
        const result = (data as Record<string, unknown>).result;
        txs = toTokenTxArray(result);
      }
    } catch {}
  }

  // Collect tokenIds received by this wallet
  const mine = txs.filter(
    (t) => String(t?.to).toLowerCase() === String(address).toLowerCase()
  );
  const seen = new Set<string>();
  const tokenIds: string[] = [];
  const tokenIdToTime: Record<string, number> = {};
  for (const t of mine) {
    const id = String((t.tokenID as unknown as string) ?? (t.tokenId as unknown as string) ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    tokenIds.push(id);
    const ts = t?.timeStamp ? Number(t.timeStamp) : undefined;
    if (typeof ts === "number" && !Number.isNaN(ts)) {
      tokenIdToTime[id] = ts; // seconds since epoch
    }
  }

  // Resolve tokenURI via RPC
  const rpcUrl = isBaseMainnet
    ? process.env.BASE_RPC_URL
    : process.env.BASE_SEPOLIA_RPC_URL;
  const chain = isBaseMainnet ? base : baseSepolia;
  const fallbackRpc = chain.rpcUrls.default?.http?.[0];
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl || fallbackRpc),
  });

  const abi = [
    {
      type: "function",
      stateMutability: "view",
      name: "tokenURI",
      inputs: [{ name: "tokenId", type: "uint256" }],
      outputs: [{ name: "", type: "string" }],
    },
  ] as const;

  const items: { image: string; time?: number }[] = [];
  for (const id of tokenIds) {
    try {
      const uri = await client.readContract({
        address: contractAddress as Address,
        abi,
        functionName: "tokenURI",
        args: [BigInt(id)],
      });
      const metaUrl = ipfsToHttp(String(uri));
      const metaRes = await fetch(metaUrl, { next: { revalidate: 60 } });
      const meta = (await metaRes.json().catch(() => null)) as unknown;
      const getImage = (m: unknown): string => {
        if (m && typeof m === "object") {
          const r = m as Record<string, unknown>;
          if (typeof r.image === "string") return r.image;
        }
        return "";
      };
      const img = ipfsToHttp(getImage(meta));
      if (img) items.push({ image: img, time: tokenIdToTime[id] });
    } catch {}
  }

  return NextResponse.json({ items, count: items.length });
}
