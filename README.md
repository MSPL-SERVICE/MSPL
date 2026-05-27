<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9d8424b9-0759-4ca1-ab0a-8560cea22025

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Production Build

1. Build the app:
   `npm run build`
2. Start the production server:
   `npm start`

## Docker Deployment

Build the image:
```bash
npm run docker:build
```

Run the container:
```bash
npm run docker:run
```

Or use Docker Compose:
```bash
docker compose up --build
```

### Public Deployment

This repository now includes a GitHub Actions workflow that builds the app and publishes a Docker image to GitHub Container Registry on every push to `main`.

To use it:
1. Push your branch to `main`.
2. Go to GitHub Actions -> Docker Build and Deploy.
3. The image will be published to `ghcr.io/<OWNER>/mspl-services:latest`.

Optional Fly.io deployment:
1. Create a Fly.io app and add `FLY_API_TOKEN` and `FLY_APP_NAME` as repository secrets.
2. On push to `main`, the `deploy-fly` job will deploy the app automatically.

The app will still be available locally at `http://localhost:3000`.
