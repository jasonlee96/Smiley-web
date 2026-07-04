# Trip Activity Mandarin Names, Attraction Images & PDF Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Mandarin name field, an auto-fetched Wikipedia attraction photo, and matching PDF export support to Trip Planner activities — surfaced in smiley-web, backed by the shared smiley-mobile/api backend.

**Architecture:** Three new nullable columns on `smileyapp.trip_activities` (`name_zh`, `image_url`, `image_attribution`) are populated two ways: (1) the AI chat tool-use flow (`executeTool` create/update_activity) sets them as activities are created/edited, and (2) a new combined `POST /trips/:id/ai-enrich` endpoint backfills existing activities (Claude batch prompt for `name_zh`, Wikipedia search+summary for images). smiley-web's `ActivityFormModal`, `ItineraryTab`, `TripDetailPage`, and `TripPdfDocument` read/write/display the new fields.

**Tech Stack:** Node.js/Express/TypeScript + postgres.js (`smiley-mobile/api`), React/Vite/TypeScript (`smiley-web`), `@react-pdf/renderer`, `axios` (existing dependency, used for the Wikipedia lookup following the existing Nominatim geocode pattern), Claude CLI via `askClaude`.

**Specs covered:**
- `2026-06-13-trip-activity-mandarin-names-design.md`
- `2026-06-13-trip-attraction-images-design.md`
- `2026-06-13-trip-itinerary-pdf-enrichment-design.md`

**Note on testing:** Neither `smiley-mobile/api` nor `smiley-web` has a unit test framework configured (no jest/vitest). Verification follows the codebase's existing pattern: TypeScript build (`tsc`/`npm run build`) for type-correctness, Docker rebuild + `curl`/`psql` for backend behavior, and manual UI checks for frontend behavior.

---

## Task 1: Database — add `name_zh`, `image_url`, `image_attribution` columns

**Files:**
- Modify: `smiley-mobile/api/src/db/migrations.ts:405-406`

- [ ] **Step 1: Add the new columns to `runMigrations()`**

In `smiley-mobile/api/src/db/migrations.ts`, find:

```ts
  await sql`ALTER TABLE smileyapp.trip_activities ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7)`;
  await sql`ALTER TABLE smileyapp.trip_activities ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7)`;
```

Replace with:

```ts
  await sql`ALTER TABLE smileyapp.trip_activities ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7)`;
  await sql`ALTER TABLE smileyapp.trip_activities ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7)`;

  // ── Trip Planner: Mandarin name + attraction image ──
  await sql`ALTER TABLE smileyapp.trip_activities ADD COLUMN IF NOT EXISTS name_zh TEXT`;
  await sql`ALTER TABLE smileyapp.trip_activities ADD COLUMN IF NOT EXISTS image_url TEXT`;
  await sql`ALTER TABLE smileyapp.trip_activities ADD COLUMN IF NOT EXISTS image_attribution TEXT`;
```

- [ ] **Step 2: Rebuild and restart the API container**

```bash
docker compose -f /opt/smileyapp/smiley-mobile/dc-smiley-mobile.yml up -d --build smiley-api
docker compose -f /opt/smileyapp/smiley-mobile/dc-smiley-mobile.yml logs --tail=30 smiley-api
```

Expected: logs show the API starting cleanly with no migration errors.

- [ ] **Step 3: Verify the columns exist**

```bash
docker exec postgres psql -U n8n -d rate_analysis -c "\d smileyapp.trip_activities" | grep -E "name_zh|image_url|image_attribution"
```

Expected: three rows showing `name_zh | text`, `image_url | text`, `image_attribution | text`.

- [ ] **Step 4: Commit**

```bash
cd /opt/smileyapp/smiley-mobile
git add api/src/db/migrations.ts
git commit -m "feat: add name_zh, image_url, image_attribution columns to trip_activities"
```

---

## Task 2: Backend — persist `name_zh` through manual activity CRUD

**Files:**
- Modify: `smiley-mobile/api/src/routes/trips.ts:305-380`

- [ ] **Step 1: Accept `name_zh` in `POST /:id/days/:dayId/activities`**

Find:

```ts
  const { activity_type, title, notes, start_time, end_time, location, booking_ref, estimated_cost_myr, lat, lng } = req.body;
  if (!title) { res.status(400).json({ error: 'title required' }); return; }
  try {
    const [maxRow] = await sql`SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM smileyapp.trip_activities WHERE trip_day_id=${dayId}`;
    const sortOrder = (maxRow?.max_sort ?? -1) + 1;
    const resolvedLat = lat != null ? parseFloat(lat) : null;
    const resolvedLng = lng != null ? parseFloat(lng) : null;

    const [act] = await sql`
      INSERT INTO smileyapp.trip_activities
        (trip_id, trip_day_id, activity_type, title, notes, start_time, end_time, location, booking_ref, estimated_cost_myr, sort_order, lat, lng)
      VALUES (${tripId}, ${dayId}, ${activity_type ?? 'other'}, ${title}, ${notes ?? null},
              ${start_time ?? null}, ${end_time ?? null}, ${location ?? null}, ${booking_ref ?? null},
              ${estimated_cost_myr ?? null}, ${sortOrder}, ${resolvedLat}, ${resolvedLng})
      RETURNING *
    `;
```

Replace with:

```ts
  const { activity_type, title, notes, start_time, end_time, location, booking_ref, estimated_cost_myr, lat, lng, name_zh } = req.body;
  if (!title) { res.status(400).json({ error: 'title required' }); return; }
  try {
    const [maxRow] = await sql`SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM smileyapp.trip_activities WHERE trip_day_id=${dayId}`;
    const sortOrder = (maxRow?.max_sort ?? -1) + 1;
    const resolvedLat = lat != null ? parseFloat(lat) : null;
    const resolvedLng = lng != null ? parseFloat(lng) : null;

    const [act] = await sql`
      INSERT INTO smileyapp.trip_activities
        (trip_id, trip_day_id, activity_type, title, notes, start_time, end_time, location, booking_ref, estimated_cost_myr, sort_order, lat, lng, name_zh)
      VALUES (${tripId}, ${dayId}, ${activity_type ?? 'other'}, ${title}, ${notes ?? null},
              ${start_time ?? null}, ${end_time ?? null}, ${location ?? null}, ${booking_ref ?? null},
              ${estimated_cost_myr ?? null}, ${sortOrder}, ${resolvedLat}, ${resolvedLng}, ${name_zh ?? null})
      RETURNING *
    `;
```

- [ ] **Step 2: Accept `name_zh` in `PUT /:id/activities/:actId`**

Find:

```ts
  const { activity_type, title, notes, start_time, end_time, location, booking_ref, estimated_cost_myr, lat, lng } = req.body;
  if (!title) { res.status(400).json({ error: 'title required' }); return; }
  try {
    let act: any;
```

Replace with:

```ts
  const { activity_type, title, notes, start_time, end_time, location, booking_ref, estimated_cost_myr, lat, lng, name_zh } = req.body;
  if (!title) { res.status(400).json({ error: 'title required' }); return; }
  try {
    let act: any;
```

- [ ] **Step 3: Add `name_zh` to all three UPDATE branches**

Find (branch 1 — location cleared):

```ts
      [act] = await sql`
        UPDATE smileyapp.trip_activities
        SET activity_type=${activity_type ?? 'other'}, title=${title}, notes=${notes ?? null},
            start_time=${start_time ?? null}, end_time=${end_time ?? null}, location=null,
            booking_ref=${booking_ref ?? null}, estimated_cost_myr=${estimated_cost_myr ?? null},
            lat=null, lng=null, updated_at=now()
        WHERE id=${actId} RETURNING *
      `;
```

Replace with:

```ts
      [act] = await sql`
        UPDATE smileyapp.trip_activities
        SET activity_type=${activity_type ?? 'other'}, title=${title}, notes=${notes ?? null},
            start_time=${start_time ?? null}, end_time=${end_time ?? null}, location=null,
            booking_ref=${booking_ref ?? null}, estimated_cost_myr=${estimated_cost_myr ?? null},
            name_zh=${name_zh ?? null}, lat=null, lng=null, updated_at=now()
        WHERE id=${actId} RETURNING *
      `;
```

Find (branch 2 — coords supplied):

```ts
      [act] = await sql`
        UPDATE smileyapp.trip_activities
        SET activity_type=${activity_type ?? 'other'}, title=${title}, notes=${notes ?? null},
            start_time=${start_time ?? null}, end_time=${end_time ?? null}, location=${location},
            booking_ref=${booking_ref ?? null}, estimated_cost_myr=${estimated_cost_myr ?? null},
            lat=${parseFloat(lat)}, lng=${parseFloat(lng)}, updated_at=now()
        WHERE id=${actId} RETURNING *
      `;
```

Replace with:

```ts
      [act] = await sql`
        UPDATE smileyapp.trip_activities
        SET activity_type=${activity_type ?? 'other'}, title=${title}, notes=${notes ?? null},
            start_time=${start_time ?? null}, end_time=${end_time ?? null}, location=${location},
            booking_ref=${booking_ref ?? null}, estimated_cost_myr=${estimated_cost_myr ?? null},
            name_zh=${name_zh ?? null}, lat=${parseFloat(lat)}, lng=${parseFloat(lng)}, updated_at=now()
        WHERE id=${actId} RETURNING *
      `;
```

Find (branch 3 — location text only):

```ts
      [act] = await sql`
        UPDATE smileyapp.trip_activities
        SET activity_type=${activity_type ?? 'other'}, title=${title}, notes=${notes ?? null},
            start_time=${start_time ?? null}, end_time=${end_time ?? null}, location=${location},
            booking_ref=${booking_ref ?? null}, estimated_cost_myr=${estimated_cost_myr ?? null},
            updated_at=now()
        WHERE id=${actId} RETURNING *
      `;
      enqueueGeocode(actId, location);
```

Replace with:

```ts
      [act] = await sql`
        UPDATE smileyapp.trip_activities
        SET activity_type=${activity_type ?? 'other'}, title=${title}, notes=${notes ?? null},
            start_time=${start_time ?? null}, end_time=${end_time ?? null}, location=${location},
            booking_ref=${booking_ref ?? null}, estimated_cost_myr=${estimated_cost_myr ?? null},
            name_zh=${name_zh ?? null}, updated_at=now()
        WHERE id=${actId} RETURNING *
      `;
      enqueueGeocode(actId, location);
```

- [ ] **Step 4: Rebuild and verify with curl**

```bash
docker compose -f /opt/smileyapp/smiley-mobile/dc-smiley-mobile.yml up -d --build smiley-api
```

Get a JWT (replace with the smiley-api PIN) and a `tripId`/`dayId` from an existing trip, then:

```bash
TOKEN=$(curl -s -X POST https://ip-172-31-2-167.tail9203bc.ts.net/api/auth/login -H 'Content-Type: application/json' -d '{"pin":"112299"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST "https://ip-172-31-2-167.tail9203bc.ts.net/api/trips/<tripId>/days/<dayId>/activities" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"activity_type":"attraction","title":"Test Activity","name_zh":"测试"}'
```

Expected: response JSON includes `"name_zh":"测试"`.

- [ ] **Step 5: Commit**

```bash
cd /opt/smileyapp/smiley-mobile
git add api/src/routes/trips.ts
git commit -m "feat: persist name_zh on manual trip activity create/update"
```

---

## Task 3: Backend — `name_zh` in AI chat (`executeTool`, itinerary snapshot, `<actions>` schema)

**Files:**
- Modify: `smiley-mobile/api/src/routes/trips.ts` (`executeTool` create/update_activity, itinerary snapshot builder, chat prompt)

- [ ] **Step 1: `create_activity` — persist `name_zh`**

Find:

```ts
      const [act] = await sql`
        INSERT INTO smileyapp.trip_activities
          (trip_id, trip_day_id, activity_type, title, notes, start_time, end_time, location, booking_ref, estimated_cost_myr, sort_order)
        VALUES (${tripId}, ${day.id}, ${input.activity_type}, ${input.title}, ${input.notes ?? null},
                ${input.start_time ?? null}, ${input.end_time ?? null}, ${input.location ?? null},
                ${input.booking_ref ?? null}, ${input.estimated_cost_myr ?? null}, ${sortOrder})
        RETURNING id
      `;
```

Replace with:

```ts
      const [act] = await sql`
        INSERT INTO smileyapp.trip_activities
          (trip_id, trip_day_id, activity_type, title, notes, start_time, end_time, location, booking_ref, estimated_cost_myr, sort_order, name_zh)
        VALUES (${tripId}, ${day.id}, ${input.activity_type}, ${input.title}, ${input.notes ?? null},
                ${input.start_time ?? null}, ${input.end_time ?? null}, ${input.location ?? null},
                ${input.booking_ref ?? null}, ${input.estimated_cost_myr ?? null}, ${sortOrder}, ${input.name_zh ?? null})
        RETURNING id
      `;
```

- [ ] **Step 2: `update_activity` — persist `name_zh`**

Find:

```ts
      await sql`
        UPDATE smileyapp.trip_activities SET
          activity_type = ${input.activity_type ?? existing.activity_type},
          title = ${input.title ?? existing.title},
          start_time = ${input.start_time !== undefined ? input.start_time : existing.start_time},
          end_time = ${input.end_time !== undefined ? input.end_time : existing.end_time},
          location = ${input.location !== undefined ? input.location : existing.location},
          notes = ${input.notes !== undefined ? input.notes : existing.notes},
          booking_ref = ${input.booking_ref !== undefined ? input.booking_ref : existing.booking_ref},
          estimated_cost_myr = ${input.estimated_cost_myr !== undefined ? input.estimated_cost_myr : existing.estimated_cost_myr},
          updated_at = now()
        WHERE id=${input.activity_id} AND trip_id=${tripId}
      `;
```

Replace with:

```ts
      await sql`
        UPDATE smileyapp.trip_activities SET
          activity_type = ${input.activity_type ?? existing.activity_type},
          title = ${input.title ?? existing.title},
          start_time = ${input.start_time !== undefined ? input.start_time : existing.start_time},
          end_time = ${input.end_time !== undefined ? input.end_time : existing.end_time},
          location = ${input.location !== undefined ? input.location : existing.location},
          notes = ${input.notes !== undefined ? input.notes : existing.notes},
          booking_ref = ${input.booking_ref !== undefined ? input.booking_ref : existing.booking_ref},
          estimated_cost_myr = ${input.estimated_cost_myr !== undefined ? input.estimated_cost_myr : existing.estimated_cost_myr},
          name_zh = ${input.name_zh !== undefined ? input.name_zh : existing.name_zh},
          updated_at = now()
        WHERE id=${input.activity_id} AND trip_id=${tripId}
      `;
```

- [ ] **Step 3: Include `name_zh` in the itinerary snapshot sent to Claude**

Find:

```ts
        const actList = dayActs.map((a: any) => {
          let s = `${a.title} (${a.activity_type}`;
          if (a.start_time) s += `, ${String(a.start_time).substring(0, 5)}`;
          if (a.location) s += `, ${a.location}`;
          s += `, id:${a.id})`;
          return s;
        }).join('; ');
```

Replace with:

```ts
        const actList = dayActs.map((a: any) => {
          let s = a.name_zh ? `${a.title} (${a.name_zh})` : a.title;
          s += ` (${a.activity_type}`;
          if (a.start_time) s += `, ${String(a.start_time).substring(0, 5)}`;
          if (a.location) s += `, ${a.location}`;
          s += `, id:${a.id})`;
          return s;
        }).join('; ');
```

- [ ] **Step 4: Add `name_zh` to the `<actions>` JSON schema examples**

Find:

```
  {"action": "create_activity", "day_number": 1, "activity_type": "meal", "title": "Ramen dinner", "start_time": "19:00", "end_time": null, "location": "Dotonbori", "notes": null, "booking_ref": null, "estimated_cost_myr": null},
  {"action": "update_activity", "activity_id": 5, "title": "New title", "start_time": "10:00", "end_time": null, "location": "New location", "notes": null},
```

Replace with:

```
  {"action": "create_activity", "day_number": 1, "activity_type": "meal", "title": "Ramen dinner", "name_zh": null, "start_time": "19:00", "end_time": null, "location": "Dotonbori", "notes": null, "booking_ref": null, "estimated_cost_myr": null},
  {"action": "update_activity", "activity_id": 5, "title": "New title", "name_zh": null, "start_time": "10:00", "end_time": null, "location": "New location", "notes": null},
```

- [ ] **Step 5: Add the Mandarin-name prompt instruction**

Find:

```
activity_type must be one of: accommodation, transport, meal, attraction, other. Packing category must be one of: documents, clothing, electronics, toiletries, general. check_in/check_out must be YYYY-MM-DD.
```

Replace with:

```
activity_type must be one of: accommodation, transport, meal, attraction, other. Packing category must be one of: documents, clothing, electronics, toiletries, general. check_in/check_out must be YYYY-MM-DD.

MANDARIN NAMES: when creating or updating an activity, if the place has a commonly-known Mandarin/Chinese name (e.g. landmarks, train stations, cities), include it as "name_zh" (e.g. "台北101"). If no established Chinese name exists, set "name_zh": null. Do not invent names.
```

- [ ] **Step 6: Rebuild and verify via chat**

```bash
docker compose -f /opt/smileyapp/smiley-mobile/dc-smiley-mobile.yml up -d --build smiley-api
```

Using a trip with at least one day, send a chat message:

```bash
curl -s -X POST "https://ip-172-31-2-167.tail9203bc.ts.net/api/trips/<tripId>/chat" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"message":"Add a visit to Taipei 101 on day 1, around 2pm"}'
```

Expected: response `mutations` includes a `create_activity` entry; querying the trip's activities afterward shows `name_zh` set to `台北101` (or similar) for the new row.

- [ ] **Step 7: Commit**

```bash
cd /opt/smileyapp/smiley-mobile
git add api/src/routes/trips.ts
git commit -m "feat: populate name_zh via AI chat tool actions and itinerary snapshot"
```

---

## Task 4: Backend — Wikipedia attraction image lookup, wired into AI chat

**Files:**
- Modify: `smiley-mobile/api/src/routes/trips.ts` (new helper functions + `executeTool` create/update_activity)

- [ ] **Step 1: Add `lookupAttractionImage` and `lookupAttractionImageAndStore` helpers**

Find (end of the geocode queue section):

```ts
  } catch {
    // best-effort, don't propagate
  }
}

// POST /trips/:id/days/:dayId/activities — add activity
```

Replace with:

```ts
  } catch {
    // best-effort, don't propagate
  }
}

// ── Attraction image lookup (Wikipedia/Wikimedia, no API key) ───────────────

async function lookupAttractionImage(title: string, location?: string | null): Promise<{ image_url: string; image_attribution: string } | null> {
  try {
    const query = location ? `${title} ${location}` : title;
    const searchResp = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: { action: 'query', list: 'search', srsearch: query, format: 'json', srlimit: 1, origin: '*' },
      headers: { 'User-Agent': 'smiley-trip-planner/1.0' },
      timeout: 8000,
    });
    const hit = searchResp.data?.query?.search?.[0];
    if (!hit?.title) return null;

    const summaryResp = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`, {
      headers: { 'User-Agent': 'smiley-trip-planner/1.0' },
      timeout: 8000,
    });
    const imageUrl = summaryResp.data?.thumbnail?.source ?? summaryResp.data?.originalimage?.source;
    if (!imageUrl) return null;

    return { image_url: imageUrl, image_attribution: `via Wikipedia: ${hit.title}` };
  } catch {
    return null;
  }
}

async function lookupAttractionImageAndStore(actId: number, title: string, location?: string | null): Promise<void> {
  const result = await lookupAttractionImage(title, location);
  if (!result) return;
  await sql`
    UPDATE smileyapp.trip_activities
    SET image_url=${result.image_url}, image_attribution=${result.image_attribution}, updated_at=now()
    WHERE id=${actId} AND image_url IS NULL
  `;
}

// POST /trips/:id/days/:dayId/activities — add activity
```

- [ ] **Step 2: Wire the lookup into `create_activity`**

Find:

```ts
      if (input.location) enqueueGeocode(act.id, input.location);
      return {
        output: `Created activity "${input.title}" on Day ${input.day_number} (id: ${act.id})`,
        mutation: { tool: toolName, description: `Added: ${input.title} (Day ${input.day_number})` },
      };
    }
```

Replace with:

```ts
      if (input.location) enqueueGeocode(act.id, input.location);
      if (input.activity_type === 'attraction') {
        lookupAttractionImageAndStore(act.id, input.title, input.location).catch(e => console.error('[trips/image-lookup]', e));
      }
      return {
        output: `Created activity "${input.title}" on Day ${input.day_number} (id: ${act.id})`,
        mutation: { tool: toolName, description: `Added: ${input.title} (Day ${input.day_number})` },
      };
    }
```

- [ ] **Step 3: Wire the lookup into `update_activity`**

Find:

```ts
      if (input.location) enqueueGeocode(input.activity_id, input.location);
      return {
        output: `Updated activity ${input.activity_id} "${input.title ?? existing.title}"`,
        mutation: { tool: toolName, description: `Updated: ${input.title ?? existing.title}` },
      };
    }
```

Replace with:

```ts
      if (input.location) enqueueGeocode(input.activity_id, input.location);
      const finalType = input.activity_type ?? existing.activity_type;
      if (finalType === 'attraction') {
        const finalLocation = input.location !== undefined ? input.location : existing.location;
        lookupAttractionImageAndStore(input.activity_id, input.title ?? existing.title, finalLocation)
          .catch(e => console.error('[trips/image-lookup]', e));
      }
      return {
        output: `Updated activity ${input.activity_id} "${input.title ?? existing.title}"`,
        mutation: { tool: toolName, description: `Updated: ${input.title ?? existing.title}` },
      };
    }
```

- [ ] **Step 4: Rebuild and verify via chat**

```bash
docker compose -f /opt/smileyapp/smiley-mobile/dc-smiley-mobile.yml up -d --build smiley-api
```

```bash
curl -s -X POST "https://ip-172-31-2-167.tail9203bc.ts.net/api/trips/<tripId>/chat" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"message":"Add a visit to the Eiffel Tower on day 1, around 10am"}'
```

Wait ~5 seconds (image lookup is async), then:

```bash
docker exec postgres psql -U n8n -d rate_analysis -c "SELECT id, title, image_url, image_attribution FROM smileyapp.trip_activities WHERE title ILIKE '%Eiffel%' ORDER BY id DESC LIMIT 1"
```

Expected: `image_url` is a `upload.wikimedia.org` URL, `image_attribution` is `via Wikipedia: Eiffel Tower` (or similar).

- [ ] **Step 5: Commit**

```bash
cd /opt/smileyapp/smiley-mobile
git add api/src/routes/trips.ts
git commit -m "feat: auto-lookup Wikipedia image for attraction activities"
```

---

## Task 5: Backend — `POST /trips/:id/ai-enrich` backfill endpoint

**Files:**
- Modify: `smiley-mobile/api/src/routes/trips.ts` (new route + background function, placed after `generateAiPacking`)

- [ ] **Step 1: Add the route and background function**

Find:

```ts
  const packingList = parsed.packing_list ?? [];
  await sql`DELETE FROM smileyapp.trip_packing_items WHERE trip_id=${id} AND ai_generated=true`;
  for (let i = 0; i < packingList.length; i++) {
    const p = packingList[i];
    await sql`
      INSERT INTO smileyapp.trip_packing_items (trip_id, category, item, ai_generated, sort_order)
      VALUES (${id}, ${p.category ?? 'general'}, ${p.item}, true, ${i})
    `;
  }
}
```

Replace with:

```ts
  const packingList = parsed.packing_list ?? [];
  await sql`DELETE FROM smileyapp.trip_packing_items WHERE trip_id=${id} AND ai_generated=true`;
  for (let i = 0; i < packingList.length; i++) {
    const p = packingList[i];
    await sql`
      INSERT INTO smileyapp.trip_packing_items (trip_id, category, item, ai_generated, sort_order)
      VALUES (${id}, ${p.category ?? 'general'}, ${p.item}, true, ${i})
    `;
  }
}

// POST /trips/:id/ai-enrich — fire-and-forget: backfills name_zh + attraction images for existing activities
router.post('/:id/ai-enrich', async (req, res) => {
  const id = parseInt(req.params.id);
  const [trip] = await sql`SELECT id FROM smileyapp.trips WHERE id=${id}`;
  if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }

  res.status(202).json({ status: 'enriching' });

  generateAiEnrich(id).catch(e => console.error('[ai-enrich-bg]', e));
});

async function generateAiEnrich(id: number): Promise<void> {
  // 1. Mandarin names — batch Claude prompt for activities missing name_zh
  const missingNames = await sql`
    SELECT id, title, location FROM smileyapp.trip_activities
    WHERE trip_id=${id} AND name_zh IS NULL
  `;
  if (missingNames.length > 0) {
    const prompt = `For each of these travel itinerary items, provide the commonly-known Mandarin/Chinese name if one exists (e.g. landmarks, stations, cities). If no established Chinese name exists, use null.

Items:
${JSON.stringify(missingNames.map((a: any) => ({ id: a.id, title: a.title, location: a.location })))}

Reply with JSON: { "names": [{"id": number, "name_zh": string | null}, ...] }`;

    const text = await askClaude(prompt);
    try {
      const parsed = extractJson(text);
      for (const entry of parsed.names ?? []) {
        if (entry.name_zh) {
          await sql`UPDATE smileyapp.trip_activities SET name_zh=${entry.name_zh}, updated_at=now() WHERE id=${entry.id} AND name_zh IS NULL`;
        }
      }
    } catch (e) {
      console.error('[ai-enrich-names]', e);
    }
  }

  // 2. Attraction images — Wikipedia lookup for attractions missing image_url
  const missingImages = await sql`
    SELECT id, title, location FROM smileyapp.trip_activities
    WHERE trip_id=${id} AND activity_type='attraction' AND image_url IS NULL
  `;
  for (const act of missingImages) {
    await lookupAttractionImageAndStore(act.id, act.title, act.location);
  }
}
```

- [ ] **Step 2: Rebuild and verify**

```bash
docker compose -f /opt/smileyapp/smiley-mobile/dc-smiley-mobile.yml up -d --build smiley-api
```

Pick an existing trip (e.g. one of the Europe trips) and trigger enrichment:

```bash
curl -s -X POST "https://ip-172-31-2-167.tail9203bc.ts.net/api/trips/<tripId>/ai-enrich" -H "Authorization: Bearer $TOKEN"
```

Expected: immediate `{"status":"enriching"}` response. After 10-30s (depends on activity count and Claude CLI latency):

```bash
docker exec postgres psql -U n8n -d rate_analysis -c "SELECT id, title, activity_type, name_zh, image_url FROM smileyapp.trip_activities WHERE trip_id=<tripId> ORDER BY id"
```

Expected: previously-`NULL` `name_zh` values are populated where a Mandarin name exists; `attraction` rows get `image_url` populated where Wikipedia has a match.

- [ ] **Step 3: Commit**

```bash
cd /opt/smileyapp/smiley-mobile
git add api/src/routes/trips.ts
git commit -m "feat: add POST /trips/:id/ai-enrich to backfill name_zh and attraction images"
```

---

## Task 6: Frontend — types, API client, and `useAiEnrich` hook

**Files:**
- Modify: `smiley-web/src/types/trips.ts`
- Modify: `smiley-web/src/api/trips.ts`
- Modify: `smiley-web/src/hooks/useTrips.ts`

- [ ] **Step 1: Extend `Activity` and `CreateActivityInput`**

In `smiley-web/src/types/trips.ts`, find:

```ts
export interface Activity {
  id: number
  trip_id: number
  trip_day_id: number
  activity_type: ActivityType
  title: string
  notes: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  booking_ref: string | null
  estimated_cost_myr: number | null
  sort_order: number | null
  lat: number | null
  lng: number | null
}
```

Replace with:

```ts
export interface Activity {
  id: number
  trip_id: number
  trip_day_id: number
  activity_type: ActivityType
  title: string
  notes: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  booking_ref: string | null
  estimated_cost_myr: number | null
  sort_order: number | null
  lat: number | null
  lng: number | null
  name_zh: string | null
  image_url: string | null
  image_attribution: string | null
}
```

Find:

```ts
export interface CreateActivityInput {
  activity_type: ActivityType
  title: string
  notes?: string | null
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  estimated_cost_myr?: number | null
}
```

Replace with:

```ts
export interface CreateActivityInput {
  activity_type: ActivityType
  title: string
  notes?: string | null
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  estimated_cost_myr?: number | null
  name_zh?: string | null
}
```

- [ ] **Step 2: Add `aiEnrich` to the API client**

In `smiley-web/src/api/trips.ts`, find:

```ts
  aiBrief: (id: number) => client.post<AiBrief>(`/trips/${id}/ai-brief`, {}, { timeout: 0 }).then(r => r.data),
```

Replace with:

```ts
  aiBrief: (id: number) => client.post<AiBrief>(`/trips/${id}/ai-brief`, {}, { timeout: 0 }).then(r => r.data),
  aiEnrich: (id: number) => client.post(`/trips/${id}/ai-enrich`, {}, { timeout: 0 }),
```

- [ ] **Step 3: Add `useAiEnrich` hook**

In `smiley-web/src/hooks/useTrips.ts`, find:

```ts
export function useAiBrief() {
  return useMutation({
    mutationFn: (tripId: number) => tripsApi.aiBrief(tripId),
  })
}
```

Replace with:

```ts
export function useAiBrief() {
  return useMutation({
    mutationFn: (tripId: number) => tripsApi.aiBrief(tripId),
  })
}

export function useAiEnrich() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tripId: number) => tripsApi.aiEnrich(tripId),
    onSuccess: (_, tripId) => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['trips', tripId] }), 3000)
    },
  })
}
```

- [ ] **Step 4: Verify with a type-check build**

```bash
cd /opt/smileyapp/smiley-web && npm run build
```

Expected: build succeeds with no TypeScript errors (no commit — `smiley-web` has no git repo).

---

## Task 7: Frontend — "Chinese name" field in `ActivityFormModal`

**Files:**
- Modify: `smiley-web/src/modules/trips/ActivityFormModal.tsx`

- [ ] **Step 1: Add `nameZh` state**

Find:

```ts
  const [cost, setCost] = useState(activity?.estimated_cost_myr != null ? String(activity.estimated_cost_myr) : '')
```

Replace with:

```ts
  const [cost, setCost] = useState(activity?.estimated_cost_myr != null ? String(activity.estimated_cost_myr) : '')
  const [nameZh, setNameZh] = useState(activity?.name_zh ?? '')
```

- [ ] **Step 2: Include `name_zh` in the submitted data**

Find:

```ts
    const data: CreateActivityInput = {
      activity_type: actType,
      title: title.trim(),
      start_time: startTime || null,
      end_time: endTime || null,
      notes: notes.trim() || null,
      location: location.trim() || null,
      estimated_cost_myr: cost ? parseFloat(cost) : null,
    }
```

Replace with:

```ts
    const data: CreateActivityInput = {
      activity_type: actType,
      title: title.trim(),
      name_zh: nameZh.trim() || null,
      start_time: startTime || null,
      end_time: endTime || null,
      notes: notes.trim() || null,
      location: location.trim() || null,
      estimated_cost_myr: cost ? parseFloat(cost) : null,
    }
```

- [ ] **Step 3: Add the input field below Title**

Find:

```tsx
          <input style={inputStyle} placeholder="Title *" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
```

Replace with:

```tsx
          <input style={inputStyle} placeholder="Title *" value={title} onChange={e => setTitle(e.target.value)} autoFocus />

          <input style={inputStyle} placeholder="Chinese name (optional)" value={nameZh} onChange={e => setNameZh(e.target.value)} />
```

- [ ] **Step 4: Verify with a build**

```bash
cd /opt/smileyapp/smiley-web && npm run build
```

Expected: build succeeds. (No commit — `smiley-web` has no git repo.)

---

## Task 8: Frontend — show `name_zh` and attraction thumbnail in `ItineraryTab`

**Files:**
- Modify: `smiley-web/src/modules/trips/tabs/ItineraryTab.tsx`

- [ ] **Step 1: Add the thumbnail and Mandarin name to each activity card**

Find:

```tsx
                <div style={{ flex: 1, paddingBottom: 16 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ color: 'var(--accent-cyan)' }}>{TYPE_ICON[act.activity_type]}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{act.title}</span>
                      </div>
```

Replace with:

```tsx
                <div style={{ flex: 1, paddingBottom: 16 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
                  }}>
                    {act.activity_type === 'attraction' && act.image_url && (
                      <img
                        src={act.image_url}
                        alt=""
                        title={act.image_attribution ?? undefined}
                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ color: 'var(--accent-cyan)' }}>{TYPE_ICON[act.activity_type]}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{act.title}</span>
                        {act.name_zh && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{act.name_zh}</span>
                        )}
                      </div>
```

- [ ] **Step 2: Verify with a build**

```bash
cd /opt/smileyapp/smiley-web && npm run build
```

Expected: build succeeds. (No commit — `smiley-web` has no git repo.)

---

## Task 9: Frontend — "Enrich Activities" button on `TripDetailPage`

**Files:**
- Modify: `smiley-web/src/modules/trips/TripDetailPage.tsx`

- [ ] **Step 1: Import `Sparkles` and `useAiEnrich`**

Find:

```ts
import { ChevronLeft, Pencil, FileDown } from 'lucide-react'
import Spinner from '../../components/Spinner'
import { useTrip, usePatchTripStatus } from '../../hooks/useTrips'
```

Replace with:

```ts
import { ChevronLeft, Pencil, FileDown, Sparkles } from 'lucide-react'
import Spinner from '../../components/Spinner'
import { useTrip, usePatchTripStatus, useAiEnrich } from '../../hooks/useTrips'
```

- [ ] **Step 2: Wire up the mutation**

Find:

```ts
  const { data: trip, isLoading, refetch } = useTrip(tripId)
  const patchStatus = usePatchTripStatus()
```

Replace with:

```ts
  const { data: trip, isLoading, refetch } = useTrip(tripId)
  const patchStatus = usePatchTripStatus()
  const aiEnrich = useAiEnrich()
```

- [ ] **Step 3: Add the button to the header actions row**

Find:

```tsx
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px' }} onClick={() => setShowEdit(true)}>
            <Pencil size={13} /> Edit
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px' }} onClick={() => setShowPdfModal(true)}>
            <FileDown size={13} /> Export PDF
          </button>
        </div>
```

Replace with:

```tsx
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px' }}
            disabled={aiEnrich.isPending}
            onClick={() => aiEnrich.mutate(tripId)}
          >
            {aiEnrich.isPending ? <Spinner size={13} /> : <Sparkles size={13} />} Enrich Activities
          </button>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px' }} onClick={() => setShowEdit(true)}>
            <Pencil size={13} /> Edit
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px' }} onClick={() => setShowPdfModal(true)}>
            <FileDown size={13} /> Export PDF
          </button>
        </div>
```

- [ ] **Step 4: Verify with a build**

```bash
cd /opt/smileyapp/smiley-web && npm run build
```

Expected: build succeeds. (No commit — `smiley-web` has no git repo.)

---

## Task 10: Frontend — `name_zh` and attraction image in `TripPdfDocument`

**Files:**
- Modify: `smiley-web/src/modules/trips/TripPdfDocument.tsx`

- [ ] **Step 1: Import `Image` from `@react-pdf/renderer`**

Find:

```tsx
import {
  Document, Page, View, Text, StyleSheet,
} from '@react-pdf/renderer'
```

Replace with:

```tsx
import {
  Document, Page, View, Text, Image, StyleSheet,
} from '@react-pdf/renderer'
```

- [ ] **Step 2: Add the new styles**

Find:

```ts
  actTime: { width: 34, fontSize: 8, color: '#999', paddingTop: 1, flexShrink: 0 },
  actType: { width: 72, fontSize: 8, color: '#666', textTransform: 'capitalize', paddingTop: 1, flexShrink: 0 },
  actBody: { flex: 1 },
  actTitle: { fontSize: 9, color: '#111', lineHeight: 1.4 },
  actNotes: { fontSize: 8, color: '#777', marginTop: 2, lineHeight: 1.4 },
  actLocation: { fontSize: 8, color: '#888', marginTop: 1 },
```

Replace with:

```ts
  actImageCol: { width: 44, marginRight: 8, flexShrink: 0, alignItems: 'center' },
  actImage: { width: 44, height: 44, borderRadius: 4, objectFit: 'cover' },
  actImageCaption: { fontSize: 5.5, color: '#bbb', marginTop: 2, textAlign: 'center' },
  actTime: { width: 34, fontSize: 8, color: '#999', paddingTop: 1, flexShrink: 0 },
  actType: { width: 72, fontSize: 8, color: '#666', textTransform: 'capitalize', paddingTop: 1, flexShrink: 0 },
  actBody: { flex: 1 },
  actTitle: { fontSize: 9, color: '#111', lineHeight: 1.4 },
  actNameZh: { fontSize: 8, color: '#999', marginTop: 1, lineHeight: 1.4 },
  actNotes: { fontSize: 8, color: '#777', marginTop: 2, lineHeight: 1.4 },
  actLocation: { fontSize: 8, color: '#888', marginTop: 1 },
```

- [ ] **Step 3: Render the image column and Mandarin name in each activity row**

Find:

```tsx
                  {sorted.map(act => (
                    <View key={act.id} style={S.actRow}>
                      <Text style={S.actTime}>
                        {act.start_time ? act.start_time.slice(0, 5) : ''}
                      </Text>
                      <Text style={S.actType}>{act.activity_type}</Text>
                      <View style={S.actBody}>
                        <Text style={S.actTitle}>{act.title}</Text>
                        {act.location
                          ? <Text style={S.actLocation}>{act.location}</Text>
                          : null}
                        {act.notes
                          ? <Text style={S.actNotes}>{act.notes}</Text>
                          : null}
                      </View>
                    </View>
                  ))}
```

Replace with:

```tsx
                  {sorted.map(act => (
                    <View key={act.id} style={S.actRow}>
                      <View style={S.actImageCol}>
                        {act.image_url ? (
                          <>
                            <Image style={S.actImage} src={act.image_url} />
                            {act.image_attribution
                              ? <Text style={S.actImageCaption}>{act.image_attribution}</Text>
                              : null}
                          </>
                        ) : null}
                      </View>
                      <Text style={S.actTime}>
                        {act.start_time ? act.start_time.slice(0, 5) : ''}
                      </Text>
                      <Text style={S.actType}>{act.activity_type}</Text>
                      <View style={S.actBody}>
                        <Text style={S.actTitle}>{act.title}</Text>
                        {act.name_zh
                          ? <Text style={S.actNameZh}>{act.name_zh}</Text>
                          : null}
                        {act.location
                          ? <Text style={S.actLocation}>{act.location}</Text>
                          : null}
                        {act.notes
                          ? <Text style={S.actNotes}>{act.notes}</Text>
                          : null}
                      </View>
                    </View>
                  ))}
```

- [ ] **Step 4: Verify with a build**

```bash
cd /opt/smileyapp/smiley-web && npm run build
```

Expected: build succeeds. (No commit — `smiley-web` has no git repo.)

---

## Task 11: Deploy and end-to-end verification

**Files:** none (deployment + manual verification only)

- [ ] **Step 1: Rebuild and restart both services**

```bash
docker compose -f /opt/smileyapp/smiley-mobile/dc-smiley-mobile.yml up -d --build smiley-api
docker compose -f /opt/smileyapp/dc-smiley-web.yml up -d --build
```

- [ ] **Step 2: Verify the AI chat flow end-to-end**

In the smiley-web Chat tab for any trip, ask: *"Add a visit to the Colosseum on day 1, around 11am"*.

Expected:
- A new `attraction` activity appears on the Itinerary tab with title "Colosseum".
- A Mandarin name (e.g. 罗马斗兽场) appears next to the title.
- Within a few seconds, a 56×56 thumbnail photo appears on the left of the card.

- [ ] **Step 3: Verify the backfill flow**

Open one of the existing Europe trips (pre-dating this feature) → Itinerary tab → click "Enrich Activities" in the header.

Expected:
- Button shows a spinner while pending.
- ~3 seconds after the request completes, the page refetches; attractions without prior images/names now show `name_zh` and thumbnails where Wikipedia has a match. Activities with no sensible Mandarin name or no Wikipedia image remain unchanged (no error, no placeholder).

- [ ] **Step 4: Verify the PDF export**

On the same trip, click "Export PDF" → "Prepare PDF" → "Download PDF".

Expected:
- Itinerary section shows the Mandarin name under each enriched activity's title.
- Attraction rows with images show a 44×44 thumbnail with a small attribution caption in the left column.
- Rows without images/names render exactly as before, with a blank 44pt left column (no layout shift in time/type/body columns).
- If any `<Image>` fails to load (CORS or network), confirm whether PDF generation still completes for the rest of the document. If it does not, escalate to add the `image-proxy` contingency from `2026-06-13-trip-itinerary-pdf-enrichment-design.md` before considering this task done.

- [ ] **Step 5: Final check — manual edit of Chinese name**

In `ActivityFormModal`, edit any activity, set "Chinese name" to a custom value, save.

Expected: value persists and displays on the Itinerary tab and in a re-exported PDF.
