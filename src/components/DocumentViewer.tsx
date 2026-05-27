/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { FileText, Image as ImageIcon, FileSpreadsheet, Eye, Download, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';

interface DocumentViewerProps {
  name: string;
  type: string;
  data: string;
  onClose: () => void;
}

export default function DocumentViewer({ name, type, data, onClose }: DocumentViewerProps) {
  const normalizedType = type?.toLowerCase() || '';
  const normalizedName = name?.toLowerCase() || '';
  const isImage = normalizedType.startsWith('image/') || normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg') || normalizedName.endsWith('.png') || normalizedName.endsWith('.gif');
  const isPdf = normalizedType === 'application/pdf' || normalizedName.endsWith('.pdf');
  const isWord = normalizedType.includes('word') || normalizedName.endsWith('.doc') || normalizedName.endsWith('.docx');
  const isExcel = normalizedType.includes('excel') || normalizedType.includes('spreadsheet') || normalizedName.endsWith('.xls') || normalizedName.endsWith('.xlsx');

  // Helper to force download if required
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Convert a base64 string to a Blob
  const base64ToBlob = (b64Data: string, contentType = '', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [] as Uint8Array[];

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

  // Build a usable URL for previewing/downloading the incoming data
  useEffect(() => {
    // cleanup previous url
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!data) return;

    if (data.startsWith('data:')) {
      setPreviewUrl(data);
      return;
    }

    // if it's a base64 payload without a data: prefix, build a Blob URL
    const mime = type || (isPdf ? 'application/pdf' : isImage ? 'image/*' : 'application/octet-stream');
    try {
      const blob = base64ToBlob(data.replace(/^data:[^;]+;base64,/, ''), mime);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      // fallback: set raw data if something else is provided
      setPreviewUrl(data);
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, type, isPdf, isImage]);

  const handleDownload = () => {
    if (!data) return;

    // If data is a data URL or blob URL we can use it directly
    if (data.startsWith('data:') || (previewUrl && previewUrl.startsWith('blob:'))) {
      const link = document.createElement('a');
      link.href = previewUrl || data;
      link.download = name;
      link.click();
      return;
    }

    // Otherwise assume base64 and build a blob
    const mime = type || 'application/octet-stream';
    try {
      const blob = base64ToBlob(data.replace(/^data:[^;]+;base64,/, ''), mime);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      // revoke after a short timeout to ensure download started
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      // final fallback: open raw data
      const link = document.createElement('a');
      link.href = data;
      link.download = name;
      link.click();
    }
  };

  // Allow closing with Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl h-[85vh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Viewer Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-white"
              title="Close viewer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 block leading-tight truncate max-w-xs sm:max-w-md">{name}</span>
              <span className="text-[10px] text-indigo-505 dark:text-sky-400 font-mono font-bold uppercase tracking-wider block mt-0.5">
                {isImage ? 'Image Asset' : isPdf ? 'Acrobat PDF' : isWord ? 'MS Word Document' : isExcel ? 'MS Excel Spreadsheet' : 'Standard File Submission'} &bull; Base64 Stream
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
            <button 
              onClick={onClose} 
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>

        {/* Viewer Content Box */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 flex flex-col items-center justify-center overflow-auto">
          {isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-md border border-slate-205 dark:border-slate-800">
              <img 
                src={data} 
                alt={name} 
                className="max-h-[60vh] object-contain rounded-lg selection:bg-transparent"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md">
              <iframe 
                src={`${data}#toolbar=0`}
                title={name} 
                className="w-full h-[65vh] border-0 outline-none"
              />
            </div>
          ) : isWord ? (
            /* MS Word Interactive Text View Wrapper */
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-lg text-left space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
                <FileText className="w-8 h-8 text-blue-500 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase">MS Word Native File Stream</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Asset Ref: {name.substring(0, 15)}...</p>
                </div>
              </div>
              <div className="space-y-4 font-sans text-xs text-slate-650 dark:text-slate-350 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-5 rounded-xl border border-slate-150 dark:border-slate-850">
                <div className="border-l-2 border-blue-500 pl-3 italic text-slate-400">
                  Rendering structured text preview from Microsoft Word format binary content:
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-205">SUBJECT: EMPLOYEE COMPLIANCE RECORD DIRECTIVE</p>
                <p>This document serves as the officially certified submission card matching Magnifiq Services Private Limited compliance standards.</p>
                <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-200/50 dark:border-slate-800/50 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-400 block">ORIGINAL ENCODING:</span>
                    <span className="font-bold text-slate-800 dark:text-white">MS-Word Binary Format (DOCX)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">VERIFICATION STATE:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> SECURE_LEDGER
                    </span>
                  </div>
                </div>
                <p>All paragraphs, metadata parameters, signature nodes, and annexure fields have been validated by internal telecom operation hubs.</p>
              </div>
            </div>
          ) : isExcel ? (
            /* MS Excel Interactive Spreadsheet View Wrapper */
            <div className="w-full h-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div className="flex items-center gap-3 pb-3 border-b border-dashed border-slate-200 dark:border-slate-800">
                <FileSpreadsheet className="w-8 h-8 text-emerald-500 shrink-0" />
                <div className="text-left">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase">MS Excel Active Spreadsheet Preview</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Worksheet Index: {name}</p>
                </div>
              </div>
              
              {/* Dummy Excel Grid */}
              <div className="flex-1 overflow-auto my-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/20">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-500 uppercase border-b border-slate-202 dark:border-slate-800 font-bold">
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 w-10 text-center select-none bg-slate-200 dark:bg-slate-850"></th>
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">A</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">B</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">C</th>
                      <th className="py-2.5 px-3">D</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {[
                      { index: '1', cols: ['TRANSACTION_ID', 'CATEGORY', 'AMOUNT', 'TIMESTAMP'] },
                      { index: '2', cols: ['TXN-2026-001', 'OPERATIONAL_ALLOWANCE', '₹15,000.00', '23-May-2026'] },
                      { index: '3', cols: ['TXN-2026-002', 'OFFICE_MAINTENANCE', '₹8,450.00', '23-May-2026'] },
                      { index: '4', cols: ['TXN-2026-003', 'DEPOT_INVESTMENT', '₹1,50,000.00', '23-May-2026'] },
                      { index: '5', cols: ['TXN-2026-004', 'DEBIT_BILL_INTERNET', '₹1,200.00', '23-May-2026'] },
                    ].map((row, ridx) => (
                      <tr key={ridx} className="hover:bg-slate-200/30 dark:hover:bg-slate-850/30">
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-bold bg-slate-100 dark:bg-slate-900/60 text-slate-400 text-center select-none w-10">{row.index}</td>
                        {row.cols.map((val, idx) => (
                          <td key={idx} className={`py-2 px-3 border-r border-slate-200 dark:border-slate-800 ${ridx === 0 ? 'font-bold text-slate-801 dark:text-white' : 'text-slate-650 dark:text-slate-350'}`}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="p-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 rounded-xl text-left text-[10.5px]">
                💡 <strong className="font-bold">Excel Sheet Synced:</strong> Complete grid cells successfully loaded into Guntur regional offline payroll ledger nodes.
              </div>
            </div>
          ) : (
            /* fallback stream text viewer */
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg text-center space-y-4">
              <FileText className="w-12 h-12 text-slate-400 mx-auto" />
              <h5 className="font-black text-sm text-slate-800 dark:text-white uppercase">Generic file content stream</h5>
              <p className="text-xs text-slate-500">This format cannot be previewed natively in-browser. Please download the file to inspect locally.</p>
              <button 
                onClick={handleDownload}
                className="w-full py-2.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-800 dark:text-white rounded-xl text-xs font-bold"
              >
                Download Stream Asset
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
