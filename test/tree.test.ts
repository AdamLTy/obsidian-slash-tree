import { test } from "node:test";
import assert from "node:assert/strict";
import { textToTree, parseTree, renderTree, countNodes, TreeNode, TreeError } from "../src/tree";

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

test("错误提示", () => {
  assert.throws(() => t(""), /输入为空/);
  assert.throws(() => t("[null,1]"), /根节点不能为空/);
  assert.throws(() => t("[1,null,null,2]"), /没有父节点/);
  assert.throws(() => t("1\n  2\n  3\n  4"), /最多两个/);
  assert.throws(() => t("1\n2"), /只能有一个根节点/);
  assert.throws(() => t("1\n  R: 2\n  R: 3"), /已经存在/);
  assert.throws(() => t("1\n  null\n    2"), /空节点下面不能再挂孩子/);
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

test("parseTree 返回的结构正确", () => {
  const root = parseTree("[1,2,3,null,4]");
  assert.equal(root.label, "1");
  assert.equal(root.left?.label, "2");
  assert.equal(root.right?.label, "3");
  assert.equal(root.left?.left, null);
  assert.equal(root.left?.right?.label, "4");
});
