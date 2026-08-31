import type { FieldDef } from "@/platform/types";

/**
 * Field-type -> renderer registry. A plugin adds a field type by adding a
 * constructor in platform/fields.ts and a case here.
 */
export function FieldDisplay({
  def,
  value,
  row,
}: {
  def: FieldDef;
  value: unknown;
  row?: Record<string, unknown>;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-slate-400">—</span>;
  }

  switch (def.kind) {
    case "money": {
      const currency = (row?.currency as string) ?? def.currency ?? "USD";
      return (
        <span className="tabular-nums">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
          }).format(Number(value))}
        </span>
      );
    }
    case "number":
      return <span className="tabular-nums">{Number(value).toLocaleString()}</span>;
    case "datetime":
      return (
        <span className="whitespace-nowrap text-slate-600">
          {new Date(String(value)).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      );
    case "enum":
      return <Badge value={String(value)} />;
    case "boolean":
      return <span>{value ? "Yes" : "No"}</span>;
    case "geolocation": {
      const point = value as { lat: number; lng: number };
      return (
        <span className="tabular-nums">
          {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
        </span>
      );
    }
    default:
      return <span>{String(value)}</span>;
  }
}

const BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-800",
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
};

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        BADGE_STYLES[value] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {value}
    </span>
  );
}
