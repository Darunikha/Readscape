import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/app.js');

let mongo;
const api = () => request(app);
const BOOK = { olId: 'OL45804W', title: 'Fantastic Mr Fox', authors: ['Roald Dahl'], coverId: 6498519, pageCount: 96, genres: ['Fantasy'] };
const BOOK2 = { olId: 'OL27448W', title: 'The Lord of the Rings', authors: ['J.R.R. Tolkien'], pageCount: 1200 };

let alice;
let bob;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('readscape-test'));
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('sign up, log in and fetch the current user', async () => {
  const reg = await api().post('/api/auth/register').send({ username: 'Alice', email: 'alice@example.com', password: 'password123', displayName: 'Alice' });
  assert.equal(reg.status, 201);
  assert.ok(reg.body.token);
  assert.equal(reg.body.user.username, 'alice');
  assert.equal(reg.body.user.password, undefined, 'password hash must never be returned');

  const dup = await api().post('/api/auth/register').send({ username: 'alice', email: 'other@example.com', password: 'password123' });
  assert.equal(dup.status, 409);

  const short = await api().post('/api/auth/register').send({ username: 'carol', email: 'c@example.com', password: 'short' });
  assert.equal(short.status, 400);

  const bad = await api().post('/api/auth/login').send({ identifier: 'alice', password: 'wrongpass' });
  assert.equal(bad.status, 401);

  const login = await api().post('/api/auth/login').send({ identifier: 'alice@example.com', password: 'password123' });
  assert.equal(login.status, 200);
  alice = login.body.token;

  const me = await api().get('/api/auth/me').set(auth(alice));
  assert.equal(me.body.user.username, 'alice');

  const noAuth = await api().get('/api/shelf');
  assert.equal(noAuth.status, 401);

  const b = await api().post('/api/auth/register').send({ username: 'bob', email: 'bob@example.com', password: 'password123' });
  bob = b.body.token;
});

test('adding to shelves moves books and prevents duplicates', async () => {
  const add = await api().post('/api/shelf').set(auth(alice)).send({ book: BOOK, status: 'want' });
  assert.equal(add.status, 201);
  assert.equal(add.body.entry.status, 'want');

  const again = await api().post('/api/shelf').set(auth(alice)).send({ book: BOOK, status: 'want' });
  assert.equal(again.status, 200);
  assert.equal(again.body.unchanged, true);

  const move = await api().post('/api/shelf').set(auth(alice)).send({ book: BOOK, status: 'reading' });
  assert.equal(move.status, 200);
  assert.equal(move.body.entry.status, 'reading');
  assert.ok(move.body.entry.startedAt, 'start date set automatically');

  const all = await api().get('/api/shelf?status=all').set(auth(alice));
  assert.equal(all.body.entries.length, 1, 'only one entry per book');

  const bobShelf = await api().get('/api/shelf').set(auth(bob));
  assert.equal(bobShelf.body.entries.length, 0, 'shelves are per-user');
});

test('reading progress, finishing a book and the reading challenge', async () => {
  const goal = await api().put('/api/challenge').set(auth(alice)).send({ target: 25 });
  assert.equal(goal.body.challenge.target, 25);
  assert.equal(goal.body.challenge.completed, 0);

  const { body } = await api().get('/api/shelf?status=reading').set(auth(alice));
  const id = body.entries[0]._id;

  const prog = await api().patch(`/api/shelf/${id}`).set(auth(alice)).send({ currentPage: 48 });
  assert.equal(prog.status, 200);
  assert.equal(prog.body.entry.progress, 50);

  const tooFar = await api().patch(`/api/shelf/${id}`).set(auth(alice)).send({ currentPage: 500 });
  assert.equal(tooFar.status, 400);

  const badDates = await api().patch(`/api/shelf/${id}`).set(auth(alice)).send({ startedAt: '2026-03-10', finishedAt: '2026-03-01' });
  assert.equal(badDates.status, 400);

  const done = await api().patch(`/api/shelf/${id}`).set(auth(alice)).send({ status: 'read' });
  assert.equal(done.body.entry.status, 'read');
  assert.equal(done.body.entry.progress, 100);
  assert.ok(done.body.entry.finishedAt, 'completion date recorded');

  const challenge = await api().get('/api/challenge').set(auth(alice));
  assert.equal(challenge.body.challenge.completed, 1);
  assert.equal(challenge.body.challenge.remaining, 24);

  const summary = await api().get('/api/shelf/summary').set(auth(alice));
  assert.deepEqual(summary.body.counts, { reading: 0, read: 1, want: 0 });
  assert.ok(summary.body.recentActivity.some((a) => a.type === 'finished'));
});

test('reviews: create, edit, like, list and delete', async () => {
  const bad = await api().put(`/api/reviews/book/${BOOK.olId}`).set(auth(alice)).send({ rating: 7 });
  assert.equal(bad.status, 400);

  const create = await api().put(`/api/reviews/book/${BOOK.olId}`).set(auth(alice)).send({ rating: 4, body: 'Clever and cosy.' });
  assert.equal(create.status, 201);
  const reviewId = create.body.review._id;

  const edit = await api().put(`/api/reviews/book/${BOOK.olId}`).set(auth(alice)).send({ rating: 5, body: 'Even better on reflection.' });
  assert.equal(edit.status, 200);
  assert.equal(edit.body.review._id, reviewId, 'editing keeps a single review');

  const ownLike = await api().post(`/api/reviews/${reviewId}/like`).set(auth(alice));
  assert.equal(ownLike.status, 400);
  const like = await api().post(`/api/reviews/${reviewId}/like`).set(auth(bob));
  assert.equal(like.body.likesCount, 1);

  const list = await api().get(`/api/reviews/book/${BOOK.olId}`).set(auth(bob));
  assert.equal(list.body.reviews.length, 1);
  assert.equal(list.body.reviews[0].likedByMe, true);
  assert.equal(list.body.reviews[0].rating, 5);

  const shelf = await api().get('/api/shelf?status=read&sort=rating').set(auth(alice));
  assert.equal(shelf.body.entries[0].myRating, 5);

  const forbidden = await api().delete(`/api/reviews/${reviewId}`).set(auth(bob));
  assert.equal(forbidden.status, 403);
  const del = await api().delete(`/api/reviews/${reviewId}`).set(auth(alice));
  assert.equal(del.status, 200);
});

test('custom shelves: create, add, dedupe, rename, delete', async () => {
  const create = await api().post('/api/custom-shelves').set(auth(alice)).send({ name: 'Cosy Reads' });
  assert.equal(create.status, 201);
  const id = create.body.shelf._id;

  const dupName = await api().post('/api/custom-shelves').set(auth(alice)).send({ name: 'cosy reads' });
  assert.equal(dupName.status, 409);

  await api().post(`/api/custom-shelves/${id}/books`).set(auth(alice)).send({ book: BOOK2 });
  const again = await api().post(`/api/custom-shelves/${id}/books`).set(auth(alice)).send({ book: BOOK2 });
  assert.equal(again.body.added, false);

  const books = await api().get(`/api/custom-shelves/${id}/books`).set(auth(alice));
  assert.equal(books.body.entries.length, 1);

  const rename = await api().patch(`/api/custom-shelves/${id}`).set(auth(alice)).send({ name: 'Winter Comfort' });
  assert.equal(rename.body.shelf.name, 'Winter Comfort');

  const bobTry = await api().delete(`/api/custom-shelves/${id}`).set(auth(bob));
  assert.equal(bobTry.status, 404);

  const del = await api().delete(`/api/custom-shelves/${id}`).set(auth(alice));
  assert.equal(del.status, 200);
});

test('community: follow, view public shelves and feed', async () => {
  const follow = await api().post('/api/users/alice/follow').set(auth(bob));
  assert.equal(follow.body.following, true);
  const twice = await api().post('/api/users/alice/follow').set(auth(bob));
  assert.equal(twice.body.followers, 1);

  const profile = await api().get('/api/users/alice').set(auth(bob));
  assert.equal(profile.body.user.isFollowing, true);
  assert.equal(profile.body.stats.read, 1);
  assert.equal(profile.body.user.email, undefined, 'email is private');

  const shelf = await api().get('/api/users/alice/shelf').set(auth(bob));
  assert.equal(shelf.body.entries.length, 1);

  const feed = await api().get('/api/activity/feed').set(auth(bob));
  assert.ok(feed.body.activities.length > 0);

  await api().patch('/api/users/me').set(auth(alice)).send({ isPublic: false, bio: 'Tea & books', favouriteGenres: ['Fantasy', 'Nope'] });
  const priv = await api().get('/api/users/alice/shelf').set(auth(bob));
  assert.equal(priv.status, 403);
  const me = await api().get('/api/auth/me').set(auth(alice));
  assert.deepEqual(me.body.user.favouriteGenres, ['Fantasy']);

  const unfollow = await api().delete('/api/users/alice/follow').set(auth(bob));
  assert.equal(unfollow.body.following, false);
});

test('removing a book from the shelf', async () => {
  const { body } = await api().get('/api/shelf').set(auth(alice));
  const del = await api().delete(`/api/shelf/${body.entries[0]._id}`).set(auth(alice));
  assert.equal(del.status, 200);
  const after = await api().get('/api/shelf').set(auth(alice));
  assert.equal(after.body.entries.length, 0);
});
