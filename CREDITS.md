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

## Stylized AI-upscaled helicopter hero

The integrated hero is rebuilt from the original 720 × 317 rotor-wake GIF using the official Real-ESRGAN `realesr-animevideov3-x3` model. The working frame includes one bottom padding row, producing a 2160 × 954 neural output. All 311 source frames, their order, and every 30/40 ms delay are preserved, for an exact duration of 10,360 ms. No frame interpolation or newly generated motion is added. AI super-resolution estimates and smooths fine appearance; it can alter small visual features and does not establish new physical or simulation detail. The original project clips above remain available without the AI treatment.

| File | Visible image | Encoded image | Content |
| --- | --- | --- | --- |
| `assets/h60-hero-ai-mobile.mp4` | 1080 × 477 | 1080 × 954 | Premultiplied color above grayscale alpha |
| `assets/h60-hero-ai-desktop.mp4` | 2160 × 954 | 2160 × 1908 | Premultiplied color above grayscale alpha |
| `assets/h60-hero-ai-poster.png` | 1440 × 636 | RGBA PNG | Transparent AI-upscaled still from source frame 155 |

### Neural model and runtime provenance

- Model project: [Real-ESRGAN, by Xintao Wang and contributors](https://github.com/xinntao/Real-ESRGAN).
- Official release archive: [realesrgan-ncnn-vulkan-20220424-ubuntu.zip, release v0.2.5.0](https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip).
- Archive size: 46,931,474 bytes.
- Selected members: `models/realesr-animevideov3-x3.param` and `models/realesr-animevideov3-x3.bin`.
- Inference runtime: the [ncnn Python package](https://pypi.org/project/ncnn/) version `1.0.20261020`, using eight CPU threads and float32 inference, with Vulkan and fp16 disabled. The archive's Vulkan executable is not required by this rebuild.
- The official ×3 graph uses a learned ×4 network followed by the graph's included 0.75 resize. It is not a separately trained native ×3 network.
- The selected model was measured at approximately 1.47 seconds per frame in a local CPU sample; this is a build-environment observation, not a portable runtime guarantee.

SHA-256 checksums of the downloaded archive and selected model files:

| Artifact | SHA-256 |
| --- | --- |
| Official release archive | `e5aa6eb131234b87c0c51f82b89390f5e3e642b7b70f2b9bbe95b6a285a40c96` |
| `realesr-animevideov3-x3.param` | `d1a5755008791d09b57e3425fc9dd0bd26b00fdf79c606210bc0e693f8230881` |
| `realesr-animevideov3-x3.bin` | `548a36f9c3f4ab8da56cd3b13badf23968bee207b396dad14d04b830e5f2ab2d` |

`upscale_hero_ai.py` checks the original GIF and model files, clears the bottom source rule/padding strip, and applies the same pretrained model to each source frame. It uses normalized RGB input and a ten-pixel reflected border, then removes the corresponding border from the model output. Its manifest records the script and model hashes, preprocessing, runtime and dependency versions, original delays, and PNG hashes. The neural inference stage requires ncnn, Pillow, and NumPy. It supports an explicit model directory, thread count, bounded frame ranges, and resuming interrupted work with the same verified configuration.

`prepare_hero_ai.py` verifies that manifest against the original GIF and each PNG before matting and encoding. At the 2160 × 954 neural output resolution, it measures the flat background's white point, estimates uncertain edge coverage from nearby interior colors, and caps pale-pixel opacity at `evidence / 0.70` to limit white contamination. It removes the white matte, clears the bottom nine output rows corresponding to the source rule/padding strip, and applies a mild 0.35-output-pixel filter to premultiplied color and alpha. Mobile and poster renditions are then reduced with Lanczos. This remains a stylized approximation of transparency, not a recovered original alpha channel. The preparation stage requires SciPy, Pillow, NumPy, and ffmpeg/ffprobe.

The two hero videos use ordinary H.264 High-profile/yuv420p, CRF 22, no B-frames, MP4 faststart, no audio, and BT.709 color metadata. Desktop uses level 5.0; mobile uses level 4.0. The packed representation stores premultiplied RGB in the top half and grayscale coverage in the bottom half, so browsers do not need a platform-specific alpha-video codec. Normal lossy compression still applies. The processor verifies every encoded packet's timestamp and duration against the GIF, including the final 30 ms frame.

`hero.js` combines the two halves with WebGL and sizes its output to the display's pixel density, capped at 2× and at the available media dimensions. A small alpha-noise floor suppresses compression residue in empty areas. A bounded Canvas 2D fallback uses the same prepared mask when WebGL is unavailable or lost; its maximum buffer widths are 720px on smaller layouts and 960px on desktop. It captures both packed halves in a single video read so color and coverage cannot come from different decoded frames. Prepared black margins around the packing seam prevent filtering across visible content. The true-alpha poster remains visible until a video frame has rendered successfully and serves as the failure fallback. Background removal is no longer guessed from compressed video during playback.

At desktop widths of at least 1180px, a long CSS opacity fade merges the enlarged wake behind the text; smaller layouts retain a short fade. The desktop stage trims blank vertical margins. The muted inline hero plays once when visible, then holds, with Pause, Resume, and Replay controls. It pauses offscreen and when the tab is hidden. Reduced-motion and data-saving preferences show the still until deliberate playback; blocked autoplay retains a Play control. The rendition is selected when playback first starts and retained across resizing to avoid restarting or downloading a second video. The hero visibly credits GTRI and links to the full project context.

The earlier `assets/h60-hero-clean-mobile.mp4`, `assets/h60-hero-clean-desktop.mp4`, `assets/h60-hero-clean-poster.png`, and their `prepare_hero.py` processor remain for historical rebuilds. Those versions use conventional resizing rather than neural super-resolution. The older `assets/h60-hero.mp4` derivative is also retained. These historical hero assets are no longer selected by the page.

## Other assets

`assets/social-preview-helicopter.png` is the current social-sharing preview: a 1732 × 908 PNG created with OpenAI image generation, using the H-60 hero artwork and the current portfolio layout as visual references. It combines the name and role with stylized helicopter-wake artwork on the site's cream background. This is a promotional graphic, not a new scientific visualization or simulation result. The original GTRI visualization attribution is recorded above.

The retained `assets/compute-surface.svg` illustration and `assets/social-preview.png` card contain the earlier decorative mesh design. The mesh is decorative linework, not a simulation result, and is no longer used by the current hero or advertised sharing preview. QR codes encode the intended public website address.
