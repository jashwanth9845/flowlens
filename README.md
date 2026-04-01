# FlowLens

**Visual prototype & flow builder** powered by Figma's node tree.

Upload screenshots. Detect interactive elements via naming convention. Build complete prototype flows — no AI, no cost.

## How it works

1. **Name components in Figma**: `action-button-deposit`, `action-link-settings`, `action-nav-home`
2. **Connect FlowLens** to your Figma file (personal access token + file URL)
3. **Upload screenshots** for each screen/frame
4. **Connect actions** — click a detected button → pick target screen
5. **See the complete flow** — visual graph + playable prototype

## Naming convention

```
action-{type}-{label}
```

| Figma Node Name | Detected As |
|---|---|
| `action-button-deposit` | button: **Deposit** |
| `action-link-settings` | link: **Settings** |
| `action-nav-home` | nav-item: **Home** |
| `action-icon-back` | icon-button: **Back** |
| `action-input-search` | input: **Search** |
| `action-toggle-dark-mode` | toggle: **Dark Mode** |

Supported types: `button`, `icon`, `input`, `dropdown`, `toggle`, `checkbox`, `radio`, `tab`, `link`, `nav`, `card`, `menu`, `fab`, `chip`

See [NAMING_CONVENTION.md](./NAMING_CONVENTION.md) for the full designer guide.

## Tech stack

- **Next.js 14** (App Router)
- **Zustand** + Immer (state management)
- **Tailwind CSS v4** (styling)
- **Figma REST API** (node tree access)
- **Vercel** (deployment)

## Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Figma token

1. Go to [figma.com](https://figma.com) → Settings → Security
2. Generate personal access token → `file_content:read` scope
3. Paste into FlowLens

## Deploy

Deployed on Vercel. Push to `main` → auto-deploys.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical spec.

## License

MIT
