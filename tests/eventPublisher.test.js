const test = require("node:test");
const assert = require("node:assert/strict");

const mockModule = (path, exports) => {
  const resolved = require.resolve(path);

  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports
  };
};

const loadPublisher = ({
  kafkaPublish,
  pendingEvents = []
} = {}) => {
  const savedEvents = [];
  const savedOutbox = [];
  const published = [];
  const deadLetters = [];
  const marked = [];

  mockModule("../repositories/eventRepository", {
    saveEvent: async (event) => {
      savedEvents.push(event);
      return event;
    },
    getEvents: async () => savedEvents
  });

  mockModule("../repositories/outboxRepository", {
    saveOutboxEvent: async (event, topic) => {
      savedOutbox.push({
        event,
        topic
      });
      return {
        event_id: event.eventId
      };
    },
    markPublished: async (eventId) => {
      marked.push({
        eventId,
        status: "PUBLISHED"
      });
    },
    markFailed: async (eventId, error) => {
      marked.push({
        eventId,
        status: "FAILED",
        error: error.message
      });
    },
    getPendingEvents: async () => pendingEvents,
    markDeadLettered: async (eventId) => {
      marked.push({
        eventId,
        status: "DEAD_LETTERED"
      });
    }
  });

  mockModule("../repositories/deadLetterRepository", {
    saveDeadLetter: async (deadLetter) => {
      deadLetters.push(deadLetter);
      return deadLetter;
    }
  });

  mockModule("../kafka/kafkaProducer", {
    publishKafkaEvent: async (topic, event) => {
      published.push({
        topic,
        event
      });

      if (kafkaPublish) {
        await kafkaPublish(topic, event);
      }
    }
  });

  delete require.cache[require.resolve("../events/eventPublisher")];
  const publisher = require("../events/eventPublisher");

  return {
    publisher,
    savedEvents,
    savedOutbox,
    published,
    deadLetters,
    marked
  };
};

test("publishEvent creates UUID-backed event ids and writes the outbox", async () => {
  const {
    publisher,
    savedEvents,
    savedOutbox,
    published,
    marked
  } = loadPublisher();

  const event = await publisher.publishEvent(
    "PARTNER_CERTIFIED",
    {
      partnerId: "P-1"
    }
  );

  assert.match(
    event.eventId,
    /^EVT-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  );
  assert.equal(savedEvents.length, 1);
  assert.equal(savedOutbox.length, 1);
  assert.equal(savedOutbox[0].topic, "partner-lifecycle-events");
  assert.equal(published.length, 1);
  assert.deepEqual(marked, [
    {
      eventId: event.eventId,
      status: "PUBLISHED"
    }
  ]);
});

test("retryPendingEvents moves exhausted outbox events to the DLQ", async () => {
  const pendingEvent = {
    event_id: "EVT-dead",
    topic: "partner-lifecycle-events",
    event_type: "PARTNER_CERTIFIED",
    payload: {
      eventId: "EVT-dead",
      eventType: "PARTNER_CERTIFIED"
    },
    attempts: 3,
    last_error: "broker unavailable"
  };

  const {
    publisher,
    deadLetters,
    marked
  } = loadPublisher({
    pendingEvents: [pendingEvent]
  });

  const results = await publisher.retryPendingEvents();

  assert.deepEqual(results, [
    {
      eventId: "EVT-dead",
      status: "DEAD_LETTERED"
    }
  ]);
  assert.equal(deadLetters.length, 1);
  assert.equal(deadLetters[0].source, "OUTBOX");
  assert.equal(marked.at(-1).status, "DEAD_LETTERED");
});

test("dispatchPersistedEvent delivers without writing a second outbox record", async () => {
  const { publisher, savedEvents, savedOutbox, published, marked } =
    loadPublisher();
  const event = {
    eventId: "EVT-persisted",
    eventType: "PARTNER_CERTIFIED",
    payload: { partnerId: "P-1" }
  };

  await publisher.dispatchPersistedEvent(event);

  assert.equal(savedEvents.length, 0);
  assert.equal(savedOutbox.length, 0);
  assert.deepEqual(published[0].event, event);
  assert.deepEqual(marked, [{
    eventId: "EVT-persisted",
    status: "PUBLISHED"
  }]);
});
