import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import FormData from "form-data";
import fetch from "node-fetch";
import fileUpload from "express-fileupload";
import { db } from "./db.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware para subir archivos (FormData)
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  useTempFiles: false
}));

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);

// ==============================
// RUTA DE PRUEBA
// ==============================
app.get("/", (req, res) => {
  res.send("Servidor funcionando y conectado a MySQL ✅");
});

// ==============================
// LOGIN
// ==============================
app.post("/login", async (req, res) => {
  const { nombre, contrasena } = req.body;

  if (!nombre || !contrasena) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  const query = `
    SELECT UsuarioID, NombreUsuario, ContrasenaHash, PermisoID
    FROM UsuariosSistema
    WHERE NombreUsuario = ? AND Estatus = 1
  `;

  db.query(query, [nombre], async (err, results) => {
    if (err) {
      console.error("❌ Error DB:", err);
      return res.status(500).json({ message: "Error en la base de datos" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Usuario incorrecto o inactivo" });
    }

    const user = results[0];

    // ✅ COMPARAR CON BCRYPT
    const bcrypt = await import('bcryptjs');
    const validPassword = await bcrypt.default.compare(contrasena, user.ContrasenaHash);
    
    if (!validPassword) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    return res.json({
      UsuarioID: user.UsuarioID,
      NombreUsuario: user.NombreUsuario,
      PermisoID: user.PermisoID
    });
  });
});

// ==============================
// OBTENER REGISTROS DE ACCESO
// ==============================
app.get("/registros", (req, res) => {
  const query = `
    SELECT 
      r.RegistroID,
      r.Placa,
      r.FechaHora,
      r.EstadoAutorizacion,
      r.ModoAcceso,
      r.UsuarioSistemaID,
      u.NombreUsuario AS GuardiaNombre,
      CONCAT(e.Nombre, ' ', e.ApellidoPaterno, ' ', IFNULL(e.ApellidoMaterno, '')) AS NombreCompleto,
      v.Marca,
      v.Modelo,
      v.TipoVehiculo
    FROM RegistrosAcceso r
    LEFT JOIN Vehiculos v ON r.Placa = v.Placa
    LEFT JOIN Empleados e ON v.EmpleadoID = e.EmpleadoID
    LEFT JOIN UsuariosSistema u ON r.UsuarioSistemaID = u.UsuarioID
    ORDER BY r.FechaHora DESC;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error al obtener registros:", err);
      return res.status(500).send("Error al obtener registros");
    }
    res.json(results);
  });
});

// ==============================
// REGISTRO MANUAL DE ACCESO
// ==============================
app.post("/acceso/manual", (req, res) => {
  const { placa, guardia_id } = req.body;

  if (!placa || !guardia_id) {
    return res.status(400).json({ message: "Faltan datos requeridos" });
  }

  const sql = `
    INSERT INTO RegistrosAcceso 
    (Placa, FechaHora, EstadoAutorizacion, ModoAcceso, UsuarioSistemaID)
    VALUES (?, NOW(), 'MANUAL', 'MANUAL', ?);
  `;

  db.query(sql, [placa.toUpperCase(), guardia_id], (err, result) => {
    if (err) {
      console.error("❌ Error insertando acceso manual:", err);
      return res.status(500).json({ error: "Error al registrar acceso manual" });
    }

    const fetchLast = `
      SELECT 
        r.*,
        CONCAT(e.Nombre, ' ', e.ApellidoPaterno, ' ', IFNULL(e.ApellidoMaterno, '')) AS NombreCompleto,
        v.Marca, 
        v.Modelo,
        v.TipoVehiculo
      FROM RegistrosAcceso r
      LEFT JOIN Vehiculos v ON r.Placa = v.Placa
      LEFT JOIN Empleados e ON v.EmpleadoID = e.EmpleadoID
      WHERE r.RegistroID = ?
    `;

    db.query(fetchLast, [result.insertId], (err2, rows) => {
      if (err2) return res.status(500).json({ error: "Error obteniendo registro" });
      res.json(rows[0]);
    });
  });
});

// ==============================
// OBTENER LISTA DE GUARDIAS
// ==============================
app.get("/guardias", (req, res) => {
  const query = `
    SELECT 
      u.UsuarioID,
      u.NombreUsuario,
      p.NombrePermiso AS Rol,
      COUNT(r.RegistroID) AS TotalAccesosManual
    FROM UsuariosSistema u
    INNER JOIN PermisosSistema p ON u.PermisoID = p.PermisoID
    LEFT JOIN RegistrosAcceso r ON u.UsuarioID = r.UsuarioSistemaID AND r.ModoAcceso = 'MANUAL'
    WHERE u.PermisoID = 3 AND u.Estatus = 1
    GROUP BY u.UsuarioID, u.NombreUsuario, p.NombrePermiso
    ORDER BY u.NombreUsuario;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error obteniendo guardias:", err);
      return res.status(500).json({ error: "Error al obtener guardias" });
    }
    
    const guardias = results.map(g => ({
      id: g.UsuarioID,
      nombre: g.NombreUsuario,
      correo: `${g.NombreUsuario.toLowerCase()}@empresa.com`,
      rol: g.Rol,
      accesosManual: Array(g.TotalAccesosManual).fill({})
    }));
    
    res.json(guardias);
  });
});

// ==============================
// OBTENER TODOS LOS VEHÍCULOS
// ==============================
app.get("/vehiculos", (req, res) => {
  const query = `
    SELECT 
      v.Placa,
      v.Marca,
      v.Modelo,
      v.TipoVehiculo,
      v.EmpleadoID,
      v.EsAutorizado,
      v.FechaVencimiento,
      CONCAT(e.Nombre, ' ', e.ApellidoPaterno, ' ', IFNULL(e.ApellidoMaterno, '')) AS NombrePropietario,
      IFNULL(e.Puesto, e.Departamento) AS Departamento
    FROM Vehiculos v
    LEFT JOIN Empleados e ON v.EmpleadoID = e.EmpleadoID
    WHERE e.Estatus = 1
    ORDER BY v.Placa;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error obteniendo vehículos:", err);
      return res.status(500).json({ error: "Error al obtener vehículos" });
    }
    res.json(results);
  });
});

// ==============================
// OBTENER EMPLEADOS
// ==============================
app.get("/empleados", (req, res) => {
  const query = `
    SELECT 
      EmpleadoID,
      CONCAT(Nombre, ' ', ApellidoPaterno, ' ', IFNULL(ApellidoMaterno, '')) AS NombreCompleto,
      IFNULL(Puesto, Departamento) AS Departamento
    FROM Empleados
    WHERE Estatus = 1
    ORDER BY Nombre;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error obteniendo empleados:", err);
      return res.status(500).json({ error: "Error al obtener empleados" });
    }
    res.json(results);
  });
});

// ==============================
// DAR DE ALTA UN VEHÍCULO
// ==============================
app.post("/vehiculos", (req, res) => {
  const { placa, marca, modelo, tipoVehiculo, empleadoId, fechaVencimiento } = req.body;

  if (!placa || !marca || !modelo || !tipoVehiculo || !empleadoId) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  const placaRegex = /^[A-Z]{3}\d{3}[A-Z]$/;
  if (!placaRegex.test(placa.toUpperCase())) {
    return res.status(400).json({ error: "Formato de placa inválido. Use AAA000A" });
  }

  const query = `
    INSERT INTO Vehiculos (Placa, Marca, Modelo, TipoVehiculo, EmpleadoID, EsAutorizado, FechaVencimiento)
    VALUES (?, ?, ?, ?, ?, 1, ?);
  `;

  db.query(query, [
    placa.toUpperCase(), 
    marca, 
    modelo, 
    tipoVehiculo,
    empleadoId, 
    fechaVencimiento || null
  ], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: "La placa ya está registrada" });
      }
      console.error("❌ Error al registrar vehículo:", err);
      return res.status(500).json({ error: "Error al registrar vehículo" });
    }
    res.json({ message: "Vehículo registrado exitosamente", placa: placa.toUpperCase() });
  });
});

// ==============================
// DAR DE BAJA UN VEHÍCULO
// ==============================
app.delete("/vehiculos/:placa", (req, res) => {
  const { placa } = req.params;
  const query = "DELETE FROM Vehiculos WHERE Placa = ?";

  db.query(query, [placa], (err, result) => {
    if (err) {
      console.error("❌ Error al eliminar vehículo:", err);
      return res.status(500).json({ error: "Error al eliminar vehículo" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    res.json({ message: "Vehículo dado de baja exitosamente" });
  });
});

// ==============================
// ACTUALIZAR VEHÍCULO
// ==============================
app.put("/vehiculos/:placa", (req, res) => {
  const { placa } = req.params;
  const { marca, modelo, tipoVehiculo, empleadoId, fechaVencimiento } = req.body;

  if (!marca || !modelo || !tipoVehiculo || !empleadoId) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  const query = `
    UPDATE Vehiculos 
    SET Marca = ?, Modelo = ?, TipoVehiculo = ?, EmpleadoID = ?, FechaVencimiento = ?
    WHERE Placa = ?;
  `;

  db.query(query, [marca, modelo, tipoVehiculo, empleadoId, fechaVencimiento || null, placa], (err, result) => {
    if (err) {
      console.error("❌ Error al actualizar vehículo:", err);
      return res.status(500).json({ error: "Error al actualizar vehículo" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    res.json({ message: "Vehículo actualizado exitosamente" });
  });
});

// ==============================
// DETECCIÓN AUTOMÁTICA DE PLACA
// ==============================
app.post("/detectar-placa", async (req, res) => {
  try {
    // IMPORTANTE: La imagen viene como FormData (archivo), no como JSON
    if (!req.files || !req.files.image) {
      console.log("❌ No se recibió archivo de imagen");
      return res.status(400).json({ 
        success: false,
        error: "No se proporcionó imagen" 
      });
    }

    const imageFile = req.files.image;
    
    console.log("📤 Imagen recibida, reenviando a Python Flask...");
    
    // Crear FormData para enviar a Python
    const form = new FormData();
    form.append('image', imageFile.data, { 
      filename: 'capture.jpg',
      contentType: 'image/jpeg'
    });
    
    // Llamar a la API de Python
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5000';
    const pythonResponse = await fetch(`${pythonApiUrl}/detect`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const result = await pythonResponse.json();
    
    if (!result.success) {
      console.log("❌ Python no detectó placa:", result.message);
      return res.json({ 
        success: false, 
        message: result.message || "No se detectó placa en la imagen" 
      });
    }
    
    const placa = result.plate.toUpperCase();
    console.log("✅ Placa detectada:", placa);
    
    // Verificar si el vehículo existe en la BD
    const checkQuery = "SELECT Placa, EsAutorizado FROM Vehiculos WHERE Placa = ?";
    
    db.query(checkQuery, [placa], (err, vehiculos) => {
      if (err) {
        console.error("❌ Error al verificar placa:", err);
        return res.status(500).json({ error: "Error en la verificación" });
      }
      
      // Si existe en la BD y está autorizado
      let estado = (vehiculos.length > 0 && vehiculos[0].EsAutorizado) ? "AUTORIZADO" : "NO_RECONOCIDO";
      
      console.log(`🚗 Placa ${placa} - Estado: ${estado}`);
      
      // Insertar en RegistrosAcceso
      const insertQuery = `
        INSERT INTO RegistrosAcceso 
        (Placa, FechaHora, EstadoAutorizacion, ModoAcceso, UsuarioSistemaID)
        VALUES (?, NOW(), ?, 'AUTOMATICO', NULL)
      `;
      
      db.query(insertQuery, [placa, estado], (err, insertResult) => {
        if (err) {
          console.error("❌ Error al insertar registro:", err);
          return res.status(500).json({ error: "Error al registrar acceso" });
        }
        
        console.log("✅ Registro creado con ID:", insertResult.insertId);
        
        res.json({
          success: true,
          plate: placa,
          estado: estado,
          confidence: result.confidence,
          registroId: insertResult.insertId
        });
      });
    });
    
  } catch (error) {
    console.error("❌ Error en detección:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al procesar detección",
      details: error.message 
    });
  }
});

// ==============================
// GESTIÓN DE USUARIOS DEL SISTEMA
// ==============================

// Obtener usuarios según el rol del que consulta
app.get("/usuarios", (req, res) => {
  const { permisoId } = req.query; // Recibir el permisoId del usuario que consulta
  
  let query = `
    SELECT 
      u.UsuarioID,
      u.NombreUsuario,
      u.PermisoID,
      u.Estatus,
      p.NombrePermiso,
      COUNT(r.RegistroID) as TotalRegistros
    FROM UsuariosSistema u
    INNER JOIN PermisosSistema p ON u.PermisoID = p.PermisoID
    LEFT JOIN RegistrosAcceso r ON u.UsuarioID = r.UsuarioSistemaID
  `;
  
  // Si es Supervisor (permisoId = 2), solo mostrar Guardias (permisoId = 3)
  if (permisoId && parseInt(permisoId) === 2) {
    query += " WHERE u.PermisoID = 3";
  }
  
  query += `
    GROUP BY u.UsuarioID, u.NombreUsuario, u.PermisoID, u.Estatus, p.NombrePermiso
    ORDER BY u.Estatus DESC, u.UsuarioID;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error obteniendo usuarios:", err);
      return res.status(500).json({ error: "Error al obtener usuarios" });
    }
    res.json(results);
  });
});

// Crear nuevo usuario
app.post("/usuarios", async (req, res) => {
  const { nombreUsuario, contrasena, permisoId } = req.body;

  if (!nombreUsuario || !contrasena || !permisoId) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  try {
    // Hashear contraseña con bcrypt
    const bcrypt = await import('bcryptjs');
    const hashedPassword = bcrypt.default.hashSync(contrasena, 10);

    const query = `
      INSERT INTO UsuariosSistema (NombreUsuario, ContrasenaHash, PermisoID, Estatus)
      VALUES (?, ?, ?, 1);
    `;

    db.query(query, [nombreUsuario, hashedPassword, permisoId], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: "El nombre de usuario ya existe" });
        }
        console.error("❌ Error al crear usuario:", err);
        return res.status(500).json({ error: "Error al crear usuario" });
      }
      res.json({ 
        message: "Usuario creado exitosamente", 
        usuarioId: result.insertId 
      });
    });
  } catch (error) {
    console.error("❌ Error al hashear contraseña:", error);
    res.status(500).json({ error: "Error al procesar la contraseña" });
  }
});

// Actualizar usuario
app.put("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { nombreUsuario, contrasena, permisoId, estatus } = req.body;

  if (!nombreUsuario || !permisoId || estatus === undefined) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  try {
    let query;
    let params;

    // Si se proporciona contraseña (campo existe y no está vacío), hashearla
    if (contrasena !== undefined && contrasena !== null && contrasena.trim() !== "") {
      console.log("🔐 Actualizando con nueva contraseña para usuario:", nombreUsuario);
      const bcrypt = await import('bcryptjs');
      const hashedPassword = bcrypt.default.hashSync(contrasena, 10);
      
      query = `
        UPDATE UsuariosSistema 
        SET NombreUsuario = ?, ContrasenaHash = ?, PermisoID = ?, Estatus = ?
        WHERE UsuarioID = ?;
      `;
      params = [nombreUsuario, hashedPassword, permisoId, estatus, id];
    } else {
      // Sin cambio de contraseña
      console.log("📝 Actualizando SIN cambiar contraseña para usuario:", nombreUsuario);
      query = `
        UPDATE UsuariosSistema 
        SET NombreUsuario = ?, PermisoID = ?, Estatus = ?
        WHERE UsuarioID = ?;
      `;
      params = [nombreUsuario, permisoId, estatus, id];
    }

    db.query(query, params, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: "El nombre de usuario ya existe" });
        }
        console.error("❌ Error al actualizar usuario:", err);
        return res.status(500).json({ error: "Error al actualizar usuario" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      console.log("✅ Usuario actualizado exitosamente");
      res.json({ message: "Usuario actualizado exitosamente" });
    });
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
});

// Dar de baja (desactivar) usuario
app.delete("/usuarios/:id", (req, res) => {
  const { id } = req.params;
  
  // No eliminar físicamente, solo desactivar
  const query = "UPDATE UsuariosSistema SET Estatus = 0 WHERE UsuarioID = ?";

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("❌ Error al desactivar usuario:", err);
      return res.status(500).json({ error: "Error al desactivar usuario" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario desactivado exitosamente" });
  });
});

// Obtener permisos disponibles
app.get("/permisos", (req, res) => {
  const query = "SELECT * FROM PermisosSistema ORDER BY PermisoID";
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error obteniendo permisos:", err);
      return res.status(500).json({ error: "Error al obtener permisos" });
    }
    res.json(results);
  });
});

// ==============================
// INICIAR SERVIDOR
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
  console.log(`📡 API Python debe estar en ${process.env.PYTHON_API_URL || 'http://localhost:5000'}`);
});