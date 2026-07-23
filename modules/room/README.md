# Room

Powers the Room page's lights and scenes card. **Real data** via a
Home Assistant instance you already run.

## Setup

1. In Home Assistant: **Profile** (click your name, bottom left) →
   scroll to **Long-Lived Access Tokens** → **Create Token**. Copy it -
   HA only shows it once.
2. Add to your own `.env` on the Pi (never commit this file, never
   paste the token anywhere else):

   ```bash
   HA_BASE_URL=http://homeassistant.local:8123
   HA_ACCESS_TOKEN=<the token you just generated>
   ```

3. Find your lights' entity IDs: HA → **Developer Tools** → **States**,
   filter for `light.`. Edit `modules/room/config.json`:

   ```json
   { "lightEntityIds": ["light.living_room", "light.desk_lamp"] }
   ```

4. Restart the backend (`docker compose ... up -d --build` or your dev
   server).

## What it does

- **Backend** (`backend/`): `GET /api/v1/modules/room/lights` (real
  state from HA), `PATCH /lights/{entity_id}` (`{ "on"?, "brightness"? }`,
  calls HA's `light.turn_on`/`light.turn_off` services), `POST
  /scenes/{name}` (`focus`/`sleep`/`morning` - AlexOS-side presets
  applied to each configured light directly, not HA scene entities, so
  there's nothing to pre-create in HA). All publish `room.updated`.
- **Frontend** (`frontend/index.tsx`): a `RoomWidget` with per-light
  toggles and three scene buttons. Shows a clear "Home Assistant isn't
  connected" state (not a blank card) if `HA_BASE_URL`/`HA_ACCESS_TOKEN`
  aren't set yet.

## Secrets vs. configuration

`HA_BASE_URL` and `HA_ACCESS_TOKEN` are read from the environment
(`os.environ`), never from `config.json` - `config.json` is committed to
git and is for non-secret configuration only (which lights to show).
This is the pattern for any module needing credentials: read them from
the environment, never commit them. See `.env.example` at the repo root.
