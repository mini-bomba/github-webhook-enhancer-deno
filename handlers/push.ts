// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2026 mini_bomba
//

import { ExtendedMap } from "@solvro/utils/map";
import {
  editWebhookMessage,
  emptyResponse,
  errorResponse,
  RequestCtx,
  sendWebhookMessage,
} from "../responses.ts";
import { CheckRun, Commit, PushEvent } from "../types.ts";
import { debounce, DebouncedFunction } from "@std/async";

const REF_STRIP_REGEX = /^refs\/(tags|heads)\//;
const CHECKS_ENTRY_EXPIRY = 30 * 60 * 1000;

interface Check {
  name: string;
  url: string;
  status: CheckRun["conclusion"];
}

interface PendingChecks {
  embed?: object;
  message_id?: string;
  checks: Map<number, Check>;
  updates_waiting: boolean;
  updating: boolean;
  refresh: DebouncedFunction<[]>;
  update(ctx: RequestCtx): void;
}

const pending_checks = new ExtendedMap<string, PendingChecks>();

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

  const checks_entry = checksForKey(
    `${ctx.channel_id}+${ctx.thread_id}+${event.head_commit.id}+${name}`,
  );

  const embed = isTag
    ? {
        author: {
          name: event.sender.login,
          url: event.sender.html_url,
          icon_url: event.sender.avatar_url,
        },
        title: `[${event.repository.full_name}] ${event.created ? `New tag ${name} created` : `Existing tag ${name} updated`}`,
        url: event.compare,
        description:
          event.head_commit == null ? null : formatCommit(event.head_commit),
        fields: renderChecks(checks_entry),
        color: event.created ? 0x7289da : 0xe89b00,
      }
    : event.commits.length === 0
      ? {
          author: {
            name: event.sender.login,
            url: event.sender.html_url,
            icon_url: event.sender.avatar_url,
          },
          title: `[${event.repository.full_name}] ${event.created ? `New branch ${name} created${event.forced ? " via force-push" : ""}` : `Branch ${name} ${event.forced ? "force-updated" : "updated"}`}`,
          url: event.compare,
          description: `**${event.before === "0000000000000000000000000000000000000000" || event.before === event.after ?  "No new commits pushed" : "Bramch was rolled back without pushing new commits"}, new branch HEAD commit:**\n${formatCommit(event.head_commit)}`,
          fields: renderChecks(checks_entry),
          color: event.forced ? 0xe89b00 : 0x7289da,
        }
      : {
          author: {
            name: event.sender.login,
            url: event.sender.html_url,
            icon_url: event.sender.avatar_url,
          },
          title: `[${event.repository.full_name}] ${event.commits.length} commit${event.commits.length > 1 ? "s" : ""} ${event.forced ? "force-" : ""}pushed to ${event.created ? "new " : ""}branch ${name}`,
          url: event.compare,
          description: `${event.commits.length > 5 ? `**+ ${event.commits.length - 5} commits**\n` : ""}${event.commits.slice(-5).map(formatCommit).join("\n")}`,
          fields: renderChecks(checks_entry),
          color: event.forced ? 0xe89b00 : 0x7289da,
        };
  checks_entry.embed = embed;
  checks_entry.message_id = await sendWebhookMessage(ctx, [embed]);
  checks_entry.updating = false;
  if (checks_entry.updates_waiting) checks_entry.update(ctx);
  return emptyResponse(204);
}

function formatCommit(commit: Commit): string {
  const subject = commit.message.split("\n")[0] ?? "";
  const abbrevSubject = `${subject.substring(0, 73)}${subject.length > 73 ? "…" : ""}`;
  return `[\`${commit.id.substring(0, 8)}\`](${commit.url}) ${abbrevSubject} - ${commit.author.name}${commit.author.name !== commit.committer.name ? `/${commit.committer.name}` : ""}`;
}

function renderChecks(checks: PendingChecks): object[] {
  if (checks.checks.size === 0) {
    return [];
  }
  return [
    {
      name: "Checks",
      value: checks.checks
        .values()
        .toArray()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(
          (check) =>
            `[\`${checkIcon(check.status)} ${check.name}\`](${check.url})`,
        )
        .join(" "),
    },
  ];
}

function checkIcon(status: Check["status"]): string {
  switch (status) {
    case null:
    case "waiting":
    case "pending":
      return "🟡";
    case "action_required":
      return "⚠️";
    case "cancelled":
      return "🚫";
    case "success":
      return "🟢";
    case "neutral":
    case "skipped":
      return "⚪";
    default:
      return "🔴";
  }
}

export function checksForKey(commit_key: string): PendingChecks {
  const checks = pending_checks.getOrInsertWith(commit_key, () => {
    const innerUpdate = debounce(
      async (checks: PendingChecks, ctx: RequestCtx) => {
        if (
          checks.updating ||
          checks.message_id == null ||
          checks.embed == null
        ) {
          checks.updates_waiting = true;
          return;
        }
        checks.updating = true;
        checks.updates_waiting = false;
        try {
          await editWebhookMessage(ctx, checks.message_id, [
            {
              ...checks.embed,
              fields: renderChecks(checks),
            },
          ]);
        } finally {
          checks.updating = false;
          if (checks.updates_waiting) innerUpdate(checks, ctx);
        }
      },
      5000,
    );
    return {
      checks: new Map(),
      updates_waiting: false,
      updating: true,
      refresh: debounce(
        () => pending_checks.delete(commit_key),
        CHECKS_ENTRY_EXPIRY,
      ),
      update(ctx: RequestCtx) {
        innerUpdate(this, ctx);
      },
    };
  });
  checks.refresh();
  return checks;
}
