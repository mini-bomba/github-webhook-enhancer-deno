// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2026 mini_bomba
//

import { discordWebhookResponse, emptyResponse, errorResponse, forwardToDiscord, RequestCtx } from "../responses.ts";
import { PullRequestEvent } from "@octokit/webhooks-types";

export default async function handlePREvent(ctx: RequestCtx): Promise<Response> {
  const {request} = ctx;
  let event: PullRequestEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  let action: string;
  let color: number;
  switch (event.action) {
    case "converted_to_draft":
      action = "Pull request converted to draft";
      color = 0x212830;
      break;
    case "ready_for_review":
      action = "Pull request marked as ready for review";
      color = 0xf6f8fa;
      break;
    case "reopened":
      action = "Pull request reopened";
      color = 0x1f883d;
      break;
    case "enqueued":
      action = "Pull request added to merge queue";
      color = 0xe89b00;
      break;
    case "dequeued":
      switch (event.reason) {
        case "MERGE":
          // dont care, will get a merge event soon
          return emptyResponse(204);
        case "MANUAL":
          action = "Pull request removed from merge queue";
          color = 0x704b00;
          break;
        default:
          action = `Pull request failed to merge (${event.reason})`;
          color = 0x73131b;
      }
      break;
    case "auto_merge_enabled":
      action = "Auto-merge enabled for pull request";
      color = 0x17632c;
      break;
    case "auto_merge_disabled":
      action = "Auto-merge disabled for pull request";
      color = 0xf6f8fa;
      break;
    case "closed":
      if (event.pull_request.merged) {
        action = "Pull request merged";
        color = 0x8250df;
      } else {
        action = "Pull request closed";
        color = 0xcf222e;
      }
      break;
    // some other action type we don't want to modify
    default:
      return await forwardToDiscord(ctx, JSON.stringify(event));
  }

  return await discordWebhookResponse(ctx, [
    {
      author: {
        name: event.sender.login,
        url: event.sender.html_url,
        icon_url: event.sender.avatar_url,
      },
      title: `[${event.repository.full_name}] ${action}: #${event.pull_request.number} ${event.pull_request.title}`,
      url: event.pull_request.html_url,
      color,
    },
  ]);
}
