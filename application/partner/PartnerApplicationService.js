const lifecycle = require("../../domain/partner/partnerLifecycle");

class PartnerApplicationService {
  constructor({ partnerRepository, auditRepository, eventDispatcher }) {
    this.partnerRepository = partnerRepository;
    this.auditRepository = auditRepository;
    this.eventDispatcher = eventDispatcher;
  }

  async createPartner(request) {
    const partner = lifecycle.createPartner(request);
    const existing = await this.partnerRepository.findById(partner.partnerId);

    if (existing) {
      return {
        error: true,
        statusCode: 409,
        message: "Partner already exists"
      };
    }

    return this.partnerRepository.create(partner);
  }

  getPartners() {
    return this.partnerRepository.findAll();
  }

  getPartnerById(partnerId) {
    return this.partnerRepository.findById(partnerId);
  }

  async updatePartnerStatus(partnerId, status) {
    return this.partnerRepository.updateStatus(
      partnerId,
      lifecycle.changePartnerStatus(status)
    );
  }

  getPartnersByStatus(status) {
    return this.partnerRepository.findByStatus(status);
  }

  async updateConnectivityStatus(partnerId, request) {
    return this.updateLifecycleStage({
      partnerId,
      request,
      decide: lifecycle.recordConnectivity,
      stage: "CONNECTIVITY",
      auditAction: "CONNECTIVITY_UPDATED",
      responseKey: "connectivity"
    });
  }

  async updateTestingStatus(partnerId, request) {
    return this.updateLifecycleStage({
      partnerId,
      request,
      decide: lifecycle.recordTesting,
      stage: "TESTING",
      auditAction: "TESTING_UPDATED",
      responseKey: "testing"
    });
  }

  async updateCertificationStatus(partnerId, request) {
    return this.updateLifecycleStage({
      partnerId,
      request,
      decide: (value, current) =>
        lifecycle.recordCertification(partnerId, value, current),
      stage: "CERTIFICATION",
      auditAction: "CERTIFICATION_UPDATED",
      responseKey: "certification"
    });
  }

  async updateGoLiveStatus(partnerId, request) {
    return this.updateLifecycleStage({
      partnerId,
      request,
      decide: (value, current) =>
        lifecycle.recordGoLive(partnerId, value, current),
      stage: "GO_LIVE",
      auditAction: "GO_LIVE_UPDATED",
      responseKey: "goLive"
    });
  }

  async updateLifecycleStage({
    partnerId,
    request,
    decide,
    stage,
    auditAction,
    responseKey
  }) {
    const partner = await this.partnerRepository.findById(partnerId);

    if (!partner) {
      return null;
    }

    const currentLifecycle = await this.partnerRepository.getLifecycle(partnerId);
    const decision = decide(request, currentLifecycle);
    const transaction = await this.partnerRepository.saveLifecycleStage({
      partnerId,
      stage,
      value: decision.value,
      events: decision.events
    });

    this.auditRepository.append(partnerId, auditAction, request);

    for (const event of transaction.events) {
      await this.eventDispatcher.dispatch(event);
    }

    return {
      partnerId,
      [responseKey]: transaction.state
    };
  }

  getDashboardSummary() {
    return this.partnerRepository.getDashboardSummary();
  }

  getAuditHistory(partnerId) {
    return this.auditRepository.findByPartnerId(partnerId);
  }

  getPartnerLifecycle(partnerId) {
    return this.partnerRepository.getLifecycle(partnerId);
  }
}

module.exports = PartnerApplicationService;
