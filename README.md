# Blog Platform with Comments

A full-stack blogging platform where users can register, log in, create/edit/delete posts and comment on them.

## Features
- User registration, login and authentication (JWT + bcrypt password hashing)
- Create, edit, delete blog posts (only the author can edit/delete)
- Comment section for user interaction
- Backend with RESTful APIs and SQLite database integration

## Tech Stack
Node.js, Express, SQLite (better-sqlite3), JWT, HTML/CSS/Vanilla JS

## Run
```
npm install
npm start
```
Open http://localhost:3000

## API
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/register | No | Register |
| POST | /api/login | No | Login |
| GET | /api/posts | No | List posts |
| GET | /api/posts/:id | No | Get post |
| POST | /api/posts | Yes | Create post |
| PUT | /api/posts/:id | Yes (owner) | Edit post |
| DELETE | /api/posts/:id | Yes (owner) | Delete post |
| GET | /api/posts/:id/comments | No | List comments |
| POST | /api/posts/:id/comments | Yes | Add comment |
| DELETE | /api/comments/:id | Yes (owner) | Delete comment |
## Live Demo
https://blog-platform-1-lpd0.onrender.com/
