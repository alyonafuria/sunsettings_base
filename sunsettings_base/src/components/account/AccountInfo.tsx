"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  return (
    <div className="w-full h-full p-4">
      <div className="flex items-center gap-4">
        {loading ? (
          <Skeleton className="h-16 w-16 rounded-full" />
        ) : (
          <Avatar className="h-16 w-16">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="avatar" /> : null}
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 space-y-2">
          {loading ? (
            <Skeleton className="h-4 w-1/3" />
          ) : (
            <div className="text-base font-semibold truncate">{wallet || ""}</div>
          )}
          {loading ? (
            <Skeleton className="h-3 w-1/2" />
          ) : (
            <div className="text-sm opacity-80">{title || "sunset catcher"}</div>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3" />
    </div>
  );
}
