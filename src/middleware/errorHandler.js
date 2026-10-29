// 404 для несуществующих маршрутов
function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
}

// Перехват всех необработанных ошибок
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Некорректный JSON в теле запроса
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  // Известные ошибки Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    switch (err.code) {
      case 'P2002': {
        const target = Array.isArray(err.meta?.target) ? ` (${err.meta.target.join(', ')})` : '';
        return res.status(409).json({ error: `Record with this unique value already exists${target}` });
      }
      case 'P2025':
        return res.status(404).json({ error: 'Record not found' });
      case 'P2003':
        return res.status(400).json({ error: 'Related record does not exist' });
      default:
        break;
    }
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
  });
}

module.exports = { notFound, errorHandler };
