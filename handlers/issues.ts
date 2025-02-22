// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//
import { errorResponse, fetchResponse } from "../responses.ts";
import { IssuesEvent } from "npm:@octokit/webhooks-types";

export default async function handleIssueEvent(request: Request, channel_id: string, webhook_url: string): Promise<Response> {
  let event: IssuesEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  let action: string;
  let color: number;
  switch (event.action) {
    case "reopened":
      action = "reopened";
      color = 0x1f883d;
      break;
    case "closed":
      action = `closed as ${event.issue.state_reason!.replaceAll("_", " ")}`;
      if (event.issue.state_reason === "not_planned") {
        color = 0x212830;
      } else {
        color = 0x8250df;
      }
      break;
    // some other action type we don't want to modify
    default:
      return await fetchResponse(`${webhook_url}/github`, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(event),
      }, channel_id);
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
        title: `[${event.repository.full_name}] Issue ${action}: #${event.issue.number} ${event.issue.title}`,
        url: event.issue.html_url,
        color,
      }],
    }),
  }, channel_id);
}
