// QA SaaS Platform - Shared Types

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type BugStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'
export type TestType = 'FUNCTIONAL' | 'REGRESSION' | 'EXPLORATORY' | 'E2E' | 'INTEGRATION' | 'PERFORMANCE'
export type TestStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED'
export type EvidenceType = 'SCREENSHOT' | 'VIDEO' | 'LOG' | 'FILE'

export interface Bug {
  id: string
  title: string
  description: string
  severity: Severity
  status: BugStatus
  stepsToReproduce: string[]
  expectedResult: string
  actualResult: string
  environment?: string
  assignee?: string
  projectId: string
  projectName?: string
  agentId?: string
  evidence: Evidence[]
  createdAt: string
  updatedAt: string
}

export interface Evidence {
  id: string
  type: EvidenceType
  url: string
  thumbnailUrl?: string
  filename: string
  size: number
  mimeType: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  repository?: string
  website?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Agent {
  id: string
  name: string
  role: string
  description: string
  capabilities: string[]
  systemPrompt?: string
  isActive: boolean
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface TestCase {
  id: string
  title: string
  description: string
  preconditions: string[]
  steps: TestStep[]
  expectedResults: string[]
  priority: Priority
  type: TestType
  status: TestStatus
  automationStatus?: 'MANUAL' | 'AUTOMATED' | 'IN_PROGRESS'
  projectId: string
  agentId?: string
  createdAt: string
  updatedAt: string
}

export interface TestStep {
  order: number
  action: string
  expectedResult: string
}

export interface TestSuite {
  id: string
  title: string
  description: string
  testCases: TestCase[] | any[]
  coverage?: unknown
  environment?: string
  testData?: unknown
  profiling?: unknown
  status: string
  userStoryId?: string
  testPlanId?: string
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface TestPlan {
  id: string
  name: string
  description: string
  status: string
  projectId: string
  testSuites?: TestSuite[]
  userStories?: any[]
  createdAt: string
  updatedAt: string
}

export interface CoverageAnalysis {
  id: string
  projectId: string
  overallCoverage: number
  uncoveredAreas: UncoveredArea[]
  recommendations: string[]
  generatedAt: string
}

export interface UncoveredArea {
  module: string
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  suggestedTests: string[]
}

export interface ImprovementPlan {
  id: string
  userId: string
  currentSkills: SkillAssessment[]
  targetSkills: SkillAssessment[]
  actions: ImprovementAction[]
  resources: Resource[]
  timeline: string
  progress: number
  createdAt: string
  updatedAt: string
}

export interface SkillAssessment {
  skill: string
  level: number
  targetLevel: number
}

export interface ImprovementAction {
  description: string
  type: 'practice' | 'course' | 'mentoring' | 'project'
  priority: Priority
  estimatedHours: number
}

export interface Resource {
  title: string
  type: 'article' | 'video' | 'course' | 'documentation'
  url: string
  duration?: string
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'QA_ANALYST' | 'SDET' | 'QA_LEAD' | 'ADMIN'
  createdAt: string
}

export interface AuthResponse {
  message: string
  user: User
  token: string
}

export interface ApiError {
  error: {
    message: string
    statusCode: number
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}