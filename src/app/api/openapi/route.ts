export const dynamic = "force-static";

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "ERPAIO API",
    version: "1.0.0",
    description: "Türkçe doğal dil → ERP SQL sorgusu üretimi, anomaly detection, alert dispatch.",
    contact: { email: "support@erpaio.com" },
  },
  servers: [{ url: "https://erpaio.vercel.app" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" } } },
      ChatResponse: {
        type: "object",
        properties: {
          sql: { type: "string" },
          results: { type: "array", items: { type: "object" } },
          columns: { type: "array", items: { type: "string" } },
          total: { type: "integer" },
          truncated: { type: "boolean" },
          rowLimit: { type: "integer" },
          latencyMs: { type: "integer" },
          sessionId: { type: "string" },
          messageId: { type: "string" },
          cacheHit: { type: "boolean" },
        },
      },
    },
  },
  paths: {
    "/api/auth/mobile-login": {
      post: {
        summary: "Mobile / API token login",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                  deviceName: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Token returned" },
          "401": { description: "Invalid credentials" },
          "429": { description: "Rate limit" },
        },
      },
    },
    "/api/me": {
      get: { summary: "Current user + tenant", responses: { "200": { description: "User info" } } },
    },
    "/api/chat": {
      post: {
        summary: "Türkçe soru → SQL → execute",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["question", "connectionId"],
                properties: {
                  question: { type: "string", maxLength: 500 },
                  connectionId: { type: "string" },
                  sessionId: { type: "string" },
                  forceRun: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Result", content: { "application/json": { schema: { $ref: "#/components/schemas/ChatResponse" } } } },
          "400": { description: "Invalid input" },
          "402": { description: "Token budget exhausted" },
          "429": { description: "Rate limit" },
        },
      },
    },
    "/api/chat/feedback": {
      patch: {
        summary: "Sorgu feedback (👍/👎)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["messageId", "feedback"], properties: { messageId: { type: "string" }, feedback: { type: "integer", enum: [1, -1] } } } } },
        },
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/alerts": {
      get: { summary: "Alert listesi", parameters: [{ name: "status", in: "query", schema: { type: "string", enum: ["open", "acknowledged"] } }], responses: { "200": { description: "Alerts" } } },
      post: { summary: "Manuel alert oluştur", responses: { "200": { description: "Created" } } },
      patch: { summary: "Alert acknowledge", responses: { "200": { description: "Updated" } } },
    },
    "/api/scheduled-reports": {
      get: { summary: "Scheduled reports listesi", responses: { "200": { description: "Reports" } } },
      post: { summary: "Yeni rapor oluştur", responses: { "200": { description: "Created" } } },
    },
    "/api/watchlists": {
      get: { summary: "Watchlists", responses: { "200": { description: "Watchlists" } } },
      post: { summary: "Yeni watchlist", responses: { "200": { description: "Created" } } },
    },
    "/api/integrations": {
      get: { summary: "Slack/Teams/webhook integrations", responses: { "200": { description: "Integrations" } } },
      post: { summary: "Integration ekle", responses: { "200": { description: "Saved" } } },
    },
    "/api/analytics/forecast": {
      get: {
        summary: "Metric forecast (next N days, linear regression + 95% CI)",
        parameters: [
          { name: "metricKey", in: "query", required: true, schema: { type: "string" } },
          { name: "steps", in: "query", schema: { type: "integer", default: 7 } },
        ],
        responses: { "200": { description: "Forecast" } },
      },
    },
    "/api/health": {
      get: { summary: "Health check", security: [], responses: { "200": { description: "Healthy" }, "503": { description: "Degraded" } } },
    },
  },
};

export async function GET() {
  return Response.json(SPEC, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
