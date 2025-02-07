// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2025 mini_bomba
//
import { defaultHandler, eventHandlers } from "./handlers/index.ts";
import { emptyResponse, redirect, textResponse } from "./responses.ts";

interface Route {
  methods: string[];
  paths: URLPattern[];
  handler: (match: URLPatternResult, req: Request) => Promise<Response>;
}

const ROUTES: Route[] = [];
const NUMBER_REGEX = /^\d+$/;
const TOKEN_REGEX = /^[\w_-]+$/;
const HASH_REGEX = /^[\da-f]{40}$/;

async function statOrNull(path: string): Promise<Deno.FileInfo | null> {
  try {
    return await Deno.stat(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    throw error;
  }
}

async function getCurrentVersion(): Promise<string | null> {
  const gitDir = await statOrNull(".git");
  if (!gitDir?.isDirectory) return null;

  const head = (await Deno.readTextFile(".git/HEAD")).trim();
  if (HASH_REGEX.test(head)) return head;
  if (!head.startsWith("ref: ")) {
    console.warn("something's wrong with the .git dir, HEAD isn't a hash, and it isn't a ref either");
    return null;
  }

  const refName = head.substring(5);
  const ref = (await Deno.readTextFile(`.git/${refName}`)).trim();
  if (!HASH_REGEX.test(ref)) {
    console.warn(`something's wrong with the .git dir, ${refName} isn't a hash`);
    return null;
  }
  return ref;
}

const GIT_VERSION = getCurrentVersion().catch((e) => {
  console.warn("failed to get the git version!", e);
  return null;
});

ROUTES.push({
  methods: ["POST"],
  paths: [new URLPattern({ pathname: "{/api}?{/webhooks}?/:channel_id/:token{/github}?" })],
  handler: async (match: URLPatternResult, req: Request): Promise<Response> => {
    const { channel_id, token } = match.pathname.groups;
    if (
      channel_id == undefined ||
      token == undefined ||
      !NUMBER_REGEX.test(channel_id) ||
      !TOKEN_REGEX.test(token)
    ) {
      return textResponse("Invalid discord webhook ID/token", 401);
    }

    const webhook_url = `https://discord.com/api/webhooks/${channel_id}/${token}`;
    const event_name = req.headers.get("X-GitHub-Event") ?? "";

    return await (eventHandlers[event_name] ?? defaultHandler)(req, webhook_url);
  },
});

ROUTES.push({
  methods: ["GET"],
  paths: [new URLPattern({ pathname: "/version" })],
  handler: async () => textResponse(await GIT_VERSION ?? "idk bro"),
});
ROUTES.push({
  methods: ["GET"],
  paths: [new URLPattern({ pathname: "/source" })],
  handler: async () =>
    redirect(`https://github.com/mini-bomba/github-webhook-enhancer-deno/tree/${await GIT_VERSION ?? "master"}/`),
});
ROUTES.push({
  methods: ["GET"],
  paths: [new URLPattern({ pathname: "/" })],
  handler: () => Promise.resolve(redirect("https://github.com/mini-bomba/github-webhook-enhancer-deno")),
});

export async function requestHandler(req: Request): Promise<Response> {
  for (const route of ROUTES) {
    if (route.methods.includes(req.method)) {
      for (const pattern of route.paths) {
        const match = pattern.exec(req.url);
        if (match) {
          return await route.handler(match, req);
        }
      }
    }
  }
  return emptyResponse(404);
}

if (import.meta.main) {
  const unixPath = Deno.env.get("GWE_LISTEN_UNIX");
  if (unixPath !== undefined) {
    const stat = await statOrNull(unixPath);
    if (stat?.isSocket) await Deno.remove(unixPath);
    Deno.serve({
      path: unixPath,
      handler: requestHandler,
      async onListen({ path }) {
        await Deno.chmod(path, 0o777);
        console.log(`Listening on ${path}`);
      },
    });
  }
  const tcpHost = Deno.env.get("GWE_LISTEN_HOST");
  const tcpPort = Number(Deno.env.get("GWE_LISTEN_PORT"));
  if (unixPath === undefined || tcpHost !== undefined || !isNaN(tcpPort)) {
    Deno.serve({ hostname: tcpHost ?? "0.0.0.0", port: isNaN(tcpPort) ? 8000 : tcpPort, handler: requestHandler });
  }
}
