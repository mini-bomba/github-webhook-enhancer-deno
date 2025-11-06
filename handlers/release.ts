// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//

import { discordWebhookResponse, errorResponse, forwardToDiscord, RequestCtx } from "../responses.ts";
import { ReleaseEvent } from "@octokit/webhooks-types";

export default async function handleReleaseEvent(ctx: RequestCtx): Promise<Response> {
  let event: ReleaseEvent;
  try {
    event = await ctx.request.json();
  } catch (e) {
    return errorResponse(e);
  }

  if (event.action !== "published") { // Not published -> forward to discord
    return await forwardToDiscord(ctx, JSON.stringify(event));
  }

  // release published -> create new embed with more data
  return await discordWebhookResponse(ctx, [{
    author: {
      name: event.release.author.login,
      url: event.release.author.html_url,
      icon_url: event.release.author.avatar_url,
    },
    title: `[${event.repository.full_name}] New release published: ${event.release.name ?? event.release.tag_name}`,
    url: event.release.html_url,
    timestamp: event.release.published_at,
    description: event.release.body?.substring(0, 4096) ?? "",
  }])
}
