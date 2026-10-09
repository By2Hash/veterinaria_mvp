import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useBarcodeGun } from "../lib/useBarcodeGun";
const Scanner = lazy(() => import("../components/Scanner"));
import StockPanel from "../components/StockPanel";

export default function ScanView({ version, usuario, notify, onEdit, onCreate, onDelete, onChanged, activo }) {
  const [camara, setCamara] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [producto, setProducto] = useState(null);
  const [noExiste, setNoExiste] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef(null);

  const buscar = useCallback(
    async (texto) => {
      const code = texto.trim();
      if (!code) return;
      setBuscando(true);
      setNoExiste(null);
      try {
        setProducto(await api.porCodigo(code));
      } catch (e) {
        setProducto(null);
        if (e.status === 404) setNoExiste(code);
        else notify(e.message, "error");
      } finally {
        setBuscando(false);
        setCodigo("");
      }
    },
    [notify]
  );

  // Lector USB cuando no hay ningún campo enfocado
  useBarcodeGun(buscar, activo && !camara);

  // Si el producto se editó o eliminó desde otra parte, lo refrescamos
  useEffect(() => {
    if (producto) {
      api
        .producto(producto.id)
        .then((p) => setProducto(p.activo === 0 ? null : p))
        .catch(() => setProducto(null));
    } else if (noExiste) {
      // por si el producto recién se creó con ese código
      api
        .porCodigo(noExiste)
        .then((p) => {
          setProducto(p);
          setNoExiste(null);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // Al salir de la pestaña se apaga la cámara
  useEffect(() => {
    if (!activo) setCamara(false);
  }, [activo]);

  useEffect(() => {
    if (activo && !camara && window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, [activo, camara, producto, noExiste]);

  function alLeerConCamara(code) {
    setCamara(false);
    buscar(code);
  }

  function escanearOtro() {
    setProducto(null);
    setNoExiste(null);
    setCamara(true);
  }

  return (
    <section className="vista">
      <h1>Escanear producto</h1>

      {camara ? (
        <Suspense fallback={<p className="suave">Abriendo cámara…</p>}>
          <Scanner onCode={alLeerConCamara} onClose={() => setCamara(false)} />
        </Suspense>
      ) : (
        <div className="buscador-codigo">
          <button type="button" className="btn btn-primario btn-grande" onClick={() => setCamara(true)}>
            Abrir cámara
          </button>
          <form
            className="campo-fila"
            onSubmit={(e) => {
              e.preventDefault();
              buscar(codigo);
            }}
          >
            <input
              ref={inputRef}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Lector USB o escribí el código"
              aria-label="Código de barras"
              inputMode="numeric"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-claro" disabled={buscando || !codigo.trim()}>
              Buscar
            </button>
          </form>
        </div>
      )}

      {producto && (
        <StockPanel
          producto={producto}
          usuario={usuario}
          notify={notify}
          onChanged={(p) => {
            setProducto(p);
            onChanged();
          }}
          onEdit={onEdit}
          onDelete={onDelete}
          onNext={escanearOtro}
        />
      )}

      {noExiste && (
        <div className="vacio">
          <p>
            No hay ningún producto con el código <strong>{noExiste}</strong>.
          </p>
          <button type="button" className="btn btn-primario" onClick={() => onCreate(noExiste)}>
            Crear producto con este código
          </button>
        </div>
      )}

      {!producto && !noExiste && !camara && (
        <p className="suave vacio-texto">
          Pasá el lector o abrí la cámara para ver el precio y el stock, sumar mercadería o registrar una venta.
        </p>
      )}
    </section>
  );
}
