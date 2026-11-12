import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the compact organisation trigger uses a centered, decorative SVG chevron", () => {
  const header = readFileSync(new URL("../packages/react/header.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../packages/react/header.css", import.meta.url), "utf8");
  const trigger = header.match(/<Menu label="Organization menu"[^]*?trigger=\{\s*<>([^]*?)<\/>\s*\}/)?.[1];
  assert.ok(trigger, "The compact organisation menu must have a custom trigger.");
  assert.doesNotMatch(trigger, /⌄/u);
  assert.match(trigger, /<svg\b[^>]*className="allauth-organization-chevron"[^>]*>/u);
  const chevron = trigger.match(/<svg\b[^>]*>[^]*?<\/svg>/u)?.[0];
  assert.ok(chevron);
  assert.match(chevron, /\bwidth=\{14\}/u);
  assert.match(chevron, /\bheight=\{14\}/u);
  assert.match(chevron, /\bviewBox="0 0 24 24"/u);
  assert.match(chevron, /\baria-hidden="true"/u);
  assert.match(chevron, /\bfocusable="false"/u);
  assert.match(chevron, /\bd="m6 9 6 6 6-6"/u);
  assert.match(styles, /\.allauth-organization-chevron\s*\{[^}]*\bflex:\s*none\b/u);
});
