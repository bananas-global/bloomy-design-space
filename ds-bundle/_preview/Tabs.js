"use strict";
var __dsPreview = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function np(p, k) {
        var o = {};
        for (var x in p) if (x !== "children") o[x] = p[x];
        if (k !== void 0) o.key = k;
        return o;
      }
      function jsx2(t, p, k) {
        var c = p && p.children;
        return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c);
      }
      function jsxs2(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx2;
      module.exports.jsxs = jsxs2;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs2 : jsx2)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // ds-raw:__ds_raw__
  var require_ds_raw = __commonJS({
    "ds-raw:__ds_raw__"(exports, module) {
      init_define_import_meta_env();
      module.exports = window.Bloomy;
    }
  });

  // .design-sync/previews/Tabs.tsx
  var Tabs_exports = {};
  __export(Tabs_exports, {
    ComMobileTitle: () => ComMobileTitle,
    FichaDoPaciente: () => FichaDoPaciente,
    SegundaAbaAtiva: () => SegundaAbaAtiva
  });
  init_define_import_meta_env();
  var import_react = __toESM(require_react_shim(), 1);

  // ds-shim:ds
  var ds_exports = {};
  __export(ds_exports, {
    default: () => ds_default
  });
  init_define_import_meta_env();
  __reExport(ds_exports, __toESM(require_ds_raw()));
  var g = window.Bloomy;
  var ds_default = "default" in g ? g.default : g;

  // .design-sync/previews/Tabs.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var ABAS = [
    { title: "Programas", content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-neutral-900", children: "Programas estruturados em aquisição." }) },
    { title: "Protocolos", mobileTitle: "Prot.", content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-neutral-900", children: "ABLLS-R e protocolos de avaliação." }) },
    { title: "Histórico", content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-neutral-900", children: "Alterações registradas no plano." }) }
  ];
  function useAbaInicial(selector) {
    const done = (0, import_react.useRef)(false);
    (0, import_react.useEffect)(() => {
      if (done.current) return;
      done.current = true;
      document.querySelector(selector)?.click();
    }, [selector]);
  }
  var ComMobileTitle = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tabs, { id: "tabs-plano", tab: ABAS });
  var SegundaAbaAtiva = () => {
    useAbaInicial("#tabs-plano-2-tab-1");
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tabs, { id: "tabs-plano-2", tab: ABAS });
  };
  var FichaDoPaciente = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.Tabs,
    {
      id: "tabs-ficha",
      tab: [
        {
          title: "Dados pessoais",
          content: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-1 text-sm text-neutral-900", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold", children: "Nome:" }),
              " Helena Martins"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold", children: "Nascimento:" }),
              " 14/03/2020"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold", children: "Responsável:" }),
              " Marina Alves"
            ] })
          ] })
        },
        { title: "Plano de Intervenção", content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-neutral-900", children: "PIC vigente até 30/11/2026." }) },
        { title: "Documentos", content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-neutral-900", children: "3 documentos anexados." }) },
        { title: "Faltas", content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-neutral-900", children: "Nenhuma falta no mês." }) }
      ]
    }
  );
  return __toCommonJS(Tabs_exports);
})();
