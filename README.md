# Valorant Rank Overlay

A static OBS browser-source overlay showing your current rank, RR, today's W-L, last match RR and today's RR. Data comes from the [HenrikDev API](https://docs.henrikdev.xyz/); rank icons from valorant-api.com. No backend, everything runs in the browser.

## Use
1. Get a free API key from the HenrikDev Discord dashboard.
2. Open `index.html` (locally or on your GitHub Pages site), enter Riot name, tag, region and key.
3. Copy the generated URL.
4. In OBS: **Sources → + → Browser**, paste the URL, set **Width 550, Height 200**.

The URL contains your API key. Don't show it on stream.

Change account any time by editing the fields in the configurator and copying the new URL.

## Notes
- Daily stats reset at the configured hour (default 5:00 local time).
- Today's W/L is inferred from RR change (positive = win, otherwise loss).
- Refresh is every 75 s by default (min 30) to respect API rate limits.

## Host on GitHub Pages
1. Push this folder to a GitHub repo.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Your setup page is at `https://<user>.github.io/<repo>/`.

## Testing
- **Visual test bench:** open `test.html` in a browser. Buttons simulate wins, losses, rank-ups, deranks, streaks and rapid-fire updates so you can check every animation without playing a match. Works from local files.
- **Unit tests:** `node --test tests/stats.test.js` (daily reset logic, stats, config round-trip, API parsing and error handling with mocked fetch).

## Animations
RR change (floating +/- popup, bar glow, number count), rank-up (bar fills, green glow, icon pops in) and derank (bar drains, red drop). Toggle with the "Animations" checkbox or `anim=0` in the URL.
