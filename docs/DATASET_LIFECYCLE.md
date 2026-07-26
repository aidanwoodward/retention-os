# Dataset lifecycle and persistence decision (Sprint 5V-B)

**Status:** Canonical source of truth for MVP dataset lifecycle and the deferred persistence direction.  
**Base:** `restart-retentionos-mvp` @ `b8933d96f18486bbb05a4cc247b3765535d7a3d3`

## Decision (now)

| Layer | Store | Contents |
|-------|--------|----------|
| Canonical uploaded dataset | `sessionStorage` | Full `RetentionOSDataset` JSON |
| Assumption overlays | `sessionStorage` | Margin %, marketing-spend CSV, spend % |
| Control / provenance | `localStorage` key `retentionos:activeSourceControl:v1` | Non-sensitive metadata only |

CSV uploaded data is **session-scoped**. Closing the tab or ending the browser session clears the payload. Re-upload is required. A durable control record preserves **intent and provenance** so RetentionOS can show `lost_upload` instead of silently switching to demo metrics.

## Decision (future — not implemented)

**Likely direction:** a thin **Supabase-owned** dataset snapshot/envelope (owner, provenance, `schemaVersion`, snapshot or storage reference, assumptions, active flag), after Shopify field semantics and auth/RLS are reviewed.

**Out of scope indefinitely for this decision:** a full relational Shopify orders/customers/products warehouse before sync identity, refunds, currency, and parity contracts exist.

## Rejected alternatives

| Alternative | Why rejected |
|-------------|--------------|
| Full canonical dataset in `localStorage` | Quota not credible for real histories; multi-key writes not atomic; persistent merchant/customer PII; disposable when server persistence arrives |
| IndexedDB full-dataset bridge | Same disposable client-warehouse class; not chosen for 5V-B |
| Thin Supabase implementation now | Auth/RLS incomplete; Shopify semantics not reviewed; migrations not approved |
| Full relational warehouse | Shopify sync semantics undefined |
| Silent demo fallback | Commercial trust failure |

## Active source statuses

| Status | Meaning |
|--------|---------|
| `pending` | Client hydrate before storage read — no demo metrics as commercial truth |
| `demo` | Explicit demo (including after intentional delete / Use demo) |
| `uploaded` | Durable uploaded intent + valid session payload |
| `lost_upload` | Uploaded intent exists but no valid session payload |

## Resolution precedence

1. Missing control + valid session → `uploaded` (backfill control)
2. Missing control + no session → `demo`
3. Uploaded control + valid session → `uploaded`
4. Uploaded control + missing/invalid session → `lost_upload`
5. Corrupt/incompatible control + valid session → `uploaded` (regenerate control)
6. Corrupt/incompatible control + no session, uploaded intent safely established → `lost_upload`
7. Demo control + orphan session upload → **demo wins**; clear orphan session state

## Lifecycle coordinator

All activate / replace / refresh / delete / use-demo transitions go through `lib/data-source/dataset-lifecycle.ts`. Components must not independently clear storage keys or flip active-source intent.

## Security / privacy

- Order/customer/line payloads stay session-scoped (not durable browser storage).
- Durable control record must remain metadata-only.
- Server persistence deferred until auth/RLS can protect tenant data.
