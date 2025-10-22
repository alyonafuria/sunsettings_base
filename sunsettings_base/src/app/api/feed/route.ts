import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, type Address, type Abi } from "viem";
import { base, baseSepolia } from "viem/chains";

function ipfsToHttp(uri: string): string {
  if (!uri) return "";
  return uri.startsWith("ipfs://")
    ? `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`
    : uri;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainIdParam = searchParams.get("chainId");
  const contract = searchParams.get("contract"); // optional override
  const exclude = (searchParams.get("exclude") || "").toLowerCase(); // optional address to exclude
  const page = Number(searchParams.get("page") || 1);
  const offset = Math.min(Number(searchParams.get("offset") || 10), 50); // cap to 50 per etherscan

  const apiKey =
    process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "";
  const requestedChainId = Number(chainIdParam || 8453);

  const TRANSFER_SIG =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const ZERO_PADDED =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  type LogEntry = {
    address: string;
    blockNumber: string;
    timeStamp?: string;
    topics: string[];
    data: string;
    transactionHash: string;
  };

  async function fetchEntriesForChain(chainId: number): Promise<{
    chainId: number;
    entries: { tokenId: string; to: string; time: number }[];
    contractAddress: string | null;
  }> {
    const isMainnet = chainId === 8453;
    const contractAddress =
      contract ||
      (isMainnet
        ? process.env.NEXT_PUBLIC_SUNSET_BASE_NFT_CONTRACT_ADDRESS
        : process.env.NEXT_PUBLIC_SUNSET_SEPOLIA_NFT_CONTRACT_ADDRESS) ||
      null;
    if (!contractAddress) {
      return { chainId, entries: [], contractAddress: null };
    }

    const apiBase = isMainnet
      ? "https://api.basescan.org/api"
      : "https://api-sepolia.basescan.org/api";

    const qs = new URLSearchParams({
      module: "logs",
      action: "getLogs",
      address: contractAddress,
      fromBlock: "0",
      toBlock: "latest",
      topic0: TRANSFER_SIG,
      topic1: ZERO_PADDED,
      page: String(page),
      offset: String(offset),
      sort: "desc",
    });
    if (apiKey) qs.set("apikey", apiKey);

    let logs: LogEntry[] = [];
    try {
      const url = `${apiBase}?${qs.toString()}`;
      const res = await fetch(url, { next: { revalidate: 10 } });
      const data = await res.json();
      logs = Array.isArray(data?.result) ? (data.result as LogEntry[]) : [];
    } catch {}

    const entries: { tokenId: string; to: string; time: number }[] = [];
    for (const l of logs) {
      const toTopic = l.topics?.[2] || "";
      const idTopic = l.topics?.[3] || "";
      const to =
        toTopic.length === 66 ? `0x${toTopic.slice(26)}`.toLowerCase() : "";
      const tokenId = idTopic ? BigInt(idTopic).toString() : "";
      if (!tokenId) continue;
      if (exclude && to === exclude) continue;
      let time = Math.floor(Date.now() / 1000);
      if (l.timeStamp) {
        const ts = String(l.timeStamp);
        time = ts.startsWith("0x") ? parseInt(ts, 16) : Number(ts);
      }
      entries.push({ tokenId, to, time });
    }

    return { chainId, entries, contractAddress };
  }

  // Try requested chain first, then fallback to the other Base network
  const primary = await fetchEntriesForChain(requestedChainId);
  const fallbackChainId = requestedChainId === 8453 ? 84532 : 8453;
  const secondary =
    primary.entries.length > 0
      ? null
      : await fetchEntriesForChain(fallbackChainId);
  const chosen =
    secondary && secondary.entries.length > 0 ? secondary : primary;
  let entries = chosen.entries;
  const chosenChainId = chosen.chainId;
  const chosenContract = chosen.contractAddress;

  // Fallback: if logs API returned nothing, try tokennfttx (contract-wide transfers)
  if (entries.length === 0 && chosenContract) {
    type Tx = {
      from?: string;
      to?: string;
      tokenID?: string;
      tokenId?: string;
      timeStamp?: string | number;
    };
    const isMainnet = chosenChainId === 8453;
    // First try Etherscan V2 (supports chainid)
    const v2 = new URLSearchParams({
      chainid: String(chosenChainId),
      module: "account",
      action: "tokennfttx",
      contractaddress: chosenContract,
      page: String(page),
      offset: String(offset),
      sort: "desc",
    });
    if (apiKey) v2.set("apikey", apiKey);
    let txs: Tx[] = [];
    try {
      const url = `https://api.etherscan.io/v2/api?${v2.toString()}`;
      const res = await fetch(url, { next: { revalidate: 10 } });
      const data = await res.json();
      if (Array.isArray(data?.result)) txs = data.result as Tx[];
    } catch {}
    if (txs.length === 0) {
      // Try Basescan
      try {
        const apiBase = isMainnet
          ? "https://api.basescan.org/api"
          : "https://api-sepolia.basescan.org/api";
        const qs = new URLSearchParams({
          module: "account",
          action: "tokennfttx",
          contractaddress: chosenContract,
          page: String(page),
          offset: String(offset),
          sort: "desc",
        });
        if (apiKey) qs.set("apikey", apiKey);
        const url = `${apiBase}?${qs.toString()}`;
        const res = await fetch(url, { next: { revalidate: 10 } });
        const data = await res.json();
        txs = Array.isArray(data?.result) ? (data.result as Tx[]) : [];
      } catch {}
    }
    if (txs.length > 0) {
      const ZERO = "0x0000000000000000000000000000000000000000";
      const mints = txs.filter((t) => String(t?.from).toLowerCase() === ZERO);
      const seen = new Set<string>();
      const next: { tokenId: string; to: string; time: number }[] = [];
      for (const t of mints) {
        const id = String(t?.tokenID ?? t?.tokenId ?? "");
        if (!id || seen.has(id)) continue;
        const to = String(t?.to || "").toLowerCase();
        if (exclude && to === exclude) continue;
        seen.add(id);
        const ts = String(t?.timeStamp ?? "");
        const time = ts
          ? ts.startsWith("0x")
            ? parseInt(ts, 16)
            : Number(ts)
          : Math.floor(Date.now() / 1000);
        next.push({ tokenId: id, to, time });
      }
      entries = next;
    }
  }
  const isBaseMainnet = chosenChainId === 8453;

  // Resolve tokenURI -> image
  const rpcUrl = isBaseMainnet
    ? process.env.BASE_RPC_URL
    : process.env.BASE_SEPOLIA_RPC_URL;
  const chain = isBaseMainnet ? base : baseSepolia;
  type RpcUrls = { default?: { http?: readonly string[] } };
  const fallbackRpc = (chain.rpcUrls as unknown as RpcUrls).default?.http?.[0];
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
  ] as const satisfies Abi;

  const items: {
    id: string;
    image: string;
    author: string;
    time: number;
    locationLabel?: string;
  }[] = [];
  for (const e of entries) {
    try {
      const uri = await client.readContract({
        address: chosenContract as Address,
        abi,
        functionName: "tokenURI",
        args: [BigInt(e.tokenId)],
      });
      const metaUrl = ipfsToHttp(String(uri));
      const metaRes = await fetch(metaUrl, { next: { revalidate: 60 } });
      const meta = await metaRes.json();
      const img = ipfsToHttp(String(meta?.image || ""));
      // Attempt to resolve a human-friendly location label from metadata
      let locationLabel: string | undefined;
      type MetaAttr = {
        trait_type?: string;
        traitType?: string;
        key?: string;
        value?: unknown;
        display_value?: unknown;
      };
      const attrs: MetaAttr[] = Array.isArray(meta?.attributes)
        ? (meta.attributes as MetaAttr[])
        : [];
      const fromAttributes = attrs.find((a: MetaAttr) => {
        const key = String(
          a?.trait_type || a?.traitType || a?.key || ""
        ).toLowerCase();
        return /location|place|city|neighborhood|area/.test(key);
      });
      if (
        fromAttributes &&
        (fromAttributes.value || fromAttributes?.display_value)
      ) {
        locationLabel = String(
          fromAttributes.value ?? fromAttributes.display_value ?? ""
        );
      }
      locationLabel =
        String(
          meta?.location_label ||
            meta?.locationLabel ||
            meta?.location ||
            meta?.properties?.location ||
            locationLabel ||
            ""
        ) || undefined;

      if (img)
        items.push({
          id: e.tokenId,
          image: img,
          author: e.to,
          time: e.time,
          locationLabel,
        });
    } catch {}
  }

  // Items in this page; caller can increment page to get more
  return NextResponse.json({
    items,
    page,
    count: items.length,
    hasMore: items.length === offset, // heuristic
  });
}
