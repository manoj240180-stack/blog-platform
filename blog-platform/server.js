const express = require("express");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const db = new Database("blog.db");
const SECRET = "change-this-secret";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Please log in" });
  }
}

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 4)
    return res.status(400).json({ error: "Username and password (min 4 chars) required" });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const r = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hash);
    const token = jwt.sign({ id: Number(r.lastInsertRowid), username }, SECRET, { expiresIn: "7d" });
    res.json({ token, username });
  } catch {
    res.status(409).json({ error: "Username already taken" });
  }
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, username }, SECRET, { expiresIn: "7d" });
  res.json({ token, username });
});

app.get("/api/posts", (req, res) => {
  res.json(db.prepare(`
    SELECT p.*, u.username FROM posts p
    JOIN users u ON u.id = p.user_id ORDER BY p.id DESC`).all());
});

app.get("/api/posts/:id", (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.username FROM posts p
    JOIN users u ON u.id = p.user_id WHERE p.id = ?`).get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

app.post("/api/posts", auth, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Title and content required" });
  const r = db.prepare("INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)")
    .run(title, content, req.user.id);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.put("/api/posts/:id", auth, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: "Not your post" });
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Title and content required" });
  db.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?").run(title, content, post.id);
  res.json({ ok: true });
});

app.delete("/api/posts/:id", auth, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: "Not your post" });
  db.prepare("DELETE FROM posts WHERE id = ?").run(post.id);
  res.json({ ok: true });
});

app.get("/api/posts/:id/comments", (req, res) => {
  res.json(db.prepare(`
    SELECT c.*, u.username FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ? ORDER BY c.id ASC`).all(req.params.id));
});

app.post("/api/posts/:id/comments", auth, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Comment text required" });
  db.prepare("INSERT INTO comments (post_id, user_id, text) VALUES (?, ?, ?)")
    .run(req.params.id, req.user.id, text);
  res.status(201).json({ ok: true });
});

app.delete("/api/comments/:id", auth, (req, res) => {
  const c = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "Not found" });
  if (c.user_id !== req.user.id) return res.status(403).json({ error: "Not your comment" });
  db.prepare("DELETE FROM comments WHERE id = ?").run(c.id);
  res.json({ ok: true });
});

app.listen(3000, () => console.log("Running at http://localhost:3000"));
