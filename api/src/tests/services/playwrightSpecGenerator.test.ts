import { generatePlaywrightSpec, generateTestSuite } from '../../services/testSuiteGenerator'

describe('Playwright E2E specification generation', () => {
  const story = {
    id: 'story-1',
    displayId: 'HDU-101',
    title: 'Crear una HDU',
    description: 'Como QA, quiero crear una HDU, para documentar el requerimiento',
    acceptanceCriteria: [
      'El formulario permite guardar una HDU válida',
      'La HDU creada aparece en el listado',
    ],
    priority: 'HIGH',
    storyPoints: 3,
  }

  it('creates one Playwright test per acceptance criterion', () => {
    const spec = generatePlaywrightSpec(story)

    expect(spec).toContain("import { test, expect } from '@playwright/test'")
    expect(spec).toContain('HDU-101 - Crear una HDU')
    expect(spec.match(/test\(/g)).toHaveLength(story.acceptanceCriteria.length)
    expect(spec).toContain('El formulario permite guardar una HDU válida')
  })

  it('keeps generated suite coverage for all acceptance criteria', () => {
    const suite = generateTestSuite(story, 'project-1')

    expect(suite.coverage.acceptanceCriteriaCoverage).toBe(100)
    expect(suite.coverage.totalTestCases).toBeGreaterThanOrEqual(story.acceptanceCriteria.length)
  })
})
