import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createAllAuthProxy } from "@allauth/react/next";

const origin = "https://app.example";
const prefix = "__Secure-allauth_project_mfa-fixture.";
const options = { project: "mfa-fixture", proxySecret: "a".repeat(64), appOrigin: origin };
const context = (endpoint: string) => ({ params: Promise.resolve({ all: endpoint.split("/") }) });
const request = (endpoint: string, method = "GET", cookie = "", requestOrigin = origin) => new Request(`${origin}/api/allauth/${endpoint}`, { method, headers: { origin: requestOrigin, cookie, "content-type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify({ code: "123456", method: "totp" }) } : {}) });
const authorized = "https://allauth.co/api/auth/oauth2/authorize?client_id=fixture&redirect_uri=https%3A%2F%2Fapp.example%2Fapi%2Fallauth%2Fcallback%2Fallauth";

test("broker MFA is opt-in and its new browser proof remains HttpOnly", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ url: authorized, redirect: true }));
  const legacy = await createAllAuthProxy(options)(request("sign-in/social", "POST"), context("sign-in/social"));
  assert.equal((await legacy.json() as { url: string }).url, authorized);
  assert.deepEqual(legacy.headers.getSetCookie(), []);
  const proxy = createAllAuthProxy({ ...options, brokerTwoFactor: { signInUrl: "/login" } });
  const response = await proxy(request("sign-in/social", "POST"), context("sign-in/social"));
  const data = await response.json() as { url: string };
  const url = new URL(data.url);
  assert.equal(url.searchParams.get("allauth_mfa"), "app-v1");
  const cookie = response.headers.getSetCookie().find(value => value.startsWith(`${prefix}broker_mfa_binding=`))!;
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Lax/);
  const binding = cookie.split(";", 1)[0]!.split("=")[1]!;
  assert.equal(url.searchParams.get("allauth_mfa_binding"), createHash("sha256").update(binding).digest("hex"));
  assert.equal(data.url.includes(binding), false);
});

test("handoff acceptance requires the initiating cookie and strips the ticket from navigation", async () => {
  const proxy = createAllAuthProxy({ ...options, brokerTwoFactor: { signInUrl: "/login" } });
  const endpoint = `broker-two-factor/accept?ticket=${"c".repeat(64)}`;
  assert.equal((await proxy(request(endpoint), context("broker-two-factor/accept"))).status, 400);
  const response = await proxy(request(endpoint, "GET", `${prefix}broker_mfa_binding=${"d".repeat(64)}`), context("broker-two-factor/accept"));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `${origin}/login?challenge=broker-two-factor`);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.getSetCookie()[0]!, /HttpOnly/);
});

test("broker verification rejects cross-site POSTs and an unrelated completion destination", async t => {
  const proxy = createAllAuthProxy({ ...options, brokerTwoFactor: { signInUrl: "/login" } });
  const fetcher = t.mock.method(globalThis, "fetch", async () => Response.json({ url: "https://foreign.example/steal" }));
  const denied = await proxy(request("broker-two-factor/verify", "POST", "", "https://foreign.example"), context("broker-two-factor/verify"));
  assert.equal(denied.status, 403); assert.equal(fetcher.mock.callCount(), 0);
  const rejected = await proxy(request("broker-two-factor/verify", "POST"), context("broker-two-factor/verify"));
  assert.equal(rejected.status, 502);
  assert.equal((await rejected.text()).includes("foreign.example"), false);
  assert.deepEqual(rejected.headers.getSetCookie(), []);
});
