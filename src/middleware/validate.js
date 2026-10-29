const Joi = require('joi');

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

// ---------- Пользователи ----------
const createUserSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  name: Joi.string().trim().min(1).max(100).required(),
  role: Joi.string().valid('USER', 'ADMIN'),
});

const updateUserSchema = Joi.object({
  email: Joi.string().trim().email(),
  name: Joi.string().trim().min(1).max(100),
  role: Joi.string().valid('USER', 'ADMIN'),
}).min(1);

const usersQuerySchema = Joi.object({ ...pagination });

// ---------- Посты ----------
const tagsSchema = Joi.array().items(Joi.string().trim().min(1).max(50)).max(20);

const createPostSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  content: Joi.string().allow('', null),
  published: Joi.boolean(),
  authorId: Joi.number().integer().positive().required(),
  tags: tagsSchema,
});

const updatePostSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200),
  content: Joi.string().allow('', null),
  published: Joi.boolean(),
  authorId: Joi.number().integer().positive(),
  tags: tagsSchema,
}).min(1);

const postsQuerySchema = Joi.object({
  search: Joi.string().trim().allow(''),
  published: Joi.boolean(),
  authorId: Joi.number().integer().positive(),
  ...pagination,
});

// Фабрика middleware: validate(schema, 'body' | 'query')
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => ({
          field: d.path.join('.') || source,
          message: d.message,
        })),
      });
    }

    // Результат валидации (с приведёнными типами и значениями по умолчанию)
    if (source === 'query') req.validatedQuery = value;
    else req.body = value;
    next();
  };
}

// Проверка параметра :id (подключается через router.param)
function validateId(req, res, next, raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{ field: 'id', message: '"id" must be a positive integer' }],
    });
  }
  req.params.id = id;
  next();
}

module.exports = {
  validateId,
  validateCreateUser: validate(createUserSchema),
  validateUpdateUser: validate(updateUserSchema),
  validateUsersQuery: validate(usersQuerySchema, 'query'),
  validateCreatePost: validate(createPostSchema),
  validateUpdatePost: validate(updatePostSchema),
  validatePostsQuery: validate(postsQuerySchema, 'query'),
};
