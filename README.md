# HKU IDS panorama visitor guide

Static GitHub Pages tour. Panoramas are stored in WordPress Media Library, Panorama folder. Original recordings and unmasked review images must stay local.

- Visitor: https://hkuids.github.io/hku-ids-tour/
- Console: https://hkuids.github.io/hku-ids-tour/console.html
- Management: guide.html
- Elementor generator: elementor.html

## Configuration

route.json is the shared source of truth. Schema 6 adds tour/scene presentation settings, per-marker visibility/style/symbol, per-choice card/status visibility and per-scene viewing limits. Legacy settings import remains supported. Full route import validates unique scene IDs, route references, markers and image/link URLs. Local drafts are keyed to the published revision; visitors always load the published JSON with cache bypass.

The console exports route.json and opens GitHub's upload page. A signed-in editor uploads and commits it; it does not silently push or store an access token. Publish exports check for a newer GitHub revision before download.

## Navigation

Drag/swipe to look. Arrow keys rotate the view. Shift+Up or Enter (panorama focused) walks toward the nearest facing navigation marker within 65 degrees; Shift+Down goes back. Double click/tap a blank panorama area walks similarly. Touch taps reject drags, long touches and multitouch. Hidden markers keep their navigation topology and remain editable.

Lift transfer cards support forward and return travel, including P6 to P2. Main Campus buttons are round and Graduate House buttons use rounded squares. Room information appears at recorded room endpoints; unrecorded junction destinations are Coming soon.

## Assets

Bundled Pannellum 2.5.7 and its license are included. Its anonymous image loading / transient retry patch is retained. Newly reviewed floor versions are 2560×1280 JPGs; bystander masking and operator covers remain permanent. Indoor pitch is normally -65° with individual scene overrides. A limit controls the viewer, not the source image.

## Deploy

Upload changed software files and route.json to main, commit, and wait for Pages deployment. Reload already-open tours / WordPress embeds. Future branch additions reuse the same iframe URL. No build system or server secrets are needed.
