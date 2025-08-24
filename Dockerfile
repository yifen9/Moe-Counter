FROM node:22-bookworm

RUN apt-get update && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 用 npm 锁，保证可复现
COPY package.json ./
RUN npm i --package-lock-only
COPY package-lock.json ./

# 安装并强制从源码编译 better-sqlite3
RUN npm ci --no-audit --no-fund \
 && npm rebuild better-sqlite3 --build-from-source

# 拷源码
COPY . .

EXPOSE 3000
CMD ["node","index.js"]