# Slash Tree for Obsidian

**English** | [简体中文](README.zh-CN.md)

Turn a fixed-format text into a slash-style binary tree drawing with one command. Built for algorithm notes: the input is one line per level, `parent: left right` lines, a LeetCode-style level-order array, or an indented list, and the output is the `/` `\` tree you would sketch by hand, not a `├──` directory tree.

```
[3,9,20,null,null,15,7]      →        3
                                     / \
                                    9   20
                                       /  \
                                     15    7
```

Slashes are strict 45° diagonals, every parent is centered over its children, and labels of any width (including CJK characters) stay aligned at any depth.

## Input formats

The format is detected automatically. Pick whichever feels natural; the input dialog shows which one it recognised.

### 1. Levels, one line per level (recommended)

Write the root on the first line, then each level on its own line. Use `|` to group the children by parent, in the same order as the previous line, and `_` for an empty slot.

```
3
9 20
_ | 15 7
```

- Line 3 has two groups: the children of `9` (none) and the children of `20` (`15 7`).
- A group holds at most two values, `left right`. `_ 7` means right child only, `15` alone means left child only, and an empty group means no children.
- Every parent gets exactly one group, so a wrong count is reported immediately, with the parents listed, instead of silently shifting the tree.
- Without `|`, a line must contain exactly two values per parent, like a LeetCode array: `4 5 _ 6`.

A bigger example, `[5,4,8,11,null,13,4,7,2,null,null,null,1]`:

```
5
4 8
11 _ | 13 4
7 2 | | _ 1
```

### 2. Parent and children

One line per node that has children: `parent: left right`. The first line's parent is the root; every later parent must already appear as a child on an earlier line. Leaves are simply not mentioned.

```
3: 9 20
20: 15 7
```

If several nodes share a label, each line refers to the first such node, in order of appearance, that has not been given children yet, so writing lines level by level does the right thing.

### 3. Level-order array (LeetCode style)

```
[1,2,3,null,4]
1,2,3,null,4
1 2 3 # 4
```

- Brackets are optional; separate values with commas or spaces. Quotes are stripped.
- Empty slots are `null` / `None` / `nil` / `#` / `_` (case-insensitive, configurable). An empty string also counts as an empty slot.
- By default the array is read the LeetCode way: an empty slot does not reserve positions for its children. Switch to **heap** mode in settings to use fixed indices (`2i+1`, `2i+2`).

### 4. Indented list

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

### From the community plugin browser

Once the plugin is listed: **Settings → Community plugins → Browse**, search for **Slash Tree**, install and enable it.

### With BRAT (before it is listed)

1. Install the [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) plugin.
2. Run **BRAT: Add a beta plugin for testing** and enter `AdamLTy/obsidian-slash-tree`.
3. Enable **Slash Tree** in **Settings → Community plugins**.

### Manually from a release

Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/AdamLTy/obsidian-slash-tree/releases/latest), put them in `<vault>/.obsidian/plugins/slash-tree/`, then enable the plugin.

### From source

```bash
git clone https://github.com/AdamLTy/obsidian-slash-tree.git
cd obsidian-slash-tree
npm install
scripts/install.sh "/path/to/your/vault"
```

The plugin UI follows Obsidian's interface language: Chinese when Obsidian is set to 简体中文 / 繁體中文, English otherwise.

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
