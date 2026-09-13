/**
 * 斜杠树核心：把文本解析成二叉树，再渲染成 / \ 风格的字符画。
 * 这个文件不依赖 Obsidian，可以单独测试。
 */

export interface TreeNode {
  label: string;
  left: TreeNode | null;
  right: TreeNode | null;
}

export class TreeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TreeError";
  }
}

export type LevelOrderMode = "leetcode" | "heap";

export interface ParseOptions {
  /** 表示空节点的 token（不区分大小写）。空字符串永远视为空节点。 */
  nullTokens?: string[];
  /**
   * 层序数组的解释方式：
   * - leetcode：空节点不占用子节点位置（LeetCode 题目里的写法）
   * - heap：下标 i 的孩子固定在 2i+1 / 2i+2（完全二叉树 / 堆的写法）
   */
  levelOrderMode?: LevelOrderMode;
}

export interface RenderOptions {
  /** 相邻子树之间至少留几列空格，>= 1 */
  minGap?: number;
}

export const DEFAULT_NULL_TOKENS = ["null", "none", "nil", "#", "_"];

// ---------------------------------------------------------------------------
// 解析
// ---------------------------------------------------------------------------

/** 若整段文本是一个 ``` 或 ~~~ 围栏代码块，则去掉围栏只留内容。 */
export function stripFence(text: string): string {
  const m = text.trim().match(/^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n?\1\s*$/);
  return m ? m[2] : text;
}

/**
 * 自动识别格式并解析：
 * - 以 `[` 开头，或只有一行：层序数组，如 `[3,9,20,null,null,15,7]`、`1 2 3`
 * - 多行：缩进列表，缩进更深的行是上一层的孩子；第 1 个孩子为左、第 2 个为右，
 *   可用 `L:` / `R:` 显式指定，用空节点 token 占位
 */
export function parseTree(input: string, opts: ParseOptions = {}): TreeNode {
  const text = stripFence(input).trim();
  if (!text) throw new TreeError("输入为空");

  const lines = text.split("\n").map((l) => l.replace(/\s+$/, ""));
  const nonBlank = lines.filter((l) => l.trim() !== "");

  if (text.startsWith("[")) return parseLevelOrder(nonBlank.join(" "), opts);
  if (nonBlank.length === 1 && !BULLET.test(nonBlank[0].trim())) {
    return parseLevelOrder(nonBlank[0], opts);
  }
  return parseOutline(lines, opts);
}

function makeNode(label: string): TreeNode {
  return { label, left: null, right: null };
}

function unquote(t: string): string {
  const m = t.match(/^(["'])(.*)\1$/);
  return m ? m[2] : t;
}

function nullSet(opts: ParseOptions): Set<string> {
  return new Set((opts.nullTokens ?? DEFAULT_NULL_TOKENS).map((t) => t.trim().toLowerCase()).filter(Boolean));
}

function isNullToken(t: string, nulls: Set<string>): boolean {
  return t === "" || nulls.has(t.toLowerCase());
}

/** 解析层序数组，如 `[1,2,3,null,4]`、`1,2,3` 或 `1 2 3` */
export function parseLevelOrder(text: string, opts: ParseOptions = {}): TreeNode {
  let body = text.trim();
  if (body.startsWith("[")) body = body.slice(1);
  if (body.endsWith("]")) body = body.slice(0, -1);
  body = body.trim();

  const raw = body === "" ? [] : body.includes(",") ? body.split(",") : body.split(/\s+/);
  const nulls = nullSet(opts);
  const tokens: (string | null)[] = raw.map((t) => {
    const v = unquote(t.trim());
    return isNullToken(v, nulls) ? null : v;
  });
  // 去掉末尾多余的空节点（例如 `[1,2,]`）
  while (tokens.length > 0 && tokens[tokens.length - 1] === null) tokens.pop();

  if (tokens.length === 0 || tokens[0] === null) throw new TreeError("根节点不能为空");

  return (opts.levelOrderMode ?? "leetcode") === "heap" ? buildHeap(tokens) : buildLeetCode(tokens);
}

function buildLeetCode(tokens: (string | null)[]): TreeNode {
  const root = makeNode(tokens[0] as string);
  const queue: TreeNode[] = [root];
  let i = 1;
  while (queue.length > 0 && i < tokens.length) {
    const cur = queue.shift() as TreeNode;
    const l = tokens[i++];
    if (l !== null && l !== undefined) {
      cur.left = makeNode(l);
      queue.push(cur.left);
    }
    if (i < tokens.length) {
      const r = tokens[i++];
      if (r !== null && r !== undefined) {
        cur.right = makeNode(r);
        queue.push(cur.right);
      }
    }
  }
  if (i < tokens.length) {
    throw new TreeError(`第 ${i + 1} 个值「${tokens[i]}」没有父节点可以挂载`);
  }
  return root;
}

function buildHeap(tokens: (string | null)[]): TreeNode {
  const nodes = tokens.map((t) => (t === null ? null : makeNode(t)));
  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    const parent = nodes[(i - 1) >> 1];
    if (!parent) {
      throw new TreeError(`第 ${i + 1} 个值「${node.label}」的父节点（第 ${((i - 1) >> 1) + 1} 个）是空节点`);
    }
    if (i % 2 === 1) parent.left = node;
    else parent.right = node;
  }
  return nodes[0] as TreeNode;
}

const BULLET = /^([-*+]|\d+[.)])(\s+|$)/;
const SIDE = /^(L|R|左|右)\s*[:：]\s*/i;

interface Frame {
  indent: number;
  node: TreeNode;
  used: { L: boolean; R: boolean };
}

/** 解析缩进列表格式 */
export function parseOutline(lines: string[], opts: ParseOptions = {}): TreeNode {
  const nulls = nullSet(opts);
  const stack: Frame[] = [];
  let root: TreeNode | null = null;
  let placeholderIndent = -1; // 上一行若是空节点占位，记录其缩进，防止它下面挂孩子

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx].replace(/\t/g, "    ");
    if (rawLine.trim() === "") continue;
    const lineNo = idx + 1;

    const indent = rawLine.length - rawLine.trimStart().length;
    let content = rawLine.trim().replace(BULLET, "");
    let side: "L" | "R" | null = null;
    const sm = content.match(SIDE);
    if (sm) {
      side = /^(L|左)$/i.test(sm[1]) ? "L" : "R";
      content = content.slice(sm[0].length);
    }
    const label = unquote(content.trim());
    const isPlaceholder = isNullToken(label, nulls);

    if (placeholderIndent >= 0 && indent > placeholderIndent) {
      throw new TreeError(`第 ${lineNo} 行：空节点下面不能再挂孩子`);
    }
    placeholderIndent = -1;

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();

    if (stack.length === 0) {
      if (root) throw new TreeError(`第 ${lineNo} 行：只能有一个根节点（缩进是否少了？）`);
      if (isPlaceholder) throw new TreeError(`第 ${lineNo} 行：根节点不能为空`);
      root = makeNode(label);
      stack.push({ indent, node: root, used: { L: false, R: false } });
      continue;
    }

    const parent = stack[stack.length - 1];
    let slot: "L" | "R";
    if (side) {
      if (parent.used[side]) throw new TreeError(`第 ${lineNo} 行：「${parent.node.label}」的${side === "L" ? "左" : "右"}孩子已经存在`);
      slot = side;
    } else if (!parent.used.L) {
      slot = "L";
    } else if (!parent.used.R) {
      slot = "R";
    } else {
      throw new TreeError(`第 ${lineNo} 行：「${parent.node.label}」已经有两个孩子了，二叉树最多两个`);
    }
    parent.used[slot] = true;

    if (isPlaceholder) {
      placeholderIndent = indent;
      continue;
    }
    const node = makeNode(label);
    if (slot === "L") parent.node.left = node;
    else parent.node.right = node;
    stack.push({ indent, node, used: { L: false, R: false } });
  }

  if (!root) throw new TreeError("输入为空");
  return root;
}

// ---------------------------------------------------------------------------
// 渲染
// ---------------------------------------------------------------------------

/** 一行字符画。每个元素占一个显示列；宽字符（中文等）占两列，第二列存 ""。 */
type Row = string[];

interface Layout {
  rows: Row[];
  width: number;
  /** 根标签起始列 */
  rootX: number;
  /** 根标签显示宽度 */
  rootW: number;
}

// 东亚宽字符、常见 emoji：在等宽字体里占两列
const WIDE =
  /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{1F300}-\u{1F64F}\u{1F900}-\u{1F9FF}\u{20000}-\u{3FFFD}]/u;

function toCells(label: string): Row {
  const cells: Row = [];
  for (const ch of label) {
    cells.push(ch);
    if (WIDE.test(ch)) cells.push("");
  }
  return cells;
}

function blank(n: number): Row {
  return new Array<string>(n).fill(" ");
}

function leftmost(row: Row): number {
  for (let i = 0; i < row.length; i++) if (row[i] !== " ") return i;
  return -1;
}

function rightmost(row: Row): number {
  for (let i = row.length - 1; i >= 0; i--) if (row[i] !== " ") return i;
  return -1;
}

/** 把 src 里非空白的格子叠到 dst 上（偏移 off） */
function stamp(dst: Row, src: Row, off: number): void {
  for (let i = 0; i < src.length; i++) if (src[i] !== " ") dst[off + i] = src[i];
}

/**
 * 递归布局。规则：
 * - 斜线严格 45°：`/` 在 (r, c) 连接 (r-1, c+1) 与 (r+1, c-1)，`\` 对称
 * - 父标签紧贴两条斜线的顶端，孩子标签紧贴斜线的底端
 * - 左右子树按“逐行轮廓”尽量靠拢，互不重叠且至少隔 minGap 列
 */
function layout(node: TreeNode, minGap: number): Layout {
  const label = toCells(node.label);
  const pw = label.length;
  const { left, right } = node;

  if (!left && !right) {
    return { rows: [label], width: pw, rootX: 0, rootW: pw };
  }

  if (left && right) {
    const L = layout(left, minGap);
    const R = layout(right, minGap);

    // d = 右子树相对左子树的水平偏移。
    // 1) 两个孩子标签之间要放下父标签外加两侧各一条斜线：>= pw + 2
    let d = L.rootX + L.rootW + pw + 2 - R.rootX;
    // 2) 每一行都不能重叠，至少隔 minGap 列
    const h = Math.min(L.rows.length, R.rows.length);
    for (let i = 0; i < h; i++) {
      const lr = rightmost(L.rows[i]);
      const rl = leftmost(R.rows[i]);
      if (lr < 0 || rl < 0) continue;
      d = Math.max(d, lr + 1 + minGap - rl);
    }
    // 3) 父标签要正好居中：两孩子标签内侧间距减去 pw 必须是偶数
    let g = d + R.rootX - (L.rootX + L.rootW);
    if ((g - pw) % 2 !== 0) {
      d += 1;
      g += 1;
    }
    const k = (g - pw) / 2; // 斜线行数

    const offL = Math.max(0, -d);
    const offR = d + offL;
    const px = offL + L.rootX + L.rootW + k;
    const width = Math.max(offL + L.width, offR + R.width);

    const rows: Row[] = [];
    const top = blank(width);
    stamp(top, label, px);
    rows.push(top);
    for (let r = 1; r <= k; r++) {
      const row = blank(width);
      row[px - r] = "/";
      row[px + pw - 1 + r] = "\\";
      rows.push(row);
    }
    const body = Math.max(L.rows.length, R.rows.length);
    for (let i = 0; i < body; i++) {
      const row = blank(width);
      if (i < L.rows.length) stamp(row, L.rows[i], offL);
      if (i < R.rows.length) stamp(row, R.rows[i], offR);
      rows.push(row);
    }
    return { rows, width, rootX: px, rootW: pw };
  }

  if (left) {
    const L = layout(left, minGap);
    const px = L.rootX + L.rootW + 1;
    const width = Math.max(L.width, px + pw);
    const rows: Row[] = [];
    const top = blank(width);
    stamp(top, label, px);
    rows.push(top);
    const slash = blank(width);
    slash[px - 1] = "/";
    rows.push(slash);
    for (const r of L.rows) {
      const row = blank(width);
      stamp(row, r, 0);
      rows.push(row);
    }
    return { rows, width, rootX: px, rootW: pw };
  }

  // 只有右孩子
  const R = layout(right as TreeNode, minGap);
  let px = R.rootX - pw - 1;
  let offR = 0;
  if (px < 0) {
    offR = -px;
    px = 0;
  }
  const width = Math.max(offR + R.width, px + pw + 1);
  const rows: Row[] = [];
  const top = blank(width);
  stamp(top, label, px);
  rows.push(top);
  const slash = blank(width);
  slash[px + pw] = "\\";
  rows.push(slash);
  for (const r of R.rows) {
    const row = blank(width);
    stamp(row, r, offR);
    rows.push(row);
  }
  return { rows, width, rootX: px, rootW: pw };
}

/** 把二叉树渲染成字符画 */
export function renderTree(root: TreeNode, opts: RenderOptions = {}): string {
  const minGap = Math.max(1, Math.floor(opts.minGap ?? 1));
  const { rows } = layout(root, minGap);
  return rows.map((r) => r.join("").replace(/\s+$/, "")).join("\n");
}

/** 一步到位：文本 -> 字符画 */
export function textToTree(input: string, opts: ParseOptions & RenderOptions = {}): string {
  return renderTree(parseTree(input, opts), opts);
}

/** 统计节点数（用于提示） */
export function countNodes(node: TreeNode | null): number {
  return node ? 1 + countNodes(node.left) + countNodes(node.right) : 0;
}
