export default function PageSkeleton() {
  return (
    <div className="flex h-screen flex-col">
      <div className="border-b border-[var(--color-line)] bg-white/80 px-5 py-4 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="cx-shimmer h-5 w-44 rounded-md" />
          <div className="cx-shimmer mt-2 h-3 w-72 rounded-md" />
        </div>
      </div>
      <div className="flex-1 px-5 py-6 lg:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="cx-card p-4">
                <div className="cx-shimmer h-3 w-20 rounded-md" />
                <div className="cx-shimmer mt-2 h-6 w-16 rounded-md" />
              </div>
            ))}
          </div>
          <div className="cx-card p-5">
            <div className="cx-shimmer h-4 w-40 rounded-md" />
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="cx-shimmer h-9 rounded-xl" />)}
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="cx-card p-5">
                <div className="cx-shimmer h-4 w-1/2 rounded-md" />
                <div className="cx-shimmer mt-2.5 h-3 w-3/4 rounded-md" />
                <div className="cx-shimmer mt-2 h-3 w-2/3 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
