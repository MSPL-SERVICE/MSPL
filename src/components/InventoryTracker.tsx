/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { Package, AlertTriangle, Plus, Search, Trash2 } from 'lucide-react';

interface InventoryTrackerProps {
  items: InventoryItem[];
  onUpdateItems: (newItems: InventoryItem[]) => void;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', name: '40m lattice tower angle irons (high tensile)', sku: 'MSPL-ST-TWR-801', category: 'Steel Structures', stockLevel: 45, minThreshold: 15, unit: 'tonnes', warehouse: 'Warehouse Guntur', lastUpdated: '05/20/2026' },
  { id: 'inv-2', name: 'Armored direct-burial OFC cable (96-core)', sku: 'MSPL-FB-96C-521', category: 'Optical Fiber', stockLevel: 8, minThreshold: 10, unit: 'kilometers', warehouse: 'Warehouse Vijayawada', lastUpdated: '05/22/2026' },
  { id: 'inv-3', name: 'Alcatel microwave receiver dish (1.2m)', sku: 'MSPL-RF-REC-325', category: 'Telecom Antennas', stockLevel: 3, minThreshold: 5, unit: 'units', warehouse: 'Warehouse Guntur', lastUpdated: '05/18/2026' },
  { id: 'inv-4', name: 'LiFePO4 high-cycle backup backup batteries (48V)', sku: 'MSPL-PW-BAT-411', category: 'SMPS Power Plant', stockLevel: 25, minThreshold: 8, unit: 'packs', warehouse: 'Warehouse Kurnool', lastUpdated: '05/23/2026' },
  { id: 'inv-5', name: 'Anchor foundation bolts (heavy high altitude weight)', sku: 'MSPL-ST-ANC-902', category: 'Civil Foundation', stockLevel: 120, minThreshold: 50, unit: 'pieces', warehouse: 'Warehouse Guntur', lastUpdated: '05/19/2026' }
];

export default function InventoryTracker({ items, onUpdateItems, toast }: InventoryTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCat, setNewCat] = useState('Steel Structures');
  const [newLevel, setNewLevel] = useState(1);
  const [newMin, setNewMin] = useState(1);
  const [newUnit, setNewUnit] = useState('units');
  const [newWarehouse, setNewWarehouse] = useState('Warehouse Guntur');

  const categories = ['All', 'Steel Structures', 'Optical Fiber', 'Telecom Antennas', 'SMPS Power Plant', 'Civil Foundation', 'Electrical/Other'];

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSku.trim()) {
      toast('Item Name and SKU are required.', 'error');
      return;
    }

    if (items.some(item => item.sku.toUpperCase() === newSku.toUpperCase())) {
      toast(`SKU Warning: ${newSku} is already linked to another inventory asset.`, 'error');
      return;
    }

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: newName.trim(),
      sku: newSku.toUpperCase().trim(),
      category: newCat,
      stockLevel: Math.max(0, newLevel),
      minThreshold: Math.max(0, newMin),
      unit: newUnit,
      warehouse: newWarehouse,
      lastUpdated: new Date().toLocaleDateString('en-US')
    };

    const updated = [...items, newItem];
    onUpdateItems(updated);
    toast(`✓ Inventory Item "${newItem.name}" added to stock ledger.`, 'success');
    
    // Reset form
    setNewName('');
    setNewSku('');
    setNewLevel(1);
    setNewMin(1);
    setShowAddForm(false);
  };

  const handleUpdateStock = (itemId: string, increment: boolean, changeAmount = 1) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        const newLevel = increment ? item.stockLevel + changeAmount : Math.max(0, item.stockLevel - changeAmount);
        
        // Low stock threshold check
        if (!increment && newLevel <= item.minThreshold && item.stockLevel > item.minThreshold) {
          toast(`🚨 Alert: "${item.name}" stock is critically low. Restock required!`, 'warning');
        }

        return {
          ...item,
          stockLevel: newLevel,
          lastUpdated: new Date().toLocaleDateString('en-US')
        };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  const handleDeleteItem = (itemId: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}" from stock records?`)) {
      const filtered = items.filter(item => item.id !== itemId);
      onUpdateItems(filtered);
      toast(`Removed "${name}" from stock records.`, 'info');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.warehouse.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Control Actions Row (Toolbar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
        <div className="space-y-1 text-left">
          <h4 className="text-sm font-bold text-slate-805 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-505 text-indigo-500" />
            <span>Real-time Warehouse Inventory Ledger</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-405">
            Optimize supply chains, prevent depletion during high-altitude tower rigging, and log stocks.
          </p>
        </div>
        
        {/* Buttons for adding items */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stock Item</span>
          </button>
        </div>
      </div>

      {/* Add New Stock Item Form Panel */}
      {showAddForm && (
        <form onSubmit={handleCreateItem} className="p-6 rounded-2xl bg-indigo-50/20 dark:bg-slate-950/20 border border-indigo-200/20 dark:border-slate-800 space-y-4 max-w-3xl mx-auto text-left">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800/60">
            <h5 className="text-xs font-black uppercase text-indigo-750 dark:text-sky-400 tracking-wider">
              Register New Structural Component
            </h5>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-xs text-slate-400 hover:text-slate-650 cursor-pointer">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500">Component/Resource Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ericsson RRH weather-sealed unit"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-850 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500">Inventory SKU *</label>
              <input
                type="text"
                required
                placeholder="e.g. MSPL-RF-RRH-90"
                value={newSku}
                onChange={e => setNewSku(e.target.value)}
                className="w-full bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-bold uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500">Category</label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2"
              >
                {categories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-1">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500">Initial Stock on Hand</label>
              <input
                type="number"
                min="0"
                value={newLevel}
                onChange={e => setNewLevel(parseInt(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-909 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500">Alarms Threshold Limit</label>
              <input
                type="number"
                min="0"
                value={newMin}
                onChange={e => setNewMin(parseInt(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-909 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500">Counting Unit</label>
              <select
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2"
              >
                <option value="units">Pieces/Units</option>
                <option value="tonnes">Tonnes (Steel)</option>
                <option value="kilometers">Kilometers (Fiber)</option>
                <option value="packs">Battery Packs</option>
                <option value="drums">Utility Drums</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500">Dock Warehouse Depot</label>
              <select
                value={newWarehouse}
                onChange={e => setNewWarehouse(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2"
              >
                <option value="Warehouse Guntur">Warehouse Guntur (HQ)</option>
                <option value="Warehouse Vijayawada">Warehouse Vijayawada</option>
                <option value="Warehouse Kurnool">Warehouse Kurnool (Solar Hub)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 text-xs select-none">
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
              Add Material Record
            </button>
          </div>
        </form>
      )}

      {/* Filter and search parameters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search SKU code, component name, or depot warehouse..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/60 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl pl-9 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
        </div>

        <div className="relative select-none shrink-0">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-white/60 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 text-xs rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none pr-8 cursor-pointer"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
        </div>
      </div>

      {/* Inventory Listings Table */}
      {filteredItems.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center bg-white dark:bg-slate-950/20">
          <Package className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-pulse" />
          <p className="text-xs text-slate-500 font-semibold">No materials match the search filter query.</p>
        </div>
      ) : (
        <div className="border border-slate-200/50 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white/70 dark:bg-slate-950/20 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-450 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Component & SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock Depot Location</th>
                  <th className="py-3 px-4">Current Stock levels</th>
                  <th className="py-3 px-4">Alarms Threshold</th>
                  <th className="py-3 px-4 text-right">Ledger Adjustments (Touch targets &gt;= 44px)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-850/50">
                {filteredItems.map(item => {
                  const isLow = item.stockLevel <= item.minThreshold;
                  return (
                    <tr key={item.id} className="hover:bg-slate-100/20 dark:hover:bg-slate-850/10">
                      <td className="py-3.5 px-4 font-sans max-w-xs">
                        <div className="font-bold text-slate-805 dark:text-slate-105 leading-snug line-clamp-1">{item.name}</div>
                        <div className="font-mono text-[10px] text-slate-450 dark:text-indigo-400 font-black tracking-wide mt-1 select-all">{item.sku}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-220 dark:border-slate-800 text-slate-550 dark:text-slate-400">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{item.warehouse}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">Updated: {item.lastUpdated}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-black ${
                          isLow 
                            ? "text-red-500 bg-red-500/10 px-2 py-0.5 rounded" 
                            : "text-slate-800 dark:text-slate-100"
                        }`}>
                          {item.stockLevel} {item.unit}
                          {isLow && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-450 font-bold">
                        {item.minThreshold} {item.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Restocking button with easy touch frame */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(item.id, false)}
                            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-1 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg active:scale-95 duration-100 cursor-pointer"
                            title="Deduct 1 Item unit"
                          >
                            <span className="text-sm font-black">-</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(item.id, true)}
                            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-1 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 border border-indigo-200/40 dark:border-slate-800 text-indigo-650 dark:text-sky-400 rounded-lg active:scale-95 duration-100 cursor-pointer"
                            title="Restock 1 Item unit"
                          >
                            <span className="text-sm font-black">+</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-3 text-slate-405 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 duration-150 cursor-pointer"
                            title="Delete Stock Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
export { INITIAL_INVENTORY };
