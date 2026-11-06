import assert from "node:assert/strict";
import test from "node:test";
import { createAllAuthProxy } from "@allauth/react/next";

const origin = "https://support.example";
const main = "https://app.example";
const project = "support-fixture";
const prefix = `__Secure-allauth_project_${project}.`;
const context = (endpoint: string) => ({ params: Promise.resolve({ all: endpoint.split("/") }) });
const request = (endpoint: string, cookie = "", method = "GET") => new Request(`${origin}/api/allauth/${endpoint}`, {
  method, headers: { cookie, origin }, ...(method === "POST" ? { body: "{}" } : {}),
});
function cookies(previous: string, response: Response) {
  const jar = new Map(previous.split("; ").filter(Boolean).map((pair) => { const at = pair.indexOf("="); return [pair.slice(0, at), pair.slice(at + 1)] as const; }));
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";", 1)[0]; const at = pair.indexOf("=");
    if (/Max-Age=0(?:;|$)/i.test(value)) jar.delete(pair.slice(0, at)); else jar.set(pair.slice(0, at), pair.slice(at + 1));
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

test("isolated support preserves safe native actor binding and returns only its configured main-app destination", async (t) => {
  let active = true;
  const display = { session: { id: "support-session", expiresAt: new Date(Date.now() + 600_000).toISOString() }, user: { id: "target", email: "target@example.test", name: "Target" }, actor: { id: "actor", email: "actor@example.test", name: "Actor" }, actorKind: "application", actorSessionId: "original-main-session", applicationAuditId: "audit-1", context: { kind: "company", id: "company-1" }, applicationReturnURL: `${main}/admin`, consoleReturnURL: "https://allauth.co/admin/users?project=support-fixture" };
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname; const sent = new Headers(init?.headers).get("cookie") || "";
    assert.equal(sent.includes("main-origin-cookie"), false, "main-app credentials must never be copied into the support origin");
    if (path.endsWith("/get-session")) return Response.json(active && sent.includes("target-cookie") ? { session: { id: "support-session", expiresAt: display.session.expiresAt, impersonatedBy: "actor" }, user: { id: "target" } } : null);
    if (path.endsWith("/sdk/support/exchange")) {
      const response = Response.json(display);
      response.headers.append("set-cookie", `${prefix}session_token=target-cookie; HttpOnly; Secure; Path=/; SameSite=Lax`);
      response.headers.append("set-cookie", `${prefix}dont_remember=fixture-flag; HttpOnly; Secure; Path=/; SameSite=Lax`);
      return response;
    }
    if (path.endsWith("/sdk/support/session")) return Response.json(active ? display : null);
    if (path.endsWith("/sdk/support/stop")) { active = false; return Response.json({ success: true, applicationReturnURL: `${main}/admin`, consoleReturnURL: display.consoleReturnURL }); }
    throw new Error("Unexpected SDK endpoint");
  });
  const proxy = createAllAuthProxy({ project, proxySecret: "a".repeat(64), appOrigin: origin, supportAccess: { enabled: true, applicationReturnUrl: `${main}/admin` } });
  const started = await proxy(request(`support/start?launch=${"l".repeat(43)}`), context("support/start")); assert.equal(started.status, 302);
  const state = new URL(started.headers.get("location")!).searchParams.get("state");
  const stateCookie = cookies("", started);
  const connected = await proxy(request(`support/callback?code=${"c".repeat(43)}&state=${state}`, stateCookie), context("support/callback")); assert.equal(connected.status, 303);
  const targetCookie = cookies(stateCookie, connected);
  const status = await proxy(request("support/session", targetCookie), context("support/session")); const data = await status.json();
  assert.deepEqual(data.support.context, { kind: "company", id: "company-1" });
  assert.equal(data.support.actorKind, "application"); assert.equal(data.support.actorSessionId, "original-main-session"); assert.equal(data.support.applicationAuditId, "audit-1"); assert.equal(data.support.applicationReturnURL, `${main}/admin`);
  assert.equal(JSON.stringify(data).includes("target-cookie"), false);
  const stopped = await proxy(request("support/stop", targetCookie, "POST"), context("support/stop"));
  assert.equal((await stopped.json()).applicationReturnURL, `${main}/admin`); assert.equal(cookies(targetCookie, stopped), "");
});

test("application support rejects an unsafe return configuration and never browser-exposes service authority", async () => {
  for (const applicationReturnUrl of [`${origin}/admin`, `${main}/account`, `${main}/admin?next=external`]) assert.throws(() => createAllAuthProxy({ project, proxySecret: "a".repeat(64), appOrigin: origin, supportAccess: { enabled: true, applicationReturnUrl } }));
  const proxy = createAllAuthProxy({ project, proxySecret: "a".repeat(64), appOrigin: origin, supportAccess: { enabled: true, applicationReturnUrl: `${main}/admin` } });
  for (const endpoint of ["sdk/support/application/launch", "sdk/support/application/authorize", "sdk/support/application/revoke", "service-directory/users"]) assert.equal((await proxy(request(endpoint), context(endpoint))).status, 404);
});
