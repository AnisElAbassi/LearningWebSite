import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineCog, HiOutlineTag, HiOutlineCube, HiOutlineCalendar, HiOutlineDownload, HiOutlineTranslate, HiOutlineMail, HiOutlineUsers, HiOutlinePlus, HiOutlineShieldCheck, HiOutlinePencil } from 'react-icons/hi';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useI18n } from '../hooks/useI18n';

export default function SettingsPage() {
  const { t, locale, setLocale, currency, currencySymbol, changeCurrency, LANGUAGES, CURRENCIES } = useI18n();
  const [settings, setSettings] = useState({});
  const [lookups, setLookups] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'general');
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [sRes, lRes, cfRes] = await Promise.all([
      api.get('/settings'),
      api.get('/lookups'),
      api.get('/clients/custom-fields/all')
    ]);
    setSettings(sRes.data);
    setLookups(lRes.data);
    setCustomFields(cfRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveSetting = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await api.put('/settings', { [key]: value });
    toast.success('Setting saved');
  };

  const tabs = [
    { id: 'general', label: t('general'), icon: HiOutlineCog },
    { id: 'language', label: t('language') + ' & ' + t('currency'), icon: HiOutlineTranslate },
    { id: 'lookups', label: t('system_configuration'), icon: HiOutlineTag },
    { id: 'fields', label: t('custom_fields'), icon: HiOutlineCube },
    { id: 'email', label: 'Email', icon: HiOutlineMail },
    { id: 'schedule', label: t('schedule_blackouts'), icon: HiOutlineCalendar },
    { id: 'export', label: t('data_export'), icon: HiOutlineDownload },
    { id: 'team', label: t('team') || 'Team', icon: HiOutlineUsers },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-inter font-bold text-2xl pg-text-gradient">Settings & Configuration</h1>

      <div className="flex gap-1 overflow-x-auto border-b border-pg-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-pg-purple text-pg-purple' : 'border-transparent text-gray-500 hover:text-white'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="glass-card rounded-xl p-6 space-y-6">
          <h3 className="font-inter font-bold text-lg">Company Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <SettingInput label="Company Name" value={settings.company_name || ''} onSave={v => saveSetting('company_name', v)} />
            <SettingInput label="Timezone" value={settings.timezone || ''} onSave={v => saveSetting('timezone', v)} />
            <SettingInput label="Currency" value={settings.currency || 'EUR'} onSave={v => saveSetting('currency', v)} />
            <SettingInput label="Currency Symbol" value={settings.currency_symbol || '€'} onSave={v => saveSetting('currency_symbol', v)} />
          </div>
          <h3 className="font-inter font-bold text-lg pt-4 border-t border-pg-border">Cost Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <SettingInput label="Venue Hourly Rate (€)" value={settings.venue_hourly_rate || 50} type="number" onSave={v => saveSetting('venue_hourly_rate', parseFloat(v))} />
            <SettingInput label="Margin Alert Threshold (%)" value={settings.margin_alert_threshold || 30} type="number" onSave={v => saveSetting('margin_alert_threshold', parseFloat(v))} />
            <SettingInput label="Overtime Multiplier" value={settings.overtime_multiplier || 1.5} type="number" onSave={v => saveSetting('overtime_multiplier', parseFloat(v))} />
            <SettingInput label="Default Buffer (min)" value={settings.default_buffer_minutes || 15} type="number" onSave={v => saveSetting('default_buffer_minutes', parseInt(v))} />
          </div>
        </div>
      )}

      {tab === 'language' && (
        <div className="glass-card rounded-xl p-6 space-y-6">
          {/* Language Selection */}
          <div>
            <h3 className="font-inter font-bold text-lg mb-4">{t('language')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLocale(lang.code)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    locale === lang.code
                      ? 'border-pg-purple bg-pg-purple/10'
                      : 'border-pg-border hover:border-pg-purple/30'
                  }`}
                >
                  <p className="text-2xl mb-1">{lang.code === 'en' ? '🇬🇧' : lang.code === 'fr' ? '🇫🇷' : '🇹🇳'}</p>
                  <p className={`font-semibold ${locale === lang.code ? 'text-pg-purple' : 'text-white'}`}>{lang.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{lang.code.toUpperCase()} • {lang.dir.toUpperCase()}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Currency Selection */}
          <div>
            <h3 className="font-inter font-bold text-lg mb-4">{t('currency')}</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {CURRENCIES.map(cur => (
                <button
                  key={cur.code}
                  onClick={() => changeCurrency(cur.code, cur.symbol)}
                  className={`p-3 rounded-lg border transition-all text-center ${
                    currency === cur.code
                      ? 'border-pg-purple bg-pg-purple/10 text-pg-purple'
                      : 'border-pg-border text-gray-400 hover:border-pg-purple/30 hover:text-white'
                  }`}
                >
                  <p className="text-lg font-bold">{cur.symbol}</p>
                  <p className="text-[10px] mt-0.5">{cur.code}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {t('currency')}: <span className="text-white font-medium">{currency}</span> ({currencySymbol})
              — {locale === 'ar' ? 'يمكنك أيضًا تعيين رمز مخصص في الإعدادات العامة' : locale === 'fr' ? 'Vous pouvez aussi définir un symbole personnalisé dans les paramètres généraux' : 'You can also set a custom symbol in general settings'}
            </p>
          </div>
        </div>
      )}

      {tab === 'lookups' && (
        <div className="space-y-4">
          {lookups.map(cat => (
            <LookupManager key={cat.id} category={cat} onChanged={fetchAll} />
          ))}
        </div>
      )}

      {tab === 'fields' && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-inter font-bold text-lg">Client Custom Fields</h3>
            <AddCustomFieldButton onAdded={fetchAll} />
          </div>
          <div className="space-y-2">
            {customFields.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-pg-dark2/30">
                <div>
                  <p className="text-sm font-medium">{f.label} <span className="text-xs text-gray-500">({f.type})</span></p>
                  <p className="text-xs text-gray-500">Field name: {f.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {f.required && <span className="text-[10px] text-neon-orange">Required</span>}
                  {f.options && <span className="text-[10px] text-gray-500">Options: {f.options}</span>}
                  <button onClick={async () => {
                    const newLabel = prompt('New label:', f.label);
                    if (newLabel && newLabel !== f.label) {
                      await api.put(`/clients/custom-fields/${f.id}`, { label: newLabel });
                      toast.success('Field updated'); fetchAll();
                    }
                  }} className="text-gray-500 hover:text-pg-purple text-xs">Edit</button>
                  <button onClick={async () => {
                    if (!window.confirm(`Delete field "${f.label}"?`)) return;
                    try { await api.delete(`/clients/custom-fields/${f.id}`); toast.success('Field deleted'); fetchAll(); }
                    catch { toast.error('Failed'); }
                  }} className="text-gray-500 hover:text-neon-red text-xs">Delete</button>
                </div>
              </div>
            ))}
            {customFields.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No custom fields configured</p>}
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div className="space-y-6">
          {/* SMTP Configuration */}
          <div className="glass-card rounded-xl p-6 space-y-4">
            <h3 className="font-inter font-bold text-lg">SMTP Configuration</h3>
            <p className="text-sm text-gray-400">Configure your email server to send thank you emails to clients and daily digest alerts to your team.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingInput label="SMTP Host" value={settings.smtp_host || ''} onSave={v => saveSetting('smtp_host', v)} />
              <SettingInput label="SMTP Port" value={settings.smtp_port || '587'} type="number" onSave={v => saveSetting('smtp_port', v)} />
              <SettingInput label="SMTP User (email)" value={settings.smtp_user || ''} onSave={v => saveSetting('smtp_user', v)} />
              <SettingInput label="SMTP Password" value={settings.smtp_pass || ''} onSave={v => saveSetting('smtp_pass', v)} />
            </div>
            <div className="p-3 bg-pg-purple/5 border border-pg-purple/20 rounded-lg">
              <p className="text-xs text-gray-400">
                <strong className="text-pg-purple">Gmail / Google Workspace:</strong> Host: smtp.gmail.com, Port: 587, User: your@email.com, Password: use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-pg-purple underline">App Password</a> (not your regular password)
              </p>
            </div>
          </div>

          {/* Email Features */}
          <div className="glass-card rounded-xl p-6 space-y-4">
            <h3 className="font-inter font-bold text-lg">Email Features</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-pg-dark2/30 border border-pg-border/30">
                <div>
                  <p className="text-sm font-medium">Thank You Email</p>
                  <p className="text-xs text-gray-500">Auto-sent to client when event is marked "completed". Includes survey link.</p>
                </div>
                <span className="text-xs px-2 py-1 bg-neon-green/10 text-neon-green rounded-full border border-neon-green/20">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-pg-dark2/30 border border-pg-border/30">
                <div>
                  <p className="text-sm font-medium">Daily Digest</p>
                  <p className="text-xs text-gray-500">Sent at 8:00 AM to admins & ops — tomorrow's events, overdue invoices, hardware alerts.</p>
                </div>
                <span className="text-xs px-2 py-1 bg-neon-green/10 text-neon-green rounded-full border border-neon-green/20">Active</span>
              </div>
            </div>
          </div>

          {/* External Survey Links */}
          <div className="glass-card rounded-xl p-6 space-y-4">
            <h3 className="font-inter font-bold text-lg">External Survey Links</h3>
            <p className="text-sm text-gray-400">Optionally add a Google Forms or Typeform link per experience. It will appear in the thank you email alongside the built-in survey.</p>
            <ExternalSurveyLinks settings={settings} onSave={saveSetting} />
          </div>

          {/* Test Email */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-inter font-bold text-lg mb-3">Test Email</h3>
            <div className="flex gap-3">
              <button onClick={async () => {
                try {
                  await api.post('/email/daily-digest');
                  toast.success('Daily digest sent (check your inbox)');
                } catch (err) { toast.error('Failed — check SMTP settings'); }
              }} className="btn-pg-outline">
                Send Test Digest
              </button>
              <a href={`${process.env.REACT_APP_API_URL || 'http://localhost:4000/api'}/feedback/survey/1`}
                target="_blank" rel="noopener noreferrer" className="btn-pg-outline">
                Preview Survey Page
              </a>
            </div>
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="font-inter font-bold text-lg">Working Hours</h3>
          <div className="grid grid-cols-2 gap-4">
            <SettingInput label="Start Time" value={settings.working_hours_start || '09:00'} onSave={v => saveSetting('working_hours_start', v)} />
            <SettingInput label="End Time" value={settings.working_hours_end || '21:00'} onSave={v => saveSetting('working_hours_end', v)} />
          </div>
          <h3 className="font-inter font-bold text-lg pt-4 border-t border-pg-border">Blackout Dates</h3>
          <p className="text-sm text-gray-400">Dates when no events can be booked</p>
          <BlackoutManager dates={settings.blackout_dates || []} onSave={(dates) => {
            api.put('/settings/blackout-dates', { dates }).then(() => { toast.success('Blackout dates updated'); fetchAll(); });
          }} />
        </div>
      )}

      {tab === 'export' && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-inter font-bold text-lg mb-4">Export Data (CSV)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['events', 'clients', 'deals', 'hardware'].map(type => (
              <motion.a key={type} href={`${process.env.REACT_APP_API_URL || 'http://localhost:4000/api'}/export/${type}`}
                target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                className="glass-card rounded-xl p-5 text-center cursor-pointer hover:glow-border-purple transition-all block">
                <HiOutlineDownload className="w-8 h-8 mx-auto text-pg-purple mb-2" />
                <p className="font-inter font-bold">{type.replace(/\b\w/g, l => l.toUpperCase())}</p>
                <p className="text-xs text-gray-500">Download CSV</p>
              </motion.a>
            ))}
          </div>
        </div>
      )}

      {tab === 'team' && <TeamTab />}
    </div>
  );
}

function SettingInput({ label, value, type = 'text', onSave }) {
  const [val, setVal] = useState(value);
  const [changed, setChanged] = useState(false);

  useEffect(() => { setVal(value); setChanged(false); }, [value]);

  return (
    <div>
      <label className="label-text">{label}</label>
      <div className="flex gap-2">
        <input type={type} className="input-dark flex-1" value={val}
          onChange={e => { setVal(e.target.value); setChanged(true); }} />
        {changed && <button onClick={() => { onSave(val); setChanged(false); }} className="btn-pg-primary text-xs px-3">Save</button>}
      </div>
    </div>
  );
}

function LookupManager({ category, onChanged }) {
  const [newValue, setNewValue] = useState({ value: '', label: '', color: '#a855f7' });

  const addValue = async () => {
    if (!newValue.value || !newValue.label) return;
    await api.post(`/lookups/${category.slug}/values`, { ...newValue, sortOrder: category.values.length });
    toast.success('Value added');
    setNewValue({ value: '', label: '', color: '#a855f7' });
    onChanged();
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="font-inter font-bold mb-3">{category.label} <span className="text-xs text-gray-500">({category.slug})</span></h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {category.values?.map(v => (
          <span key={v.id} className="status-badge" style={{ backgroundColor: `${v.color}15`, color: v.color, border: `1px solid ${v.color}40` }}>
            {v.label}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input-dark text-sm flex-1" placeholder="Value (slug)" value={newValue.value} onChange={e => setNewValue({ ...newValue, value: e.target.value })} />
        <input className="input-dark text-sm flex-1" placeholder="Label" value={newValue.label} onChange={e => setNewValue({ ...newValue, label: e.target.value })} />
        <input type="color" className="w-10 h-10 rounded cursor-pointer bg-transparent border-none" value={newValue.color} onChange={e => setNewValue({ ...newValue, color: e.target.value })} />
        <button onClick={addValue} className="btn-pg-outline text-xs">Add</button>
      </div>
    </div>
  );
}

function AddCustomFieldButton({ onAdded }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', label: '', type: 'text', options: '', required: false });

  const add = async () => {
    await api.post('/clients/custom-fields', { ...form, options: form.options || null });
    toast.success('Custom field added');
    setShow(false);
    setForm({ name: '', label: '', type: 'text', options: '', required: false });
    onAdded();
  };

  if (!show) return <button onClick={() => setShow(true)} className="btn-pg-outline text-xs">+ Add Field</button>;

  return (
    <div className="flex gap-2 items-end">
      <input className="input-dark text-xs" placeholder="name (slug)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <input className="input-dark text-xs" placeholder="Label" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
      <select className="input-dark text-xs w-24" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
        {['text', 'number', 'select', 'date', 'boolean'].map(t => <option key={t}>{t}</option>)}
      </select>
      <button onClick={add} className="btn-pg-primary text-xs">Save</button>
      <button onClick={() => setShow(false)} className="btn-pg-danger text-xs">X</button>
    </div>
  );
}

function BlackoutManager({ dates, onSave }) {
  const [items, setItems] = useState(dates || []);
  const [newDate, setNewDate] = useState('');

  const add = () => {
    if (newDate && !items.includes(newDate)) {
      const updated = [...items, newDate].sort();
      setItems(updated);
      setNewDate('');
    }
  };

  const remove = (d) => setItems(items.filter(i => i !== d));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {items.map(d => (
          <span key={d} className="px-3 py-1 bg-neon-red/10 text-neon-red border border-neon-red/20 rounded-full text-xs flex items-center gap-1">
            {d} <button onClick={() => remove(d)} className="hover:text-white">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="date" className="input-dark flex-1" value={newDate} onChange={e => setNewDate(e.target.value)} />
        <button onClick={add} className="btn-pg-outline text-sm">Add Date</button>
        <button onClick={() => onSave(items)} className="btn-pg-primary text-sm">Save All</button>
      </div>
    </div>
  );
}

function ExternalSurveyLinks({ settings, onSave }) {
  const [experiences, setExperiences] = useState([]);
  useEffect(() => { api.get('/experiences').then(r => setExperiences(r.data)).catch(() => {}); }, []);

  return (
    <div className="space-y-2">
      {experiences.filter(e => e.status === 'active').map(exp => {
        const key = `survey_link_${exp.id}`;
        const currentVal = settings[key] || '';
        return (
          <div key={exp.id} className="flex items-center gap-3">
            <span className="text-sm text-gray-300 w-40 truncate">{exp.name}</span>
            <div className="flex-1 flex gap-2">
              <input
                className="input-dark text-sm flex-1"
                placeholder="https://forms.google.com/..."
                defaultValue={currentVal}
                onBlur={e => { if (e.target.value !== currentVal) onSave(key, e.target.value); }}
              />
            </div>
          </div>
        );
      })}
      {experiences.length === 0 && <p className="text-gray-500 text-sm">No experiences found</p>}
    </div>
  );
}

function TeamTab() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [subTab, setSubTab] = useState('users');

  const fetchAll = async () => {
    const [uRes, rRes, pRes] = await Promise.all([api.get('/users'), api.get('/roles'), api.get('/roles/permissions')]);
    setUsers(uRes.data); setRoles(rRes.data); setPermissions(pRes.data);
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setSubTab('users')} className={`px-3 py-1.5 text-sm rounded-lg ${subTab === 'users' ? 'bg-pg-purple/10 text-pg-purple' : 'text-gray-500 hover:text-white'}`}>Users</button>
          <button onClick={() => setSubTab('roles')} className={`px-3 py-1.5 text-sm rounded-lg ${subTab === 'roles' ? 'bg-pg-purple/10 text-pg-purple' : 'text-gray-500 hover:text-white'}`}>Roles & Permissions</button>
        </div>
        <div className="flex gap-2">
          {subTab === 'roles' && (
            <button onClick={() => { setEditRole(null); setShowRoleModal(true); }} className="btn-pg-outline flex items-center gap-2 text-sm">
              <HiOutlinePlus className="w-4 h-4" /> New Role
            </button>
          )}
          <button onClick={() => { setEditUser(null); setShowUserModal(true); }} className="btn-pg-primary flex items-center gap-2 text-sm">
            <HiOutlinePlus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {subTab === 'users' ? (
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
                  <td><span className="status-badge" style={{ backgroundColor: '#7b2ff715', color: '#7b2ff7', border: '1px solid #7b2ff740' }}>{user.role?.name || 'unknown'}</span></td>
                  <td><span className={`status-badge ${user.isActive ? 'text-neon-green' : 'text-neon-red'}`} style={{ backgroundColor: user.isActive ? '#10b98115' : '#ef444415', border: `1px solid ${user.isActive ? '#10b98140' : '#ef444440'}` }}>{user.isActive ? 'active' : 'inactive'}</span></td>
                  <td className="text-pg-purple">{user.staffRates?.[0] ? `€${user.staffRates[0].hourlyRate}/h` : '—'}</td>
                  <td><button onClick={() => { setEditUser(user); setShowUserModal(true); }} className="text-gray-400 hover:text-pg-purple"><HiOutlinePencil className="w-4 h-4" /></button></td>
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
                <button onClick={() => { setEditRole(role); setShowRoleModal(true); }} className="text-gray-400 hover:text-pg-purple"><HiOutlinePencil className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-1">
                {role.permissions?.map(rp => (
                  <span key={rp.id} className="text-[10px] px-2 py-0.5 bg-pg-purple/5 text-pg-purple/70 rounded-full border border-pg-purple/10">{rp.permission.slug}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <TeamUserModal show={showUserModal} onClose={() => setShowUserModal(false)} user={editUser} roles={roles} onSaved={fetchAll} />
      <TeamRoleModal show={showRoleModal} onClose={() => setShowRoleModal(false)} role={editRole} permissions={permissions} onSaved={fetchAll} />
    </div>
  );
}

function TeamUserModal({ show, onClose, user, roles, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '', phone: '', hourlyRate: '', overtimeRate: '' });

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email, password: '', roleId: user.roleId, phone: user.phone || '', hourlyRate: user.staffRates?.[0]?.hourlyRate || '', overtimeRate: user.staffRates?.[0]?.overtimeRate || '' });
    else setForm({ name: '', email: '', password: '', roleId: roles[0]?.id || '', phone: '', hourlyRate: '', overtimeRate: '' });
  }, [user, show, roles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { name: form.name, email: form.email, roleId: parseInt(form.roleId), phone: form.phone || null,
      staffRates: form.hourlyRate ? [{ role: roles.find(r => r.id === parseInt(form.roleId))?.name || 'operator', hourlyRate: parseFloat(form.hourlyRate), overtimeRate: form.overtimeRate ? parseFloat(form.overtimeRate) : null }] : undefined };
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
          <div><label className="label-text">Role *</label><select className="input-dark" value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} required>{roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
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

function TeamRoleModal({ show, onClose, role, permissions, onSaved }) {
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
