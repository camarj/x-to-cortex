# Architecture

## Decisiones

### 1. Scraping DOM vs API oficial
Elegido: **scraping DOM**.

Trade-off:
- API oficial requiere X Premium ($8/mes) + OAuth 2.0 app
- Scraping funciona con sesión logueada, cero costos
- Contra: frágil si X cambia el DOM

Mitigación: selectores centralizados en `SELECTORS` en `content.js`. Si rompe, se arregla en un solo lugar.

### 2. Clasificación en server, no en plugin
Elegido: **server local hace la clasificación**.

Ventajas:
- Plugin queda tonto, menos mantenimiento
- Cambios en filtros = editar `classify.js`, sin recargar extension
- API key nunca toca el navegador

### 3. Endpoint local vs webhook remoto
Elegido: **Node local en puerto 7777**.

Alternativas consideradas:
- Webhook a n8n en VPS → latencia, dependencia de internet, complejidad
- `chrome.downloads` + watcher → frágil, requiere script separado corriendo

Node local:
- Corre cuando querés sincronizar
- Escribe directo al filesystem
- Sin dependencias externas más allá de Anthropic API

### 4. Hilos como un solo .md
Elegido: **un archivo por hilo, tweets numerados dentro**.

Razón: semánticamente un hilo es una unidad. Fragmentar en N archivos rompe la lectura y hace el wiki más ruidoso.

### 5. Traducción + clasificación en una sola call
Elegido: **un único prompt hace ambas tareas**.

- 1 call en vez de 2 = 50% menos latencia
- Claude Haiku 4.5 maneja bien outputs estructurados JSON
- Si categoría = "other", `translated` viene `null` → ahorra tokens

## Flujo end-to-end

```
Usuario hace click en "Save to Cortex"
         │
         ▼
content.js extrae tweet/hilo
         │
         ▼
POST http://localhost:7777/ingest
         │
         ▼
server/index.js recibe
         │
         ▼
classify.js → Claude Haiku (1 call)
         │
         ▼
¿category ∈ {ai, software-dev, product, finance}?
    │                       │
   SÍ                      NO
    │                       │
    ▼                       ▼
writer.writePost()     logRejected()
writer.writeThread()        │
    │                       ▼
    ▼                   raw/x-bookmarks/_rejected.jsonl
raw/x-bookmarks/posts/*.md
raw/x-bookmarks/threads/*.md
         │
         ▼
Eventual: `/ingest` y `/compile` de Cortex
```

## Gotchas conocidas

1. **Sync masivo es lento.** X rate-limita. Estimado 2-3s por tweet → 100 bookmarks = ~5 min. El plugin debe mostrar progreso y poder pausar/reanudar.

2. **Bookmarks privados.** Requieren que la tab esté autenticada (session cookie). No hay workaround — funciona solo con tu sesión activa.

3. **Expandir hilos requiere visitar cada tweet.** Desde `/i/bookmarks` solo se ve el tweet guardado. Para hilo completo hay que navegar al status page.

4. **Cortex `raw/` puede requerir frontmatter específico.** Ver `Cortex/.claude/rules/kb-conventions.md`. Actualmente escribimos schema `{title, type, source, date_ingested, status}`. Validar después del primer run que no falle el hook de Cortex.

5. **Traducción de bloques grandes (hilos largos).** Si un hilo tiene 20+ tweets, el output JSON puede superar `max_tokens=2048`. Subir a 4096 o trocear.

## Próximos pasos

- [ ] Implementar `extractTweet` y `extractThread` en `content.js`
- [ ] Implementar `injectButton` con UI minimalista
- [ ] Implementar sync masivo desde `/i/bookmarks`
- [ ] Generar icons (16/48/128)
- [ ] Validar con un tweet real end-to-end
- [ ] Añadir retry + backoff exponencial en llamadas a Claude
- [ ] Añadir test mínimo para `writer.js` (sin mock del filesystem, usar `/tmp`)
