/**
 * Application-owned contract for operational audit records.
 * Implementations provide append(partnerId, action, details) and
 * findByPartnerId(partnerId).
 */
module.exports = Object.freeze({
  name: "AuditRepository"
});
