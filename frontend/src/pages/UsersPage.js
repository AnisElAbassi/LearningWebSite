import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineShieldCheck, HiOutlinePencil } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/layout/Modal';
import StatusBadge from '../components/layout/StatusBadge';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [tab, setTab] = useState('users');

  const fetchAll = async () => {
    const [uRes, rRes, pRes] = await Promise.all([api.get('/users'), api.get('/roles'), api.get('/roles/permissions')]);
    setUsers(uRes.data);
    setRoles(rRes.data);
    setPermissions(pRes.data);
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-inter font-bold text-2xl pg-text-gradient">Users & Roles</h1>
        <div className="flex gap-2">
          {tab === 'roles' && (
            <button onClick={() => { setEditRole(null); setShowRoleModal(true); }} className="btn-pg-outline flex items-center gap-2 text-sm">
              <HiOutlinePlus className="w-4 h-4" /> New Role
            </button>
          )}
          <button onClick={() => { setEditUser(null); setShowUserModal(true); }} className="btn-pg-primary flex items-center gap-2 text-sm">
            <HiOutlinePlus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-pg-border">
        <button onClick={() => setTab('users')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === 'users' ? 'border-pg-purple text-pg-purple' : 'border-transparent text-gray-500 hover:text-white'}`}>Users</button>
        <button onClick={() => setTab('roles')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === 'roles' ? 'border-pg-purple text-pg-purple' : 'border-transparent text-gray-500 hover:text-white'}`}>Roles & Permissions</button>
      </div>

      {tab === 'users' ? (
        <div className="glass-card rounded-xl overflow-x-auto">
          <table className="table-dark">
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Hourly Rate</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pg-purple to-pg-yellow flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{user.name?.[0]}</span>
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="text-gray-400">{user.email}</td>
                  <td><StatusBadge status={user.role?.name || 'unknown'} color="#7b2ff7" /></td>
                  <td><StatusBadge status={user.isActive ? 'active' : 'inactive'} color={user.isActive ? '#10b981' : '#ef4444'} /></td>
                  <td className="text-pg-purple">{user.staffRates?.[0] ? `€${user.staffRates[0].hourlyRate}/h` : '—'}</td>
                  <td>
                    <button onClick={() => { setEditUser(user); setShowUserModal(true); }} className="text-gray-400 hover:text-pg-purple">
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map(role => (
            <motion.div key={role.id} className="glass-card rounded-xl p-5" whileHover={{ scale: 1.01 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HiOutlineShieldCheck className="text-pg-purple w-5 h-5" />
                  <h3 className="font-inter font-bold text-lg">{role.label}</h3>
                  <span className="text-xs text-gray-500">({role._count?.users || 0} users)</span>
                </div>
                <button onClick={() => { setEditRole(role); setShowRoleModal(true); }} className="text-gray-400 hover:text-pg-purple">
                  <HiOutlinePencil className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {role.permissions?.map(rp => (
                  <span key={rp.id} className="text-[10px] px-2 py-0.5 bg-pg-purple/5 text-pg-purple/70 rounded-full border border-pg-purple/10">
                    {rp.permission.slug}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <UserModal show={showUserModal} onClose={() => setShowUserModal(false)} user={editUser} roles={roles} onSaved={fetchAll} />
      <RoleModal show={showRoleModal} onClose={() => setShowRoleModal(false)} role={editRole} permissions={permissions} onSaved={fetchAll} />
    </div>
  );
}

function UserModal({ show, onClose, user, roles, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '', phone: '', hourlyRate: '', overtimeRate: '' });

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email, password: '', roleId: user.roleId, phone: user.phone || '', hourlyRate: user.staffRates?.[0]?.hourlyRate || '', overtimeRate: user.staffRates?.[0]?.overtimeRate || '' });
    else setForm({ name: '', email: '', password: '', roleId: roles[0]?.id || '', phone: '', hourlyRate: '', overtimeRate: '' });
  }, [user, show, roles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name, email: form.email, roleId: parseInt(form.roleId), phone: form.phone || null,
      staffRates: form.hourlyRate ? [{ role: roles.find(r => r.id === parseInt(form.roleId))?.name || 'operator', hourlyRate: parseFloat(form.hourlyRate), overtimeRate: form.overtimeRate ? parseFloat(form.overtimeRate) : null }] : undefined
    };
    if (form.password) payload.password = form.password;
    try {
      if (user) { await api.put(`/users/${user.id}`, payload); toast.success('User updated'); }
      else { payload.password = form.password || 'changeme123'; await api.post('/users', payload); toast.success('User created'); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={user ? 'Edit User' : 'Add User'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label-text">Name *</label><input className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label-text">Email *</label><input type="email" className="input-dark" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
          <div><label className="label-text">{user ? 'New Password' : 'Password *'}</label><input type="password" className="input-dark" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} {...(!user && { required: true })} /></div>
          <div><label className="label-text">Role *</label>
            <select className="input-dark" value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} required>
              {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div><label className="label-text">Phone</label><input className="input-dark" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label-text">Hourly Rate (€)</label><input type="number" step="0.01" className="input-dark" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} /></div>
          <div><label className="label-text">Overtime Rate (€)</label><input type="number" step="0.01" className="input-dark" value={form.overtimeRate} onChange={e => setForm({ ...form, overtimeRate: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">Cancel</button>
          <button type="submit" className="btn-pg-primary text-sm">{user ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

function RoleModal({ show, onClose, role, permissions, onSaved }) {
  const [form, setForm] = useState({ name: '', label: '' });
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (role) { setForm({ name: role.name, label: role.label }); setSelected(role.permissions?.map(rp => rp.permission.id) || []); }
    else { setForm({ name: '', label: '' }); setSelected([]); }
  }, [role, show]);

  const togglePerm = (id) => setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (role) { await api.put(`/roles/${role.id}`, { ...form, permissionIds: selected }); toast.success('Role updated'); }
      else { await api.post('/roles', { ...form, permissionIds: selected }); toast.success('Role created'); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <Modal isOpen={show} onClose={onClose} title={role ? 'Edit Role' : 'New Role'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label-text">Role Slug *</label><input className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. coordinator" /></div>
          <div><label className="label-text">Display Name *</label><input className="input-dark" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required placeholder="e.g. Event Coordinator" /></div>
        </div>
        <div>
          <label className="label-text">Permissions</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto bg-pg-dark rounded-lg p-3">
            {Object.entries(permissions).map(([group, perms]) => (
              <div key={group}>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{group}</p>
                {perms.map(p => (
                  <label key={p.id} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => togglePerm(p.id)} className="accent-pg-purple" />
                    <span className="text-xs text-gray-400">{p.slug.split('.')[1]}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-pg-danger text-sm">Cancel</button>
          <button type="submit" className="btn-pg-primary text-sm">{role ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
