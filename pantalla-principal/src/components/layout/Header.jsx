import { Moon, Sun, FileText, ShieldCheck, Car, Users } from "lucide-react";

export default function Header({ 
  usuario, 
  backendStatus, 
  currentTime, 
  darkMode, 
  onToggleDarkMode, 
  onLogout,
  onNavigate 
}) {
  const canViewReports = usuario && (usuario.permisoId === 1 || usuario.permisoId === 2);

  return (
    <header className={`${darkMode ? "bg-slate-950" : "bg-slate-800"} h-16 flex items-center px-6 justify-between text-white`}>
      <h1 className="font-bold text-xl">Sistema de Placas</h1>
      <div className="flex items-center gap-4 font-mono">
        <span>{backendStatus}</span>
        <span>{currentTime.toLocaleTimeString("es-MX")}</span>

        {canViewReports && (
          <>
            <button
              onClick={() => onNavigate("reportes")}
              className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Reportes
            </button>
            
            <button
              onClick={() => onNavigate("guardias")}
              className="bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Guardias
            </button>
            
            <button
              onClick={() => onNavigate("vehiculos")}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Car className="w-4 h-4" /> Vehículos
            </button>

            <button
              onClick={() => onNavigate("usuarios")}
              className="bg-cyan-600 hover:bg-cyan-700 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" /> 
              {usuario?.permisoId === 1 ? 'Usuarios' : 'Guardias'}
            </button>
          </>
        )}

        <button
          onClick={onToggleDarkMode}
          className={`${darkMode ? "bg-yellow-500 hover:bg-yellow-600" : "bg-slate-700 hover:bg-slate-600"} px-3 py-2 rounded-lg transition-colors flex items-center gap-2`}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button onClick={onLogout} className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700">
          Salir
        </button>
      </div>
    </header>
  );
}