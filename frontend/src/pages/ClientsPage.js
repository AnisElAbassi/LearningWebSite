import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineMail, HiOutlinePhone, HiOutlineTrash } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [customFields, setCustomFields] = useState([]);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await api.get('/clients', { params: { search: search || undefined } });
    setClients(data.clients || []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [search]);
  useEffect(() => {
    api.get('/clients/custom-fields/all').then(r => setCustomFields(r.data)).catch(() => {});
  }, []);

  const openCreate = () => { setEditClient(null); setShowModal(true); };
  const openEdit = (client) => { setEditClient(client); setShowModal(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Clients</h1>
        <button onClick={openCreate} className="btn-pg-primary flex items-center gap-2 text-sm">
          <HiOutlinePlus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <div className="relative max-w-md">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
          className="input-dark pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client, i) => (
          <motion.div key={client.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/clients/${client.id}`} className="glass-card-hover rounded-xl p-5 block">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-inter font-bold text-lg text-white">{client.companyName}</h3>
                  <p className="text-sm text-gray-400">{client.contactName}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pg-purple to-pg-purple flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-pg-black text-sm">{client.companyName[0]}</span>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {client.email && <p className="text-xs text-gray-400 flex items-center gap-1.5"><HiOutlineMail className="w-3 h-3" />{client.email}</p>}
                {client.phone && <p className="text-xs text-gray-400 flex items-center gap-1.5"><HiOutlinePhone className="w-3 h-3" />{client.phone}</p>}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-pg-border/50">
                <span className="text-[10px] text-gray-500">{client.events?.length || 0} events</span>
                <span className="text-[10px] text-gray-500">{client.deals?.length || 0} deals</span>
                {client.industry && <span className="text-[10px] px-2 py-0.5 bg-pg-purple/10 text-pg-purple rounded-full">{client.industry}</span>}
                <button onClick={async (e) => {
                  e.preventDefault(); e.stopPropagation();
                  if (!window.confirm(`Delete client "${client.companyName}"?`)) return;
                  try { await api.delete(`/clients/${client.id}`); toast.success('Client deleted'); fetchClients(); }
                  catch { toast.error('Failed — client may have linked events or deals'); }
                }} className="ml-auto text-gray-600 hover:text-neon-red transition-colors" title="Delete client">
                  <HiOutlineTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {loading && <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-pg-card rounded-xl animate-pulse" />)}</div>}

      <ClientModal show={showModal} onClose={() => setShowModal(false)} client={editClient} customFields={customFields} onSaved={fetchClients} />
    </div>
  );
}

function ClientModal({ show, onClose, client, customFields, onSaved }) {
  const [form, setForm] = useState({ companyName: '', contactName: '', email: '', phone: '', industry: '', billingAddress: '', notes: '' });

  useEffect(() => {
    if (client) setForm({ companyName: client.companyName, contactName: client.contactName, email: client.email, phone: client.phone || '', industry: client.industry || '', billingAddress: client.billingAddress || '', notes: client.notes || '' });
    else setForm({ companyName: '', contactName: '', email: '', phone: '', industry: '', billingAddress: '', notes: '' });
  }, [client, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (client) {
        await api.put(`/clients/${client.id}`, form);
        toast.success('Client updated');
      } else {
        await api.post('/clients', form);
        toast.success('Client created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={client ? 'Edit Client' : 'New Client'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Company Name *</label>
            <input className="input-dark" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} required />
          </div>
          <div>
            <label className="label-text">Contact Name *</label>
            <input className="input-dark" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} required />
          </div>
          <div>
            <label className="label-text">Email *</label>
            <input type="email" className="input-dark" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label-text">Phone</label>
            <input className="input-dark" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label-text">Industry</label>
            <input className="input-dark" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} />
          </div>
          <div>
            <label className="label-text">Billing Address</label>
            <input className="input-dark" value={form.billingAddress} onChange={e => setForm({ ...form, billingAddress: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label-text">Notes</label>
          <textarea className="input-dark" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">Cancel</button>
          <button type="submit" className="btn-pg-primary text-sm">{client ? 'Update' : 'Create'} Client</button>
        </div>
      </form>
    </Modal>
  );
}
