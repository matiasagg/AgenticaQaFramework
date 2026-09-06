/**
 * ChatAI - Componente de chat con IA multifunción.
 * Panel flotante que permite interactuar con la plataforma vía lenguaje natural.
 * Intenciones: validar DoR, asignar agentes, generar tests, crear bugs, sync GitHub.
 */
import { useState, useRef, useEffect } from 'react'
import api from '../../services/api'

/** Mensaje del chat */
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  intent?: string
  data?: any
  timestamp: Date
}

interface ChatAIProps {
  /** HDU actualmente seleccionada (contexto para el chat) */
  userStoryId?: string
  /** ID del proyecto actual */
  projectId?: string
}

export default function ChatAI({ userStoryId, projectId }: ChatAIProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const message = text || input.trim()
    if (!message || sending) return

    const userMessage: ChatMessage = { role: 'user', content: message, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSending(true)

    try {
      const response = await api.post('/chat', {
        message,
        projectId,
        context: { userStoryId, projectId },
      })
      const data = response.data
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: formatResponse(data),
        intent: data.intent,
        data,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: error?.response?.data?.error?.message || 'Error al procesar la solicitud',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setSending(false)
    }
  }

  const formatResponse = (data: any): string => {
    switch (data.intent) {
      case 'validate_dor':
        return `✅ DoR validado. Score: ${data.result?.score ?? '?'}% — ${data.result?.isReady ? 'Listo' : 'Necesita mejoras'}`
      case 'assign_agent':
        return `🤖 ${data.result}: ${data.agent?.name}`
      case 'generate_tests':
        return `🧪 ${data.result}. ${data.totalTestCases} casos generados.`
      case 'create_bug':
        return `🐛 ${data.result}: ${data.bug?.title}`
      case 'sync_github':
        return `🔗 ${data.result}: ${data.branch}`
      case 'create_epic':
      case 'create_feature':
        return `📁 ${data.result}: ${data.epic?.name || data.feature?.name}`
      default:
        return data.result || 'Respuesta recibida'
    }
  }

  /** Comandos rápidos predefinidos */
  const quickCommands = userStoryId
    ? [
        { label: 'Validar DoR', cmd: 'valida el dor de esta HDU' },
        { label: 'Generar tests', cmd: 'genera tests para esta HDU' },
        { label: 'Asignar SDET', cmd: 'asigna agente sdet a esta HDU' },
        { label: 'Crear bug', cmd: 'crea bug desde esta HDU' },
      ]
    : [
        { label: 'Crear epic', cmd: 'crear epic' },
        { label: 'Ayuda', cmd: 'ayuda' },
      ]

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[150] w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 flex items-center justify-center text-2xl"
          title="Chat con IA"
        >
          🤖
        </button>
      )}

      {/* Panel de chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[150] w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Chat IA</h3>
                {userStoryId && <p className="text-xs text-gray-500 dark:text-gray-400">Contexto: HDU seleccionada</p>}
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Puedo ayudarte a validar DoR, generar tests, asignar agentes y más.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickCommands.map((qc) => (
                    <button
                      key={qc.label}
                      onClick={() => sendMessage(qc.cmd)}
                      className="text-xs px-3 py-1.5 bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full hover:bg-primary-100"
                    >
                      {qc.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-none'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                  {msg.intent && (
                    <span className="block text-xs opacity-60 mt-1">intent: {msg.intent}</span>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg rounded-bl-none">
                  <div className="animate-pulse text-sm text-gray-500">Pensando...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Escribe tu solicitud..."
                className="input-field flex-1 text-sm"
                disabled={sending}
              />
              <button onClick={() => sendMessage()} disabled={sending || !input.trim()} className="btn-primary text-sm px-4">
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}