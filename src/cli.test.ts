import { assertEquals, assertThrows } from "@std/assert";

import { createCLI, normalizePin, sanitizeUrl } from "./cli.ts";
Deno.test("normalizePin enforces six numeric digits", () => {
  assertEquals(normalizePin("012345"), "012345");
  assertThrows(() => normalizePin("12345"));
  assertThrows(() => normalizePin("0000001"));
  assertThrows(() => normalizePin("12a456"));
});

Deno.test("sanitizeUrl validates URLs and preserves entry", () => {
  assertEquals(sanitizeUrl("example.com"), "example.com");
  assertEquals(sanitizeUrl("https://example.com"), "https://example.com");
  assertThrows(() => sanitizeUrl(""));
  assertThrows(() => sanitizeUrl("://bad"));
});

Deno.test("CLI command constructors are stable", () => {
  const command = createCLI();
  assertEquals(typeof command.parse, "function");
});
