// Event-aware replay: fires PreToolUse / PostToolUse / Stop through the policy in transcript order,
// honouring each policy's match.events. Prints denies and instructs (and, with --all, every call).
// usage: node replay-events.mjs [--all] [--stop-only] <transcript.jsonl>...
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registry } from "./stub.mjs";
await import("./policy.mjs");

const args = process.argv.slice(2);
const all = args.includes("--all");
const stopOnly = args.includes("--stop-only");
const dir = mkdtempSync(join(tmpdir(), "replay-ev-"));
const tmp = join(dir, "partial.jsonl");

async function fire(event, ctx) {
  const out = [];
  for (const p of registry) {
    if (!(p.match?.events ?? []).includes(event)) continue;
    const r = await p.fn({ eventType: event, ...ctx });
    if (r?.decision === "deny" || r?.decision === "instruct") out.push({ name: p.name, ...r });
  }
  return out;
}
const show = (tag, verdicts) =>
  verdicts.map((v) => `      ${v.decision === "deny" ? "DENY" : "INSTRUCT"} ${v.name}: ${String(v.reason).replace(/\s+/g, " ").slice(0, 260)}`).join("\n");

const summary = [];
for (const f of args.filter((a) => !a.startsWith("--"))) {
  const lines = readFileSync(f, "utf8").split("\n");
  const name = f.split("/").pop().replace(/-claude-2026-09-27T/, " ").slice(0, 14);
  console.log(`\n=== ${name}`);
  const toolUses = new Map();
  let counts = { deny: 0, instruct: 0, stop: "allow" };
  for (let i = 0; i < lines.length && !stopOnly; i++) {
    let row;
    try { row = JSON.parse(lines[i]); } catch { continue; }
    for (const b of Array.isArray(row?.message?.content) ? row.message.content : []) {
      if (b.type === "tool_use" && b.name.startsWith("mcp__legal__")) {
        toolUses.set(b.id, b);
        writeFileSync(tmp, lines.slice(0, i).join("\n"));
        const v = await fire("PreToolUse", { toolName: b.name, toolInput: b.input, session: { transcriptPath: tmp }, payload: { transcript_path: tmp } });
        counts.deny += v.filter((x) => x.decision === "deny").length;
        const tool = b.name.replace("mcp__legal__", "");
        if (v.length || (all && !/^(get_|list_|search_|lookup_)/.test(tool))) console.log(`  pre  ${tool}${v.length ? "\n" + show("pre", v) : ""}`);
      }
      if (b.type === "tool_result" && toolUses.has(b.tool_use_id)) {
        const u = toolUses.get(b.tool_use_id);
        writeFileSync(tmp, lines.slice(0, i + 1).join("\n"));
        const v = await fire("PostToolUse", { toolName: u.name, toolInput: u.input, session: { transcriptPath: tmp }, payload: { transcript_path: tmp, tool_response: b.content } });
        counts.instruct += v.filter((x) => x.decision === "instruct").length;
        if (v.length) console.log(`  post ${u.name.replace("mcp__legal__", "")} ${u.input?.document_id ?? ""}\n${show("post", v)}`);
      }
    }
  }
  // Stop: the full transcript, a fresh session id so the retry cap starts at 0.
  writeFileSync(tmp, lines.join("\n"));
  const sid = `replay-${Math.random().toString(36).slice(2)}`;
  const v = await fire("Stop", { session: { transcriptPath: tmp, sessionId: sid }, payload: { transcript_path: tmp, session_id: sid, stop_hook_active: false } });
  if (v.length) counts.stop = "DENY";
  console.log(`  STOP ${v.length ? "\n" + show("stop", v) : "allow"}`);
  summary.push(`${name.padEnd(16)} pre-denies ${String(counts.deny).padStart(2)}  instructs ${String(counts.instruct).padStart(2)}  stop ${counts.stop}`);
}
console.log("\n--- summary\n" + summary.join("\n"));
