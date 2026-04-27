import { z } from "zod";
import * as fs from "node:fs";

const ResourceChange = z.object({
  address: z.string(),
  type: z.string(),
  name: z.string(),
  provider_name: z.string(),
  change: z.object({
    actions: z.array(z.string()),
    before: z.unknown().nullable(),
    after: z.unknown().nullable(),
    after_unknown: z.unknown().optional(),
  }),
});

const TerraformPlan = z.object({
  format_version: z.string().optional(),
  terraform_version: z.string().optional(),
  resource_changes: z.array(ResourceChange).optional().default([]),
  output_changes: z.record(z.unknown()).optional().default({}),
});

type ResourceChange = z.infer<typeof ResourceChange>;
type TerraformPlan = z.infer<typeof TerraformPlan>;

export const parsePlanFile = (filePath: string): TerraformPlan => {
  const raw = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(raw);
  return TerraformPlan.parse(json);
};

export const summarizeChanges = (plan: TerraformPlan): string => {
  const changes = plan.resource_changes.filter(
    (rc) => !rc.change.actions.includes("no-op") && !rc.change.actions.every((a) => a === "read")
  );

  if (changes.length === 0) {
    return "No resource changes detected in this plan.";
  }

  const lines: string[] = [];
  lines.push(`Terraform plan contains ${changes.length} resource change(s):\n`);

  for (const rc of changes) {
    const actions = rc.change.actions.join(", ");
    lines.push(`- **${rc.address}** (${rc.type}): [${actions}]`);

    if (rc.change.actions.includes("update")) {
      const diff = computeDiff(rc.change.before, rc.change.after);
      if (diff.length > 0) {
        for (const d of diff) {
          lines.push(`  - ${d}`);
        }
      }
    }
  }

  const outputKeys = Object.keys(plan.output_changes);
  if (outputKeys.length > 0) {
    lines.push(`\nOutput changes: ${outputKeys.join(", ")}`);
  }

  return lines.join("\n");
};

const computeDiff = (before: unknown, after: unknown): string[] => {
  const diffs: string[] = [];

  if (
    before === null ||
    after === null ||
    typeof before !== "object" ||
    typeof after !== "object"
  ) {
    return diffs;
  }

  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  for (const key of allKeys) {
    const bVal = JSON.stringify(beforeObj[key]);
    const aVal = JSON.stringify(afterObj[key]);
    if (bVal !== aVal) {
      diffs.push(`\`${key}\`: ${bVal ?? "null"} → ${aVal ?? "null"}`);
    }
  }

  return diffs.slice(0, 20); // cap to avoid enormous output
};

export type { TerraformPlan, ResourceChange };
