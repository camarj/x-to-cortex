# x-to-cortex

Chrome extension + local server que captura bookmarks de X (Twitter), los clasifica con Claude Haiku, traduce al español y los archiva en un knowledge base local ([Cortex](https://github.com/camarj/cortex)) en formato Markdown.

## Por qué

X es una fuente densa de señal sobre IA, desarrollo de software, producto y finanzas. Los bookmarks de X son un cementerio — se guardan y nunca se vuelven a leer. Este proyecto los convierte en notas procesables en una bóveda de Obsidian.

## Arquitectura

```
Chrome Extension
├── content script (x.com)
│   ├── detecta tipo (post | thread)
│   ├── extrae tweets del autor
│   └── POST → http://localhost:7777/ingest
│
Local Node Server (puerto 7777)
├── clasifica + traduce (Claude Haiku 4.5)
├── filtra categorías: ai, software-dev, product, finance
├── match   → escribe .md en raw/x-bookmarks/{posts|threads}/
└── no match → log en raw/x-bookmarks/_rejected.jsonl
```

## Stack

| Componente | Tech |
|---|---|
| Extension | Manifest V3, vanilla JS |
| Server | Node + Express |
| LLM | Claude Haiku 4.5 (`@anthropic-ai/sdk`) |
| Storage | Markdown en filesystem local |

## Estructura del repo

```
x-to-cortex/
├── extension/        # Chrome extension (Manifest V3)
│   ├── manifest.json
│   ├── src/
│   │   ├── content.js       # runs en x.com, extrae tweets
│   │   ├── background.js    # service worker
│   │   └── popup/           # UI del toolbar button
│   └── icons/
├── server/           # Express local en :7777
│   ├── src/
│   │   ├── index.js    # routing + http
│   │   ├── classify.js # Claude Haiku para clasificar + traducir
│   │   ├── writer.js   # escribe .md en Cortex/raw/
│   │   └── config.js   # paths, env vars
│   └── package.json
└── docs/
    └── architecture.md
```

## Setup rápido

### 1. Server

```bash
cd server
npm install
cp .env.example .env
# editar .env con tu ANTHROPIC_API_KEY
npm start
```

Sirve en `http://localhost:7777`.

### 2. Extension

1. Abrir `chrome://extensions`
2. Activar "Developer mode"
3. "Load unpacked" → seleccionar `extension/`
4. El ícono aparece en la toolbar

## Uso

Click en el botón **→ Cortex** que aparece en cada tweet (al lado de share).

- **Tweet individual:** click desde cualquier vista
- **Hilo completo:** primero entra al permalink del tweet (click en su fecha), luego dale al botón. Captura todos los tweets del autor en el hilo.
- **Posts largos con "Show more":** entra al permalink primero (X carga el texto completo en esa vista) y luego dale al botón.

> Nota: el sync masivo desde `/i/bookmarks` se descartó porque X no muestra hilos completos en esa vista (solo el tweet bookmarkeado). El botón individual es el flujo principal.

## Categorías filtradas

Solo se guardan tweets clasificados en:
- `ai` — inteligencia artificial, LLMs, ML
- `software-dev` — desarrollo de software, programación, DevOps
- `product` — product management, UX, design thinking
- `finance` — finanzas, inversión, economía

Todo lo demás se loguea en `_rejected.jsonl` con su clasificación, por si cambias de opinión.

## Estado

**WIP** — scaffolding inicial. Ver `docs/architecture.md` para detalles.

## License

MIT
