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

  // .design-sync/previews/Input.tsx
  var Input_exports = {};
  __export(Input_exports, {
    ComErro: () => ComErro,
    CounterESlider: () => CounterESlider,
    Select: () => Select,
    TextareaCheckboxSwitch: () => TextareaCheckboxSwitch,
    TiposNativos: () => TiposNativos
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

  // .design-sync/previews/Input.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var ESPECIALIDADES = [
    { label: "Aplicador ABA", value: "aba" },
    { label: "Fisioterapia", value: "physiotherapy" },
    { label: "Fonoaudiologia", value: "speech-therapy" },
    { label: "Psicologia", value: "psychology" },
    { label: "Terapia Ocupacional", value: "occupational-therapy" }
  ];
  var TiposNativos = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid max-w-xl gap-4 md:grid-cols-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "nome", label: "Nome do paciente", placeholder: "Nome completo" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "busca", label: "Buscar", leftIcon: "fa-magnifying-glass", placeholder: "Paciente" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "horas", type: "number", label: "Carga semanal", hint: "horas", value: "20" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "nascimento", type: "date", label: "Data de nascimento", value: "2020-03-14" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "somente-leitura", label: "Somente leitura", value: "Não editável", disabled: true }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "senha", type: "password", label: "Senha", rightIcon: "fa-eye", value: "segredo" })
  ] });
  var ComErro = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-sm pb-6", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { id: "cep", label: "CEP", value: "04567", errors: ["CEP inválido"] }) });
  var Select = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid max-w-3xl gap-6 pb-6 md:grid-cols-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { type: "select", id: "especialidade", name: "professional[specialty]", label: "Especialidade", prompt: "Selecione a especialidade", value: "", options: ESPECIALIDADES }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { type: "select", id: "status", name: "professional[status]", label: "Status profissional", prompt: "Selecione o status", value: "active", options: [["Ativo", "active"], ["Inativo", "inactive"]] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { type: "select", id: "especialidade-erro", label: "Especialidade com erro", prompt: "Selecione a especialidade", value: "", options: ESPECIALIDADES, errors: ["selecione uma especialidade"] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { type: "select", id: "especialidade-bloqueada", label: "Especialidade indisponível", prompt: "Selecione a especialidade", value: "psychology", options: ESPECIALIDADES, disabled: true })
  ] });
  var TextareaCheckboxSwitch = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "max-w-xl space-y-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { type: "textarea", id: "observacao", label: "Observação", placeholder: "Como foi o atendimento" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { type: "checkbox", id: "supervisao", name: "programa[supervisao]", label: "Exige supervisão", value: true }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { type: "switch", id: "renovacao", name: "programa[renovacao]", label: "Renovação automática", value: true }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { type: "value_switch", name: "programa[dias]", label: "Segunda", inputValue: "monday", value: ["monday"] })
  ] });
  var CounterESlider = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "max-w-xl space-y-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { type: "counter", id: "tentativas", name: "programa[tentativas]", label: "Tentativas por sessão", value: "3", max: 10 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Input, { type: "slider", name: "avaliacao[nivel]", label: "Nível de ajuda", options: [["Independente", "0"], ["Verbal", "1"], ["Gestual", "2"], ["Física", "3"]], value: "1" })
  ] });
  return __toCommonJS(Input_exports);
})();
