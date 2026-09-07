import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const mocks = vi.hoisted(() => ({
  userId: 'user-1',
  project: { findFirst: vi.fn() },
  testPlan: { findFirst: vi.fn() },
  testSuite: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  testCase: { findMany: vi.fn(), create: vi.fn() },
}))

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: mocks.userId }
    next()
  },
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    project: mocks.project,
    testPlan: mocks.testPlan,
    testSuite: mocks.testSuite,
    testCase: mocks.testCase,
  })),
}))

import suiteRoutes from '../../routes/testSuites'
import testRoutes from '../../routes/tests'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/test-suites', suiteRoutes)
  app.use('/api/tests', testRoutes)
  return app
}

describe('Test hierarchy routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.project.findFirst.mockResolvedValue({ id: 'project-1', userId: mocks.userId })
  })

  it('requires every suite to belong to a test plan', async () => {
    const response = await request(createApp()).post('/api/test-suites').send({
      title: 'Smoke',
      projectId: 'project-1',
    })

    expect(response.status).toBe(400)
    expect(mocks.testSuite.create).not.toHaveBeenCalled()
  })

  it('creates a test linked to one or more reusable suites', async () => {
    mocks.testSuite.findMany = vi.fn().mockResolvedValue([{ id: 'suite-1' }, { id: 'suite-2' }])
    mocks.testCase.create.mockResolvedValue({ id: 'test-1' })

    const response = await request(createApp()).post('/api/tests').send({
      title: 'Login',
      description: 'Valid login',
      preconditions: [],
      steps: [],
      expectedResults: [],
      priority: 'HIGH',
      type: 'FUNCTIONAL',
      projectId: 'project-1',
      suiteIds: ['suite-1', 'suite-2'],
    })

    expect(response.status).toBe(201)
    expect(mocks.testCase.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        suiteLinks: { create: [{ testSuiteId: 'suite-1' }, { testSuiteId: 'suite-2' }] },
      }),
    }))
  })
})
