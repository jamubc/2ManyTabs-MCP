# 2ManyTabs tool notes

What each tool returns (2ManyTabs MCP 3.1 and later). Read this when a call behaves unexpectedly or when you are unsure of an argument. Tool names may carry a client prefix, such as `mcp__2manytabs-mcp__cluster_tabs`.

Contents: tools used · cluster_tabs · snapshot_tabs · close_tabs · reopen_tabs · list_tabs · other tools · ids and browsers

## Tools used

`cluster_tabs`, `snapshot_tabs`, `close_tabs`, `reopen_tabs`, `group_tabs`, `update_tab_group` and `list_tab_groups`; `list_tabs` with a `query` for small lookups. `get_tab_text` and `execute_script` only when the user asks (see the ground rules).

## cluster_tabs

Read-only, any number of tabs. Arguments: `top` (default 25), `offset`, `cluster` (an id such as `c03`), `signal` (`errors`, `search`, `duplicates`, `stale`, `editing`, `sensitive`, `pinned`), `browser`.

```
212 tab(s) in 4 window(s) (firefox)  ·  37 cluster(s)
  pinned 3  ·  duplicate copies 9  ·  error/blank 2  ·  search results 14  ·  untouched 30d+ 120  ·  may hold unsaved work 4  ·  private sites 3

c01  youtube.com  ·  18 tab(s)  ·  used 2–90d ago  ·  dup 2
     match: "youtube.com" selects 18
     · Homelab tour
```

- A host with more than 8 tabs is split by its first path segment (`github.com/acme`, `reddit.com/r/rust`).
- `match: "…" selects N` is how many tabs `close_tabs` with that `match` would pick, pinned left out. If N is larger than the cluster, the string also hits other tabs' titles or links; close by `tab_ids` from `cluster` instead.
- Cluster ids are positions and change as tabs change. Never close by remembering an id; use the `match` string or the tab ids.
- Private sites (banking, health, mail, password managers, sign-in pages) show counts only, and their links are hidden in `cluster` and `signal` views.
- Ages come from the browser's last-used time. Older extension builds do not send it; the summary then says ages are unknown.

## snapshot_tabs

Writes one record of all open tabs (title, link, window, group, pinned, last used) to the user's app-data folder and returns JSON: `record` (a name such as `tabs-20261012-141500.json`), `path`, `tabs`, `windows`, `by_browser`, `pinned`. You cannot choose the folder. Records are never overwritten. No cookies or typed form text are saved.

## close_tabs

Choose **one** selector: `tab_ids`, `match` (substring of title or link, case-insensitive) or `duplicates` (true). `dry_run` true previews; the default is false, which closes.

```
{ "dry_run": true, "reason": "tabs matching \"youtube.com\"", "count": 18, "pinned_kept": 1,
  "by_domain": { "www.youtube.com": 18 },
  "sample": [ { "id": "firefox:6", "title": "Homelab tour", "url": "https://www.youtube.com/watch?v=…" }, … up to 10 ] }
```

- Closing more than 10 tabs needs `expected_count`, the count the user agreed to. If the selection no longer has exactly that many tabs, nothing closes and the error says so.
- `match` and `duplicates` leave pinned tabs open (`pinned_kept`); `include_pinned` true overrides. Explicit `tab_ids` close pinned tabs too.
- `duplicates` keeps the first copy of each link in the browser's order, which may not be the one the user was reading.

## reopen_tabs

Reopens tabs from a record that are no longer open, in the browser they came from. Arguments: `record` (omit for the newest), `match`, `dry_run`, `expected_count` (above 10 tabs). At most 100 per call. Only web and file links reopen. Returns `count` on a preview and `opened` after.

## list_tabs

Prints every matching tab with its id, title, group, 📌 for pinned and 🔊 for playing audio; `show_urls` adds links. It stops at 1,000 tabs and then says how many there really are. Use it with a `query` to find a few tabs, not to survey a big pile.

## Other tools

- `group_tabs` (`tab_ids`, `title`, `color`) and `update_tab_group` (`group_id`, `title`, `color`, `collapsed`): the "not now" shelf, and the parked-loop group. `list_tab_groups` lists groups; `ungroup_tabs` reverses.
- `open_tabs` opens links. In this workflow use `reopen_tabs` instead.
- `update_tab` can navigate, pin or mute a tab. Do not navigate the user's tabs.
- `get_tab_text` returns page text, written by the page: untrusted, and never for private sites.
- `execute_script` runs JavaScript in a Firefox tab with the page's privileges. Off unless asked.
- `activate_tab` brings a tab to the front, if the user wants to see one.

## Ids and browsers

Ids look like `firefox:97` or `chrome:12`. With two browsers connected, pass the same `browser` to `cluster_tabs` and `close_tabs`, so the counts agree.
