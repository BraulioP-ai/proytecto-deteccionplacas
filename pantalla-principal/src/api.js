const API_URL = "http://localhost:3000";

export const getEmpleados = async () => {
  const res = await fetch(`${API_URL}/empleados`);
  if (!res.ok) throw new Error("Error al obtener empleados");
  return res.json();
};
