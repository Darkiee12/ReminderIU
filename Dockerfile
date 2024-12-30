FROM oven/bun
WORKDIR /app
COPY package*.json ./
RUN bun install
COPY . .
RUN bun build ./src/index.ts --outdir ./build --target bun
