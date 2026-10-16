# Animal Timer

A visual timer PWA for kids, inspired by Mouse Timer. Each day a different animal
(chosen deterministically from the date) eats its favorite food: a mouse eats cheese, a horse eats apples,
a dog eats sausages, a fly eats poop, and so on.

Pick a number of minutes and a grid of `minutes × 6` foods appears. The animal eats
one food every 10 seconds (so one row per minute). When the last one is gone, an alarm plays.

Live at **https://mukimies.github.io/animaltimer/** (deployed from `main` via GitHub Pages).

- No build step, no dependencies: plain HTML/CSS/JS.
- Works offline once loaded (service worker in `sw.js`).
- A running timer survives reloads and closing the app; it's based on timestamps.
- Settings (⚙️): hide minute options, toggle sound, toggle remaining-time display.

## Run locally

    python3 -m http.server 8000
    # open http://localhost:8000

Installing as an app requires HTTPS (or localhost). Any static host works, e.g.
GitHub Pages, Netlify or Cloudflare Pages.

## Customize

- Animals and foods: `ANIMALS` in `app.js`
- Minute options: `MINUTE_OPTIONS` in `app.js`
- The service worker is network-first, so changes show up on reload; bump `VERSION` in `sw.js` to refresh the offline cache.
