/**
 * Clean database for production use.
 * Wipes all business data but keeps: roles, permissions, lookups, system config, admin user.
 *
 * Usage:
 *   DATABASE_URL="your_url" node prisma/cleanDb.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning database for production...\n');

  // Delete in dependency order (children first)
  const tables = [
    'assetDepreciationLog',
    'eventLogisticsCost',
    'eventCost',
    'eventStaff',
    'eventHardware',
    'eventChecklistItem',
    'eventPackingItem',
    'eventPhoto',
    'eventFeedback',
    'damageReport',
    'maintenanceLog',
    'invoicePayment',
    'invoiceLineItem',
    'invoice',
    'dealLineItem',
    'dealDocument',
    'deal',
    'event',
    'clientInteraction',
    'clientCustomFieldValue',
    'client',
    'hardwareItem',
    'hardwareType',
    'hardwareBundleItem',
    'hardwareBundle',
    'experienceHardware',
    'experienceTag',
    'tag',
    'experience',
    'staffRate',
    'staffAvailability',
    'notification',
    'activityLog',
    'clientCustomField',
  ];

  for (const table of tables) {
    try {
      const count = await prisma[table].deleteMany({});
      if (count.count > 0) console.log(`  ✓ ${table}: ${count.count} records deleted`);
    } catch (err) {
      // Table might not exist or already empty
      console.log(`  - ${table}: skipped (${err.code || 'empty'})`);
    }
  }

  // Delete all non-admin users
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (adminRole) {
    const deleted = await prisma.user.deleteMany({ where: { roleId: { not: adminRole.id } } });
    if (deleted.count > 0) console.log(`  ✓ users (non-admin): ${deleted.count} deleted`);
  }

  // Update admin email and reset password
  const passwordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.findFirst({ where: { role: { name: 'admin' } } });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        name: 'Admin',
        email: 'admin@pixelgate.gg',
        passwordHash,
      }
    });
    console.log('\n  ✓ Admin user reset: admin@pixelgate.gg / admin123');
  }

  console.log('\n✅ Database cleaned! Ready for production.');
  console.log('\nKept: roles, permissions, lookups, system config, admin user');
  console.log('⚠️  Change the admin password after first login!');
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
