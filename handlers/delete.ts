// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2026 mini_bomba
//

import { emptyResponse, errorResponse, forwardToDiscord, RequestCtx } from "../responses.ts";
import { DeleteEvent } from "../types.ts";

export default async function handleDeleteEvent(ctx: RequestCtx): Promise<Response> {
  let event: DeleteEvent;
  try {
    event = await ctx.request.json();
  } catch (e) {
    return errorResponse(e);
  }

  if (event.ref.startsWith("refs/heads/gh-readonly-queue/")) {
    // silence the merge queue
    return emptyResponse(204);
  }

  return await forwardToDiscord(ctx, JSON.stringify(event));
}
