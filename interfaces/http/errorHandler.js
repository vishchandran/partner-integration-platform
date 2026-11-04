const DomainError = require("../../domain/errors/DomainError");
const logger = require("../../logger/logger");

const errorHandler = (err, req, res, next) => {
  if (err instanceof DomainError) {
    logger.warn(
      { code: err.code, path: req.path },
      "Request rejected by domain rule"
    );
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code
    });
  }

  logger.error({ err, path: req.path }, "Unhandled request error");
  return res.status(500).json({ message: "Internal server error" });
};

module.exports = errorHandler;
