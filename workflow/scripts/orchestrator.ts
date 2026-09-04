import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const STATUS_FILE = join(__dirname, '..', 'status.json')
const AGENTS_FILE = join(__dirname, '..', 'agents.json')
const MESSAGES_FILE = join(__dirname, '..', 'messages.json')

type AgentRole = 'POA' | 'TLA' | 'FDA' | 'SDET' | 'QAE' | 'DOA'

interface HDU {
  id: string
  title: string
  priority: string
  status: 'Pendiente' | 'En Progreso' | 'En Review' | 'Completada'
  assignee: AgentRole
  branch: string | null
  acceptanceCriteria: string[]
}

function getHDUs(): Record<string, HDU> {
  const data = readFileSync(STATUS_FILE, 'utf-8')
  return JSON.parse(data)
}

function saveHDUs(hdus: Record<string, HDU>): void {
  writeFileSync(STATUS_FILE, JSON.stringify(hdus, null, 2))
}

function getAgents(): Record<string, { status: string; currentTask: string | null }> {
  const data = readFileSync(AGENTS_FILE, 'utf-8')
  return JSON.parse(data)
}

function saveAgents(agents: Record<string, { status: string; currentTask: string | null }>): void {
  writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2))
}

function getMessages(): any[] {
  const data = readFileSync(MESSAGES_FILE, 'utf-8')
  return JSON.parse(data).messages || []
}

function log(message: string): void {
  console.log(`[ORQUESTADOR] ${message}`)
}

function assignHDU(hduId: string, agent: AgentRole): void {
  const hdus = getHDUs()
  const agents = getAgents()
  
  if (!hdus[hduId]) {
    log(`❌ HDU ${hduId} no encontrada`)
    return
  }
  
  if (agents[agent].status !== 'disponible') {
    log(`⚠️ Agente ${agent} no está disponible (${agents[agent].status})`)
    return
  }
  
  hdus[hduId].status = 'En Progreso'
  hdus[hduId].assignee = agent
  agents[agent].status = 'trabajando'
  agents[agent].currentTask = hduId
  
  saveHDUs(hdus)
  saveAgents(agents)
  
  log(`✅ HDU ${hduId} asignada a ${agent}`)
}

function completeHDU(hduId: string): void {
  const hdus = getHDUs()
  const agents = getAgents()
  
  if (!hdus[hduId]) return
  
  const agent = hdus[hduId].assignee
  hdus[hduId].status = 'Completada'
  agents[agent].status = 'disponible'
  agents[agent].currentTask = null
  
  saveHDUs(hdus)
  saveAgents(agents)
  
  log(`🎉 HDU ${hduId} completada por ${agent}`)
}

function getBacklog(): HDU[] {
  const hdus = getHDUs()
  return Object.values(hdus).filter(h => h.status === 'Pendiente')
}

function getAvailableAgents(): AgentRole[] {
  const agents = getAgents()
  return Object.entries(agents)
    .filter(([_, a]) => a.status === 'disponible')
    .map(([role]) => role as AgentRole)
}

function run(): void {
  log('🚀 Iniciando orquestador...')
  
  const backlog = getBacklog()
  const availableAgents = getAvailableAgents()
  
  log(`📋 HDUs pendientes: ${backlog.length}`)
  log(`🤖 Agentes disponibles: ${availableAgents.join(', ')}`)
  
  for (const hdu of backlog) {
    if (availableAgents.length === 0) {
      log('⚠️ No hay agentes disponibles')
      break
    }
    
    const agent = availableAgents.shift()!
    assignHDU(hdu.id, agent)
  }
  
  log('✅ Orquestador completado')
}

const command = process.argv[2]

switch (command) {
  case 'run':
    run()
    break
  case 'status':
    console.log(JSON.stringify(getBacklog(), null, 2))
    break
  default:
    console.log('Uso: ts-node orchestrator.ts [run|status]')
}