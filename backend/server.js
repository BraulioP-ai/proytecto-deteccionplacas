import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./db.js";

dotenv.config();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// ✅ Ruta de prueba
app.get("/", (req, res) => {
  res.send("Servidor funcionando y conectado a MySQL ✅");
});

// ✅ Obtener todos los registros de acceso (con JOIN)
app.get("/registros", (req, res) => {
  const query = `
    SELECT 
      r.RegistroID,
      r.Placa,
      r.FechaHora,
      r.EstadoAutorizacion,
      r.ModoAcceso,
      CONCAT(e.Nombre, ' ', e.ApellidoPaterno, ' ', e.ApellidoMaterno) AS NombreCompleto
    FROM RegistrosAcceso r
    LEFT JOIN Vehiculos v ON r.Placa = v.Placa
    LEFT JOIN Empleados e ON v.EmpleadoID = e.EmpleadoID
    ORDER BY r.FechaHora DESC;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error al obtener registros:", err);
      res.status(500).send("Error al obtener registros");
    } else {
      res.json(results);
    }
  });
});

// ✅ Insertar nuevo registro (desde el frontend o hardware)
app.post("/registros", (req, res) => {
  const { placa, modo } = req.body;

  if (!placa || !modo) {
    return res.status(400).json({ message: "Faltan datos requeridos" });
  }

  // 1️⃣ Buscar si la placa existe y si está autorizada
  const checkQuery = "SELECT EsAutorizado FROM Vehiculos WHERE Placa = ?";
  db.query(checkQuery, [placa], (err, vehiculos) => {
    if (err) {
      console.error("❌ Error al verificar placa:", err);
      return res.status(500).send("Error en la verificación");
    }

    let estado = "No reconocido";

    if (vehiculos.length > 0) {
      estado = vehiculos[0].EsAutorizado ? "Permitido" : "Denegado";
    }

    // 2️⃣ Insertar el registro
    const insertQuery = `
      INSERT INTO RegistrosAcceso (Placa, FechaHora, EstadoAutorizacion, ModoAcceso)
      VALUES (?, NOW(), ?, ?)
    `;
    db.query(insertQuery, [placa, estado, modo], (err, result) => {
      if (err) {
        console.error("❌ Error al insertar registro:", err);
        return res.status(500).send("Error al registrar acceso");
      }

      console.log(`✅ Registro insertado: ${placa} (${estado})`);
      res.json({ message: "Registro insertado correctamente", estado });
    });
  });
});

// 🚀 Iniciar servidor
app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${process.env.PORT || 3000}`);
});
