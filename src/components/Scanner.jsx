import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

const FORMATOS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE,
];

function mensajeError(e) {
  if (!navigator.mediaDevices?.getUserMedia)
    return "La cámara solo funciona con conexión segura (HTTPS) o en localhost.";
  if (e?.name === "NotAllowedError") return "Permití el acceso a la cámara en el navegador y volvé a intentar.";
  if (e?.name === "NotFoundError") return "No se encontró ninguna cámara en este dispositivo.";
  if (e?.name === "NotReadableError") return "La cámara está siendo usada por otra aplicación.";
  return "No se pudo abrir la cámara.";
}

export default function Scanner({ onCode, onClose }) {
  const videoRef = useRef(null);
  const cb = useRef(onCode);
  cb.current = onCode;
  const ultimo = useRef({ code: "", t: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    let controles = null;
    let cancelado = false;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATOS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const lector = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 });

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(mensajeError());
      return;
    }

    lector
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current,
        (resultado) => {
          if (!resultado) return;
          const code = resultado.getText();
          const ahora = Date.now();
          if (code === ultimo.current.code && ahora - ultimo.current.t < 2500) return;
          ultimo.current = { code, t: ahora };
          navigator.vibrate?.(60);
          cb.current(code);
        }
      )
      .then((c) => {
        if (cancelado) c.stop();
        else controles = c;
      })
      .catch((e) => !cancelado && setError(mensajeError(e)));

    return () => {
      cancelado = true;
      controles?.stop();
    };
  }, []);

  return (
    <div className="scanner">
      {error ? (
        <p className="scanner-error">{error}</p>
      ) : (
        <>
          <video ref={videoRef} playsInline muted />
          <div className="scanner-mira" aria-hidden="true" />
          <p className="scanner-ayuda">Apuntá al código de barras</p>
        </>
      )}
      <button type="button" className="btn btn-claro scanner-cerrar" onClick={onClose}>
        Cerrar cámara
      </button>
    </div>
  );
}
