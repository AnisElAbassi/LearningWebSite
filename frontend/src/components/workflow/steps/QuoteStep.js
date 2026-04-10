import React, { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { useI18n } from '../../../hooks/useI18n';
import FormLabel from '../../shared/FormLabel';

export default function QuoteStep({ event, onRefresh }) {
  const { formatMoney } = useI18n();
  const [clients, setClients] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [clientId, setClientId] = useState(event.clientId || '');
  const [experienceId, setExperienceId] = useState(event.experienceId || '');
  const [price, setPrice] = useState(event.price || '');
  const [discount, setDiscount] = useState(event.discount || 0);
  const [notes, setNotes] = useState(event.notes || '');
  const [lineItems, setLineItems] = useState(event.lineItems || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.allSettled([api.get('/clients'), api.get('/experiences')]).then(([cRes, eRes]) => {
      if (cRes.status === 'fulfilled') setClients(cRes.value.data?.clients || cRes.value.data || []);
      if (eRes.status === 'fulfilled') setExperiences(eRes.value.data || []);
    });
  }, []);

  const addLine = () => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const updateLine = (i, field, value) => {
    const items = [...lineItems];
    items[i] = { ...items[i], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') items[i].total = (items[i].quantity || 0) * (items[i].unitPrice || 0);
    setLineItems(items);
  };
  const removeLine = (i) => setLineItems(lineItems.filter((_, idx) => idx !== i));

  const lineTotal = lineItems.reduce((sum, l) => sum + (l.total || 0), 0);
  const effectivePrice = price || lineTotal;

  const save = async () => {
    setSaving(true);
    try {
      // Save event fields
      await api.put(`/events/${event.id}`, {
        clientId: clientId ? parseInt(clientId) : undefined,
        experienceId: experienceId ? parseInt(experienceId) : undefined,
        price: parseFloat(effectivePrice) || null,
        discount: parseFloat(discount) || 0,
        notes: notes || null,
      });

      // Save line items — delete existing and recreate
      if (lineItems.length > 0) {
        // The PUT /events/:id doesn't handle lineItems yet, so we use a direct approach
        await api.put(`/events/${event.id}`, {
          lineItems: lineItems.filter(l => l.description).map(l => ({
            description: l.description, quantity: l.quantity || 1, unitPrice: l.unitPrice || 0, total: (l.quantity || 1) * (l.unitPrice || 0)
          }))
        });
      }

      toast.success('Quote saved');
      onRefresh();
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-inter font-bold text-lg">Create Quote</h3>
      <p className="text-sm text-gray-400">Select the client, experience, and set your pricing.</p>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel required hint="The company you're organizing this event for. Add clients in Setup → Clients.">Client</FormLabel>
            <select className="input-dark" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <FormLabel required hint="The VR experience to run. Add experiences in Setup → Experiences.">Experience</FormLabel>
            <select className="input-dark" value={experienceId} onChange={e => setExperienceId(e.target.value)}>
              <option value="">Select experience...</option>
              {experiences.filter(e => e.status === 'active').map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.minPlayers}-{e.maxPlayers} players, {e.durationMin}min)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <FormLabel hint="Break down the quote into items (e.g. VR session, setup fee, extra hour). Optional if you set a total price below.">Line Items</FormLabel>
            <button type="button" onClick={addLine} className="btn-pg-outline text-xs flex items-center gap-1">
              <HiOutlinePlus className="w-3 h-3" /> Add Item
            </button>
          </div>
          {lineItems.map((item, i) => (
            <div key={i} className="flex gap-2 items-center mb-2">
              <input className="input-dark flex-1 text-sm" placeholder="Description" value={item.description} onChange={e => updateLine(i, 'description', e.target.value)} />
              <input type="number" className="input-dark w-16 text-sm" placeholder="Qty" value={item.quantity} onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 0)} min={1} />
              <input type="number" className="input-dark w-24 text-sm" placeholder="Price" value={item.unitPrice} onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} step="0.01" />
              <span className="text-sm text-pg-purple font-mono w-20 text-right">{formatMoney(item.total || 0)}</span>
              <button onClick={() => removeLine(i)} className="text-gray-500 hover:text-neon-red"><HiOutlineTrash className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        {/* Price summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-pg-border">
          <div>
            <FormLabel hint="The total amount to charge the client. Auto-calculated from line items if left empty.">Total Price (€)</FormLabel>
            <input type="number" className="input-dark" value={price} onChange={e => setPrice(e.target.value)} step="0.01" placeholder={lineTotal > 0 ? `Auto: ${lineTotal}` : '0.00'} />
          </div>
          <div>
            <FormLabel hint="Fixed discount amount subtracted from the total price.">Discount (€)</FormLabel>
            <input type="number" className="input-dark" value={discount} onChange={e => setDiscount(e.target.value)} step="0.01" />
          </div>
          <div className="flex items-end">
            <div>
              <p className="text-xs text-gray-500">Net Amount</p>
              <p className="text-xl font-inter font-bold text-pg-purple">{formatMoney((effectivePrice || 0) - (discount || 0))}</p>
            </div>
          </div>
        </div>

        <div>
          <FormLabel hint="Internal notes — not visible to the client.">Notes</FormLabel>
          <textarea className="input-dark" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this event..." />
        </div>

        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="btn-pg-primary text-sm">{saving ? 'Saving...' : 'Save Quote'}</button>
        </div>
      </div>
    </div>
  );
}
