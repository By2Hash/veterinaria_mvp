import { useEffect, useRef } from "react";

// Lector USB de códigos de barras: se comporta como un teclado que escribe muy rápido y termina con Enter.
// Este hook detecta ese patrón cuando NO hay un campo de texto enfocado.
export function useBarcodeGun(onCode, activo = true) {
  const cb = useRef(onCode);
  cb.current = onCode;

  useEffect(() => {
    if (!activo) return;
    let buffer = "";
    let ultimo = 0;
    const onKey = (e) => {
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const ahora = Date.now();
      if (ahora - ultimo > 80) buffer = ""; // una persona tipea mucho más lento que el lector
      ultimo = ahora;
      if (e.key === "Enter") {
        if (buffer.length >= 6) cb.current(buffer);
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activo]);
}
