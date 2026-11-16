# Media credits and provenance

## HH-60G rotorcraft CFD visualizations

**Visualization credit: Georgia Tech Research Institute.**

The two animations were published in GTRI's **VSTAR** article by John Toon on December 16, 2021. The article names Jesus Arias, Maia Gatlin, and Andrew Harper and provides the simulation media and project overview link.

- Article: https://gtri.gatech.edu/newsroom/vstar
- Rotor wake original: https://gtri.gatech.edu/public/prod/inline-images/mu0368_gif%20%281%29.gif
- Flow field original: https://gtri.gatech.edu/public/prod/inline-images/mu0000_gif.gif
- Official GTRI project overview: https://www.youtube.com/watch?v=AsvgyJwrHKA
- Related AIAA SciTech 2023 paper: https://doi.org/10.2514/6.2023-0422

These animations come from the GTRI feature; they were not extracted from the AIAA paper. The page describes Jesus Arias's contribution to rotorcraft simulation and distinguishes it from the broader team's predictive-maintenance work. The video overview remains hosted on YouTube.

### Included derivatives

| File | Content | Frames | Duration |
| --- | --- | ---: | ---: |
| `assets/h60-wake.mp4` | Rotor wake | 311 | 10.36 s |
| `assets/h60-flow.mp4` | Flow field | 302 | 10.06 s |
| `assets/h60-wake-poster.png` | Original wake frame 155, zero-based | Still | — |
| `assets/h60-flow-poster.png` | Original flow frame 151, zero-based | Still | — |

MP4/H.264 conversions preserve the original frame count, presentation timestamps, durations, order, and framing. Original 720 × 317 frames have one bottom padding row for 720 × 318 video encoding; no source pixels are cropped or stretched. Encoding uses CRF 18, H.264 High/3.1, yuv420p, no B-frames, and MP4 faststart. Normal lossy video encoding applies. The PNG posters are lossless decoded original frames. The two detailed project videos play only on visitor request.

Original GIF SHA-256 checksums:

- Rotor wake: `34d5c430febc47ced530ddcd87611ff6de54f2d83ca238af8025cd21f6522287`
- Flow field: `98b92932f64f789b6c5ba98faeb1d1ca9f03ad58c299680e55ba7a9f20af5383`

Preserve the original scientific content and visible attribution in future edits. These credits do not assert an open license or GTRI endorsement.

## Stylized helicopter hero

The integrated hero is rebuilt directly from the original 720 × 317 rotor-wake GIF, rather than from a previously compressed MP4. It preserves all 311 original frames, their order, and every 30/40 ms delay, for an exact duration of 10.36 seconds. No flow geometry, vortices, camera motion, or intermediate frames are generated. Upscaling improves sampling and presentation; it does not recover new simulation detail from a higher-resolution original.

| File | Visible image | Encoded image | Content |
| --- | --- | --- | --- |
| `assets/h60-hero-clean-mobile.mp4` | 1080 × 477 | 1080 × 954 | Premultiplied color above grayscale alpha |
| `assets/h60-hero-clean-desktop.mp4` | 2160 × 954 | 2160 × 1908 | Premultiplied color above grayscale alpha |
| `assets/h60-hero-clean-poster.png` | 1440 × 636 | RGBA PNG | Transparent still from original frame 155 |

`prepare_hero.py` creates a conservative foreground matte from the lossless GIF frames, estimates uncertain edge coverage from nearby interior colors, bounds pale-pixel opacity to remove white contamination, and removes the original white matte before resizing. It clears the bottom three source rule/padding rows, applies a mild 0.40-pixel antialiasing filter to premultiplied color and alpha, and resizes with Lanczos. This is a stylized approximation of transparency, not a recovered original alpha channel. The detailed project videos remain available with their original colors and framing.

The two hero videos use ordinary H.264 High-profile/yuv420p, CRF 22, no B-frames, MP4 faststart, no audio, and BT.709 color metadata. Desktop uses level 5.0; mobile uses level 4.0. The packed representation stores premultiplied RGB in the top half and grayscale coverage in the bottom half, so browsers do not need a platform-specific alpha-video codec. Normal lossy compression still applies. The processor verifies every encoded packet's timestamp and duration against the GIF, including the final 30 ms frame.

`hero.js` combines the two halves with WebGL and sizes its output to the display's pixel density, capped at 2× and at the available media dimensions. A small alpha-noise floor suppresses compression residue in empty areas. A bounded Canvas 2D fallback uses the same prepared mask when WebGL is unavailable or lost; its maximum buffer widths are 720px on smaller layouts and 960px on desktop. The true-alpha poster remains visible until a video frame has rendered successfully and serves as the failure fallback. Background removal is no longer guessed from compressed video during playback.

At desktop widths of at least 1180px, a long CSS opacity fade merges the enlarged wake behind the text; smaller layouts retain a short fade. The desktop stage trims blank vertical margins. The muted inline hero plays once when visible, then holds, with Pause, Resume, and Replay controls. It pauses offscreen and when the tab is hidden. Reduced-motion and data-saving preferences show the still until deliberate playback; blocked autoplay retains a Play control. The rendition is selected when playback first starts and retained across resizing to avoid restarting or downloading a second video. The hero visibly credits GTRI and links to the full project context.

The older `assets/h60-hero.mp4` derivative remains in the repository for previous versions but is no longer used by the page.

## Other assets

The retained computational mesh illustration and social preview were created for this personal site. The mesh is decorative linework, not a simulation result, and is no longer used by the current hero. QR codes encode the intended public website address.
