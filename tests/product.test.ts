import { describe, expect, it } from "vitest";
import { validateProduct } from "@brucesantos/design-space/testing";
import { productDefinition } from "../src/app/product.js";

describe("catálogo", () => {
  it("não tem erro de referência nem de forma", () => {
    const errors = validateProduct(productDefinition).filter((issue) => issue.level === "error");
    expect(errors.map((issue) => `${issue.where}: ${issue.message}`)).toEqual([]);
  });

  it("todo item do catálogo tem id único e preview", () => {
    const components = productDefinition.components ?? [];
    expect(new Set(components.map((component) => component.id)).size).toBe(components.length);
    expect(components.every((component) => typeof component.preview === "function")).toBe(true);
  });

  it("separa layouts de componentes", () => {
    const groups = new Set((productDefinition.components ?? []).map((component) => component.group));
    expect(groups.has("Layouts")).toBe(true);
  });
});
