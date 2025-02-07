// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//
import { emptyResponse, errorResponse, fetchResponse } from "../responses.ts";
import { PullRequestReviewEvent } from "npm:@octokit/webhooks-types";

export default async function handlePRReviewEvent(request: Request, webhook_url: string): Promise<Response> {
  let event: PullRequestReviewEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  // not needed, sometimes sent right after a "submitted" event
  if (event.action === "edited") return emptyResponse(204);

  // these are sent when a comment is added to the review
  // discord does not know this
  if (event.review.state === "commented") {
    if (event.review.body === null) {
      return emptyResponse(204);
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
          title:
            `[${event.repository.full_name}] Pull request review submitted: #${event.pull_request.number} ${event.pull_request.title}`,
          description: event.review.body.length < 4096 ? event.review.body : `${event.review.body.substring(0, 4090)}...`,
          url: event.pull_request.html_url,
          color: 0x212830,
        }],
      }),
    });
  }

  return await fetchResponse(`${webhook_url}/github`, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(event),
  });
}
