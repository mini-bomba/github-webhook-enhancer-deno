// This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
// https://github.com/mini-bomba/github-webhook-enhancer-deno
//
// Copyright (C) 2025 mini_bomba
//

export class Semaphore {
  capacity: number;
  #currentTasks: number;
  #waitingTasks: (() => void)[];

  constructor(capacity: number) {
    this.capacity = capacity;
    this.#currentTasks = 0;
    this.#waitingTasks = [];
  }

  public get currentTasks(): number {
    return this.#currentTasks;
  }

  public async runTask<T>(task: () => Promise<T>): Promise<T> {
    // acquire the semaphore
    await this.acquire();
    try {
      // execute the task
      return await task();
    } finally {
      // don't forget to release
      this.release();
    }
  }

  private acquire(): Promise<void> {
    // if we're under capacity, bump the count and resolve immediately
    if (this.capacity > this.#currentTasks) {
      this.#currentTasks += 1;
      return Promise.resolve();
    }
    // otherwise add ourselves to the queue
    return new Promise((resolve) => this.#waitingTasks.push(resolve));
  }

  protected release() {
    // try waking up the next task
    const nextTask = this.#waitingTasks.shift();
    if (nextTask === undefined) {
      // no task in queue, decrement task count
      this.#currentTasks -= 1;
    } else {
      // wake up the task
      nextTask();
    }
  }
}

export class RateLimiter extends Semaphore {
  releaseDelay: number;

  constructor(capacity: number, releaseDelay: number) {
    super(capacity);
    this.releaseDelay = releaseDelay;
  }

  protected override release() {
    setTimeout(super.release.bind(this), this.releaseDelay);
  }
}

export class ScopedRateLimiter<T> {
  #limiters: Map<T, RateLimiter> = new Map();
  capacity: number;
  everySeconds: number;

  constructor(capacity: number, everySeconds: number) {
    this.capacity = capacity;
    this.everySeconds = everySeconds;
  }

  public for(scope: T): RateLimiter {
    return this.#limiters.get(scope) ?? this.allocateNew(scope)
  }

  private allocateNew(scope: T): RateLimiter {
    const newLimiter = new RateLimiter(this.capacity, this.everySeconds * 1000);
    this.#limiters.set(scope, newLimiter);
    return newLimiter;
  }
}

export const DISCORD_RATE_LIMITER = new ScopedRateLimiter<string>(5, 10)
