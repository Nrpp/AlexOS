"""The voice_dj module's backend. `router` and `on_load` are the only
two names the Module Manager looks for.

voice_dj is a DIY Google-Home-style voice DJ: say "Alex, pon musica" and
the Pi plays music on the Motorola Moto Sound Flow Bluetooth speaker,
hearing you through that same speaker's microphone. The listening,
recognition, Bluetooth A2DP<->HFP switching and Chromium web-player
driving all live in a HOST-side agent (see the module README and
agent/), because none of that is reachable from inside the Docker `api`
container. This backend is the thin AlexOS-facing surface the agent
talks to - see state.py for why it holds no audio logic itself."""

from __future__ import annotations

from typing import Any

from app.core.event_bus import EventBus

from .router import router
from .state import state

__all__ = ["router", "on_load"]


def on_load(event_bus: EventBus, config: dict[str, Any]) -> None:
    # Nothing to start here: the agent drives everything and reports in
    # over the router. We just publish an initial "offline" state so the
    # widget has something to render before the first heartbeat arrives.
    import asyncio

    async def _announce() -> None:
        await event_bus.publish("voice_dj.state", state.to_payload(), source="voice_dj", retain=True)

    asyncio.create_task(_announce())
