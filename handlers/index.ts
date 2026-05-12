// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2025 mini_bomba
//

import { emptyResponse, forwardToDiscord, RequestCtx } from "../responses.ts";
import handleCheckRun from "./check_run.ts";
import handleIssueEvent from "./issues.ts";
import handlePREvent from "./pull_request.ts";
import handlePRReviewEvent from "./pull_request_review.ts";
import handleReviewCommentEvent from "./pull_request_review_comment.ts";
import handlePush from "./push.ts";
import handleReleaseEvent from "./release.ts";

export const eventHandlers: Record<
  string,
  (ctx: RequestCtx) => Promise<Response>
> = {
  check_run: handleCheckRun,
  issues: handleIssueEvent,
  pull_request: handlePREvent,
  pull_request_review: handlePRReviewEvent,
  pull_request_review_comment: handleReviewCommentEvent,
  release: handleReleaseEvent,
  push: handlePush,

  // ignored events
  create: ignoredHandler,
  check_suite: ignoredHandler,
  workflow_job: ignoredHandler,
  workflow_run: ignoredHandler,
};

export async function defaultHandler(ctx: RequestCtx) {
  return await forwardToDiscord(ctx, await ctx.request.blob());
}

// deno-lint-ignore require-await
async function ignoredHandler() {
  return emptyResponse(204);
}
