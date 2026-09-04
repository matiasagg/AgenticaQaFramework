/**
 * Gemini AI Service
 * 
 * Servicio para interactuar con la API de Google Gemini.
 * Se usa para enriquecer la validación DoR con análisis de IA.
 */
import { config } from '../config';

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
 * Llama a la API de Gemini para analizar una HDU
 */
async function callGemini(prompt: string): Promise<string> {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY no configurada');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

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
        maxOutputTokens: 2048,
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
 * Analiza una HDU usando Gemini AI para complementar la validación DoR
 */
export async function analyzeUserStoryWithAI(userStory: {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: string;
  storyPoints?: number;
}): Promise<DorAiAnalysis> {
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
    const response = await callGemini(prompt);
    
    // Limpiar respuesta (quitar markdown si existe)
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/```\n?/g, '');
    }
    
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
 * Genera sugerencias de pruebas usando Gemini AI
 */
export async function generateTestSuggestions(userStory: {
  title: string;
  description: string;
  acceptanceCriteria: string[];
}): Promise<string[]> {
  const prompt = `Eres un expergo en testing QA. Basándote en esta Historia de Usuario, 
sugiere 5 casos de prueba específicos que deberían crearse:

Título: ${userStory.title}
Descripción: ${userStory.description}
Criterios de Aceptación:
${userStory.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Responde SOLO con un array JSON de strings, cada string siendo un caso de prueba.
Formato: ["Caso de prueba 1", "Caso de prueba 2", ...]
Sin markdown ni texto adicional:`;

  try {
    const response = await callGemini(prompt);
    
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/```\n?/g, '');
    }
    
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