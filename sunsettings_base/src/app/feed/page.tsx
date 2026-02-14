"use client";

export const dynamic = "force-dynamic";

// Feed temporarily disabled - commented out to prevent unnecessary API calls
// import Feed from "@/components/feed/Feed";

export default function FeedPage() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center opacity-60">
        <p className="text-lg">Feed coming soon</p>
      </div>
    </div>
  );
  // return (
  //   <div className="h-full w-full">
  //     <Feed />
  //   </div>
  // );
}
