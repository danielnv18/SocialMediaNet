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

## Client scripts

Run these from `client/`:

| Command           | Description              |
| ----------------- | ------------------------ |
| `pnpm build`      | Production build         |
| `pnpm test`       | Run unit tests           |
| `pnpm e2e`        | Run Playwright tests     |
| `pnpm check`      | Lint, format, type check |

## Build the solution

```bash
dotnet build SocialMedia.slnx
```

## License

[MIT](LICENSE)
