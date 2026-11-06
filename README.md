# SocialMedia

A social media app with a .NET API and a Vue client.

```
api/      ASP.NET Core API (SocialMedia.Api)
client/   Vue 3 + Vite+ front end (pnpm)
```

## Prerequisites

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/installation)

## Run

Start the API and the client in two terminals.

**API** (http://localhost:5143):

```bash
dotnet run --project api
```

Use `dotnet watch --project api` for hot reload.

**Client:**

```bash
cd client
pnpm install
pnpm dev
```

Open http://localhost:5173. The client proxies `/api` to the API.

## Accounts

In Development the API applies migrations and seeds 100 users on first start. Every seeded user has the password `P@ssw0rd!`. Log in with username `dnoyola` or email `dnoyola@example.com`.

The session is an HttpOnly cookie (`sm.session`) set by ASP.NET Core Identity. There is no email service yet, so "Forgot password" writes the reset link to the API console log.

To start over with a fresh seed, stop the API and delete `api/socialmedia.db`.

## API tests

```bash
dotnet test SocialMedia.slnx
```

## Client scripts

Run these from `client/`:

| Command           | Description              |
| ----------------- | ------------------------ |
| `pnpm build`      | Production build         |
| `pnpm test`       | Run unit tests           |
| `pnpm e2e`        | Run Playwright tests (starts the API and the client) |
| `pnpm check`      | Lint, format, type check |

## Build the solution

```bash
dotnet build SocialMedia.slnx
```

## License

[MIT](LICENSE)
