/**
 * Gemini AI Service
 *
 * Servicio para interactuar con la API de Google Gemini.
 * Se usa para enriquecer la validación DoR con análisis de IA,
 * generar sugerencias de pruebas e integrar agentes de IA.
 *
 * Soporte BYO (Bring Your Own) key: cada función acepta un parámetro
 * opcional `userApiKey` que, si se provee (encriptado del usuario),
 * se desencripta y se usa en lugar de la clave global de la aplicación.
 *
 * IMPORTANTE: Esta versión NO silencia los errores de la API de Gemini.
 * Si la llamada falla (key inválida, cuota agotada, modelo no disponible,
 * respuesta bloqueada, JSON no parseable), se lanza una excepción para que
 * el caller decida cómo manejarlo. Esto evita que un fallo real se guarde
 * como si fuera un análisis válido (score 50) y se quede en cache.
 */
import { config } from '../config';
import { decryptApiKey } from '../utils/encryption';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}

interface DorAiAnalysis {
  score: number;
  isReady: boolean;
  suggestions: string[];
  improvedDescription?: string;
  missingElements: string[];
  riskAreas: string[];
}

/**
 * Resuelve qué clave de API usar.
 * Prioriza la key del usuario (BYO); si no existe, usa la key global.
 *
 * @param userApiKey - Key encriptada del usuario (opcional). Si es null/undefined
 *                     o está vacía, se usa la key global de config.gemini.
 * @returns La key de API a usar para la llamada (desencriptada si es del usuario)
 */
function resolveApiKey(userApiKey?: string | null): string {
  // Si el usuario tiene su propia key configurada, desencriptarla y usarla
  if (userApiKey && userApiKey.trim()) {
    return decryptApiKey(userApiKey);
  }
  // Fallback: usar la key global de la aplicación
  return config.gemini.apiKey;
}

/**
 * Llama a la API de Gemini para analizar un prompt.
 *
 * Valida que la respuesta tenga la estructura esperada y que contenga texto.
 * Si la respuesta está bloqueada por seguridad o no tiene texto, lanza un error
 * descriptivo en lugar de devolver contenido parcial.
 *
 * @param prompt - El prompt a enviar a Gemini
 * @param userApiKey - Key encriptada del usuario (opcional, BYO key)
 * @returns El texto de respuesta de Gemini
 * @throws Error si la key no está configurada, la API responde con error,
 *                la respuesta está bloqueada o no contiene texto.
 */
async function callGemini(prompt: string, userApiKey?: string | null): Promise<string> {
  const apiKey = resolveApiKey(userApiKey);

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada. Configura tu API key en Settings.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
        generationConfig: {
          temperature: 0.3,
          // Algunos modelos de tipo "thinking" consumen parte del presupuesto
          // de salida en tokens de razonamiento interno, por lo que subimos el
          // límite para evitar truncar la respuesta JSON.
          maxOutputTokens: 16384,
        },
      }),
    });
  } catch (fetchError) {
    // Error de red / conexión: propagarlo con mensaje claro
    throw new Error(`No se pudo conectar con la API de Gemini: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
  }

  if (!response.ok) {
    const error = await response.text();
    // Incluir el código HTTP (401 key inválida, 403 sin permiso, 404 modelo no
    // disponible, 429 cuota agotada, etc.) y el cuerpo del error de Google.
    const status = response.status;
    let detail = error;
    try {
      const parsed = JSON.parse(error);
      detail = parsed?.error?.message || parsed?.error?.status || error;
    } catch {
      // El cuerpo no es JSON; usamos el texto crudo.
    }
    throw new Error(`Gemini API error ${status}: ${detail}`);
  }

  let data: GeminiResponse;
  try {
    data = await response.json() as GeminiResponse;
  } catch {
    throw new Error('Gemini API devolvió una respuesta que no es JSON válido.');
  }

  // Respuesta bloqueada por políticas de seguridad de Google
  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini API bloqueó la respuesta (blockReason: ${blockReason}). Revisa el contenido del prompt.`);
  }

  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP' && finishReason !== 'STOP_SEQUENCE') {
    throw new Error(`Gemini API finalizó con motivo inesperado: ${finishReason}${finishReason === 'MAX_TOKENS' ? ' (respuesta truncada)' : ''}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error('Gemini API devolvió una respuesta vacía (sin texto).');
  }

  return text;
}

/**
 * Limpia la respuesta de Gemini quitando el formato markdown si existe.
 * Gemini a veces envuelve el JSON en bloques de código con distintos lenguajes
 * (```json, ```, ```js, ```javascript) o agrega texto alrededor.
 *
 * @param response - Texto crudo de la respuesta de Gemini
 * @returns El texto limpio, listo para parsear como JSON
 */
function cleanGeminiResponse(response: string): string {
  let cleanResponse = response.trim();

  // Quitar bloques de código markdown con o sin lenguaje, p. ej.
  // ```json\n{...}\n```  o  ```\n{...}\n```  o  ```js\n[...]\n```
  const codeBlockMatch = cleanResponse.match(/^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/);
  if (codeBlockMatch) {
    cleanResponse = codeBlockMatch[1].trim();
  }

  // Si todavía quedan marcadores sueltos, quitarlos por seguridad
  cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```[a-zA-Z]*\s*/g, '').replace(/```/g, '').trim();

  return cleanResponse;
}

/**
 * Extrae y parsea JSON desde la respuesta de Gemini.
 *
 * Trata de parsear la respuesta completa; si falla, intenta localizar el primer
 * `{` u `[` y el último `}` o `]` para aislar el JSON dentro de texto adicional.
 *
 * @param response - Respuesta cruda de Gemini (posible JSON con markdown/texto)
 * @returns El objeto/array parseado
 * @throws Error si no se puede extraer JSON válido
 */
function parseGeminiJson<T>(response: string): T {
  const cleaned = cleanGeminiResponse(response);

  // 1) Intentar parsear directamente
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // continuar al método robusto
  }

  // 2) Aislar el bloque JSON entre el primer `{`/`[` y el último `}`/`]`
  const firstOpen = cleaned.search(/[\[{]/);
  const lastClose = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  if (firstOpen !== -1 && lastClose > firstOpen) {
    const candidate = cleaned.slice(firstOpen, lastClose + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // continuar y lanzar error descriptivo
    }
  }

  throw new Error(`No se pudo parsear la respuesta de Gemini como JSON. Respuesta cruda: ${cleaned.slice(0, 300)}...`);
}

/**
 * Analiza una HDU usando Gemini AI para complementar la validación DoR.
 *
 * Combina validación estática (reglas) con análisis de IA (Gemini) para
 * obtener un score de preparación más preciso.
 *
 * IMPORTANTE: Si Gemini falla, esta función LANZA un error en lugar de devolver
 * un fallback silencioso. El caller debe decidir cómo manejarlo (p. ej. no
 * persistir el resultado y reintentar en la siguiente solicitud).
 *
 * @param userStory - Datos de la historia de usuario a validar
 * @param userApiKey - Key encriptada del usuario (opcional, BYO key)
 * @returns Análisis con score, sugerencias y áreas de riesgo
 * @throws Error si la API de Gemini falla o la respuesta no es parseable
 */
export async function analyzeUserStoryWithAI(userStory: {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: string;
  storyPoints?: number;
}, userApiKey?: string | null): Promise<DorAiAnalysis> {
  const prompt = `Eres un experto en QA y análisis de historias de usuario. 
Analiza la siguiente Historia de Usuario y determina si está lista para ser probada (Definition of Ready).

Título: ${userStory.title}

Descripción: ${userStory.description}

Criterios de Aceptación:
${userStory.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Prioridad: ${userStory.priority}
Story Points: ${userStory.storyPoints || 'No definidos'}

Evalúa los siguientes aspectos y responde SOLO en formato JSON válido:

1. score (0-100): Score general de preparación
2. isReady (true/false): Si está lista para pruebas (score >= 80 Y no faltan elementos críticos)
3. suggestions (array): Sugerencias específicas para mejorar la HDU
4. improvedDescription (string, opcional): Una versión mejorada de la descripción si es necesario
5. missingElements (array): Elementos faltantes o débiles
6. riskAreas (array): Áreas de riesgo identificadas

Responde SOLO con el JSON, sin markdown ni texto adicional:`;

  const response = await callGemini(prompt, userApiKey);
  const analysis = parseGeminiJson<DorAiAnalysis>(response);

  // Validación mínima de la forma esperada
  if (typeof analysis.score !== 'number' || typeof analysis.isReady !== 'boolean' || !Array.isArray(analysis.suggestions)) {
    throw new Error('La respuesta de Gemini no tiene la estructura esperada (score, isReady, suggestions).');
  }

  return analysis;
}

/**
 * Genera sugerencias de pruebas usando Gemini AI.
 *
 * Basado en los criterios de aceptación de una HDU, genera 5 casos
 * de prueba específicos que deberían crearse.
 *
 * IMPORTANTE: Si Gemini falla, esta función LANZA un error en lugar de devolver
 * un mensaje genérico. El caller debe decidir cómo manejarlo.
 *
 * @param userStory - Datos mínimos de la historia de usuario
 * @param userApiKey - Key encriptada del usuario (opcional, BYO key)
 * @returns Array de strings con sugerencias de casos de prueba
 * @throws Error si la API de Gemini falla o la respuesta no es parseable
 */
export async function generateTestSuggestions(userStory: {
  title: string;
  description: string;
  acceptanceCriteria: string[];
}, userApiKey?: string | null): Promise<string[]> {
  const prompt = `Eres un experto en testing QA. Basándote en esta Historia de Usuario, 
sugiere 5 casos de prueba específicos que deberían crearse:

Título: ${userStory.title}
Descripción: ${userStory.description}
Criterios de Aceptación:
${userStory.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Responde SOLO con un array JSON de strings, cada string siendo un caso de prueba.
Formato: ["Caso de prueba 1", "Caso de prueba 2", ...]
Sin markdown ni texto adicional:`;

  const response = await callGemini(prompt, userApiKey);
  const suggestions = parseGeminiJson<string[]>(response);

  if (!Array.isArray(suggestions)) {
    throw new Error('La respuesta de Gemini no es un array de sugerencias de pruebas.');
  }

  return suggestions;
}

export default {
  analyzeUserStoryWithAI,
  generateTestSuggestions,
};