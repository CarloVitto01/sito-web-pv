// scripts/fix-mediapipe-sourcemap.js
const fs = require("fs");
const paths = [
  "node_modules/@mediapipe/tasks-vision/vision_bundle.mjs",
  "node_modules/@react-three/drei/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs",
];

let changed = false;
paths.forEach((p) => {
  if (fs.existsSync(p)) {
    const src = fs.readFileSync(p, "utf8");
    const out = src.replace(/^[ \t]*\/\/# sourceMappingURL=.*$/m, "");
    if (out !== src) {
      fs.writeFileSync(p, out, "utf8");
      console.log("✓ Patched:", p);
      changed = true;
    } else {
      console.log("• Nothing to patch in:", p);
    }
  }
});

if (!changed) {
  console.log("No mediapipe files found to patch.");
}
