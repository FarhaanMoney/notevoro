# WhatsApp Dashboard — Production Deployment

## 1. Run Supabase migration

In **Supabase → SQL Editor**, run:

1. `supabase/migrations/20250524120000_whatsapp_production.sql` — full schema, RLS, realtime, triggers  
2. **If you already ran the older `migration_whatsapp_dashboard.sql`**, also run:  
   `supabase/migrations/20250524130000_whatsapp_connections_add_columns.sql`

This creates tables, RLS policies, realtime publication, token sync triggers, and updates `consume_whatsapp_token`.

**Error `Could not find the 'connect_mode' column`?** Run the patch migration above, then retry Connect.

## 2. Environment variables (Vercel)

### Supabase (required)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (client + realtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (API routes only) |
| `SUPABASE_URL` | Same as public URL (server fallback) |

### WhatsApp / Meta (required for linking)

| Variable | Description |
|----------|-------------|
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook verify token (GET challenge) |
| `WHATSAPP_APP_SECRET` | Meta app secret (webhook HMAC) |
| `WHATSAPP_BUSINESS_NUMBER` | Business number for wa.me link flow (digits, country code) |
| `WHATSAPP_ACCESS_TOKEN` | Cloud API token (outbound messages) |
| `WHATSAPP_PHONE_NUMBER_ID` | Cloud API phone number ID |

### WhatsApp OAuth (optional — Meta Embedded Signup)

| Variable | Description |
|----------|-------------|
| `WHATSAPP_APP_ID` | Facebook App ID (not WABA ID) |
| `WHATSAPP_REDIRECT_URI` | `https://your-domain.com/api/whatsapp/callback` |
| `WHATSAPP_GRAPH_VERSION` | Default `v21.0` |

### App URL

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |

### Razorpay (payments — separate from WhatsApp)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Must be set or Razorpay script is skipped |
| `RAZORPAY_KEY_ID` | Server key |
| `RAZORPAY_KEY_SECRET` | Server secret |

## 3. Meta webhook configuration

- **Callback URL:** `https://your-domain.com/api/whatsapp/webhook`
- **Verify token:** same as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to `messages` field

## 4. API routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/whatsapp/connect` | Start link or OAuth flow |
| GET | `/api/whatsapp/callback` | OAuth completion redirect |
| GET | `/api/whatsapp/status` | Connection status |
| POST | `/api/whatsapp/disconnect` | Disconnect |
| GET | `/api/whatsapp/messages` | Recent messages |
| GET/POST | `/api/whatsapp/webhook` | Meta webhook (AI + sync) |

## 5. Connection flows

### Link flow (default)

1. User clicks **Connect WhatsApp**
2. API creates `whatsapp_connections` row (`pending`) + link token
3. User opens wa.me URL and sends `CONNECT_…` message
4. Webhook consumes token → updates `users.personalization` → DB trigger sets `connected`

### OAuth flow (when `WHATSAPP_APP_ID` + redirect configured)

1. User authorizes via Meta
2. Callback exchanges code and marks connection `connected`

## 6. Testing checklist

- [ ] Migration applied without errors
- [ ] Realtime enabled: `whatsapp_connections`, `whatsapp_messages` in publication
- [ ] Authenticated `POST /api/whatsapp/connect` returns `success: true` (not 500)
- [ ] Dashboard loads without WebSocket errors (anon key + RLS)
- [ ] Link flow: pending → connected after sending token on WhatsApp
- [ ] `GET /api/whatsapp/status` shows `connected` + phone
- [ ] Recent messages appear after inbound webhook
- [ ] Disconnect sets status `disconnected`
- [ ] Razorpay: no `checkout-static-next.../undefined` in console on `/dashboard/whatsapp`
- [ ] Meta webhook verify GET returns challenge (200)
- [ ] Meta webhook POST with valid signature returns 200

## 7. Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| 500 on `/api/whatsapp/connect` | Migration not run; missing service role key |
| 403 on webhook GET | `WHATSAPP_VERIFY_TOKEN` mismatch |
| Stuck on Pending | Token not sent, or phone not saved on connection row |
| WebSocket failed | Wrong `NEXT_PUBLIC_SUPABASE_*` or realtime not published |
| Razorpay `build/undefined` | `NEXT_PUBLIC_RAZORPAY_KEY_ID` unset; fixed by `RazorpayScript` guard |
