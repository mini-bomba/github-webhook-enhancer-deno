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
  handler: () => Promise.resolve(textResponse("idk bro")),
});
ROUTES.push({
  methods: ["GET"],
  paths: [new URLPattern({ pathname: "/source" })],
  handler: () => Promise.resolve(redirect("https://github.com/mini-bomba/github-webhook-enhancer-deno")),
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
  Deno.serve(requestHandler);
}
