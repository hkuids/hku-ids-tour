# HKU IDS panorama visitor guide

[Visitor tour](https://hkuids.github.io/hku-ids-tour/) · [Configuration console](https://hkuids.github.io/hku-ids-tour/console.html) · [Simple guide](https://hkuids.github.io/hku-ids-tour/guide.html)

GitHub is the shared source of truth. `route.json` contains all routes, picture URLs, section names, skipped pictures and marker placements. Images remain in the HKU IDS WordPress Media Library, in the Panorama folder. Do not upload source videos, raw panoramas, GPX or credentials to this public repository.

## Edit and publish

1. Open the console and select a destination / route. Change pace, section labels, markers or junction text. The status says **Local preview** when edits are waiting to be published.
2. Click **Download route.json to publish**. This is the full configuration. The optional settings backup is for restoring edits; it does not replace route.json.
3. In this repository choose **Add file → Upload files**, upload the file named **route.json** to the repository root, and **Commit changes**.
4. Open **Actions** and wait until **pages build and deployment** succeeds. Reload the visitor page or its WordPress embed. Check the **Published** date under the walking controls.
5. Reload the console. If an older preview remains, first download its optional backup, then **Reset preview to published tour**. A stale console cannot export over a newer published revision without reloading.

You do not need to send a JSON file to the assistant for routine updates. GitHub does not automatically receive console edits: it is a static host, and publishing requires the repository editor's authenticated upload/commit. No GitHub token belongs in this public console.

## Current routes

- Exit A → IDS Office P307. Redundant P2 and P2–P3 stairs pictures are retired; the first P3 stop is the junction.
- P2 entrance → IDS Seminar Room P603 via stairs, through P3, P4, P5 and P6.
- P2 entrance → IDS Seminar Room P603 via the lift beside Research Sandbox P207. The lift instruction jumps from P2 to P6 without showing the waiting/riding footage.

The P2 and P3 junctions have separate panorama markers. Information icons open room pages. P3 lift guidance is directions only until a route from that junction is recorded. The new indoor routes use walking-order diagrams and visually placed initial markers; GPX drift is unsuitable for precise indoor positioning.

The additional 25 JPGs are 2560 × 1280, about 7.7 MB total. Their device holder is covered and other visible visitors are obscured. The viewer permits some downward looking, defaults slightly downward, and stops below the configured lower edge. User-calibrated existing placements, section labels and skipped pictures are preserved.

## Adjust a branch marker

Open the relevant junction in the console. Expand **Place / rotate any arrow or information marker**, choose the specific marker, drag its doorway/path beneath the crosshair, then **Place selected marker at crosshair**. Change its text, rotation or information URL, then **Save marker appearance**. Rotation turns the arrow symbol; placement moves it within the panorama. A direction label in the junction editor does not automatically move an arrow.

## Add future branches

Provide a 2:1 panorama video, the starting junction, destination and room-page link, floor/lift instructions, and any preferred cut points. GPX is optional indoors. The preparation workflow extracts and reviews spaced frames, removes duplicates/waiting/obstructed views, masks people/device holder, uploads only prepared JPGs to WordPress, then adds route topology and junction markers to route.json. The existing console can tune those markers once the route has been connected. It does not extract frames from an uploaded video.

Use unique image filenames and original WordPress URLs. For another upload month, update only that picture/batch; the console's **Apply this folder to all pictures** intentionally replaces every image address and is only appropriate when all pictures are in that folder.

## WordPress embed

Use [the Elementor block generator](https://hkuids.github.io/hku-ids-tour/elementor.html). Paste its iframe into an Elementor HTML widget. The embed URL stays unchanged when routes are added. This tour bundles Pannellum locally, with its license included.

Deep links can start at a route/junction, for example `?route=p2-p603-lift&stop=s2-033` or `?stop=s3-003`. Add `&embed=1` for an iframe. Room links use anchors such as `#P603`; the corresponding room section IDs are installed on the WordPress premises page for automatic scrolling.

## Viewer maintenance

The bundled Pannellum 2.5.7 retains its upstream license. A small documented loader patch uses native anonymous-CORS images when `ignoreGPanoXMP` is enabled, avoiding failed XHR / FileReader transfers for WordPress media. It also ignores callbacks after a viewer is destroyed and stops processing unsuccessful legacy XHR responses. The tour gates walking while a scene loads. Original picture URLs and cross-origin security checks are unchanged.
