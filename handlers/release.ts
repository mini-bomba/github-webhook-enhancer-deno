// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2022-2025 mini_bomba
//
import { errorResponse, fetchResponse } from "../responses.ts";
import { ReleaseEvent } from "npm:@octokit/webhooks-types";

export default async function handleReleaseEvent(request: Request, channel_id: string, webhook_url: string): Promise<Response> {
  let event: ReleaseEvent;
  try {
    event = await request.json();
  } catch (e) {
    return errorResponse(e);
  }

  if (event.action !== "published") { // Not published -> forward to discord
    return await fetchResponse(`${webhook_url}/github`, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(event),
    }, channel_id);
  }

  // release published -> create new embed with more data
  return await fetchResponse(webhook_url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({
      username: "GitHub",
      avatar_url: "https://cdn.discordapp.com/attachments/743515515799994489/996513463650226327/unknown.png",
      embeds: [{
        author: {
          name: event.release.author.login,
          url: event.release.author.html_url,
          icon_url: event.release.author.avatar_url,
        },
        title: `[${event.repository.full_name}] New release published: ${event.release.name ?? event.release.tag_name}`,
        url: event.release.html_url,
        timestamp: event.release.published_at,
        description: event.release.body?.substring(0, 4096) ?? "",
      }],
    }),
  }, channel_id);
}
