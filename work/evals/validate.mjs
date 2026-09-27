// Runs every eval in evals.mjs against real transcripts with live Jev and prints a verdict matrix.
// usage: node validate.mjs <transcript.jsonl>...
import { history, userPrompts, askJev } from "/home/harsh/jev-buildathon/policykit/index.mjs";
import { readFileSync } from "node:fs";
import { EVALS } from "./evals.mjs";

const cut = (v, n) => { const s = typeof v === "string" ? v : JSON.stringify(v); return s.length > n ? s.slice(0, n) + "…" : s; };
const strip = (r) => { if (r && typeof r === "object") { const { _env, ...rest } = r; return rest; } return r; };

/** The session as an eval sees it: prompt, every legal tool call with its outcome, final message. */
function sessionState(path) {
  const calls = history({ session: { transcriptPath: path } }).filter((c) => c.server === "legal").map((c) => {
    const r = c.result;
    const status = typeof r === "string" && /Policy \(LP-|hook|blocked/i.test(r) ? "blocked_by_policy" : r && typeof r === "object" && "error" in r ? "error" : r == null ? "no_result" : "executed";
    return { tool: c.tool, status, args: cut(c.args, 2000), result: cut(status === "blocked_by_policy" ? r : strip(r), 3500) };
  });
  let final = "";
  for (const line of readFileSync(path, "utf8").split("\n")) {
    try { const row = JSON.parse(line); if (row?.type === "assistant") for (const b of row.message?.content ?? []) if (b.type === "text" && b.text.trim()) final = b.text; } catch {}
  }
  return { operator_prompt: userPrompts({ session: { transcriptPath: path } }).join("\n"), tool_calls: calls, final_message: cut(final, 2500) };
}

// The direct Jev endpoint only takes noul questions; score rubrics are Cloud-dashboard only.
const ids = Object.keys(EVALS).filter((id) => EVALS[id].type === "noul");
const questions = Object.fromEntries(ids.map((id) => [id, { type: EVALS[id].type, instructions: EVALS[id].instructions, criteria: EVALS[id].criteria }]));
const col = (id) => `${EVALS[id].mode}:${id.replace("legal_", "").slice(0, 8)}`;

console.log(["session".padEnd(17), ...ids.map((id) => col(id).padStart(12))].join(""));
const files = process.argv.slice(2);
const rows = [];
// a few at a time, to be gentle on Jev
for (let i = 0; i < files.length; i += 4) {
  rows.push(...(await Promise.all(files.slice(i, i + 4).map(async (p) => {
    const name = p.split("/").pop().replace(/-claude-2026-09-27T/, " ").slice(0, 14);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const a = await askJev({ state: sessionState(p), questions, timeoutMs: 90000 });
        return [name.padEnd(17), ...ids.map((id) => {
          const v = a[id];
          const txt = typeof v === "number" ? (EVALS[id].type === "score" ? `L${v}` : v.toFixed(2)) : "—";
          return (txt + (EVALS[id].type === "noul" && v > 0.5 ? "*" : " ")).padStart(12);
        })].join("");
      } catch (e) {
        if (attempt === 2) return name.padEnd(17) + " ERROR " + String(e).slice(0, 140);
      }
    }
  }))));
}
rows.forEach((r) => console.log(r));
