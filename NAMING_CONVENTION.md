# FlowLens Naming Convention — Designer Guide

## The rule

Name any interactive element in Figma with this pattern:

```
action-{type}-{label}
```

That's it. FlowLens will find them automatically.

---

## Quick reference

| What you're designing | Name it | Type parsed |
|---|---|---|
| A button that says "Deposit" | `action-button-deposit` | button |
| A button that says "Sign In" | `action-button-sign-in` | button |
| A back arrow icon | `action-icon-back` | icon-button |
| A search bar | `action-input-search` | input |
| A link to settings | `action-link-settings` | link |
| A bottom nav "Home" tab | `action-nav-home` | nav-item |
| A tab for "History" | `action-tab-history` | tab |
| A dropdown for currency | `action-dropdown-currency` | dropdown |
| Dark mode toggle | `action-toggle-dark-mode` | toggle |
| A clickable card | `action-card-recent-transfer` | card |
| Floating action button | `action-fab-add` | fab |
| Menu item "Logout" | `action-menu-logout` | menu-item |
| Filter chip | `action-chip-filter-date` | chip |

---

## Supported types

`button` · `icon` · `input` · `dropdown` · `toggle` · `checkbox` · `radio` · `tab` · `link` · `nav` · `card` · `menu` · `fab` · `chip`

Short aliases work too: `btn` = button, `icon` = icon-button, `nav` = nav-item, `switch` = toggle, `select` = dropdown

---

## Tips

**Labels with multiple words** — use dashes:
- `action-button-sign-in` → "Sign In"
- `action-card-recent-transfer` → "Recent Transfer"

**Only name interactive things** — don't prefix static text, decorative images, or backgrounds. Only elements that a user would tap/click.

**Works on any layer type** — the naming convention works whether the node is a Frame, Component, Instance, Group, or anything else. FlowLens searches the entire tree.

**Nested is fine** — your `action-button-deposit` can be 5 levels deep inside groups. FlowLens finds it regardless of nesting depth.

**One name per element** — each interactive element gets one `action-*` name. Don't put `action-` on both a button and its child text layer.

---

## What FlowLens does with this

1. Reads your Figma file via the API
2. Finds every node starting with `action-`
3. Parses the type and label from the name
4. Gets the bounding box (position + size) from Figma
5. Normalizes it relative to the parent frame
6. Overlays it on your uploaded screenshot
7. You connect each action to its target screen
8. FlowLens builds the complete flow visualization
