# HKU IDS panorama visitor guide

The live visitor tour is https://hkuids.github.io/hku-ids-tour/. The console is https://hkuids.github.io/hku-ids-tour/console.html. This repository contains software and route settings only. Panorama pictures remain in WordPress Media Library; all 78 included originals are connected. Picture s2-030 is skipped because of a large blurred area.

## Edit and publish

1. Open the configuration console. Edit picture pace/skips, section names, arrows or junction guidance and preview the result.
2. Download **route.json to publish**. Browser edits are not automatically public.
3. In this repository, choose **Add file → Upload files**, select the downloaded route.json, and **Commit changes** to replace the published file.
4. Wait for the GitHub Pages deployment to complete. The visitor tour then uses the new settings. Existing browser previews can be reset to the published version after downloading a backup.

Only someone with repository write access can publish. Download settings is a smaller backup suitable for sharing with the assistant. New branch creation currently requires preparing footage and adding the branch topology; it is not an upload-video function in this console.

## WordPress embed

Open https://hkuids.github.io/hku-ids-tour/elementor.html, copy the iframe block and paste it into a full-width Elementor HTML widget. Update the WordPress page. Later route and branch updates use the same embed address.

## Lift guidance and future branches

At P2, on-view text directs visitors left toward P203 for the lift instead of down the stairs. **Lift directions** returns to that junction. The guide is available before lift-route panoramas are added. Its heading/instruction can be edited under **Junction name and branch choices**.

For P2 to P603, provide a 360° anonymized video and GPX, timestamps for floors/junctions, destination and turn notes, and a floor plan if available. Indoor GPS can drift; align by walking order and landmarks, label estimates, reuse the shared P2/P3 corridor and connect the new continuation at the P3 junction. New prepared JPGs are uploaded to WordPress, then their URLs and calibrated markers are added here. The later P603-to-lift recording can become a separate lift route or remain text guidance.

## Pictures and viewing

Original JPGs are 4096 × 2048. Use their full-size WordPress addresses rather than cropped thumbnails or scaled copies. Cross-site permission was checked for the current uploaded batch. The prepared pictures cover the device holder and very bottom while retaining surrounding floor. The starting view is slightly downward, and the lower viewing limit is −55°. This is not a full audit of other people’s faces; keep unredacted originals private and review new pictures before public upload.

Pannellum 2.5.7 is bundled locally under its MIT license in PANNELLUM-LICENSE.txt. No viewer CDN or Pano Mapper subscription is required.
