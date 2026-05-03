export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}
