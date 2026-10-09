import { lazy, Suspense, useRef, useState } from "react";
import { api } from "../lib/api";
import Modal from "./Modal";
const Scanner = lazy(() => import("./Scanner"));

const ESPECIES = ["Perro", "Gato", "Perro/Gato", "Otros"];

const VACIO = {
  codigo_barras: "", nombre: "", marca: "", categoria_id: "", proveedor_id: "", especie: "",
  presentacion: "", precio_costo: "", precio_venta: "", stock: "", stock_minimo: "", vencimiento: "",
};

function desdeProducto(p) {
  const f = { ...VACIO };
  for (const k of Object.keys(VACIO)) if (p[k] != null) f[k] = String(p[k]);
  return f;
}

export default function ProductForm({ producto, codigoInicial, categorias, proveedores, usuario, onClose, onSaved }) {
  const editando = Boolean(producto);
  const [f, setF] = useState(() => (editando ? desdeProducto(producto) : { ...VACIO, codigo_barras: codigoInicial || "" }));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const nombreRef = useRef(null);

  const set = (campo) => (e) => setF((prev) => ({ ...prev, [campo]: e.target.value }));
  const costo = Number(f.precio_costo);
  const venta = Number(f.precio_venta);
  const margen = costo > 0 && venta > 0 ? Math.round(((venta - costo) / costo) * 100) : null;

  async function guardar(e) {
    e.preventDefault();
    setError("");
    if (!f.codigo_barras.trim()) return setError("Escaneá o escribí el código de barras.");
    if (!f.nombre.trim()) return setError("Escribí el nombre del producto.");
    setGuardando(true);
    try {
      const datos = { ...f, usuario };
      const guardado = editando ? await api.actualizar(producto.id, datos) : await api.crear(datos);
      onSaved(guardado, editando);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={editando ? "Editar producto" : "Nuevo producto"} onClose={onClose}>
      <form className="form" onSubmit={guardar} noValidate>
        <div className="campo">
          <label htmlFor="codigo">Código de barras</label>
          <div className="campo-fila">
            <input
              id="codigo"
              value={f.codigo_barras}
              onChange={set("codigo_barras")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault(); // el lector USB manda Enter al terminar
                  nombreRef.current?.focus();
                }
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Pasá el lector o escribilo"
            />
            <button type="button" className="btn btn-claro" onClick={() => setEscaneando((v) => !v)}>
              {escaneando ? "Cerrar cámara" : "Cámara"}
            </button>
          </div>
        </div>
        {escaneando && (
          <Suspense fallback={<p className="suave">Abriendo cámara…</p>}>
            <Scanner
              onCode={(code) => {
                setF((prev) => ({ ...prev, codigo_barras: code }));
                setEscaneando(false);
                nombreRef.current?.focus();
              }}
              onClose={() => setEscaneando(false)}
            />
          </Suspense>
        )}

        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" ref={nombreRef} value={f.nombre} onChange={set("nombre")} placeholder="Ej: Alimento adulto razas medianas" />
        </div>

        <div className="grilla-2">
          <div className="campo">
            <label htmlFor="marca">Marca</label>
            <input id="marca" value={f.marca} onChange={set("marca")} />
          </div>
          <div className="campo">
            <label htmlFor="presentacion">Presentación</label>
            <input id="presentacion" value={f.presentacion} onChange={set("presentacion")} placeholder="15 kg, 250 ml, x5…" />
          </div>
          <div className="campo">
            <label htmlFor="categoria">Categoría</label>
            <select id="categoria" value={f.categoria_id} onChange={set("categoria_id")}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="especie">Especie</label>
            <select id="especie" value={f.especie} onChange={set("especie")}>
              <option value="">No aplica</option>
              {ESPECIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="proveedor">Proveedor</label>
            <select id="proveedor" value={f.proveedor_id} onChange={set("proveedor_id")}>
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="vencimiento">Vencimiento</label>
            <input id="vencimiento" type="date" value={f.vencimiento} onChange={set("vencimiento")} />
          </div>
        </div>

        <div className="grilla-2">
          <div className="campo">
            <label htmlFor="costo">Precio de costo ($)</label>
            <input id="costo" type="number" inputMode="decimal" min="0" step="any" value={f.precio_costo} onChange={set("precio_costo")} />
          </div>
          <div className="campo">
            <label htmlFor="venta">Precio de venta ($)</label>
            <input id="venta" type="number" inputMode="decimal" min="0" step="any" value={f.precio_venta} onChange={set("precio_venta")} />
            {margen !== null && <small className="suave">Ganancia sobre el costo: {margen}%</small>}
          </div>
          {!editando && (
            <div className="campo">
              <label htmlFor="stock">Stock inicial</label>
              <input id="stock" type="number" inputMode="numeric" min="0" step="1" value={f.stock} onChange={set("stock")} />
            </div>
          )}
          <div className="campo">
            <label htmlFor="minimo">Avisar si queda menos de</label>
            <input id="minimo" type="number" inputMode="numeric" min="0" step="1" value={f.stock_minimo} onChange={set("stock_minimo")} />
          </div>
        </div>

        {editando && (
          <p className="suave chico">El stock se cambia con “Sumar al stock”, “Registrar venta” o “Corregir stock”, así queda el historial.</p>
        )}
        {error && <p className="error" role="alert">{error}</p>}

        <div className="form-botones">
          <button type="button" className="btn btn-claro" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primario" disabled={guardando}>
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
