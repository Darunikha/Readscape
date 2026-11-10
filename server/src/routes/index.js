import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import * as auth from '../controllers/authController.js';
import * as books from '../controllers/bookController.js';
import * as shelf from '../controllers/shelfController.js';
import * as custom from '../controllers/customShelfController.js';
import * as reviews from '../controllers/reviewController.js';
import * as challenge from '../controllers/challengeController.js';
import * as users from '../controllers/userController.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.get('/health', (_req, res) => res.json({ ok: true }));

// Auth
router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.get('/auth/me', requireAuth, auth.me);

// Book catalogue
router.get('/books/genres', books.listGenres);
router.get('/books/search', optionalAuth, books.search);
router.get('/books/trending', books.trending);
router.get('/books/popular', books.popular);
router.get('/books/new', books.newReleases);
router.get('/books/recommended', requireAuth, books.recommended);
router.get('/books/genre/:slug', books.byGenre);
router.get('/books/:olId', optionalAuth, books.getBook);

// Bookshelf (default shelves)
router.get('/shelf', requireAuth, shelf.listShelf);
router.get('/shelf/index', requireAuth, shelf.shelfIndex);
router.get('/shelf/summary', requireAuth, shelf.summary);
router.get('/shelf/book/:olId', requireAuth, shelf.getEntryForBook);
router.post('/shelf', requireAuth, shelf.addToShelf);
router.patch('/shelf/:id', requireAuth, shelf.updateEntry);
router.delete('/shelf/:id', requireAuth, shelf.removeEntry);

// Custom shelves
router.get('/custom-shelves', requireAuth, custom.listShelves);
router.post('/custom-shelves', requireAuth, custom.createShelf);
router.patch('/custom-shelves/:id', requireAuth, custom.renameShelf);
router.delete('/custom-shelves/:id', requireAuth, custom.deleteShelf);
router.get('/custom-shelves/:id/books', requireAuth, custom.shelfBooks);
router.post('/custom-shelves/:id/books', requireAuth, custom.addBook);
router.delete('/custom-shelves/:id/books/:olId', requireAuth, custom.removeBook);

// Reviews
router.get('/reviews/recent', optionalAuth, reviews.recentReviews);
router.get('/reviews/book/:olId', optionalAuth, reviews.listForBook);
router.put('/reviews/book/:olId', requireAuth, reviews.upsertReview);
router.delete('/reviews/:id', requireAuth, reviews.deleteReview);
router.post('/reviews/:id/like', requireAuth, reviews.toggleLike);

// Reading challenge
router.get('/challenge', requireAuth, challenge.getChallenge);
router.put('/challenge', requireAuth, challenge.setChallenge);

// Readers & community
router.get('/activity/feed', requireAuth, users.feed);
router.get('/activity/me', requireAuth, users.myActivity);
router.patch('/users/me', requireAuth, users.updateMe);
router.get('/users', requireAuth, users.listUsers);
router.get('/users/:username', requireAuth, users.getProfile);
router.get('/users/:username/shelf', requireAuth, users.userShelf);
router.get('/users/:username/reviews', requireAuth, users.userReviews);
router.get('/users/:username/activity', requireAuth, users.userActivity);
router.get('/users/:username/followers', requireAuth, (req, res) => users.connections(Object.assign(req, { params: { ...req.params, type: 'followers' } }), res));
router.get('/users/:username/following', requireAuth, (req, res) => users.connections(Object.assign(req, { params: { ...req.params, type: 'following' } }), res));
router.post('/users/:username/follow', requireAuth, users.follow);
router.delete('/users/:username/follow', requireAuth, users.unfollow);

export default router;
