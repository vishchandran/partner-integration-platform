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

const requireStage = (condition, message) => {
  if (!condition) {
    throw new DomainError(message, "LIFECYCLE_PREREQUISITE_NOT_MET", 409);
  }
};

const recordTesting = (request, currentLifecycle) => {
  requireStage(
    currentLifecycle?.connectivity_status === "COMPLETED",
    "Connectivity must be completed before testing"
  );

  if (request.status === "PASSED") {
    const metrics = [
      request.totalTestCases,
      request.passed,
      request.failed,
      request.blocked
    ];
    const metricsAreNumbers = metrics.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    );
    const totalsMatch = request.passed + request.failed + request.blocked ===
      request.totalTestCases;

    if (
      !metricsAreNumbers ||
      !totalsMatch ||
      request.failed !== 0 ||
      request.blocked !== 0
    ) {
      throw new DomainError(
        "Passed testing requires consistent totals with no failed or blocked cases",
        "INVALID_TEST_RESULTS"
      );
    }
  }

  return { value: request, events: [] };
};

const recordCertification = (partnerId, request, currentLifecycle) => {
  if (request.status === "CERTIFIED") {
    requireStage(
      currentLifecycle?.testing_status === "PASSED",
      "Testing must pass before certification"
    );
    requireNonEmptyString(request.approver, "approver");
    if (!Array.isArray(request.certifiedProducts) || request.certifiedProducts.length === 0) {
      throw new DomainError(
        "certifiedProducts must contain at least one product",
        "INVALID_CERTIFICATION"
      );
    }
  }

  return {
    value: request,
    events: request.status === "CERTIFIED" ? [{
        eventType: "PARTNER_CERTIFIED",
        payload: {
          partnerId,
          certifiedProducts: request.certifiedProducts
        }
      }] : []
  };
};

const recordGoLive = (partnerId, request, currentLifecycle) => {
  if (request.status === "READY") {
    requireStage(
      currentLifecycle?.certification_status === "CERTIFIED",
      "Certification must be completed before go-live readiness"
    );
    requireStage(
      request.businessApproval === true &&
        request.technologyApproval === true &&
        request.operationsApproval === true &&
        request.rollbackPlanReady === true,
      "Go-live readiness requires all approvals and a ready rollback plan"
    );
  }

  return {
    value: request,
    events: request.status === "READY" ? [{
        eventType: "PARTNER_READY_FOR_GO_LIVE",
        payload: {
          partnerId,
          productionDate: request.productionDate
        }
      }] : []
  };
};

module.exports = {
  createPartner,
  changePartnerStatus,
  recordConnectivity,
  recordTesting,
  recordCertification,
  recordGoLive
};
