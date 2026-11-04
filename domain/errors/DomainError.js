class DomainError extends Error {
  constructor(message, code = "DOMAIN_RULE_VIOLATION", statusCode = 422) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

module.exports = DomainError;
