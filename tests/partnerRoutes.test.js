const test = require("node:test");
const assert = require("node:assert/strict");

const loadCreatePartnerHandler = () => {
  const applicationPath = require.resolve("../composition/partnerApplication");
  require.cache[applicationPath] = {
    id: applicationPath,
    filename: applicationPath,
    loaded: true,
    exports: {
      createPartner: async (request) => ({
        partner_id: request.partnerId,
        partner_name: request.partnerName,
        status: "REQUESTED"
      })
    }
  };
  delete require.cache[require.resolve("../routes/partnerRoutes")];
  const router = require("../routes/partnerRoutes");
  const route = router.stack.find(
    (layer) => layer.route?.path === "/" && layer.route.methods.post
  );
  return route.route.stack[0].handle;
};

const buildResponse = () => {
  const result = {};
  return {
    result,
    response: {
      status(code) {
        result.status = code;
        return this;
      },
      json(body) {
        result.body = body;
        return this;
      }
    }
  };
};

test("partner creation route preserves validation and response contract", async () => {
  const handler = loadCreatePartnerHandler();
  const invalid = buildResponse();
  await handler({ body: {} }, invalid.response);
  assert.deepEqual(invalid.result, {
    status: 400,
    body: {
      message: "Validation failed",
      errors: ["partnerId is required", "partnerName is required"]
    }
  });

  const created = buildResponse();
  await handler({
    body: { partnerId: "P-1", partnerName: "Partner One" }
  }, created.response);
  assert.deepEqual(created.result, {
    status: 201,
    body: {
      partner_id: "P-1",
      partner_name: "Partner One",
      status: "REQUESTED"
    }
  });
});
