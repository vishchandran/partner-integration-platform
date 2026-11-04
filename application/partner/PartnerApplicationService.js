const lifecycle = require("../../domain/partner/partnerLifecycle");

class PartnerApplicationService {
  constructor({ partnerRepository, auditRepository, eventPublisher }) {
    this.partnerRepository = partnerRepository;
    this.auditRepository = auditRepository;
    this.eventPublisher = eventPublisher;
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
      save: (value) => this.partnerRepository.saveConnectivity(partnerId, value),
      auditAction: "CONNECTIVITY_UPDATED",
      responseKey: "connectivity"
    });
  }

  async updateTestingStatus(partnerId, request) {
    return this.updateLifecycleStage({
      partnerId,
      request,
      decide: lifecycle.recordTesting,
      save: (value) => this.partnerRepository.saveTesting(partnerId, value),
      auditAction: "TESTING_UPDATED",
      responseKey: "testing"
    });
  }

  async updateCertificationStatus(partnerId, request) {
    return this.updateLifecycleStage({
      partnerId,
      request,
      decide: (value) => lifecycle.recordCertification(partnerId, value),
      save: (value) => this.partnerRepository.saveCertification(partnerId, value),
      auditAction: "CERTIFICATION_UPDATED",
      responseKey: "certification"
    });
  }

  async updateGoLiveStatus(partnerId, request) {
    return this.updateLifecycleStage({
      partnerId,
      request,
      decide: (value) => lifecycle.recordGoLive(partnerId, value),
      save: (value) => this.partnerRepository.saveGoLive(partnerId, value),
      auditAction: "GO_LIVE_UPDATED",
      responseKey: "goLive",
      mapEvents: (events, saved) => events.map((event) => ({
        ...event,
        payload: {
          ...event.payload,
          productionDate: saved.production_date
        }
      }))
    });
  }

  async updateLifecycleStage({
    partnerId,
    request,
    decide,
    save,
    auditAction,
    responseKey,
    mapEvents = (events) => events
  }) {
    const partner = await this.partnerRepository.findById(partnerId);

    if (!partner) {
      return null;
    }

    const decision = decide(request);
    const saved = await save(decision.value);

    this.auditRepository.append(partnerId, auditAction, request);

    for (const event of mapEvents(decision.events, saved)) {
      await this.eventPublisher.publish(event.eventType, event.payload);
    }

    return {
      partnerId,
      [responseKey]: saved
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
