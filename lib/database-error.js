export function getDatabaseFailure(error, fallback) {
  if (error?.code === 'ER_ACCESS_DENIED_ERROR') {
    return {
      message: 'Aiven menolak akses database. Periksa DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, dan DB_NAME di .env.local atau Vercel.',
      status: 503,
    };
  }

  return { message: fallback, status: 500 };
}
