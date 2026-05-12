// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2026 mini_bomba
//

import {
  discordWebhookResponse,
  emptyResponse,
  errorResponse,
  RequestCtx,
} from "../responses.ts";
import { Commit, PushEvent } from "@octokit/webhooks-types";

const REF_STRIP_REGEX = /^refs\/(tags|heads)\//

export default async function handlePush(ctx: RequestCtx): Promise<Response> {
  const { request } = ctx;
  let event: PushEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  if (event.ref.startsWith("refs/heads/gh-readonly-queue/")) {
    // silence the merge queue
    return emptyResponse(204);
  }
  if (event.deleted) {
    // don't care, discord will handle the `delete` event
    return emptyResponse(204);
  }

  const isTag = event.ref.startsWith("refs/tags/");
  const name = event.ref.replace(REF_STRIP_REGEX, "");

  if (isTag) {
    return await discordWebhookResponse(ctx, [
      {
        author: {
          name: event.sender.login,
          url: event.sender.html_url,
          icon_url: event.sender.avatar_url,
        },
        title: `[${event.repository.full_name}] ${event.created ? `New tag ${name} created` : `Existing tag ${name} updated`}`,
        url: event.compare,
        description: event.head_commit == null ? null : formatCommit(event.head_commit),
        color: event.created ? 0x7289da : 0xe89b00,
      },
    ]);
  }

  const embed = {
    author: {
      name: event.sender.login,
      url: event.sender.html_url,
      icon_url: event.sender.avatar_url,
    },
    title: `[${event.repository.full_name}] ${event.commits.length} commit${event.commits.length > 1 ? 's' : ''} ${event.forced ? 'force-' : ''}pushed to ${event.created ? 'new ' : ''}branch ${name}`,
    url: event.compare,
    description: `${event.commits.length > 5 ? `**+ ${event.commits.length - 5} commits**\n` : ''}${event.commits.slice(-5).map(formatCommit).join('\n')}`,
    color: event.forced ? 0xe89b00 : 0x7289da,
  };

  // let discord handle this
  return await discordWebhookResponse(ctx, [embed]);
}

function formatCommit(commit: Commit): string {
  const subject = commit.message.split('\n')[0] ?? '';
  const abbrevSubject = `${subject.substring(0, 73)}${subject.length > 73 ? '…' : ''}`;
  return `[\`${commit.id.substring(0,8)}\`](${commit.url}) ${abbrevSubject} - ${commit.author.name}${commit.author.name !== commit.committer.name ? `/${commit.committer.name}` : ''}`;
}
