/**
 * Service worker para la extensión de navegador.
 * Maneja la comunicación con la API y la captura de evidencia.
 */

import { EvidencePayload, EvidenceResponse } from './types';

// Configuración de la API
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Listener para mensajes desde content script o popup.
 * Procesa solicitudes de captura de evidencia y envío a la API.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CAPTURE_EVIDENCE') {
    captureEvidence(message.payload)
      .then((response) => sendResponse({ success: true, data: response }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Indica respuesta asíncrona
  }
});

/**
 * Captura evidencia (screenshot) de la pestaña activa.
 * Usa la API de Chrome para capturar la ventana visible.
 */
async function captureEvidence(payload: EvidencePayload): Promise<EvidenceResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) {
    throw new Error('No active tab found');
  }

  const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });

  const response = await fetch(`${API_BASE_URL}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      screenshot: dataUrl,
      tabUrl: tab.url,
      tabTitle: tab.title,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}