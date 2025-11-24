import { Video } from "lucide-react";
import ManualEntry from "../monitor/ManualEntry";
import CameraCapture from "../monitor/CameraCapture";
import VehicleCard from "../monitor/VehicleCard";
import ActivityList from "../monitor/ActivityList";
import { useRegistros } from "../../hooks/useRegistros";

export default function MonitorPage({ darkMode, usuario }) {
  const { currentCapture, events, fetchRegistros } = useRegistros(usuario);

  const handleDetectionSuccess = (result) => {
    console.log("🎯 Detección exitosa:", result);
    // Refrescar los registros para mostrar el nuevo
    fetchRegistros();
  };

  return (
    <main className="grid grid-cols-1 lg:grid-cols-7 gap-8 p-6 w-full">
      {/* Columna izquierda: Registro Manual */}
      <ManualEntry 
        darkMode={darkMode} 
        usuario={usuario} 
        onSuccess={fetchRegistros} 
      />
      
      {/* Columna central: Cámara y Última Detección */}
      <div className={`lg:col-span-3 ${darkMode ? "bg-gray-800" : "bg-white"} p-6 rounded-xl shadow-md space-y-6`}>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Video /> Monitor de Acceso Automático
        </h2>
        
        <CameraCapture 
          darkMode={darkMode}
          onDetectionSuccess={handleDetectionSuccess}
        />
        
        {currentCapture && (
          <div className="pt-4 border-t border-gray-700">
            <VehicleCard currentCapture={currentCapture} darkMode={darkMode} />
          </div>
        )}
      </div>

      {/* Columna derecha: Actividad Reciente */}
      <ActivityList events={events} darkMode={darkMode} />
    </main>
  );
}