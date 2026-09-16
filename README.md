# Portfolio

A full-stack developer portfolio: **React** (Vite + TypeScript) on the frontend and **Express** (TypeScript) on the backend.

## Structure

- `client/` — React app. In development it runs on [http://localhost:5173](http://localhost:5173) and proxies `/api` to the server.
- `server/` — Express API. Serves JSON for profile, projects, and the contact form. In production it also serves the built client from `client/dist`.

## Setup

```bash
npm run install:all
```

Copy the example env file:

```bash
copy server\.env.example server\.env
```

## Run

Start both the React app and the Node API:

```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3001](http://localhost:3001)

## API

| Method | Path           | Description                          |
| ------ | -------------- | ------------------------------------ |
| GET    | `/api/health`  | Service status                       |
| GET    | `/api/profile` | Name, bio, skills, and social links  |
| GET    | `/api/projects`| Featured work                        |
| POST   | `/api/contact` | Contact form (`name`, `email`, `message`) |

Edit the sample content in `server/src/data/portfolio.ts`.

## Production

```bash
npm run build
npm run start
```

Then open [http://localhost:3001](http://localhost:3001). The Express server serves both the API and the built React app.
