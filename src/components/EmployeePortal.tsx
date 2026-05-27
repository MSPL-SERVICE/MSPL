/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee, AttendanceLog, Payslip, DocumentFile, RecycleBinItem, PayslipFormat } from '../types';
import { 
  Building2, Camera, MapPin, Upload, FileText, CalendarCheck, 
  DollarSign, CheckCircle2, ChevronRight, UserCheck, ShieldAlert, RefreshCw,
  Eye, Trash2, Plus, Edit, LogOut, Trash, RefreshCcw, Clock, AlertCircle
} from 'lucide-react';
import CameraStream from './CameraStream';
import DocumentViewer from './DocumentViewer';
import { generatePayslipPDF } from '../lib/pdfHelper';

interface EmployeePortalProps {
  employee: Employee;
  attendanceLogs: AttendanceLog[];
  payslips: Payslip[];
  payslipFormat: PayslipFormat;
  onClockIn: (logUrl: string, lat: number, lng: number, customDate?: string, customTime?: string) => void;
  onUpdateEmployee: (updated: Employee) => void;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onSignOut?: () => void;
}

export default function EmployeePortal({
  employee,
  attendanceLogs,
  payslips,
  payslipFormat,
  onClockIn,
  onUpdateEmployee,
  toast,
  onSignOut
}: EmployeePortalProps) {
  const [activeSegment, setActiveSegment] = useState<'clockin' | 'documents' | 'leaves' | 'payslips'>('clockin');
  
  const myLogs = (attendanceLogs || []).filter(log => log.employeeId.toUpperCase() === employee.id.toUpperCase());
  const todayStr = new Date().toISOString().substring(0, 10);
  const checkedInToday = myLogs.some(log => log.date === todayStr);
  
  // Camera & GPS State
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Manual Attendance Logging States
  const [useManualForm, setUseManualForm] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [manualTime, setManualTime] = useState(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const [manualLatitude, setManualLatitude] = useState('16.3067');
  const [manualLongitude, setManualLongitude] = useState('80.4365');

  // Sync GPS Coordinates to manual forms if polled
  useEffect(() => {
    if (gpsCoords) {
      setManualLatitude(gpsCoords.lat.toString());
      setManualLongitude(gpsCoords.lng.toString());
    }
  }, [gpsCoords]);

  // Document Upload File Input Tracker
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Preview Document Selector State
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; data: string } | null>(null);

  // Custom document addition state
  const [customDocLabel, setCustomDocLabel] = useState('');
  const [isAddingCustomDoc, setIsAddingCustomDoc] = useState(false);

  // Recycle Bin State
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>(() => {
    const saved = localStorage.getItem('mspl_recycle_bin');
    return saved ? JSON.parse(saved) : [];
  });

  // Hot Sync Recycle Bin
  useEffect(() => {
    localStorage.setItem('mspl_recycle_bin', JSON.stringify(recycleBin));
  }, [recycleBin]);

  // Personal Payslip selection
  const employeePayslips = payslips.filter(p => p.employeeId.toUpperCase() === employee.id.toUpperCase());

  useEffect(() => {
    fetchGeolocation();
  }, []);

  const fetchGeolocation = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your device browser.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGpsLoading(false);
      },
      (error) => {
        console.warn("Geolocation access denied:", error);
        setGpsError("Location tracking prompt declined or timed out. Defaulting Corporate HQ reference coordinates.");
        // Hyderabad Corporate HQ Reference coordinates (ECIL)
        setGpsCoords({ lat: 17.4772, lng: 78.5711 });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleSelfieCapture = (dataUrl: string) => {
    setCapturedSelfie(dataUrl);
  };

  const submitClockIn = () => {
    if (useManualForm) {
      const lat = parseFloat(manualLatitude) || 17.4772;
      const lng = parseFloat(manualLongitude) || 78.5711;
      onClockIn('', lat, lng, manualDate, manualTime);
      toast("✓ Manual shift attendance added successfully!", "success");
    } else {
      const lat = gpsCoords?.lat || 17.4772;
      const lng = gpsCoords?.lng || 78.5711;
      onClockIn(capturedSelfie || '', lat, lng);
      toast("✓ Shift attendance logged! Date, time, and coordinates recorded.", "success");
      setCapturedSelfie(null); // Reset
    }
  };

  // Safe file reader helper
  const processFileUpload = (file: File, key: string, label: string) => {
    setUploadProgress(key);
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const newFileObj: DocumentFile = {
        key,
        label,
        name: file.name,
        type: file.type || 'application/octet-stream',
        data: base64Data,
        uploadedAt: new Date().toLocaleDateString('en-US'),
        status: 'uploaded'
      };

      const currentFiles = employee.uploadedFilesList || [];
      const filtered = currentFiles.filter(f => f.key !== key);
      const updatedFiles = [...filtered, newFileObj];

      onUpdateEmployee({
        ...employee,
        [key]: 'uploaded', // Backwards compatibility legacy field
        uploadedFilesList: updatedFiles
      });

      setUploadProgress(null);
      toast(`✓ Document "${label}" saved and queued for HR review.`, "success");
    };
    reader.onerror = () => {
      setUploadProgress(null);
      toast("Failed to process file binary selection.", "error");
    };
    reader.readAsDataURL(file);
  };

  // Custom file upload manual handler
  const handleUploadDocument = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, docLabel: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    processFileUpload(file, fieldName, docLabel);
  };

  // Create custom new document slots manually
  const handleCreateCustomDocSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDocLabel.trim()) {
      toast("Please provide a legitimate document name/label.", "error");
      return;
    }
    const safeKey = `custom_${Date.now()}`;
    const newFileSlot: DocumentFile = {
      key: safeKey,
      label: customDocLabel.trim(),
      name: 'Awaiting Upload File Submission',
      type: 'pending/slot',
      data: '',
      uploadedAt: '',
      status: 'uploaded'
    };

    const updatedList = [...(employee.uploadedFilesList || []), newFileSlot];
    onUpdateEmployee({
      ...employee,
      uploadedFilesList: updatedList
    });

    setCustomDocLabel('');
    setIsAddingCustomDoc(false);
    toast(`✓ Custom Document Slot "${newFileSlot.label}" created successfully! Please upload a file to it now.`, "success");
  };

  // Deleting document -> sends to bin
  const handleDeleteDocument = (docKey: string) => {
    const list = employee.uploadedFilesList || [];
    const targetFile = list.find(f => f.key === docKey);
    if (!targetFile) return;

    // Create Recycle Bin item
    const binItem: RecycleBinItem = {
      id: `bin-${Date.now()}`,
      sourceType: 'employee_doc',
      title: `Employee Document: ${targetFile.label}`,
      fileName: targetFile.name,
      fileType: targetFile.type,
      fileData: targetFile.data,
      deletedAt: new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      originalPath: {
        employeeId: employee.id,
        docKey: docKey,
        logData: JSON.stringify(targetFile)
      }
    };

    const remaining = list.filter(f => f.key !== docKey);

    // Save
    onUpdateEmployee({
      ...employee,
      [docKey]: undefined, // clear legacy status
      uploadedFilesList: remaining
    });

    setRecycleBin(prev => [binItem, ...prev]);
    toast(`✓ File "${targetFile.label}" moved to Recycle Bin. You can restore it anytime.`, "warning");
  };

  // Restoring document from Recycle Bin
  const handleRestoreFromBin = (binItem: RecycleBinItem) => {
    if (!binItem.originalPath.docKey || !binItem.originalPath.logData) return;
    try {
      const restoredFile: DocumentFile = JSON.parse(binItem.originalPath.logData);
      const list = employee.uploadedFilesList || [];
      
      onUpdateEmployee({
        ...employee,
        [restoredFile.key]: restoredFile.status,
        uploadedFilesList: [...list, restoredFile]
      });

      setRecycleBin(prev => prev.filter(item => item.id !== binItem.id));
      toast(`✓ Document "${restoredFile.label}" successfully restored from Bin!`, "success");
    } catch {
      toast("Could not parsing restored document data.", "error");
    }
  };

  // Permanent Delete
  const handlePermanentDelete = (idx: string) => {
    setRecycleBin(prev => prev.filter(item => item.id !== idx));
    toast("✓ Document permanently deleted from system nodes.", "info");
  };

  const docUploads = [
    { key: 'aadhar', label: 'Aadhar Card', help: 'Submit front and back merged' },
    { key: 'pan', label: 'PAN Card', help: 'Must be clearly readable tax ID' },
    { key: 'passport', label: 'Passport Identity Page', help: 'Required for global projects' },
    { key: 'resume', label: 'Updated Resume / CV', help: 'PDF or Word documents accepted' },
    { key: 'esic', label: 'ESIC Document / Card', help: 'Medical insurance category' },
    { key: 'epfo', label: 'EPFO Nominee Details', help: 'Provident retirement account' },
    { key: 'studyCertificate', label: 'Academic Study Certificate', help: 'Degree or high-school certificate' },
    { key: 'bankPassbook', label: 'Bank Passbook / Cancelled Cheque', help: 'Direct deposit payroll deposit node' }
  ];

  // Helper to resolve current file state
  const getDocFileState = (key: string, label: string) => {
    const list = employee.uploadedFilesList || [];
    const found = list.find(f => f.key === key);
    if (found) return found;

    // Check fallback old text fields inside employee
    const legacyStatus = (employee as any)[key];
    if (legacyStatus === 'uploaded' || legacyStatus === 'verified') {
      return {
        key,
        label,
        name: `${label}_Submission.pdf`,
        type: 'application/pdf',
        data: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCgogID4+CmVuZG9iagoyIDAgb2JqCiAgPDwgL1R5cGUgL1BhZ2VzCiAgICAgL0tpZHMgWyAzIDAgUiBdCiAgICAgL0NvdW50IDEKICA+PgplbmRvYmoKMyAwIG9iagogIDw8IC9UeXBlIC9QYWdlCiAgICAgL1BhcmVudCAyIDAgUgogICAgIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDQgMCBSID4+ID4+CiAgICAgL01lZGlhQm94IFsgMCAwIDU5NSA4NDIgXQogICAgIC9Db250ZW50cyA1IDAgUgoKICA+PgplbmRvYmoKNCAgb2JqCiAgPDwgL1R5cGUgL0ZvbnQKICAgICAvU3VidHlwZSAvVHlwZTEKICAgICAvQmFzZUZvbnQgL0hlbHZldGljYQogID4+CmVuZG9iago1IDAgb2JqCiAgPDwgL0xlbmd0aCA3MyA+PgpzdHJlYW0KQlQKICAvRjEgMTIgVGYKICA3MiA3MTIgVGQKICAoTWFnbmlmaXEgU2VydmljZXMgUHJpdmF0ZSBMaW1pdGVkIENvbXBsaWFuY2UgRG9jdW1lbnQpIFRqCkVOCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE3IDAwMDAwIG4gCjAwMDAwMDAwNzMgMDAwMDAgbiAKMDAwMDAwMDEzNCAwMDAwIG4gCjAwMDAwMDAyNjAgMDAwMDAgbiAKMDAwMDAwMDMyMiAwMDAwIG4gCnRyYWlsZXIKICA8PCAvU2l6ZSA2CiAgICAgL1Jvb3QgMSAwIFIKICA+PgpzdGFydHhyZWYKNDE0CiUlRU9G',
        uploadedAt: employee.registeredAt,
        status: legacyStatus as 'uploaded' | 'verified'
      };
    }
    return null;
  };

  // Get employee specific trash
  const employeeTrash = recycleBin.filter(item => item.originalPath.employeeId === employee.id);

  return (
    <div className="space-y-6 text-left relative">
      
      {/* Top Welcome Card */}
      <div className="p-6 sm:p-8 rounded-3xl border border-indigo-500/10 dark:border-sky-500/10 bg-white/70 dark:bg-slate-900/40 backdrop-blur flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 text-left">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-205 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
            {employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-slate-400 select-none uppercase">
                {employee.name.split(" ").map(w => w[0]).join("").substring(0, 2)}
              </span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-black text-slate-900 dark:text-white font-display">{employee.name}</h4>
              {(employee.role !== 'md' && employee.role !== 'director') && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                  Roster Active ✓
                </span>
              )}
            </div>
            <p className="text-xs text-slate-455 font-semibold mt-1 font-mono uppercase tracking-wide">
              ID Card: {employee.id} &bull; Operational Shift
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2.5">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wider font-bold">Regular Shift Schedule</span>
            <span className="text-xs font-black text-slate-805 dark:text-indigo-400">09:30 AM - 06:30 PM (All Staff)</span>
          </div>
          
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-955 text-rose-600 dark:text-rose-400 text-xs font-black rounded-lg transition cursor-pointer flex items-center gap-1.5 border border-rose-200/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out & Exit Portal</span>
            </button>
          )}
        </div>
      </div>

      {/* Segment Navigation */}
      <div className="flex bg-slate-100/60 dark:bg-slate-950 p-1 rounded-2xl text-xs font-bold border border-slate-202 dark:border-slate-850 select-none">
        {[
          { key: 'clockin', label: 'Roster Clock-In', icon: <Camera className="w-4 h-4 text-rose-500" /> },
          { key: 'documents', label: 'Company Portal Documents', icon: <Upload className="w-4 h-4 text-indigo-500" /> },
          { key: 'leaves', label: 'Leaves Balance', icon: <CalendarCheck className="w-4 h-4 text-emerald-500" /> },
          { key: 'payslips', label: 'Disbursed Payslips', icon: <DollarSign className="w-4 h-4 text-amber-500" /> }
        ].filter(() => (employee.role !== 'md' && employee.role !== 'director')).map(seg => (
          <button
            key={seg.key}
            onClick={() => setActiveSegment(seg.key as any)}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer duration-250 ${activeSegment === seg.key ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"}`}
          >
            {seg.icon}
            <span className="hidden leading-none sm:inline">{seg.label}</span>
          </button>
        ))}
      </div>

      {/* Segment Body */}
      <div className="bg-white/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur shadow-2xs">
        
        {/* TAB 1: Roster Clock-In */}
        {activeSegment === 'clockin' && (
          <div className="space-y-6">
            {(employee.role !== 'md' && employee.role !== 'director') && (
              <>
            <div className="pb-3 border-b border-dashed border-slate-200 dark:border-slate-800 text-left">
              <h4 className="text-sm font-bold text-slate-810 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-display">
                <UserCheck className="w-4 h-4 text-indigo-505" />
                <span>Shift Sign-In & Attendance Console</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-405 mt-0.5">
                Confirm your physical presence. Attendance records require live GPS coordinates matching Guntur Operations network nodes. All staff are expected to log in for the uniform shift: <strong className="font-bold text-slate-700 dark:text-slate-350">09:30 AM to 06:30 PM</strong>.
              </p>
            </div>

            {/* Live Today Check-in Badge Status Banner */}
            {checkedInToday ? (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center gap-3 text-xs font-semibold select-none text-left">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="space-y-0.5">
                  <span className="font-extrabold block">Active Shift Clock-In Captured Today!</span>
                  <span className="text-[10.5px] text-emerald-600/80 font-mono block">Your presence has been certified securely at Guntur Logistics node registers.</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center gap-3 text-xs font-semibold select-none text-left">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                <div className="space-y-0.5">
                  <span className="font-extrabold block">Attendance Entry Outstanding for Today</span>
                  <span className="text-[10.5px] text-amber-600/80 font-mono block">Please use the controls below to log your daily attendance.</span>
                </div>
              </div>
            )}

            {/* Attendance Mode Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs font-bold leading-none select-none max-w-sm border border-slate-202 dark:border-slate-850">
              <button
                type="button"
                onClick={() => setUseManualForm(false)}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer select-none duration-150 ${!useManualForm ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"}`}
              >
                ⚡ Live GPS Auto-Sign
              </button>
              <button
                type="button"
                onClick={() => setUseManualForm(true)}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer select-none duration-150 ${useManualForm ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500"}`}
              >
                📝 Manual Shift Entry
              </button>
            </div>

            {!useManualForm ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start text-left">
                {/* Geolocation feedback panel */}
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-indigo-50/20 dark:bg-slate-900/30 border border-indigo-200/20 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-indigo-755 dark:text-sky-450 tracking-wider font-display">Site Location telemetry</span>
                      <button onClick={fetchGeolocation} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-sky-400 hover:underline">{gpsLoading ? "Polling GPS..." : "Query Coordinates"}</button>
                    </div>

                    {gpsLoading ? (
                      <div className="flex items-center gap-2.5 text-xs text-slate-500 font-mono animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                        <span>Pinged regional satellite beacons...</span>
                      </div>
                    ) : gpsError ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2 text-rose-500 font-semibold leading-relaxed">
                          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{gpsError}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/50 dark:border-slate-800/40">
                          <span className="text-slate-455">Terminal Lat:</span>
                          <span className="font-extrabold text-slate-805 dark:text-white select-all">{(gpsCoords?.lat || 16.3067).toFixed(6)}° N</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/50 dark:border-slate-800/40">
                          <span className="text-slate-455">Terminal Lng:</span>
                          <span className="font-extrabold text-slate-805 dark:text-white select-all">{(gpsCoords?.lng || 80.4365).toFixed(6)}° E</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-455">Target Depot Lock:</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-450 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] leading-none animate-pulse" />
                            HYDERABAD_HQ_NODE
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/20 text-xs text-slate-455 dark:text-slate-500 leading-relaxed font-sans">
                    📡 <strong className="font-bold text-slate-700 dark:text-slate-350">Privacy Notice:</strong> Your selfie headshot (fully optional) and geolocation coordinates are encrypted at lock-in and utilized solely for payroll accounting audits under Guntur company registries.
                  </div>

                  <button
                    type="button"
                    onClick={submitClockIn}
                    className={`w-full py-3.5 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all duration-300 cursor-pointer ${
                      capturedSelfie 
                        ? "bg-emerald-600 hover:bg-emerald-500 scale-[1.02] ring-4 ring-emerald-500/20 shadow-emerald-500/20 active:scale-[0.99] animate-pulse" 
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10 active:scale-[0.98]"
                    }`}
                  >
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    <span>{capturedSelfie ? "Confirm & Clock In Now" : "Clock In Shift Attendance"}</span>
                  </button>
                </div>

                {/* Camera Capture Device Panel */}
                <div className="flex justify-center flex-col items-center space-y-2">
                  <CameraStream onCapture={handleSelfieCapture} />
                  {capturedSelfie && (
                    <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-black tracking-wide bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      ✓ Headshot captured for log integration
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* MANUAL ATTENDANCE FORM ENTRY */
              <div className="max-w-xl p-6 border border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-950/25 space-y-5 animate-fade-in text-xs font-semibold">
                <div className="space-y-1 text-left">
                  <h5 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400">Add Manual Attendance Log</h5>
                  <p className="text-[11px] text-slate-455">Provide your actual logged details and precise coordinates manually below.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="block text-slate-455 leading-none">Date *</label>
                    <input
                      type="date"
                      required
                      value={manualDate}
                      onChange={e => setManualDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 text-xs rounded-xl px-3 py-2.5 font-bold focus:outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="block text-slate-455 leading-none">Time Stamp *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 09:30 AM"
                      value={manualTime}
                      onChange={e => setManualTime(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 text-xs rounded-xl px-3 py-2.5 font-mono font-bold focus:outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="block text-slate-455 leading-none">Reporting Latitude Coordinate *</label>
                    <input
                      type="text"
                      required
                      value={manualLatitude}
                      onChange={e => setManualLatitude(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 text-xs rounded-xl px-3 py-2.5 font-mono font-bold focus:outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="block text-slate-455 leading-none">Reporting Longitude Coordinate *</label>
                    <input
                      type="text"
                      required
                      value={manualLongitude}
                      onChange={e => setManualLongitude(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 text-xs rounded-xl px-3 py-2.5 font-mono font-bold focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submitClockIn}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition duration-200 cursor-pointer shadow-emerald-600/10"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Manual Attendance Record</span>
                </button>
              </div>
            )}

            {/* Employee's Own Personal History Log Records */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 mt-6 text-left">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5 font-display">
                <Clock className="w-4 h-4 text-[#5046e6] dark:text-sky-400" />
                <span>Your Captured Sign-In Records ({myLogs.length})</span>
              </h5>
              
              {myLogs.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border text-center text-xs text-slate-400 font-medium font-sans">
                  No sign-in records captured in this session registry database. Use the fields above to submit daily clock-in.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myLogs.map(log => (
                    <div key={log.id} className="p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900/10 flex flex-col justify-between h-[120px] shadow-3xs hover:border-indigo-300 dark:hover:border-sky-500 transition">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold font-mono">
                            {log.isManualOverride ? "📝 MANUAL OVERRIDE" : "⚡ LIVE GPS AUTO-SIGN"}
                          </span>
                          <span className="block text-xs font-black text-slate-800 dark:text-slate-100 mt-1.5">{log.time}</span>
                          <span className="block text-[10px] text-slate-400 font-mono font-bold">{log.date}</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 dark:bg-slate-950 border px-1.5 py-0.5 rounded-md self-start">ID: {log.id.slice(-6)}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 border-t border-dashed border-slate-100 dark:border-slate-800/50 pt-1.5 mt-1.5">
                        GPS Location: <span className="font-bold text-slate-600 dark:text-slate-200">{(log.latitude || 16.3067).toFixed(4)}° N, {(log.longitude || 80.4365).toFixed(4)}° E</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            )}
          </div>
        )}

        {/* TAB 2: Document Update & Upload Block */}
        {activeSegment === 'documents' && (
          <div className="space-y-8 text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-dashed border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-801 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  <span>Verified Document Registry Uploads</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-405 mt-0.5">
                  Maintain, delete, or manually add your digital identity files. Supported: JPG, JPEG, PDF, MS Word, MS Excel, IMG formats.
                </p>
              </div>

              {/* Add Custom document slots input */}
              <button
                onClick={() => setIsAddingCustomDoc(!isAddingCustomDoc)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Document</span>
              </button>
            </div>

            {/* Manual custom document creator form */}
            {isAddingCustomDoc && (
              <form onSubmit={handleCreateCustomDocSlot} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 max-w-md space-y-3 animate-fade-in">
                <h5 className="text-xs font-black uppercase text-indigo-700 dark:text-sky-400">Initialize custom credential path</h5>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. GST Registration Certificate, Driving License"
                    value={customDocLabel}
                    onChange={e => setCustomDocLabel(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 text-xs pt-1">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingCustomDoc(false)} 
                      className="px-3 py-1 text-slate-400"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                    >
                      Create Path
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Grid display containing 8 standard items PLUS custom newly added items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...docUploads.map(d => ({ key: d.key, label: d.label, help: d.help, isStandard: true })), 
                ...(employee.uploadedFilesList || [])
                  .filter(f => !docUploads.some(std => std.key === f.key))
                  .map(f => ({ key: f.key, label: f.label, help: 'Added manually by employee', isStandard: false }))
              ].map(doc => {
                const docFile = getDocFileState(doc.key, doc.label);
                const isUploaded = !!docFile;
                const isVerified = docFile?.status === 'verified';

                return (
                  <div key={doc.key} className="p-5 rounded-2xl border border-slate-150 hover:border-slate-250 dark:border-slate-850 dark:hover:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between h-[160px] shadow-xs">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-xs font-bold text-slate-850 dark:text-slate-100 block leading-tight truncate">{doc.label}</span>
                        {!doc.isStandard && (
                          <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-600 font-bold uppercase shrink-0">Custom</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-405 block mt-0.5 leading-tight truncate">
                        {isUploaded ? `File: ${docFile.name}` : doc.help}
                      </span>
                      
                      <div className="mt-2.5 flex items-center gap-1.5 select-none leading-none">
                        <span className={`h-2 w-2 rounded-full ${isVerified ? "bg-emerald-500 animate-pulse" : isUploaded ? "bg-amber-500" : "bg-slate-300"}`} />
                        <span className={`text-[9.5px] font-bold uppercase tracking-wider ${isVerified ? "text-emerald-600 dark:text-emerald-450" : isUploaded ? "text-amber-550 dark:text-amber-500" : "text-slate-400"}`}>
                          {isVerified ? "Stashed & Verified" : isUploaded ? "Pending HR Stamp" : "Awaiting File Code"}
                        </span>
                      </div>
                    </div>

                    {/* File Controls Actions Row */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-850/50 flex items-center justify-between select-none">
                      {isUploaded ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewDoc({ name: docFile.name, type: docFile.type, data: docFile.data })}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 text-indigo-600 dark:text-sky-400 rounded-lg"
                            title="Preview File"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteDocument(doc.key)}
                            className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg"
                            title="Delete File (Triggers Bin Archive)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">Action Needed</span>
                      )}

                      {/* Manual Upload trigger input */}
                      <div className="flex-shrink-0">
                        <input
                          id={`file-input-${doc.key}`}
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,image/*"
                          onChange={(e) => handleUploadDocument(e, doc.key, doc.label)}
                          className="hidden"
                        />
                        <label
                          htmlFor={`file-input-${doc.key}`}
                          className={`px-3 py-1.5 rounded-lg border font-bold text-[10.5px] flex items-center gap-1 cursor-pointer transition select-none ${
                            uploadProgress === doc.key 
                              ? "bg-slate-100 border-slate-300 animate-spin" 
                              : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <Upload className="w-3 h-3 text-indigo-500" />
                          <span>{isUploaded ? "Replace File" : "Choose File"}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* INTEGRATED EMPLOYEE RECYCLE BIN / TRASH AREA */}
            <div className="mt-12 pt-8 border-t border-dashed border-slate-200 dark:border-slate-800 text-left">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    <Trash className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-150">Employee Personal Recycle Bin</h5>
                    <p className="text-[10px] text-slate-400">Restore accidentally deleted files or delete them permanently.</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-450 font-mono font-bold">
                  {employeeTrash.length} Items Listed
                </span>
              </div>

              {employeeTrash.length === 0 ? (
                <div className="py-8 bg-slate-50/20 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl text-center">
                  <span className="text-xs text-slate-400 italic">Recycle bin is empty. No files require attention.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {employeeTrash.map(item => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-801 dark:text-white block truncate max-w-[200px]">{item.title}</span>
                        <span className="text-[10px] text-slate-450 block font-mono mt-0.5">Deleted: {item.deletedAt}</span>
                      </div>

                      <div className="flex items-center gap-2 select-none">
                        <button
                          onClick={() => handleRestoreFromBin(item)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg border border-emerald-555/20 transition cursor-pointer"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition"
                          title="Wipe Forever"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Personal Leave Balance Metrics */}
        {activeSegment === 'leaves' && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-dashed border-slate-205 dark:border-slate-850 text-left">
              <h4 className="text-sm font-bold text-slate-801 dark:text-slate-200 uppercase tracking-wider">Leave Balance fields</h4>
              <p className="text-xs text-slate-500 dark:text-slate-405 mt-0.5">Your allocated, utilized, and remaining leaves for the FY26 crop year.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              {[
                { label: 'Casual Leave (CL)', max: 8, used: 8 - employee.leaveBalance.casual, rem: employee.leaveBalance.casual, color: 'from-sky-400 to-indigo-550' },
                { label: 'Sick Leave (SL)', max: 10, used: 10 - employee.leaveBalance.sick, rem: employee.leaveBalance.sick, color: 'from-amber-400 to-orange-500' },
                { label: 'Earned / Annual Leave (AL)', max: 15, used: 15 - employee.leaveBalance.annual, rem: employee.leaveBalance.annual, color: 'from-emerald-400 to-teal-500' }
              ].map(leave => {
                const percentage = Math.min(100, (leave.rem / leave.max) * 100);
                return (
                  <div key={leave.label} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white/40 dark:bg-slate-950/20 shadow-2xs space-y-4">
                    <div className="flex justify-between items-baseline font-sans">
                      <h5 className="font-bold text-xs text-slate-805 dark:text-slate-105 leading-snug line-clamp-1">{leave.label}</h5>
                      <span className="text-2xl font-extrabold text-slate-905 dark:text-white">{leave.rem} <span className="text-xs text-slate-400">rem</span></span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-100 dark:bg-slate-850 h-2.5 rounded-full overflow-hidden border border-slate-150 dark:border-slate-805/60 select-none">
                        <div className={`h-full bg-gradient-to-r ${leave.color} rounded-full`} style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-450 font-mono font-semibold">
                        <span>{leave.used} days used</span>
                        <span>{leave.max} total quota</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: Personal Payslips Inbox */}
        {activeSegment === 'payslips' && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-dashed border-slate-205 dark:border-slate-850 text-left">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Roster Payslips Inbox</h4>
              <p className="text-xs text-slate-455 mt-0.5">Your official payroll cards delivered digitally by Guntur HR administrators.</p>
            </div>

            {employeePayslips.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center bg-white dark:bg-slate-950/20">
                <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-pulse" />
                <p className="text-xs text-slate-500 font-semibold">No payslips have been delivered to your portal inbox yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {employeePayslips.map(pay => {
                  const handleDownload = async () => {
                    try {
                      toast("Generating PDF Statement...", "info");
                      await generatePayslipPDF(pay, employee, payslipFormat);
                      toast("✓ Professional PDF Payslip generated automatically and downloaded.", "success");
                    } catch (err) {
                      console.error(err);
                      toast("Error generating PDF. Please contact HR admin.", "error");
                    }
                  };

                  return (
                    <div key={pay.id} className="p-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-500/2 flex flex-col justify-between h-[210px] shadow-sm hover:shadow-xs transition">
                      <div className="space-y-4">
                        <div className="flex justify-between items-baseline font-mono select-none">
                          <span className="text-[10px] text-slate-455 uppercase font-black">Disbursed ID: {pay.id}</span>
                          <span className="text-emerald-600 dark:text-emerald-450 font-black text-xs uppercase">PAID & VERIFIED</span>
                        </div>

                        <div className="flex justify-between items-center text-left">
                          <div>
                            <span className="text-xs text-slate-450 uppercase font-mono block">Roster Cycle Card</span>
                            <span className="text-sm font-black text-slate-805 dark:text-white font-display mt-0.5 block">{pay.monthYear}</span>
                          </div>

                          <div className="text-right">
                            <span className="text-xs text-slate-455 block">Net Salary Payout</span>
                            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-display">₹{pay.netSalary.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-200/40 dark:border-slate-850/60 pt-3 flex items-center justify-between gap-4 text-xs font-semibold">
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5">Issued: {pay.deliveredAt}</span>
                        <button
                          onClick={handleDownload}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-900 border border-slate-220 dark:border-slate-800 text-[10.5px] font-bold rounded-lg text-slate-700 dark:text-slate-300 transition duration-150 cursor-pointer flex items-center gap-1 leading-none select-none"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Get Payslip Receipt</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RENDER INLINE PREVIEW OVERLAY DRAWER */}
      {previewDoc && (
        <DocumentViewer
          name={previewDoc.name}
          type={previewDoc.type}
          data={previewDoc.data}
          onClose={() => setPreviewDoc(null)}
        />
      )}

    </div>
  );
}
