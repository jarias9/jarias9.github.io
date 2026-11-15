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

`assets/h60-hero.mp4` is a 480 × 212 H.264 derivative of the rotor-wake video: 311 frames, 10.36 seconds, and 1,292,009 bytes. The source frame order and presentation timing are preserved. Encoding uses Lanczos resizing, libx264 CRF 24, yuv420p, no B-frames, MP4 faststart, and no audio.

`hero.js` uses Canvas 2D to approximate removal of the original white background while retaining the colored foreground. Near-white edge pixels receive transparency and white unmatting. The final six rows of source rule/padding are cleared at 720px, or four rows in the 480px derivative. At desktop widths of at least 1180px, a long CSS opacity fade merges the enlarged wake behind the text; smaller layouts retain a short fade. The desktop stage trims blank vertical margins. This is a stylized presentation of the real footage, not a recovered original alpha channel. The detailed project videos below remain available in their original colors and framing. No flow geometry, vortices, camera motion, or intermediate frames are generated.

The muted inline hero plays once when visible, then holds, with Pause, Resume, and Replay controls. It pauses offscreen and when the tab is hidden. Reduced-motion and data-saving preferences use a still until deliberate playback; blocked autoplay retains a Play control. The enlarged desktop view uses the existing `h60-wake.mp4` and a 720 × 318 canvas buffer. Smaller viewports and data-saving mode use `h60-hero.mp4` and a 480 × 212 buffer. The source is selected when the page initializes; both buffer sizes remain independent of screen pixel density. The hero visibly credits GTRI and links to the full project context.

## Other assets

The retained computational mesh illustration and social preview were created for this personal site. The mesh is decorative linework, not a simulation result, and is no longer used by the current hero. QR codes encode the intended public website address.
