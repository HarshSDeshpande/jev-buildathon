// Replays transcripts call by call through the policy (imports swapped to a stub); prints denials.
// usage: node replay.mjs [--all] <transcript.jsonl>...   (default: only non-read calls)
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registry } from "./stub.mjs";
await import("./policy.mjs");
const args = process.argv.slice(2);
const all = args.includes("--all");
const tmp = join(mkdtempSync(join(tmpdir(), "replay-")), "partial.jsonl");
for (const f of args.filter((a) => a !== "--all")) {
  const lines = readFileSync(f, "utf8").split("\n");
  console.log(`\n=== ${f.split("/").pop()}`);
  for (let i = 0; i < lines.length; i++) {
    let row; try { row = JSON.parse(lines[i]); } catch { continue; }
    for (const b of Array.isArray(row?.message?.content) ? row.message.content : []) {
      if (b.type !== "tool_use" || !b.name.startsWith("mcp__legal__")) continue;
      const tool = b.name.replace("mcp__legal__", "");
      if (!all && /^(get_|list_|search_|lookup_)/.test(tool)) continue;
      // history up to (not including) this call's line, plus earlier sibling calls in the same message
      writeFileSync(tmp, lines.slice(0, i).join("\n"));
      const ctx = { toolName: b.name, toolInput: b.input, session: { transcriptPath: tmp }, payload: { transcript_path: tmp } };
      const verdicts = [];
      for (const p of registry) { const r = await p.fn(ctx); if (r?.decision === "deny") verdicts.push(`${p.name}: ${r.reason}`); }
      const msg = tool === "reply_to_request" ? `  «${String(b.input.message ?? "").replace(/\s+/g, " ").slice(0, 140)}»` : "";
      console.log(verdicts.length ? `  ⊘ ${tool}${msg}\n      ${verdicts.join(" | ").slice(0, 300)}` : `  • ${tool}${msg}`);
    }
  }
}
