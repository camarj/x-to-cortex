# Extension — X to Cortex

Chrome extension (Manifest V3) que corre en `x.com` y `twitter.com`.

## Archivos

- `manifest.json` — config MV3
- `src/content.js` — corre en las páginas de X, detecta tweets, extrae e inyecta botones
- `src/background.js` — service worker
- `src/popup/` — UI del toolbar button (sync masivo, status del server)
- `icons/` — 16/48/128 px

## Instalar en modo dev

1. `chrome://extensions`
2. Activar "Developer mode" (arriba derecha)
3. "Load unpacked" → seleccionar esta carpeta `extension/`

## Icons

Falta generar los PNG (placeholder). Comandos sugeridos con ImageMagick:

```bash
# partir de un SVG o PNG grande
convert source.png -resize 16x16 icons/icon16.png
convert source.png -resize 48x48 icons/icon48.png
convert source.png -resize 128x128 icons/icon128.png
```
