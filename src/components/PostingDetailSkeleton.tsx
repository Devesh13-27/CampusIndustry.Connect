import { SkeletonBar } from "./Skeleton";

export default function PostingDetailSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-14 border-b border-slate-200 bg-white" />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <SkeletonBar className="h-4 w-24" />

        <div className="card mt-3 space-y-3 p-5 sm:p-6">
          <SkeletonBar className="h-6 w-2/3 max-w-64" />
          <SkeletonBar className="h-4 w-full max-w-xl" />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-5 lg:gap-6">
          <div className="space-y-3 lg:col-span-2">
            <SkeletonBar className="h-4 w-40" />
            <SkeletonBar className="h-24 w-full rounded-xl" />
            <SkeletonBar className="h-24 w-full rounded-xl" />
          </div>

          <div className="lg:col-span-3">
            <SkeletonBar className="h-[360px] w-full rounded-xl sm:h-[440px]" />
          </div>
        </div>
      </main>
    </div>
  );
}