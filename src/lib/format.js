const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const dinero = (n) => ars.format(Number(n) || 0);

export function fechaCorta(iso) {
  if (!iso) return "Sin vencimiento";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// Días que faltan para una fecha AAAA-MM-DD (negativo = ya venció)
export function diasHasta(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const hoy = new Date();
  const hoy0 = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - hoy0) / 86400000);
}

export function estadoStock(p) {
  if (p.stock <= 0) return "agotado";
  if (p.stock < p.stock_minimo) return "bajo";
  return "ok";
}

export const TEXTO_ESTADO = { agotado: "Sin stock", bajo: "Stock bajo", ok: "Stock normal" };

// La base guarda la hora en UTC ("AAAA-MM-DD HH:MM:SS")
export function fechaHora(s) {
  if (!s) return "";
  const f = new Date(s.replace(" ", "T") + "Z");
  return f.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
