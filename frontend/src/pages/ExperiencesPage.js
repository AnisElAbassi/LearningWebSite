import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineClock, HiOutlineUserGroup, HiOutlineTag, HiOutlineTrash } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';

const difficultyLabels = ['', 'Beginner', 'Easy', 'Medium', 'Hard', 'Expert'];
const statusColors = { active: '#10b981', maintenance: '#f59e0b', retired: '#6b7280' };

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editExp, setEditExp] = useState(null);
  const [filter, setFilter] = useState('');
  const [hardwareTypes, setHardwareTypes] = useState([]);

  const fetch = async () => {
    setLoading(true);
    const [expRes, tagRes, hwRes] = await Promise.all([
      api.get('/experiences', { params: { status: filter || undefined } }),
      api.get('/experiences/tags/all'),
      api.get('/hardware-types')
    ]);
    setExperiences(expRes.data);
    setTags(tagRes.data);
    setHardwareTypes(hwRes.data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Experience Library</h1>
        <button onClick={() => { setEditExp(null); setShowModal(true); }} className="btn-pg-primary flex items-center gap-2 text-sm">
          <HiOutlinePlus className="w-4 h-4" /> New Experience
        </button>
      </div>

      <div className="flex gap-2">
        {['', 'active', 'maintenance', 'retired'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? 'btn-pg-primary' : 'btn-pg-outline'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {experiences.map((exp, i) => (
          <motion.div key={exp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card-hover rounded-xl overflow-hidden cursor-pointer"
            onClick={() => { setEditExp(exp); setShowModal(true); }}>
            <div className="h-2" style={{ background: `linear-gradient(90deg, #a855f7, #fbbf24)` }} />
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-inter font-bold text-lg text-white">{exp.name}</h3>
                  <StatusBadge status={exp.status} color={statusColors[exp.status]} />
                </div>
                <div className="flex gap-1">
                  <HiOutlinePencil className="w-4 h-4 text-gray-500 hover:text-pg-purple" />
                  <button onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm(`Delete experience "${exp.name}"?`)) return;
                    try { await api.delete(`/experiences/${exp.id}`); toast.success('Experience deleted'); fetch(); }
                    catch { toast.error('Failed — experience may have linked events'); }
                  }}><HiOutlineTrash className="w-4 h-4 text-gray-500 hover:text-neon-red" /></button>
                </div>
              </div>
              {exp.description && <p className="text-sm text-gray-400 mt-2 line-clamp-2">{exp.description}</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {exp.tags?.map(t => (
                  <span key={t.tag.id} className="text-[10px] px-2 py-0.5 bg-pg-purple/10 text-pg-purple rounded-full border border-pg-purple/20">
                    {t.tag.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-pg-border/50 text-xs text-gray-400">
                <span className="flex items-center gap-1"><HiOutlineUserGroup className="w-3 h-3" /> {exp.minPlayers}-{exp.maxPlayers}</span>
                <span className="flex items-center gap-1"><HiOutlineClock className="w-3 h-3" /> {exp.durationMin}min</span>
                <span>{difficultyLabels[exp.difficulty]}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {loading && <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-pg-card rounded-xl animate-pulse" />)}</div>}

      <ExperienceModal show={showModal} onClose={() => setShowModal(false)} experience={editExp} tags={tags} hardwareTypes={hardwareTypes} onSaved={fetch} />
    </div>
  );
}

function ExperienceModal({ show, onClose, experience, tags, hardwareTypes, onSaved }) {
  const [form, setForm] = useState({ name: '', description: '', minPlayers: 1, maxPlayers: 10, durationMin: 30, difficulty: 1, status: 'active', bufferTimeMin: 15 });
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (experience) {
      setForm({ name: experience.name, description: experience.description || '', minPlayers: experience.minPlayers, maxPlayers: experience.maxPlayers, durationMin: experience.durationMin, difficulty: experience.difficulty, status: experience.status, bufferTimeMin: experience.bufferTimeMin });
      setSelectedTags(experience.tags?.map(t => t.tag.id) || []);
    } else {
      setForm({ name: '', description: '', minPlayers: 1, maxPlayers: 10, durationMin: 30, difficulty: 1, status: 'active', bufferTimeMin: 15 });
      setSelectedTags([]);
    }
  }, [experience, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, tags: selectedTags };
      if (experience) {
        await api.put(`/experiences/${experience.id}`, payload);
        toast.success('Experience updated');
      } else {
        await api.post('/experiences', payload);
        toast.success('Experience created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    try {
      const { data } = await api.post('/experiences/tags', { name: newTag.trim() });
      setSelectedTags([...selectedTags, data.id]);
      setNewTag('');
      onSaved();
    } catch (err) {
      toast.error('Tag exists or error');
    }
  };

  const toggleTag = (id) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={experience ? 'Edit Experience' : 'New Experience'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label-text">Name *</label>
            <input className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="col-span-2">
            <label className="label-text">Description</label>
            <textarea className="input-dark" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label-text">Min Players</label>
            <input type="number" className="input-dark" value={form.minPlayers} onChange={e => setForm({ ...form, minPlayers: parseInt(e.target.value) })} min={1} />
          </div>
          <div>
            <label className="label-text">Max Players</label>
            <input type="number" className="input-dark" value={form.maxPlayers} onChange={e => setForm({ ...form, maxPlayers: parseInt(e.target.value) })} min={1} />
          </div>
          <div>
            <label className="label-text">Duration (min)</label>
            <input type="number" className="input-dark" value={form.durationMin} onChange={e => setForm({ ...form, durationMin: parseInt(e.target.value) })} min={5} />
          </div>
          <div>
            <label className="label-text">Buffer Time (min)</label>
            <input type="number" className="input-dark" value={form.bufferTimeMin} onChange={e => setForm({ ...form, bufferTimeMin: parseInt(e.target.value) })} min={0} />
          </div>
          <div>
            <label className="label-text">Difficulty (1-5)</label>
            <input type="range" min={1} max={5} value={form.difficulty} onChange={e => setForm({ ...form, difficulty: parseInt(e.target.value) })}
              className="w-full accent-pg-purple" />
            <span className="text-xs text-gray-400">{difficultyLabels[form.difficulty]}</span>
          </div>
          <div>
            <label className="label-text">Status</label>
            <select className="input-dark" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label-text flex items-center gap-1"><HiOutlineTag className="w-3 h-3" /> Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map(tag => (
              <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${selectedTags.includes(tag.id) ? 'bg-pg-purple/20 border-pg-purple text-pg-purple' : 'border-pg-border text-gray-500 hover:border-gray-400'}`}>
                {tag.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-dark text-sm" placeholder="New tag..." value={newTag} onChange={e => setNewTag(e.target.value)} />
            <button type="button" onClick={addTag} className="btn-pg-outline text-xs px-3">Add</button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">Cancel</button>
          <button type="submit" className="btn-pg-primary text-sm">{experience ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
