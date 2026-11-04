const DomainError = require("../../domain/errors/DomainError");
const logger = require("../../logger/logger");

const errorHandler = (err, req, res, next) => {
  logger.error({ err, path: req.path }, "Unhandled request error");

  if (err instanceof DomainError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code
    });
  }

  return res.status(500).json({ message: "Internal server error" });
};

module.exports = errorHandler;
