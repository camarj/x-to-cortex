# Server — X to Cortex

Express local que recibe tweets de la extensión, clasifica con Claude Haiku y escribe `.md` a `Cortex/raw/x-bookmarks/`.

## Endpoints

### `GET /health`
Devuelve `{ ok, cortexRawPath, model }`. Usado por el popup para status indicator.

### `POST /ingest`
Body (post individual):
```json
{
  "kind": "post",
  "tweet": {
    "id": "1234567890",
    "author": "@handle",
    "text": "original tweet text",
    "urls": ["https://..."],
    "dateBookmarked": "2026-04-15"
  }
}
```

Body (hilo):
```json
{
  "kind": "thread",
  "thread": {
    "rootId": "1234567890",
    "author": "@handle",
    "tweets": [
      { "id": "1", "text": "...", "urls": [] },
      { "id": "2", "text": "...", "urls": [] }
    ],
    "dateBookmarked": "2026-04-15"
  }
}
```

Respuesta:
```json
{ "ok": true, "stored": true, "filepath": "...", "category": "ai" }
```

o si no pasó el filtro:
```json
{ "ok": true, "stored": false, "reason": "other" }
```

## Setup

```bash
npm install
cp .env.example .env
# editar .env con ANTHROPIC_API_KEY
npm start    # prod
npm run dev  # watch mode
```

## Estructura de output

```
Cortex/raw/x-bookmarks/
├── posts/
│   └── 2026-04-15-{tweetId}-{slug}.md
├── threads/
│   └── 2026-04-15-{rootId}-{slug}.md
└── _rejected.jsonl      # tweets clasificados como "other"
```
