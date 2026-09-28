# GitHub Pages preview

The `preview/github-pages` branch publishes an interactive demo at https://flightmeet.jdeffner.com/. The default `main` branch remains the PHP/MySQL application. No preview changes are needed to clone or run that version.

The preview uses the existing interface with sample data stored in the visitor's browser. Meets, groups, chat, profiles, registration, and admin controls work with this local data. Changes are not shared between visitors. No PHP server or database is contacted.

Fresh visits start signed in as Alex Pilot (`demo`). Use **Try as pilot** or **Try as admin** in the preview controls to switch accounts. You can also log in as `demo` or `admin` with any made-up password. Registration is a simulation. Use example details. Passwords are not checked or stored. **Reset demo** restores the sample records and signs you in as the pilot. A saved account choice or explicit logout is preserved across page reloads.

All weather in the preview is simulated. Do not use it for flight planning. Weather search includes Trier, Kandel, Brauneck, Zeltingen, and Freiburg. Map tiles and web fonts need an internet connection. Legal and support footer links remain the existing placeholders.

## Build and check locally

Use Node.js 24 and pnpm 10.33.0. From `frontend/`:

```sh
pnpm install --frozen-lockfile
pnpm test:preview
pnpm build:pages
pnpm preview:pages
```

Open `http://localhost:4173/`. Routes use the URL hash so links and page reloads work on GitHub Pages. The `pages` build mode uses the custom domain root, substitutes the browser demo API, and writes only static frontend assets to `frontend/dist/`.

`pnpm dev` and `pnpm build` retain the normal API, routing, `/public/` production base, and `public/` output. The Pages build does not overwrite `public/` or include backend files, environment files, database exports, or deployment credentials.

## Publish updates

Push preview changes to `preview/github-pages`. The `Deploy Pages preview` workflow checks and builds the frontend, then deploys only `frontend/dist/`. GitHub Pages uses the Actions publishing source. The `github-pages` environment permits deployment from this preview branch.

The repository's Pages custom domain is `flightmeet.jdeffner.com`. Its Cloudflare DNS record must be a DNS-only `CNAME` named `flightmeet` pointing to `jdeffner.github.io`. GitHub manages the HTTPS certificate. The main `jdeffner.com` website uses separate DNS records.

To bring later application changes into the preview, merge `main` into `preview/github-pages`, resolve any conflicts, run the checks above, and push the preview branch. Do not merge preview-specific behavior into `main` merely to publish a preview update.

The existing full lint command has five pre-existing errors outside the preview changes. The workflow runs TypeScript, the preview outcome tests, and lint for the changed application files without weakening the existing lint rules.
