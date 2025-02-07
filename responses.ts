// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//

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

export async function fetchResponse(request: Request | string, init?: RequestInit | Request) {
  let response: Response = await fetch(request, init);
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
