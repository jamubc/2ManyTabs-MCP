# Parking a to-do

A to-do is settled for now when three things exist: a **next step** the user can picture doing, a **when**, and a **place** they actually check. Missing any one, the tab was only moved.

## The block

One per to-do, in the user's words:

```
- [ ] Check Costco for the 16GB Mac mini
  - when: When I get home on Saturday
  - why: replacing the old server; compare before ordering
  - from: Mac mini | Costco, https://www.costco.example/mac-mini (closed 2026-10-12)
```

- **Next step** starts with a verb and is one visible move. "Deal with the utilities" is a project; "log in to the provider's site and set the move-in date" is a step.
- **when**: their own "When I ___". An event or place ("when I sit down Sunday with coffee") works better than a bare date; a date is fine. One per to-do.
- **why**: one line saying what the tab was for, which a bare link does not.
- **from**: the title and link, from `cluster_tabs` with `cluster`.

Do not write a to-do you made up.

## Where to save it

Ask once: "Where do you look when you want to know what to do next?" Offer only places you can actually reach in this session:

- **An app you have a tool for** (InstantNotes, Reminders, Todoist, a calendar): use its create tool; next step as the title, when as the due date or note, why and link in the note.
- **A file**, if you can write files here: ask where; suggest `open-loops.md`; newest at the top.
- **A list they copy**, if you cannot write anywhere they look: show the blocks once and wait until they say it is saved.
- **The browser**, if they have no to-do place: keep one tab per to-do in a collapsed tab group named with the step and when in about 15 characters (`group_tabs` with `title` like "Sat: Mac mini", then `update_tab_group` `collapsed: true`). Close the rest of that group's tabs.
- **Nowhere**: say plainly the to-do then lives only in its tab, and leave that tab open.

## Check before closing

Read the saved place back and confirm every to-do is there with its step, when and link. For a copied list, their "saved" is the check. If you cannot confirm it, keep those tabs open and say so in one line.

## Links worth keeping

Most reference tabs are better closed and found again by search. Keep only pages that are stable, hard to find again, or personal, each with a reason:

```
- Raspberry Pi 5 pinout, https://pinout.example/ (why: I look this up every time I wire a sensor)
```
