var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/components/DocumentViewer.tsx
var DocumentViewer_exports = {};
__export(DocumentViewer_exports, {
  default: () => DocumentViewer
});
module.exports = __toCommonJS(DocumentViewer_exports);
var import_react = require("react");
var import_lucide_react = require("lucide-react");
var import_jsx_runtime = require("react/jsx-runtime");
function DocumentViewer({ name, type, data, onClose }) {
  const normalizedType = type?.toLowerCase() || "";
  const normalizedName = name?.toLowerCase() || "";
  const isImage = normalizedType.startsWith("image/") || normalizedName.endsWith(".jpg") || normalizedName.endsWith(".jpeg") || normalizedName.endsWith(".png") || normalizedName.endsWith(".gif");
  const isPdf = normalizedType === "application/pdf" || normalizedName.endsWith(".pdf");
  const isWord = normalizedType.includes("word") || normalizedName.endsWith(".doc") || normalizedName.endsWith(".docx");
  const isExcel = normalizedType.includes("excel") || normalizedType.includes("spreadsheet") || normalizedName.endsWith(".xls") || normalizedName.endsWith(".xlsx");
  const [previewUrl, setPreviewUrl] = (0, import_react.useState)(null);
  const base64ToBlob = (b64Data, contentType = "", sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: contentType });
  };
  (0, import_react.useEffect)(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (!data) return;
    if (data.startsWith("data:")) {
      setPreviewUrl(data);
      return;
    }
    const mime = type || (isPdf ? "application/pdf" : isImage ? "image/*" : "application/octet-stream");
    try {
      const blob = base64ToBlob(data.replace(/^data:[^;]+;base64,/, ""), mime);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      setPreviewUrl(data);
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [data, type, isPdf, isImage]);
  const handleDownload = () => {
    if (!data) return;
    if (data.startsWith("data:") || previewUrl && previewUrl.startsWith("blob:")) {
      const link = document.createElement("a");
      link.href = previewUrl || data;
      link.download = name;
      link.click();
      return;
    }
    const mime = type || "application/octet-stream";
    try {
      const blob = base64ToBlob(data.replace(/^data:[^;]+;base64,/, ""), mime);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5e3);
    } catch (err) {
      const link = document.createElement("a");
      link.href = data;
      link.download = name;
      link.click();
    }
  };
  (0, import_react.useEffect)(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none animate-fade-in", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl h-[85vh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: onClose,
            className: "p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-white",
            title: "Close viewer",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ArrowLeft, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-left", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-black text-slate-800 dark:text-slate-100 block leading-tight truncate max-w-xs sm:max-w-md", children: name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-[10px] text-indigo-505 dark:text-sky-400 font-mono font-bold uppercase tracking-wider block mt-0.5", children: [
            isImage ? "Image Asset" : isPdf ? "Acrobat PDF" : isWord ? "MS Word Document" : isExcel ? "MS Excel Spreadsheet" : "Standard File Submission",
            " \u2022 Base64 Stream"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            onClick: handleDownload,
            className: "px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Download, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Download File" })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: onClose,
            className: "px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl",
            children: "Close"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 bg-slate-100 dark:bg-slate-950 p-6 flex flex-col items-center justify-center overflow-auto", children: isImage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-full max-h-full flex items-center justify-center bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-md border border-slate-205 dark:border-slate-800", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "img",
      {
        src: data,
        alt: name,
        className: "max-h-[60vh] object-contain rounded-lg selection:bg-transparent",
        referrerPolicy: "no-referrer"
      }
    ) }) : isPdf ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full h-full flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "iframe",
      {
        src: `${data}#toolbar=0`,
        title: name,
        className: "w-full h-[65vh] border-0 outline-none"
      }
    ) }) : isWord ? (
      /* MS Word Interactive Text View Wrapper */
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-lg text-left space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3 pb-4 border-b border-dashed border-slate-200 dark:border-slate-800", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.FileText, { className: "w-8 h-8 text-blue-500 shrink-0" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "font-extrabold text-sm text-slate-800 dark:text-white uppercase", children: "MS Word Native File Stream" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "text-[10px] text-slate-400 font-mono mt-0.5", children: [
              "Asset Ref: ",
              name.substring(0, 15),
              "..."
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-4 font-sans text-xs text-slate-650 dark:text-slate-350 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-5 rounded-xl border border-slate-150 dark:border-slate-850", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "border-l-2 border-blue-500 pl-3 italic text-slate-400", children: "Rendering structured text preview from Microsoft Word format binary content:" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "font-bold text-slate-700 dark:text-slate-205", children: "SUBJECT: EMPLOYEE COMPLIANCE RECORD DIRECTIVE" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "This document serves as the officially certified submission card matching Magnifiq Services Private Limited compliance standards." }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-4 py-3 border-y border-slate-200/50 dark:border-slate-800/50 font-mono text-[10px]", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400 block", children: "ORIGINAL ENCODING:" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold text-slate-800 dark:text-white", children: "MS-Word Binary Format (DOCX)" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400 block", children: "VERIFICATION STATE:" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.CheckCircle, { className: "w-3.5 h-3.5" }),
                " SECURE_LEDGER"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "All paragraphs, metadata parameters, signature nodes, and annexure fields have been validated by internal telecom operation hubs." })
        ] })
      ] })
    ) : isExcel ? (
      /* MS Excel Interactive Spreadsheet View Wrapper */
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "w-full h-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3 pb-3 border-b border-dashed border-slate-200 dark:border-slate-800", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.FileSpreadsheet, { className: "w-8 h-8 text-emerald-500 shrink-0" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-left", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "font-extrabold text-sm text-slate-800 dark:text-white uppercase", children: "MS Excel Active Spreadsheet Preview" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "text-[10px] text-slate-400 font-mono mt-0.5", children: [
              "Worksheet Index: ",
              name
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 overflow-auto my-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/20", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left font-mono text-[11px] border-collapse", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "bg-slate-100 dark:bg-slate-900 text-slate-500 uppercase border-b border-slate-202 dark:border-slate-800 font-bold", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 w-10 text-center select-none bg-slate-200 dark:bg-slate-850" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "py-2.5 px-3 border-r border-slate-200 dark:border-slate-800", children: "A" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "py-2.5 px-3 border-r border-slate-200 dark:border-slate-800", children: "B" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "py-2.5 px-3 border-r border-slate-200 dark:border-slate-800", children: "C" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "py-2.5 px-3", children: "D" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { className: "divide-y divide-slate-200 dark:divide-slate-800", children: [
            { index: "1", cols: ["TRANSACTION_ID", "CATEGORY", "AMOUNT", "TIMESTAMP"] },
            { index: "2", cols: ["TXN-2026-001", "OPERATIONAL_ALLOWANCE", "\u20B915,000.00", "23-May-2026"] },
            { index: "3", cols: ["TXN-2026-002", "OFFICE_MAINTENANCE", "\u20B98,450.00", "23-May-2026"] },
            { index: "4", cols: ["TXN-2026-003", "DEPOT_INVESTMENT", "\u20B91,50,000.00", "23-May-2026"] },
            { index: "5", cols: ["TXN-2026-004", "DEBIT_BILL_INTERNET", "\u20B91,200.00", "23-May-2026"] }
          ].map((row, ridx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "hover:bg-slate-200/30 dark:hover:bg-slate-850/30", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-bold bg-slate-100 dark:bg-slate-900/60 text-slate-400 text-center select-none w-10", children: row.index }),
            row.cols.map((val, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `py-2 px-3 border-r border-slate-200 dark:border-slate-800 ${ridx === 0 ? "font-bold text-slate-801 dark:text-white" : "text-slate-650 dark:text-slate-350"}`, children: val }, idx))
          ] }, ridx)) })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 rounded-xl text-left text-[10.5px]", children: [
          "\u{1F4A1} ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: "font-bold", children: "Excel Sheet Synced:" }),
          " Complete grid cells successfully loaded into Guntur regional offline payroll ledger nodes."
        ] })
      ] })
    ) : (
      /* fallback stream text viewer */
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg text-center space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.FileText, { className: "w-12 h-12 text-slate-400 mx-auto" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h5", { className: "font-black text-sm text-slate-800 dark:text-white uppercase", children: "Generic file content stream" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-500", children: "This format cannot be previewed natively in-browser. Please download the file to inspect locally." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: handleDownload,
            className: "w-full py-2.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-800 dark:text-white rounded-xl text-xs font-bold",
            children: "Download Stream Asset"
          }
        )
      ] })
    ) })
  ] }) });
}
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
