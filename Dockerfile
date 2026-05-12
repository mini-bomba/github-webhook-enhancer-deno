# This file is part of the github-webhook-enhancer-deno project, licensed under the MIT license:
# https://github.com/mini-bomba/github-webhook-enhancer-deno
#
# Copyright (C) 2025 mini_bomba
#
FROM docker.io/denoland/deno:distroless
WORKDIR /app
COPY --parents deno.json deno.lock *.ts handlers/ .git/refs .git/HEAD /app/
RUN ["/bin/deno", "install"]
RUN ["/bin/deno", "cache", "main.ts"]
CMD ["run", "--allow-net=0.0.0.0:8000,discord.com:443", "--allow-read=./.git", "--allow-env=GWE_*", "--no-prompt", "main.ts"]
