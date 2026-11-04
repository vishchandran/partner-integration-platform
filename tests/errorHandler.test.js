const test = require("node:test");
const assert = require("node:assert/strict");
const DomainError = require("../domain/errors/DomainError");
const loggerPath = require.resolve("../logger/logger");
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: { error: () => {} }
};
const errorHandler = require("../interfaces/http/errorHandler");

test("domain prerequisite errors are returned as conflict responses", () => {
  const response = {};
  const res = {
    status(code) {
      response.status = code;
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    }
  };

  errorHandler(
    new DomainError(
      "Connectivity must be completed before testing",
      "LIFECYCLE_PREREQUISITE_NOT_MET",
      409
    ),
    { path: "/partners/P-1/testing" },
    res
  );

  assert.deepEqual(response, {
    status: 409,
    body: {
      message: "Connectivity must be completed before testing",
      code: "LIFECYCLE_PREREQUISITE_NOT_MET"
    }
  });
});
