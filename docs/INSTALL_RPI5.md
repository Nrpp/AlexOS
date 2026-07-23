# Installing AlexOS on a Raspberry Pi 5

This is the target device for AlexOS: a Raspberry Pi 5 with the official
Raspberry Pi Touch Display, running the production Docker stack so it
survives reboots and updates with one command.

## What you need

- Raspberry Pi 5 (4GB or 8GB)
- Official Raspberry Pi Touch Display (or any HDMI display, for headless/dev use)
- USB-C power supply rated for Pi 5 (5V/5A - official Pi 5 supply, or a PD supply that negotiates it)
- A microSD card (32GB+) **or** an NVMe SSD on a PCIe HAT (recommended - AlexOS is meant to run all day, every day; an SSD is far more reliable long-term than an SD card)
- Another computer to flash the OS, and a monitor/keyboard or SSH access to the Pi

## 1. Flash the OS

1. Install [Raspberry Pi Imager](https://www.raspberrypi.com/software/) on your computer.
2. Choose **Raspberry Pi OS (64-bit)** - the full desktop version, not Lite. AlexOS's kiosk mode needs a desktop compositor to run Chromium full-screen on the touch display.
3. In the Imager's settings (gear icon / "Edit Settings"), before writing:
   - Set a hostname (e.g. `alexos`)
   - Enable SSH and set a password, or add your SSH key
   - Configure Wi-Fi if you're not using Ethernet
4. Write the image, then boot the Pi with the display attached.

## 2. First boot

Finish the on-screen setup wizard (or, if headless, SSH in:
`ssh <user>@alexos.local`), then update the system:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo reboot
```

## 3. Install Docker

AlexOS's Dockerfiles use official multi-arch images (`python:3.12-slim`,
`node:20-alpine`, `nginx:1.27-alpine`), all of which publish `arm64`
builds - nothing in the project needs to change for the Pi, Docker just
pulls the right architecture automatically.

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo systemctl enable --now docker
```

Log out and back in (or reboot) so your user picks up the `docker` group,
then confirm Compose is available (it ships as a plugin with the script
above):

```bash
docker compose version
```

## 4. Get the code

```bash
sudo apt install -y git
git clone https://github.com/Nrpp/AlexOS.git ~/AlexOS
cd ~/AlexOS
cp .env.example .env
```

Edit `.env` if you need to - the defaults work for accessing AlexOS from
the Pi itself. If you'll reach it from other devices on your network too,
set `ALEXOS_CORS_ORIGINS` to include however you'll address it (e.g.
`http://alexos.local` alongside `http://localhost`).

## 5. Run it

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

That's the whole production deployment - one command, as the project's
Docker rule requires. First run takes a few minutes to build both
images; after that, `up -d` is seconds.

Check it's healthy:

```bash
docker compose -f docker/docker-compose.yml ps
curl http://localhost:8000/api/v1/system/health
```

Open `http://localhost` (or `http://alexos.local`) in a browser - you
should see the AlexOS shell: Status Bar, Home page, and the floating Dock.

Both services already have `restart: unless-stopped`, so they come back
on their own after a reboot or a crash - you don't need to re-run this
command again unless the code changes.

## 6. Kiosk mode on the touch display

To make the touch display boot straight into AlexOS, full-screen, with no
browser chrome:

1. Install a lightweight kiosk helper: `sudo apt install -y unclutter`
   (hides the mouse cursor when idle - there's no mouse on a touch
   display, so this keeps the screen clean).
2. Autostart Chromium in kiosk mode. Raspberry Pi OS Bookworm's default
   desktop autostarts from `~/.config/wayfire.ini` (Wayland/Wayfire) on
   most Pi 5 images; older/X11 setups use
   `~/.config/lxsession/LXDE-pi/autostart` instead - check which file
   exists on your image and add the equivalent of:

   ```ini
   [autostart]
   autostart = chromium-browser --kiosk --noerrdialogs --disable-infobars --incognito http://localhost
   ```

   (For the X11-style `autostart` file, the line is
   `@chromium-browser --kiosk --noerrdialogs --disable-infobars --incognito http://localhost`
   instead of the `wayfire.ini` block above.)
3. Disable screen blanking so the display never sleeps - in
   **Raspberry Pi Configuration → Display**, turn off "Screen Blanking".
4. Reboot. The Pi should come up straight into AlexOS, full-screen, ready
   to touch.

## 7. Updating

```bash
cd ~/AlexOS
git pull
docker compose -f docker/docker-compose.yml up -d --build
```

## Troubleshooting

- **Port 80 already in use** (e.g. you're also running Pi-hole, which
  spec'd to appear inside AlexOS's Servers page later, listens there
  too): change the `web` service's port mapping in
  `docker/docker-compose.yml` from `"80:80"` to something like
  `"8080:80"`, then visit `http://localhost:8080`.
- **Containers won't start**: `docker compose -f docker/docker-compose.yml logs -f`
  shows both services' output.
- **Blank/black screen on the touch display but the API/web respond over
  the network**: it's almost always the kiosk autostart file - check
  `journalctl --user -xe` or that the correct autostart file for your
  image (Wayfire vs LXDE) is the one being read.
- **Out of disk space over time**: `docker system prune` clears old,
  unused images/layers from previous builds.

## Development on the Pi itself (optional)

If you want to edit AlexOS directly on the Pi with hot reload instead of
running the production build:

```bash
sudo apt install -y python3-venv nodejs npm
./scripts/setup.sh
./scripts/dev.sh
```

Web runs at `http://localhost:5173`, API at `http://localhost:8000`. This
is slower than the production Docker build and not what you want for
daily use - it's for when you're actively changing code on the Pi.
