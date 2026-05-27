/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShiftAssignment, Employee } from '../types';
import { Calendar, UserPlus, Clock, Check, MoreVertical, Layers, RefreshCw, ClipboardList } from 'lucide-react';

interface ShiftSchedulerProps {
  shifts: ShiftAssignment[];
  employees: Employee[];
  onUpdateShifts: (newShifts: ShiftAssignment[]) => void;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const INITIAL_SHIFTS: ShiftAssignment[] = [
  { id: 'sh-1', employeeId: 'MSPL-EMP-101', employeeName: 'Ajay Kumar', date: '2026-05-23', shiftType: 'Morning', timing: '06:00 AM - 02:00 PM', status: 'completed' },
  { id: 'sh-2', employeeId: 'MSPL-EMP-102', employeeName: 'Ramesh Shinde', date: '2026-05-23', shiftType: 'Evening', timing: '02:00 PM - 10:00 PM', status: 'inprogress' },
  { id: 'sh-3', employeeId: 'MSPL-EMP-150', employeeName: 'Suman Reddy', date: '2026-05-23', shiftType: 'Night', timing: '10:00 PM - 06:00 AM', status: 'scheduled' },
  { id: 'sh-4', employeeId: 'MSPL-EMP-101', employeeName: 'Ajay Kumar', date: '2026-05-24', shiftType: 'Evening', timing: '02:00 PM - 10:00 PM', status: 'scheduled' }
];

export default function ShiftScheduler({ shifts, employees, onUpdateShifts, toast }: ShiftSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [showAddForm, setShowAddForm] = useState(false);

  // New shift form state
  const [empId, setEmpId] = useState('');
  const [shiftType, setShiftType] = useState<'Morning' | 'Evening' | 'Night'>('Morning');
  const [assignDate, setAssignDate] = useState(new Date().toISOString().substring(0, 10));

  const shiftTimings = {
    Morning: '06:00 AM - 02:00 PM',
    Evening: '02:00 PM - 10:00 PM',
    Night: '10:00 PM - 06:00 AM'
  };

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId) {
      toast('Please select an employee to allocate their shift.', 'error');
      return;
    }

    const targetEmployee = employees.find(emp => emp.id === empId);
    if (!targetEmployee) {
      toast('Invalid Employee selection.', 'error');
      return;
    }

    const newShift: ShiftAssignment = {
      id: `sh-${Date.now()}`,
      employeeId: targetEmployee.id,
      employeeName: targetEmployee.name,
      date: assignDate,
      shiftType: shiftType,
      timing: shiftTimings[shiftType],
      status: 'scheduled'
    };

    onUpdateShifts([...shifts, newShift]);
    toast(`✓ Scheduled ${targetEmployee.name} for ${shiftType} shift on ${assignDate}.`, 'success');
    setShowAddForm(false);
  };

  const handleUpdateStatus = (shiftId: string, nextStatus: 'scheduled' | 'inprogress' | 'completed') => {
    const updated = shifts.map(sh => {
      if (sh.id === shiftId) {
        return { ...sh, status: nextStatus };
      }
      return sh;
    });
    onUpdateShifts(updated);
    toast(`Shift status updated to "${nextStatus}" successfully.`, 'info');
  };

  const handleDeleteShift = (shiftId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove this shift roster slot for "${name}"?`)) {
      const filtered = shifts.filter(sh => sh.id !== shiftId);
      onUpdateShifts(filtered);
      toast(`Removed shift roster slot.`, 'info');
    }
  };

  // Group shifts by shiftType for selected day
  const dailyShifts = shifts.filter(sh => sh.date === selectedDate);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'inprogress': return 'bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse';
      default: return 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20';
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Shift Scheduler Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
        <div className="space-y-1 text-left">
          <h4 className="text-sm font-bold text-slate-805 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-500" />
            <span>Active Employee Shift Schedules</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-405">
            Synchronize operational crews, allocate shift times, and manage labor resources.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end select-none">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
          />
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Allocate Shift Slot</span>
          </button>
        </div>
      </div>

      {/* Add New Shift Slot Panel */}
      {showAddForm && (
        <form onSubmit={handleCreateShift} className="p-6 rounded-2xl bg-indigo-50/20 dark:bg-slate-950/20 border border-indigo-200/20 dark:border-slate-800 space-y-4 max-w-2xl mx-auto text-left">
          <div className="flex items-center justify-between pb-2 border-b border-slate-110 dark:border-slate-800">
            <h5 className="text-xs font-black uppercase text-indigo-755 dark:text-sky-400 tracking-wider">
              Allocate Shift Roster Slot
            </h5>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-xs text-slate-400 hover:text-slate-650 cursor-pointer">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500">Employee Card ID *</label>
              <select
                required
                value={empId}
                onChange={e => setEmpId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2"
              >
                <option value="">-- Choose Employee --</option>
                {employees.filter(emp => emp.status === 'approved').map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500"> Roster Date</label>
              <input
                type="date"
                required
                value={assignDate}
                onChange={e => setAssignDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-909 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 font-bold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500">Shift Option & Period</label>
              <select
                value={shiftType}
                onChange={e => setShiftType(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2"
              >
                <option value="Morning">Morning ({shiftTimings.Morning})</option>
                <option value="Evening">Evening ({shiftTimings.Evening})</option>
                <option value="Night">Night ({shiftTimings.Night})</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 text-xs select-none pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg font-bold"
            >
              Issue Roster Slot
            </button>
          </div>
        </form>
      )}

      {/* Roster visual grid cards divided by shift slot options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['Morning', 'Evening', 'Night'] as const).map(type => {
          const typeShifts = dailyShifts.filter(sh => sh.shiftType === type);
          return (
            <div key={type} className="flex flex-col rounded-2xl border border-slate-205 dark:border-slate-850 bg-white/70 dark:bg-slate-900/10 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850/60 pb-3">
                <div className="space-y-0.5 text-left">
                  <div className="text-xs font-black uppercase text-indigo-650 dark:text-sky-400 tracking-wider font-mono">{type} SHIFT</div>
                  <div className="text-[10px] text-slate-400 font-medium">{shiftTimings[type]}</div>
                </div>
                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-900 rounded-full text-[10px] font-mono font-bold text-slate-500">
                  {typeShifts.length} allocated
                </span>
              </div>

              {typeShifts.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center bg-slate-50/20 dark:bg-slate-950/20 text-[11px] text-slate-400">
                  No shifts scheduled for this slot.
                </div>
              ) : (
                <div className="space-y-3">
                  {typeShifts.map(sh => (
                    <div key={sh.id} className="p-4 rounded-xl border border-slate-110 dark:border-slate-850 bg-white dark:bg-slate-950 text-left space-y-3 hover:shadow-xs transition duration-150">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-850 dark:text-white block tracking-wide">{sh.employeeName}</span>
                          <span className="text-[10.5px] text-slate-450 block font-mono font-bold uppercase">{sh.employeeId}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteShift(sh.id, sh.employeeName)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                          title="Remove shift slot"
                        >
                          <span className="text-xs">✕</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2- inline-flex w-full">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${getStatusColor(sh.status)}`}>
                          {sh.status}
                        </span>

                        <div className="flex gap-1">
                          {sh.status !== 'inprogress' && sh.status !== 'completed' && (
                            <button
                              onClick={() => handleUpdateStatus(sh.id, 'inprogress')}
                              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-bold text-[9px] rounded-lg cursor-pointer"
                            >
                              Activate
                            </button>
                          )}
                          {sh.status !== 'completed' && (
                            <button
                              onClick={() => handleUpdateStatus(sh.id, 'completed')}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold text-[9px] rounded-lg cursor-pointer inline-flex items-center gap-0.5"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>Done</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export { INITIAL_SHIFTS };
