const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy data...');

  // Get admin user
  const admin = await prisma.user.findFirst({ where: { email: 'admin@nexushq.io' } });
  const adminRole = await prisma.role.findFirst({ where: { name: 'admin' } });
  const opsRole = await prisma.role.findFirst({ where: { name: 'operations' } });
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('password123', 12);

  // ─── STAFF ──────────────────────────────────────────────────────────────────
  const staff = [];
  const staffData = [
    { name: 'Ahmed Ben Salah', email: 'ahmed@pixelgate.gg', roleId: opsRole.id, phone: '+216 98 123 456' },
    { name: 'Sarah Mansour', email: 'sarah@pixelgate.gg', roleId: opsRole.id, phone: '+216 97 654 321' },
    { name: 'Youssef Khelifi', email: 'youssef@pixelgate.gg', roleId: opsRole.id, phone: '+216 55 789 012' },
  ];
  for (const s of staffData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { ...s, passwordHash: hash }
    });
    staff.push(user);
    await prisma.staffRate.upsert({
      where: { userId_role: { userId: user.id, role: 'operator' } },
      update: {},
      create: { userId: user.id, role: 'operator', hourlyRate: 25, overtimeRate: 37.5 }
    });
  }

  // ─── HARDWARE TYPES ─────────────────────────────────────────────────────────
  const hwTypes = {};
  const typeData = [
    { name: 'VR Headset', isSerialized: true, dailyCost: 12, expectedUses: 200, eolAlertThreshold: 0.8, depreciationMethod: 'uses' },
    { name: 'Backpack PC', isSerialized: true, dailyCost: 25, expectedUses: 150, eolAlertThreshold: 0.8, depreciationMethod: 'uses' },
    { name: 'Floor Mat', isSerialized: false, dailyCost: 5, expectedUses: 300, eolAlertThreshold: 0.8, depreciationMethod: 'uses' },
    { name: 'Banner Display', isSerialized: false, dailyCost: 3, expectedUses: 500, eolAlertThreshold: 0.8, depreciationMethod: 'uses' },
    { name: 'Controller', isSerialized: true, dailyCost: 4, expectedUses: 250, eolAlertThreshold: 0.8, depreciationMethod: 'uses' },
    { name: 'Charging Station', isSerialized: true, dailyCost: 8, expectedUses: 400, eolAlertThreshold: 0.8, depreciationMethod: 'uses' },
  ];
  for (const t of typeData) {
    hwTypes[t.name] = await prisma.hardwareType.upsert({ where: { name: t.name }, update: {}, create: t });
  }

  // ─── HARDWARE ITEMS ─────────────────────────────────────────────────────────
  const items = [];
  const itemData = [
    { name: 'Quest 3 #001', typeId: hwTypes['VR Headset'].id, model: 'Meta Quest 3', serialNumber: 'MQ3-001', purchasePrice: 450, purchaseDate: new Date('2024-06-01'), expectedLifespanUses: 200, currentUseCount: 85, location: 'Storage A' },
    { name: 'Quest 3 #002', typeId: hwTypes['VR Headset'].id, model: 'Meta Quest 3', serialNumber: 'MQ3-002', purchasePrice: 450, purchaseDate: new Date('2024-06-01'), expectedLifespanUses: 200, currentUseCount: 92, location: 'Storage A' },
    { name: 'Quest 3 #003', typeId: hwTypes['VR Headset'].id, model: 'Meta Quest 3', serialNumber: 'MQ3-003', purchasePrice: 450, purchaseDate: new Date('2024-09-15'), expectedLifespanUses: 200, currentUseCount: 45, location: 'Storage A' },
    { name: 'Quest 3 #004', typeId: hwTypes['VR Headset'].id, model: 'Meta Quest 3', serialNumber: 'MQ3-004', purchasePrice: 450, purchaseDate: new Date('2024-09-15'), expectedLifespanUses: 200, currentUseCount: 170, eolReached: true, location: 'Storage A' },
    { name: 'Quest 3 #005', typeId: hwTypes['VR Headset'].id, model: 'Meta Quest 3', serialNumber: 'MQ3-005', purchasePrice: 450, purchaseDate: new Date('2025-01-10'), expectedLifespanUses: 200, currentUseCount: 20, location: 'Storage A' },
    { name: 'Quest 3 #006', typeId: hwTypes['VR Headset'].id, model: 'Meta Quest 3', serialNumber: 'MQ3-006', purchasePrice: 450, purchaseDate: new Date('2025-01-10'), expectedLifespanUses: 200, currentUseCount: 18, location: 'Storage A' },
    { name: 'Backpack PC #001', typeId: hwTypes['Backpack PC'].id, model: 'MSI VR One', serialNumber: 'BP-001', purchasePrice: 1200, purchaseDate: new Date('2024-03-01'), expectedLifespanUses: 150, currentUseCount: 110, location: 'Storage B' },
    { name: 'Backpack PC #002', typeId: hwTypes['Backpack PC'].id, model: 'MSI VR One', serialNumber: 'BP-002', purchasePrice: 1200, purchaseDate: new Date('2024-06-01'), expectedLifespanUses: 150, currentUseCount: 78, location: 'Storage B' },
    { name: 'Floor Mats Set', typeId: hwTypes['Floor Mat'].id, purchasePrice: 800, quantity: 8, purchaseDate: new Date('2024-01-15'), expectedLifespanUses: 300, currentUseCount: 120, location: 'Storage C' },
    { name: 'Banner Set Large', typeId: hwTypes['Banner Display'].id, purchasePrice: 400, quantity: 4, purchaseDate: new Date('2024-02-01'), expectedLifespanUses: 500, currentUseCount: 95, location: 'Storage C' },
    { name: 'Controller #001', typeId: hwTypes['Controller'].id, serialNumber: 'CTR-001', purchasePrice: 80, purchaseDate: new Date('2024-06-01'), expectedLifespanUses: 250, currentUseCount: 85, location: 'Storage A' },
    { name: 'Controller #002', typeId: hwTypes['Controller'].id, serialNumber: 'CTR-002', purchasePrice: 80, purchaseDate: new Date('2024-06-01'), expectedLifespanUses: 250, currentUseCount: 90, location: 'Storage A' },
    { name: 'Charging Hub', typeId: hwTypes['Charging Station'].id, serialNumber: 'CHG-001', purchasePrice: 150, purchaseDate: new Date('2024-03-01'), expectedLifespanUses: 400, currentUseCount: 130, location: 'Storage B' },
  ];
  for (const d of itemData) {
    const depPerUse = d.purchasePrice && d.expectedLifespanUses ? d.purchasePrice / d.expectedLifespanUses : 0;
    const bookValue = Math.max(0, d.purchasePrice - (depPerUse * (d.currentUseCount || 0)));
    const item = await prisma.hardwareItem.upsert({
      where: { serialNumber: d.serialNumber || `auto-${d.name}` },
      update: {},
      create: { ...d, depreciationPerUse: depPerUse, bookValue, dailyRate: depPerUse, status: 'available' }
    });
    items.push(item);
  }

  // ─── EXPERIENCE TAGS ────────────────────────────────────────────────────────
  const tagNames = ['Team Building', 'Ice Breaker', 'Problem Solving', 'High Energy', 'Relaxed', 'Competitive', 'Cooperative'];
  const tags = [];
  for (const name of tagNames) {
    tags.push(await prisma.experienceTag.upsert({ where: { name }, update: {}, create: { name, color: '#a855f7' } }));
  }

  // ─── EXPERIENCES ────────────────────────────────────────────────────────────
  const experiences = [];
  const expData = [
    { name: 'Zombie Arena FPS', description: 'Cooperative zombie survival shooter. Teams work together to survive waves of enemies.', minPlayers: 4, maxPlayers: 8, durationMin: 45, difficulty: 3, status: 'active', bufferTimeMin: 15 },
    { name: 'Space Station Escape', description: 'Escape room in zero gravity. Solve puzzles before the station explodes.', minPlayers: 2, maxPlayers: 6, durationMin: 60, difficulty: 4, status: 'active', bufferTimeMin: 20 },
    { name: 'Virtual Olympics', description: 'Fun sports games — archery, fencing, relay races in VR.', minPlayers: 4, maxPlayers: 12, durationMin: 40, difficulty: 1, status: 'active', bufferTimeMin: 15 },
    { name: 'Deep Sea Explorer', description: 'Underwater adventure exploring a sunken city. Relaxed, awe-inspiring experience.', minPlayers: 2, maxPlayers: 8, durationMin: 30, difficulty: 1, status: 'active', bufferTimeMin: 10 },
    { name: 'Heist: The Vault', description: 'Ocean\'s Eleven style heist in VR. Each player has a role. Stealth required.', minPlayers: 4, maxPlayers: 6, durationMin: 50, difficulty: 5, status: 'active', bufferTimeMin: 15 },
    { name: 'Racing Grand Prix', description: 'High-speed VR racing competition with multiple tracks.', minPlayers: 2, maxPlayers: 8, durationMin: 35, difficulty: 2, status: 'active', bufferTimeMin: 10 },
  ];
  for (const e of expData) {
    const exp = await prisma.experience.create({ data: e });
    experiences.push(exp);
    // Add random tags
    const randomTags = tags.sort(() => 0.5 - Math.random()).slice(0, 2 + Math.floor(Math.random() * 3));
    for (const tag of randomTags) {
      await prisma.experienceTagMapping.create({ data: { experienceId: exp.id, tagId: tag.id } }).catch(() => {});
    }
  }

  // ─── CLIENTS ────────────────────────────────────────────────────────────────
  const clients = [];
  const clientData = [
    { companyName: 'Airbus Tunisia', contactName: 'Mohamed Trabelsi', email: 'mohamed@airbus-tn.com', phone: '+216 71 123 456', industry: 'Aerospace', billingAddress: 'Zone Industrielle, Ben Arous', loyaltyTier: 'vip' },
    { companyName: 'Orange Tunisie', contactName: 'Leila Chaabane', email: 'leila@orange.tn', phone: '+216 71 234 567', industry: 'Telecom', billingAddress: 'Centre Urbain Nord, Tunis', loyaltyTier: 'returning' },
    { companyName: 'Vermeg Group', contactName: 'Karim Jaziri', email: 'karim@vermeg.com', phone: '+216 71 345 678', industry: 'Technology', billingAddress: 'Technopole El Ghazala', loyaltyTier: 'returning' },
    { companyName: 'Carthage Innovation Hub', contactName: 'Amira Bouazizi', email: 'amira@carthageinno.tn', phone: '+216 71 456 789', industry: 'Startup Hub', loyaltyTier: 'new' },
    { companyName: 'Poulina Group', contactName: 'Sami Hamdi', email: 'sami@poulina.com', phone: '+216 71 567 890', industry: 'Conglomerate', billingAddress: 'GP1, Grombalia', loyaltyTier: 'vip' },
    { companyName: 'Tunisair', contactName: 'Nadia Mejri', email: 'nadia@tunisair.tn', phone: '+216 71 678 901', industry: 'Aviation', loyaltyTier: 'new' },
  ];
  for (const c of clientData) {
    clients.push(await prisma.client.create({ data: c }));
  }

  // ─── DEALS ──────────────────────────────────────────────────────────────────
  const deals = [];
  const dealData = [
    { clientId: clients[0].id, title: 'Airbus Q2 Team Building Package', stage: 'completed', price: 4500, discount: 200 },
    { clientId: clients[0].id, title: 'Airbus Summer Event', stage: 'confirmed', price: 3800, discount: 0 },
    { clientId: clients[1].id, title: 'Orange Kickoff 2026', stage: 'proposal_sent', price: 5200, discount: 300 },
    { clientId: clients[2].id, title: 'Vermeg Innovation Day', stage: 'completed', price: 3200, discount: 0 },
    { clientId: clients[3].id, title: 'Startup Weekend VR', stage: 'negotiating', price: 2800, discount: 500 },
    { clientId: clients[4].id, title: 'Poulina Annual Retreat', stage: 'completed', price: 6500, discount: 500 },
    { clientId: clients[4].id, title: 'Poulina Management Training', stage: 'confirmed', price: 4200, discount: 200 },
    { clientId: clients[5].id, title: 'Tunisair Crew Training VR', stage: 'prospect', price: 3500, discount: 0 },
  ];
  for (const d of dealData) {
    deals.push(await prisma.deal.create({ data: d }));
  }

  // ─── EVENTS ─────────────────────────────────────────────────────────────────
  const events = [];
  const now = new Date();
  const eventData = [
    { clientId: clients[0].id, experienceId: experiences[0].id, dealId: deals[0].id, operatorId: staff[0].id, startTime: daysAgo(45, 10), endTime: daysAgo(45, 12), status: 'completed', participants: 8, venueAddress: 'Airbus Factory, Ben Arous' },
    { clientId: clients[0].id, experienceId: experiences[4].id, dealId: deals[0].id, operatorId: staff[1].id, startTime: daysAgo(44, 14), endTime: daysAgo(44, 16), status: 'completed', participants: 6, venueAddress: 'Airbus Factory, Ben Arous' },
    { clientId: clients[2].id, experienceId: experiences[1].id, dealId: deals[3].id, operatorId: staff[0].id, startTime: daysAgo(30, 9), endTime: daysAgo(30, 11), status: 'completed', participants: 6, venueAddress: 'Technopole El Ghazala' },
    { clientId: clients[4].id, experienceId: experiences[2].id, dealId: deals[5].id, operatorId: staff[2].id, startTime: daysAgo(20, 10), endTime: daysAgo(20, 13), status: 'completed', participants: 12, venueAddress: 'Poulina HQ, Grombalia' },
    { clientId: clients[4].id, experienceId: experiences[5].id, dealId: deals[5].id, operatorId: staff[0].id, startTime: daysAgo(20, 14), endTime: daysAgo(20, 16), status: 'completed', participants: 8, venueAddress: 'Poulina HQ, Grombalia' },
    { clientId: clients[1].id, experienceId: experiences[3].id, operatorId: staff[1].id, startTime: daysAgo(10, 9), endTime: daysAgo(10, 11), status: 'completed', participants: 8, venueAddress: 'Orange Tower, Centre Urbain Nord' },
    // Upcoming events
    { clientId: clients[0].id, experienceId: experiences[0].id, dealId: deals[1].id, operatorId: staff[0].id, startTime: daysFromNow(3, 10), endTime: daysFromNow(3, 12), status: 'confirmed', participants: 8, venueAddress: 'Airbus Factory, Ben Arous' },
    { clientId: clients[3].id, experienceId: experiences[2].id, dealId: deals[4].id, operatorId: staff[2].id, startTime: daysFromNow(5, 14), endTime: daysFromNow(5, 17), status: 'confirmed', participants: 10, venueAddress: 'Carthage Innovation Hub' },
    { clientId: clients[4].id, experienceId: experiences[4].id, dealId: deals[6].id, operatorId: staff[1].id, startTime: daysFromNow(10, 9), endTime: daysFromNow(10, 12), status: 'draft', participants: 6, venueAddress: 'Poulina Training Center' },
    // Today's event
    { clientId: clients[1].id, experienceId: experiences[5].id, operatorId: staff[0].id, startTime: todayAt(14), endTime: todayAt(16), status: 'confirmed', participants: 6, venueAddress: 'Orange Tower, Centre Urbain Nord' },
  ];

  for (const e of eventData) {
    const event = await prisma.event.create({ data: e });
    events.push(event);
    // Assign hardware to each event
    const headsets = items.filter(i => i.name.includes('Quest'));
    const assignCount = Math.min(e.participants || 4, headsets.length);
    for (let i = 0; i < assignCount; i++) {
      await prisma.eventHardware.create({ data: { eventId: event.id, itemId: headsets[i].id, quantity: 1 } });
    }
    // Add staff
    await prisma.eventStaff.create({ data: { eventId: event.id, userId: e.operatorId, hoursWorked: (new Date(e.endTime) - new Date(e.startTime)) / 3600000, rateApplied: 25, totalCost: ((new Date(e.endTime) - new Date(e.startTime)) / 3600000) * 25 } });
  }

  // ─── LOGISTICS COSTS (for completed events) ────────────────────────────────
  for (const event of events.filter(e => e.status === 'completed' || e.status === 'confirmed')) {
    await prisma.eventLogisticsCost.create({ data: { eventId: event.id, category: 'transport', description: 'Van rental + fuel', amount: 80 + Math.floor(Math.random() * 120) } });
    if (Math.random() > 0.5) {
      await prisma.eventLogisticsCost.create({ data: { eventId: event.id, category: 'food', description: 'Team lunch', amount: 40 + Math.floor(Math.random() * 60) } });
    }
    if (Math.random() > 0.7) {
      await prisma.eventLogisticsCost.create({ data: { eventId: event.id, category: 'hotel', description: 'Overnight stay', amount: 120 + Math.floor(Math.random() * 80) } });
    }
  }

  // ─── CALCULATE COSTS FOR COMPLETED EVENTS ──────────────────────────────────
  for (const event of events.filter(e => e.status === 'completed')) {
    const full = await prisma.event.findUnique({
      where: { id: event.id },
      include: { hardware: { include: { item: { include: { type: true } } } }, staff: true, deal: true, logisticsCosts: true }
    });

    let experienceCost = 0;
    for (const eh of full.hardware) {
      const depPerUse = eh.item.depreciationPerUse || 0;
      experienceCost += depPerUse * eh.quantity;
    }
    let personnelCost = full.staff.reduce((s, st) => s + st.totalCost, 0);
    let transportCost = 0, foodCost = 0, hotelCost = 0, otherLogistics = 0;
    for (const lc of full.logisticsCosts) {
      if (lc.category === 'transport') transportCost += lc.amount;
      else if (lc.category === 'food') foodCost += lc.amount;
      else if (lc.category === 'hotel') hotelCost += lc.amount;
      else otherLogistics += lc.amount;
    }
    const logisticsTotal = transportCost + foodCost + hotelCost + otherLogistics;
    const totalCost = experienceCost + personnelCost + logisticsTotal;
    const revenue = full.deal ? (full.deal.price || 0) - (full.deal.discount || 0) : 0;
    const marginAmount = revenue - totalCost;
    const marginPct = revenue > 0 ? (marginAmount / revenue) * 100 : 0;

    await prisma.eventCost.create({
      data: { eventId: event.id, experienceCost, personnelCost, transportCost, foodCost, hotelCost, otherLogistics, logisticsTotal, totalCost, revenue, marginAmount, marginPct }
    });
  }

  // ─── INVOICES ───────────────────────────────────────────────────────────────
  const completedDeals = deals.filter(d => d.stage === 'completed');
  for (let i = 0; i < completedDeals.length; i++) {
    const d = completedDeals[i];
    const subtotal = (d.price || 0) - (d.discount || 0);
    const taxAmount = subtotal * 0.19;
    const totalAmount = subtotal + taxAmount;
    const isPaid = Math.random() > 0.3;
    await prisma.invoice.create({
      data: {
        invoiceNumber: `PG-INV-${String(i + 1).padStart(4, '0')}`,
        clientId: d.clientId, dealId: d.id,
        status: isPaid ? 'paid' : 'sent',
        issueDate: daysAgo(15 + i * 5, 9),
        dueDate: daysAgo(15 + i * 5 - 30, 9),
        subtotal, taxRate: 19, taxAmount, totalAmount,
        paidAmount: isPaid ? totalAmount : 0,
        paidAt: isPaid ? daysAgo(10 + i * 3, 9) : null,
        lineItems: { create: [{ description: d.title, quantity: 1, unitPrice: subtotal, total: subtotal }] }
      }
    });
  }

  // ─── FEEDBACK ───────────────────────────────────────────────────────────────
  const completedEvents = events.filter(e => e.status === 'completed');
  for (const event of completedEvents) {
    const full = await prisma.event.findUnique({ where: { id: event.id } });
    const rating = 3 + Math.floor(Math.random() * 3); // 3-5
    const comments = ['Great experience! Team loved it.', 'Very well organized, will book again.', 'Fun but a bit short.', 'Amazing! The VR quality was top notch.', 'Good overall, staff was professional.'];
    await prisma.eventFeedback.create({
      data: { eventId: event.id, clientId: full.clientId, rating, comment: comments[Math.floor(Math.random() * comments.length)] }
    });
  }

  // Update client satisfaction averages
  for (const client of clients) {
    const fb = await prisma.eventFeedback.findMany({ where: { clientId: client.id } });
    if (fb.length > 0) {
      const avg = fb.reduce((s, f) => s + f.rating, 0) / fb.length;
      await prisma.client.update({ where: { id: client.id }, data: { satisfactionAvg: avg } });
    }
  }

  // ─── MAINTENANCE LOG ────────────────────────────────────────────────────────
  await prisma.maintenanceLog.create({ data: { itemId: items[3].id, issue: 'Left controller drift detected', status: 'open' } });
  await prisma.maintenanceLog.create({ data: { itemId: items[6].id, issue: 'Fan noise — overheating warning', status: 'in_progress', resolvedById: admin.id } });

  console.log('Dummy data seeded!');
  console.log(`  ${clients.length} clients`);
  console.log(`  ${deals.length} deals`);
  console.log(`  ${events.length} events`);
  console.log(`  ${items.length} hardware items`);
  console.log(`  ${experiences.length} experiences`);
  console.log(`  ${staff.length} staff members`);
}

function daysAgo(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function daysFromNow(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function todayAt(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
