const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── PERMISSIONS ─────────────────────────────────────────────────────────────
  const permissionGroups = {
    Events: ['events.view', 'events.create', 'events.update', 'events.delete'],
    Clients: ['clients.view', 'clients.create', 'clients.update', 'clients.delete'],
    Experiences: ['experiences.view', 'experiences.create', 'experiences.update', 'experiences.delete'],
    Hardware: ['hardware.view', 'hardware.create', 'hardware.update', 'hardware.delete'],
    Assets: ['assets.view', 'assets.manage'],
    Deals: ['deals.view', 'deals.create', 'deals.update', 'deals.delete'],
    Invoices: ['invoices.view', 'invoices.create', 'invoices.update', 'invoices.delete'],
    Users: ['users.view', 'users.create', 'users.update', 'users.delete', 'users.manage_roles'],
    Costs: ['costs.view', 'costs.manage'],
    Logistics: ['logistics.view', 'logistics.create', 'logistics.update', 'logistics.delete'],
    Reports: ['reports.view', 'reports.generate'],
    Settings: ['settings.view', 'settings.manage'],
    Pipeline: ['pipeline.view', 'pipeline.advance'],
    Activity: ['activity.view'],
    Analytics: ['analytics.view']
  };

  const allPermissions = [];
  for (const [group, slugs] of Object.entries(permissionGroups)) {
    for (const slug of slugs) {
      const label = slug.replace('.', ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const p = await prisma.permission.upsert({
        where: { slug },
        update: {},
        create: { slug, label, group }
      });
      allPermissions.push(p);
    }
  }

  // ─── ROLES ───────────────────────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', label: 'Administrator' }
  });

  const opsRole = await prisma.role.upsert({
    where: { name: 'operations' },
    update: {},
    create: { name: 'operations', label: 'Operations Manager' }
  });

  const salesRole = await prisma.role.upsert({
    where: { name: 'sales' },
    update: {},
    create: { name: 'sales', label: 'Sales' }
  });

  const techRole = await prisma.role.upsert({
    where: { name: 'technician' },
    update: {},
    create: { name: 'technician', label: 'Technician' }
  });

  // Assign all permissions to admin
  for (const p of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id }
    });
  }

  // Operations permissions
  const opsPerms = allPermissions.filter(p =>
    ['events', 'hardware', 'experiences', 'costs', 'logistics', 'assets', 'analytics', 'activity', 'reports', 'pipeline'].some(g => p.slug.startsWith(g))
  );
  for (const p of opsPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: opsRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: opsRole.id, permissionId: p.id }
    });
  }

  // Sales permissions
  const salesPerms = allPermissions.filter(p =>
    p.slug.startsWith('clients') || p.slug.startsWith('deals') || p.slug.startsWith('invoices') ||
    ['events.view', 'experiences.view', 'analytics.view', 'reports.view', 'pipeline.view'].includes(p.slug)
  );
  for (const p of salesPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: salesRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: salesRole.id, permissionId: p.id }
    });
  }

  // Technician permissions
  const techPerms = allPermissions.filter(p =>
    p.slug.startsWith('hardware') || p.slug.startsWith('assets') || p.slug === 'pipeline.view'
  );
  for (const p of techPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: techRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: techRole.id, permissionId: p.id }
    });
  }

  // ─── DEFAULT ADMIN USER ─────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@pixelgate.gg' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@pixelgate.gg',
      passwordHash,
      roleId: adminRole.id
    }
  });

  // ─── LOOKUP CATEGORIES ──────────────────────────────────────────────────────
  const lookups = [
    {
      slug: 'event_status', label: 'Event Status',
      values: [
        { value: 'quote', label: 'Quote', color: '#6b7280', sortOrder: 0, isDefault: true },
        { value: 'confirmed', label: 'Confirmed', color: '#3b82f6', sortOrder: 1 },
        { value: 'planning', label: 'Planning', color: '#a855f7', sortOrder: 2 },
        { value: 'prep', label: 'Prep', color: '#f59e0b', sortOrder: 3 },
        { value: 'active', label: 'Active', color: '#fbbf24', sortOrder: 4 },
        { value: 'review', label: 'Review', color: '#f97316', sortOrder: 5 },
        { value: 'closed', label: 'Closed', color: '#10b981', sortOrder: 6 },
        { value: 'cancelled', label: 'Cancelled', color: '#ef4444', sortOrder: 7 }
      ]
    },
    {
      slug: 'deal_stage', label: 'Deal Stage',
      values: [
        { value: 'prospect', label: 'Prospect', color: '#6b7280', sortOrder: 0, isDefault: true },
        { value: 'proposal_sent', label: 'Proposal Sent', color: '#f59e0b', sortOrder: 1 },
        { value: 'negotiating', label: 'Negotiating', color: '#a855f7', sortOrder: 2 },
        { value: 'confirmed', label: 'Confirmed', color: '#fbbf24', sortOrder: 3 },
        { value: 'completed', label: 'Completed', color: '#22c55e', sortOrder: 4 },
        { value: 'lost', label: 'Lost', color: '#ef4444', sortOrder: 5 }
      ]
    },
    {
      slug: 'invoice_status', label: 'Invoice Status',
      values: [
        { value: 'draft', label: 'Draft', color: '#6b7280', sortOrder: 0, isDefault: true },
        { value: 'sent', label: 'Sent', color: '#f59e0b', sortOrder: 1 },
        { value: 'paid', label: 'Paid', color: '#22c55e', sortOrder: 2 },
        { value: 'partial', label: 'Partial', color: '#a855f7', sortOrder: 3 },
        { value: 'overdue', label: 'Overdue', color: '#ef4444', sortOrder: 4 },
        { value: 'cancelled', label: 'Cancelled', color: '#6b7280', sortOrder: 5 }
      ]
    },
    {
      slug: 'hardware_status', label: 'Hardware Status',
      values: [
        { value: 'available', label: 'Available', color: '#22c55e', sortOrder: 0, isDefault: true },
        { value: 'in_use', label: 'In Use', color: '#a855f7', sortOrder: 1 },
        { value: 'maintenance', label: 'In Maintenance', color: '#f59e0b', sortOrder: 2 },
        { value: 'retired', label: 'Retired', color: '#6b7280', sortOrder: 3 }
      ]
    },
    {
      slug: 'maintenance_status', label: 'Maintenance Status',
      values: [
        { value: 'open', label: 'Open', color: '#ef4444', sortOrder: 0, isDefault: true },
        { value: 'in_progress', label: 'In Progress', color: '#f59e0b', sortOrder: 1 },
        { value: 'resolved', label: 'Resolved', color: '#22c55e', sortOrder: 2 }
      ]
    },
    {
      slug: 'damage_severity', label: 'Damage Severity',
      values: [
        { value: 'minor', label: 'Minor', color: '#f59e0b', sortOrder: 0, isDefault: true },
        { value: 'major', label: 'Major', color: '#ef4444', sortOrder: 1 },
        { value: 'critical', label: 'Critical', color: '#dc2626', sortOrder: 2 }
      ]
    },
    {
      slug: 'logistics_category', label: 'Logistics Category',
      values: [
        { value: 'transport', label: 'Transport', color: '#a855f7', sortOrder: 0 },
        { value: 'food', label: 'Food & Meals', color: '#fbbf24', sortOrder: 1 },
        { value: 'hotel', label: 'Hotel / Accommodation', color: '#22c55e', sortOrder: 2 },
        { value: 'other', label: 'Other', color: '#6b7280', sortOrder: 3 }
      ]
    },
    {
      slug: 'payment_method', label: 'Payment Method',
      values: [
        { value: 'bank_transfer', label: 'Bank Transfer', color: '#a855f7', sortOrder: 0 },
        { value: 'cash', label: 'Cash', color: '#22c55e', sortOrder: 1 },
        { value: 'card', label: 'Card', color: '#fbbf24', sortOrder: 2 },
        { value: 'check', label: 'Check', color: '#6b7280', sortOrder: 3 }
      ]
    }
  ];

  for (const lk of lookups) {
    const cat = await prisma.lookupCategory.upsert({
      where: { slug: lk.slug },
      update: { label: lk.label },
      create: { slug: lk.slug, label: lk.label }
    });

    for (const val of lk.values) {
      await prisma.lookupValue.upsert({
        where: { categoryId_value: { categoryId: cat.id, value: val.value } },
        update: { label: val.label, color: val.color, sortOrder: val.sortOrder },
        create: { ...val, categoryId: cat.id }
      });
    }
  }

  // ─── SYSTEM CONFIG DEFAULTS ─────────────────────────────────────────────────
  const defaults = [
    { key: 'company_name', value: 'PixelGate', type: 'string' },
    { key: 'timezone', value: 'Africa/Tunis', type: 'string' },
    { key: 'currency', value: 'EUR', type: 'string' },
    { key: 'currency_symbol', value: '€', type: 'string' },
    { key: 'venue_hourly_rate', value: '50', type: 'number' },
    { key: 'margin_alert_threshold', value: '30', type: 'number' },
    { key: 'overtime_multiplier', value: '1.5', type: 'number' },
    { key: 'default_buffer_minutes', value: '15', type: 'number' },
    { key: 'working_hours_start', value: '09:00', type: 'string' },
    { key: 'working_hours_end', value: '21:00', type: 'string' },
    { key: 'blackout_dates', value: '[]', type: 'json' },
    { key: 'default_tax_rate', value: '19', type: 'number' },
    { key: 'estimated_uses_per_year', value: '100', type: 'number' },
    { key: 'invoice_prefix', value: 'PG-INV', type: 'string' },
  ];

  for (const d of defaults) {
    await prisma.systemConfig.upsert({
      where: { key: d.key },
      update: {},
      create: d
    });
  }

  console.log('Seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
