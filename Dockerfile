FROM docker.io/denoland/deno:distroless
WORKDIR /app
COPY deno.json deno.lock main.ts responses.ts /app/
COPY handlers/ /app/handlers
COPY .git/refs /app/.git/refs
COPY .git/HEAD /app/.git/
RUN ["/bin/deno", "cache", "main.ts"]
CMD ["run", "--allow-net=0.0.0.0:8000,discord.com:443", "--allow-read=./.git", "main.ts"]
