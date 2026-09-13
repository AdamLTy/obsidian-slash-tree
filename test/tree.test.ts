import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectFormat,
  textToTree,
  parseTree,
  renderTree,
  countNodes,
  formatTreeError,
  TreeNode,
  TreeError,
  TreeErrorCode,
  TreeErrorParams,
} from "../src/tree";
import { TREE_ERROR_MESSAGES } from "../src/i18n";

const t = (s: string, o?: Parameters<typeof textToTree>[1]) => textToTree(s, o);
const lines = (...ls: string[]) => ls.join("\n");

test("三个节点", () => {
  assert.equal(t("[1,2,3]"), lines("  1", " / \\", "2   3"));
});

test("满二叉树 7 节点", () => {
  assert.equal(
    t("[1,2,3,4,5,6,7]"),
    lines("     1", "    / \\", "   /   \\", "  2     3", " / \\   / \\", "4   5 6   7")
  );
});

test("只有右孩子 / 只有左孩子", () => {
  assert.equal(t("[1,null,2,3]"), lines("1", " \\", "  2", " /", "3"));
  assert.equal(t("[1,2,null,3]"), lines("    1", "   /", "  2", " /", "3"));
});

test("多字符标签，父标签居中", () => {
  assert.equal(t("[10,5,15]"), lines("  10", " /  \\", "5    15"));
  assert.equal(t("[1000,1,2]"), lines("  1000", " /    \\", "1      2"));
});

test("LeetCode 经典例子", () => {
  assert.equal(
    t("[3,9,20,null,null,15,7]"),
    lines("  3", " / \\", "9   20", "   /  \\", " 15    7")
  );
});

test("中文标签按两列宽度对齐", () => {
  assert.equal(t("[根,左,右]"), lines("   根", "  /  \\", "左    右"));
});

test("空格分隔、无括号、带引号、大小写 null", () => {
  assert.equal(t("1 2 3"), t("[1,2,3]"));
  assert.equal(t('["a","b",NULL]'), lines("  a", " /", "b"));
});

test("末尾的空节点被忽略", () => {
  assert.equal(t("[1,2,3,null,null,null,null]"), t("[1,2,3]"));
});

test("heap 模式：下标 2i+1 / 2i+2", () => {
  // leetcode 模式下 3 是 2 的左孩子；heap 模式下下标 3 的父节点是下标 1（null）→ 报错
  assert.equal(t("[1,null,2,3]"), lines("1", " \\", "  2", " /", "3"));
  assert.throws(() => t("[1,null,2,3]", { levelOrderMode: "heap" }), TreeError);
  assert.equal(t("[1,null,2,null,null,3]", { levelOrderMode: "heap" }), lines("1", " \\", "  2", " /", "3"));
});

test("缩进列表格式（位置式 + 占位）", () => {
  const src = lines("1", "  2", "    4", "    5", "  3", "    null", "    6");
  assert.equal(t(src), t("[1,2,3,4,5,null,6]"));
});

test("缩进列表格式（markdown 列表 + L:/R: 显式指定）", () => {
  const src = lines("- 1", "  - R: 2", "    - 3");
  assert.equal(t(src), t("[1,null,2,3]"));
  const cn = lines("- 1", "  - 右: 2", "    - 左: 3");
  assert.equal(t(cn), t("[1,null,2,3]"));
});

test("缩进列表：Tab 缩进", () => {
  assert.equal(t("1\n\t2\n\t3"), t("[1,2,3]"));
});

test("整段是代码块时自动去围栏", () => {
  assert.equal(t("```tree\n[1,2,3]\n```"), t("[1,2,3]"));
  assert.equal(t("~~~\n1\n  2\n  3\n~~~"), t("[1,2,3]"));
});

const throwsCode = (fn: () => unknown, code: TreeErrorCode, params?: Partial<TreeErrorParams>) =>
  assert.throws(fn, (e: unknown) => {
    assert.ok(e instanceof TreeError, "should be TreeError");
    assert.equal(e.code, code);
    if (params) for (const [k, v] of Object.entries(params)) assert.equal(e.params[k as keyof TreeErrorParams], v);
    return true;
  });

test("错误码与参数", () => {
  throwsCode(() => t(""), "empty_input");
  throwsCode(() => t("[null,1]"), "root_null");
  throwsCode(() => t("[1,null,null,2]"), "orphan_value", { index: 4, value: "2" });
  throwsCode(() => t("[1,null,2,3]", { levelOrderMode: "heap" }), "heap_null_parent", { index: 4, parentIndex: 2 });
  throwsCode(() => t("1\n  2\n  3\n  4"), "too_many_children", { line: 4, label: "1" });
  throwsCode(() => t("1\n  2\n3"), "multiple_roots", { line: 3 });
  throwsCode(() => t("1\n  R: 2\n  R: 3"), "side_taken", { line: 3, side: "R" });
  throwsCode(() => t("1\n  null\n    2"), "placeholder_child", { line: 3 });
  throwsCode(() => t("null\n  1"), "root_null", { line: 1 });
});

test("错误信息：英文默认 message，中文模板可翻译", () => {
  try {
    t("1\n  2\n  3\n  4");
    assert.fail("should throw");
  } catch (e) {
    assert.ok(e instanceof TreeError);
    assert.match(e.message, /^Line 4: "1" already has two children/);
    assert.match(formatTreeError(e, TREE_ERROR_MESSAGES.zh), /^第 4 行：「1」已经有两个孩子/);
  }
});

test("minGap 设置拉开子树间距", () => {
  const tight = t("[1,2,3,4,5,6,7]");
  const loose = t("[1,2,3,4,5,6,7]", { minGap: 3 });
  assert.equal(tight.split("\n").pop(), "4   5 6   7");
  assert.equal(loose.split("\n").pop(), "4   5   6   7");
});

// ---- 性质测试：随机树上验证斜线永远连着上下两端、标签不会粘连 ----

function randomTree(rng: () => number, depth: number, id: { n: number }): TreeNode | null {
  if (depth === 0 || rng() < 0.25) return null;
  const width = 1 + Math.floor(rng() * 4);
  const label = String(id.n++).padStart(width, "x");
  return { label, left: randomTree(rng, depth - 1, id), right: randomTree(rng, depth - 1, id) };
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function collectLabels(node: TreeNode | null, out: string[] = []): string[] {
  if (!node) return out;
  out.push(node.label);
  collectLabels(node.left, out);
  collectLabels(node.right, out);
  return out;
}

test("随机树：斜线两端都有内容，标签之间至少隔一列", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = lcg(seed);
    const id = { n: 0 };
    const root = { label: "R", left: randomTree(rng, 5, id), right: randomTree(rng, 5, id) };
    const text = renderTree(root);
    const grid = text.split("\n").map((l) => [...l]);
    const at = (r: number, c: number) => (grid[r] && grid[r][c]) || " ";

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const ch = grid[r][c];
        if (ch === "/") {
          assert.notEqual(at(r - 1, c + 1), " ", `seed ${seed}: / 的右上角为空\n${text}`);
          assert.notEqual(at(r + 1, c - 1), " ", `seed ${seed}: / 的左下角为空\n${text}`);
        } else if (ch === "\\") {
          assert.notEqual(at(r - 1, c - 1), " ", `seed ${seed}: \\ 的左上角为空\n${text}`);
          assert.notEqual(at(r + 1, c + 1), " ", `seed ${seed}: \\ 的右下角为空\n${text}`);
        }
      }
    }

    // 每个标签都完整出现，且标签之间不粘连（同一行里被至少一个空格或斜线隔开）
    const labels = collectLabels(root);
    const tokensInText = text.split("\n").flatMap((l) => l.split(/[\s/\\]+/).filter(Boolean));
    assert.deepEqual(tokensInText.sort(), labels.sort(), `seed ${seed}: 标签粘连或丢失\n${text}`);
    assert.equal(countNodes(root), labels.length);
  }
});

// ---- 层级格式 ----

test("层级格式：每行一层，| 按父节点分组", () => {
  assert.equal(t("3\n9 20\n_ | 15 7"), t("[3,9,20,null,null,15,7]"));
  assert.equal(t("3\n9 20\n| 15 7"), t("[3,9,20,null,null,15,7]")); // 空组 = 叶子
  assert.equal(t("1\n2 3\n4 5 | 6 7"), t("[1,2,3,4,5,6,7]"));
  assert.equal(t("1\n2 3\n4 5 _ 6"), t("[1,2,3,4,5,null,6]")); // 不分组：每个父节点正好 2 个
  assert.equal(t("1\n_ 2\n3"), t("[1,null,2,3]")); // 上一层只有 1 个节点时可只写 1 个
  assert.equal(t("1\n2 3\n4 |"), t("[1,2,3,4]")); // 尾部空组
  assert.equal(t("1\n2, 3\n4, 5 | , 6"), t("[1,2,3,4,5,null,6]")); // 逗号分隔，空项 = 空位
  assert.equal(t("- 1\n- 2 3"), t("[1,2,3]")); // 列表项
  assert.equal(t("    1\n    2 3"), t("[1,2,3]")); // 公共缩进会被去掉
  assert.equal(t("5\n4 8\n11 _ | 13 4\n7 2 | | _ 1"), t("[5,4,8,11,null,13,4,7,2,null,null,null,1]"));
});

test("层级格式：错误码带上一层节点提示", () => {
  throwsCode(() => t("1 2\n3 4"), "level_multi_root", { line: 1, actual: 2 });
  throwsCode(() => t("1\n2 3\n4 5"), "level_token_count", { line: 3, expected: 2, actual: 2, parents: "2, 3" });
  throwsCode(() => t("1\n2 3\n4 5 | 6 | 7"), "level_group_count", { line: 3, expected: 2, actual: 3, parents: "2, 3" });
  throwsCode(() => t("1\n2 3\n4 5 6 | 7"), "level_group_size", { line: 3, group: 1, label: "2", actual: 3 });
  throwsCode(() => t("1\n2 3 4"), "level_group_size", { line: 2, group: 1, label: "1", actual: 3 });
  throwsCode(() => t("1\n_ _\n5"), "level_no_parents", { line: 3 });
  throwsCode(() => t("_\n1 2"), "root_null", { line: 1 });
});

// ---- 父子格式 ----

test("父子格式：父节点: 左 右", () => {
  assert.equal(t("3: 9 20\n20: 15 7"), t("[3,9,20,null,null,15,7]"));
  assert.equal(t("3: 9 20\n20: _ 7"), t("[3,9,20,null,null,null,7]"));
  assert.equal(t("3: 9"), t("[3,9]"));
  assert.equal(t("3:"), t("[3]"));
  assert.equal(t("a：b c"), t("[a,b,c]")); // 全角冒号
  assert.equal(t("- 3: 9, 20\n- 20: 15, 7"), t("[3,9,20,null,null,15,7]"));
  // 同名节点：按出现顺序取第一个还没指定过孩子的
  assert.equal(t("1: 1 1\n1: 2 3"), t("[1,1,1,2,3]"));
  assert.equal(t("1: 1 1\n1: 2 3\n1: 4"), t("[1,1,1,2,3,4]"));
});

test("父子格式：错误码", () => {
  throwsCode(() => t("3: 9 20\n21: 1"), "edge_unknown_parent", { line: 2, label: "21" });
  throwsCode(() => t("3: 9 20\n3: 1"), "edge_parent_taken", { line: 2, label: "3" });
  throwsCode(() => t("3: 9 20 21"), "edge_children_count", { line: 1, label: "3", actual: 3 });
  throwsCode(() => t("3: 9\n: 1"), "edge_no_parent_label", { line: 2 });
  throwsCode(() => t("3: 9\n1 2"), "edge_no_colon", { line: 2 });
  throwsCode(() => t("_: 1 2"), "root_null", { line: 1 });
});

test("detectFormat 自动识别", () => {
  assert.equal(detectFormat("[1,2]"), "array");
  assert.equal(detectFormat("1 2 3"), "array");
  assert.equal(detectFormat("1"), "array");
  assert.equal(detectFormat("1\n2 3"), "levels");
  assert.equal(detectFormat("1: 2 3"), "edges");
  assert.equal(detectFormat("R: 2 3"), "edges");
  assert.equal(detectFormat("L: 2 3\nL: 4"), "edges");
  assert.equal(detectFormat("1\n  2"), "outline");
  assert.equal(detectFormat("- 1\n  - 2"), "outline");
  assert.equal(detectFormat("- 1\n  - R: 2"), "outline");
  assert.equal(detectFormat("```tree\n1\n2 3\n```"), "levels");
  assert.equal(detectFormat("  1\n  2 3"), "levels");
});

// ---- 随机树：两种新格式序列化后再解析，结构必须完全一致 ----

function toLevels(root: TreeNode): string {
  const out = [root.label];
  let level = [root];
  for (;;) {
    const next = level.flatMap((n) => [n.left, n.right].filter((c): c is TreeNode => c !== null));
    if (next.length === 0) break;
    out.push(level.map((n) => `${n.left?.label ?? "_"} ${n.right?.label ?? "_"}`).join(" | "));
    level = next;
  }
  return out.join("\n");
}

function toEdges(root: TreeNode): string {
  const lines: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const n = queue.shift() as TreeNode;
    if (n.left || n.right) lines.push(`${n.label}: ${n.left?.label ?? "_"} ${n.right?.label ?? "_"}`);
    if (n.left) queue.push(n.left);
    if (n.right) queue.push(n.right);
  }
  return lines.length > 0 ? lines.join("\n") : `${root.label}:`;
}

test("随机树：层级格式 / 父子格式往返一致", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = lcg(seed);
    const id = { n: 0 };
    const root: TreeNode = { label: "R", left: randomTree(rng, 5, id), right: randomTree(rng, 5, id) };
    assert.deepEqual(parseTree(toLevels(root)), root, `seed ${seed} levels\n${toLevels(root)}`);
    assert.deepEqual(parseTree(toEdges(root)), root, `seed ${seed} edges\n${toEdges(root)}`);
  }
});

test("parseTree 返回的结构正确", () => {
  const root = parseTree("[1,2,3,null,4]");
  assert.equal(root.label, "1");
  assert.equal(root.left?.label, "2");
  assert.equal(root.right?.label, "3");
  assert.equal(root.left?.left, null);
  assert.equal(root.left?.right?.label, "4");
});
