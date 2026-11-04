const events = require("../store/eventStore");
const crypto = require("crypto");
const kafkaProducer = require("../kafka/kafkaProducer");
const eventRepository = require("../repositories/eventRepository");
const outboxRepository = require("../repositories/outboxRepository");
const deadLetterRepository = require("../repositories/deadLetterRepository");

const topic = "partner-lifecycle-events";
const maxOutboxAttempts = 3;

const deliverEvent = async (event) => {
  try {
    await kafkaProducer.publishKafkaEvent(
      topic,
      event
    );

    await outboxRepository.markPublished(event.eventId);
  } catch (error) {
    await outboxRepository.markFailed(event.eventId, error);
    throw error;
  }
};

const publishEvent = async (eventType, payload) => {
 const event = {
  eventId: `EVT-${crypto.randomUUID()}`,
  correlationId: payload.correlationId || `CORR-${crypto.randomUUID()}`,
  eventType,
  payload,
  publishedAt: new Date().toISOString()
};

  events.push(event);
  await eventRepository.saveEvent(event);
  await outboxRepository.saveOutboxEvent(event, topic);

  try {
    await deliverEvent(event);
  } catch (error) {
    console.error(
      "Failed to publish event to Kafka",
      error.message
    );
  }

  return event;
};

const dispatchPersistedEvent = async (event) => {
  try {
    await deliverEvent(event);
  } catch (error) {
    console.error(
      "Failed to publish persisted event to Kafka",
      error.message
    );
  }
};

const retryPendingEvents = async () => {
  const pendingEvents = await outboxRepository.getPendingEvents();
  const results = [];

  for (const outboxEvent of pendingEvents) {
    const event = outboxEvent.payload;

    if (outboxEvent.attempts >= maxOutboxAttempts) {
      await deadLetterRepository.saveDeadLetter({
        eventId: outboxEvent.event_id,
        source: "OUTBOX",
        topic: outboxEvent.topic,
        eventType: outboxEvent.event_type,
        payload: event,
        error: new Error(
          outboxEvent.last_error || "Maximum outbox attempts reached"
        )
      });
      await outboxRepository.markDeadLettered(outboxEvent.event_id);
      results.push({
        eventId: outboxEvent.event_id,
        status: "DEAD_LETTERED"
      });
      continue;
    }

    try {
      await deliverEvent(event);
      results.push({
        eventId: outboxEvent.event_id,
        status: "PUBLISHED"
      });
    } catch (error) {
      results.push({
        eventId: outboxEvent.event_id,
        status: "FAILED",
        error: error.message
      });
    }
  }

  return results;
};

const getEvents = async() => {
  return await eventRepository.getEvents();
};

module.exports = {
  publishEvent,
  dispatchPersistedEvent,
  retryPendingEvents,
  getEvents
};
