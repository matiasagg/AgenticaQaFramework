const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const STATUS_FILE = path.join(__dirname, '..', 'status.json')
const MESSAGES_FILE = path.join(__dirname, '..', 'messages.json')

function getJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return {} }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

function log(agent, msg) {
  console.log(`[${agent}] ${msg}`)
}

function sendMessage(from, to, type, hduId, content) {
  const messages = getJSON(MESSAGES_FILE).messages || []
  messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    from, to, type, hduId, content,
    timestamp: new Date().toISOString(),
    read: false
  })
  saveJSON(MESSAGES_FILE, { messages })
  log(from, `→ ${to}: ${type} (${hduId})`)
}

function getUnreadMessages(agent) {
  return (getJSON(MESSAGES_FILE).messages || []).filter(m => m.to === agent && !m.read)
}

function markAsRead(messageId) {
  const messages = getJSON(MESSAGES_FILE).messages || []
  const msg = messages.find(m => m.id === messageId)
  if (msg) { msg.read = true; saveJSON(MESSAGES_FILE, { messages }) }
}

function createGitHubIssue(hduId, title, agent, priority) {
  try {
    const labels = `hdu,${agent.toLowerCase()}`
    const body = `## Historia de Usuario\n\n**ID:** ${hduId}\n**Agente:** ${agent}\n**Prioridad:** ${priority}`
    const result = execSync(`gh issue create --title "[${hduId}] ${title}" --body "${body}" --label "${labels}"`, { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] })
    const issueUrl = result.trim()
    log(agent, `📝 GitHub Issue: ${issueUrl}`)
    const hdus = getJSON(STATUS_FILE)
    if (hdus[hduId]) { hdus[hduId].githubIssue = issueUrl; saveJSON(STATUS_FILE, hdus) }
    return issueUrl
  } catch (e) {
    log(agent, '⚠️ GitHub Issue no creado (¿gh auth?)')
    return null
  }
}

function closeGitHubIssue(hduId, agent) {
  try {
    const hdus = getJSON(STATUS_FILE)
    if (hdus[hduId]?.githubIssue) {
      const num = hdus[hduId].githubIssue.split('/').pop()
      execSync(`gh issue close ${num} --comment "Completado por ${agent}"`, { stdio: ['pipe','pipe','pipe'] })
      log(agent, `✅ Issue #${num} cerrado`)
    }
  } catch (e) {
    log(agent, '⚠️ No se pudo cerrar issue')
  }
}

async function runAgent(agent) {
  log(agent, `🤖 Iniciando agente ${agent}...`)
  const messages = getUnreadMessages(agent)
  for (const msg of messages) {
    markAsRead(msg.id)
    switch (msg.type) {
      case 'HDU_ASSIGNED': {
        log(agent, `📋 HDU asignada: ${msg.hduId}`)
        const hdus = getJSON(STATUS_FILE)
        if (hdus[msg.hduId]) createGitHubIssue(msg.hduId, hdus[msg.hduId].title, agent, hdus[msg.hduId].priority)
        log(agent, '💻 Implementando...')
        await new Promise(r => setTimeout(r, 2000))
        log(agent, '✅ Implementación completada')
        sendMessage(agent, 'SDET', 'IMPLEMENTATION_READY', msg.hduId, 'Implementación lista')
        break
      }
      case 'IMPLEMENTATION_READY': {
        log(agent, `🧪 Creando tests para: ${msg.hduId}`)
        await new Promise(r => setTimeout(r, 1500))
        log(agent, '✅ Tests creados')
        sendMessage(agent, 'QAE', 'TESTS_READY', msg.hduId, 'Tests listos')
        break
      }
      case 'TESTS_READY': {
        log(agent, `🔍 Validando: ${msg.hduId}`)
        await new Promise(r => setTimeout(r, 1000))
        const passed = Math.random() > 0.2
        if (passed) {
          log(agent, '✅ Validación exitosa')
          sendMessage(agent, 'TLA', 'VALIDATION_PASSED', msg.hduId, 'Criterios cumplidos')
        } else {
          log(agent, '❌ Bugs encontrados')
          sendMessage(agent, 'FDA', 'BUG_REPORTED', msg.hduId, 'Bug encontrado')
        }
        break
      }
      case 'VALIDATION_PASSED': {
        log(agent, `🔍 Code review: ${msg.hduId}`)
        await new Promise(r => setTimeout(r, 800))
        log(agent, '✅ Code review aprobado')
        sendMessage(agent, 'POA', 'CODE_REVIEW_PASSED', msg.hduId, 'Código aprobado')
        const hdus = getJSON(STATUS_FILE)
        if (hdus[msg.hduId]) { hdus[msg.hduId].status = 'Completada'; saveJSON(STATUS_FILE, hdus) }
        break
      }
      case 'CODE_REVIEW_PASSED': {
        log(agent, `🎉 HDU FINALIZADA: ${msg.hduId}`)
        closeGitHubIssue(msg.hduId, agent)
        break
      }
      default:
        log(agent, `📨 Mensaje: ${msg.type}`)
    }
  }
  log(agent, '✅ Procesamiento completado')
}

const agent = process.argv[2]
if (!agent) { console.log('Uso: node agent-runner.cjs [FDA|SDET|QAE|TLA|POA]'); process.exit(1) }
runAgent(agent.toUpperCase()).catch(console.error)