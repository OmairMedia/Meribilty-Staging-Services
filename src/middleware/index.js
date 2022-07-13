function checkApiKey(req, res, next) {
  if (req.headers['x-access-token']) {
    if (
      req.headers['x-access-token']
      == 'c13b2e50e12241663fb9299e1472dfb615326243'
    ) {
      next();
    } else {
      res.json({
        status: true,
        error: 'Invalid x-access-token ! ',
      });
    }
  } else {
    res.json({
      status: false,
      error: 'Key Not Found In header',
    });
  }
}

function notFound(req, res, next) {
  res.status(404);
  const error = new Error(`🔍 - Not Found - ${req.originalUrl}`);
  next(error);
}

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  /* eslint-enable no-unused-vars */
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
}

module.exports = {
  checkApiKey,
  notFound,
  errorHandler,
};
