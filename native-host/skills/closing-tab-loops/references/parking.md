# Parking a loop

A loop is closed for now when three things exist: a **next physical action**, a **trigger**, and a **trusted place** the user actually checks. If any is missing the tab was only moved, not settled.

Contents: the loop block · rules for a good one · where to write it · verifying · references · one-time questions

## The loop block

Write one block per loop:

```
- [ ] Check Costco for the 16GB Mac mini
  - when: When I get home on Saturday
  - why: replacing the old server; want to compare before ordering
  - from: Mac mini | Costco, https://www.costco.example/mac-mini (tab closed 2026-10-12)
  - parked: 2026-10-12
```

- **Next action**: starts with a verb and is one visible move. "Deal with the apartment utilities" is a project; "Log into the internet provider's site and request the move-in date" is an action. If the user cannot picture doing it, it is still too vague.
- **when**: the user's own if-then. An event or place cue ("when I sit down at my desk Sunday morning", "when I'm at the store") is preferred; a date is acceptable. One trigger per loop.
- **why**: one line in the user's words. It is the reminder of what the tab was for, which a bare link does not give.
- **from**: the page title and link (from `cluster_tabs` with `cluster`), so the original can be found if needed.

Use the user's wording for the action and the trigger. Offer a draft only as something to edit.

Do not write a loop you made up. If the user said they do not know why they opened it, there is no loop.

## Where to write it

Ask once: "Where do you look when you want to know what to do next?" Use that place, because a spot they do not check keeps the worry alive and defeats the point.

Match the options to what you can actually do in this session. Do not offer a place you have no tool for.

- **A notes, reminders or to-do app you have a tool for** (InstantNotes, Apple Reminders, Todoist, a calendar): use its own create tool and map the block: action to the title, when to the due date or note, link and why in the note.
- **A file**, only if you can write and read files here: ask where; do not choose a folder inside their Documents on your own. A file called `open-loops.md` is a reasonable suggestion. Add new loops at the top under a dated heading.
- **A list they copy**, when you cannot write anywhere they look (for example in a chat app with no file or notes tool): show the loops as one short block and ask them to paste it where they keep to-dos (a notes app, an email to themselves). Wait until they say it is saved before closing those tabs.
- **The browser itself**, for someone with no to-do place at all: keep one tab per loop, put those tabs in a tab group named with the next action and when (`group_tabs` with a `title` such as "Sat: check Costco Mac mini"), and collapse it. Close the loop's other tabs. A handful of tabs in a named group is a list they will see every day; it is not the pile you started with.
- **Nothing**: if they do not want any of these, say plainly that the loop then lives only in the tab, and leave that tab open.

## Verifying

After writing, read the destination back and confirm every loop is present and complete (action, when, link). For a list the user copied, their "saved" is the check. Only then close the tabs it came from. If the save cannot be confirmed, keep those tabs open and say so.

## References worth keeping

Saved links should carry a reason:

```
- Raspberry Pi 5 pinout, https://pinout.example/ (why: I look this up every time I wire a sensor)
```

Store them under a separate heading from loops. Most reference tabs should simply be closed; keep the saved list short.

## One-time questions

- Where do you look for what to do next? (once per user)
- Where should the file go? (once, only if a file is the place and you can write files)
- Do you want a quick look at these again on a given day? Offer; do not set reminders you cannot deliver. The user's own system is the place that reminds them.
