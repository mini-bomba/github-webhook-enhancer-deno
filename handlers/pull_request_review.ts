// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//
import { emptyResponse, errorResponse, fetchResponse, textResponse } from "../responses.ts";
import { PullRequestReviewEvent } from "npm:@octokit/webhooks-types";

export default async function handlePRReviewEvent(request: Request, channel_id: string, webhook_url: string): Promise<Response> {
  let event: PullRequestReviewEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  switch (event.action) {
    case "submitted": {
      return await handleReviewSubmitted(event, request, webhook_url, channel_id);
    }
    case "edited": {
      // don't care
      return emptyResponse(204);
    }
    case "dismissed": {
      return await handleReviewDismissed(event, webhook_url, channel_id);
    }
    default: {
      return textResponse("how did we get here?", 500);
    }
  }
}

async function handleReviewSubmitted(
  event: PullRequestReviewEvent,
  request: Request,
  webhook_url: string,
  channel_id: string,
): Promise<Response> {
  // these are sent when a comment is added to the review
  // discord does not know this
  if (event.review.state === "commented") {
    if (event.review.body === null) {
      return emptyResponse(204);
    }
    const max_length = event.review.user.id === 65095814 ? 256 : 4096;
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
          description: event.review.body.length < max_length ? event.review.body : `${event.review.body.substring(0, max_length-3)}...`,
          url: event.pull_request.html_url,
          color: 0x212830,
        }],
      }),
    }, channel_id);
  }

  return await fetchResponse(`${webhook_url}/github`, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(event),
  }, channel_id);
}

async function handleReviewDismissed(event: PullRequestReviewEvent, webhook_url: string, channel_id: string): Promise<Response> {
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
          `[${event.repository.full_name}] Pull request review dismissed: #${event.pull_request.number} ${event.pull_request.title}`,
        description: `**${event.sender.login}** dismissed **${event.review.user.login}**'s review`,
        url: event.pull_request.html_url,
        color: 0x212830,
      }],
    }),
  }, channel_id);
}
