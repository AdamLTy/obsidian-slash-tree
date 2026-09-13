# Slash Tree（斜杠树）

[English](README.md) | **简体中文**

Obsidian 插件：把固定格式的文本一键转换成 `/` `\` 斜杠风格的二叉树字符画，专为算法笔记设计。输入是 LeetCode 风格的层序数组或缩进列表，输出是算法题里常见的左右斜杠画法，而不是 `├──` 那种目录树。

```
[3,9,20,null,null,15,7]      →        3
                                     / \
                                    9   20
                                       /  \
                                     15    7
```

斜线严格 45°，父节点自动居中，任意深度、任意标签宽度（含中文）都能对齐。

## 支持的输入格式

### 1. 层序数组（LeetCode 写法）

```
[1,2,3,null,4]
1,2,3,null,4
1 2 3 # 4
```

- 方括号可有可无，逗号或空格分隔都行，引号会自动去掉。
- 空节点写 `null` / `None` / `nil` / `#` / `_`（不区分大小写，可在设置里改），空字符串也算空节点。
- 默认按 LeetCode 规则解释：空节点不占用子节点位置。也可以在设置里切换成「堆式」：下标 `i` 的孩子固定是 `2i+1`、`2i+2`。

### 2. 缩进列表

```
1
  2
    4
    5
  3
    null
    6
```

- 缩进更深的行是上一行的孩子；第 1 个孩子是左、第 2 个是右，用 `null` 占位可以跳过左边。
- 可以直接写成 markdown 列表（`- 1`），也可以用 `L:` / `R:`（或 `左:` / `右:`）显式指定方向：

```
- 1
  - R: 2
    - 3
```

## 三种用法

| 方式 | 操作 | 结果 |
| --- | --- | --- |
| 原地转换 | 选中文本（或把光标放在数组那一行）→ 命令面板「把选中文本转换为斜杠树」，或右键菜单 | 选区被替换成包着树的 ``` 代码块 |
| 弹窗输入 | 命令「输入并插入斜杠树…」 | 边输入边预览，⌘/Ctrl+Enter 插入到光标处 |
| 自动渲染 | 写一个 ` ```tree ` 代码块，里面放源格式 | 阅读视图 / 实时预览里自动渲染成树，源文本仍可编辑，悬停可复制 |

第三种示例：

````markdown
```tree
[5,3,8,1,4,null,9]
```
````

更多输出效果：

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

## 安装

### 从社区插件库安装

上架后：**设置 → 第三方插件 → 浏览**，搜索 **Slash Tree**，安装并启用。

### 用 BRAT 安装（上架前）

1. 安装 [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) 插件。
2. 运行 **BRAT: Add a beta plugin for testing**，填入 `AdamLTy/obsidian-slash-tree`。
3. 在 **设置 → 第三方插件** 里启用 **Slash Tree**。

### 从 release 手动安装

到 [最新 release](https://github.com/AdamLTy/obsidian-slash-tree/releases/latest) 下载 `main.js`、`manifest.json`、`styles.css`，放到 `<vault>/.obsidian/plugins/slash-tree/`，然后启用插件。

### 从源码安装

```bash
git clone https://github.com/AdamLTy/obsidian-slash-tree.git
cd obsidian-slash-tree
npm install
scripts/install.sh "/path/to/your/vault"
```

插件界面跟随 Obsidian 的语言设置：简体 / 繁体中文时显示中文，其他语言显示英文。

## 设置项

- **子树最小间距**：相邻子树之间至少留几列空格，默认 1。
- **空节点写法**：逗号分隔的 token 列表。
- **层序数组的解释方式**：LeetCode / 堆式。
- **自动渲染的代码块语言**：默认 `tree`，改了要重新加载插件。
- **转换输出的代码块语言**：默认为空；不要和上一项相同，否则输出的树会被再次解析。

## 开发

```bash
npm test        # 单元测试 + 随机树性质测试
npm run demo    # 在终端打印几棵示例树
npm run dev     # 监听源码自动打包到 main.js
npm run build   # 类型检查 + 生产打包
```

核心逻辑全部在 `src/tree.ts`，不依赖 Obsidian，可以单独复用。

## 许可证

[MIT](LICENSE)
