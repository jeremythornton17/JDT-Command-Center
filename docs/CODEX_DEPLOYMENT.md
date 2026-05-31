# Codex Deployment Runbook

Use this runbook for future Codex-managed code changes and deploys.

## Production Targets

- Project: `jdt-command-board`
- Service: `jd-thornton-nurseries-command-center`
- Region: `us-west1`
- Domain: `https://app.jdtcommandcenter.com`
- Artifact Registry image prefix: `europe-west1-docker.pkg.dev/jdt-command-board/cloud-run-source-deploy/jd-command-center`

## Guardrails

- Do not deploy from Google AI Studio.
- Do not enable the default Cloud Run URL.
- Do not add a second Cloud Run service for the same app.
- Do not use the temporary Google Sheet as production data storage.
- Keep `APP_URL` set to `https://app.jdtcommandcenter.com`.
- Keep Firestore pointed at `ai-studio-aaf65ee2-61ca-4360-af29-1c862096338e`.

## Verify Locally

```bash
npm ci
npm run verify
```

## Build Image In Cloud Shell

Run from the repository root in Cloud Shell:

```bash
export IMAGE="europe-west1-docker.pkg.dev/jdt-command-board/cloud-run-source-deploy/jd-command-center:$(date +%Y%m%d-%H%M%S)"
gcloud builds submit --project=jdt-command-board --pack image="$IMAGE" .
```

## Deploy Existing Cloud Run Service

```bash
gcloud beta run deploy jd-thornton-nurseries-command-center \
  --project=jdt-command-board \
  --region=us-west1 \
  --image="$IMAGE" \
  --port=3000 \
  --allow-unauthenticated \
  --no-default-url \
  --update-env-vars=APP_URL=https://app.jdtcommandcenter.com
```

The service should use the buildpack image default command. Do not add a custom `command` or `args` override.

## Verify Production

```bash
curl -sSI https://app.jdtcommandcenter.com/ | sed -n '1,12p'
curl -sSI https://jd-thornton-nurseries-command-center-961981624176.us-west1.run.app/ | sed -n '1,6p'
curl -sSI https://jd-thornton-nurseries-command-center-z5cg7qvsra-uw.a.run.app/ | sed -n '1,6p'
gcloud beta run domain-mappings list --region us-west1 --project=jdt-command-board
```

Expected:

- `app.jdtcommandcenter.com` returns `HTTP/2 200`.
- Both old `run.app` URLs return `HTTP/2 404`.
- The only Cloud Run domain mapping is `app.jdtcommandcenter.com`.
