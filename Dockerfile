# Gunakan image node resmi
FROM node:20-alpine

RUN apk add --no-cache libc6-compat

# Tentukan direktori kerja
WORKDIR /usr/src/app

# Copy file package dulu untuk optimasi cache
COPY package*.json ./

# Install dependensi
RUN npm config set fetch-retries 5
RUN npm config set fetch-retry-mintimeout 20000

RUN npm install

# Copy seluruh kode aplikasi
COPY . .

# Build aplikasi NestJS
RUN npm run build

# Expose port aplikasi
EXPOSE 3000

# Jalankan aplikasi dalam mode production
CMD ["npm", "run", "start:dev"]