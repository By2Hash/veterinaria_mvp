import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { dinero, diasHasta, estadoStock, fechaCorta, fechaHora, TEXTO_ESTADO } from "../lib/format";

const ETIQUETA_TIPO = { ingreso: "Ingreso", venta: "Venta", ajuste: "Ajuste" };

export default function StockPanel({ producto, usuario, notify, onChanged, onEdit, onDelete, onNext }) {
  const [cantidad, setCantidad] = useState(1);
  const [ocupado, setOcupado] = useState(false);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    let vigente = true;
    api
      .movimientos(producto.id)
      .then((m) => vigente && setHistorial(m))
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [producto.id, producto.stock]);

  async function mover(tipo, cant, mensaje) {
    setOcupado(true);
    try {
      const r = await api.mover({ producto_id: producto.id, tipo, cantidad: cant, usuario });
      onChanged({ ...producto, stock: r.stock });
      notify(mensaje, "ok");
      setCantidad(1);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setOcupado(false);
    }
  }

  function corregir() {
    const texto = window.prompt(`¿Cuántas unidades hay realmente en el local?\n(el sistema dice ${producto.stock})`, producto.stock);
    if (texto === null) return;
    const real = Number.parseInt(texto, 10);
    if (!Number.isInteger(real) || real < 0) return notify("Ingresá un número entero válido.", "error");
    const diferencia = real - producto.stock;
    if (diferencia === 0) return notify("El stock ya coincide.", "ok");
    mover("ajuste", diferencia, "Stock corregido");
  }

  const estado = estadoStock(producto);
  const dias = diasHasta(producto.vencimiento);
  const venceProximo = dias !== null && dias <= 60;
  const cant = Number.isInteger(cantidad) && cantidad > 0 ? cantidad : 1;

  return (
    <article className="panel">
      <div className="panel-cabecera">
        <div className="panel-titulo">
          <h3>{producto.nombre}</h3>
          <p className="suave">
            {[producto.marca, producto.presentacion, producto.especie].filter(Boolean).join(", ")}
          </p>
          <p className="suave chico">
            {producto.categoria || "Sin categoría"} · código {producto.codigo_barras}
          </p>
        </div>
        <div className="etiqueta-precio" aria-label={`Precio de venta ${dinero(producto.precio_venta)}`}>
          <span className="etiqueta-agujero" aria-hidden="true" />
          <span className="etiqueta-monto">{dinero(producto.precio_venta)}</span>
        </div>
      </div>

      <div className="panel-stock">
        <div>
          <span className={`stock-numero estado-${estado}`}>{producto.stock}</span>
          <span className="suave"> en stock</span>
        </div>
        <span className={`chip estado-${estado}`}>
          {TEXTO_ESTADO[estado]}
          {estado !== "ok" || producto.stock_minimo > 0 ? ` (mínimo ${producto.stock_minimo})` : ""}
        </span>
      </div>

      {venceProximo && (
        <p className={`aviso ${dias < 0 ? "aviso-rojo" : ""}`}>
          {dias < 0 ? `Venció el ${fechaCorta(producto.vencimiento)}` : `Vence el ${fechaCorta(producto.vencimiento)} (en ${dias} días)`}
        </p>
      )}

      <div className="mover">
        <div className="stepper" role="group" aria-label="Cantidad">
          <button type="button" onClick={() => setCantidad(Math.max(1, cant - 1))} aria-label="Restar uno">−</button>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value === "" ? "" : Number.parseInt(e.target.value, 10))}
            onFocus={(e) => e.target.select()}
            aria-label="Cantidad de unidades"
          />
          <button type="button" onClick={() => setCantidad(cant + 1)} aria-label="Sumar uno">+</button>
        </div>
        <button type="button" className="btn btn-venta" disabled={ocupado} onClick={() => mover("venta", cant, "Venta registrada")}>
          Registrar venta
        </button>
        <button type="button" className="btn btn-ingreso" disabled={ocupado} onClick={() => mover("ingreso", cant, "Stock sumado")}>
          Sumar al stock
        </button>
      </div>

      <div className="acciones-secundarias">
        <button type="button" className="btn-texto" onClick={() => onEdit(producto)}>Editar producto</button>
        <button type="button" className="btn-texto" onClick={corregir} disabled={ocupado}>Corregir stock</button>
        <button type="button" className="btn-texto peligro" onClick={() => onDelete(producto)}>Eliminar</button>
        {onNext && (
          <button type="button" className="btn-texto" onClick={onNext}>Escanear otro</button>
        )}
      </div>

      {historial.length > 0 && (
        <details className="historial">
          <summary>Últimos movimientos</summary>
          <ul>
            {historial.map((m) => (
              <li key={m.id}>
                <span>{fechaHora(m.creado_en)}</span>
                <span>{ETIQUETA_TIPO[m.tipo]}</span>
                <strong className={m.cantidad < 0 ? "neg" : "pos"}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</strong>
                <span className="suave">{m.usuario || ""}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
