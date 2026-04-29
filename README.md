# x-to-cortex

> Chrome extension + local server que captura bookmarks de X (Twitter), los clasifica con Claude Haiku y los archiva como Markdown en tu knowledge base local.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)

## ¿Por qué?

X es una fuente densa de señal sobre IA, desarrollo, producto y finanzas. Los bookmarks de X son un cementerio — se guardan y nunca se vuelven a leer. Este proyecto los convierte en notas procesables en tu bóveda de Obsidian (o cualquier sistema basado en Markdown).

## Demo

```
Click en "→ Cortex" en cualquier tweet
        ↓
Claude Haiku clasifica + traduce
        ↓
Archivo .md en tu wiki local
```

## Arquitectura

```
Chrome Extension                    Local Server (Node + Express)
├─ content script (x.com)           ├─ POST /ingest
│  ├─ detecta tipo (post | thread)  ├─ clasifica + traduce (Claude Haiku)
│  ├─ extrae tweets del autor       ├─ filtra por categoría
│  └─ POST localhost:7777/ingest    └─ escribe .md en raw/x-bookmarks/
└─ popup UI                                                       └─ _rejected.jsonl
```

## Stack

| Componente | Tech |
|---|---|
| Extension | Manifest V3, vanilla JS |
| Server | Node + Express |
| LLM | Claude Haiku 4.5 (`@anthropic-ai/sdk`) |
| Storage | Markdown en filesystem local |

## Instalación

### 1. Server

```bash
cd server
npm install
cp .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY
npm start
```

Sirve en `http://localhost:7777`.

### 2. Extension

1. Abre `chrome:///extensions`
2. Activa "Developer mode"
3. "Load unpacked" → selecciona la carpeta `extension/`

## Uso

Haz click en el botón **→ Cortex** que aparece junto a cada tweet.

| Escenario | Acción |
|---|---|
| Tweet individual | Click directo desde cualquier vista |
| Hilo completo | Entra al permalink (click en la fecha), luego click en el botón |
| Post largo con "Show more" | Entra al permalink primero — X carga el texto completo ahí |

> Nota: el sync masivo desde `/i/bookmarks` se descartó porque X no muestra hilos completos en esa vista.

## Categorías

Solo se guardan tweets clasificados como:

- `ai` — inteligencia artificial, LLMs, ML
- `software-dev` — desarrollo de software, programación, DevOps
- `product` — product management, UX, design thinking
- `finance` — finanzas, inversión, economía

Todo lo demás se loguea en `_rejected.jsonl` para auditoría.

## Estructura de salida

```
raw/x-bookmarks/
├── posts/
│   └── 2025-01-15-slug-del-tweet.md
├── threads/
│   └── 2025-01-15-slug-del-hilo.md
└── _rejected.jsonl
```

## Roadmap

- [ ] Soporte para threads de más de 2 niveles de profundidad
- [ ] Filtro configurable de categorías vía UI
- [ ] Integración directa con Notion como destino alternativo
- [ ] Export batch desde `/i/bookmarks` (si X expone API estable)

## License

MIT © [Raúl Camacho](https://github.com/camarj)
