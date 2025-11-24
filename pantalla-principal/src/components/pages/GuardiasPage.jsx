import { useState, useEffect } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { API_URL } from "../../constants/api";

export default function GuardiasPage({ darkMode, onVolver }) {
  const [guardias, setGuardias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuardias();
  }, []);

  const fetchGuardias = async () => {
    try {
      const r = await fetch(API_URL + "/guardias");
      const data = await r.json();
      setGuardias(data);
      setLoading(false);
    } catch (e) {
      console.error("❌ Error obteniendo guardias:", e);
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen p-6 ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"}`}>
      <div className="max-w-7xl mx-auto">
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-md p-6`}>
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-8 h-8" /> Gestión de Guardias
            </h2>
            <button
              onClick={onVolver}
              className={`${
                darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
              } px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold`}
            >
              <ArrowLeft className="w-5 h-5" /> Volver al Monitor
            </button>
          </div>

          {/* CONTENIDO */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-lg">Cargando guardias...</p>
            </div>
          ) : guardias.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg text-gray-500">No hay guardias registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className={`${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                    <th className="p-3 text-left font-bold">Nombre</th>
                    <th className="p-3 text-left font-bold">Correo</th>
                    <th className="p-3 text-left font-bold">Rol</th>
                    <th className="p-3 text-center font-bold">Accesos Manuales Autorizados</th>
                  </tr>
                </thead>
                <tbody>
                  {guardias.map((g) => (
                    <tr 
                      key={g.id} 
                      className={`${
                        darkMode 
                          ? "border-gray-700 hover:bg-gray-700" 
                          : "border-gray-200 hover:bg-gray-50"
                      } border-b transition-colors`}
                    >
                      <td className="p-3 font-semibold">{g.nombre}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{g.correo}</td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700"
                        }`}>
                          {g.rol}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-4 py-2 rounded-lg font-bold text-lg ${
                          darkMode ? "bg-green-900 text-green-300" : "bg-green-100 text-green-700"
                        }`}>
                          {g.accesosManual?.length || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}