import React, { useState, useEffect, useRef } from 'react';
import { HiOutlinePrinter, HiOutlineX } from 'react-icons/hi';
import api from '../utils/api';
import { useI18n } from '../hooks/useI18n';

export default function QRLabelsPage() {
  const { t } = useI18n();
  const [labels, setLabels] = useState([]);
  const [types, setTypes] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const printRef = useRef(null);

  // Load types once
  useEffect(() => {
    api.get('/hardware-types').then(r => setTypes(r.data));
  }, []);

  // Load QR labels — only when filterType changes, not on every render
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = {};
    if (filterType) params.typeId = filterType;

    api.get('/qr/hardware/bulk', { params })
      .then(r => { if (!cancelled) { setLabels(r.data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [filterType]);

  const printAll = () => {
    window.print();
  };

  const printSingle = (label) => {
    setSelectedLabel(label);
    // Wait for state to render, then print
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=400,height=500');
      printWindow.document.write(`
        <html>
        <head>
          <title>QR Label — ${label.name}</title>
          <style>
            body { font-family: Inter, sans-serif; text-align: center; padding: 20px; margin: 0; }
            img { width: 250px; height: 250px; }
            h2 { margin: 10px 0 4px; font-size: 16px; }
            p { margin: 2px 0; color: #666; font-size: 12px; }
            .serial { font-family: monospace; font-size: 11px; color: #999; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <img src="${label.qrDataUrl}" alt="${label.name}" />
          <h2>${label.name}</h2>
          <p>${label.type}</p>
          ${label.serialNumber ? `<p class="serial">${label.serialNumber}</p>` : ''}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
      setSelectedLabel(null);
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">{t('qr_labels')}</h1>
        <div className="flex gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-dark w-auto text-sm">
            <option value="">All Types</option>
            {types.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
          </select>
          <button onClick={printAll} className="btn-pg-primary flex items-center gap-1">
            <HiOutlinePrinter className="w-4 h-4" /> Print All
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        {labels.length} labels. Click any label to print it individually, or "Print All" for the full grid.
      </p>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-pg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {labels.map(label => (
            <div
              key={label.id}
              onClick={() => printSingle(label)}
              className="glass-card-hover rounded-xl p-3 text-center cursor-pointer group"
            >
              <div className="relative">
                <img src={label.qrDataUrl} alt={label.name} className="w-full aspect-square rounded-lg mb-2" />
                {/* Print overlay on hover */}
                <div className="absolute inset-0 bg-pg-purple/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <HiOutlinePrinter className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium truncate">{label.name}</p>
              <p className="text-[10px] text-gray-500">{label.type}</p>
              {label.serialNumber && <p className="text-[10px] text-gray-600 font-mono">{label.serialNumber}</p>}
            </div>
          ))}
        </div>
      )}

      {!loading && labels.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-gray-500">No hardware items found. Add items first.</p>
        </div>
      )}
    </div>
  );
}
