/// <reference types="vite/client" />

// SVG importado como URL. O Vite resolve, mas o TypeScript precisa da
// declaração para não tratar o import como erro.
declare module "*.svg" {
  const src: string;
  export default src;
}
