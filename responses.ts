// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//

import assert from "node:assert";
import { DISCORD_RATE_LIMITER } from "./ratelimiting.ts";

export const baseResponse = (body?: BodyInit, status: number = 200, headers?: object): Response =>
  new Response(body, {
    status: status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });

export const emptyResponse = (status: number, headers?: object): Response => baseResponse(undefined, status, headers);

export const textResponse = (text: string, status: number = 200): Response =>
  baseResponse(text, status, {
    "Content-Type": "text/plain",
  });

export const redirect = (url: string) =>
  emptyResponse(302, {
    Location: url,
  });

export async function fetchResponse(request: Request | string | URL, init?: RequestInit | undefined, rateLimitScope?: string): Promise<Response> {
  const clonedRequest = new Request(request, init);
  let response: Response = rateLimitScope === undefined ? await fetch(clonedRequest) : await DISCORD_RATE_LIMITER.for(rateLimitScope).runTask(() => fetch(clonedRequest));
  response = new Response(response.body, response);
  response.headers.delete("Strict-Transport-Security");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function discordWebhookResponse(ctx: RequestCtx<unknown>, embeds: object[]): Promise<Response> {
  return await fetchResponse(ctx.webhook_url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({
      username: "GitHub",
      avatar_url: "https://cdn.discordapp.com/attachments/743515515799994489/996513463650226327/unknown.png",
      embeds,
    }),
  }, ctx.channel_id);
}

export async function sendWebhookMessage(ctx: RequestCtx<unknown>, embeds: object[]): Promise<string> {
  const resp = await discordWebhookResponse(ctx, embeds);
  const json = await resp.json();
  assert(typeof json === "object" && json !== null && "id" in json && typeof json.id === "string");
  return json.id;
}

export async function editWebhookMessage(ctx: RequestCtx<unknown>, message_id: string, embeds: object[]): Promise<Response> {
  const url = new URL(ctx.webhook_url);
  url.pathname += `/messages/${message_id}`;
  return await fetchResponse(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({
      embeds,
    }),
  })
}

export async function forwardToDiscord(ctx: RequestCtx<unknown>, payload: BodyInit): Promise<Response> {
  const url = new URL(ctx.webhook_url);
  url.pathname += "/github";
  return await fetchResponse(url, {
    method: "POST",
    headers: ctx.request.headers,
    body: payload,
  }, ctx.channel_id);
}

export function errorResponse(error: unknown, status: number = 400): Response {
  let message = "";
  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  }
  return textResponse(`Error while parsing input JSON: ${message}`, status);
}

export interface RequestCtx<Event = undefined> {
  request: Request;
  webhook_url: URL;
  channel_id: string;
  event_body: Event;
}
