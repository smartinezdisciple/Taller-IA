-- ============================================================================
-- SCRIPT DE ESQUEMA POSTGRESQL v2.0 - SISTEMA WEB DE TALLER DE VEHÍCULOS
-- ============================================================================

-- Habilitar extensión para UUIDs si es necesario
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TIPOS ENUM
CREATE TYPE rol_usuario AS ENUM ('administrador', 'vendedor', 'comprador');
CREATE TYPE estado_orden AS ENUM ('pendiente', 'aprobado', 'recibido', 'cancelado');

-- 2. TABLAS

-- Tabla: usuarios
CREATE TABLE usuarios (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_usuario  VARCHAR(50)     NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255)    NOT NULL,
    nombre_completo VARCHAR(100)    NOT NULL,
    rol             rol_usuario     NOT NULL,
    intentos_fallidos INTEGER       NOT NULL DEFAULT 0,
    bloqueado_en    TIMESTAMPTZ     NULL,
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tabla: tokens_refresco
CREATE TABLE tokens_refresco (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario      UUID            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255)    NOT NULL,
    expira_en       TIMESTAMPTZ     NOT NULL,
    revocado        BOOLEAN         NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tabla: marcas_vehiculo
CREATE TABLE marcas_vehiculo (
    id              SERIAL          PRIMARY KEY,
    nombre_marca    VARCHAR(50)     NOT NULL UNIQUE,
    eliminado_en    TIMESTAMPTZ     NULL,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tabla: repuestos
CREATE TABLE repuestos (
    id                 SERIAL          PRIMARY KEY,
    sku                VARCHAR(50)     NOT NULL UNIQUE,
    nombre_repuesto    VARCHAR(100)    NOT NULL,
    id_marca_vehiculo  INTEGER         NOT NULL REFERENCES marcas_vehiculo(id),
    cantidad_stock     INTEGER         NOT NULL DEFAULT 0 CHECK (cantidad_stock >= 0),
    stock_minimo       INTEGER         NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
    precio_venta       NUMERIC(10,2)   NOT NULL CHECK (precio_venta > 0),
    precio_costo       NUMERIC(10,2)   NOT NULL DEFAULT 0.00 CHECK (precio_costo >= 0),
    color              VARCHAR(30)     NULL,
    descripcion        TEXT            NULL,
    imagen_url         VARCHAR(255)    NULL,
    eliminado_en       TIMESTAMPTZ     NULL,
    creado_por         UUID            NULL REFERENCES usuarios(id),
    creado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tabla: clientes
CREATE TABLE clientes (
    id              SERIAL          PRIMARY KEY,
    nombres         VARCHAR(100)    NOT NULL,
    apellidos       VARCHAR(100)    NOT NULL,
    cedula          VARCHAR(30)     NULL UNIQUE,
    email           VARCHAR(100)    NULL,
    telefono        VARCHAR(30)     NULL,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tabla: ventas
CREATE TABLE ventas (
    id              SERIAL          PRIMARY KEY,
    numero_venta    VARCHAR(30)     NOT NULL UNIQUE,
    id_cliente      INTEGER         NOT NULL REFERENCES clientes(id),
    subtotal        NUMERIC(10,2)   NOT NULL CHECK (subtotal >= 0),
    porcentaje_iva  NUMERIC(5,2)    NOT NULL DEFAULT 15.00 CHECK (porcentaje_iva >= 0),
    monto_iva       NUMERIC(10,2)   NOT NULL CHECK (monto_iva >= 0),
    total           NUMERIC(10,2)   NOT NULL CHECK (total >= 0),
    creado_por      UUID            NOT NULL REFERENCES usuarios(id),
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tabla: detalle_ventas
CREATE TABLE detalle_ventas (
    id              SERIAL          PRIMARY KEY,
    id_venta        INTEGER         NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    id_repuesto     INTEGER         NOT NULL REFERENCES repuestos(id),
    cantidad        INTEGER         NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2)   NOT NULL CHECK (precio_unitario > 0),
    subtotal_linea  NUMERIC(10,2)   GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- Tabla: proveedores
CREATE TABLE proveedores (
    id              SERIAL          PRIMARY KEY,
    nombre_empresa  VARCHAR(100)    NOT NULL,
    ruc             VARCHAR(50)     NULL UNIQUE,
    email           VARCHAR(100)    NULL,
    telefono        VARCHAR(30)     NULL,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tabla: ordenes_compra
CREATE TABLE ordenes_compra (
    id              SERIAL          PRIMARY KEY,
    numero_orden    VARCHAR(30)     NOT NULL UNIQUE,
    id_proveedor    INTEGER         NOT NULL REFERENCES proveedores(id),
    estado          estado_orden    NOT NULL DEFAULT 'pendiente',
    aprobado_por    UUID            NULL REFERENCES usuarios(id),
    creado_por      UUID            NOT NULL REFERENCES usuarios(id),
    fecha_recibida  DATE            NULL,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tabla: detalle_ordenes_compra
CREATE TABLE detalle_ordenes_compra (
    id              SERIAL          PRIMARY KEY,
    id_orden        INTEGER         NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    id_repuesto     INTEGER         NOT NULL REFERENCES repuestos(id),
    cantidad        INTEGER         NOT NULL CHECK (cantidad > 0),
    precio_costo    NUMERIC(10,2)   NOT NULL CHECK (precio_costo >= 0),
    subtotal_linea  NUMERIC(10,2)   GENERATED ALWAYS AS (cantidad * precio_costo) STORED
);

-- Tabla: auditoria
CREATE TABLE auditoria (
    id              BIGSERIAL       PRIMARY KEY,
    tabla_afectada  VARCHAR(100)    NOT NULL,
    operacion       VARCHAR(20)     NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    id_registro     VARCHAR(100)    NOT NULL,
    datos_anteriores JSONB          NULL,
    datos_nuevos    JSONB           NULL,
    id_usuario      UUID            NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    ip_origen       VARCHAR(45)     NULL,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tabla: contadores
CREATE TABLE contadores (
    tipo            VARCHAR(20)     NOT NULL, -- 'venta', 'orden_compra'
    anio            SMALLINT        NOT NULL,
    ultimo_valor    INTEGER         NOT NULL DEFAULT 0,
    PRIMARY KEY (tipo, anio)
);

-- Tabla: historial_precios_costo
CREATE TABLE historial_precios_costo (
    id              SERIAL          PRIMARY KEY,
    id_repuesto     INTEGER         NOT NULL REFERENCES repuestos(id),
    id_orden        INTEGER         NOT NULL REFERENCES ordenes_compra(id),
    precio_costo    NUMERIC(10,2)   NOT NULL CHECK (precio_costo > 0),
    cantidad        INTEGER         NOT NULL CHECK (cantidad > 0),
    registrado_en   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- 3. ÍNDICES ESTRATÉGICOS
-- ============================================================================

-- Búsqueda de texto completo GIN
CREATE INDEX idx_repuestos_nombre ON repuestos USING gin (to_tsvector('spanish', nombre_repuesto));
CREATE INDEX idx_clientes_nombres ON clientes USING gin (to_tsvector('spanish', nombres || ' ' || apellidos));

-- Índices parciales y B-tree de rendimiento
CREATE INDEX idx_repuestos_activos ON repuestos (id) WHERE eliminado_en IS NULL;
CREATE INDEX idx_usuarios_bloqueado ON usuarios (id) WHERE bloqueado_en IS NOT NULL;
CREATE INDEX idx_ventas_fecha ON ventas (creado_en);
CREATE INDEX idx_ordenes_estado ON ordenes_compra (estado);
CREATE INDEX idx_hist_precio_repuesto ON historial_precios_costo (id_repuesto);
CREATE INDEX idx_hist_precio_orden ON historial_precios_costo (id_orden);
CREATE INDEX idx_hist_precio_fecha ON historial_precios_costo (registrado_en);


-- ============================================================================
-- 4. FUNCIONES Y TRIGGERS
-- ============================================================================

-- A. Función genérica para actualizar timestamp
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$;

-- Bincular trigger de timestamp
CREATE TRIGGER trg_usuarios_ts BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
CREATE TRIGGER trg_repuestos_ts BEFORE UPDATE ON repuestos FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
CREATE TRIGGER trg_clientes_ts BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
CREATE TRIGGER trg_proveedores_ts BEFORE UPDATE ON proveedores FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
CREATE TRIGGER trg_ordenes_ts BEFORE UPDATE ON ordenes_compra FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- Modificación con lógica real:
CREATE OR REPLACE FUNCTION fn_siguiente_numero(p_tipo VARCHAR, p_anio SMALLINT)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    v_siguiente INTEGER;
BEGIN
    INSERT INTO contadores (tipo, anio, ultimo_valor)
    VALUES (p_tipo, p_anio, 1)
    ON CONFLICT (tipo, anio)
    DO UPDATE SET ultimo_valor = contadores.ultimo_valor + 1
    RETURNING ultimo_valor INTO v_siguiente;
    RETURN v_siguiente;
END;
$$;

-- Trigger para número de venta
CREATE OR REPLACE FUNCTION fn_numero_venta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_anio  SMALLINT := EXTRACT(YEAR FROM NOW())::SMALLINT;
    v_seq   INTEGER;
BEGIN
    v_seq := fn_siguiente_numero('venta', v_anio);
    NEW.numero_venta := 'VTA-' || v_anio::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_numero_venta BEFORE INSERT ON ventas FOR EACH ROW EXECUTE FUNCTION fn_numero_venta();

-- Trigger para número de orden de compra
CREATE OR REPLACE FUNCTION fn_numero_orden()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_anio  SMALLINT := EXTRACT(YEAR FROM NOW())::SMALLINT;
    v_seq   INTEGER;
BEGIN
    v_seq := fn_siguiente_numero('orden_compra', v_anio);
    NEW.numero_orden := 'OC-' || v_anio::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_numero_orden BEFORE INSERT ON ordenes_compra FOR EACH ROW EXECUTE FUNCTION fn_numero_orden();

-- C. Trigger al recibir orden de compra (Actualiza Stock y Costo + Historial)
CREATE OR REPLACE FUNCTION fn_actualizar_stock_al_recibir()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.estado = 'recibido' AND OLD.estado <> 'recibido' THEN
        -- 1. Actualizar stock y precio_costo del repuesto
        UPDATE repuestos r
        SET    cantidad_stock = cantidad_stock + doc.cantidad,
               precio_costo   = doc.precio_costo,
               actualizado_en = NOW()
        FROM   detalle_ordenes_compra doc
        WHERE  doc.id_orden   = NEW.id
          AND  doc.id_repuesto = r.id;

        -- 2. Insertar en historial de precios
        INSERT INTO historial_precios_costo (id_repuesto, id_orden, precio_costo, cantidad)
        SELECT doc.id_repuesto, NEW.id, doc.precio_costo, doc.cantidad
        FROM   detalle_ordenes_compra doc
        WHERE  doc.id_orden = NEW.id;

        NEW.fecha_recibida := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_recibido BEFORE UPDATE ON ordenes_compra FOR EACH ROW EXECUTE FUNCTION fn_actualizar_stock_al_recibir();


-- ============================================================================
-- 5. VISTAS SQL PARA REPORTES
-- ============================================================================

-- Vista: Ventas por mes
CREATE OR REPLACE VIEW vista_ventas_por_mes AS
SELECT to_char(creado_en, 'YYYY-MM') AS mes,
       count(id) AS total_ventas,
       coalesce(sum(total), 0) AS ingresos_totales,
       coalesce(avg(total), 0) AS ticket_promedio
FROM   ventas
GROUP BY to_char(creado_en, 'YYYY-MM')
ORDER BY mes DESC;

-- Vista: Stock bajo mínimo
CREATE OR REPLACE VIEW vista_stock_bajo AS
SELECT r.*, m.nombre_marca
FROM   repuestos r
JOIN   marcas_vehiculo m ON r.id_marca_vehiculo = m.id
WHERE  r.cantidad_stock <= r.stock_minimo 
  AND  r.eliminado_en IS NULL;

-- Vista: Top repuestos más vendidos
CREATE OR REPLACE VIEW vista_top_repuestos AS
SELECT r.id, r.sku, r.nombre_repuesto,
       sum(dv.cantidad) AS unidades_vendidas,
       sum(dv.subtotal_linea) AS ingresos_totales
FROM   detalle_ventas dv
JOIN   repuestos r ON dv.id_repuesto = r.id
JOIN   ventas v ON dv.id_venta = v.id
GROUP BY r.id, r.sku, r.nombre_repuesto
ORDER BY unidades_vendidas DESC;

-- Vista: Mejores clientes
CREATE OR REPLACE VIEW vista_mejores_clientes AS
SELECT c.id, c.nombres, c.apellidos,
       sum(v.total) AS monto_total,
       count(v.id) AS total_compras
FROM   ventas v
JOIN   clientes c ON v.id_cliente = c.id
GROUP BY c.id, c.nombres, c.apellidos
ORDER BY monto_total DESC;


-- ============================================================================
-- 6. SEMILLAS (SEED DATA)
-- ============================================================================

-- Precargar Marcas de Vehículo (20 marcas)
INSERT INTO marcas_vehiculo (nombre_marca) VALUES
('Toyota'), ('Nissan'), ('Hyundai'), ('Honda'), ('Kia'),
('Ford'), ('Chevrolet'), ('Mazda'), ('Mitsubishi'), ('Suzuki'),
('Volkswagen'), ('BMW'), ('Mercedes-Benz'), ('Audi'), ('Jeep'),
('Subaru'), ('Volvo'), ('Peugeot'), ('Renault'), ('Fiat');
