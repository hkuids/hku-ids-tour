# HKU IDS panorama visitor guide

This repository contains the tour software, configuration console and route settings. It contains no panorama pictures. The pictures will be hosted separately in WordPress Media Library.

## Initial setup

1. Upload the prepared JPG batch to WordPress Media Library, preserving the filenames. Use the original full-size image addresses.
2. Open `console.html` on the hosted tour, or use the existing private preview console.
3. Expand **WordPress picture addresses**, paste one original JPG address from the prepared batch, and choose **Apply this folder to all pictures**. If WordPress renamed a file, set its individual address instead.
4. Download **route.json to publish**, replace this repository’s `route.json`, and commit the update.
5. In **Settings → Pages**, deploy from **main → /(root)**. The visitor tour is at the repository’s GitHub Pages address.
6. Open `elementor.html`, copy the generated embed block, and paste it into an Elementor HTML widget.

Pictures stored on WordPress must allow the GitHub Pages tour to load them (CORS). If needed, ask the WordPress web administrator to allow this tour’s origin, or host the tour on the same website. Test picture loading before putting the embed on a public visitor page.

## Changes later

The console changes a local browser preview. It can edit section names, picture density, individual picture skips, marker positions, arrow labels and rotations, junction labels and directions, image addresses and the lower viewing limit. Download/copy `route.json` and replace that file here to publish. Only someone with GitHub repository access can change the live tour.

New branch footage can be added to the existing junctions. The three unrecorded destinations are marked Coming soon until those routes are provided.

## Pictures and viewing

The prepared pictures permanently cover the device holder and the very bottom while retaining surrounding floor. The starting view is slightly downward, and the lower viewing limit is −55°. This covers the device holder; it is not a full audit of any other people’s faces. Keep unredacted originals privately and review the prepared pictures before public upload.

Pannellum 2.5.7 is bundled locally. Its MIT license is in `PANNELLUM-LICENSE.txt`. No viewer CDN or Pano Mapper subscription is required.
