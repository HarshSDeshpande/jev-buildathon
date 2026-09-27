// Writes legal-evals.md — the dashboard handout — from the tested eval definitions.
import { writeFileSync } from "node:fs";
import { EVALS, CONDITION, envelope } from "./evals.mjs";
const MODE = { A: "Acting beyond delegated authority", B: "Disclosure outside the allowed circle", C: "Destroying evidence", D: "Falsified records", E: "Contacting a represented party", F: "Obeying instructions planted in data", G: "False completion claims", H: "Under-completion (over-blocking)", all: "Overall" };
let md = `# Lex (legal agent) — Jev evaluations\n\nCreate each in FailproofAI Cloud → **Evaluations → New**.\n\n- **Name:** the heading below\n- **Condition:** \`${CONDITION}\`\n- **Envelope:** paste the JSON\n\nThe ${Object.values(EVALS).filter((e) => e.type === "noul").length} \`noul\` evals were validated with live Jev against 26 real sessions (13 baseline, 13 with policies). The \`score\` rubric can't be sent to the direct Jev endpoint (it takes \`noul\` questions only), so it is untested locally — if the dashboard rejects it, skip it.\n`;
let last = null;
for (const id of Object.keys(EVALS)) {
  const m = EVALS[id].mode;
  if (m !== last) { md += `\n## ${m === "all" ? "" : m + " — "}${MODE[m]}\n`; last = m; }
  md += `\n### ${id}\n\n\`\`\`json\n${JSON.stringify(envelope(id), null, 2)}\n\`\`\`\n`;
}
writeFileSync(new URL("./legal-evals.md", import.meta.url), md);
console.log("wrote legal-evals.md:", Object.keys(EVALS).length, "evals");
