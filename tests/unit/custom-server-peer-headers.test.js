// custom-server.js is the only thing that makes x-kr-real-ip trustworthy. Boot a real
// HTTP server through it and confirm a client cannot smuggle its own peer headers in.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import http from "node:http";
import { __test__ as requestDetails } from "@/lib/db/repos/requestDetailsRepo.js";

const require = createRequire(import.meta.url);

let server;
let baseUrl;
let seenHeaders;

beforeAll(async () => {
  require("../../custom-server.js");
  server = http.createServer((req, res) => {
    seenHeaders = req.headers;
    res.end("ok");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function get(headers = {}) {
  await fetch(baseUrl, { headers });
  return seenHeaders;
}

describe("custom-server peer header sanitizing", () => {
  it("generates a peer trust token at boot", () => {
    expect(process.env.KEYROUTER_PEER_TOKEN).toMatch(/^[0-9a-f]{48}$/);
  });

  it("replaces a client-supplied x-kr-real-ip with the socket address", async () => {
    const headers = await get({ "x-kr-real-ip": "203.0.113.55" });

    expect(headers["x-kr-real-ip"]).toMatch(/^(::ffff:)?127\.0\.0\.1$/);
  });

  it("stamps the trust token so downstream can tell the wrapper ran", async () => {
    const headers = await get();

    expect(headers["x-kr-peer-token"]).toBe(process.env.KEYROUTER_PEER_TOKEN);
  });

  it("drops a client-supplied peer trust token", async () => {
    const headers = await get({ "x-kr-peer-token": "forged-token" });

    expect(headers["x-kr-peer-token"]).toBe(process.env.KEYROUTER_PEER_TOKEN);
    expect(headers["x-kr-peer-token"]).not.toBe("forged-token");
  });

  it("drops a client-supplied x-kr-via-proxy marker", async () => {
    const headers = await get({ "x-kr-via-proxy": "1" });

    expect(headers["x-kr-via-proxy"]).toBeUndefined();
  });

  it("marks via-proxy and adopts the forwarded IP for a loopback proxy hop", async () => {
    const headers = await get({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });

    expect(headers["x-kr-via-proxy"]).toBe("1");
    expect(headers["x-kr-real-ip"]).toBe("203.0.113.9");
    expect(headers["x-forwarded-for"]).toBeUndefined();
  });

  // chat.js snapshots every client header into the request detail. Anything that grants
  // access must not survive into a record the dashboard renders and cloud sync uploads.
  it("keeps the peer token out of persisted request details", () => {
    const sanitized = requestDetails.sanitizeHeaders({
      "x-kr-peer-token": "secret",
      "x-kr-cli-token": "secret",
      "authorization": "Bearer sk-x",
      "x-kr-real-ip": "127.0.0.1",
    });

    expect(sanitized["x-kr-peer-token"]).toBeUndefined();
    expect(sanitized["x-kr-cli-token"]).toBeUndefined();
    expect(sanitized["authorization"]).toBeUndefined();
    expect(sanitized["x-kr-real-ip"]).toBe("127.0.0.1");
  });
});
