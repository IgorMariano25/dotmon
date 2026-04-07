const fs = require("fs");
const fn = new Function(
  fs.readFileSync("./ide/js/compiler.js", "utf8") + "\nreturn DotmonCompiler;",
);
const DotmonCompiler = fn();

const src = fs.readFileSync("./workspace/src/completo.mon", "utf8");
const r = DotmonCompiler.compile(src, "completo.mon");

const errors = r.diagnostics.filter((d) => d.severity === "error");
const warnings = r.diagnostics.filter((d) => d.severity === "warning");

console.log(`Tokens: ${r.tokens.length}`);
console.log(`Erros: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log("\n=== ERROS ===");
  errors.forEach((e) => console.log(`  L${e.line}:${e.column} ${e.message}`));
}
if (warnings.length > 0) {
  console.log("\n=== WARNINGS ===");
  warnings.forEach((w) => console.log(`  L${w.line}:${w.column} ${w.message}`));
}

console.log("\n=== C CODE (primeiras 30 linhas) ===");
console.log(r.cCode.split("\n").slice(0, 30).join("\n"));
