import React, { useState, useEffect } from 'react';
import {
  Droplets, Search, MapPin, Phone, Building2, Clock, CheckCircle2,
  AlertCircle, RefreshCw, Plus, Minus
} from 'lucide-react';
import { api } from '../services/api';

export default function BloodBankPortal() {
  const [banks, setBanks] = useState([]);
  const [searchGroup, setSearchGroup] = useState('O-');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBloodBanks = async () => {
    try {
      const data = await api.listBloodBanks();
      setBanks(data);
    } catch (e) {
      console.error('Failed to load blood banks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBloodBanks();
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    try {
      // Search near AIIMS coordinates by default
      const res = await api.searchBlood(searchGroup, null, 28.5672, 77.2100);
      setSearchResults(res);
    } catch (err) {
      alert('Search failed: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateUnits = async (inventoryId, newUnits) => {
    try {
      await api.updateInventory(inventoryId, newUnits);
      await fetchBloodBanks();
      if (searchResults) await handleSearch();
    } catch (err) {
      alert('Failed to update inventory: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center font-bold">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Blood Bank & Transfusion Logistics
              <span className="text-xs bg-slate-800 text-red-400 px-2 py-0.5 rounded-full font-mono">
                SIH Mock Network
              </span>
            </h1>
            <p className="text-xs text-slate-400">Emergency ABO Stock Registry & Proximity Cross-Match Dispatch</p>
          </div>
        </div>
      </div>

      {/* Emergency Blood Search Bar (Section 11) */}
      <div className="bg-slate-900/90 border border-red-500/40 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-red-400" />
            Emergency Blood Availability Search
          </h2>
          <span className="text-xs text-slate-400">Query real-time verified reserves</span>
        </div>

        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Target Blood Group</label>
            <select
              value={searchGroup}
              onChange={(e) => setSearchGroup(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-red-500"
            >
              <option value="O-">O- (Universal Donor)</option>
              <option value="O+">O+</option>
              <option value="A-">A-</option>
              <option value="A+">A+</option>
              <option value="B-">B-</option>
              <option value="B+">B+</option>
              <option value="AB-">AB-</option>
              <option value="AB+">AB+ (Universal Recipient)</option>
            </select>
          </div>

          <div className="pt-5">
            <button
              type="submit"
              disabled={isSearching}
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-xl transition shadow shadow-red-600/30 text-xs md:text-sm flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              {isSearching ? 'SEARCHING NETWORK...' : `FIND ${searchGroup} BLOOD`}
            </button>
          </div>
        </form>

        {/* Search Results Display */}
        {searchResults && (
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-300">
              Found {searchResults.total_results} verified facilities with <strong>{searchResults.requested_group}</strong>:
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.results.map((res, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-sm">{res.bank_name}</strong>
                    <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 font-extrabold font-mono text-sm">
                      {res.units_available} Units
                    </span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {res.distance_km ? `${res.distance_km} km away • ` : ''}{res.address}
                  </div>
                  <div className="text-slate-300 font-mono">
                    Direct Hotline: <a href={`tel:${res.contact_phone}`} className="text-rose-400">{res.contact_phone}</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Complete Blood Bank Directory & ABO Inventory Grids */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white">Monitored Blood Bank Facilities ({banks.length})</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {banks.map((b) => (
            <div
              key={b.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-base">{b.name}</h4>
                  <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {b.address}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-mono">Contact</span>
                  <span className="text-xs font-mono text-rose-400 font-semibold">{b.contact_phone}</span>
                </div>
              </div>

              {/* 8-Group Grid (Section 11) */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {b.inventory.map((inv) => (
                  <div
                    key={inv.id || inv.blood_group}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 font-mono block">{inv.blood_group}</span>
                    <span className="text-base font-extrabold text-white block">{inv.units_available}</span>
                    <div className="flex justify-center gap-1 pt-1">
                      <button
                        onClick={() => handleUpdateUnits(inv.id, Math.max(0, inv.units_available - 1))}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer text-xs"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleUpdateUnits(inv.id, inv.units_available + 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
