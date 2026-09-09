/**
 * Tests para el servicio geminiAI (validación DoR con IA).
 *
 * Verifica que un fallo de Gemini (key inválida, red, parseo, respuesta
 * bloqueada) LANZA un error en lugar de devolver un fallback silencioso
 * con score 50, y que la key BYO del usuario se usa si se provee.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeUserStoryWithAI } from '../../services/geminiAI';

// Mock del módulo de configuración para no depender del .env real
vi.mock('../../config', () => ({
  config: {
    gemini: {
      apiKey: 'test-global-key',
      model: 'gemini-3.6-flash',
    },
  },
}));

// Mock de la encriptación: la key "BYO" se "desencripta" con un prefijo
vi.mock('../../utils/encryption', () => ({
  decryptApiKey: (k: string) => `decrypted-${k}`,
}));

const storyInput = {
  title: 'HDU de prueba',
  description: 'Como QA quiero validar HDUs para asegurar calidad',
  acceptanceCriteria: ['Criterio uno válido', 'Criterio dos válido'],
  priority: 'HIGH',
  storyPoints: 3,
};

describe('geminiAI - manejo de errores (sin fallback silencioso)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lanza error cuando la API responde 401 (key inválida)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { code: 401, message: 'API key not valid' } }),
    });

    await expect(analyzeUserStoryWithAI(storyInput)).rejects.toThrow(/Gemini API error 401/);
  });

  it('lanza error cuando la API responde 404 (modelo no disponible)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: { code: 404, message: 'model not found' } }),
    });

    await expect(analyzeUserStoryWithAI(storyInput)).rejects.toThrow(/404/);
  });

  it('lanza error cuando la respuesta está bloqueada por seguridad (blockReason)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        promptFeedback: { blockReason: 'SAFETY' },
        candidates: [],
      }),
    });

    await expect(analyzeUserStoryWithAI(storyInput)).rejects.toThrow(/bloqueó/);
  });

  it('lanza error cuando la respuesta tiene texto no parseable como JSON', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'esto no es json' }] }, finishReason: 'STOP' }],
      }),
    });

    await expect(analyzeUserStoryWithAI(storyInput)).rejects.toThrow(/parsear/);
  });

  it('parsea correctamente JSON envuelto en bloque markdown', async () => {
    const analysis = {
      score: 90,
      isReady: true,
      suggestions: ['ok'],
      missingElements: [],
      riskAreas: [],
    };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: '```json\n' + JSON.stringify(analysis) + '\n```' }] },
          finishReason: 'STOP',
        }],
      }),
    });

    const result = await analyzeUserStoryWithAI(storyInput);
    expect(result.score).toBe(90);
    expect(result.isReady).toBe(true);
  });

  it('usa la key BYO del usuario (desencriptada) en la URL cuando se provee', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({ score: 80, isReady: true, suggestions: [], missingElements: [], riskAreas: [] }) }] },
          finishReason: 'STOP',
        }],
      }),
    });

    await analyzeUserStoryWithAI(storyInput, 'user-encrypted-key');
    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('key=decrypted-user-encrypted-key');
  });
});