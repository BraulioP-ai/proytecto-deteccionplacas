import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, User } from "lucide-react";

export default function LoginPage({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validación temporal (puedes conectar después con tu API real)
    if (usuario === "guardia" && password === "1234") {
      setError("");
      onLogin?.(usuario);
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/70 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">
          Sistema de Reconocimiento de Placas
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Usuario</label>
            <div className="flex items-center bg-gray-800 rounded-lg p-2">
              <User className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Ingrese su usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="bg-transparent w-full focus:outline-none text-white placeholder-gray-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Contraseña</label>
            <div className="flex items-center bg-gray-800 rounded-lg p-2">
              <Lock className="text-gray-400 mr-2" />
              <input
                type="password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent w-full focus:outline-none text-white placeholder-gray-400"
                required
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition-all py-2 rounded-lg font-semibold mt-4"
          >
            Iniciar Sesión
          </motion.button>
        </form>

        <p className="text-gray-400 text-xs text-center mt-6">
          © 2025 Proyecto ALPR — Equipo 2
        </p>
      </motion.div>
    </div>
  );
}
