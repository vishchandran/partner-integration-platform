const DomainError = require("../errors/DomainError");
const { PARTNER_STATUSES } = require("./partnerStatuses");

const requireNonEmptyString = (value, field) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DomainError(`${field} is required`, "INVALID_PARTNER");
  }
};

const createPartner = (request) => {
  requireNonEmptyString(request.partnerId, "partnerId");
  requireNonEmptyString(request.partnerName, "partnerName");

  return {
    partnerId: request.partnerId,
    partnerName: request.partnerName,
    status: "REQUESTED",
    requestedProducts: request.requestedProducts || []
  };
};

const changePartnerStatus = (status) => {
  if (!PARTNER_STATUSES.includes(status)) {
    throw new DomainError(
      `status must be one of: ${PARTNER_STATUSES.join(", ")}`,
      "INVALID_PARTNER_STATUS"
    );
  }

  return status;
};

const recordConnectivity = (request) => ({
  value: request,
  events: []
});

const recordTesting = (request) => ({
  value: request,
  events: []
});

const recordCertification = (partnerId, request) => ({
  value: request,
  events: request.status === "CERTIFIED"
    ? [{
        eventType: "PARTNER_CERTIFIED",
        payload: {
          partnerId,
          certifiedProducts: request.certifiedProducts
        }
      }]
    : []
});

const recordGoLive = (partnerId, request) => ({
  value: request,
  events: request.status === "READY"
    ? [{
        eventType: "PARTNER_READY_FOR_GO_LIVE",
        payload: {
          partnerId,
          productionDate: request.productionDate
        }
      }]
    : []
});

module.exports = {
  createPartner,
  changePartnerStatus,
  recordConnectivity,
  recordTesting,
  recordCertification,
  recordGoLive
};
