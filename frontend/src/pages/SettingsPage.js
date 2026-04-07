import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineCog, HiOutlineTag, HiOutlineCube, HiOutlineCalendar, HiOutlineDownload, HiOutlineTranslate, HiOutlineMail } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useI18n } from '../hooks/useI18n';

export default function SettingsPage() {
  const { t, locale, setLocale, currency, currencySymbol, changeCurrency, LANGUAGES, CURRENCIES } = useI18n();
  const [settings, setSettings] = useState({});
  const [lookups, setLookups] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [tab, setTab] = useState('general');
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
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-inter font-bold text-2xl pg-text-gradient">Settings & Configuration</h1>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'btn-pg-primary' : 'btn-pg-outline'}`}>
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
