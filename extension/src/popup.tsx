/**
 * Popup de la extensión de navegador.
 * Permite al usuario capturar evidencia y reportar bugs rápidamente.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

/**
 * Componente principal del popup.
 * Muestra botones para capturar screenshot, ver bugs reportados y acceder a opciones.
 */
function Popup(): React.ReactElement {
  const [status, setStatus] = React.useState<string>('');

  /**
   * Captura screenshot de la pestaña activa y envía a la API.
   */
  const handleCapture = async () => {
    setStatus('Capturando...');
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_EVIDENCE',
        payload: { type: 'screenshot', description: 'Captura desde popup' },
      });
      if (response.success) {
        setStatus('Evidencia capturada correctamente');
      } else {
        setStatus(`Error: ${response.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 12px', fontSize: '16px' }}>QA SaaS Extension</h2>
      <button
        onClick={handleCapture}
        style={{
          width: '100%',
          padding: '10px',
          background: '#3182ce',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Capturar Evidencia
      </button>
      {status && (
        <p style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>{status}</p>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('popup-root')!);
root.render(<Popup />);