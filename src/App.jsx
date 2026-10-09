import { useCallback, useEffect, useState } from "react";
import { api } from "./lib/api";
import Modal from "./components/Modal";
import ProductForm from "./components/ProductForm";
import StockPanel from "./components/StockPanel";
import ScanView from "./views/ScanView";
import ListView from "./views/ListView";
import AlertsView from "./views/AlertsView";

const TABS = [
  { id: "scan", texto: "Escanear" },
  { id: "list", texto: "Productos" },
  { id: "alerts", texto: "Alertas" },
];

function leerUsuario() {
  try {
    return localStorage.getItem("usuario") || "";
  } catch {
    return "";
  }
}

export default function App() {
  const [tab, setTab] = useState("scan");
  const [version, setVersion] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [formulario, setFormulario] = useState(null); // { producto?, codigo? }
  const [seleccionado, setSeleccionado] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [usuario, setUsuario] = useState(leerUsuario);

  const refrescar = useCallback(() => setVersion((v) => v + 1), []);

  const notify = useCallback((texto, tipo = "ok") => {
    setAviso({ texto, tipo, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.tipo === "error" ? 6000 : 2500);
    return () => clearTimeout(t);
  }, [aviso]);

  useEffect(() => {
    Promise.all([api.categorias(), api.proveedores()])
      .then(([c, p]) => {
        setCategorias(c);
        setProveedores(p);
      })
      .catch((e) => notify(e.message, "error"));
  }, [notify]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  function cambiarUsuario() {
    const nombre = window.prompt("¿Quién está usando la app? (queda registrado en cada movimiento)", usuario);
    if (nombre === null) return;
    const limpio = nombre.trim();
    setUsuario(limpio);
    try {
      localStorage.setItem("usuario", limpio);
    } catch {
      /* sin almacenamiento disponible */
    }
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar "${p.nombre}"?\nDeja de aparecer en la lista, pero se conserva su historial.`)) return;
    try {
      await api.eliminar(p.id);
      notify("Producto eliminado", "ok");
      setSeleccionado(null);
      refrescar();
    } catch (e) {
      notify(e.message, "error");
    }
  }

  function guardado(p, editado) {
    setFormulario(null);
    notify(editado ? "Cambios guardados" : "Producto creado", "ok");
    refrescar();
    if (!editado) {
      setTab("scan");
      setSeleccionado(null);
    }
  }

  const abrirFormulario = (datos) => {
    setSeleccionado(null);
    setFormulario(datos);
  };

  return (
    <div className="app">
      <header className="barra">
        <span className="marca">Stock Veterinaria</span>
        <nav className="tabs" aria-label="Secciones">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${tab === t.id ? "activa" : ""}`}
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.texto}
            </button>
          ))}
        </nav>
        <button type="button" className="usuario" onClick={cambiarUsuario}>
          {usuario || "Poné tu nombre"}
        </button>
      </header>

      {!online && <p className="sin-conexion" role="status">Sin conexión: no se pueden guardar cambios hasta que vuelva internet.</p>}

      <main className="contenido">
        <div hidden={tab !== "scan"}>
          <ScanView
            activo={tab === "scan" && !formulario && !seleccionado}
            version={version}
            usuario={usuario}
            notify={notify}
            onEdit={(p) => abrirFormulario({ producto: p })}
            onCreate={(codigo) => abrirFormulario({ codigo })}
            onDelete={eliminar}
            onChanged={refrescar}
          />
        </div>
        {tab === "list" && (
          <ListView
            version={version}
            categorias={categorias}
            notify={notify}
            onOpen={setSeleccionado}
            onEdit={(p) => abrirFormulario({ producto: p })}
            onCreate={(codigo) => abrirFormulario({ codigo })}
            onDelete={eliminar}
          />
        )}
        {tab === "alerts" && <AlertsView version={version} notify={notify} onOpen={setSeleccionado} />}
      </main>

      {seleccionado && (
        <Modal titulo="Producto" onClose={() => setSeleccionado(null)}>
          <StockPanel
            producto={seleccionado}
            usuario={usuario}
            notify={notify}
            onChanged={(p) => {
              setSeleccionado(p);
              refrescar();
            }}
            onEdit={(p) => abrirFormulario({ producto: p })}
            onDelete={eliminar}
          />
        </Modal>
      )}

      {formulario && (
        <ProductForm
          producto={formulario.producto}
          codigoInicial={formulario.codigo}
          categorias={categorias}
          proveedores={proveedores}
          usuario={usuario}
          onClose={() => setFormulario(null)}
          onSaved={guardado}
        />
      )}

      {aviso && (
        <div className={`toast toast-${aviso.tipo}`} role="status" aria-live="polite" key={aviso.id}>
          {aviso.texto}
        </div>
      )}
    </div>
  );
}
