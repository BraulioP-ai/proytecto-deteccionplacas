import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Configuración de MySQL
const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "1234",
  database: process.env.DB_NAME || "Proyecto_IS",
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear pool de conexiones
let pool;

export const connectDB = async () => {
  try {
    pool = mysql.createPool(config);
    
    // Probar la conexión
    const connection = await pool.getConnection();
    console.log("✅ Conectado a MySQL");
    connection.release();
    
    return pool;
  } catch (err) {
    console.error("❌ Error al conectar con MySQL:", err.message);
    process.exit(1);
  }
};

// Exportar función para hacer queries (compatible con callbacks)
export const query = (sql, params = []) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!pool) {
        await connectDB();
      }
      const [results] = await pool.execute(sql, params);
      resolve(results);
    } catch (err) {
      console.error("❌ Error en query:", err.message);
      reject(err);
    }
  });
};

// Wrapper para compatibilidad con callbacks del código existente
export const db = {
  query: (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    query(sql, params)
      .then(results => callback(null, results))
      .catch(err => callback(err, null));
  }
};

// Iniciar conexión al importar
connectDB();

export default { query, connectDB, db };