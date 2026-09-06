/**
 * Tipos compartidos para la extensión de navegador.
 */

/** Payload para solicitud de captura de evidencia */
export interface EvidencePayload {
  type: 'screenshot' | 'console' | 'network';
  description?: string;
  bugId?: string;
  testCaseId?: string;
}

/** Respuesta de la API después de enviar evidencia */
export interface EvidenceResponse {
  id: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
}

/** Solicitud de información de la página */
export interface EvidenceRequest {
  type: 'GET_PAGE_INFO' | 'HIGHLIGHT_ELEMENT' | 'CAPTURE_EVIDENCE';
  payload?: EvidencePayload;
  selector?: string;
}