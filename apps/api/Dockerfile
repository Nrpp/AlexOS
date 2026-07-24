# Production image: no reload, minimal layers.
FROM python:3.12-slim

WORKDIR /srv/api

# network-manager (nmcli) and bluez (bluetoothctl) let modules/control_center
# manage the host's WiFi/Bluetooth - see that module's README for the
# D-Bus bind-mount this also requires. curl+gnupg are only needed to add
# Tailscale's apt repo below, not at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends network-manager bluez curl gnupg \
    && curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.noarmor.gpg -o /usr/share/keyrings/tailscale-archive-keyring.gpg \
    && curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.tailscale-keyring.list -o /etc/apt/sources.list.d/tailscale.list \
    && apt-get update && apt-get install -y --no-install-recommends tailscale \
    && apt-get purge -y --auto-remove curl gnupg \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api/app ./app
COPY modules /srv/modules
RUN mkdir -p /srv/api/data

ENV ALEXOS_MODULES_DIR=/srv/modules
# Absolute path (4 slashes) so the compose volume at /srv/api/data
# persists the database across container recreation without clobbering
# the app code copied into /srv/api above.
ENV ALEXOS_DATABASE_URL=sqlite+aiosqlite:////srv/api/data/alexos.db
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
