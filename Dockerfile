# Use the official Node.js image.
FROM node:latest

# Set the working directory.
WORKDIR /app

# Copy package.json only.
COPY package.json ./

# Install dependencies.
RUN npm install --force

# Copy the rest of the application code.
COPY . .

# Build the Next.js application.
RUN npm run build

# Expose the internal port.
EXPOSE 3000

# Start the application.
CMD ["npm", "start"] 