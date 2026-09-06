/**
 * Página de opciones de la extensión.
 * Permite configurar la URL de la API y las preferencias del usuario.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

/** Configuración almacenada del usuario */
interface ExtensionConfig {
  apiUrl: string;
  autoCapture: boolean;
  highlightElements: boolean;
}

const DEFAULT_CONFIG: ExtensionConfig = {
  apiUrl: 'http://localhost:3000/api',
  autoCapture: false,
  highlightElements: true,
};

/**
 * Componente de opciones.
 * Formato simple para configurar la extensión.
 */
function Options(): React.ReactElement {
  const [config, setConfig] = React.useState<ExtensionConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = React.useState(false);

  /** Guarda la configuración en chrome.storage */
  const handleSave = () => {
    chrome.storage.sync.set({ extensionConfig: config }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div>
      <h1 style={{ fontSize: '20px', marginBottom: '20px' }}>QA SaaS Extension - Opciones</h1>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          URL de la API:
        </label>
        <input
          type="text"
          value={config.apiUrl}
          onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={config.highlightElements}
            onChange={(e) => setConfig({ ...config, highlightElements: e.target.checked })}
          />
          Resaltar elementos al reportar bugs
        </label>
      </div>

      <button
        onClick={handleSave}
        style={{
          padding: '10px 20px',
          background: '#38a169',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Guardar
      </button>
      {saved && <span style={{ marginLeft: '12px', color: '#38a169' }}>Guardado!</span>}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('options-root')!);
root.render(<Options />);