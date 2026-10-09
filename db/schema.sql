-- Esquema para Cloudflare D1 (SQLite)
DROP TABLE IF EXISTS movimientos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS proveedores;
DROP TABLE IF EXISTS categorias;

CREATE TABLE categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE proveedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT
);

CREATE TABLE productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_barras TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  marca TEXT,
  categoria_id INTEGER REFERENCES categorias(id),
  proveedor_id INTEGER REFERENCES proveedores(id),
  especie TEXT,
  presentacion TEXT,
  precio_costo REAL NOT NULL DEFAULT 0,
  precio_venta REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 0,
  vencimiento TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_productos_nombre ON productos(nombre);

CREATE TABLE movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso','venta','ajuste')),
  cantidad INTEGER NOT NULL,          -- ventas en negativo
  nota TEXT,
  usuario TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_mov_producto ON movimientos(producto_id);
