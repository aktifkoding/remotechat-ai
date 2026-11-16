# Environment Variables — RemoteChat AI

All secrets MUST stay server-side. Never prefix secrets with `NEXT_PUBLIC_`.

| Variable | Required | Scope | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | Public | Canonical app URL (e.g. `https://remotechat.vercel.app` or `http://localhost:3000`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | Supabase Project URL (`https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public | Supabase anonymous/publishable key (safe for browser with RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server | Supabase service role key (strictly server-only for admin/webhooks). |
| `ENCRYPTION_MASTER_KEY` | Yes | Server | 32-byte hex or base64 master key for AES-256-GCM credential encryption. |
| `GITHUB_CLIENT_ID` | Optional | Server | GitHub OAuth App Client ID. |
| `GITHUB_CLIENT_SECRET` | Optional | Server | GitHub OAuth App Client Secret. |
| `GITHUB_WEBHOOK_SECRET` | Optional | Server | Secret for verifying `X-Hub-Signature-256` on GitHub webhooks. |
| `VERCEL_CLIENT_ID` | Optional | Server | Vercel Integration OAuth Client ID. |
| `VERCEL_CLIENT_SECRET` | Optional | Server | Vercel Integration OAuth Client Secret. |
| `VERCEL_WEBHOOK_SECRET` | Optional | Server | Secret for verifying Vercel deployment webhooks. |
| `SUPABASE_MANAGEMENT_CLIENT_ID` | Optional | Server | Supabase Management API OAuth Client ID. |
| `SUPABASE_MANAGEMENT_CLIENT_SECRET` | Optional | Server | Supabase Management API OAuth Client Secret. |
