import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const STATUS_FILE = join(__dirname, '..', 'status.json')
const MESSAGES_FILE = join(__dirname, '..', 'messages.json')

type AgentRole = 'POA' | 'TLA' | 'FDA' | 'SDET' | 'QAE' | 'DOA'

interface AgentMessage {
  id: string
  from: AgentRole
  to: AgentRole
  type: string
  hduId: string
  content: string
  timestamp: string
  read: boolean
}

function getMessages(): AgentMessage[] {
  const data = readFileSync(MESSAGES_FILE, 'utf-8')
  return JSON.parse(data).messages || []
}

function saveMessages(messages: AgentMessage[]): void {
  writeFileSync(MESSAGES_FILE, JSON.stringify({ messages }, null, 2))
}

function getHDUs(): Record<string, any> {
  const data = readFileSync(STATUS_FILE, 'utf-8')
  return JSON.parse(data)
}

function saveHDUs(hdus: Record<string, any>): void {
  writeFileSync(STATUS_FILE, JSON.stringify(hdus, null, 2))
}

function log(agent: string, message: string): void {
  console.log(`[${agent}] ${message}`)
}

function sendMessage(from: AgentRole, to: AgentRole, type: string, hduId: string, content: string): void {
  const messages = getMessages()
  messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    from,
    to,
    type,
    hduId,
    content,
    timestamp: new Date().toISOString(),
    read: false,
  })
  saveMessages(messages)
  log(from, `→ ${to}: ${type} (${hduId})`)
}

function getUnreadMessages(agent: AgentRole): AgentMessage[] {
  return getMessages().filter(m => m.to === agent && !m.read)
}

function markAsRead(messageId: string): void {
  const messages = getMessages()
  const msg = messages.find(m => m.id === messageId)
  if (msg) {
    msg.read = true
    saveMessages(messages)
  }
}

function createGitHubIssue(hduId: string, title: string, agent: string, priority: string): string | null {
  try {
    const labels = `hdu,${agent.toLowerCase()}`
    const body = `## 📋 Historia de Usuario\n\n**ID:** ${hduId}\n**Agente Asignado:** ${agent}\n**Prioridad:** ${priority}\n\n## Descripcion\nImplementacion de ${title}\n\n## Criterios de Aceptacion\n- [ ] Implementacion completada\n- [ ] Tests pasando\n- [ ] Code review aprobado\n\n## Evidencia Requerida\n- [ ] Screenshot de funcionalidad\n- [ ] Tests pasando\n- [ ] Documentacion actualizada`
    
    const result = execSync(
      `gh issue create --title "[${hduId}] ${title}" --body "${body}" --label "${labels}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    )
    
    const issueUrl = result.trim()
    log(agent, `📝 GitHub Issue creado: ${issueUrl}`)
    
    const hdus = getHDUs()
    if (hdus[hduId]) {
      hdus[hduId].githubIssue = issueUrl
      saveHDUs(hdus)
    }
    
    return issueUrl
  } catch (error) {
    log(agent, `⚠️ No se pudo crear GitHub Issue (¿gh auth configurado?)`)
    return null
  }
}

function closeGitHubIssue(hduId: string, agent: AgentRole): void {
  try {
    const hdus = getHDUs()
    if (hdus[hduId]?.githubIssue) {
      const issueNumber = hdus[hduId].githubIssue.split('/').pop()
      execSync(`gh issue close ${issueNumber} --comment "✅ Completado por ${agent}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      log(agent, `✅ GitHub Issue #${issueNumber} cerrado`)
    }
  } catch (error) {
    log(agent, `⚠️ No se pudo cerrar GitHub Issue`)
  }
}

// Agent: FDA (Fullstack Developer)
async function runFDA(): Promise<void> {
  const agent: AgentRole = 'FDA'
  log(agent, '🤖 Iniciando agente FDA...')
  
  const messages = getUnreadMessages(agent)
  
  for (const msg of messages) {
    markAsRead(msg.id)
    
    switch (msg.type) {
      case 'HDU_ASSIGNED':
        log(agent, `📋 HDU asignada: ${msg.hduId}`)
        log(agent, '💻 Implementando funcionalidad...')
        
        // Simular implementación
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        log(agent, '✅ Implementación completada')
        sendMessage(agent, 'SDET', 'IMPLEMENTATION_READY', msg.hduId, 'Implementación lista para testing')
        break
        
      case 'CODE_REVIEW_CHANGES_REQUESTED':
        log(agent, `🔄 Cambios solicitados en: ${msg.hduId}`)
        log(agent, '🔧 Ajustando código...')
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        log(agent, '✅ Cambios aplicados')
        sendMessage(agent, 'TLA', 'IMPLEMENTATION_READY', msg.hduId, 'Cambios aplicados')
        break
        
      default:
        log(agent, `📨 Mensaje recibido: ${msg.type}`)
    }
  }
}

// Agent: SDET
async function runSDET(): Promise<void> {
  const agent: AgentRole = 'SDET'
  log(agent, '🤖 Iniciando agente SDET...')
  
  const messages = getUnreadMessages(agent)
  
  for (const msg of messages) {
    markAsRead(msg.id)
    
    switch (msg.type) {
      case 'IMPLEMENTATION_READY':
        log(agent, `🧪 Preparando tests para: ${msg.hduId}`)
        log(agent, '📝 Creando tests unitarios...')
        log(agent, '📝 Creando tests de integración...')
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        log(agent, '✅ Tests creados')
        sendMessage(agent, 'QAE', 'TESTS_READY', msg.hduId, 'Tests listos para validación')
        break
        
      default:
        log(agent, `📨 Mensaje recibido: ${msg.type}`)
    }
  }
}

// Agent: QAE
async function runQAE(): Promise<void> {
  const agent: AgentRole = 'QAE'
  log(agent, '🤖 Iniciando agente QAE...')
  
  const messages = getUnreadMessages(agent)
  
  for (const msg of messages) {
    markAsRead(msg.id)
    
    switch (msg.type) {
      case 'TESTS_READY':
        log(agent, `🔍 Validando criterios para: ${msg.hduId}`)
        log(agent, '✅ Verificando criterios de aceptación...')
        
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        const passed = Math.random() > 0.2
        
        if (passed) {
          log(agent, '✅ Validación exitosa')
          sendMessage(agent, 'TLA', 'VALIDATION_PASSED', msg.hduId, 'Criterios cumplidos')
        } else {
          log(agent, '❌ Validación fallida - bugs encontrados')
          sendMessage(agent, 'FDA', 'BUG_REPORTED', msg.hduId, 'Se encontraron bugs durante la validación')
        }
        break
        
      default:
        log(agent, `📨 Mensaje recibido: ${msg.type}`)
    }
  }
}

// Agent: TLA
async function runTLA(): Promise<void> {
  const agent: AgentRole = 'TLA'
  log(agent, '🤖 Iniciando agente TLA...')
  
  const messages = getUnreadMessages(agent)
  
  for (const msg of messages) {
    markAsRead(msg.id)
    
    switch (msg.type) {
      case 'VALIDATION_PASSED':
        log(agent, `🔍 Code review para: ${msg.hduId}`)
        log(agent, '✅ Revisando código...')
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        log(agent, '✅ Code review aprobado')
        sendMessage(agent, 'POA', 'CODE_REVIEW_PASSED', msg.hduId, 'Código aprobado')
        
        const hdus = getHDUs()
        if (hdus[msg.hduId]) {
          hdus[msg.hduId].status = 'Completada'
          saveHDUs(hdus)
        }
        break
        
      case 'IMPLEMENTATION_READY':
        log(agent, `🔍 Review de implementación: ${msg.hduId}`)
        log(agent, '✅ Aprobando implementación...')
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        sendMessage(agent, 'QAE', 'TESTS_READY', msg.hduId, 'Implementación aprobada')
        break
        
      default:
        log(agent, `📨 Mensaje recibido: ${msg.type}`)
    }
  }
}

// Agent: POA
async function runPOA(): Promise<void> {
  const agent: AgentRole = 'POA'
  log(agent, '🤖 Iniciando agente POA...')
  
  const messages = getUnreadMessages(agent)
  
  for (const msg of messages) {
    markAsRead(msg.id)
    
    switch (msg.type) {
      case 'CODE_REVIEW_PASSED':
        log(agent, `🎉 HDU completada: ${msg.hduId}`)
        log(agent, '✅ Aceptando entregable...')
        
        const hdus = getHDUs()
        if (hdus[msg.hduId]) {
          hdus[msg.hduId].status = 'Completada'
          saveHDUs(hdus)
        }
        
        log(agent, `🎉 HDU ${msg.hduId} FINALIZADA`)
        break
        
      default:
        log(agent, `📨 Mensaje recibido: ${msg.type}`)
    }
  }
}

async function main(): Promise<void> {
  const agent = process.argv[2] as AgentRole
  
  if (!agent) {
    console.log('Uso: ts-node agent-runner.ts [FDA|SDET|QAE|TLA|POA]')
    process.exit(1)
  }
  
  switch (agent) {
    case 'FDA':
      await runFDA()
      break
    case 'SDET':
      await runSDET()
      break
    case 'QAE':
      await runQAE()
      break
    case 'TLA':
      await runTLA()
      break
    case 'POA':
      await runPOA()
      break
    default:
      console.log(`Agente no reconocido: ${agent}`)
      process.exit(1)
  }
}

main().catch(console.error)