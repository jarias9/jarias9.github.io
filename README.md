# Jesus Arias — HPC & Numerical Software

A personal portfolio for Jesus Arias, focused on high-performance computing, numerical software, performance engineering, and scientific software modernization.

**Site address:** [jarias9.github.io](https://jarias9.github.io/)

The site includes selected work, a browsable band of eight selected results, a downloadable résumé, a full-color AI-upscaled H-60 wake hero animation, public rotorcraft CFD visualizations, light and dark themes, and a sharing QR code. It uses plain HTML, CSS, and JavaScript with no build step or external runtime dependencies.

## Repository structure

- `index.html` — page content, links, and search/social metadata.
- `styles.css` — responsive layout and themes.
- `results.css` and `results.js` — manual paging of the selected-result cards, with keyboard, touch, reduced-motion, no-JavaScript, and print support.
- `app.js` — theme preference, simulation view selection, and sharing controls.
- `hero.js` — GPU compositing of prepared transparency and accessible hero playback.
- `upscale_hero_ai.py` — offline neural super-resolution of the original H-60 GIF, with verified model files and a frame/hash manifest.
- `prepare_hero_ai.py` — offline matting, transparency packing, poster creation, and H.264 encoding of the verified AI frames.
- `prepare_hero.py` — retained preparation script for the earlier, conventionally resized clean hero assets.
- `Jesus_Arias_Resume.pdf` — downloadable résumé.
- `assets/` — graphics, QR codes, video clips, and video posters.
- `CREDITS.md` — source attribution and media provenance.
- `.nojekyll` — publishes the static files directly through GitHub Pages.

## Selected work order

1. Architecture & technical leadership
2. Profiling & optimization
3. Numerical libraries

The November 15, 2026 update publishes the approved prototype while retaining this order. The opening result cards emphasize the current work: a codebase maintained by 50+ developers, a collaborative 20% code-wide speedup, a 1.98× production-routine speedup with up to 8× in its microbenchmark, and 50–350× stencil-weight calculation on NVIDIA A100 versus AMD EPYC 7413. The second set presents 80 ms → 5 ms real-time simulation calculation, 350M+ simulation cells on 1,000+ cores, the $250K DARPA DeltaVIBE seedling with Co-PI attribution, and more than 10% lower peak lift forces from design changes informed by CFD.

The research line identifies tensor-core-accelerated fluid mechanics. Leadership is described as a five-person engineering team, with architecture, sponsor/contractor guidance, and library contributor management in the existing work sections. The detailed entries retain the separate >200× stencil-application result, 10% OpenMP submodule improvement with bitwise numerical agreement, and two internal awards totaling $60K. The up-to-8× microbenchmark result and research-topic wording were confirmed directly by the site owner.

On large desktop screens, the enlarged helicopter overlaps the header and its wake fades behind the copy. The hero uses a 2160px-wide AI-upscaled desktop rendition and a 1080px-wide mobile rendition, derived from the original GIF with the official Real-ESRGAN animevideov3 ×3 model. Prepared transparency and pixel-density-aware canvas rendering handle the enlarged animation. A transparent PNG supplies the initial, reduced-motion, and failure view. Mobile layouts stack the hero and show four results in a two-by-two grid. Buttons and touch swipes change the selected results manually; there is no automatic rotation.

## Rebuilding the hero media

The runtime page has no package dependencies. The optional offline rebuild has two stages:

1. Neural super-resolution with Python, `ncnn==1.0.20261020`, Pillow, and NumPy. The recorded build uses CPU inference; no NVIDIA GPU is required.
2. Matting and encoding with Python, Pillow, NumPy, and SciPy, plus `ffmpeg`/`ffprobe` with libx264.

Download the original rotor-wake GIF from the source in [CREDITS.md](CREDITS.md). Download the [official Real-ESRGAN model bundle](https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip) and extract `models/realesr-animevideov3-x3.param` and `models/realesr-animevideov3-x3.bin` into the same model directory. The model graph supplies the ×3 result through a learned ×4 network followed by its included 0.75 resize. Model and source checksums are recorded in [CREDITS.md](CREDITS.md).

From the repository root, run:

```sh
python upscale_hero_ai.py /path/to/original-rotor-wake.gif \
  --model-dir /path/to/models --output-dir work/ai-frames --threads 8
python prepare_hero_ai.py /path/to/original-rotor-wake.gif work/ai-frames assets \
  --work-dir work/packed
```

The first stage writes AI-upscaled PNG frames and a manifest containing provenance, frame hashes, and the original delays. Use `--resume` with the same script, model, dependency versions, and thread count to continue an interrupted upscale; `--start` and `--end` select a bounded frame range, with the end index exclusive. The second stage checks the source and frame hashes, builds a matte at the neural output resolution, and produces `assets/h60-hero-ai-desktop.mp4`, `assets/h60-hero-ai-mobile.mp4`, and `assets/h60-hero-ai-poster.png`. It verifies every encoded frame's timestamp and duration against the original GIF: 311 frames and exactly 10,360 ms. Do not commit the model weights or working directories to the published repository.

The desktop visible image is 2160 × 954; the mobile image is 1080 × 477. Each H.264 file packs premultiplied color above grayscale alpha, doubling its encoded height. The transparent poster is 1440 × 636 and comes from frame 155. The browser retains the packed WebGL player and its Canvas 2D and poster fallbacks.

AI super-resolution estimates and smooths fine appearance; it does not establish new physical or simulation detail. All original frames, their order, and their delays are retained, with no frame interpolation or newly generated motion. The original project clips below the hero remain independent of the AI treatment. The previous clean hero assets and `prepare_hero.py` are retained for historical rebuilds.

## Deployment

GitHub Pages uses the **`main` branch, repository root**. Configure this under **Settings → Pages → Deploy from a branch**. Keep `index.html` and `.nojekyll` at the root.

After a commit, check the Pages deployment status and use the **Visit site** link to verify the published result. Confirm the résumé link, hero playback, both simulation views, theme switch, and share dialog after relevant changes.

No package installation, build command, custom domain, or custom Actions workflow is required. See [GitHub's publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Maintenance

- Edit `index.html` for copy, `styles.css` for presentation, `app.js` for the theme, view selector, and sharing controls, and `hero.js` for the hero animation. Commit and push to `main` to publish updates.
- When replacing `styles.css`, `results.css`, `results.js`, or `hero.js`, update its `?v=` token in `index.html` so returning visitors load the matching presentation and renderer.
- Replace `Jesus_Arias_Resume.pdf` with an updated PDF under the same filename to preserve its download link.
- The canonical URL, social metadata, structured-data URL, and both QR files target `https://jarias9.github.io/`. The share dialog reads that canonical URL. If the destination changes, update all of these together before publishing.
- Keep the media credits in [CREDITS.md](CREDITS.md) and on the page. The hero is a stylized derivative of the GTRI rotor-wake footage; the detailed project videos preserve the original colors, framing, and timing.

Only public website files belong in this repository.
