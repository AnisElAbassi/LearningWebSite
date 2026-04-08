/**
 * Centralized error handler — logs full error server-side,
 * returns a safe message to the client.
 */
function handleError(res, err, context = '') {
  const isDev = process.env.NODE_ENV !== 'production';
  const prefix = context ? `[${context}] ` : '';
  console.error(`${prefix}${err.message}`, err.stack);

  // Prisma known errors — return a useful but safe message
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }

  res.status(500).json({
    error: isDev ? err.message : 'Internal server error. Please try again.',
  });
}

module.exports = handleError;
