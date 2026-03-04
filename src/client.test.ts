import { assertEquals, assertRejects } from "@std/assert";

import { createSocket } from "./deps.ts";

const withTmpHome = async <T>(
  fn: (home: string) => Promise<T> | T,
): Promise<T> => {
  const originalHome = Deno.env.get("HOME");
  const home = await Deno.makeTempDir();
  Deno.env.set("HOME", home);
  try {
    return await fn(home);
  } finally {
    if (originalHome) {
      Deno.env.set("HOME", originalHome);
    } else {
      Deno.env.delete("HOME");
    }
    await Deno.remove(home, { recursive: true });
  }
};

const startMockDaemon = (
  responder: (
    message: string,
    remote: { address: string; port: number },
  ) => Uint8Array,
) => {
  const socket = createSocket("udp4");
  const ready = new Promise<number>((resolve, reject) => {
    socket.on("error", reject);
    socket.bind(0, "127.0.0.1", () => {
      const address = socket.address();
      if (typeof address === "string") {
        reject(new Error("unexpected address"));
        return;
      }
      resolve(address.port);
    });
  });

  socket.on("message", (msg, rinfo) => {
    const response = responder(new TextDecoder().decode(msg), rinfo);
    socket.send(response, rinfo.port, rinfo.address);
  });

  return {
    socket,
    port: ready,
    close: () => new Promise<void>((resolve) => socket.close(() => resolve())),
  };
};

Deno.test("sendMessage parses helper envelope payload", async () => {
  await withTmpHome(async () => {
    const { writeConfig } = await import("./utils.ts");
    const { ApplePasswordManager } = await import("./client.ts");
    const { Status } = await import("./const.ts");

    const daemon = startMockDaemon(() => {
      return new TextEncoder().encode(
        JSON.stringify({
          ok: true,
          code: 0,
          payload: {
            STATUS: Status.SUCCESS,
            Entries: [],
          },
        }),
      );
    });
    const port = await daemon.port;
    await writeConfig({
      username: "alice",
      sharedKey: 42n,
      port,
      host: "127.0.0.1",
    });
    const client = new ApplePasswordManager();
    const payload = await client.sendMessage({ cmd: 0 });
    assertEquals((payload as { STATUS?: number }).STATUS, Status.SUCCESS);
    await daemon.close();
  });
});

Deno.test("sendMessage maps malformed response JSON to protocol error", async () => {
  await withTmpHome(async () => {
    const { writeConfig } = await import("./utils.ts");
    const { APWError } = await import("./const.ts");
    const { ApplePasswordManager } = await import("./client.ts");

    const daemon = startMockDaemon(() => new TextEncoder().encode("not-json"));
    const port = await daemon.port;
    await writeConfig({
      username: "alice",
      sharedKey: 42n,
      port,
      host: "127.0.0.1",
    });
    const client = new ApplePasswordManager();

    await assertRejects(
      () => client.sendMessage({ cmd: 0 }, { timeoutMs: 500 }),
      APWError,
    );
    await daemon.close();
  });
});
