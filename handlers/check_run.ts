// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2026 mini_bomba
//

import { emptyResponse, errorResponse, RequestCtx } from "../responses.ts";
import { CheckRunEvent } from "../types.ts";
import { checksForKey } from "./push.ts";

export default async function handleCheckRun(ctx: RequestCtx): Promise<Response> {
  const { request } = ctx;
  let event: CheckRunEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  const checks = checksForKey(`${ctx.channel_id}+${ctx.thread_id}+${event.check_run.head_sha}+${event.check_run.check_suite.head_branch}`);
  checks.checks.set(event.check_run.id, {
    name: event.check_run.name,
    url: event.check_run.details_url,
    status: event.check_run.conclusion,
  })
  checks.update(ctx);

  return emptyResponse(204);
}
