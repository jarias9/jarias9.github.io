# Jesus Arias — HPC & Numerical Software

A personal portfolio for Jesus Arias, focused on high-performance computing, numerical software, performance engineering, and scientific software modernization.

**Site address:** [jarias9.github.io](https://jarias9.github.io/)

The site includes selected work, a prominent performance-results band, a downloadable résumé, a full-color H-60 wake hero animation, public rotorcraft CFD visualizations, light and dark themes, and a sharing QR code. It uses plain HTML, CSS, and JavaScript with no build step or external runtime dependencies.

## Repository structure

- `index.html` — page content, links, and search/social metadata.
- `styles.css` — responsive layout and themes.
- `app.js` — theme preference, simulation view selection, and sharing controls.
- `hero.js` — background removal and accessible playback for the colored helicopter hero.
- `Jesus_Arias_Resume.pdf` — downloadable résumé.
- `assets/` — graphics, QR codes, video clips, and video posters.
- `CREDITS.md` — source attribution and media provenance.
- `.nojekyll` — publishes the static files directly through GitHub Pages.

## Selected work order

1. Architecture & technical leadership
2. Profiling & optimization
3. Numerical libraries

The November 15, 2026 update retains this order while restoring major results from the approved public résumé: 50–350× stencil-weight calculation on NVIDIA A100 versus AMD EPYC 7413, a separate >200× stencil-application result, a collaborative 20% code-wide speedup, and 80 ms → 5 ms calculation time for the NETL HyPer fuel-cell/reformer simulation. The detailed work entries also include the separate 1.98× routine speedup and 10% OpenMP submodule improvement with bitwise numerical agreement.

On large desktop screens, the enlarged helicopter overlaps the header and its wake fades behind the copy. The desktop hero uses the existing 720px video; smaller screens keep the lighter 480px derivative. Mobile layouts stack the hero and show the results in two columns.

## Deployment

GitHub Pages uses the **`main` branch, repository root**. Configure this under **Settings → Pages → Deploy from a branch**. Keep `index.html` and `.nojekyll` at the root.

After a commit, check the Pages deployment status and use the **Visit site** link to verify the published result. Confirm the résumé link, hero playback, both simulation views, theme switch, and share dialog after relevant changes.

No package installation, build command, custom domain, or custom Actions workflow is required. See [GitHub's publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Maintenance

- Edit `index.html` for copy, `styles.css` for presentation, `app.js` for the theme, view selector, and sharing controls, and `hero.js` for the hero animation. Commit and push to `main` to publish updates.
- When replacing `styles.css` or `hero.js`, update its `?v=` token in `index.html` so returning visitors load the matching presentation and renderer.
- Replace `Jesus_Arias_Resume.pdf` with an updated PDF under the same filename to preserve its download link.
- The canonical URL, social metadata, structured-data URL, and both QR files target `https://jarias9.github.io/`. The share dialog reads that canonical URL. If the destination changes, update all of these together before publishing.
- Keep the media credits in [CREDITS.md](CREDITS.md) and on the page. The hero is a stylized derivative of the GTRI rotor-wake footage; the detailed project videos preserve the original colors, framing, and timing.

Only public website files belong in this repository.
