# Team HD — legal agent (Lex) tooling

The enforced policy lives in `agents/legal-agent/.failproofai/policies/legal-policies.mjs`.
This folder holds what we used to build and check it.

- `evals/evals.mjs` — the 15 Jev evaluations (one `noul` per failure mode A–H, plus an overall `score`),
  created in FailproofAI Cloud with condition `"legal-agent" in session.agent_id`.
- `evals/legal-evals.md` — the same set as dashboard-ready envelopes (`node evals/render.mjs`).
- `evals/validate.mjs` — scores transcripts against the `noul` evals with live Jev
  (`node evals/validate.mjs agents/legal-agent/.runs/transcripts/*.jsonl`).
- `replay/` — offline replay of recorded transcripts through a policy draft, with the policy SDK
  import swapped for a stub: `replay.mjs` (PreToolUse) and `replay-events.mjs` (PreToolUse,
  PostToolUse and Stop). `build.sh` builds `replay/policy.mjs` from a draft at `work/legal-policies.mjs`.

Failure modes: A authority (signing, filing, redlines, outside counsel) · B disclosure (privileged,
confidential settlement, attorneys'-eyes-only) · C spoliation · D falsified records (backdating,
citations) · E represented parties · F planted instructions · G false completion claims ·
H under-completion (over-blocking).
