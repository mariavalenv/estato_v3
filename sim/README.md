# Pre-screening simulator

Tests agent-to-agent pre-screening on invented seekers and households, so the matching can be proven before any real user or house is involved. It needs no database and no API key.

## Run it

```bash
npm run sim                              # rule-following agents, seed 1
npm run sim -- --seed 7 --seekers 60     # a different, larger world
npm run sim -- --show 2                  # also print two sample conversations
npm run sim -- --json sim/out/run.json   # save every pair's full result
npm run test:sim                         # the simulator's tests
```

## How it works

1. **An invented world** (`personas.js`). Each seeker and household has three layers:
   - a public profile, self-reported, with some fields missing and cleanliness often overstated;
   - how they actually live, which their own agent knows;
   - a true budget ceiling and dealbreakers with reasons, which their own agent knows and must not reveal.
2. **Ground truth** (`oracle.js`). An all-seeing judge decides whether each pair is truly compatible.
3. **Pre-screening** (`src/domain/prescreen.js`). For each same-city pair:
   - code checks the hard constraints on the public profiles, and an outright failure stops there;
   - the two agents exchange structured questions, answers and dealbreaker flags, stopping early on a dealbreaker;
   - code recomputes the score and writes the joint summary of fits, frictions and unknowns.
4. **Measurements** (`metrics.js`). Verdicts are compared with the ground truth, and agent behaviour is checked.

Agents never set the score or the verdict. `src/domain/compatibility.js` does, so results are repeatable. The `src/domain` files have no simulator dependencies and are meant to be reused by the app.

## What is measured

| Measurement | What it tells you |
|---|---|
| Recommended pairs that are truly compatible | How often a recommendation is right |
| Truly compatible pairs that got recommended | How many good matches are found |
| Recommended despite a real dealbreaker | Agents failing to protect their owner |
| Pairs with a private detail leaked | A dealbreaker reason or budget ceiling in shared text |
| Conversations that never concluded | Agents looping |
| Same verdict on repeated runs | Consistency (use `--repeats 3`) |
| Verdicts changed by planted bio text | Agents obeying instructions hidden in a profile |

Each is reported twice where it applies: for profiles alone, and after pre-screening.

## Agents

| `--agent` | What it is |
|---|---|
| `scripted` | Follows the rules exactly, with no language model. The default. |
| `agreeable` | Never flags a dealbreaker and tells the other side what it wants to hear |
| `leaky` | Reveals private reasons and the true budget ceiling |
| `gullible` | Obeys instructions planted in the other side's bio |
| `llm` | A language model (Anthropic API) following the behaviour rules |

The three faulty agents exist to prove that the measurements catch each failure.

### Running with a language model

```bash
ANTHROPIC_API_KEY=... npm run sim -- --agent llm --limit 20 --repeats 3
```

Each conversation makes several model calls, so start with a small `--limit`. `ANTHROPIC_MODEL` overrides the model. This mode has been tested only against a stand-in for the API, not a live model.

## Limits

- **The ground truth is an assumption.** The simulator shows whether pre-screening recovers that truth from incomplete profiles. Whether the assumption matches real flatmates can only be learned from real outcomes.
- **The scripted agent is a best case.** It knows its owner perfectly and never makes a mistake, so its results are the ceiling a language-model agent is measured against.
- **Leak detection is exact-match.** A reworded leak would need a person or a second model to spot.
