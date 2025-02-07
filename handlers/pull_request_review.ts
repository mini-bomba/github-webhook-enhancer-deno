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

  // these are sent when a comment is added to the review
  // discord does not know this
  if (event.review.state === "commented" && event.review.body === null) {
    return emptyResponse(204);
  }

  return await fetchResponse(`${webhook_url}/github`, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(event),
  });
}
