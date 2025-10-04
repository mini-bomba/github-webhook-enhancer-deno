// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2025 mini_bomba
//
import { fetchResponse } from "../responses.ts";
import handleIssueEvent from "./issues.ts";
import handlePREvent from "./pull_request.ts";
import handlePRReviewEvent from "./pull_request_review.ts";
import handleReviewCommentEvent from "./pull_request_review_comment.ts";
import handleReleaseEvent from "./release.ts";

export const eventHandlers: Record<
  string,
  (req: Request, channel_id: string, webhook_url: string) => Promise<Response>
> = {
  issues: handleIssueEvent,
  pull_request: handlePREvent,
  pull_request_review: handlePRReviewEvent,
  pull_request_review_comment: handleReviewCommentEvent,
  release: handleReleaseEvent,
};

export async function defaultHandler(
  req: Request,
  channel_id: string,
  webhook_url: string,
) {
  return await fetchResponse(
    `${webhook_url}/github`,
    {
      method: req.method,
      headers: req.headers,
      body: await req.blob(),
    },
    channel_id,
  );
}
