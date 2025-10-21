"use client";

import * as React from "react";
import AccountInfo from "@/components/account/AccountInfo";
import Gallery from "@/components/account/Gallery";

export default function AccountPage() {
  const [loading, setLoading] = React.useState(true);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [wallet, setWallet] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<string[]>([]);

  React.useEffect(() => {
    // TODO: Replace with wallet connect + fetch NFTs for this address
    const t = window.setTimeout(() => setLoading(false), 400);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Top section: 30% of viewport height */}
      <div className="h-[20vh]">
        <AccountInfo loading={loading} avatarUrl={avatarUrl} wallet={wallet} title={"sunset catcher"} />
      </div>

      {/* Bottom gallery: fills remaining space */}
      <div className="flex-1">
        <Gallery items={items} />
      </div>
    </div>
  );
}
