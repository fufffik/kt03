require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL || '';

module.exports = {
  port: process.env.PORT || 3000,
  // PostgreSQL поддерживает mode: 'insensitive', SQLite — нет (там LIKE и так нечувствителен к регистру для ASCII)
  isPostgres: databaseUrl.startsWith('postgres'),
  // Единый экземпляр Prisma Client на всё приложение
  prisma: new PrismaClient(),
};
