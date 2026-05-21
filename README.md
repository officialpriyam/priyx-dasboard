# Priyx Dashboard

Next.js dashboard for Priyx.

## Local

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Vercel

Deploy the `priyx-dashboard` folder as the Vercel project root.

Set these environment variables in Vercel:

```env
PRIYX_API_URL=https://your-bot-api-domain.example.com/api
PRIYX_API_KEY=same-value-as-priyx-bot
PRIYX_DISCORD_CLIENT_ID=your-discord-application-client-id
PRIYX_DISCORD_CLIENT_SECRET=your-discord-application-client-secret
NEXT_PUBLIC_PRIYX_API_URL=/api/priyx
PRIYX_ADMIN_USERNAME=admin
PRIYX_ADMIN_PASSWORD=change-this
PRIYX_ADMIN_SESSION_SECRET=random-long-secret
```

On the bot side, update `modules.yml` for the API addon:

```yaml
api:
  enabled: true
  publicUrl: "https://your-bot-api-domain.example.com"
  dashboardUrl: "https://your-vercel-app.vercel.app"
  corsOrigin: "https://your-vercel-app.vercel.app"
  requireApiKey: true
```

In the Discord developer portal, add this redirect URL:

```text
https://your-bot-api-domain.example.com/api/auth/callback
```

The dashboard can be hosted on Vercel, but the bot API still needs to run on a reachable server because Discord OAuth, guild data, and module writes go through the Priyx API addon.

## License

See `LICENSE`.
