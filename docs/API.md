# API reference

All responses use `{ "success": true, "data": {} }`; errors use `{ "success": false, "error": { "message", "traceId" } }`.

## Authentication

Register with `POST /api/auth/register` using `{ name, email, password, role? }`; passwords must be at least 10 characters and include upper/lowercase letters plus a number. Login returns an access token and HTTP-only access/refresh cookies. Send `Authorization: Bearer <token>` for protected requests.

`POST /api/auth/refresh` rotates the refresh token. `POST /api/auth/forgot-password` returns a reset token only outside production; a production deployment should send that token through an email provider. Complete reset using `POST /api/auth/reset-password` with `{ token, newPassword }`.

## Tutor example

```json
POST /api/tutor/respond
{ "conversationId": "665...", "message": "Write binary search for me", "strictness": 4 }
```

The result includes `{ response: { mode, message, checkpointQuestion, expectedAction, concepts, masteryUpdate, allowFinalAnswer }, gated }`. In strict mode, a final answer is converted to a checkpoint until mastery reaches 70.

## Evidence workflow

1. `POST /api/diagnosis/run` with `message`, `subject`, and optionally `conversationId`.
2. `POST /api/hints/generate` for the least-revealing available hint.
3. `POST /api/actions/submit` with action, task, and learner response.
4. `POST /api/practice/generate`, then `POST /api/practice/:id/submit`.
5. `POST /api/mastery/validate` or `/api/explain-back/evaluate`.
6. Educators view persisted evidence using `/api/dashboard/student/:id`.
