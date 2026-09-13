# Slash Tree for Obsidian

**English** | [简体中文](README.zh-CN.md)

Turn a fixed-format text into a slash-style binary tree drawing with one command. Built for algorithm notes: the input is a LeetCode-style level-order array or an indented list, and the output is the `/` `\` tree you would sketch by hand, not a `├──` directory tree.

```
[3,9,20,null,null,15,7]      →        3
                                     / \
                                    9   20
                                       /  \
                                     15    7
```

Slashes are strict 45° diagonals, every parent is centered over its children, and labels of any width (including CJK characters) stay aligned at any depth.

## Input formats

### 1. Level-order array (LeetCode style)

```
[1,2,3,null,4]
1,2,3,null,4
1 2 3 # 4
```

- Brackets are optional; separate values with commas or spaces. Quotes are stripped.
- Empty slots are `null` / `None` / `nil` / `#` / `_` (case-insensitive, configurable). An empty string also counts as an empty slot.
- By default the array is read the LeetCode way: an empty slot does not reserve positions for its children. Switch to **heap** mode in settings to use fixed indices (`2i+1`, `2i+2`).

### 2. Indented list

```
1
  2
    4
    5
  3
    null
    6
```

- A deeper-indented line is a child of the line above it. The first child is the left one, the second is the right one; use `null` to skip the left slot.
- Markdown list markers (`- 1`) are fine. You can also set the side explicitly with `L:` / `R:`:

```
- 1
  - R: 2
    - 3
```

## Three ways to use it

| Mode | How | Result |
| --- | --- | --- |
| Convert in place | Select the text (or put the cursor on the array line) and run **Convert selection to slash tree** from the command palette or the right-click menu | The selection is replaced by a fenced code block containing the tree |
| Input dialog | Run **Insert slash tree…** | Live preview while you type; ⌘/Ctrl+Enter inserts at the cursor |
| Live rendering | Write a ` ```tree ` code block containing the source format | Rendered as a tree in Reading view and Live Preview; the source stays editable, hover to copy |

Live rendering example:

````markdown
```tree
[5,3,8,1,4,null,9]
```
````

More output samples:

```
[1,2,3,4,5,6,7]      [5,3,8,1,4,null,9,null,2]      [100,20,3000,1,null,null,45]

     1                   5                               100
    / \                 / \                             /   \
   /   \               3   8                          20     3000
  2     3             / \   \                        /           \
 / \   / \           1   4   9                      1             45
4   5 6   7           \
                       2
```

## Installation

### From source

```bash
git clone https://github.com/AdamLTy/obsidian-slash-tree.git
cd obsidian-slash-tree
npm install
scripts/install.sh "/path/to/your/vault"
```

Then in Obsidian: **Settings → Community plugins → Reload plugins → enable Slash Tree**.

### Manually

Copy `main.js`, `manifest.json` and `styles.css` (from `npm run build`) into `<vault>/.obsidian/plugins/slash-tree/` and enable the plugin.

## Settings

- **Minimum subtree gap** – how many blank columns to keep between adjacent subtrees (default 1).
- **Null tokens** – comma-separated list of tokens that mean "empty node".
- **Level-order interpretation** – LeetCode or heap.
- **Code block language** – the fence tag that is rendered live (default `tree`; reload the plugin after changing it).
- **Output fence language** – the fence tag used by the convert command (default empty). Keep it different from the previous setting, or the rendered tree would be parsed again.

## Development

```bash
npm test        # unit tests + property tests on random trees
npm run demo    # print sample trees in the terminal
npm run dev     # rebuild main.js on change
npm run build   # type-check + production bundle
```

All layout logic lives in `src/tree.ts` and has no Obsidian dependency, so it can be reused on its own.

## License

[MIT](LICENSE)
