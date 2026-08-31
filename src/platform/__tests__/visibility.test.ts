import { describe, expect, it } from "vitest";
import { applyFieldVisibility } from "../server";
import { field } from "../fields";
import type { AppConfig } from "../types";
import type { User } from "../users";

const app = {
  slug: "t",
  name: "T",
  source: {} as AppConfig["source"],
  access: { view: ["agent"] },
  fields: {
    id: field.id(),
    name: field.text(),
    email: field.text({ visibleTo: ["lead"], mask: true }),
    internal_note: field.text({ visibleTo: ["lead"] }),
  },
  list: { columns: ["name"] },
} satisfies AppConfig;

const agent: User = { id: "1", name: "Agent", roles: ["agent"] };
const lead: User = { id: "2", name: "Lead", roles: ["agent", "lead"] };
const row = { id: 1, name: "Ana", email: "ana@example.com", internal_note: "vip" };

describe("applyFieldVisibility", () => {
  // Masked values must not be present in the payload at all: hiding them in
  // the UI while shipping them in the JSON is a compliance finding.
  it("replaces masked values and drops restricted ones for unprivileged users", () => {
    const result = applyFieldVisibility(app, agent, row);
    expect(result.email).toBe("••••••••");
    expect(result).not.toHaveProperty("internal_note");
    expect(result.name).toBe("Ana");
  });

  it("returns everything to a privileged user", () => {
    expect(applyFieldVisibility(app, lead, row)).toEqual(row);
  });
});
