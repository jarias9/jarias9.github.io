# Jesus Arias — HPC & Numerical Software

A personal portfolio for Jesus Arias, focused on high-performance computing, numerical software, performance engineering, and scientific software modernization.

**Site address:** [jarias9.github.io](https://jarias9.github.io/)

The site includes selected work, a downloadable résumé, public H-60 rotorcraft CFD visualizations, light and dark themes, and a sharing QR code. It uses plain HTML, CSS, and JavaScript with no build step or external runtime dependencies.

## Repository structure

- `index.html` — page content, links, and search/social metadata.
- `styles.css` — responsive layout and themes.
- `app.js` — theme preference, simulation view selection, and sharing controls.
- `Jesus_Arias_Resume.pdf` — downloadable résumé.
- `assets/` — graphics, QR codes, video clips, and video posters.
- `CREDITS.md` — source attribution and media provenance.
- `.nojekyll` — publishes the static files directly through GitHub Pages.

## Deployment

GitHub Pages uses the **`main` branch, repository root**. Configure this under **Settings → Pages → Deploy from a branch**. Keep `index.html` and `.nojekyll` at the root.

After a commit, check the Pages deployment status and use the **Visit site** link to verify the published result. Confirm the résumé link, both simulation views, theme switch, and share dialog after relevant changes.

No package installation, build command, custom domain, or custom Actions workflow is required. See [GitHub's publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Maintenance

- Edit `index.html` for copy, `styles.css` for presentation, and `app.js` for the theme, view selector, and sharing controls. Commit and push to `main` to publish updates.
- Replace `Jesus_Arias_Resume.pdf` with an updated PDF under the same filename to preserve its download link.
- The canonical URL, social metadata, structured-data URL, and both QR files target `https://jarias9.github.io/`. The share dialog reads that canonical URL. If the destination changes, update all of these together before publishing.
- Keep the media credits in [CREDITS.md](CREDITS.md) and on the page. The decorative mesh is distinct from the authentic CFD visualizations.

Only public website files belong in this repository.
