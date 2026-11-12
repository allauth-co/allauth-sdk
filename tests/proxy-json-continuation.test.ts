import assert from "node:assert/strict";
import test from "node:test";
import { createAllAuthProxy } from "@allauth/react/next";

const project = "fixture-app";
const origin = "https://app.example";
const createProxy = () => createAllAuthProxy({ project, proxySecret: "a".repeat(64), appOrigin: origin });
const context = (path: string) => ({ params: Promise.resolve({ all: path.split("/") }) });

test("the SDK proxy keeps a native MFA challenge inside JSON sign-in", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, {
    status: 302,
    headers: {
      location: `${origin}/sign-in?challenge=two-factor&callbackUrl=%2Faccount`,
      "set-cookie": "__Secure-allauth_project_fixture-app.two_factor=pending; Domain=allauth.co; Path=/api/auth; Secure; HttpOnly",
    },
  }));
  const result = await createProxy()(new Request(`${origin}/api/allauth/sign-in/email`, {
    method: "POST",
    headers: { origin, accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ callbackURL: `${origin}/account` }),
  }), context("sign-in/email"));
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("location"), null);
  assert.deepEqual(result.headers.getSetCookie(), ["__Secure-allauth_project_fixture-app.two_factor=pending; Path=/; Secure; HttpOnly"]);
  assert.deepEqual(await result.json(), { twoFactorRedirect: true });
});

test("headless email verification receives its exact callback while email links still redirect", async (t) => {
  const destination = `${origin}/account?from=verification`;
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 302, headers: { location: destination } }));
  const query = new URLSearchParams({ token: "fixture", callbackURL: destination });
  const path = `${origin}/api/allauth/verify-email?${query}`;
  const proxy = createProxy();
  const json = await proxy(new Request(path, { headers: { accept: "application/json" } }), context("verify-email"));
  assert.equal(json.status, 200);
  assert.equal(json.headers.get("location"), null);
  assert.deepEqual(await json.json(), { redirect: true, url: destination, status: true, user: null });
  const link = await proxy(new Request(path, { headers: { accept: "text/html" } }), context("verify-email"));
  assert.equal(link.status, 302);
  assert.equal(link.headers.get("location"), destination);
});
