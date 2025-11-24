import { useState, useEffect } from "react";
import { Users, ArrowLeft, Plus, Trash2, Edit2, CheckCircle, XCircle, Search, Shield } from "lucide-react";
import { API_URL } from "../../constants/api";

export default function UsuariosPage({ darkMode, onVolver, usuario }) {
  const [usuarios, setUsuarios] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  const [formData, setFormData] = useState({
    nombreUsuario: "",
    contrasena: "",
    permisoId: "",
    estatus: 1,
    cambiarContrasena: false
  });
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchUsuarios();
    fetchPermisos();
  }, []);

  const fetchUsuarios = async () => {
    try {
      // Pasar el permisoId del usuario actual
      const url = `${API_URL}/usuarios?permisoId=${usuario?.permisoId || 1}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Error ${r.status}`);
      const data = await r.json();
      setUsuarios(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (e) {
      console.error("❌ Error obteniendo usuarios:", e);
      setUsuarios([]);
      setLoading(false);
    }
  };

  const fetchPermisos = async () => {
    try {
      const r = await fetch(API_URL + "/permisos");
      if (!r.ok) throw new Error(`Error ${r.status}`);
      const data = await r.json();
      setPermisos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("❌ Error obteniendo permisos:", e);
      setPermisos([]);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) =>
    (u.NombreUsuario || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.NombrePermiso || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      nombreUsuario: "",
      contrasena: "",
      permisoId: "",
      estatus: 1,
      cambiarContrasena: false
    });
    setFormError("");
    setModoEdicion(false);
    setUsuarioEditando(null);
  };

  const abrirModalNuevo = () => {
    resetForm();
    // Si es supervisor, pre-seleccionar rol Guardia
    if (usuario?.permisoId === 2) {
      setFormData(prev => ({ ...prev, permisoId: 3 }));
    }
    setMostrarModal(true);
  };

  const abrirModalEditar = (usr) => {
    setFormData({
      nombreUsuario: usr.NombreUsuario,
      contrasena: "",
      permisoId: usr.PermisoID,
      estatus: usr.Estatus,
      cambiarContrasena: false
    });
    setUsuarioEditando(usr);
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

    if (!formData.nombreUsuario || !formData.permisoId) {
      setFormError("Nombre de usuario y rol son obligatorios");
      return;
    }

    if (!modoEdicion && !formData.contrasena) {
      setFormError("La contraseña es obligatoria para nuevos usuarios");
      return;
    }

    // Si está en modo edición Y marcó "cambiar contraseña" PERO no escribió nada
    if (modoEdicion && formData.cambiarContrasena && !formData.contrasena) {
      setFormError("Debe escribir la nueva contraseña");
      return;
    }

    try {
      const url = modoEdicion
        ? `${API_URL}/usuarios/${usuarioEditando.UsuarioID}`
        : `${API_URL}/usuarios`;
      const method = modoEdicion ? "PUT" : "POST";

      // Si está editando y NO marcó cambiar contraseña, no enviar el campo
      const bodyData = { ...formData };
      if (modoEdicion && !formData.cambiarContrasena) {
        delete bodyData.contrasena;
      }
      delete bodyData.cambiarContrasena; // No enviar este campo al backend

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Error al guardar usuario");
        return;
      }

      setSuccessMsg(modoEdicion ? "✓ Usuario actualizado" : "✓ Usuario creado");
      setTimeout(() => setSuccessMsg(""), 3000);
      cerrarModal();
      fetchUsuarios();
    } catch (e) {
      console.error("❌ Error:", e);
      setFormError("Error al guardar usuario");
    }
  };

  const desactivarUsuario = async (id, nombre) => {
    if (!confirm(`¿Está seguro de desactivar al usuario ${nombre}?`)) return;

    try {
      const res = await fetch(`${API_URL}/usuarios/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al desactivar usuario");
        return;
      }

      setSuccessMsg("✓ Usuario desactivado");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchUsuarios();
    } catch (e) {
      console.error("❌ Error:", e);
      alert("Error al desactivar usuario");
    }
  };

  const getRolBadgeColor = (permisoId) => {
    switch(permisoId) {
      case 1: return darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700';
      case 2: return darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700';
      case 3: return darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700';
      default: return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700';
    }
  };

  // Determinar el título según el rol
  const titulo = usuario?.permisoId === 1 ? 'Gestión de Usuarios del Sistema' : 'Gestión de Guardias';

  return (
    <div className={`min-h-screen p-6 ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"}`}>
      <div className="max-w-7xl mx-auto">
        <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-md p-6`}>
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <Users className="w-8 h-8" /> {titulo}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={abrirModalNuevo}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold text-white"
              >
                <Plus className="w-5 h-5" /> Nuevo {usuario?.permisoId === 2 ? 'Guardia' : 'Usuario'}
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre o rol..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={`pl-10 w-full p-3 rounded-lg border ${
                  darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                }`}
              />
            </div>
          </div>

          {/* TABLA */}
          {loading ? (
            <p>Cargando usuarios...</p>
          ) : usuariosFiltrados.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {busqueda ? "No se encontraron usuarios" : "No hay usuarios registrados"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                    <th className="p-3 text-left font-bold">ID</th>
                    <th className="p-3 text-left font-bold">Usuario</th>
                    <th className="p-3 text-left font-bold">Rol</th>
                    <th className="p-3 text-center font-bold">Registros</th>
                    <th className="p-3 text-center font-bold">Estado</th>
                    <th className="p-3 text-center font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.UsuarioID} className={`${darkMode ? "border-gray-700 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"} border-b transition-colors`}>
                      <td className="p-3 font-mono">{u.UsuarioID}</td>
                      <td className="p-3 font-semibold">{u.NombreUsuario}</td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRolBadgeColor(u.PermisoID)}`}>
                          {u.NombrePermiso}
                        </span>
                      </td>
                      <td className="p-3 text-center">{u.TotalRegistros}</td>
                      <td className="p-3 text-center">
                        {u.Estatus === 1 ? (
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'
                          }`}>
                            Activo
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
                          }`}>
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => abrirModalEditar(u)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.Estatus === 1 && (
                            <button
                              onClick={() => desactivarUsuario(u.UsuarioID, u.NombreUsuario)}
                              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                              title="Desactivar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
          <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-6 max-w-md w-full`}>
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              {modoEdicion ? "Editar Usuario" : `Nuevo ${usuario?.permisoId === 2 ? 'Guardia' : 'Usuario'}`}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* NOMBRE DE USUARIO */}
              <div>
                <label className="block text-sm font-semibold mb-2">Nombre de Usuario *</label>
                <input
                  type="text"
                  placeholder="admin, guardia1, etc."
                  value={formData.nombreUsuario}
                  onChange={(e) => setFormData({ ...formData, nombreUsuario: e.target.value })}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                  }`}
                  required
                />
              </div>

              {/* CONTRASEÑA */}
              {modoEdicion ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="cambiarContrasena"
                      checked={formData.cambiarContrasena}
                      onChange={(e) => setFormData({ ...formData, cambiarContrasena: e.target.checked, contrasena: "" })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="cambiarContrasena" className="text-sm font-semibold cursor-pointer">
                      Cambiar contraseña
                    </label>
                  </div>
                  
                  {formData.cambiarContrasena && (
                    <input
                      type="password"
                      placeholder="Nueva contraseña"
                      value={formData.contrasena}
                      onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                      className={`w-full p-3 rounded-lg border ${
                        darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                      }`}
                      required
                    />
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold mb-2">Contraseña *</label>
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={formData.contrasena}
                    onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                    className={`w-full p-3 rounded-lg border ${
                      darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                    }`}
                    required
                  />
                </div>
              )}

              {/* ROL */}
              <div>
                <label className="block text-sm font-semibold mb-2">Rol *</label>
                <select
                  value={formData.permisoId}
                  onChange={(e) => setFormData({ ...formData, permisoId: e.target.value })}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                  }`}
                  required
                >
                  <option value="">Seleccione un rol</option>
                  {permisos.map((p) => {
                    // Si es Supervisor (permisoId=2), solo mostrar rol Guardia (permisoId=3)
                    if (usuario?.permisoId === 2 && p.PermisoID !== 3) {
                      return null;
                    }
                    return (
                      <option key={p.PermisoID} value={p.PermisoID}>
                        {p.NombrePermiso} - {p.Descripcion}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* ESTADO (solo en edición) */}
              {modoEdicion && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Estado</label>
                  <select
                    value={formData.estatus}
                    onChange={(e) => setFormData({ ...formData, estatus: Number(e.target.value) })}
                    className={`w-full p-3 rounded-lg border ${
                      darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                    }`}
                  >
                    <option value={1}>Activo</option>
                    <option value={0}>Inactivo</option>
                  </select>
                </div>
              )}

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
                  {modoEdicion ? "Actualizar" : "Crear"}
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