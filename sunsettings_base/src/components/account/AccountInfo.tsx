"use client";

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
}: {
  loading: boolean;
  avatarUrl?: string | null;
  wallet?: string | null;
  title?: string | null;
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
      <div className="mt-4 grid grid-cols-3" />
    </div>
  );
}
