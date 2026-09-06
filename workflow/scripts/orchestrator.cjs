const fs = require('fs')
const path = require('path')

const STATUS_FILE = path.join(__dirname, '..', 'status.json')
const AGENTS_FILE = path.join(__dirname, '..', 'agents.json')
const MESSAGES_FILE = path.join(__dirname, '..', 'messages.json')

function getJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return {} }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

function log(msg) {
  console.log(`[ORQUESTADOR] ${msg}`)
}

function getBacklog() {
  const hdus = getJSON(STATUS_FILE)
  return Object.values(hdus).filter(h => h.status === 'Pendiente')
}

function getAvailableAgents() {
  const agents = getJSON(AGENTS_FILE)
  return Object.entries(agents).filter(([_, a]) => a.status === 'disponible').map(([role]) => role)
}

function assignHDU(hduId, agent) {
  const hdus = getJSON(STATUS_FILE)
  const agents = getJSON(AGENTS_FILE)
  const key = Object.keys(hdus).find(k => hdus[k].id === hduId || k.toLowerCase() === hduId.toLowerCase())
  if (!key) { log(`HDU ${hduId} no encontrada`); return }
  if (agents[agent].status !== 'disponible') { log(`Agente ${agent} no disponible`); return }
  hdus[key].status = 'En Progreso'
  hdus[key].assignee = agent
  agents[agent].status = 'trabajando'
  agents[agent].currentTask = hduId
  saveJSON(STATUS_FILE, hdus)
  saveJSON(AGENTS_FILE, agents)
  log(`HDU ${hduId} asignada a ${agent}`)
}

function run() {
  log('Iniciando orquestador...')
  const backlog = getBacklog()
  const availableAgents = getAvailableAgents()
  log(`HDUs pendientes: ${backlog.length}`)
  log(`Agentes disponibles: ${availableAgents.join(', ')}`)
  availableAgents.forEach(agent => {
    if (backlog.length > 0) {
      const hdu = backlog.shift()
      assignHDU(hdu.id, agent)
    }
  })
  log('Orquestador completado')
}

const command = process.argv[2]
if (command === 'run') run()
else if (command === 'status') console.log(JSON.stringify(getBacklog(), null, 2))
else console.log('Uso: node orchestrator.cjs [run|status]')