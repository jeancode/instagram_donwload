# 📸 Instagram Media & Stories Downloader (Manifest V3)

> **Extensión de navegador moderna, transparente y 100% segura para descargar Historias, Reels, Videos y Fotos de Instagram Web en un solo clic.**

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue.svg)
![Status](https://img.shields.io/badge/Estado-100%25%20Funcional-success.svg)
![Security](https://img.shields.io/badge/Seguridad-Auditado%20%26%20Sin%20Telemetr%C3%ADa-brightgreen.svg)

---

## 📅 Estado de Pruebas y Verificación

- **Última fecha de prueba y verificación:** 26 de agosto de 2026
- **Resultado:** ✅ **100% Funcional y Estable**
- **Plataformas verificadas:** Google Chrome (120+), Microsoft Edge, Brave, Opera y navegadores basados en Chromium.

---

## 🔒 Garantía de Seguridad y Privacidad (Sin Espías ni Código Malicioso)

Este proyecto es **100% Código Abierto (Open Source)** y auditable:

- 🛡️ **Cero Conexiones Externas:** La extensión **no** envía tus datos, credenciales ni actividad a ningún servidor externo.
- 🚫 **Sin Telemetría, Rastreadores ni Anuncios:** Cero scripts de análisis, cero capturadores de cookies y cero inyecciones de publicidad.
- 🔐 **Privacidad de tu Cuenta de Instagram:** La extensión opera de forma puramente local en el navegador del usuario. No recopila contraseñas, no accede a mensajes directos (DMs) ni almacena información personal.
- 📄 **Transparencia en el Código:**
  - `manifest.json`: Configurado estrictamente en **Manifest V3** con el único permiso nativo necesario (`downloads`) para guardar los medios descargados.
  - `background.js`: Service Worker transparente que solo gestiona la descarga local de archivos a través de la API nativa de Chrome.
  - `content.js`: Código claro y legible que localiza los medios en pantalla (fotos, videos, reels, historias) y extrae la versión de mayor calidad.
  - `styles.css`: Estilos visuales adaptados a la interfaz de Instagram.

---

## ✨ Características Principales

- 🎬 **Historias (Stories) y Momentos Destacados:** Botón *"Descargar"* integrado en la barra superior del visor de historias.
- 📱 **Reels de Instagram:** Botón de descarga en la columna lateral de acciones del Reel.
- 🖼️ **Publicaciones del Feed y Modales:** Botón de descarga en la barra de acciones de cada post (compatible con fotos individuales y carruseles).
- 🔊 **Audio y Video Combinados:** Descarga videos completos con audio integrado mediante extracción progresiva de alta calidad.
- 🔍 **Máxima Resolución Automática:** Analiza las etiquetas `srcset` de Instagram para obtener siempre la versión con mayor nitidez.
- 🏷️ **Nombres Organizados:** Guarda los archivos ordenados con fecha y hora (`Instagram_Story_usuario_YYYYMMDD_HHMMSS.mp4`, etc.).
- 🔔 **Notificaciones Visuales:** Avisos flotantes (*Toast*) que informan del progreso y éxito de la descarga.

---

## 🚀 Instalación Paso a Paso (Modo Desarrollador)

1. **Descarga o clona** este repositorio en tu ordenador.
2. Abre tu navegador y dirígete a:
   - **Google Chrome:** `chrome://extensions/`
   - **Microsoft Edge:** `edge://extensions/`
   - **Brave:** `brave://extensions/`
3. Activa la casilla **"Modo de desarrollador"** (*Developer mode*) en la esquina superior derecha.
4. Haz clic en el botón **"Cargar descomprimida"** (*Load unpacked*).
5. Selecciona la carpeta de este proyecto (`instagram_donwload`).
6. Entra a [Instagram Web](https://www.instagram.com/) y verás los botones de descarga integrados en cada publicación, historia y reel.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Eres libre de usarlo, modificarlo y compartirlo.
