# Jesus Arias — HPC & Numerical Software

A buildless personal website with selected work, a downloadable résumé, dark mode, public rotorcraft CFD visualizations, and a sharing QR code.

**Intended GitHub Pages address:** https://jarias9.github.io/

This package is prepared for that address. Publication and ownership of the destination repository still need to be verified.

## Publish with GitHub Pages

1. Sign in to the intended GitHub account, `jarias9`. Inspect any existing `jarias9.github.io` repository and its Pages settings before integrating this package. Preserve existing content and history; do not force-push or overwrite an existing site blindly.
2. If no such repository exists, create a **public** repository named exactly `jarias9.github.io`. Public repositories support Pages on GitHub Free.
3. Put the **contents of this folder** at the repository root on the `main` branch. The root should contain `index.html`, `styles.css`, `app.js`, `Jesus_Arias_Resume.pdf`, `.nojekyll`, and the `assets` directory. Do not upload this ZIP as the website or nest the entire folder beneath the repository root.
4. In the repository, open **Settings → Pages**. Set **Source → Deploy from a branch**, select **main** and **/(root)**, then save.
5. Wait for GitHub's Pages deployment to complete. Use the **Visit site** link shown in Pages settings to verify the actual published address. GitHub says publication can take up to 10 minutes after a push.
6. Check the résumé download, both simulation views, theme switch, and share dialog on the live page before using the new URL or QR code publicly.

No package installation, build command, custom domain, or custom Actions workflow is required. The `.nojekyll` file tells Pages to publish the static files directly.

Official documentation:

- https://docs.github.com/en/pages/quickstart
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Maintenance

- Edit `index.html` for copy, `styles.css` for presentation, and `app.js` for the theme, view selector, and sharing controls. Commit and push to `main` to publish updates.
- Replace `Jesus_Arias_Resume.pdf` with a newly approved PDF under the same filename to preserve its download link. The included PDF is unchanged: 51,631 bytes; SHA-256 `6be463c6356b609c5c28e5b4060ccf6ac3cc3706acf464a9d05230fde6290b3a`.
- The canonical URL, social metadata, structured-data URL, and both QR files target `https://jarias9.github.io/`. The share dialog reads that canonical URL. If the destination changes, update all of these together before publishing.
- Asset references are relative. A project site under a repository subpath still requires its own correct canonical/social URL and regenerated QR codes.
- Keep the media credits in `CREDITS.md` and on the page. The decorative mesh is distinct from the authentic CFD visualizations.

Only public website files belong in this repository.
