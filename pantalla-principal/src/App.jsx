import { useState, useEffect, useRef } from "react";
import LoginPage from "./LoginPage";
import {
  Video,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  History,
} from "lucide-react";

const API_URL = "http://localhost:3000";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentCapture, setCurrentCapture] = useState(null);
  const [events, setEvents] = useState([]);
  const [backendStatus, setBackendStatus] = useState("Desconectado ❌");
  const awaitingManualRef = useRef(false);

  const handleLogin = (username) => setUsuario(username);
  const handleLogout = () => setUsuario(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_URL}/`);
        if (!res.ok) throw new Error("Error de conexión");
        setBackendStatus("Conectado ✅");
      } catch (err) {
        console.error("❌ Error al conectar con backend:", err);
        setBackendStatus("Desconectado ❌");
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchRegistros = async () => {
    try {
      const res = await fetch(`${API_URL}/registros`);
      if (!res.ok) throw new Error("Error al obtener registros");
      const data = await res.json();

      if (data.length > 0) {
        const last = data[0];
        const capture = {
          plateNumber: last.Placa,
          status: last.EstadoAutorizacion,
          owner: last.NombreCompleto || "Desconocido",
          vehicleInfo: `${last.Marca || ""} ${last.Modelo || ""}`.trim(),
          imageUrl: "https://via.placeholder.com/350x120.png?text=" + (last.Placa || "PLACA"),
        };
        setCurrentCapture(capture);

        const formatted = data.slice(0, 15).map((r) => ({
          plate: r.Placa,
          status: r.EstadoAutorizacion,
          timestamp: new Date(r.FechaHora).toLocaleTimeString("es-MX"),
        }));
        setEvents(formatted);
      }
    } catch (err) {
      console.error("❌ Error al obtener registros:", err);
    }
  };

  useEffect(() => {
    if (!usuario) return;
    fetchRegistros();
    const interval = setInterval(fetchRegistros, 10000);
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [usuario]);

  // Normaliza el estado y maneja variantes manuales
  const normalizeStatus = (status) => {
    switch (status?.toLowerCase()) {
      case "autorizado":
        return "Autorizado";
      case "autorizado manualmente":
      case "autorizado manual":
        return "Autorizado manualmente";
      case "no autorizado":
        return "No autorizado";
      case "rechazado manualmente":
      case "no autorizado manual":
        return "No autorizado manualmente";
      case "no reconocido":
      case "no_reconocido":
        return "No reconocido";
      case "fallo lectura":
        return "Fallo lectura";
      default:
        return status || "No reconocido";
    }
  };

  // Devuelve colores e iconos según estado
  const getStatusInfo = (status) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case "Autorizado":
      case "Autorizado manualmente":
        return {
          textColor: "text-green-700",
          bgColor: "bg-green-100",
          Icon: <ShieldCheck className="w-5 h-5" />,
        };
      case "No autorizado":
      case "No autorizado manualmente":
        return {
          textColor: "text-red-700",
          bgColor: "bg-red-100",
          Icon: <ShieldAlert className="w-5 h-5" />,
        };
      case "No reconocido":
        return {
          textColor: "text-yellow-700",
          bgColor: "bg-yellow-100",
          Icon: <ShieldQuestion className="w-5 h-5" />,
        };
      case "Fallo lectura":
        return {
          textColor: "text-gray-700",
          bgColor: "bg-gray-200",
          Icon: <LogOut className="w-5 h-5" />,
        };
      default:
        return {
          textColor: "text-gray-700",
          bgColor: "bg-gray-100",
          Icon: <ShieldQuestion className="w-5 h-5" />,
        };
    }
  };

  if (!usuario) return <LoginPage onLogin={handleLogin} />;

  const statusInfo = getStatusInfo(currentCapture?.status);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <h1 className="text-xl font-bold text-white">Sistema de Reconocimiento de Placas</h1>
          <div className="flex items-center gap-4">
            <span className="text-white text-sm font-mono hidden md:block">
              Backend: {backendStatus}
            </span>
            <span className="text-white font-mono text-lg hidden md:block">
              {currentTime.toLocaleTimeString("es-MX")}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-cyan-500 h-1" />

      <main className="flex-grow max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
        <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 h-full">
          <div className="grid lg:grid-cols-5 gap-8 h-full">
            {/* Monitor principal */}
            <div className="lg:col-span-3 flex flex-col space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Video size={24} /> Monitor de Acceso Principal
              </h2>

              <div className="bg-black w-full aspect-video rounded-lg flex items-center justify-center text-gray-500">
                <p className="text-xl">CÁMARA EN VIVO</p>
              </div>

              {currentCapture && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Último Vehículo Detectado
                  </h3>

                  <div className="border rounded-lg p-4">
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-500">Placa:</p>
                          <p className="font-mono text-2xl text-gray-800">
                            {currentCapture.plateNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-500">Propietario:</p>
                          <p className="text-gray-800">{currentCapture.owner}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-500">Vehículo:</p>
                          <p className="text-gray-800">{currentCapture.vehicleInfo}</p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-center">
                        <img
                          src={currentCapture.imageUrl}
                          alt={`Placa ${currentCapture.plateNumber}`}
                          className="rounded-md border border-gray-300 w-full max-w-[250px] mb-4"
                        />
                        <div
                          className={`flex items-center gap-2 font-bold text-lg p-2 rounded-md w-full justify-center ${statusInfo.textColor} ${statusInfo.bgColor}`}
                        >
                          {statusInfo.Icon}
                          <span>{normalizeStatus(currentCapture.status)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actividad reciente */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <History size={24} /> Actividad Reciente
                </h2>
              </div>

              <div className="overflow-y-auto space-y-3 flex-grow pr-1">
                {events.map((event, idx) => {
                  const info = getStatusInfo(event.status);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center p-3 border rounded-lg ${info.bgColor}`}
                    >
                      <div className={`mr-4 ${info.textColor}`}>{info.Icon}</div>
                      <div className="flex-grow">
                        <p className="font-mono font-semibold text-gray-800">{event.plate}</p>
                        <p className={`text-sm font-bold ${info.textColor}`}>
                          {normalizeStatus(event.status)}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 font-mono">{event.timestamp}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
