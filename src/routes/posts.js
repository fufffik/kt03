const express = require('express');
const { prisma, isPostgres } = require('../config');
const {
  validateId,
  validateCreatePost,
  validateUpdatePost,
  validatePostsQuery,
} = require('../middleware/validate');

const router = express.Router();

router.param('id', validateId);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const include = {
  author: { select: { id: true, email: true, name: true, role: true } },
  tags: true,
};

// Теги создаются или подключаются по имени (connectOrCreate), дубли убираем
const toConnectOrCreate = (tags) =>
  [...new Set(tags)].map((name) => ({ where: { name }, create: { name } }));

async function assertAuthorExists(res, authorId) {
  const author = await prisma.user.findUnique({ where: { id: authorId } });
  if (!author) {
    res.status(400).json({
      error: 'Validation failed',
      details: [{ field: 'authorId', message: `User with id ${authorId} not found` }],
    });
    return false;
  }
  return true;
}

// GET /api/posts — фильтрация (search, published, authorId) и пагинация
router.get(
  '/',
  validatePostsQuery,
  wrap(async (req, res) => {
    const { search, published, authorId, page, limit } = req.validatedQuery;

    const where = {};
    if (search) {
      where.title = isPostgres
        ? { contains: search, mode: 'insensitive' }
        : { contains: search };
    }
    if (published !== undefined) where.published = published;
    if (authorId !== undefined) where.authorId = authorId;

    const [total, data] = await prisma.$transaction([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        include,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    res.json({ data, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
  })
);

// GET /api/posts/:id — пост с автором и тегами
router.get(
  '/:id',
  wrap(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id }, include });
    if (!post) return res.status(404).json({ error: `Post with id ${req.params.id} not found` });
    res.json(post);
  })
);

// POST /api/posts
router.post(
  '/',
  validateCreatePost,
  wrap(async (req, res) => {
    const { title, content, published, authorId, tags = [] } = req.body;

    if (!(await assertAuthorExists(res, authorId))) return;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published,
        authorId,
        tags: { connectOrCreate: toConnectOrCreate(tags) },
      },
      include,
    });

    res.status(201).json(post);
  })
);

// PATCH /api/posts/:id
router.patch(
  '/:id',
  validateUpdatePost,
  wrap(async (req, res) => {
    const { tags, authorId, ...fields } = req.body;

    if (authorId !== undefined && !(await assertAuthorExists(res, authorId))) return;

    const data = { ...fields };
    if (authorId !== undefined) data.authorId = authorId;
    // Если переданы теги — заменяем весь набор тегов поста
    if (tags !== undefined) {
      data.tags = { set: [], connectOrCreate: toConnectOrCreate(tags) };
    }

    // P2025 (пост не найден) обработает errorHandler
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data,
      include,
    });

    res.json(post);
  })
);

// DELETE /api/posts/:id
router.delete(
  '/:id',
  wrap(async (req, res) => {
    await prisma.post.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

module.exports = router;
