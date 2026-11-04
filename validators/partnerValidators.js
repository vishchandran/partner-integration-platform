const { PARTNER_STATUSES } = require("../domain/partner/partnerStatuses");

const validateRequiredString = (body, field, errors) => {
  if (
    typeof body[field] !== "string" ||
    body[field].trim().length === 0
  ) {
    errors.push(`${field} is required`);
  }
};

const validateBoolean = (body, field, errors) => {
  if (
    body[field] !== undefined &&
    typeof body[field] !== "boolean"
  ) {
    errors.push(`${field} must be a boolean`);
  }
};

const validateNumber = (body, field, errors) => {
  if (
    body[field] !== undefined &&
    (
      typeof body[field] !== "number" ||
      Number.isNaN(body[field]) ||
      body[field] < 0
    )
  ) {
    errors.push(`${field} must be a non-negative number`);
  }
};

const validatePartnerRequest = (body) => {
  const errors = [];

  validateRequiredString(body, "partnerId", errors);
  validateRequiredString(body, "partnerName", errors);

  if (
    body.requestedProducts !== undefined &&
    !Array.isArray(body.requestedProducts)
  ) {
    errors.push("requestedProducts must be an array");
  }

  return errors;
};

const validatePartnerStatusRequest = (body) => {
  const errors = [];

  if (!PARTNER_STATUSES.includes(body.status)) {
    errors.push(
      `status must be one of: ${PARTNER_STATUSES.join(", ")}`
    );
  }

  return errors;
};

const validateConnectivityRequest = (body) => {
  const errors = [];

  validateRequiredString(body, "status", errors);
  validateBoolean(body, "sandboxAccess", errors);
  validateBoolean(body, "ipWhitelisted", errors);
  validateBoolean(body, "certificateExchanged", errors);
  validateBoolean(body, "apiGatewayAccess", errors);

  return errors;
};

const validateTestingRequest = (body) => {
  const errors = [];

  validateRequiredString(body, "status", errors);
  validateNumber(body, "totalTestCases", errors);
  validateNumber(body, "passed", errors);
  validateNumber(body, "failed", errors);
  validateNumber(body, "blocked", errors);

  return errors;
};

const validateCertificationRequest = (body) => {
  const errors = [];

  validateRequiredString(body, "status", errors);

  if (
    body.certifiedProducts !== undefined &&
    !Array.isArray(body.certifiedProducts)
  ) {
    errors.push("certifiedProducts must be an array");
  }

  return errors;
};

const validateGoLiveRequest = (body) => {
  const errors = [];

  validateRequiredString(body, "status", errors);
  validateBoolean(body, "businessApproval", errors);
  validateBoolean(body, "technologyApproval", errors);
  validateBoolean(body, "operationsApproval", errors);
  validateBoolean(body, "rollbackPlanReady", errors);

  return errors;
};

module.exports = {
  validatePartnerRequest,
  validatePartnerStatusRequest,
  validateConnectivityRequest,
  validateTestingRequest,
  validateCertificationRequest,
  validateGoLiveRequest
};
