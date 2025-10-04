// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//
import {
  emptyResponse,
  errorResponse,
  fetchResponse,
  textResponse,
} from "../responses.ts";
import {
  PullRequestReviewEvent,
  PullRequestReviewSubmittedEvent,
} from "@octokit/webhooks-types";
import { reviews } from "./pull_request_review_comment.ts";
import { setTimeout } from "node:timers/promises";

export default async function handlePRReviewEvent(
  request: Request,
  channel_id: string,
  webhook_url: string,
): Promise<Response> {
  let event: PullRequestReviewEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  switch (event.action) {
    case "submitted": {
      return await handleReviewSubmitted(event, webhook_url, channel_id);
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

async function collectComments(review_id: number): Promise<number> {
  const review = reviews.getOrInsertWith(review_id, () => ({
    comments: new Map(),
  }));

  let more;
  let comment_count = 0;
  do {
    for (const [id, take] of review.comments.entries()) {
      comment_count++;
      take(true);
      review.comments.delete(id);
    }

    more =
      (await Promise.race([
        new Promise((res) => {
          review.wake = res;
        }),
        setTimeout(500, false),
      ])) || review.comments.size !== 0;
  } while (more);

  reviews.delete(review_id);
  return comment_count;
}

async function handleReviewSubmitted(
  event: PullRequestReviewSubmittedEvent,
  webhook_url: string,
  channel_id: string,
): Promise<Response> {
  // these are sent when a comment is added to the review
  // discord does not know this
  if (event.review.state === "commented" && event.review.body === null) {
    return emptyResponse(204);
  }

  let color;
  switch (event.review.state) {
    case "commented":
    case "dismissed":
      color = 0x212830;
      break;
    case "changes_requested":
      color = 0xfc2121;
      break
    case "approved":
      color = 0x009800;
      break;
  }

  const comments = await collectComments(event.review.id);
  const max_length = event.review.user.login.endsWith("[bot]") ? 256 : 4096;
  return await fetchResponse(
    webhook_url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify({
        username: "GitHub",
        avatar_url:
          "https://cdn.discordapp.com/attachments/743515515799994489/996513463650226327/unknown.png",
        embeds: [
          {
            author: {
              name: event.sender.login,
              url: event.sender.html_url,
              icon_url: event.sender.avatar_url,
            },
            title: `[${event.repository.full_name}] Pull request review submitted: #${event.pull_request.number} ${event.pull_request.title}`,
            description:
              event.review.body === null
                ? null
                : event.review.body.length < max_length
                  ? event.review.body
                  : `${event.review.body.substring(0, max_length - 3)}...`,
            url: event.pull_request.html_url,
            color,
            fields:
              comments > 0
                ? [
                    {
                      name: `+ ${comments} comments`,
                      value: "\u00A0",
                    },
                  ]
                : [],
          },
        ],
      }),
    },
    channel_id,
  );
}

async function handleReviewDismissed(
  event: PullRequestReviewEvent,
  webhook_url: string,
  channel_id: string,
): Promise<Response> {
  return await fetchResponse(
    webhook_url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify({
        username: "GitHub",
        avatar_url:
          "https://cdn.discordapp.com/attachments/743515515799994489/996513463650226327/unknown.png",
        embeds: [
          {
            author: {
              name: event.sender.login,
              url: event.sender.html_url,
              icon_url: event.sender.avatar_url,
            },
            title: `[${event.repository.full_name}] Pull request review dismissed: #${event.pull_request.number} ${event.pull_request.title}`,
            description: `**${event.sender.login}** dismissed **${event.review.user.login}**'s review`,
            url: event.pull_request.html_url,
            color: 0x212830,
          },
        ],
      }),
    },
    channel_id,
  );
}
