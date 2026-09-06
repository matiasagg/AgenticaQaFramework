/**
 * Gemini AI Service
 *
 * Servicio para interactuar con la API de Google Gemini.
 * Se usa para enriquecer la validación DoR con análisis de IA,
 * generar sugerencias de pruebas e integrar agentes de IA.
 *
 * Soporte BYO (Bring Your Own) key: cada función acepta un parámetro
 * opcional `apiKey` que, si se provee (desencriptado del usuario),
 * se usa en lugar de la clave global de la aplicación.
 */
import { config } from '../config';
import { decryptApiKey } from '../utils/encryption';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
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
 * @param prompt - El prompt a enviar a Gemini
 * @param userApiKey - Key encriptada del usuario (opcional, BYO key)
 * @returns El texto de respuesta de Gemini
 */
async function callGemini(prompt: string, userApiKey?: string | null): Promise<string> {
  const apiKey = resolveApiKey(userApiKey);

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada. Configura tu API key en Settings.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
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
        // gemini-3.6-flash is a "thinking" model: part of the output budget is
        // consumed by internal reasoning tokens, so we raise the limit to avoid
        // truncating the JSON response (finishReason MAX_TOKENS with empty text).
        maxOutputTokens: 16384,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Limpia la respuesta de Gemini quitando el formato markdown si existe.
 * Gemini a veces envuelve el JSON en bloques de código.
 *
 * @param response - Texto crudo de la respuesta de Gemini
 * @returns El texto limpio, listo para parsear como JSON
 */
function cleanGeminiResponse(response: string): string {
  let cleanResponse = response.trim();
  if (cleanResponse.startsWith('```json')) {
    cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }
  if (cleanResponse.startsWith('```')) {
    cleanResponse = cleanResponse.replace(/```\n?/g, '');
  }
  return cleanResponse;
}

/**
 * Analiza una HDU usando Gemini AI para complementar la validación DoR.
 *
 * Combina validación estática (reglas) con análisis de IA (Gemini) para
 * obtener un score de preparación más preciso.
 *
 * @param userStory - Datos de la historia de usuario a validar
 * @param userApiKey - Key encriptada del usuario (opcional, BYO key)
 * @returns Análisis con score, sugerencias y áreas de riesgo
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

  try {
    const response = await callGemini(prompt, userApiKey);
    const cleanResponse = cleanGeminiResponse(response);

    const analysis: DorAiAnalysis = JSON.parse(cleanResponse);
    return analysis;
  } catch (error) {
    console.error('Error calling Gemini AI:', error);
    // Fallback a validación básica si falla la IA
    return {
      score: 50,
      isReady: false,
      suggestions: ['No se pudo conectar con el servicio de IA. Verifica tu token de Gemini.'],
      missingElements: ['Análisis de IA no disponible'],
      riskAreas: [],
    };
  }
}

/**
 * Genera sugerencias de pruebas usando Gemini AI.
 *
 * Basado en los criterios de aceptación de una HDU, genera 5 casos
 * de prueba específicos que deberían crearse.
 *
 * @param userStory - Datos mínimos de la historia de usuario
 * @param userApiKey - Key encriptada del usuario (opcional, BYO key)
 * @returns Array de strings con sugerencias de casos de prueba
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

  try {
    const response = await callGemini(prompt, userApiKey);
    const cleanResponse = cleanGeminiResponse(response);

    const suggestions: string[] = JSON.parse(cleanResponse);
    return suggestions;
  } catch (error) {
    console.error('Error generating test suggestions:', error);
    return ['No se pudieron generar sugerencias automáticamente'];
  }
}

export default {
  analyzeUserStoryWithAI,
  generateTestSuggestions,
};
