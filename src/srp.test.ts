import { assert, assertEquals, assertFalse } from "@std/assert";
import { Buffer } from "node:buffer";

Deno.test("isValidPakeMessage validates required SRP fields", async () => {
  const { isValidPakeMessage, parsePakeMessageType } = await import("./srp.ts");

  const valid = {
    TID: "user@example.com",
    MSG: 2,
    A: "0001",
    s: "0002",
    B: "0003",
    PROTO: 1,
    VER: "1",
    ErrCode: "0",
  };

  const invalid = {
    TID: "",
    MSG: "bad",
    A: "0001",
    s: "0002",
    B: "0003",
    PROTO: 1,
  };

  assert(isValidPakeMessage(valid));
  assertFalse(isValidPakeMessage(invalid as Record<string, unknown>));
  assertEquals(parsePakeMessageType("3"), 3);
});

Deno.test("verifyHAMK uses constant-time compare semantics", async () => {
  const { SRPSession } = await import("./srp.ts");

  const session = SRPSession.new(true);
  const first = new Uint8Array([1, 2, 3, 4]);
  const second = new Uint8Array([1, 2, 3, 4]);
  const third = new Uint8Array([1, 2, 3, 5]);

  assert(session.verifyHAMK(Buffer.from(first), Buffer.from(second)));
  assertFalse(session.verifyHAMK(Buffer.from(first), Buffer.from(third)));
});
