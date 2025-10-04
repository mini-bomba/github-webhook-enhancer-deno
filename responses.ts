// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//

import { DISCORD_RATE_LIMITER } from "./ratelimiting.ts";

export const baseResponse = (body?: BodyInit, status: number = 200, headers?: object) =>
  new Response(body, {
    status: status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });

export const emptyResponse = (status: number, headers?: object) => baseResponse(undefined, status, headers);

export const textResponse = (text: string, status: number = 200) =>
  baseResponse(text, status, {
    "Content-Type": "text/plain",
  });

export const redirect = (url: string) =>
  emptyResponse(302, {
    Location: url,
  });

export async function fetchResponse(request: Request | string, init?: RequestInit | undefined, rateLimitScope?: string) {
  const clonedRequest = new Request(request, init);
  let response: Response = rateLimitScope === undefined ? await fetch(clonedRequest) : await DISCORD_RATE_LIMITER.for(rateLimitScope).runTask(() => fetch(clonedRequest));
  response = new Response(response.body, response);
  response.headers.delete("Strict-Transport-Security");
  response.headers.set("Cache-Control", "no-store");
  return response;
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
