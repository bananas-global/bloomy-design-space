// Monta o pacote que o design-sync converte: o Bloomy não publica biblioteca
// (é um app Vite), então este script gera um `dist/` e um `types/` a partir de
// src/components e src/layouts, com o Vite e o tsc do próprio repositório.
//
//   dist/index.js    ESM, React externo (o conversor faz o IIFE)
//   dist/bloomy.css  Tailwind compilado + CSS dos componentes + fontes
//   dist/fonts/      Mulish e Font Awesome, como arquivos (não data-URI)
//   types/           declarações, com index.d.ts espelhando o barrel
//
// Rode da raiz: node .design-sync/pkg/build.mjs
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const pkg = dirname(fileURLToPath(import.meta.url));
const repo = join(pkg, "../..");
const dist = join(pkg, "dist");
const types = join(pkg, "types");
rmSync(dist, { recursive: true, force: true });
rmSync(types, { recursive: true, force: true });

// 1. JS + CSS pelo Vite (mesmos plugins do app, sem o source mapping de dev).
await build({
  configFile: false,
  root: repo,
  logLevel: "warn",
  plugins: [react(), tailwindcss()],
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: dist,
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    lib: { entry: join(pkg, "index.ts"), formats: ["es"], fileName: () => "index.js", cssFileName: "components" },
    rollupOptions: { external: [/^react($|\/)/, /^react-dom($|\/)/] },
  },
});

// 2. Fontes como arquivos. Mulish vem do tokens.css; Font Awesome, dos dois
//    estilos que o root.html.heex do monólito carrega; Inconsolata (a
//    --font-mono), de priv/static/fonts/inconsolata do monólito, copiada para
//    .design-sync/pkg/fonts porque o app daqui não a carrega.
const fonts = join(dist, "fonts");
mkdirSync(fonts, { recursive: true });
cpSync(join(repo, "src/assets/fonts"), fonts, { recursive: true });
cpSync(join(repo, "src/assets/fontawesome/webfonts"), fonts, { recursive: true });
cpSync(join(pkg, "fonts"), fonts, { recursive: true });
const monoCss = `@font-face{font-family:"Inconsolata";src:url(./fonts/Inconsolata-Variable.ttf) format("truetype");font-weight:200 900;font-display:swap}`;
const tokensCss = readFileSync(join(repo, "src/tokens/tokens.css"), "utf8")
  .replace(/@import[^;]+;/g, "")
  .replace(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g, "url(./fonts/$1)");
const faCss = ["regular", "solid"]
  .map((s) => readFileSync(join(repo, `src/assets/fontawesome/css/${s}.min.css`), "utf8"))
  .join("\n")
  .replaceAll("../webfonts/", "./fonts/");
writeFileSync(
  join(dist, "bloomy.css"),
  [readFileSync(join(dist, "components.css"), "utf8"), faCss, monoCss, tokensCss].join("\n"),
);
rmSync(join(dist, "components.css"));

// 3. Declarações pelo tsc do repositório, e um index.d.ts com os mesmos
//    `export *` do barrel.
execFileSync(join(repo, "node_modules/.bin/tsc"), ["-p", join(pkg, "tsconfig.json")], { stdio: "inherit" });
const reexports = readFileSync(join(pkg, "index.ts"), "utf8")
  .split("\n")
  .filter((l) => l.startsWith("export * from"))
  .map((l) => l.replace('"../../src/', '"./src/'));
writeFileSync(join(types, "index.d.ts"), reexports.join("\n") + "\n");
console.log("bloomy pkg: dist/ e types/ prontos");
