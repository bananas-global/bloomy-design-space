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

  // ds-raw:__ds_raw__
  var require_ds_raw = __commonJS({
    "ds-raw:__ds_raw__"(exports, module) {
      init_define_import_meta_env();
      module.exports = window.Bloomy;
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

  // .design-sync/previews/BackofficeLayout.tsx
  var BackofficeLayout_exports = {};
  __export(BackofficeLayout_exports, {
    ListaDePacientesNoBackoffice: () => ListaDePacientesNoBackoffice,
    SemMenu: () => SemMenu
  });
  init_define_import_meta_env();

  // ds-shim:ds
  var ds_exports = {};
  __export(ds_exports, {
    default: () => ds_default
  });
  init_define_import_meta_env();
  __reExport(ds_exports, __toESM(require_ds_raw()));
  var g = window.Bloomy;
  var ds_default = "default" in g ? g.default : g;

  // .design-sync/previews/BackofficeLayout.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var PACIENTES = [
    { id: "p1", nome: "Helena Martins", unidade: "Unidade Jardim", ativo: true },
    { id: "p2", nome: "Otávio Lima", unidade: "Unidade Jardim", ativo: true },
    { id: "p3", nome: "Bruna Souza", unidade: "Unidade Girassol", ativo: false },
    { id: "p4", nome: "Davi Carvalho", unidade: "Unidade Girassol", ativo: true },
    { id: "p5", nome: "Lívia Rocha", unidade: "Unidade Jardim", ativo: true }
  ];
  var NOTIFICACOES = [
    { id: "n1", title: "Plano de intervenção aprovado", content: "O PIC de Helena Martins foi aprovado pela supervisão.", insertedAt: "há 2 horas" },
    { id: "n2", title: "Autorização parcial", content: "A guia de Otávio Lima foi autorizada parcialmente.", insertedAt: "há 1 dia", readAt: "29/07/2026 10:12" }
  ];
  var USUARIO = { name: "Marina Alves", units: ["Unidade Jardim", "Unidade Girassol"], roles: ["Admin", "Coordenador"], professional: true };
  var ListaDePacientes = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Card, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.Table,
      {
        id: "pacientes",
        rows: PACIENTES,
        rowId: (p) => p.id,
        col: [
          { label: "Nome", render: (p) => p.nome },
          { label: "Unidade", render: (p) => p.unidade },
          { label: "Status", render: (p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tag, { variant: p.ativo ? "green" : "red", item: p.ativo ? "Ativo" : "Inativo" }) }
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-6 flex justify-end", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Pagination, { meta: { currentPage: 1, totalPages: 8 }, onPaginate: () => {
    } }) })
  ] });
  var ListaDePacientesNoBackoffice = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.BackofficeLayout, { currentPath: "/backoffice/pacientes", breadcrumbs: [{ label: "Pacientes" }], currentUser: USUARIO, notifications: NOTIFICACOES, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Header, { className: "mb-6", actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { leftIcon: "fa-plus", children: "Novo paciente" }), children: "Pacientes" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListaDePacientes, {})
  ] });
  var SemMenu = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.BackofficeLayout, { hideMenu: true, currentPath: "/backoffice/pacientes", breadcrumbs: [{ label: "Pacientes" }], currentUser: USUARIO, notifications: NOTIFICACOES, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Header, { className: "mb-6", children: "Pacientes" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListaDePacientes, {})
  ] });
  return __toCommonJS(BackofficeLayout_exports);
})();
