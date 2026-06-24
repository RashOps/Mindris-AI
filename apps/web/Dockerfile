FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_RENDERER_URL=http://localhost:4000
ARG NEXT_PUBLIC_API_KEY=dev-mindris-api-key
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_RENDERER_URL=$NEXT_PUBLIC_RENDERER_URL
ENV NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_RENDERER_URL=http://localhost:4000
ARG NEXT_PUBLIC_API_KEY=dev-mindris-api-key
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_RENDERER_URL=$NEXT_PUBLIC_RENDERER_URL
ENV NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY
COPY --from=builder /app ./
EXPOSE 3000
CMD ["bun", "run", "start"]
