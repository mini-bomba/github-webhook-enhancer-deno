// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//
import { errorResponse, fetchResponse } from "../responses.ts";
import { PullRequestEvent } from "npm:@octokit/webhooks-types";

export default async function handlePREvent(request: Request, webhook_url: string): Promise<Response> {
  let event: PullRequestEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  let action: string;
  let color: number;
  switch(event.action) {
    case "converted_to_draft":
      action = "converted to draft";
      color = 0x212830;
      break;
    case "ready_for_review":
      action = "ready for review";
      color = 0xf6f8fa;
      break;
    case "reopened":
      action = "reopened";
      color = 0x1f883d;
      break;
    case "closed":
      if (event.pull_request.merged) {
        action = "merged"
        color = 0x8250df;
      } else {
        action = "closed";
        color = 0xcf222e;
      }
      break;
    // some other action type we don't want to modify
    default:
      return await fetchResponse(`${webhook_url}/github`, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(event),
      });
  }

  return await fetchResponse(webhook_url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({
      username: "GitHub",
      avatar_url: "https://cdn.discordapp.com/attachments/743515515799994489/996513463650226327/unknown.png",
      embeds: [{
        author: {
          name: event.sender.login,
          url: event.sender.html_url,
          icon_url: event.sender.avatar_url,
        },
        title: `[${event.repository.full_name}] Pull request ${action}: #${event.pull_request.number} ${event.pull_request.title}`,
        url: event.pull_request.html_url,
        color,
      }],
    }),
  });
}

