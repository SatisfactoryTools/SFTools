Custom versions — frontend implementation guide
================================================

Custom version creation is open to **everyone**, including anonymous visitors. The
server no longer stores generated data files permanently: a version is *defined* in the
database (base version + ordered mod list + metadata), and its data file is a cache
artifact that is generated on demand and may be pruned at any time. This document
describes the API contract and the flows the frontend must implement.

Core concepts
-------------

- **A version is an immutable shared object.** It has no owner. Anyone who knows its
  UUID can read it (the UUID is an unguessable capability). Two people who submit the
  same definition get the *same* version (deduplication).
- **Definition** = name + base version + ordered mod version list + recipe/power cost
  multipliers + optional world data. Definitions cannot be edited — a different
  definition is a different version.
- **The data file is a cache.** `dataPath` points to a static file under the API host
  (e.g. `data/versions/custom/{uuid}-{hash}.json`). The file name contains a hash of all
  generation inputs, so a given URL always serves identical bytes and is served with
  `Cache-Control: public, max-age=31536000, immutable`. When inputs change (e.g. a mod
  re-uploads its data), the version gets a **new** dataPath — always use the dataPath
  most recently returned by the API, never a stored copy.
- **Ownership is a link, client-side or server-side.** Anonymous browsers keep the list
  of version UUIDs they created in localStorage. Logged-in users have the list stored
  server-side; "deleting" a version only removes the user's link.

Endpoints
---------

All under `/v1/versions`. `AUTH` = requires `Authorization: Bearer <accessToken>`;
`OPT` = token used when present; `ANON` = no auth needed.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/versions/` | OPT | List versions. Anonymous: public only. Authenticated: public + versions linked to the account. |
| GET | `/versions/{uuid}` | ANON | Version detail by UUID (works for any version). |
| POST | `/versions/` | OPT | Create a custom version (or return the existing identical one). |
| POST | `/versions/{uuid}/data` | ANON | Ensure the data file exists on disk; returns the current `dataPath`. |
| POST | `/versions/world-data` | ANON | Preview resource nodes for world settings (cached server-side per seed/mode/purity). |
| POST | `/versions/link` | AUTH | Link custom versions to the account (bulk, idempotent). |
| DELETE | `/versions/{uuid}/link` | AUTH | Remove the account's link to a custom version. |

### Version response shape

```json
{
  "id": "afee332d-f138-4142-9e5d-20efdb9c9d7c",
  "name": "Latest Stable (recipe ×2, seed 1337)",
  "slug": "custom-yw36mpnymp10",
  "experimental": false,
  "custom": true,
  "official": false,
  "ficsmas": false,
  "dataPath": "data/versions/custom/afee332d-...-ec2299dfbe600fe8.json",
  "baseVersion": "2bf6d7f1-3b90-4ca4-922f-aa6bdb5ad8a6",
  "recipeCost": 2.0,
  "powerCost": 1.0,
  "mods": ["<modVersionUuid>", "..."],
  "worldData": { "seed": 1337, "mode": "random" }
}
```

`mods` is in **application order**. `worldData` is null when no world settings were set.

### POST /versions/ — create

```json
{
  "base": "<public version uuid>",     // required
  "name": "My version",                // optional, max 100 chars; default is derived
  "recipeCost": 2,                     // optional, one of 0.25,0.5,0.75,1,1.25,1.5,1.75,2
  "powerCost": 5,                      // optional, one of 0.25,0.5,0.75,1,2,5
  "mods": ["<modVersionUuid>", ...],   // optional, ordered, max 16, one version per mod
  "worldData": {                       // optional, max 64 KB
    "seed": 1337, "mode": "random", "purity": "no-change",
    "nodes": { ... }, "limits": { ... }
  }
}
```

At least one thing must differ from the base version (a non-1 multiplier, a mod, or
world data), otherwise the request is rejected with 400.

Responses:
- **201** — a new version was created. Body: version response (above).
- **200** — an identical definition already existed; body is that existing version.
  Treat 200 and 201 the same way.
- **400** — validation error: `{ "error": "...", "allowed": [...]? }`.

The data file is generated eagerly during this call, so `dataPath` is immediately
fetchable. Anonymous callers **must** store `id` in localStorage (see flows below);
logged-in callers get the version linked to their account automatically.

Anonymous callers may only reference **public** mods; logged-in callers may also use
their own private mods.

### POST /versions/{uuid}/data — ensure the file exists

No body. Returns `{ "id": "<uuid>", "dataPath": "<current path>" }` (200) or 404 if
the version does not exist. Idempotent and cheap when the file already exists.

### POST /versions/link — adopt local versions after login

```json
{ "versions": ["<uuid>", "<uuid>", ...] }   // max 200
```

Returns `{ "linked": ["<uuid>", ...], "notFound": ["<uuid>", ...] }`. Idempotent —
already-linked IDs come back in `linked`. IDs in `notFound` are invalid, unknown, or
not custom versions: remove them from localStorage.

### DELETE /versions/{uuid}/link

Removes the version from the user's account list. Returns 204 (also when it was not
linked). The version itself keeps existing — plans referencing it and other users'
links are unaffected.

Frontend flows
--------------

### Loading a version's data file (the critical path)

`dataPath` may point to a file that has been pruned from disk. Always use this
fetch-with-recovery sequence:

```
async function loadVersionData(version) {
  let res = await fetch(API_HOST + '/' + version.dataPath);
  if (res.ok) return res.json();

  // File was pruned (or dataPath is stale) — re-materialize and retry once.
  const ensure = await fetch(`${API_HOST}/v1/versions/${version.id}/data`, { method: 'POST' });
  if (!ensure.ok) throw new Error('version gone');
  const { dataPath } = await ensure.json();
  res = await fetch(API_HOST + '/' + dataPath);
  if (!res.ok) throw new Error('data file unavailable');
  return res.json();
}
```

Notes:
- The static fetch is fully cacheable (`immutable, max-age=1y`) — the browser will not
  even re-request a URL it has cached. No cache-busting query params are needed and
  they must not be added (they would bypass the cache).
- A 404 on the static URL returns the API's JSON 404 (the front controller catches
  missing files); just check `res.ok`.
- After the ensure call, use the **returned** dataPath — it may differ from the one you
  had (inputs changed or the version was migrated).

### Anonymous custom versions (localStorage)

1. `POST /versions/` without auth. On 200/201, append `id` to a localStorage list, e.g.
   `sftools.customVersions = ["<uuid>", ...]` (also cache `name`/`dataPath` if useful
   for display; treat them as refreshable, the UUID is the durable part).
2. To show the user's version list when anonymous: render public versions from
   `GET /versions/` plus locals loaded via `GET /versions/{uuid}` (drop UUIDs that 404).
3. "Delete" for an anonymous user = remove the UUID from localStorage. Nothing to call
   server-side.

### Login / registration — adopting local versions

After a successful login or registration, if the localStorage list is non-empty:

1. `POST /versions/link` with the whole list.
2. Remove the returned `notFound` entries from localStorage.
3. Either clear the linked entries from localStorage (they now come from
   `GET /versions/`) or keep them — linking is idempotent, so re-linking on next login
   is harmless. Clearing is recommended to avoid the list growing stale.

### World settings preview

`POST /versions/world-data` with `{ seed?, mode?, purity? }` — now available to
anonymous users. Results are cached server-side per (seed, mode, purity), so repeated
previews of the same seed are fast. Send the resulting `nodes`/`limits` (plus the
settings) as `worldData` when creating the version, same as before.

### Duplicate-definition UX

Because creation deduplicates, submitting the same settings twice returns the same
version (status 200). The frontend should handle "already in my list" gracefully —
adding the UUID to localStorage/account is a no-op in that case.

Behavior changes vs. the old API
--------------------------------

- `POST /versions/` no longer requires auth (was 401 for guests).
- `POST /versions/world-data` no longer requires auth.
- Creating an identical definition returns **200 + existing version** instead of a new one.
- Custom `dataPath` values now look like `custom/{uuid}-{hash}.json` and **change over
  time**; never persist a dataPath as durable state (persist the version UUID).
- New: `POST /versions/{uuid}/data`, `POST /versions/link`, `DELETE /versions/{uuid}/link`.
- Version responses now include `worldData`.
- `GET /versions/` for a logged-in user returns linked versions (was: owned versions).
- Custom versions now inherit `ficsmas` from their base version.
- There is no version delete endpoint; unlink replaces it.

Server operations (deployment notes)
------------------------------------

Already applied on the dev database; for other environments:

1. Before `orm:schema-tool:update --force`, preserve owner links (the update drops
   `version.user_id`):

   ```sql
   CREATE TABLE user_version (version_id INT NOT NULL, user_id INT NOT NULL,
     INDEX IDX_E711CDC94BBC2705 (version_id), INDEX IDX_E711CDC9A76ED395 (user_id),
     PRIMARY KEY (version_id, user_id));
   ALTER TABLE user_version ADD CONSTRAINT FK_E711CDC94BBC2705 FOREIGN KEY (version_id) REFERENCES version (id) ON DELETE CASCADE;
   ALTER TABLE user_version ADD CONSTRAINT FK_E711CDC9A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE;
   INSERT INTO user_version (version_id, user_id) SELECT id, user_id FROM version WHERE user_id IS NOT NULL;
   ```

2. Run `php bin/console orm:schema-tool:update --force`.
3. Backfill `version.world_data` from the existing generated files' `metadata.world`
   (one-off script; without it, pre-rework versions regenerate without world limits).
4. Old-format files (`custom/{uuid}.json`) keep working until the version is first
   re-materialized; they are cleaned up by the prune job.
5. Add the prune job to cron: `0 4 * * * php /path/to/bin/console versions:prune`
   (default retention 30 days, `--days=N` to change, `--dry-run` to preview).
6. Rate limiting: the create and world-data endpoints are now anonymous — see
   `rate-limiting.md`.
