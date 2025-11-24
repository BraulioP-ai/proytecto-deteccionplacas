import { useState, useEffect } from "react";
import LoginPage from "./LoginPage";
import Header from "./components/layout/Header";
import MonitorPage from "./components/pages/MonitorPage";
import ReportesPage from "./components/pages/ReportesPage";
import GuardiasPage from "./components/pages/GuardiasPage";
import VehiculosPage from "./components/pages/VehiculosPage";
import UsuariosPage from "./components/pages/UsuariosPage";
import { useDarkMode } from "./hooks/useDarkMode";
import { useBackendStatus } from "./hooks/useBackendStatus";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [vistaActual, setVistaActual] = useState("monitor");
  const [currentTime, setCurrentTime] = useState(new Date());
  const { darkMode, toggleDarkMode } = useDarkMode();
  const backendStatus = useBackendStatus();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (userData) => {
    setUsuario(userData);
    setVistaActual("monitor");
  };

  const handleLogout = () => {
    setUsuario(null);
    setVistaActual("monitor");
  };

  if (!usuario) {
    return <LoginPage onLogin={handleLogin} darkMode={darkMode} />;
  }

  return (
    <div className={`min-h-screen w-full ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"} flex flex-col`}>
      <Header
        usuario={usuario}
        backendStatus={backendStatus}
        currentTime={currentTime}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
        onNavigate={setVistaActual}
      />

      {vistaActual === "monitor" && (
        <MonitorPage darkMode={darkMode} usuario={usuario} />
      )}
      {vistaActual === "reportes" && (
        <ReportesPage darkMode={darkMode} onVolver={() => setVistaActual("monitor")} />
      )}
      {vistaActual === "guardias" && (
        <GuardiasPage darkMode={darkMode} onVolver={() => setVistaActual("monitor")} />
      )}
      {vistaActual === "vehiculos" && (
        <VehiculosPage darkMode={darkMode} onVolver={() => setVistaActual("monitor")} />
      )}
      {vistaActual === "usuarios" && (
        <UsuariosPage 
          darkMode={darkMode} 
          onVolver={() => setVistaActual("monitor")}
          usuario={usuario}
        />
      )}
    </div>
  );
}

export default App;