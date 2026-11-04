class DomainError extends Error {
  constructor(message, code = "DOMAIN_RULE_VIOLATION") {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

module.exports = DomainError;
