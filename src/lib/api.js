async function req(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Sin conexión. Revisá internet e intentá de nuevo.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  categorias: () => req("/categorias"),
  proveedores: () => req("/proveedores"),
  productos: (q = "", categoria = "") =>
    req(`/productos?q=${encodeURIComponent(q)}&categoria=${encodeURIComponent(categoria)}`),
  producto: (id) => req(`/productos/${id}`),
  porCodigo: (codigo) => req(`/productos/barcode/${encodeURIComponent(codigo)}`),
  crear: (datos) => req("/productos", { method: "POST", body: datos }),
  actualizar: (id, datos) => req(`/productos/${id}`, { method: "PUT", body: datos }),
  eliminar: (id) => req(`/productos/${id}`, { method: "DELETE" }),
  movimientos: (productoId) => req(`/movimientos?producto_id=${productoId}`),
  mover: (datos) => req("/movimientos", { method: "POST", body: datos }),
  alertas: () => req("/alertas"),
};
