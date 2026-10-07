# Satisfactory Tools

New generation of [Satisfactory Tools](https://www.satisfactorytools.com/) - a production planner and toolset for the game Satisfactory.

Built with Angular (standalone components), Bootstrap 5 + ngx-bootstrap, AntV X6 for the interactive planner graph, and the HiGHS LP solver for production calculations.

## Requirements

- Node v20.19+ (or v22.12+)
- npm

## Installation

```bash
npm install
```

Then create your local environment file (it is gitignored; CI generates it from the production one):

```bash
cp src/env/env.prod.ts src/env/env.ts
```

Adjust `apiUrl` in `src/env/env.ts` if you want to point at a different backend.

## Development

```bash
npm start
```

Then visit `http://localhost:4200/`. The app reloads automatically on source changes.

Other useful scripts:

```bash
npm run watch   # Development build in watch mode (no dev server)
```

## Build

```bash
npm run build
```

The production build is emitted to the `dist/` folder. It uses `src/env/env.prod.ts` via build-time file replacement.

## Desktop app

A Tauri wrapper around the same bundle, released on every push to master.
Installers are published next to the API; the app updates itself from there.

### Code signing policy

Free code signing provided by [SignPath.io](https://signpath.io), certificate
by [SignPath Foundation](https://signpath.org).

Windows installers are built by GitHub Actions from this repository
(`.github/workflows/ci.yml`) and signed through SignPath. Every signing request
is approved by hand. macOS builds are ad-hoc signed and not notarized, so
macOS asks for "Open Anyway" in System Settings → Privacy & Security on first
launch.

| Role | |
|---|---|
| Committers and reviewers | [greeny](https://github.com/greeny) |
| Approvers | [greeny](https://github.com/greeny) |

### Privacy

The desktop app talks to `api.new.satisfactorytools.com`: on start it fetches
the update manifest, and it downloads game data and icons on demand. When you
sign in, your plans and settings are synced with your account. Page views are
reported to the project's self-hosted, cookieless Matomo instance; no
personal data, no tracking across sites. Nothing else leaves your machine. The
web app at [satisfactorytools.com](https://www.satisfactorytools.com/) behaves
the same way.

## License

[MIT](LICENSE). Satisfactory is made by Coffee Stain Studios; game icons and
names are used with their permission and remain their property.
