# Bay Board (Robot Fleet Status)

Hangar board for a small Unitree fleet: **9 Go2 robot dogs** (Pro and Edu) and **2 G1 humanoids**, plus batteries, chargers, and remotes.

This copy runs **on this PC**. Status, notes, photos, repairs, and bookings are stored in `data/fleet.json` (not in the cloud).

## Status lights

| Color | Meaning |
| --- | --- |
| **Green** | Working — ready to deploy |
| **Yellow** | Usable, but with conditions |
| **Red** | Out of commission — needs repair |

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4521](http://127.0.0.1:4521). Leave that terminal open while you use the board.

On the same Wi‑Fi, other devices can use `http://YOUR-LAN-IP:4521` (PowerShell: `ipconfig` → IPv4). One running copy keeps everyone’s log the same.

## Backup

Use **Export** / **Import** in the header. That downloads a JSON file with the bay log, bookings, and uploaded photos.

Live bay data stays on the machine that runs the app. It is not committed to git.
