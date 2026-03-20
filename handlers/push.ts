// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2026 mini_bomba
//

import {
  emptyResponse,
  errorResponse,
  forwardToDiscord,
  RequestCtx,
} from "../responses.ts";
import { PushEvent } from "@octokit/webhooks-types";

export default async function handlePush(ctx: RequestCtx): Promise<Response> {
  const { request } = ctx;
  let event: PushEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  if (event.ref.startsWith("refs/heads/gh-readonly-queue/")) {
    // silence the merge queue
    return emptyResponse(204);
  }

  // let discord handle this
  return await forwardToDiscord(ctx, JSON.stringify(event));
}
