const express = require('express');
const { prisma } = require('../config');
const {
  validateId,
  validateCreateUser,
  validateUpdateUser,
  validateUsersQuery,
} = require('../middleware/validate');

const router = express.Router();

router.param('id', validateId);

// Обёртка для async-обработчиков: ошибки уходят в errorHandler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/users — список с пагинацией
router.get(
  '/',
  validateUsersQuery,
  wrap(async (req, res) => {
    const { page, limit } = req.validatedQuery;

    const [total, data] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
      }),
    ]);

    res.json({ data, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
  })
);

// GET /api/users/:id — пользователь с постами (новые сверху)
router.get(
  '/:id',
  wrap(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        posts: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
      },
    });

    if (!user) return res.status(404).json({ error: `User with id ${req.params.id} not found` });
    res.json(user);
  })
);

// POST /api/users
router.post(
  '/',
  validateCreateUser,
  wrap(async (req, res) => {
    const user = await prisma.user.create({ data: req.body });
    res.status(201).json(user);
  })
);

// PATCH /api/users/:id
router.patch(
  '/:id',
  validateUpdateUser,
  wrap(async (req, res) => {
    // P2025 (не найден) и P2002 (email занят) обработает errorHandler
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(user);
  })
);

// DELETE /api/users/:id — вместе с постами пользователя
router.delete(
  '/:id',
  wrap(async (req, res) => {
    const id = req.params.id;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: `User with id ${id} not found` });

    await prisma.$transaction([
      prisma.post.deleteMany({ where: { authorId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    res.status(204).send();
  })
);

module.exports = router;
