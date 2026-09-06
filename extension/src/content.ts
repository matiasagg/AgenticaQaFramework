/**
 * Content script para la extensión de navegador.
 * Se inyecta en todas las páginas para interactuar con el DOM.
 */

/**
 * Listener para mensajes desde el background script.
 * Procesa solicitudes de captura y envía datos del DOM.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_INFO') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
    });
  }

  if (message.type === 'HIGHLIGHT_ELEMENT') {
    highlightElement(message.selector);
    sendResponse({ success: true });
  }
});

/**
 * Resalta un elemento en la página para identificación visual.
 * Útil para señalar elementos en reportes de bugs.
 */
function highlightElement(selector: string): void {
  const element = document.querySelector(selector);
  if (element) {
    (element as HTMLElement).style.outline = '3px solid #e53e3e';
    setTimeout(() => {
      (element as HTMLElement).style.outline = '';
    }, 3000);
  }
}

/**
 * Observador de mutaciones para detectar cambios dinámicos.
 * Útil para capturar errores de renderizado o cambios inesperados.
 */
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      console.log('[QA Extension] DOM changed:', mutation.addedNodes.length, 'nodes added');
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });