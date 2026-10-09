import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { dinero, estadoStock, TEXTO_ESTADO } from "../lib/format";

export default function ListView({ version, categorias, notify, onOpen, onEdit, onCreate, onDelete }) {
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [items, setItems] = useState(null);

  useEffect(() => {
    let vigente = true;
    const t = setTimeout(() => {
      api
        .productos(q, categoria)
        .then((r) => vigente && setItems(r))
        .catch((e) => vigente && notify(e.message, "error"));
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [q, categoria, version, notify]);

  return (
    <section className="vista">
      <div className="vista-cabecera">
        <h1>Productos</h1>
        <button type="button" className="btn btn-primario" onClick={() => onCreate("")}>
          Nuevo producto
        </button>
      </div>

      <div className="filtros">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, marca o código"
          aria-label="Buscar productos"
        />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {items === null ? (
        <p className="suave">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="vacio">
          <p>No hay productos que coincidan con la búsqueda.</p>
          <button type="button" className="btn btn-claro" onClick={() => onCreate("")}>Crear un producto nuevo</button>
        </div>
      ) : (
        <>
          <p className="suave chico">{items.length} producto{items.length === 1 ? "" : "s"}</p>
          <ul className="lista">
            {items.map((p) => {
              const estado = estadoStock(p);
              return (
                <li key={p.id} className="fila">
                  <button type="button" className="fila-principal" onClick={() => onOpen(p)}>
                    <span className="fila-nombre">{p.nombre}</span>
                    <span className="suave chico">
                      {[p.marca, p.presentacion].filter(Boolean).join(", ") || p.categoria}
                    </span>
                  </button>
                  <span className="fila-precio">{dinero(p.precio_venta)}</span>
                  <span className={`chip estado-${estado}`} title={TEXTO_ESTADO[estado]}>{p.stock}</span>
                  <span className="fila-acciones">
                    <button type="button" className="btn-texto" onClick={() => onEdit(p)}>Editar</button>
                    <button type="button" className="btn-texto peligro" onClick={() => onDelete(p)}>Eliminar</button>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
