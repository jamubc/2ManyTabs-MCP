# Triage: sorting clusters into four buckets

These are starting heuristics. Nothing here was measured on people with hundreds of tabs; published tab studies mostly cover 5 to 20 tabs. When a rule and the user disagree, the user wins, and a repeated disagreement is a sign to drop the rule for that session.

Contents: the four buckets · signals · domain rules · sensitive sites · unsure clusters

## The four buckets

| Bucket | What it is | Usual outcome |
|---|---|---|
| **Clutter** | Duplicates, search-result pages, error and blank pages, finished reads, sign-in leftovers | Close after a confirmed batch |
| **Reference** | Might be useful, no action implied: docs, manuals, specs, recipes, "good to know" | Close, and rely on search. Save a link with a one-line reason only if the page is stable, hard to find again, or personal to the user |
| **Open loop** | Implies something the user must do: buy, apply, book, register, reply, fix, read on purpose | Next action + when, parked in their system, then close |
| **Live work** | In use today: the current project, pinned tabs, recent repos and docs | Leave open |

A big pile is mostly clutter and reference. Real open loops are few. If you find yourself with dozens, you are probably turning reference into tasks.

Saved links often go unread, and pages change (one study found about a quarter of revisited pages had changed within an hour). That is why reference defaults to "close and search later", not "bookmark everything".

## Signals

From `cluster_tabs` (flags on each cluster, and `signal` lists across clusters):

| Signal | Reads as |
|---|---|
| `dup` (a second copy of a link) | Clutter. Keep one copy. |
| `search` (a results page) | Clutter once the user has found what they wanted. Ask. |
| `error` (error, blank or "Problem loading page") | Clutter. |
| `pinned` | Live work. |
| Used in the last two days | Live-work candidate. Ask, do not assume. |
| Last used 30 days ago or more (`stale`) | Likely clutter or reference; a stale tab with a purchase or deadline in the title is worth a question. |
| `editing` (a docs editor, mail, or a page whose link ends in edit, compose, draft or new) | Mention in the confirmation and leave out unless named. It is a guess from the link, so it is a prompt to look, not proof of a draft. |
| In a browser tab group | The user already grouped it on purpose. Treat the group as a unit and ask about the group. |

Last-used times are a hint. A browser restart or session restore can reset them, and an older extension does not report them at all. If `cluster_tabs` says ages are unknown, or that most tabs share one last-used hour, ignore age completely.

From titles (words that suggest an action): cart, checkout, order, invoice, apply, application, book, appointment, register, deadline, renew, pull request, issue, "reply", "draft".

## Domain rules

- **Shopping** (product pages, carts, comparison): one question per product family. Compared-and-decided is clutter; "I still want one" is a loop. A cart tab is never checked out by you.
- **Jobs and applications**: usually loops; ask which are live.
- **Docs and reference sites**: reference. Close and search again unless the page is a stable personal essential.
- **Video and long articles** ("watch later" or "read later"): ask which ones they will actually watch or read in the next week, name those, and offer to close the rest. Treat the few they choose as loops with a when ("when I sit down with coffee Sunday"). A large unread pile is a wish list, not a list of tasks.
- **Code hosts** (GitHub, issue trackers): a recently used repo or PR is live work; an old issue or PR the user must still answer is a loop; a repo browsed for ideas is reference.
- **Social and news feeds**: clutter, unless the user says a specific thread matters.
- **Web mail, chat, calendar, docs editors**: assume live and unsaved state is possible. Ask before including them.

## Sensitive sites

Banking, health and clinic booking, email, password managers, government and tax, identity, and sign-in pages. For these: use titles and counts only, never `get_tab_text`, never `execute_script`. `cluster_tabs` hides titles for sites it recognises, but the list is incomplete (for example a clinic booking site on an unfamiliar domain). Apply the same care to anything that looks private even when it is not flagged.

## Unsure clusters

Batch the unsure ones for later instead of asking one by one. Phrase them as a choice the user can answer in a few words: close, keep, or "this is something I need to do". If the answer is "I don't know what I opened this for", it is clutter or reference. Offer to close, or save with a note; never invent a task.
