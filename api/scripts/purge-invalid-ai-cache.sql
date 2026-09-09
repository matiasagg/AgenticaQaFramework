-- =====================================================================
-- Purga de caché IA inválida (resultado del fallback silencioso score 50)
--
-- Contexto: antes de la corrección, cuando Gemini fallaba (key inválida)
-- el endpoint validate-dor guardaba un análisis falso (score 50, mensaje
-- "No se pudo conectar...") dentro de staticAnalysis.aiAnalysis y esa
-- caché nunca se reintentaba.
--
-- Este script detecta y limpia esas entradas para que la siguiente
-- validación re-ejecute el análisis con la key/modelo correctos.
--
-- Uso:
--   psql "postgresql://postgres:***@localhost:5432/qa_saas_db" -f api/scripts/purge-invalid-ai-cache.sql
-- O desde Prisma Studio / cualquier cliente SQL.
--
-- OPCIÓN A (recomendada, sin SQL): simplemente usa "Refrescar análisis"
-- en la UI (POST /api/user-stories/:id/validate-dor?refresh=true) por
-- cada HDU; el nuevo código ya no persiste fallbacks.
-- =====================================================================

-- 1) Ver cuántas HDUs tienen caché con el fallback inválido
--    (mensaje del fallback o score 50 con isReady false)
SELECT id, display_id, title,
       static_analysis->>'aiAnalysis' AS ai_analysis,
       static_analysis->'aiAnalysis'->>'score' AS ai_score
FROM "UserStory"
WHERE static_analysis->'aiAnalysis' IS NOT NULL
  AND (
    static_analysis->'aiAnalysis'->>'suggestions' LIKE '%No se pudo conectar%'
    OR (static_analysis->'aiAnalysis'->>'score')::int = 50
       AND (static_analysis->'aiAnalysis'->>'isReady')::boolean = false
  );

-- 2) Eliminar SOLO el aiAnalysis inválido dentro de staticAnalysis
--    (conserva checklist/score estático; la próxima validación reintenta IA)
UPDATE "UserStory"
SET static_analysis = jsonb_set(static_analysis, '{aiAnalysis}', 'null'::jsonb)
WHERE static_analysis->'aiAnalysis' IS NOT NULL
  AND (
    static_analysis->'aiAnalysis'->>'suggestions' LIKE '%No se pudo conectar%'
    OR (static_analysis->'aiAnalysis'->>'score')::int = 50
       AND (static_analysis->'aiAnalysis'->>'isReady')::boolean = false
  );

-- 3) (Opcional, más agresivo) Resetear también dorScore/isReady para
--    forzar re-validación completa desde cero:
-- UPDATE "UserStory"
-- SET dor_score = NULL, is_ready = false,
--     static_analysis = jsonb_set(static_analysis, '{aiAnalysis}', 'null'::jsonb)
-- WHERE static_analysis->'aiAnalysis' IS NULL;