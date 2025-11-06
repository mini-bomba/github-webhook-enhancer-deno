// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//

import { editWebhookMessage, emptyResponse, errorResponse, forwardToDiscord, RequestCtx, sendWebhookMessage } from "../responses.ts";
import { ReleaseEditedEvent, ReleaseEvent, ReleasePublishedEvent } from "@octokit/webhooks-types";

const release_messages = new Map<number, Promise<string>>();

export default async function handleReleaseEvent(ctx: RequestCtx): Promise<Response> {
  let event: ReleaseEvent;
  try {
    event = await ctx.request.json();
  } catch (e) {
    return errorResponse(e);
  }

  const newCtx: RequestCtx<ReleaseEvent> = {
    ...ctx,
    event_body: event,
  }

  switch (newCtx.event_body.action) {
    case "published":
      return await releasePublished(newCtx as RequestCtx<ReleasePublishedEvent>);
    case "edited":
      return await releaseEdited(newCtx as RequestCtx<ReleaseEditedEvent>);
    default:
      return await forwardToDiscord(ctx, JSON.stringify(event));
  }
}

async function releasePublished(ctx: RequestCtx<ReleasePublishedEvent>): Promise<Response> {
  const event = ctx.event_body;
  const releaseId = event.release.id;
  const messagePromise = sendWebhookMessage(ctx, [
    {
      author: {
        name: event.release.author.login,
        url: event.release.author.html_url,
        icon_url: event.release.author.avatar_url,
      },
      title: `[${event.repository.full_name}] New release published: ${event.release.name ?? event.release.tag_name}`,
      url: event.release.html_url,
      timestamp: event.release.published_at,
      description: event.release.body?.substring(0, 4096) ?? "",
    },
  ]);
  release_messages.set(releaseId, messagePromise);
  setTimeout(() => {
    release_messages.delete(releaseId);
  }, 15*60*1000)

  await messagePromise;
  return emptyResponse(204);
}

async function releaseEdited(ctx: RequestCtx<ReleaseEditedEvent>): Promise<Response> {
  const event = ctx.event_body

  const messagePromise = release_messages.get(event.release.id);
  if (messagePromise === undefined) return emptyResponse(204);
  const messageId = await messagePromise;

  await editWebhookMessage(ctx, messageId, [
    {
      author: {
        name: event.release.author.login,
        url: event.release.author.html_url,
        icon_url: event.release.author.avatar_url,
      },
      title: `[${event.repository.full_name}] New release published: ${event.release.name ?? event.release.tag_name}`,
      url: event.release.html_url,
      timestamp: event.release.published_at,
      description: event.release.body?.substring(0, 4096) ?? "",
    },
  ]);
  return emptyResponse(204);
}
