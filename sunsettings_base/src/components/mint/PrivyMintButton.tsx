"use client";

import * as React from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { Button } from "@/components/ui/button";
import { encodeFunctionData, type Abi } from "viem";
import { base, baseSepolia } from "viem/chains";

export function PrivyMintButton({
  contractAddress,
  metaCid,
  recipientAddress,
  chainId,
  onSuccess,
  onError,
}: {
  contractAddress: `0x${string}`;
  metaCid: string;
  recipientAddress: string;
  chainId: number;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}) {
  const { client } = useSmartWallets();
  const [minting, setMinting] = React.useState(false);
  const [txHash, setTxHash] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const mintFn = process.env.NEXT_PUBLIC_SUNSET_NFT_MINT_FUNCTION?.trim() || "safeMint";
  
  const mintAbi = [
    {
      type: "function",
      stateMutability: "nonpayable",
      name: mintFn,
      inputs: [
        { name: "to", type: "address" },
        { name: "tokenURI", type: "string" },
      ],
      outputs: [],
    },
  ] as const satisfies Abi;

  const handleMint = async () => {
    if (!client) {
      setError("Smart wallet not initialized");
      return;
    }

    setMinting(true);
    setError(null);
    setTxHash(null);

    try {
      // Encode the function call
      const data = encodeFunctionData({
        abi: mintAbi,
        functionName: mintFn,
        args: [recipientAddress as `0x${string}`, `ipfs://${metaCid}`],
      });

      // Determine the chain
      const chain = chainId === 8453 ? base : baseSepolia;

      // Send transaction using Privy's smart wallet client
      // This will automatically use the paymaster configured in Privy Dashboard
      const hash = await client.sendTransaction({
        chain,
        to: contractAddress,
        data,
        value: BigInt(0),
      });

      setTxHash(hash);
      onSuccess?.(hash);

      // Dispatch success event for UI updates
      try {
        window.dispatchEvent(
          new CustomEvent("sunsettings:nftMinted", {
            detail: {
              txHash: hash,
              metadataCid: metaCid,
            },
          })
        );
      } catch {}
    } catch (err) {
      const errorMsg = (err as Error)?.message || "Minting failed";
      setError(errorMsg);
      onError?.(err as Error);
      console.error("Mint error:", err);
    } finally {
      setMinting(false);
    }
  };

  if (txHash) {
    const explorerUrl = chainId === 8453
      ? `https://basescan.org/tx/${txHash}`
      : `https://sepolia.basescan.org/tx/${txHash}`;

    return (
      <div className="space-y-2">
        <div className="text-sm text-green-600">Minted successfully!</div>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline"
        >
          View on explorer
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleMint}
        disabled={minting}
        className="w-full border-2 border-black"
      >
        {minting ? "Minting..." : "Mint (gas covered)"}
      </Button>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
