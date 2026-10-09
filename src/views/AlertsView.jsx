import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { diasHasta, fechaCorta } from "../lib/format";

function Lista({ titulo, vacio, items, detalle, onOpen }) {
  return (
    <div className="bloque">
      <h2>{titulo}</h2>
      {items.length === 0 ? (
        <p className="suave">{vacio}</p>
      ) : (
        <ul className="lista">
          {items.map((p) => (
            <li key={p.id} className="fila fila-simple">
              <button type="button" className="fila-principal" onClick={() => onOpen(p)}>
                <span className="fila-nombre">{p.nombre}</span>
                <span className="suave chico">{p.proveedor ? `Proveedor: ${p.proveedor}` : p.categoria}</span>
              </button>
              <span className="fila-detalle">{detalle(p)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AlertsView({ version, notify, onOpen }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let vigente = true;
    api
      .alertas()
      .then((r) => vigente && setDatos(r))
      .catch((e) => vigente && notify(e.message, "error"));
    return () => {
      vigente = false;
    };
  }, [version, notify]);

  if (!datos) return <section className="vista"><h1>Alertas</h1><p className="suave">Cargando…</p></section>;

  return (
    <section className="vista">
      <h1>Alertas</h1>
      <Lista
        titulo={`Para reponer (${datos.bajo_stock.length})`}
        vacio="Todos los productos tienen stock suficiente."
        items={datos.bajo_stock}
        onOpen={onOpen}
        detalle={(p) => (
          <span className={p.stock <= 0 ? "neg" : "aviso-texto"}>
            {p.stock} de {p.stock_minimo}
          </span>
        )}
      />
      <Lista
        titulo={`Por vencer en 60 días (${datos.por_vencer.length})`}
        vacio="No hay productos por vencer."
        items={datos.por_vencer}
        onOpen={onOpen}
        detalle={(p) => {
          const d = diasHasta(p.vencimiento);
          return <span className={d < 0 ? "neg" : "aviso-texto"}>{d < 0 ? "Vencido" : `${d} días`} · {fechaCorta(p.vencimiento)}</span>;
        }}
      />
    </section>
  );
}
