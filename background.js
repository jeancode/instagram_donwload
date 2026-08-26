// Listener para cuando el usuario hace clic en el icono de la extensión en la barra
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.url && tab.url.includes('instagram.com')) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'trigger_download'
      });
    } catch (err) {
      console.warn('[Instagram Downloader] Error comunicando con la pestaña:', err);
    }
  }
});

// Listener para peticiones de descarga usando la API nativa de descargas de Chrome
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download_media') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename || 'Instagram_Media.jpg',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('[Instagram Downloader] Error en chrome.downloads:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    return true; // Mantener canal abierto para respuesta asíncrona
  }
});
