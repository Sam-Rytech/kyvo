export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-xl animate-pulse motion-reduce:animate-none">
      <div className="h-64 bg-tertiary w-full" />
      <div className="h-40 bg-tertiary w-full" />
    </div>
  );
}
