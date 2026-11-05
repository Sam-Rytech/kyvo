export default function Loading() {
  return (
    <div className="space-y-xl animate-pulse">
      <div className="h-28 bg-tertiary rounded-xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="h-40 bg-tertiary rounded-xl" />
        <div className="h-40 bg-tertiary rounded-xl" />
        <div className="h-40 bg-tertiary rounded-xl" />
      </div>
      <div className="h-64 bg-tertiary rounded-xl" />
    </div>
  );
}
