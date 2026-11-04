const crypto = require("crypto");

const OUTBOX_TOPIC = "partner-lifecycle-events";

const stageStatements = {
  CONNECTIVITY: {
    sql: `INSERT INTO partner_connectivity
      (partner_id, status, sandbox_access, ip_whitelisted,
       certificate_exchanged, api_gateway_access, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (partner_id) DO UPDATE SET
        status = EXCLUDED.status,
        sandbox_access = EXCLUDED.sandbox_access,
        ip_whitelisted = EXCLUDED.ip_whitelisted,
        certificate_exchanged = EXCLUDED.certificate_exchanged,
        api_gateway_access = EXCLUDED.api_gateway_access,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
    values: (partnerId, value) => [
      partnerId, value.status, value.sandboxAccess, value.ipWhitelisted,
      value.certificateExchanged, value.apiGatewayAccess, value.notes
    ]
  },
  TESTING: {
    sql: `INSERT INTO partner_testing
      (partner_id, status, total_test_cases, passed, failed, blocked, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (partner_id) DO UPDATE SET
        status = EXCLUDED.status,
        total_test_cases = EXCLUDED.total_test_cases,
        passed = EXCLUDED.passed,
        failed = EXCLUDED.failed,
        blocked = EXCLUDED.blocked,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
    values: (partnerId, value) => [
      partnerId, value.status, value.totalTestCases, value.passed,
      value.failed, value.blocked, value.notes
    ]
  },
  CERTIFICATION: {
    sql: `INSERT INTO partner_certification
      (partner_id, status, certified_products, certification_date,
       approver, notes)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (partner_id) DO UPDATE SET
        status = EXCLUDED.status,
        certified_products = EXCLUDED.certified_products,
        certification_date = EXCLUDED.certification_date,
        approver = EXCLUDED.approver,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
    values: (partnerId, value, now) => [
      partnerId, value.status, JSON.stringify(value.certifiedProducts || []),
      value.certificationDate || now, value.approver, value.notes
    ]
  },
  GO_LIVE: {
    sql: `INSERT INTO partner_go_live
      (partner_id, status, production_date, business_approval,
       technology_approval, operations_approval, rollback_plan_ready, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (partner_id) DO UPDATE SET
        status = EXCLUDED.status,
        production_date = EXCLUDED.production_date,
        business_approval = EXCLUDED.business_approval,
        technology_approval = EXCLUDED.technology_approval,
        operations_approval = EXCLUDED.operations_approval,
        rollback_plan_ready = EXCLUDED.rollback_plan_ready,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
    values: (partnerId, value, now) => [
      partnerId, value.status, value.productionDate || now,
      value.businessApproval, value.technologyApproval,
      value.operationsApproval, value.rollbackPlanReady, value.notes
    ]
  }
};

class PostgresPartnerRepository {
  constructor({
    pool,
    partnerLifecycleRepository,
    clock = () => new Date(),
    randomUUID = () => crypto.randomUUID()
  }) {
    this.pool = pool;
    this.partnerLifecycleRepository = partnerLifecycleRepository;
    this.clock = clock;
    this.randomUUID = randomUUID;
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

  async saveLifecycleStage({ partnerId, stage, value, events }) {
    const statement = stageStatements[stage];
    if (!statement) throw new Error(`Unsupported lifecycle stage: ${stage}`);

    const client = await this.pool.connect();
    const now = this.clock().toISOString();

    try {
      await client.query("BEGIN");
      const result = await client.query(
        statement.sql,
        statement.values(partnerId, value, now)
      );
      const state = result.rows[0];

      await client.query(
        `INSERT INTO partner_lifecycle_history
         (partner_id, stage, status, details) VALUES ($1,$2,$3,$4)`,
        [partnerId, stage, value.status, JSON.stringify(value)]
      );

      const persistedEvents = [];
      for (const domainEvent of events) {
        const event = this.buildEvent(domainEvent, state, now);
        await this.persistEvent(client, event);
        persistedEvents.push(event);
      }

      await client.query("COMMIT");
      return { state, events: persistedEvents };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  buildEvent(domainEvent, state, publishedAt) {
    const payload = { ...domainEvent.payload };
    if (domainEvent.eventType === "PARTNER_READY_FOR_GO_LIVE") {
      payload.productionDate = state.production_date;
    }

    return {
      eventId: `EVT-${this.randomUUID()}`,
      correlationId: payload.correlationId || `CORR-${this.randomUUID()}`,
      eventType: domainEvent.eventType,
      payload,
      publishedAt
    };
  }

  async persistEvent(client, event) {
    await client.query(
      `INSERT INTO partner_events
       (event_id, correlation_id, event_type, payload, published_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [event.eventId, event.correlationId, event.eventType,
        JSON.stringify(event.payload), event.publishedAt]
    );
    await client.query(
      `INSERT INTO event_outbox (event_id, topic, event_type, payload, status)
       VALUES ($1,$2,$3,$4,'PENDING')`,
      [event.eventId, OUTBOX_TOPIC, event.eventType, JSON.stringify(event)]
    );
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
