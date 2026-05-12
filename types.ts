// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2026 mini_bomba
//

import { components } from "@octokit/openapi-webhooks-types";

type AllSchemaKeys = keyof components["schemas"];
type MatchEventKeys<Name extends string, Type extends string = AllSchemaKeys> =
  Type extends `webhook-${Name}-${infer Rest}` ?
    Rest extends `${string}-${string}` ?
      never
      : Type
    : never;
type EventType<Name extends string> = components["schemas"][MatchEventKeys<Name>];
type Action<Event, Name> = Event extends { action: Name } ? Event : never;
type NN<Type> = {
  [Prop in keyof Type]-?: NonNullable<Type[Prop]>;
}

type SimpleUser = components["schemas"]["simple-user"]
export type CheckRun = components["schemas"]["check-run-with-simple-check-suite"];
export type PushEvent = NN<components["schemas"]["webhook-push"]>;
export type Commit = PushEvent["head_commit"];

export type IssuesEvent = EventType<"issues">;

export type ReleaseEvent = EventType<"release"> & { release: { author: SimpleUser } };
export type ReleaseEditedEvent = Action<ReleaseEvent, "edited">;
export type ReleasePublishedEvent = Action<ReleaseEvent, "published">;

export type PullRequestEvent = EventType<"pull-request">;

export type PullRequestReviewEvent = EventType<"pull-request-review">;
export type PullRequestReviewDismissedEvent = Action<PullRequestReviewEvent, "dismissed">;
export type PullRequestReviewSubmittedEvent = Action<PullRequestReviewEvent, "submitted">;

export type PullRequestReviewCommentEvent = EventType<"pull-request-review-comment">;

export type CheckRunEvent = EventType<"check-run">;
