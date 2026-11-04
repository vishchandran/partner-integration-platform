class PostgresPartnerRepository {
  constructor(dependencies) {
    Object.assign(this, dependencies);
  }

  async create(partner) {
    const result = await this.pool.query(
      `INSERT INTO partners (partner_id, partner_name, status, requested_products)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [partner.partnerId, partner.partnerName, partner.status,
        JSON.stringify(partner.requestedProducts)]
    );
    return result.rows[0];
  }

  async findAll() {
    const result = await this.pool.query(
      `SELECT * FROM partners ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async findById(partnerId) {
    const result = await this.pool.query(
      `SELECT * FROM partners WHERE partner_id = $1`, [partnerId]
    );
    return result.rows[0];
  }

  async updateStatus(partnerId, status) {
    const result = await this.pool.query(
      `UPDATE partners SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE partner_id = $2 RETURNING *`,
      [status, partnerId]
    );
    return result.rows[0];
  }

  async findByStatus(status) {
    const result = await this.pool.query(
      `SELECT * FROM partners WHERE status = $1 ORDER BY created_at DESC`,
      [status]
    );
    return result.rows;
  }

  saveConnectivity(partnerId, request) {
    return this.connectivityRepository.saveConnectivity(partnerId, request);
  }

  saveTesting(partnerId, request) {
    return this.testingRepository.saveTesting(partnerId, request);
  }

  saveCertification(partnerId, request) {
    return this.certificationRepository.saveCertification(partnerId, request);
  }

  saveGoLive(partnerId, request) {
    return this.goLiveRepository.saveGoLive(partnerId, request);
  }

  getLifecycle(partnerId) {
    return this.partnerLifecycleRepository.getPartnerLifecycle(partnerId);
  }

  async getDashboardSummary() {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS total_partners,
       COUNT(*) FILTER (WHERE p.status = 'REQUESTED')::int AS requested,
       COUNT(*) FILTER (WHERE p.status = 'APPROVED')::int AS approved,
       COUNT(*) FILTER (WHERE cert.status = 'CERTIFIED')::int AS certified,
       COUNT(*) FILTER (WHERE gl.status = 'READY')::int AS production_ready
       FROM partners p
       LEFT JOIN LATERAL (
         SELECT status FROM partner_certification WHERE partner_id = p.partner_id
         ORDER BY updated_at DESC, id DESC LIMIT 1
       ) cert ON true
       LEFT JOIN LATERAL (
         SELECT status FROM partner_go_live WHERE partner_id = p.partner_id
         ORDER BY updated_at DESC, id DESC LIMIT 1
       ) gl ON true`
    );
    const summary = result.rows[0];
    return {
      totalPartners: summary.total_partners,
      requested: summary.requested,
      approved: summary.approved,
      certified: summary.certified,
      productionReady: summary.production_ready
    };
  }
}

module.exports = PostgresPartnerRepository;
