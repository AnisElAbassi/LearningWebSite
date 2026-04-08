const express = require('express');
const handleError = require('../utils/handleError');
const router = express.Router();
const { prisma, authenticate, authorize, logActivity } = require('../middleware/auth');

// GET /api/roles
router.get('/', authenticate, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }
    });
    res.json(roles);
  } catch (err) {
    handleError(res, err, 'roles');
  }
});

// GET /api/roles/permissions
router.get('/permissions', authenticate, async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { slug: 'asc' }] });
    // Group them
    const grouped = {};
    for (const p of permissions) {
      if (!grouped[p.group]) grouped[p.group] = [];
      grouped[p.group].push(p);
    }
    res.json(grouped);
  } catch (err) {
    handleError(res, err, 'roles');
  }
});

// POST /api/roles
router.post('/', authenticate, authorize('users.manage_roles'), async (req, res) => {
  try {
    const { name, label, permissionIds } = req.body;
    const role = await prisma.role.create({
      data: {
        name, label,
        permissions: permissionIds ? { create: permissionIds.map(pid => ({ permissionId: pid })) } : undefined
      },
      include: { permissions: { include: { permission: true } } }
    });
    await logActivity(req.user.id, 'created', 'role', role.id, { name }, req.ip);
    res.status(201).json(role);
  } catch (err) {
    handleError(res, err, 'roles');
  }
});

// PUT /api/roles/:id
router.put('/:id', authenticate, authorize('users.manage_roles'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, label, permissionIds } = req.body;

    await prisma.role.update({ where: { id }, data: { name, label } });

    if (permissionIds) {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await prisma.rolePermission.createMany({
        data: permissionIds.map(pid => ({ roleId: id, permissionId: pid }))
      });
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } }
    });
    await logActivity(req.user.id, 'updated', 'role', id, { name }, req.ip);
    res.json(role);
  } catch (err) {
    handleError(res, err, 'roles');
  }
});

// DELETE /api/roles/:id
router.delete('/:id', authenticate, authorize('users.manage_roles'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userCount = await prisma.user.count({ where: { roleId: id } });
    if (userCount > 0) return res.status(400).json({ error: 'Cannot delete role with assigned users' });
    await prisma.role.delete({ where: { id } });
    await logActivity(req.user.id, 'deleted', 'role', id, null, req.ip);
    res.json({ message: 'Role deleted' });
  } catch (err) {
    handleError(res, err, 'roles');
  }
});

module.exports = router;
