# Reviving a MacBook Pro: From Dusty Junk to Personal Media Server

**Date:** 2025-01-15
**Tags:** linux, ubuntu, homelab, self-hosting, hardware

## The Beginning: A Broken MacBook's Second Life

We've all got one—that old laptop gathering dust in a closet, too outdated to use daily but too functional to throw away. For me, it was a MacBook Pro 13,2 from 2016, sitting unused with a broken screen backlight. You literally needed a headlamp to see what was on the display. Most people would call it e-waste. I saw an opportunity for a self-hosted media server project.

This is the story of how I transformed that broken MacBook into a fully functional Linux server hosting my personal media library, complete with remote access and automated music downloading.

## Phase 1: Getting to a Bootable State

### The Initial Assessment

The laptop had three major hardware issues:
- **Screen backlight completely dead** - Needed a headlamp just to see anything
- **Keyboard and trackpad non-functional** - No built-in input methods
- **No WiFi connectivity** - Complete network isolation

Despite these problems, the core components (CPU, RAM, storage) were perfectly fine. Time to give it new life with Ubuntu.

### Step 1: Backup and Installation

Before wiping everything, I carefully backed up all existing data to an external drive. With my headlamp strapped on (yes, really), I:

1. Downloaded the latest Ubuntu Server LTS ISO
2. Created a bootable USB drive
3. Installed Ubuntu, navigating the installer by flashlight

The installation itself went smoothly, but the real challenges were just beginning.

## Phase 2: The Hardware Gauntlet

### Challenge 1: The Display Situation

**Problem:** With no backlight, the laptop was essentially headless.

**Solution:** Connected an external monitor via HDMI. Ubuntu automatically detected it, and suddenly I could actually see what I was doing. This became the primary display for the initial setup.

### Challenge 2: The Broadcom WiFi Nightmare

This was by far the most frustrating issue. The MacBook Pro uses a Broadcom WiFi chip, which has notoriously poor Linux support.

**Initial symptoms:**
- Couldn't connect to 2.4GHz networks at all
- 5GHz networks weren't even being detected
- WiFi chip would enter a low-power mode and become unresponsive

**The fix required multiple steps:**

```bash
# Install Broadcom drivers
sudo apt-get install bcmwl-kernel-source

# Modify power management settings
sudo nano /etc/modprobe.d/broadcom.conf
# Added: options wl power_save=0
```

After updating the wireless configuration and disabling the aggressive power saving mode, both 2.4GHz and 5GHz networks finally appeared. Victory!

### Challenge 3: Keyboard and Trackpad

The built-in keyboard and trackpad simply didn't work under Ubuntu.

**Root cause:** Missing Apple-specific input device drivers.

**Solution:**
```bash
sudo apt-get install xserver-xorg-input-all
sudo apt-get install xserver-xorg-input-evdev
```

After installing the proper input drivers and rebooting, both devices sprang to life.

### Challenge 4: The Touch Bar (Spoiler: It Didn't Work)

The Touch Bar is one of those controversial Apple features, and Linux support is... minimal. I found some third-party drivers for it, but after several hours of attempting to get them working, I admitted defeat.

**Outcome:** The Touch Bar remains dark and unused. Honestly, I'm not missing it.

## Phase 3: Remote Access

With the hardware mostly functional, the next goal was to make this a true headless server I could access remotely.

### SSH Setup

Surprisingly straightforward:

```bash
# Install OpenSSH server
sudo apt-get install openssh-server

# Enable SSH service
sudo systemctl enable ssh
sudo systemctl start ssh
```

I could now SSH in from any device on my local network. One small step toward a proper server.

### Remote Desktop: A Comedy of Errors

I wanted full GUI access for initial configuration, so I attempted to set up remote desktop using xrdp.

**What went wrong:**
1. Followed advice from Gemini 2.5 Pro that sent me down the wrong path
2. Ended up configuring WireGuard VPN settings that weren't needed
3. Could almost connect, but kept getting disconnected during login
4. Windows Remote Desktop client had a bug that needed a specific setting disabled
5. Forgot to open firewall port 3389 for TCP

**The working solution:**
```bash
# Install xrdp
sudo apt-get install xrdp

# Enable firewall access
sudo ufw allow 3389/tcp

# In Windows RDP client: Disable "RemoteFX" in advanced settings
```

After reverting the unnecessary WireGuard changes and fixing the firewall, remote desktop finally worked.

### The Sleep Mode Problem

One final annoyance: closing the lid would put the laptop to sleep, breaking all connections.

**Fix:**
```bash
sudo nano /etc/systemd/logind.conf
# Set: HandleLidSwitch=ignore

sudo systemctl restart systemd-logind
```

Now I could close the lid and the server would keep running indefinitely.

## Phase 4: Building a Music Server with Navidrome

With a working Linux server, it was time to actually host something useful: my music library.

### The Setup

I chose [Navidrome](https://www.navidrome.org/) - a modern, open-source music server compatible with Subsonic/Airsonic clients. It's lightweight, well-maintained, and has a great web interface.

**Initial challenges:**

1. **Path issues:** My music library was on an external backup drive at this monster path:
   ```
   /media/vinay-shah/Backup/.HFS+ Private Directory Data^M/dir_4416437
   ```
   The HFS+ formatting from macOS and the weird directory names caused permissions issues.

2. **Permissions nightmare:** Custom library locations kept failing with access denied errors.

3. **File format incompatibility:** My entire library was in ALAC (Apple Lossless), which Navidrome couldn't play.

**Solutions:**

For simplicity, I moved my music to Navidrome's default library location (`/var/lib/navidrome/music`). This avoided all the permission issues.

For the ALAC files, I wrote a batch conversion script:

```bash
#!/bin/bash
# Convert ALAC to FLAC recursively

find . -name "*.m4a" | while read file; do
    ffmpeg -i "$file" -c:a flac "${file%.m4a}.flac"
done
```

After converting ~15GB of music overnight, everything played perfectly through Navidrome.

### Remote Access with Tailscale

Rather than exposing ports to the internet, I used [Tailscale](https://tailscale.com/) to create a secure mesh VPN. This let me access `localhost:4533` on my laptop from anywhere.

Benefits:
- Zero-config VPN
- No port forwarding needed
- End-to-end encrypted
- Works from my phone, work laptop, anywhere

## Phase 5: Docker and Advanced Services

### Containerization with Docker

To keep services isolated and easy to manage, I migrated everything to Docker:

```bash
# Install Docker
sudo apt-get install docker.io docker-compose

# Navidrome docker-compose.yml
version: '3'
services:
  navidrome:
    image: deluan/navidrome:latest
    ports:
      - "4533:4533"
    volumes:
      - ./data:/data
      - ./music:/music
    restart: unless-stopped
```

**Tailscale in Docker:** Each container can optionally run its own Tailscale client, giving it a unique address on your VPN. This provides better isolation than sharing the host's network.

### Automated Music Downloading with Soulseek

The final piece: automating music acquisition. I set up [slskd](https://github.com/slskd/slskd), a self-hosted Soulseek client with a web interface.

**Why Soulseek?**
- Large community sharing high-quality music files
- Active for 20+ years
- Finds rare/obscure music that streaming services don't have

**Setup:**
```yaml
# docker-compose.yml for slskd
version: '3'
services:
  slskd:
    image: slskd/slskd:latest
    ports:
      - "5030:5030"
    volumes:
      - ./downloads:/var/slskd/downloads
      - ./config:/var/slskd/config
    restart: unless-stopped
```

Now I can:
1. Search for music through slskd web interface
2. Queue downloads that run automatically
3. Files save directly to Navidrome's music folder
4. Navidrome scans and adds them to my library

## The Final Product

What started as a broken laptop with a dead screen is now:

- ✅ A fully functional Ubuntu server
- ✅ Headless operation (no display needed)
- ✅ Remote access via SSH and RDP
- ✅ Personal music streaming server with Navidrome
- ✅ Automated music downloading with Soulseek
- ✅ Secure remote access via Tailscale VPN
- ✅ Dockerized services for easy management

**Total cost:** $0 (used existing hardware)

**Power consumption:** ~15W idle (cheaper than a light bulb)

## What's Next?

The server is working great, but there's always room for improvement:

### Planned Enhancements

1. **Automated podcast downloading** - RSS feed monitoring and downloading
2. **Photo backup server** - Self-hosted alternative to Google Photos
3. **Home automation hub** - Home Assistant integration
4. **Network monitoring** - Pi-hole or AdGuard Home for network-wide ad blocking
5. **Better music discovery** - Integration with Last.fm or similar services for recommendations

### Lessons Learned

**Hardware can always be repurposed.** That "broken" laptop had years of life left in it—it just needed a different use case.

**Linux driver support is hit-or-miss.** Broadcom WiFi chips are notorious, but most hardware works better than you'd expect.

**Don't trust AI blindly.** Gemini 2.5 Pro sent me down a WireGuard rabbit hole that wasted hours. Always verify advice.

**Self-hosting is rewarding.** There's something satisfying about owning your data and infrastructure.

**Start simple, iterate.** I didn't build everything at once. Each phase solved one problem before moving to the next.

## Conclusion

This project took about two weeks of evening work, but the result is a capable home server that costs essentially nothing to run and gives me complete control over my media.

If you have an old laptop collecting dust, consider giving it a second life. The initial setup has a learning curve, but modern Linux distributions make it increasingly accessible. Plus, you'll learn a ton about networking, Linux administration, and self-hosting along the way.

Got questions about any of these steps? Want to share your own homelab project? Feel free to reach out—I'd love to hear about it!

---

**Hardware Used:**
- MacBook Pro 13,2 (2016, dual-core i5, 8GB RAM)
- External monitor (any HDMI display works)
- External USB keyboard and mouse (for initial setup)

**Software Stack:**
- Ubuntu Server 22.04 LTS
- Docker & Docker Compose
- Navidrome (music server)
- slskd (Soulseek client)
- Tailscale (VPN/remote access)
- xrdp (remote desktop)

**Estimated Time Investment:** 15-20 hours total (spread over 2 weeks)

**Difficulty Level:** Intermediate (comfort with terminal required)
