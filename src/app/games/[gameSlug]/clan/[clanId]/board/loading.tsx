"use client";

import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

const panel = "space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6";

function PostRows() {
  return <div className="divide-y divide-border">{[0, 1, 2, 3].map((row) =>
    <div key={row} className="flex items-center gap-3 py-5">
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-32" /></div>
      <Skeleton className="h-7 w-14 shrink-0" />
    </div>)}
  </div>;
}

export default function BoardLoading() {
  const [section = "notices", postId] = usePathname().split("/board/")[1]?.split("/") ?? [];
  return <div aria-busy="true" aria-label="게시판 로딩" className="min-h-full space-y-5">
    <p role="status" className="sr-only">게시글을 불러오는 중…</p>
    <div aria-hidden="true" className="space-y-5">
      {postId ? <>
        <Skeleton className="h-10 w-36" />
        <div className={panel}>
          <Skeleton className="h-8 w-3/4" /><Skeleton className="h-3 w-40" />
          <div className="min-h-64 space-y-4 border-t border-border pt-6"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></div>
        </div>
        <div className={panel}><Skeleton className="h-5 w-24" /><PostRows /></div>
      </> : section === "notices" ? <>
        <div className={panel}>
          <Skeleton className="h-5 w-24" /><Skeleton className="h-52 w-full rounded-xl" />
          <div className="flex justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-20" /></div>
        </div>
        <div className={panel}>
          <div className="flex justify-between"><Skeleton className="h-5 w-24" /><Skeleton className="h-8 w-24" /></div>
          <PostRows />
        </div>
      </> : <>
        <div className="flex items-center justify-between gap-4"><Skeleton className="h-6 w-32" /><Skeleton className="h-9 w-24" /></div>
        {section === "channels" || section === "memories" ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((card) =>
          <div key={card} className={panel}><Skeleton className="aspect-[4/3] w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-24" /></div>)}
        </div> : <div className={panel}><PostRows /></div>}
      </>}
    </div>
  </div>;
}
