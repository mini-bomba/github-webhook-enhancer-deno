// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2025 mini_bomba
//
import { fetchResponse } from "../responses.ts";
import handleIssueEvent from "./issues.ts";
import handlePREvent from "./pull_request.ts";
import handlePRReviewEvent from "./pull_request_review.ts";
import handleReleaseEvent from "./release.ts";

export const eventHandlers: Record<string, (req: Request, webhook_url: string) => Promise<Response>> = {
  issues: handleIssueEvent,
  pull_request: handlePREvent,
  pull_request_review: handlePRReviewEvent,
  release: handleReleaseEvent,
}

export const defaultHandler = (req: Request, webhook_url: string) => fetchResponse(`${webhook_url}/github`, req);
