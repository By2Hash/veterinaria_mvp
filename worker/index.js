import { Hono } from "hono";

const app = new Hono();

// ---------- utilidades ----------
const SELECT_PRODUCTO = `
  SELECT p.*, c.nombre AS categoria, pr.nombre AS proveedor
  FROM productos p
  LEFT JOIN categorias c ON c.id = p.categoria_id
  LEFT JOIN proveedores pr ON pr.id = p.proveedor_id`;

const texto = (v) => {
  const t = v == null ? "" : String(v).trim();
  return t === "" ? null : t;
};
const entero = (v, def = 0) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : def;
};
const decimal = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const idOpcional = (v) => (v === "" || v == null ? null : entero(v, null));

function limpiarProducto(body) {
  return {
    codigo_barras: texto(body.codigo_barras),
    nombre: texto(body.nombre),
    marca: texto(body.marca),
    categoria_id: idOpcional(body.categoria_id),
    proveedor_id: idOpcional(body.proveedor_id),
    especie: texto(body.especie),
    presentacion: texto(body.presentacion),
    precio_costo: decimal(body.precio_costo),
    precio_venta: decimal(body.precio_venta),
    stock_minimo: entero(body.stock_minimo),
    vencimiento: texto(body.vencimiento),
    stock_inicial: entero(body.stock),
  };
}

function validar(p) {
  const errores = [];
  if (!p.codigo_barras) errores.push("El código de barras es obligatorio.");
  if (!p.nombre) errores.push("El nombre es obligatorio.");
  if (p.precio_costo < 0) errores.push("El precio de costo no puede ser negativo.");
  if (p.precio_venta < 0) errores.push("El precio de venta no puede ser negativo.");
  if (p.stock_minimo < 0) errores.push("El stock mínimo no puede ser negativo.");
  if (p.stock_inicial < 0) errores.push("El stock inicial no puede ser negativo.");
  if (p.vencimiento && !/^\d{4}-\d{2}-\d{2}$/.test(p.vencimiento))
    errores.push("La fecha de vencimiento no es válida.");
  return errores;
}

const quienEs = (c, body) =>
  c.req.header("Cf-Access-Authenticated-User-Email") || texto(body?.usuario) || null;

// ---------- catálogos ----------
app.get("/api/categorias", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, nombre FROM categorias ORDER BY nombre").all();
  return c.json(results);
});

app.get("/api/proveedores", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, nombre FROM proveedores ORDER BY nombre").all();
  return c.json(results);
});

// ---------- productos ----------
app.get("/api/productos", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const categoria = entero(c.req.query("categoria"), 0);
  const { results } = await c.env.DB
    .prepare(
      `${SELECT_PRODUCTO}
       WHERE p.activo = 1
         AND (?1 = '' OR p.nombre LIKE ?2 OR p.marca LIKE ?2 OR p.codigo_barras LIKE ?2)
         AND (?3 = 0 OR p.categoria_id = ?3)
       ORDER BY p.nombre COLLATE NOCASE
       LIMIT 300`
    )
    .bind(q, `%${q}%`, categoria)
    .all();
  return c.json(results);
});

app.get("/api/productos/barcode/:codigo", async (c) => {
  const row = await c.env.DB
    .prepare(`${SELECT_PRODUCTO} WHERE p.codigo_barras = ? AND p.activo = 1`)
    .bind(c.req.param("codigo").trim())
    .first();
  return row ? c.json(row) : c.json({ error: "No existe un producto con ese código." }, 404);
});

app.get("/api/productos/:id", async (c) => {
  const row = await c.env.DB
    .prepare(`${SELECT_PRODUCTO} WHERE p.id = ?`)
    .bind(entero(c.req.param("id")))
    .first();
  return row ? c.json(row) : c.json({ error: "Producto no encontrado." }, 404);
});

app.post("/api/productos", async (c) => {
  const body = await c.req.json();
  const p = limpiarProducto(body);
  const errores = validar(p);
  if (errores.length) return c.json({ error: errores.join(" ") }, 400);

  const db = c.env.DB;
  const existente = await db
    .prepare("SELECT id, activo FROM productos WHERE codigo_barras = ?")
    .bind(p.codigo_barras)
    .first();

  let id;
  if (existente && existente.activo === 1) {
    return c.json({ error: "Ya existe un producto con ese código de barras." }, 409);
  } else if (existente) {
    // El código pertenecía a un producto eliminado: lo reactivamos con los datos nuevos.
    id = existente.id;
    await db
      .prepare(
        `UPDATE productos SET nombre=?, marca=?, categoria_id=?, proveedor_id=?, especie=?, presentacion=?,
           precio_costo=?, precio_venta=?, stock_minimo=?, vencimiento=?, activo=1 WHERE id=?`
      )
      .bind(p.nombre, p.marca, p.categoria_id, p.proveedor_id, p.especie, p.presentacion,
            p.precio_costo, p.precio_venta, p.stock_minimo, p.vencimiento, id)
      .run();
  } else {
    const r = await db
      .prepare(
        `INSERT INTO productos (codigo_barras, nombre, marca, categoria_id, proveedor_id, especie, presentacion,
           precio_costo, precio_venta, stock, stock_minimo, vencimiento)
         VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`
      )
      .bind(p.codigo_barras, p.nombre, p.marca, p.categoria_id, p.proveedor_id, p.especie, p.presentacion,
            p.precio_costo, p.precio_venta, p.stock_minimo, p.vencimiento)
      .run();
    id = r.meta.last_row_id;
  }

  if (p.stock_inicial > 0) {
    await db.batch([
      db.prepare("INSERT INTO movimientos (producto_id, tipo, cantidad, nota, usuario) VALUES (?,?,?,?,?)")
        .bind(id, "ingreso", p.stock_inicial, "Stock inicial", quienEs(c, body)),
      db.prepare("UPDATE productos SET stock = stock + ? WHERE id = ?").bind(p.stock_inicial, id),
    ]);
  }

  const creado = await db.prepare(`${SELECT_PRODUCTO} WHERE p.id = ?`).bind(id).first();
  return c.json(creado, 201);
});

app.put("/api/productos/:id", async (c) => {
  const id = entero(c.req.param("id"));
  const p = limpiarProducto(await c.req.json());
  const errores = validar(p);
  if (errores.length) return c.json({ error: errores.join(" ") }, 400);

  try {
    const r = await c.env.DB
      .prepare(
        `UPDATE productos SET codigo_barras=?, nombre=?, marca=?, categoria_id=?, proveedor_id=?, especie=?,
           presentacion=?, precio_costo=?, precio_venta=?, stock_minimo=?, vencimiento=? WHERE id=?`
      )
      .bind(p.codigo_barras, p.nombre, p.marca, p.categoria_id, p.proveedor_id, p.especie,
            p.presentacion, p.precio_costo, p.precio_venta, p.stock_minimo, p.vencimiento, id)
      .run();
    if (r.meta.changes === 0) return c.json({ error: "Producto no encontrado." }, 404);
  } catch (e) {
    if (String(e.message).includes("UNIQUE"))
      return c.json({ error: "Ese código de barras ya lo usa otro producto." }, 409);
    throw e;
  }
  const row = await c.env.DB.prepare(`${SELECT_PRODUCTO} WHERE p.id = ?`).bind(id).first();
  return c.json(row);
});

// "Eliminar" = desactivar. Así se conserva el historial de movimientos.
app.delete("/api/productos/:id", async (c) => {
  const r = await c.env.DB
    .prepare("UPDATE productos SET activo = 0 WHERE id = ?")
    .bind(entero(c.req.param("id")))
    .run();
  if (r.meta.changes === 0) return c.json({ error: "Producto no encontrado." }, 404);
  return c.json({ ok: true });
});

// ---------- movimientos de stock ----------
app.get("/api/movimientos", async (c) => {
  const { results } = await c.env.DB
    .prepare(
      `SELECT id, tipo, cantidad, nota, usuario, creado_en FROM movimientos
       WHERE producto_id = ? ORDER BY id DESC LIMIT 10`
    )
    .bind(entero(c.req.query("producto_id")))
    .all();
  return c.json(results);
});

app.post("/api/movimientos", async (c) => {
  const body = await c.req.json();
  const productoId = entero(body.producto_id);
  const tipo = body.tipo;
  let cantidad = entero(body.cantidad);

  if (!["ingreso", "venta", "ajuste"].includes(tipo))
    return c.json({ error: "Tipo de movimiento no válido." }, 400);
  if (cantidad === 0) return c.json({ error: "La cantidad no puede ser cero." }, 400);
  if (tipo !== "ajuste" && cantidad < 0) return c.json({ error: "La cantidad debe ser positiva." }, 400);
  if (tipo === "venta") cantidad = -cantidad;

  const db = c.env.DB;
  const prod = await db.prepare("SELECT id, stock, activo FROM productos WHERE id = ?").bind(productoId).first();
  if (!prod || prod.activo === 0) return c.json({ error: "Producto no encontrado." }, 404);

  // Ambas sentencias llevan la misma condición (el stock no puede quedar en negativo)
  // y se ejecutan juntas en una transacción.
  const [mov] = await db.batch([
    db.prepare(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, nota, usuario)
       SELECT ?1, ?2, ?3, ?4, ?5 WHERE EXISTS (SELECT 1 FROM productos WHERE id = ?1 AND stock + ?3 >= 0)`
    ).bind(productoId, tipo, cantidad, texto(body.nota), quienEs(c, body)),
    db.prepare("UPDATE productos SET stock = stock + ?1 WHERE id = ?2 AND stock + ?1 >= 0").bind(cantidad, productoId),
  ]);

  if (mov.meta.changes === 0) {
    return c.json(
      { error: `Solo hay ${prod.stock} unidad(es) en stock. Corregí el stock real y volvé a intentar.` },
      409
    );
  }
  const actual = await db.prepare("SELECT stock FROM productos WHERE id = ?").bind(productoId).first();
  return c.json({ ok: true, stock: actual.stock });
});

// ---------- alertas ----------
app.get("/api/alertas", async (c) => {
  const db = c.env.DB;
  const bajo = await db
    .prepare(`${SELECT_PRODUCTO} WHERE p.activo = 1 AND p.stock < p.stock_minimo ORDER BY p.stock, p.nombre`)
    .all();
  const vence = await db
    .prepare(
      `${SELECT_PRODUCTO} WHERE p.activo = 1 AND p.vencimiento IS NOT NULL
         AND p.vencimiento <= date('now', '+60 days') ORDER BY p.vencimiento`
    )
    .all();
  return c.json({ bajo_stock: bajo.results, por_vencer: vence.results });
});

app.notFound((c) => c.json({ error: "Ruta no encontrada." }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Error interno del servidor." }, 500);
});

export default app;
