const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const startTestServer = async () => {
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

  const app = express();
  app.use(express.json());
  app.use("/partners", require("../routes/partnerRoutes"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`
  };
};

test("partner creation route preserves validation and response contract", async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const invalidResponse = await fetch(`${baseUrl}/partners`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(invalidResponse.status, 400);
    assert.deepEqual(await invalidResponse.json(), {
      message: "Validation failed",
      errors: ["partnerId is required", "partnerName is required"]
    });

    const createdResponse = await fetch(`${baseUrl}/partners`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ partnerId: "P-1", partnerName: "Partner One" })
    });
    assert.equal(createdResponse.status, 201);
    assert.deepEqual(await createdResponse.json(), {
      partner_id: "P-1",
      partner_name: "Partner One",
      status: "REQUESTED"
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
