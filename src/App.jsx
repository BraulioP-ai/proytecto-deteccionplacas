// src/App.jsx
import React, { useState } from 'react';
import './App.css';

// --- Componente para los Reportes ---
const ReportesPage = () => {
  // Datos de ejemplo para las placas reconocidas
  const [registros, setRegistros] = useState([
    { id: 1, placa: 'ABC-123', fecha: '2025-09-28 19:50', acceso: 'Permitido' },
    { id: 2, placa: 'XYZ-789', fecha: '2025-09-28 19:52', acceso: 'Denegado' },
    { id: 3, placa: 'DEF-456', fecha: '2025-09-28 19:55', acceso: 'Permitido' },
  ]);

  return (
    <div className="reportes-container">
      <h2>Historial de Reconocimiento de Placas</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Placa</th>
            <th>Fecha/Hora</th>
            <th>Estado de Acceso</th>
          </tr>
        </thead>
        <tbody>
          {registros.map(registro => (
            <tr key={registro.id}>
              <td>{registro.id}</td>
              <td>{registro.placa}</td>
              <td>{registro.fecha}</td>
              <td style={{ color: registro.acceso === 'Permitido' ? 'green' : 'red' }}>
                {registro.acceso}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => alert('Generando PDF de Reporte...')}>
        Generar Reporte PDF
      </button>
    </div>
  );
};

// --- Componente Principal de la Aplicación ---
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Sistema de Reconocimiento de Placas</h1>
        <nav>
          {/* El botón de Administración ha sido eliminado */}
          <button className='active'>
            Reportes
          </button>
        </nav>
      </header>

      <main className="App-main">
        {/* Ahora siempre se muestra la página de reportes */}
        <ReportesPage />
      </main>
    </div>
  );
}

export default App;