# Reply eval

Checks that the clean-up replies stay short and usable after a change to the skill or the tool text. It runs headless Claude Code against this checkout's host and a stand-in browser (`fake-browser.mjs`), so no real tab is touched.

```shell
test/reply-eval/run.sh RECORD.json /tmp/reply-eval survey 19901 \
  "I have too many tabs open, help me clean up, survey only, don't close anything"
```

`RECORD.json` is any record written by `snapshot_tabs` (a real one makes the test realistic; it stays on your machine). Each run prints a JSON line and the final reply:

| Field | Healthy for a survey reply |
|---|---|
| `reply_lines` | about 4 to 7 |
| `reply_words` | about 60 to 130 |
| `questions` | 1 |
| `table`, `path_shown`, `headings` | false, false, 0 |
| `tools` | `start_tab_cleanup cluster_tabs ...`, never a bare `list_tabs` |

Cases used on 2026-10-12 (each run 2 to 3 times, since replies vary):

1. "I have too many tabs open, help me clean up, survey only, don't close anything"
2. "i have way too many tabs and it stresses me out. help", then "about 10 minutes. nothing im using right now"
3. "close my youtube tabs"

Before the reply rules, case 1 gave 17 lines, 368 words and a table in 35 s. After: 5 to 6 lines, 93 to 130 words, one question, no table, 12 to 23 s, over five runs.
