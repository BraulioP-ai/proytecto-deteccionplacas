import { useState, useEffect } from "react";
import { Car, ArrowLeft, Plus, Trash2, Edit2, CheckCircle, XCircle, Search } from "lucide-react";
import { API_URL } from "../../constants/api";
import { validatePlate } from "../../utils/validators";

export default function VehiculosPage({ darkMode, onVolver }) {
  const [vehiculos, setVehiculos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState(null);

  const [formData, setFormData] = useState({
    placa: "",
    marca: "",
    modelo: "",
    tipoVehiculo: "Auto",
    empleadoId: "",
    fechaVencimiento: ""
  });
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchVehiculos();
    fetchEmpleados();
  }, []);

  const fetchVehiculos = async () => {
    try {
      const r = await fetch(API_URL + "/vehiculos");
      
      if (!r.ok) {
        throw new Error(`Error ${r.status}: ${r.statusText}`);
      }
      
      const data = await r.json();
      console.log("Vehículos recibidos:", data);
      setVehiculos(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (e) {
      console.error("❌ Error obteniendo vehículos:", e);
      setVehiculos([]);
      setLoading(false);
    }
  };

  const fetchEmpleados = async () => {
    try {
      const r = await fetch(API_URL + "/empleados");
      
      if (!r.ok) {
        throw new Error(`Error ${r.status}: ${r.statusText}`);
      }
      
      const data = await r.json();
      console.log("Empleados recibidos:", data);
      setEmpleados(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("❌ Error obteniendo empleados:", e);
      setEmpleados([]);
    }
  };

  const vehiculosFiltrados = vehiculos.filter((v) =>
    (v.Placa || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.NombrePropietario || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.Marca || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      placa: "",
      marca: "",
      modelo: "",
      tipoVehiculo: "Auto",
      empleadoId: "",
      fechaVencimiento: ""
    });
    setFormError("");
    setModoEdicion(false);
    setVehiculoEditando(null);
  };

  const abrirModalNuevo = () => {
    resetForm();
    setMostrarModal(true);
  };

  const abrirModalEditar = (vehiculo) => {
    setFormData({
      placa: vehiculo.Placa,
      marca: vehiculo.Marca,
      modelo: vehiculo.Modelo,
      tipoVehiculo: vehiculo.TipoVehiculo || "Auto",
      empleadoId: vehiculo.EmpleadoID,
      fechaVencimiento: vehiculo.FechaVencimiento ? vehiculo.FechaVencimiento.split('T')[0] : ""
    });
    setVehiculoEditando(vehiculo);
    setModoEdicion(true);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!modoEdicion && !validatePlate(formData.placa)) {
      setFormError("Formato de placa inválido. Use AAA000A");
      return;
    }

    if (!formData.marca || !formData.modelo || !formData.tipoVehiculo || !formData.empleadoId) {
      setFormError("Todos los campos obligatorios deben ser completados");
      return;
    }

    try {
      const url = modoEdicion
        ? `${API_URL}/vehiculos/${formData.placa}`
        : `${API_URL}/vehiculos`;
      const method = modoEdicion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Error al guardar vehículo");
        return;
      }

      setSuccessMsg(modoEdicion ? "✓ Vehículo actualizado" : "✓ Vehículo registrado");
      setTimeout(() => setSuccessMsg(""), 3000);
      cerrarModal();
      fetchVehiculos();
    } catch (e) {
      console.error("❌ Error:", e);
      setFormError("Error al guardar vehículo");
    }
  };

  const eliminarVehiculo = async (placa) => {
    if (!confirm(`¿Está seguro de dar de baja el vehículo ${placa}?`)) return;

    try {
      const res = await fetch(`${API_URL}/vehiculos/${placa}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al eliminar vehículo");
        return;
      }

      setSuccessMsg("✓ Vehículo dado de baja");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchVehiculos();
    } catch (e) {
      console.error("❌ Error:", e);
      alert("Error al eliminar vehículo");
    }
  };

  return (
    <div className={`min-h-screen p-6 ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"}`}>
      <div className="max-w-7xl mx-auto">
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-md p-6`}>
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <Car className="w-8 h-8" /> Gestión de Vehículos
            </h2>
            <div className="flex gap-3">
              <button
                onClick={abrirModalNuevo}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold text-white"
              >
                <Plus className="w-5 h-5" /> Registrar Vehículo
              </button>
              <button
                onClick={onVolver}
                className={`${darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold`}
              >
                <ArrowLeft className="w-5 h-5" /> Volver
              </button>
            </div>
          </div>

          {/* SUCCESS MESSAGE */}
          {successMsg && (
            <div className={`${darkMode ? "bg-green-900 text-green-300" : "bg-green-100 text-green-700"} p-4 rounded-lg mb-4 flex items-center gap-2`}>
              <CheckCircle className="w-5 h-5" />
              {successMsg}
            </div>
          )}

          {/* BÚSQUEDA */}
          <div className="mb-6">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              <input
                type="text"
                placeholder="Buscar por placa, propietario o marca..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={`pl-10 w-full p-3 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
              />
            </div>
          </div>

          {/* TABLA */}
          {loading ? (
            <p>Cargando vehículos...</p>
          ) : vehiculosFiltrados.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {busqueda ? "No se encontraron vehículos" : "No hay vehículos registrados"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                    <th className="p-3 text-left font-bold">Placa</th>
                    <th className="p-3 text-left font-bold">Tipo</th>
                    <th className="p-3 text-left font-bold">Marca</th>
                    <th className="p-3 text-left font-bold">Modelo</th>
                    <th className="p-3 text-left font-bold">Propietario</th>
                    <th className="p-3 text-left font-bold">Puesto</th>
                    <th className="p-3 text-left font-bold">Vencimiento</th>
                    <th className="p-3 text-center font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vehiculosFiltrados.map((v) => (
                    <tr key={v.Placa} className={`${darkMode ? "border-gray-700 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"} border-b transition-colors`}>
                      <td className="p-3 font-mono font-bold">{v.Placa}</td>
                      <td className="p-3">{v.TipoVehiculo}</td>
                      <td className="p-3">{v.Marca}</td>
                      <td className="p-3">{v.Modelo}</td>
                      <td className="p-3">{v.NombrePropietario || "Desconocido"}</td>
                      <td className="p-3">{v.Departamento || "-"}</td>
                      <td className="p-3">
                        {v.FechaVencimiento 
                          ? new Date(v.FechaVencimiento).toLocaleDateString('es-MX')
                          : "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => abrirModalEditar(v)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarVehiculo(v.Placa)}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                            title="Dar de baja"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto`}>
            <h3 className="text-2xl font-bold mb-4">
              {modoEdicion ? "Editar Vehículo" : "Registrar Nuevo Vehículo"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* PLACA */}
              <div>
                <label className="block text-sm font-semibold mb-2">Placa *</label>
                <input
                  type="text"
                  placeholder="ABC123A"
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                  disabled={modoEdicion}
                  className={`w-full p-3 rounded-lg border font-mono ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                  } ${modoEdicion ? "opacity-50 cursor-not-allowed" : ""}`}
                  maxLength={7}
                  required
                />
              </div>

              {/* TIPO DE VEHÍCULO */}
              <div>
                <label className="block text-sm font-semibold mb-2">Tipo de Vehículo *</label>
                <select
                  value={formData.tipoVehiculo}
                  onChange={(e) => setFormData({ ...formData, tipoVehiculo: e.target.value })}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                  }`}
                  required
                >
                  <option value="Auto">Auto</option>
                  <option value="Camioneta">Camioneta</option>
                  <option value="Motocicleta">Motocicleta</option>
                  <option value="Camión">Camión</option>
                </select>
              </div>

              {/* MARCA */}
              <div>
                <label className="block text-sm font-semibold mb-2">Marca *</label>
                <input
                  type="text"
                  placeholder="Nissan"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                  }`}
                  required
                />
              </div>

              {/* MODELO */}
              <div>
                <label className="block text-sm font-semibold mb-2">Modelo *</label>
                <input
                  type="text"
                  placeholder="Versa"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                  }`}
                  required
                />
              </div>

              {/* EMPLEADO */}
              <div>
                <label className="block text-sm font-semibold mb-2">Propietario *</label>
                <select
                  value={formData.empleadoId}
                  onChange={(e) => setFormData({ ...formData, empleadoId: e.target.value })}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                  }`}
                  required
                >
                  <option value="">Seleccione un empleado</option>
                  {empleados.map((emp) => (
                    <option key={emp.EmpleadoID} value={emp.EmpleadoID}>
                      {emp.NombreCompleto} - {emp.Departamento}
                    </option>
                  ))}
                </select>
              </div>

              {/* FECHA DE VENCIMIENTO */}
              <div>
                <label className="block text-sm font-semibold mb-2">Fecha de Vencimiento (Opcional)</label>
                <input
                  type="date"
                  value={formData.fechaVencimiento}
                  onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                  }`}
                />
              </div>

              {/* ERROR */}
              {formError && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  {formError}
                </div>
              )}

              {/* BOTONES */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  {modoEdicion ? "Actualizar" : "Registrar"}
                </button>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className={`flex-1 ${
                    darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-300 hover:bg-gray-400"
                  } py-3 rounded-lg font-semibold transition-colors`}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}