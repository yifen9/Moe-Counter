FROM node:22.13.1

RUN apt-get update && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

ENV npm_config_build_from_source=true

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile && pnpm rebuild better-sqlite3 --verbose

COPY . .

EXPOSE 3000
CMD ["pnpm","start"]