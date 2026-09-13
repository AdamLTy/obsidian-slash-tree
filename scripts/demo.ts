// 在终端里快速看效果：npm run demo
import { textToTree } from "../src/tree";

const samples = [
  "[1,2,3]",
  "[3,9,20,null,null,15,7]",
  "[1,2,3,4,5,6,7]",
  "[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]",
  "[5,3,8,1,4,null,9,null,2]",
  "[1,null,2,null,3,null,4]",
  "[100,20,3000,1,null,null,45]",
  "- 根\n  - 左\n    - 左左\n    - 左右\n  - 右\n    - null\n    - 右右",
  "3\n9 20\n_ | 15 7",
  "5\n4 8\n11 _ | 13 4\n7 2 | | _ 1",
  "3: 9 20\n20: 15 7",
];

for (const s of samples) {
  console.log("输入: " + JSON.stringify(s));
  console.log(textToTree(s));
  console.log();
}
