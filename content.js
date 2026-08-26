/**
 * Instagram Media & Stories Downloader
 * Content Script para descargar Historias, Reels, Fotos y Videos de Instagram Web.
 */

(function () {
  'use strict';

  // SVG Icons
  const ICONS = {
    DOWNLOAD: `<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>`,
    SUCCESS: `<svg viewBox="0 0 24 24"><path fill="#27c96a" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    ERROR: `<svg viewBox="0 0 24 24"><path fill="#ed4956" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`
  };

  // Notificación Toast
  function showToast(message, isError = false) {
    let toast = document.querySelector('.ig-dl-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'ig-dl-toast';
      document.body.appendChild(toast);
    }

    toast.className = `ig-dl-toast ${isError ? 'error' : 'success'}`;
    toast.innerHTML = `${isError ? ICONS.ERROR : ICONS.SUCCESS}<span>${message}</span>`;

    void toast.offsetWidth;
    toast.classList.add('show');

    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  // Formato de nombre de archivo
  function formatFilename(prefix, ext) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `Instagram_${prefix}_${date}.${ext}`;
  }

  // Extraer la mejor URL de una imagen (resolución más alta en srcset)
  function getBestImageUrl(imgElement) {
    if (!imgElement) return null;
    const srcset = imgElement.getAttribute('srcset');
    if (srcset) {
      const candidates = srcset.split(',').map(item => {
        const parts = item.trim().split(/\s+/);
        const url = parts[0];
        const width = parts[1] ? parseInt(parts[1].replace('w', ''), 10) : 0;
        return { url, width };
      });
      candidates.sort((a, b) => b.width - a.width);
      if (candidates.length > 0 && candidates[0].url) {
        return candidates[0].url;
      }
    }
    return imgElement.currentSrc || imgElement.src;
  }

  // Buscar URL de video progresivo completo (Audio + Video combinados) en React Fiber
  function findProgressiveVideoUrlFromReact(element) {
    let curr = element;
    for (let depth = 0; depth < 12 && curr; depth++) {
      const keys = Object.keys(curr);
      for (const key of keys) {
        if (key.startsWith('__reactFiber') || key.startsWith('__reactProps') || key.startsWith('__reactInternalInstance')) {
          const url = searchVideoVersions(curr[key], 0);
          if (url) return url;
        }
      }
      curr = curr.parentElement;
    }
    return null;
  }

  function searchVideoVersions(obj, depth) {
    if (!obj || depth > 8) return null;

    // Si encontramos video_versions de Instagram
    if (typeof obj === 'object') {
      if (obj.video_versions && Array.isArray(obj.video_versions) && obj.video_versions.length > 0) {
        // Ordenar por mayor resolución para descargar la máxima calidad completa
        const sorted = [...obj.video_versions].sort((a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0)));
        if (sorted[0]?.url) return sorted[0].url;
      }

      if (obj.progressive_download_url && typeof obj.progressive_download_url === 'string') {
        return obj.progressive_download_url;
      }

      if (obj.videoUrl && typeof obj.videoUrl === 'string' && !obj.videoUrl.startsWith('blob:')) {
        return obj.videoUrl;
      }

      // Buscar en propiedades anidadas comunes de componentes de Instagram
      const candidateKeys = ['item', 'media', 'post', 'clips_metadata', 'videoData', 'props', 'memoizedProps', 'child', 'sibling'];
      for (const k of candidateKeys) {
        if (obj[k]) {
          const res = searchVideoVersions(obj[k], depth + 1);
          if (res) return res;
        }
      }
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item && item.url && (item.width || item.height || typeof item.type === 'number')) {
          return item.url;
        }
        const res = searchVideoVersions(item, depth + 1);
        if (res) return res;
      }
    }

    return null;
  }

  // Filtrar recursos de red para obtener el video completo descartando pistas de solo audio
  function getBestVideoFromPerformance() {
    try {
      const entries = performance.getEntriesByType('resource');
      const videoEntries = [];

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        const name = entry.name;

        if ((name.includes('cdninstagram.com') || name.includes('fbcdn.net')) &&
            (name.includes('.mp4') || name.includes('/v/t50.') || name.includes('/o1/v/t16/'))) {
          
          // Descartar pistas que sean solo de audio (m4a, audios, codecs de audio)
          if (name.includes('audio') || name.includes('_a.mp4') || name.includes('&audio_only=1') || name.includes('/audio/')) {
            continue;
          }

          // Priorizar archivos de video de mayor tamaño
          videoEntries.push({
            url: name.split('&bytestart=')[0],
            size: entry.encodedBodySize || entry.transferSize || 0
          });
        }
      }

      if (videoEntries.length > 0) {
        videoEntries.sort((a, b) => b.size - a.size);
        return videoEntries[0].url;
      }
    } catch (e) {}
    return null;
  }

  // Extraer URL real de video (con audio y video combinados)
  function getRealVideoUrl(videoElement) {
    if (!videoElement) return null;

    // 1. Intentar obtener el video progresivo oficial desde los datos de React de Instagram
    const reactVideoUrl = findProgressiveVideoUrlFromReact(videoElement);
    if (reactVideoUrl) {
      return reactVideoUrl;
    }

    // 2. Si el elemento tiene un src directo HTTP que no es blob ni audio
    const directSrc = videoElement.currentSrc || videoElement.src || (videoElement.querySelector('source') && videoElement.querySelector('source').src);
    if (directSrc && directSrc.startsWith('http') && !directSrc.startsWith('blob:') && !directSrc.includes('audio')) {
      return directSrc;
    }

    // 3. Obtener el mejor recurso de video de red (descartando pistas de audio aisladas)
    const perfVideoUrl = getBestVideoFromPerformance();
    if (perfVideoUrl) {
      return perfVideoUrl;
    }

    return directSrc || null;
  }

  // Descarga segura con la API de Chrome y fallback
  function downloadFile(url, filename) {
    if (!url) {
      showToast('No se encontró el enlace del archivo.', true);
      return;
    }

    showToast('Iniciando descarga...');

    // Verificar si el contexto de la extensión sigue válido
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          action: 'download_media',
          url: url,
          filename: filename
        }, (response) => {
          if (chrome.runtime.lastError || (response && !response.success)) {
            console.warn('[Instagram Downloader] Descarga nativa con advertencia:', chrome.runtime.lastError?.message || response?.error);
            fallbackDirectDownload(url, filename);
          } else {
            showToast('¡Descarga completada!');
          }
        });
        return;
      }
    } catch (err) {
      console.warn('[Instagram Downloader] Contexto de extensión desconectado, usando fallback...', err);
      showToast('Por favor recarga la página (F5) para sincronizar la extensión.', true);
    }

    fallbackDirectDownload(url, filename);
  }

  function fallbackDirectDownload(url, filename) {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('¡Descarga iniciada!');
    } catch (e) {
      showToast('Error al descargar el archivo.', true);
    }
  }

  // 1. DESCARGA DE HISTORIAS (STORIES)
  function handleStoryDownload() {
    // Buscar video de la historia activa
    const video = document.querySelector('section video, div[role="dialog"] video, video');
    if (video) {
      const videoSrc = getRealVideoUrl(video);
      if (videoSrc) {
        const username = window.location.pathname.split('/')[2] || 'Story';
        downloadFile(videoSrc, formatFilename(`Story_${username}`, 'mp4'));
        return;
      }
    }

    // Si no es video, buscar la imagen activa de la historia
    const storyImages = Array.from(document.querySelectorAll('section img, div[role="dialog"] img, img'));
    const validImg = storyImages.find(img => {
      const rect = img.getBoundingClientRect();
      return rect.width > 200 && rect.height > 300 && !img.alt.includes('profile');
    });

    if (validImg) {
      const imgUrl = getBestImageUrl(validImg);
      const username = window.location.pathname.split('/')[2] || 'Story';
      downloadFile(imgUrl, formatFilename(`Story_${username}`, 'jpg'));
    } else {
      showToast('No se encontró el medio de la historia.', true);
    }
  }

  // Inyectar botón en visor de historias
  function injectStoriesButton() {
    if (!window.location.pathname.includes('/stories/')) {
      const existingBtn = document.querySelector('.ig-story-dl-btn');
      if (existingBtn) existingBtn.remove();
      return;
    }

    if (document.querySelector('.ig-story-dl-btn')) return;

    const storyHeader = document.querySelector('section header, section > div > div > header, div[role="dialog"] header');
    const btn = document.createElement('button');
    btn.className = 'ig-story-dl-btn';
    btn.innerHTML = `${ICONS.DOWNLOAD}<span>Descargar</span>`;
    btn.title = 'Descargar esta historia';

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleStoryDownload();
    });

    if (storyHeader) {
      storyHeader.appendChild(btn);
    } else {
      // Inyección flotante
      btn.style.position = 'fixed';
      btn.style.top = '24px';
      btn.style.right = '90px';
      btn.style.zIndex = '999999';
      document.body.appendChild(btn);
    }
  }

  // 2. DESCARGA DE REELS
  function handleReelDownload(container) {
    const video = (container || document).querySelector('video');
    if (video) {
      const src = getRealVideoUrl(video);
      if (src) {
        downloadFile(src, formatFilename('Reel', 'mp4'));
        return;
      }
    }
    showToast('No se encontró el video del Reel.', true);
  }

  // Inyectar botón en la barra de acciones de Reels
  function injectReelsButton() {
    const reelActionContainers = document.querySelectorAll('div[role="presentation"] section, div[role="dialog"] section, article section');
    
    reelActionContainers.forEach(container => {
      if (container.querySelector('.ig-reel-dl-btn')) return;

      const isReel = window.location.pathname.includes('/reel') || window.location.pathname.includes('/reels') || container.closest('article');
      if (!isReel) return;

      const reelWrapper = container.closest('article') || container.closest('div[role="presentation"]') || container.closest('div[role="dialog"]');
      if (!reelWrapper || !reelWrapper.querySelector('video')) return;

      const btnWrapper = document.createElement('div');
      btnWrapper.className = 'ig-reel-dl-wrapper';
      btnWrapper.innerHTML = `
        <button class="ig-reel-dl-btn" title="Descargar Reel">
          ${ICONS.DOWNLOAD}
          <span>Descargar</span>
        </button>
      `;

      btnWrapper.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        handleReelDownload(reelWrapper);
      });

      container.appendChild(btnWrapper);
    });
  }

  // 3. DESCARGA DE PUBLICACIONES (FEED / MODALES)
  function handlePostDownload(article) {
    if (!article) return;

    // Verificar si contiene video
    const video = article.querySelector('video');
    if (video) {
      const src = getRealVideoUrl(video);
      if (src) {
        downloadFile(src, formatFilename('Post_Video', 'mp4'));
        return;
      }
    }

    // Verificar fotos (incluyendo carruseles)
    const images = Array.from(article.querySelectorAll('img')).filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.width > 200 && rect.height > 200 && !img.alt.includes('profile');
    });

    if (images.length > 0) {
      const visibleImg = images.find(img => {
        const rect = img.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= window.innerWidth + 50;
      }) || images[0];

      const imgUrl = getBestImageUrl(visibleImg);
      downloadFile(imgUrl, formatFilename('Post_Photo', 'jpg'));
    } else {
      showToast('No se encontró el contenido de la publicación.', true);
    }
  }

  // Inyectar botón de descarga en posts del feed y diálogos
  function injectPostButtons() {
    const articles = document.querySelectorAll('article');
    articles.forEach(article => {
      const actionBar = article.querySelector('section');
      if (!actionBar || actionBar.querySelector('.ig-dl-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'ig-dl-btn';
      btn.innerHTML = ICONS.DOWNLOAD;
      btn.title = 'Descargar Foto / Video';

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handlePostDownload(article);
      });

      // Insertar junto al botón de guardar o al final de la barra
      const bookmarkBtn = actionBar.querySelector('svg[aria-label*="Guardar"], svg[aria-label*="Save"]')?.closest('div, button');
      if (bookmarkBtn && bookmarkBtn.parentElement) {
        bookmarkBtn.parentElement.appendChild(btn);
      } else {
        actionBar.appendChild(btn);
      }
    });
  }

  // 4. DESCARGA GLOBAL (Desde el clic en el icono de la extensión)
  function handleGlobalDownload() {
    if (window.location.pathname.includes('/stories/')) {
      handleStoryDownload();
      return;
    }

    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) {
      const article = dialog.querySelector('article') || dialog;
      handlePostDownload(article);
      return;
    }

    if (window.location.pathname.includes('/reel')) {
      handleReelDownload(document);
      return;
    }

    const articles = Array.from(document.querySelectorAll('article'));
    let bestArticle = null;
    let minDistance = Infinity;

    articles.forEach(art => {
      const rect = art.getBoundingClientRect();
      const distance = Math.abs(rect.top);
      if (rect.bottom > 100 && distance < minDistance) {
        minDistance = distance;
        bestArticle = art;
      }
    });

    if (bestArticle) {
      handlePostDownload(bestArticle);
    } else {
      showToast('Abre una publicación, Reel o Historia para descargar.', true);
    }
  }

  // Escuchar mensajes desde el Service Worker (background.js)
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'trigger_download') {
          handleGlobalDownload();
          sendResponse({ status: 'ok' });
        }
      });
    }
  } catch (e) {}

  // Ciclo principal de inyección de botones con MutationObserver
  let debounceTimeout = null;
  function processPage() {
    injectStoriesButton();
    injectReelsButton();
    injectPostButtons();
  }

  const observer = new MutationObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(processPage, 350);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Ejecución inicial
  setTimeout(processPage, 1000);

  console.log('[Instagram Downloader] Extensión v1.0.0 lista.');
})();
