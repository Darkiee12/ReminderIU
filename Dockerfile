# Use the official Node.js image as the base image
FROM oven/bun

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# Start the application
CMD ["bun","run", "dev"]
