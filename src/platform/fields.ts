import type { FieldDef } from "./types";

type Opts = Omit<FieldDef, "kind" | "options">;

/**
 * Field constructors. A plugin adds a field type by exporting one of these
 * plus a renderer registered in `components/field-renderers.tsx`.
 */
export const field = {
  id: (o: Opts = {}): FieldDef => ({ kind: "id", readOnly: true, ...o }),
  text: (o: Opts = {}): FieldDef => ({ kind: "text", ...o }),
  number: (o: Opts = {}): FieldDef => ({ kind: "number", ...o }),
  money: (o: Opts & { currency?: string } = {}): FieldDef => ({
    kind: "money",
    currency: "USD",
    ...o,
  }),
  enum: (options: readonly string[], o: Opts = {}): FieldDef => ({
    kind: "enum",
    options,
    ...o,
  }),
  datetime: (o: Opts = {}): FieldDef => ({ kind: "datetime", ...o }),
  boolean: (o: Opts = {}): FieldDef => ({ kind: "boolean", ...o }),
  /** Plugin-style field type: browser Geolocation API on the input side. */
  geolocation: (o: Opts = {}): FieldDef => ({ kind: "geolocation", ...o }),
};
