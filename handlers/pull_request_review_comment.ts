// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2025 mini_bomba
//

import { PullRequestReviewCommentEvent } from "@octokit/webhooks-types";
import { emptyResponse, errorResponse, fetchResponse } from "../responses.ts";
import { ExtendedMap } from "@solvro/utils/map";
import { setTimeout } from "node:timers/promises";

export interface PendingReview {
  wake?: (new_comments: true) => void;
  comments: Map<number, (merged: true) => void>;
}

export const reviews = new ExtendedMap<number, PendingReview>();

export default async function handleReviewCommentEvent(
  request: Request,
  channel_id: string,
  webhook_url: string,
): Promise<Response> {
  let event: PullRequestReviewCommentEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  if (event.action !== "created") {
    // don't care
    return emptyResponse(204);
  }

  const merged = await Promise.race([
    new Promise((resolve) => {
      const review = reviews.getOrInsertWith(
        event.comment.pull_request_review_id,
        () => ({
          comments: new Map(),
        }),
      );

      review.comments.set(event.comment.id, resolve);
      review.wake?.(true);
    }),
    setTimeout(500, false),
  ]);

  // cleanup
  const review = reviews.get(event.comment.pull_request_review_id);
  if (review !== undefined) {
    review.comments.delete(event.comment.id);
    if (review.wake === undefined && review.comments.size === 0) {
      reviews.delete(event.comment.pull_request_review_id);
    }
  }

  if (merged) {
    return emptyResponse(204);
  }

  return await fetchResponse(
    `${webhook_url}/github`,
    {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(event),
    },
    channel_id,
  );
}
