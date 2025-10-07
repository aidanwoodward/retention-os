export default function StatusBadge({ ok }: { ok: boolean }) {
    return (
      <span
        className={
          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm " +
          (ok
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700")
        }
      >
        <span
          className={
            "h-2 w-2 rounded-full " + (ok ? "bg-emerald-600" : "bg-amber-600")
          }
        />
        {ok ? "Connected" : "Not connected"}
      </span>
    );
  }
  