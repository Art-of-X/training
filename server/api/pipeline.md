# Frontend Pipeline API Guide

This document describes how your Nuxt3 app should call the Vercel endpoint to trigger pipeline jobs (as commands) and what data can be passed.

Important: The Vercel endpoint does NOT execute long-running jobs. It returns the exact command to run in your worker environment (e.g., Supabase Edge Function, VM, Docker job).

## Endpoint

- Method: `POST`
- URL: `/api/vercel_trigger`
- CORS: `*`
- Allowed headers: `Content-Type`

### Request Body (JSON)

```jsonc
{
  "steps": ["ingest", "patterns", "embeddings"], // optional, array of strings
  "artist": "Alicja Kwade",                       // optional, string
  "user_id": "998ef669-d25b-4a5a-babd-f7391724e25a", // optional, string (UUID)
  "individual": false,                              // optional, boolean
  "meta_spark_config": "processing/meta_spark_compiler/meta_spark_config_sample.csv" // optional, string path
}
```

#### Fields
- `steps` (optional): Array of step names to run, order matters. Allowed values:
  - `ingest`, `patterns`, `embeddings`, `cleanup`, `meta_sparks`, `dendrograms`
  - Default (when omitted): `["ingest", "patterns", "embeddings"]`
- `artist` (optional): Exact artist name to target.
- `user_id` (optional): Target a specific user by UUID.
- `individual` (optional): If `true`, prints per-spark progress before running batch steps.
- `meta_spark_config` (optional): CSV path accessible to your worker environment for meta-sparks configuration.

Notes:
- Provide either `artist` or `user_id` for targeted runs; omit both to process all available sparks.
- `steps` should be a subset in the order you want them executed.

### Response

```jsonc
{
  "success": true,
  "command": "python run_pipeline.py --steps embeddings --user-id 998ef669-d25b-4a5a-babd-f7391724e25a",
  "message": "Pipeline command generated successfully",
  "note": "In Vercel serverless, you need to execute this command in your main pipeline environment",
  "options": {
    "steps": ["embeddings"],
    "user_id": "998ef669-d25b-4a5a-babd-f7391724e25a",
    "individual": false
  },
  "working_directory": "processing/"
}
```

On error:
```jsonc
{
  "success": false,
  "error": "<message>",
  "command": "<last-built-command-or-Unknown>"
}
```

## Minimal Usage (Nuxt3 server route)

```ts
// server/api/pipeline.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const baseUrl = process.env.NUXT_PUBLIC_PIPELINE_API // e.g., https://your-app.vercel.app

  // 1) Ask Vercel endpoint to build the command
  const cmdResp = await $fetch(`${baseUrl}/api/vercel_trigger`, {
    method: 'POST',
    body
  })

  // 2) Forward cmdResp.options to your worker to actually execute the job
  // Note: If your worker expects raw options, forward `body` or `cmdResp.options`.
  // If it expects a prebuilt command, forward `cmdResp.command`.

  return cmdResp
})
```

## Examples

- Embeddings for a user
```json
{
  "steps": ["embeddings"],
  "user_id": "998ef669-d25b-4a5a-babd-f7391724e25a"
}
```

- Patterns + Embeddings for an artist
```json
{
  "steps": ["patterns", "embeddings"],
  "artist": "Lisa Reihana"
}
```

- Full pipeline for all (long-running; prefer worker)
```json
{
  "steps": ["ingest", "patterns", "embeddings", "cleanup", "meta_sparks", "dendrograms"],
  "individual": true
}
```

- Meta Sparks (with config)
```json
{
  "steps": ["meta_sparks"],
  "meta_spark_config": "processing/meta_spark_compiler/meta_spark_config_sample.csv"
}
```

## Cron (FYI)
If you use the built-in daily cron (`/api/cron_daily`), it reads flags from these Vercel env vars and forwards to your worker:
- `CRON_STEPS`, `CRON_ARTIST`, `CRON_USER_ID`, `CRON_INDIVIDUAL`, `CRON_META_SPARK_CONFIG`
- Worker endpoint: `PIPELINE_WORKER_URL` (+ optional `PIPELINE_WORKER_TOKEN`)

Your frontend should generally call `/api/vercel_trigger` and forward the returned `options` or `command` to your worker.
