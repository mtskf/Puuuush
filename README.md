# Staaaash

The modern, minimalist tab manager for Chrome. Save your tabs now. Restore them when you're ready.

## ✨ Why Staaaash?

Declutter your browser and your mind. Staaaash helps you organize tabs into named groups so you can focus on the task at hand.

- 🗂 **Smart Grouping**: Save all tabs in your window to a named collection with one click.
- 🔀 **Merge Groups**: Shift+Drag one group onto another to combine them (duplicates auto-removed).
- 📌 **Pin & Organize**: Pin important groups to the top, collapse them, drag-and-drop to reorder.
- 🔄 **Sync Across Devices**: All data synced via Chrome Storage Sync.
- 🔒 **Privacy First**: No external servers. Your data stays in Chrome.

## ⌨️ Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘` `/` | Archive all tabs in current window |
| `↵` | Rename selected group |
| `⌘` `↵` | Restore selected item |
| `⌫` | Delete selected item |
| `P` | Pin/Unpin selected group |
| `Esc` | Cancel editing |
| `↑` `↓` | Navigate through items |

## 🛠️ Installation & Development

This extension is built with React, Vite, TypeScript, and Tailwind CSS.

1. **Clone the repository**
   ```bash
   git clone https://github.com/mtskf/Staaaash.git
   cd Staaaash
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start Dev Server** (Hot Module Replacement)
   ```bash
   pnpm run dev
   ```

4. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the `dist` directory.

## 📦 Release Workflow

To create a new release for the Chrome Web Store:

1. **Bump Version**: Update `version` in `package.json` and `manifest.json`.
2. **Build**: Run `pnpm run build`.
3. **Package**: Zip the contents of the `dist` folder.
   ```bash
   cd dist && zip -r ../release/staaaash-vX.X.X-release.zip .
   ```
4. **Upload**: Submit the zip file to the Chrome Web Store Dashboard.

## 📄 License

MIT © [mtskf](https://github.com/mtskf)
