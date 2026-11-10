# Readscape

A personal book discovery and reading-tracking platform: your own digital library, reading journal and a quiet community of fellow readers.

- **Bookshelf first.** Currently Reading, Read and Want to Read shelves, plus custom shelves you can create, rename and delete. Grid view (covers on shelf ledges) or list view, with sorting by title, author, date added or rating, genre filters and search within a shelf.
- **Reading progress.** You can update your current page, see the percentage, and set start and finish dates. When you mark a book as finished, it moves to Read, records the completion date, counts towards your goal and asks you to rate it.
- **Discovery.** Trending, popular, new releases, personalised recommendations, browsing by genre, and search, all using real data and covers from the [Open Library API](https://openlibrary.org/developers/api).
- **Reviews.** 1–5 star ratings, written reviews (edit, delete, spoiler blur), appreciation likes, average ratings and a rating breakdown.
- **Community.** Public profiles, following, public bookshelves, an activity feed from readers you follow, and recent reviews.
- **Reading challenge.** An annual goal showing your target, completed and remaining books, and a progress bar. It updates automatically.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, React Router, Lucide icons |
| Backend | Node.js, Express 5, MongoDB with Mongoose 9, JWT auth, bcrypt |
| Data | Open Library API (with caching and a local-database fallback) |

## Getting started

**Requirements:** Node.js 20 or newer. MongoDB is optional for development (see below).

```bash
# 1. Install everything (root, server and client)
npm run install:all

# 2. Configure the API (the defaults work out of the box)
cp server/.env.example server/.env

# 3. Run the API (port 5000) and the web app (port 5173) together
npm run dev
```

Open **http://localhost:5173** and create an account.

### Database

- **No MongoDB installed?** Leave `MONGO_URI` empty. The server starts an embedded MongoDB (via `mongodb-memory-server`) and keeps its data in `server/.data/`, so your library survives restarts. The first start downloads a MongoDB binary, which takes a minute.
- **Own MongoDB or Atlas:** set `MONGO_URI=mongodb://localhost:27017/readscape` (or your Atlas connection string) in `server/.env`.

### Environment variables (`server/.env`)

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `5000` | API port |
| `MONGO_URI` | *(empty)* | Empty means the embedded dev database. Required in production. |
| `JWT_SECRET` | dev fallback | **Set a long random string**. Required in production. |
| `JWT_EXPIRES_IN` | `7d` | Session length |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin in production |

The client proxies `/api` to `localhost:5000` in development. For a separately hosted API, build the client with `VITE_API_URL=https://your-api.example.com/api`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API and web app with live reload |
| `npm test` | Backend integration tests (in-memory MongoDB) |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start` | Start the API in production mode |

## Project structure

```
readscape/
├── server/
│   ├── src/
│   │   ├── config/        env + database connection (embedded DB fallback)
│   │   ├── models/        User, Book, UserBook, Review, CustomShelf,
│   │   │                  ReadingChallenge, Follow, Activity
│   │   ├── services/      openLibrary (API client + cache), bookService, activityService
│   │   ├── controllers/   auth, books, shelf, customShelf, review, challenge, user
│   │   ├── middleware/    JWT auth, error handling
│   │   ├── routes/        REST routes under /api
│   │   └── utils/         genres, HTTP errors
│   └── tests/             end-to-end journey tests
└── client/
    └── src/
        ├── context/       Auth, Toast, Confirm dialog, Shelf (global shelf state + progress modal)
        ├── components/
        │   ├── layout/    sidebar, top bar, mobile nav
        │   ├── books/     BookCover, BookCard/Row, ShelfButton, ProgressModal, ReviewForm/Card, GoalCard…
        │   ├── ui/        Modal, Popover, StarRating, ProgressBar, Skeleton, EmptyState…
        │   └── decor/     hand-drawn SVG bows, botanical sprigs, book stacks, teacup
        ├── pages/         Home, Bookshelf, Discover, BookDetail, Community, Profile, Auth
        └── lib/           API client, hooks, helpers
```

## Data model

- **Book** stores one canonical record per Open Library work (`olId`). Shelves, reviews and activities all reference it, so book data is never duplicated per user. Missing details (description, page count, genres) are filled in from Open Library in the background.
- **UserBook** is a book on a user's shelf, with `status` (`reading` | `read` | `want`), current page, total pages, and start and finish dates. A unique index on `(user, book)` prevents duplicates; adding a shelved book again *moves* it instead.
- **CustomShelf** is a user-named collection (case-insensitive unique per user) of books.
- **Review** holds one per user per book: rating 1–5, body, spoiler flag and likes.
- **ReadingChallenge** stores the yearly target. The completed count is *derived* from books finished that year, so it is always accurate.
- **Follow** and **Activity** power the community feed. Frequent progress updates are merged into a single activity.

## API overview

All routes are under `/api`. 🔒 means a JWT is required (`Authorization: Bearer <token>`).

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` 🔒 |
| Books | `GET /books/search?q=`, `/books/trending`, `/books/popular`, `/books/new`, `/books/recommended` 🔒, `/books/genres`, `/books/genre/:slug`, `/books/:olId` |
| Shelf 🔒 | `GET /shelf?status=&q=&genre=&sort=`, `GET /shelf/summary`, `GET /shelf/index`, `GET /shelf/book/:olId`, `POST /shelf`, `PATCH /shelf/:id`, `DELETE /shelf/:id` |
| Custom shelves 🔒 | `GET/POST /custom-shelves`, `PATCH/DELETE /custom-shelves/:id`, `GET/POST /custom-shelves/:id/books`, `DELETE /custom-shelves/:id/books/:olId` |
| Reviews | `GET /reviews/book/:olId`, `PUT /reviews/book/:olId` 🔒, `DELETE /reviews/:id` 🔒, `POST /reviews/:id/like` 🔒, `GET /reviews/recent` |
| Challenge 🔒 | `GET /challenge?year=`, `PUT /challenge` |
| Community 🔒 | `GET /users?q=`, `GET /users/:username` (+ `/shelf`, `/reviews`, `/activity`, `/followers`, `/following`), `POST/DELETE /users/:username/follow`, `PATCH /users/me`, `GET /activity/feed`, `GET /activity/me` |

## Design system

Readscape uses only four palette colours, plus tints of each:

| Token | Hex | Used for |
|---|---|---|
| Cocoa Rose (`cocoa`) | `#684F48` | Text, headings, primary buttons, icons |
| Winter Mist (`mist`) | `#D6E9ED` | Soft sections, selected states, shelf cards |
| Silver Veil (`silver`) | `#93A8AD` | Progress bars, secondary accents, leaves |
| Creamy Oat (`oat`) | `#F9E7C7` | Backgrounds and warm surfaces |

Headings use *Cormorant Garamond* and body text uses *DM Sans*. Both are bundled locally via Fontsource. Tokens live in `client/src/index.css` (`@theme`).

## Testing

`npm test` runs the main user journeys against a throwaway in-memory database:

sign up / log in / protected routes → shelving and duplicate prevention → progress, finishing a book, completion date and reading goal → reviews (create, edit, like, delete, permissions) → custom shelves → follows, public and private profiles → removing books.

## Troubleshooting

- **Windows "Application Control policy has blocked this file" during `vite`:** Readscape uses Vite 7 (Rollup/esbuild) because some Windows security policies block Vite 8's native `rolldown` binary.
- **The book catalogue is slow or unavailable:** Open Library is occasionally slow. Discovery falls back to books already in your Readscape database, and book pages use their stored copy.
