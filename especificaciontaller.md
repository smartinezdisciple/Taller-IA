# ESPECIFICACIÓN TÉCNICA — SISTEMA WEB DE TALLER DE VEHÍCULOS
> **Fuente Única de Verdad** | Versión 2.0 | Junio 2026  
> Metodología: Specification-Driven Development (SDD) + Domain-Driven Design (DDD)  
> Stack: React 18 + TypeScript + Vite | Node.js 20 + Express | PostgreSQL 16 | Docker Flask IA  
> **Cambios v2.0:** Ambigüedades e inconsistencias resueltas. Sistema de contadores anuales. Historial de precios de costo. Guía de estilo definitiva. Tabla cache_ia eliminada.

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Requisitos](#2-requisitos)
3. [Ambigüedades — RESUELTAS](#3-ambigüedades--resueltas)
4. [Inconsistencias — RESUELTAS](#4-inconsistencias--resueltas)
5. [Funcionalidades](#5-funcionalidades)
6. [Dominio](#6-dominio)
7. [Arquitectura](#7-arquitectura)
8. [Contratos de API](#8-contratos-de-api)
9. [Modelo de Datos](#9-modelo-de-datos)
10. [Guía de Estilo UI/UX](#10-guía-de-estilo-uiux)
11. [Seguridad](#11-seguridad)
12. [Observabilidad](#12-observabilidad)
13. [Estrategia de Testing](#13-estrategia-de-testing)
14. [Riesgos Técnicos](#14-riesgos-técnicos)
15. [Checklist de Implementación](#15-checklist-de-implementación)

---

## 1. RESUMEN EJECUTIVO

### Propósito del Sistema

Sistema web para la gestión integral de un taller de repuestos de vehículos. Cubre cuatro dominios operativos: **Inventario**, **Ventas**, **Compras** y **Reportes**, con autenticación basada en JWT y análisis de imágenes mediante IA dockerizada.

### Decisiones Arquitectónicas Firmadas

| Decisión | Elección | Justificación |
|---|---|---|
| Patrón backend | Monolítico modular (1 proceso) | Equipo pequeño (2-3 personas), sin overhead de microservicios |
| Patrón frontend | React modular (1 proyecto Vite) | Setup simple, 2 comandos `npm run dev` |
| Base de datos | PostgreSQL 16 compartida | ACID nativo, triggers automáticos, índices GIN |
| Autenticación | JWT access (15m) + refresh cookie HttpOnly (7d) | Resistente a XSS, conforme OWASP |
| Integración IA | Llamada directa browser → Docker :6000 | Sin acoplamiento, baja latencia, sin persistencia de caché |
| Eliminación | Soft delete (`eliminado_en TIMESTAMPTZ`) | Preserva histórico de ventas, mantiene integridad referencial |
| IVA | 15% fijo configurable por variable de entorno | Valor legal Nicaragua |
| Numeración anual | Tabla `contadores` con reset por año | Números `VTA-2026-00001`, `VTA-2027-00001` correctos |
| Historial precios | Tabla `historial_precios_costo` | Trazabilidad de costos por recepción de orden |

### Puertos del Sistema

| Servicio | Puerto | Uso |
|---|---|---|
| Frontend React | 5173 | Punto de entrada usuario |
| Backend Node.js | 3001 | API REST única |
| PostgreSQL | 5432 | Base de datos |
| IA Flask Docker | 6000 | Análisis de fotos (marca, color) — sin persistencia en BD |

### Contexto de Migración

Las interfaces HTML/CSS ya existen con errores visuales menores. La tarea es **convertirlas** a componentes React + TypeScript siguiendo la Guía de Estilo definitiva de la sección 10. Los errores visuales menores se corrigen durante la migración usando esa guía como referencia de verdad.

---

## 2. REQUISITOS

### 2.1 Requisitos Funcionales

#### RF-001: Autenticación y Control de Acceso
- Autenticar usuarios con `nombre_usuario` + `contraseña`.
- Emitir `accessToken` (JWT, 15 min, en memoria JS) y `refreshToken` (JWT, 7 días, cookie HttpOnly).
- Bloquear cuentas tras 3 intentos fallidos consecutivos. Solo el `administrador` puede desbloquear.
- Soportar 3 roles: `administrador`, `vendedor`, `comprador`.
- Permitir cambio de contraseña propio.
- El `refreshToken` debe poder revocarse individualmente.

#### RF-002: Gestión de Inventario
- CRUD completo de repuestos: SKU, nombre, marca, año desde/hasta, stock, stock mínimo, precio venta, precio costo, color, descripción, imagen URL.
- El `color` se actualiza **manualmente** desde el CRUD de inventario. El color detectado por la IA se usa únicamente para filtrar, no para actualizar el registro.
- Búsqueda de texto completo en nombre de repuesto (español, índice GIN).
- Filtrado por marca de vehículo.
- Paginación server-side (límite configurable, default 20).
- Soft delete: `eliminado_en TIMESTAMPTZ`.
- Alerta visual cuando `cantidad_stock <= stock_minimo`.
- Acceso: `administrador` (CRUD completo), `vendedor` (solo lectura/visualización), `comprador` (solo lectura/visualización).

#### RF-003: Gestión de Ventas
- Seleccionar o registrar cliente antes de crear venta.
- Opcionalmente capturar/adjuntar foto → llamada directa a IA → obtener `{ marca, color }` → filtrar repuestos automáticamente en memoria (sin persistir).
- El stock disponible se muestra junto a cada repuesto en la lista para guía visual.
- Carrito: agregar, aumentar cantidad, disminuir cantidad, eliminar ítem.
- Cálculo en tiempo real: subtotal, IVA (15%), total.
- La validación real de stock ocurre en el backend al confirmar (no al agregar al carrito).
- Confirmación genera transacción ACID: INSERT venta + INSERT detalle_ventas + UPDATE stock.
- Rollback completo si cualquier repuesto tiene stock insuficiente en el momento del commit.
- Número de venta autogenerado: formato `VTA-YYYY-NNNNN`, reiniciando en 00001 cada año.
- Acceso: `administrador`, `vendedor`.

#### RF-004: Gestión de Compras
- CRUD de proveedores.
- Crear órdenes de compra con estado inicial `pendiente`.
- Flujo de estados: `pendiente` → `aprobado` → `recibido` (o `cancelado` desde `pendiente`/`aprobado`).
- Al cambiar a `recibido`: trigger actualiza `cantidad_stock` en `repuestos`, registra nueva entrada en `historial_precios_costo` y registra `fecha_recibida`.
- Solo el `administrador` puede aprobar órdenes (`pendiente` → `aprobado`).
- Número de orden autogenerado: formato `OC-YYYY-NNNNN`, reiniciando cada año.
- Acceso crear órdenes: `administrador`, `comprador`. Aprobar: solo `administrador`.

#### RF-005: Reportes y Dashboard
- Vista de ventas por mes con filtro de rango de fechas (`desde`, `hasta`, default últimos 12 meses).
- Vista de stock bajo.
- Vista de top repuestos (por unidades vendidas e ingresos).
- Vista de mejores clientes (por monto total).
- Solo lectura. Acceso exclusivo: `administrador`.

#### RF-006: Integración IA
- El frontend llama directamente a `http://localhost:6000/analizar` sin pasar por backend.
- Envía imagen como `multipart/form-data` con clave `imagen` (JPEG/PNG/WEBP, máx. 5MB).
- Recibe `{ marca: string, color: string }`.
- El resultado filtra la lista de repuestos **temporalmente en memoria** (carritoStore o estado local).
- **No hay persistencia del resultado en la base de datos del sistema.**
- Si la IA no responde en 10 segundos o falla: el módulo de ventas continúa funcionando sin filtro automático. La IA es auxiliar y no bloqueante.

#### RF-007: Auditoría
- Registrar INSERT, UPDATE, DELETE en tablas críticas (`usuarios`, `repuestos`, `ventas`, `ordenes_compra`) en tabla `auditoria`.
- Campos: tabla afectada, operación, ID registro, datos anteriores (JSONB), datos nuevos (JSONB), ID usuario, IP origen, timestamp.
- `contrasena_hash` **nunca** se incluye en los campos JSONB de auditoría.

### 2.2 Matriz de Permisos por Rol — DEFINITIVA

| Acción | administrador | vendedor | comprador |
|---|:---:|:---:|:---:|
| Login / Logout / Cambiar propia contraseña | ✅ | ✅ | ✅ |
| Ver su propio perfil | ✅ | ✅ | ✅ |
| CRUD Usuarios (gestionar otros) | ✅ | ❌ | ❌ |
| Desbloquear cuentas | ✅ | ❌ | ❌ |
| CRUD completo Inventario (crear/editar/eliminar) | ✅ | ❌ | ❌ |
| Ver Inventario (solo lectura) | ✅ | ✅ | ✅ |
| Registrar Ventas | ✅ | ✅ | ❌ |
| Ver Ventas | ✅ | ✅ | ❌ |
| Crear Órdenes de Compra | ✅ | ❌ | ✅ |
| Aprobar Órdenes de Compra | ✅ | ❌ | ❌ |
| Recibir / Cancelar Órdenes | ✅ | ❌ | ❌ |
| Ver Órdenes de Compra | ✅ | ❌ | ✅ |
| CRUD Proveedores | ✅ | ❌ | ❌ |
| Ver Reportes y Dashboard | ✅ | ❌ | ❌ |

> Esta tabla es la fuente de verdad para el middleware `autorizar.ts`. No implementar permisos que no estén aquí.

### 2.3 Requisitos No Funcionales

#### RNF-001: Rendimiento
- Listados paginados: < 500ms.
- Búsqueda de texto completo (GIN): < 300ms.
- Análisis IA: timeout 10s, reintentos 3 con backoff (1s, 2s, 3s).

#### RNF-002: Disponibilidad
- La IA es auxiliar. Su indisponibilidad no bloquea ventas ni ninguna otra operación.

#### RNF-003: Seguridad
- Contraseñas: bcrypt cost factor 12.
- Todos los endpoints protegidos con JWT salvo `POST /api/auth/login`.
- Validación de inputs siempre en backend.
- CORS restringido a `CORS_ORIGEN` del `.env`.
- Secrets nunca en código fuente ni repositorio.

#### RNF-004: Mantenibilidad
- Cobertura: backend ≥ 85%, frontend ≥ 75%.
- TypeScript estricto en ambos proyectos.
- Estructura modular por dominio de negocio (mismo patrón en cliente y servidor).

#### RNF-005: Escalabilidad Moderada
- Diseñado para 2-3 personas. Módulos extraíbles a microservicios sin reescribir lógica de dominio.

#### RNF-006: Compatibilidad UI
- Sidebar fijo 260px en PC (≥ lg), overlay hamburguesa en móvil.
- Todas las listas usan `TablaUniversal` (consistencia visual garantizada).
- Fuentes: Rajdhani (títulos) + IBM Plex Sans (cuerpo/datos) vía Google Fonts.
- Paleta de colores definida con CSS variables (ver sección 10).

### 2.4 Restricciones Técnicas

- Node.js ≥ 20, PostgreSQL ≥ 16.
- Docker + Docker Compose para IA y opcionalmente PostgreSQL.
- TypeScript modo estricto en ambos proyectos.
- TailwindCSS (clases utilitarias base solamente).
- Zustand para estado global en frontend.
- Pool `pg` sin ORM — queries SQL explícitas.
- Variables de entorno validadas al arrancar el servidor (fail-fast).

---

## 3. AMBIGÜEDADES — RESUELTAS

### AMB-001: Roles y Permisos ✅ RESUELTO

**Resolución:** Matriz definitiva en sección 2.2.

Puntos clave confirmados:
- `vendedor`: puede **ver** inventario y **registrar ventas**. No puede editar inventario, gestionar compras ni ver reportes.
- `comprador`: puede **ver** inventario y **crear órdenes de compra**. No puede registrar ventas.
- `administrador`: acceso completo. Único que puede aprobar órdenes, ver reportes, gestionar usuarios.
- Reportes: solo `administrador`.

---

### AMB-002: Caché IA vs Llamada Directa ✅ RESUELTO

**Resolución:** La tabla `cache_ia` se elimina del esquema. El servicio Flask IA es llamado directamente desde el browser y no persiste ningún resultado en la base de datos del sistema. Si el servicio Flask necesita caché propio, lo gestiona internamente (fuera del alcance de este sistema).

---

### AMB-003: Validación de Stock en Carrito ✅ RESUELTO

**Resolución:** Opción C. El stock disponible se muestra visualmente junto a cada repuesto en la lista de selección. La validación real ocurre exclusivamente en el backend al confirmar la venta. No se hacen llamadas API por cada ítem agregado al carrito.

---

### AMB-004: Errores Visuales HTML/CSS ✅ RESUELTO

**Resolución:** Los errores son menores y se corrigen durante la migración usando la Guía de Estilo definitiva (sección 10) como referencia de verdad. No se requiere documentación previa de cada error.

---

### AMB-005: Paginación de Reportes ✅ RESUELTO

**Resolución:** Los endpoints de reportes aceptan parámetros `desde` y `hasta` (fechas ISO 8601). Si no se proveen, el default es los últimos 12 meses. Esto aplica a todos los endpoints de `/api/reportes/*`.

---

### AMB-006: Sincronización de Color con IA ✅ RESUELTO

**Resolución:** El campo `color` en `repuestos` se actualiza **manualmente** desde el CRUD de inventario (solo por `administrador`). El color detectado por la IA se usa únicamente para filtrar la lista de repuestos en el carrito de ventas, de forma temporal en memoria, sin modificar ningún registro.

---

## 4. INCONSISTENCIAS — RESUELTAS

### INC-001: Cache IA vs Arquitectura ✅ RESUELTO

**Resolución:** Tabla `cache_ia` eliminada del esquema. Ver AMB-002.

---

### INC-002: Estilos Dark Header + Light Rows ✅ RESUELTO — DISEÑO INTENCIONAL

**Resolución:** El contraste oscuro en encabezados (`bg-[#161B27]` + `text-gray-300`) con filas blancas/gris claro (`#FFFFFF` / `#F8FAFC`) y texto oscuro (`text-[#1E293B]`) es el diseño **oficial e intencional** del sistema. Ver Guía de Estilo completa en sección 10.

---

### INC-003: Numeración Sin Reinicio Anual ✅ RESUELTO

**Resolución:** Se elimina el uso de secuencias PostgreSQL (`seq_ventas`, `seq_ordenes_compra`). Se reemplaza con una tabla `contadores` que gestiona el último valor por año y tipo, garantizando numeración `VTA-2026-00001`, `VTA-2026-00002`, ..., `VTA-2027-00001`.

**Esquema de la tabla:**

```sql
CREATE TABLE contadores (
    tipo        VARCHAR(20)  NOT NULL,  -- 'venta' | 'orden_compra'
    anio        SMALLINT     NOT NULL,
    ultimo_valor INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (tipo, anio)
);

-- Función de generación (reemplaza triggers de secuencia):
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

-- Trigger para ventas (reemplaza fn_numero_venta):
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

-- Trigger para órdenes (reemplaza fn_numero_orden):
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
```

**Impacto:** Las secuencias `seq_ventas` y `seq_ordenes_compra` del script original no se crean. Sus triggers se reemplazan con los definidos arriba.

---

### INC-004: Sin Historial de Precios de Costo ✅ RESUELTO

**Resolución:** Se agrega la tabla `historial_precios_costo`. El trigger `fn_actualizar_stock_al_recibir` además de actualizar `repuestos.precio_costo`, inserta una fila en esta tabla con el precio recibido.

**Esquema de la tabla:**

```sql
CREATE TABLE historial_precios_costo (
    id              SERIAL          PRIMARY KEY,
    id_repuesto     INTEGER         NOT NULL REFERENCES repuestos(id),
    id_orden        INTEGER         NOT NULL REFERENCES ordenes_compra(id),
    precio_costo    NUMERIC(10,2)   NOT NULL CHECK (precio_costo > 0),
    cantidad        INTEGER         NOT NULL CHECK (cantidad > 0),
    registrado_en   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hist_precio_repuesto ON historial_precios_costo(id_repuesto);
CREATE INDEX idx_hist_precio_orden    ON historial_precios_costo(id_orden);
CREATE INDEX idx_hist_precio_fecha    ON historial_precios_costo(registrado_en);

COMMENT ON TABLE historial_precios_costo IS
    'Registro histórico de precios de costo por recepción de orden. '
    'Se inserta automáticamente cuando una orden cambia a estado recibido.';
```

**Trigger actualizado:**

```sql
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
```

**Endpoint disponible:**

```
GET /api/repuestos/:id/historial-precios
Response 200: [{ id_orden, precio_costo, cantidad, registrado_en, numero_orden }]
```

---

## 5. FUNCIONALIDADES

### F-001: Login de Usuario

**Objetivo:** Autenticar y emitir tokens.

**Entradas:** `{ nombre_usuario: string, contrasena: string }`

**Salidas (éxito 200):**
- Header: `Set-Cookie: refreshToken=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
- Body: `{ accessToken: string, usuario: { id, nombre_completo, rol } }`

**Reglas de Negocio:**
- RN-001: Verificar con `bcrypt.compare`. Nunca revelar cuál campo falla.
- RN-002: Si `bloqueado_en IS NOT NULL` → 423, sin verificar contraseña.
- RN-003: Fallo de contraseña: incrementar `intentos_fallidos`. Al llegar a 3: `bloqueado_en = NOW()`.
- RN-004: Login exitoso: `intentos_fallidos = 0`, `bloqueado_en = NULL`.
- RN-005: accessToken expira 15 min, refreshToken 7 días.
- RN-006: Guardar hash del refreshToken en `tokens_refresco`.

**Casos Fallidos:**
- CF-001: Usuario no existe → 401 `"Credenciales inválidas"`.
- CF-002: Contraseña incorrecta → 401 `"Credenciales inválidas"`.
- CF-003: Cuenta bloqueada → 423 `"Cuenta bloqueada. Contacte al administrador."`.
- CF-004: Cuenta inactiva → 403 `"Cuenta desactivada."`.
- CF-005: Campos vacíos → 400.

**Criterios de Aceptación:**
- [ ] accessToken nunca se almacena en localStorage ni sessionStorage.
- [ ] Cookie tiene flags HttpOnly, Secure, SameSite=Strict.
- [ ] refreshToken se persiste como hash (bcrypt o SHA-256), nunca en texto plano.
- [ ] Tres intentos fallidos consecutivos bloquean y el cuarto responde 423.

---

### F-002: Renovación de AccessToken

**Entradas:** Cookie `refreshToken`.

**Salidas (200):** `{ accessToken: string }`

**Reglas:**
- RN-007: Verificar `revocado = false` en `tokens_refresco`.
- RN-008: Verificar `expira_en > NOW()`.
- RN-009: Verificar firma JWT.

**Criterios de Aceptación:**
- [ ] Token revocado es rechazado aunque no haya expirado cronológicamente.

---

### F-003: Logout

**Entradas:** Cookie `refreshToken`.

**Salidas:** `204 No Content`, cookie con `Max-Age=0`.

**Reglas:** RN-010: `revocado = true` en `tokens_refresco`. Cookie eliminada.

---

### F-004: CRUD de Repuestos

**Roles autorizados:** CRUD completo → `administrador`. Lectura → `administrador`, `vendedor`, `comprador`.

**Entradas (listado):**
- `pagina` (default 1), `limite` (default 20, max 100), `buscar` (texto GIN), `marca` (ID), `soloActivos` (default true).

**Reglas de Negocio:**
- RN-011: SKU único entre registros activos (no eliminados). Inmutable una vez creado.
- RN-012: `anio_hasta >= anio_desde` si ambos presentes.
- RN-013: Delete es soft: `eliminado_en = NOW()`.
- RN-014: `creado_por` tomado del JWT.
- RN-015: El campo `color` solo se actualiza manualmente (CRUD), nunca por la IA.

**Casos Fallidos:**
- CF-001: SKU duplicado → 409.
- CF-002: Marca no existe → 422.
- CF-003: `precio_venta <= 0` → 400.
- CF-004: `anio_hasta < anio_desde` → 400.
- CF-005: `vendedor` intenta crear/editar/eliminar → 403.

**Criterios de Aceptación:**
- [ ] Búsqueda usa índice GIN, no LIKE con wildcard.
- [ ] Soft delete no afecta ventas históricas.
- [ ] Endpoint de alertas-stock usa vista `vista_stock_bajo`.

---

### F-005: Registro de Venta (Transacción ACID)

**Roles autorizados:** `administrador`, `vendedor`.

**Entradas:**
```json
{
  "id_cliente": 1,
  "items": [
    { "id_repuesto": 5, "cantidad": 2 },
    { "id_repuesto": 12, "cantidad": 1 }
  ]
}
```

**Salidas (201):**
```json
{
  "id": 1,
  "numero_venta": "VTA-2026-00001",
  "subtotal": 150.00,
  "monto_iva": 22.50,
  "total": 172.50
}
```

**Reglas de Negocio:**
- RN-016: Cliente debe existir y estar activo.
- RN-017: Cada repuesto debe existir (`eliminado_en IS NULL`).
- RN-018: Validar stock de TODOS los ítems antes de descontar ninguno.
- RN-019: Precio tomado de `repuestos.precio_venta` en el momento de la venta (no del request).
- RN-020: `monto_iva = subtotal × (PORCENTAJE_IVA / 100)`, donde `PORCENTAJE_IVA` viene de `.env`.
- RN-021: `total = subtotal + monto_iva`. `porcentaje_iva` se persiste en la fila `ventas`.
- RN-022: Fallo en cualquier ítem → ROLLBACK completo (ningún stock se descuenta).
- RN-023: UPDATE de stock: `WHERE id = $1 AND cantidad_stock >= $2` como salvaguarda de concurrencia. 0 rows afectadas → error → ROLLBACK.
- RN-024: `numero_venta` generado por trigger (tabla `contadores`).

**Casos Fallidos:**
- CF-001: Cliente no existe/inactivo → 404.
- CF-002: Repuesto eliminado → 422.
- CF-003: Stock insuficiente → 409 con detalle del repuesto.
- CF-004: Items vacíos → 400.
- CF-005: `comprador` intenta registrar → 403.

**Criterios de Aceptación:**
- [ ] Fallo en ítem N hace ROLLBACK de todos los ítems anteriores de la misma venta.
- [ ] El precio en `detalle_ventas.precio_unitario` es el precio al momento, no el precio actual.
- [ ] `porcentaje_iva` se guarda en la fila `ventas` (no solo calculado).

---

### F-006: Análisis de Imagen con IA

**Roles autorizados:** `administrador`, `vendedor` (desde módulo ventas).

**Flujo:**
1. Usuario adjunta imagen (JPEG/PNG/WEBP, máx 5MB). Frontend valida tipo y tamaño antes de enviar.
2. Frontend llama `POST http://localhost:6000/analizar` con `multipart/form-data { imagen: File }`.
3. Recibe `{ marca: string, color: string }`.
4. `carritoStore` o estado local aplica filtro por marca y color en la lista de repuestos (en memoria).
5. El usuario ve los repuestos filtrados automáticamente y puede agregar al carrito.

**Reglas:**
- RN-025: Si IA no responde en 10s o falla: mostrar mensaje no bloqueante, continuar sin filtro.
- RN-026: Reintentar hasta 3 veces con backoff (1s, 2s, 3s) antes de mostrar error final.
- RN-027: El resultado NO se persiste en la BD del sistema.
- RN-028: Validar en frontend: solo JPEG, PNG, WEBP. Máximo 5MB. Rechazar otros formatos/tamaños.

**Criterios de Aceptación:**
- [ ] Si la IA falla, el módulo de ventas sigue funcionando sin filtro automático.
- [ ] El usuario puede ver la marca y color detectados antes de aplicar el filtro.
- [ ] El tipo de archivo se valida en frontend antes del envío (no llega al servicio Flask con formato inválido).

---

### F-007: Gestión de Órdenes de Compra

**Roles:** Crear → `administrador`, `comprador`. Aprobar → solo `administrador`. Recibir/Cancelar → solo `administrador`.

**Flujo de Estados:**
```
pendiente ──→ aprobado ──→ recibido
    │               │
    └───────────────┴──→ cancelado
```

**Reglas:**
- RN-029: Solo `administrador` puede mover de `pendiente` → `aprobado` (registra `aprobado_por`).
- RN-030: Solo desde `pendiente` o `aprobado` se puede cancelar.
- RN-031: Al `recibido`: trigger actualiza `cantidad_stock`, `precio_costo` en `repuestos` e inserta en `historial_precios_costo`.
- RN-032: `fecha_recibida` se registra automáticamente por trigger.
- RN-033: No se puede modificar una orden en estado `recibido` o `cancelado`.
- RN-034: `numero_orden` generado por trigger (tabla `contadores`).

**Criterios de Aceptación:**
- [ ] `vendedor` intenta aprobar → 403.
- [ ] `comprador` intenta aprobar → 403.
- [ ] Al recibir, el stock de todos los repuestos del detalle aumenta correctamente.
- [ ] `historial_precios_costo` tiene una fila por cada repuesto de la orden recibida.

---

### F-008: Historial de Precios de Costo

**Objetivo:** Consultar el historial de precios de costo de un repuesto a lo largo del tiempo.

**Roles:** `administrador`.

**Entradas:** `id_repuesto` en path, filtros opcionales `desde`, `hasta`.

**Salidas:**
```json
[
  {
    "id_orden": 5,
    "numero_orden": "OC-2026-00003",
    "precio_costo": 45.00,
    "cantidad": 10,
    "registrado_en": "2026-05-15T14:30:00Z"
  }
]
```

---

## 6. DOMINIO

### 6.1 Entidades

#### Usuario
- **Responsabilidad:** Actor del sistema con identidad, credenciales y rol.
- **Atributos clave:** `id` (UUID), `nombre_usuario` (único, inmutable), `rol` (enum), `intentos_fallidos`, `bloqueado_en`, `activo`.
- **Invariante:** `intentos_fallidos >= 0`. `nombre_usuario` no cambia post-creación.

#### Repuesto
- **Responsabilidad:** Pieza del inventario con trazabilidad de compatibilidad vehicular.
- **Atributos clave:** `sku` (único, inmutable), `nombre_repuesto`, `id_marca_vehiculo`, `cantidad_stock`, `stock_minimo`, `precio_venta`, `precio_costo`, `color`.
- **Invariante:** `cantidad_stock >= 0`. `precio_venta > 0`. SKU inmutable.

#### Cliente
- **Responsabilidad:** Identificar al comprador en una transacción.
- **Atributos clave:** `id`, `nombres`, `apellidos`, `cedula` (único, opcional).
- **Restricción:** Nombres y apellidos obligatorios.

#### Venta (Agregado Raíz)
- **Responsabilidad:** Transacción comercial completa e inmutable.
- **Invariante:** `total = subtotal + monto_iva`. `monto_iva = subtotal × (porcentaje_iva/100)`. Inmutable post-creación.

#### DetalleVenta
- **Responsabilidad:** Línea de venta con precio congelado al momento de la transacción.
- **Invariante:** `cantidad > 0`. `precio_unitario` es el precio histórico, no el actual.

#### OrdenCompra (Agregado Raíz)
- **Responsabilidad:** Solicitud de compra a proveedor con ciclo de aprobación.
- **Máquina de estados:** pendiente → aprobado → recibido / cancelado.

#### Proveedor
- **Responsabilidad:** Empresa proveedora de repuestos.
- **Atributos clave:** `nombre_empresa`, `ruc` (único, opcional).

#### MarcaVehiculo
- **Responsabilidad:** Catálogo de marcas vehiculares compartido. 20 marcas precargadas.

#### HistorialPrecioCosto
- **Responsabilidad:** Registro inmutable de cada precio de costo recibido por orden de compra.
- **Invariante:** Solo se inserta (nunca se actualiza ni elimina).

#### Contador
- **Responsabilidad:** Gestionar la numeración secuencial por tipo y año.
- **Invariante:** Operación `INSERT ... ON CONFLICT DO UPDATE` es atómica en PostgreSQL.

### 6.2 Value Objects

- **SKU:** String inmutable. Formato recomendado `MARCA-TIPO-NNN`.
- **NúmeroVenta:** `VTA-YYYY-NNNNN`. Reinicia en 00001 cada año.
- **NúmeroOrden:** `OC-YYYY-NNNNN`. Reinicia en 00001 cada año.
- **MontoMonetario:** Siempre `NUMERIC(10,2)`. Nunca punto flotante.
- **RangoAnio:** `(anio_desde, anio_hasta)` con `hasta >= desde`.

### 6.3 Agregados

- **VentaAgregado:** `Venta` + `[DetalleVenta]`. Raíz: Venta. No existe detalle sin venta.
- **OrdenCompraAgregado:** `OrdenCompra` + `[DetalleOrdenCompra]`. Raíz: OrdenCompra.

### 6.4 Servicios de Dominio

- **ServicioCalculoVenta:** Función pura. Calcula `subtotal`, `monto_iva`, `total` dado array de ítems y porcentaje IVA.
- **ServicioValidacionStock:** Verifica stock suficiente para todos los ítems antes de la transacción.
- **ServicioAutenticacion:** Maneja bcrypt, generación/validación de JWT, gestión de tokens_refresco.
- **ServicioNumeracion:** Llama `fn_siguiente_numero` vía tabla `contadores` (encapsulado en el trigger, pero también disponible para el backend si necesita previsualizar).

### 6.5 Eventos de Dominio (Implementados como Triggers PostgreSQL)

| Evento | Trigger | Efecto |
|---|---|---|
| `OrdenRecibida` | `trg_stock_recibido` | Actualiza stock, precio_costo, inserta en historial_precios_costo |
| `VentaConfirmada` | Lógica en servicio | Descuento de stock en transacción ACID |
| `NuevaVentaInsertada` | `trg_numero_venta` | Genera número vía tabla contadores |
| `NuevaOrdenInsertada` | `trg_numero_orden` | Genera número vía tabla contadores |
| `CuentaBloqueada` | Lógica en servicio auth | Registra `bloqueado_en = NOW()` |

---

## 7. ARQUITECTURA

### 7.1 Estilo: Monolítico Modular

**Justificación:** Equipo de 2-3 personas, escala de taller mediano. Mismas fronteras de dominio que microservicios, sin overhead operacional.

### 7.2 Capas Frontend

```
Páginas (Orquestación)
  └── Componentes (Presentación pura, sin lógica de negocio)
        └── Servicios HTTP (fetch + JWT + interceptor refresh)
              └── Almacenes Zustand (JWT, carrito, usuario)
                    └── Tipos TypeScript (interfaces compartidas)
```

### 7.3 Capas Backend

```
Rutas (Express Router)
  └── Controladores (validar request → delegar → formatear response)
        └── Servicios (lógica de negocio, transacciones SQL)
              └── Config (pool pg, env validado, logger Winston)
```

### 7.4 Dependencias Permitidas y Prohibidas

| Dirección | Estado | Detalle |
|---|---|---|
| Frontend → Backend (REST+JWT) | ✅ | Toda la lógica de negocio |
| Frontend → Docker IA (REST directo) | ✅ | Sin JWT, sin backend |
| Backend → PostgreSQL (pool pg) | ✅ | SQL explícito |
| Backend → Frontend | ❌ | No hay callbacks |
| Frontend → PostgreSQL | ❌ | Nunca directo |
| Módulos de dominio importándose entre sí en backend | ❌ | Cruzar fronteras de dominio debe ser explícito y justificado |
| Secrets en código fuente | ❌ | Siempre en `.env` |

### 7.5 Patrones Aplicables

| Patrón | Dónde | Razón |
|---|---|---|
| Repository-like (SQL puro) | Servicios backend | Sin ORM, queries explícitas y optimizadas |
| Middleware Chain | Express | autenticar → autorizar → handler |
| Store Pattern (Zustand) | Frontend | Estado global reactivo |
| Interceptor HTTP | servicios frontend | Refresh automático en 401 |
| Debounce | Búsqueda en TablaUniversal | Evitar API call por keystroke |
| Circuit Breaker simple | servicioIA.ts | Reintentos con backoff, fallback sin IA |
| Optimistic UI | Carrito | Actualizaciones inmediatas, rollback si falla servidor |

---

## 8. CONTRATOS DE API

### Convenciones Globales

- Base URL: `http://localhost:3001`
- Content-Type: `application/json` (excepto uploads)
- Auth: `Authorization: Bearer <accessToken>` en todos los endpoints salvo login
- Paginación: `?pagina=1&limite=20`
- Fechas: ISO 8601 UTC (`2026-06-04T10:30:00Z`)
- Errores: `{ "mensaje": "Descripción", "codigo"?: "ERROR_CODE" }`
- El campo `contrasena_hash` nunca aparece en ninguna respuesta

### Auth

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Emitir tokens |
| POST | `/api/auth/refresh` | Renovar accessToken |
| POST | `/api/auth/logout` | Revocar refreshToken |
| PUT | `/api/auth/cambiar-contrasena` | Cambiar contraseña propia |
| GET | `/api/auth/usuarios` | Listar usuarios (admin) |
| POST | `/api/auth/usuarios` | Crear usuario (admin) |
| PUT | `/api/auth/usuarios/:id` | Editar usuario (admin) |
| PUT | `/api/auth/usuarios/:id/desbloquear` | Desbloquear cuenta (admin) |

**POST /api/auth/login**
```
Request:  { nombre_usuario: string, contrasena: string }
200: { accessToken: string, usuario: { id, nombre_completo, rol } }
400: { mensaje: "Campos requeridos." }
401: { mensaje: "Credenciales inválidas." }
423: { mensaje: "Cuenta bloqueada. Contacte al administrador." }
```

**PUT /api/auth/cambiar-contrasena**
```
Request: { contrasena_actual: string, contrasena_nueva: string }
Validación nueva: min 8 chars, 1 mayúscula, 1 número, 1 especial
200: { mensaje: "Contraseña actualizada." }
400: { mensaje: "La nueva contraseña no cumple los requisitos." }
401: { mensaje: "Contraseña actual incorrecta." }
```

### Inventario

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/repuestos` | admin, vendedor, comprador | Listar con paginación y búsqueda |
| POST | `/api/repuestos` | admin | Crear repuesto |
| GET | `/api/repuestos/:id` | admin, vendedor, comprador | Obtener repuesto |
| PUT | `/api/repuestos/:id` | admin | Actualizar repuesto |
| DELETE | `/api/repuestos/:id` | admin | Soft delete |
| GET | `/api/repuestos/:id/historial-precios` | admin | Historial de precios de costo |
| GET | `/api/repuestos/alertas-stock` | admin | Repuestos bajo mínimo |
| GET | `/api/marcas` | admin, vendedor, comprador | Catálogo de marcas |

**GET /api/repuestos**
```
Query: pagina?, limite?, buscar?, marca?(id), soloActivos?(default true)
200: { repuestos: Repuesto[], total: number, pagina: number, limite: number }
```

**POST /api/repuestos**
```
Request: { sku, nombre_repuesto, id_marca_vehiculo, precio_venta, 
           cantidad_stock?, stock_minimo?, anio_desde?, anio_hasta?,
           precio_costo?, color?, descripcion?, imagen_url? }
201: Repuesto
409: { mensaje: "SKU ya existe." }
422: { mensaje: string }
403: (si rol != administrador)
```

**GET /api/repuestos/:id/historial-precios**
```
Query: desde?, hasta?
200: [{ id_orden, numero_orden, precio_costo, cantidad, registrado_en }]
```

### Ventas

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| POST | `/api/ventas` | admin, vendedor | Registrar venta (ACID) |
| GET | `/api/ventas` | admin, vendedor | Listar ventas |
| GET | `/api/ventas/:id` | admin, vendedor | Detalle de venta |
| GET | `/api/clientes` | admin, vendedor | Listar clientes |
| POST | `/api/clientes` | admin, vendedor | Crear cliente |
| PUT | `/api/clientes/:id` | admin, vendedor | Actualizar cliente |

**POST /api/ventas**
```
Request: { id_cliente: number, items: [{ id_repuesto: number, cantidad: number }] }
201: { id, numero_venta, subtotal, monto_iva, total }
400: { mensaje: "items requeridos." }
403: (si rol == comprador)
404: { mensaje: "Cliente no existe o está inactivo." }
409: { mensaje: "Stock insuficiente para repuesto X. Disponible: N." }
422: { mensaje: "Repuesto X no existe o fue eliminado." }
```

**GET /api/ventas**
```
Query: pagina?, limite?, desde?, hasta?
200: { ventas: VentaResumen[], total: number }
```

### Compras

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/proveedores` | admin | Listar proveedores |
| POST | `/api/proveedores` | admin | Crear proveedor |
| PUT | `/api/proveedores/:id` | admin | Actualizar proveedor |
| GET | `/api/ordenes` | admin, comprador | Listar órdenes |
| POST | `/api/ordenes` | admin, comprador | Crear orden |
| GET | `/api/ordenes/:id` | admin, comprador | Detalle de orden |
| PUT | `/api/ordenes/:id/estado` | admin | Cambiar estado |

**PUT /api/ordenes/:id/estado**
```
Request: { estado: "aprobado" | "recibido" | "cancelado" }
200: OrdenCompra actualizada
403: { mensaje: "No tiene permisos para esta operación." }
409: { mensaje: "Transición de estado inválida: de X a Y no permitida." }
```

### Reportes

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/reportes/ventas-por-mes` | admin | Ventas mensuales |
| GET | `/api/reportes/stock-bajo` | admin | Repuestos bajo mínimo |
| GET | `/api/reportes/top-repuestos` | admin | Más vendidos |
| GET | `/api/reportes/mejores-clientes` | admin | Clientes por monto |

**Todos los endpoints de reportes:**
```
Query: desde?, hasta? (ISO 8601, default = últimos 12 meses)
403: (si rol != administrador)
```

**GET /api/reportes/ventas-por-mes**
```
200: [{ mes: string, total_ventas: number, ingresos_totales: number, ticket_promedio: number }]
```

---

## 9. MODELO DE DATOS

### Tablas del Sistema (v2.0)

La siguiente tabla lista todas las entidades de la base de datos. Las marcadas con 🆕 son nuevas respecto al esquema original.

| Tabla | Descripción | Cambio |
|---|---|---|
| `usuarios` | Autenticación y roles | Sin cambios |
| `tokens_refresco` | Refresh tokens con revocación | Sin cambios |
| `marcas_vehiculo` | Catálogo de marcas | Sin cambios |
| `repuestos` | Inventario principal | Sin cambios |
| `clientes` | Clientes del taller | Sin cambios |
| `ventas` | Cabecera de ventas | Sin cambios |
| `detalle_ventas` | Líneas de venta | Sin cambios |
| `proveedores` | Directorio de proveedores | Sin cambios |
| `ordenes_compra` | Cabecera de órdenes | Sin cambios |
| `detalle_ordenes_compra` | Líneas de órdenes | Sin cambios |
| `auditoria` | Registro de cambios OWASP A09 | Sin cambios |
| `contadores` | Numeración secuencial anual | 🆕 Reemplaza seq_ventas y seq_ordenes_compra |
| `historial_precios_costo` | Historial de costos por recepción | 🆕 Nueva |
| ~~`cache_ia`~~ | ~~Caché de resultados IA~~ | ❌ ELIMINADA |

### Estrategia de IDs

| Tabla | Tipo ID | Razón |
|---|---|---|
| usuarios, tokens_refresco | UUID | Resistente a enumeración |
| repuestos, clientes, ventas, ordenes_compra, proveedores | SERIAL | Entidades operativas |
| auditoria | BIGSERIAL | Volumen alto esperado |
| historial_precios_costo | SERIAL | Entidad de trazabilidad |
| contadores | PK compuesta (tipo, anio) | Clave de negocio directa |

### Soft Delete

Tablas con soft delete (`eliminado_en TIMESTAMPTZ`): `repuestos`, `marcas_vehiculo`.

**Regla universal:** Todas las queries de negocio incluyen `WHERE eliminado_en IS NULL`. Solo queries administrativas o históricas omiten este filtro.

### Columnas Generadas (STORED)

```sql
-- detalle_ventas
subtotal_linea = cantidad * precio_unitario

-- detalle_ordenes_compra
subtotal_linea = cantidad * precio_costo
```

### Índices Estratégicos

| Índice | Tabla | Tipo | Propósito |
|---|---|---|---|
| `idx_repuestos_nombre` | repuestos | GIN tsvector español | Búsqueda de texto completo |
| `idx_clientes_nombres` | clientes | GIN tsvector español | Búsqueda por nombre completo |
| `idx_repuestos_activos` | repuestos | Partial WHERE NULL | Filtrado rápido de activos |
| `idx_usuarios_bloqueado` | usuarios | Partial WHERE NOT NULL | Listado de bloqueados |
| `idx_ventas_fecha` | ventas | B-tree | Reportes por rango de fechas |
| `idx_ordenes_estado` | ordenes_compra | B-tree | Filtrado por estado |
| `idx_hist_precio_repuesto` | historial_precios_costo | B-tree | Historial por repuesto |
| `idx_hist_precio_fecha` | historial_precios_costo | B-tree | Historial por fecha |

### Triggers Activos (v2.0)

| Trigger | Evento | Acción |
|---|---|---|
| `trg_usuarios_ts` | BEFORE UPDATE usuarios | `actualizado_en = NOW()` |
| `trg_repuestos_ts` | BEFORE UPDATE repuestos | `actualizado_en = NOW()` |
| `trg_clientes_ts` | BEFORE UPDATE clientes | `actualizado_en = NOW()` |
| `trg_proveedores_ts` | BEFORE UPDATE proveedores | `actualizado_en = NOW()` |
| `trg_ordenes_ts` | BEFORE UPDATE ordenes_compra | `actualizado_en = NOW()` |
| `trg_stock_recibido` | BEFORE UPDATE estado ordenes_compra | Actualiza stock + precio_costo + inserta historial |
| `trg_numero_venta` | BEFORE INSERT ventas | Genera número via tabla `contadores` |
| `trg_numero_orden` | BEFORE INSERT ordenes_compra | Genera número via tabla `contadores` |

> Las secuencias `seq_ventas` y `seq_ordenes_compra` del esquema original **NO se crean**. Los triggers de numeración usan `fn_siguiente_numero` con la tabla `contadores`.

### Vistas SQL

| Vista | Uso principal |
|---|---|
| `vista_ventas_por_mes` | GET /api/reportes/ventas-por-mes |
| `vista_stock_bajo` | GET /api/repuestos/alertas-stock y GET /api/reportes/stock-bajo |
| `vista_top_repuestos` | GET /api/reportes/top-repuestos |
| `vista_mejores_clientes` | GET /api/reportes/mejores-clientes |

---

## 10. GUÍA DE ESTILO UI/UX

> Esta sección es la **referencia de verdad** para toda implementación visual. Tiene precedencia sobre cualquier código HTML/CSS previo.

### 10.1 Paleta de Colores (CSS Variables)

```css
:root {
  /* Fondos */
  --color-fondo-base:        #0F1117;  /* Negro carbón — fondo de la app */
  --color-fondo-sidebar:     #161B27;  /* Gris acero oscuro — sidebar */
  --color-fondo-tarjeta:     #1E2433;  /* Gris pizarra — cards y modales */
  --color-fondo-tabla:       #FFFFFF;  /* Blanco — filas de datos */
  --color-fondo-tabla-alt:   #F8FAFC;  /* Gris muy claro — filas alternas */

  /* Acento principal */
  --color-acento:            #F97316;  /* Naranja mecánico (orange-500) */
  --color-acento-hover:      #EA6C0A;  /* Naranja oscuro para hover */
  --color-acento-suave:      #FED7AA;  /* Naranja claro para badges */

  /* Texto */
  --color-texto-principal:   #F1F5F9;  /* Casi blanco — texto general dark mode */
  --color-texto-secundario:  #94A3B8;  /* Gris azulado — subtítulos, placeholders */
  --color-texto-datos:       #1E293B;  /* Azul oscuro — texto en filas blancas */

  /* Estados */
  --color-exito:             #22C55E;
  --color-advertencia:       #EAB308;
  --color-error:             #EF4444;
  --color-info:              #3B82F6;

  /* Bordes */
  --color-borde:             #2D3748;
  --color-borde-acento:      #F97316;

  /* Sidebar */
  --sidebar-ancho-pc:        260px;
  --sidebar-ancho-contraido: 68px;
}
```

### 10.2 Tipografía

```css
/* Importar vía Google Fonts (en index.css o index.html) */
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

/* Clases de uso */
.titulo-modulo  { font-family: 'Rajdhani', sans-serif; font-weight: 700; }
/* Uso: Títulos de página, nombres de módulos */

.texto-cuerpo   { font-family: 'IBM Plex Sans', sans-serif; font-weight: 400; }
/* Uso: Párrafos, descripciones, contenido general */

.etiqueta-tabla {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
/* Uso: Encabezados de columnas en tablas */
```

### 10.3 Layout Principal

```jsx
// Estructura raíz de la app (App.tsx o Layout.tsx)
<div className="flex min-h-screen bg-[#0F1117]">
  <Sidebar />
  <main className="flex-1 lg:ml-[260px] min-h-screen bg-[#0F1117] p-6">
    {/* Contenido de la página */}
  </main>
</div>
```

### 10.4 Sidebar (Comportamiento Definitivo)

```
PC (≥ lg):     Siempre visible, fijo izquierda, ancho 260px.
               El contenido tiene lg:ml-[260px].
Móvil/Tablet:  Oculto por defecto. Ícono hamburguesa (bottom-left flotante)
               lo despliega como overlay con backdrop blur.
```

**Clases Tailwind clave:**

```jsx
{/* Overlay backdrop para móvil */}
<div className={`
  fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden
  ${abierto ? 'block' : 'hidden'}
`} onClick={() => setAbierto(false)} />

{/* Sidebar wrapper */}
<aside className={`
  fixed top-0 left-0 z-40 h-full w-[260px] bg-[#161B27] border-r border-[#2D3748]
  flex flex-col transition-transform duration-300 ease-in-out
  lg:translate-x-0
  ${abierto ? 'translate-x-0' : '-translate-x-full'}
`}>

{/* Ítems de navegación */}
<NavLink className={({ isActive }) => `
  flex items-center gap-3 px-4 py-3 rounded-lg mx-2 mb-1
  font-medium text-sm transition-all duration-200
  ${isActive
    ? 'bg-orange-500/20 text-orange-400 border-l-2 border-orange-500'
    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
  }
`}>

{/* Botón hamburguesa (solo móvil) */}
<button className="fixed bottom-6 left-6 z-50 p-3 rounded-full bg-orange-500 text-white lg:hidden">
  ☰
</button>
```

### 10.5 TablaUniversal (Layout Visual Definitivo)

```
┌─────────────────────────────────────────────────────────┐
│ [Título Módulo — Rajdhani 700]  [+ Botón Acción]        │  bg-[#0F1117], border-b border-[#2D3748]
├─────────────────────────────────────────────────────────┤
│ [🔍 Buscar____________]                                 │  bg-[#1E2433], border border-[#2D3748]
├─────────────────────────────────────────────────────────┤
│  COL1    COL2    COL3    ACCIONES                        │  bg-[#161B27], text-gray-300, etiqueta-tabla
├─────────────────────────────────────────────────────────┤
│  dato    dato    dato   [👁][✏️][🗑️]                    │  bg-white, text-[#1E293B]
│  dato    dato    dato   [👁][✏️][🗑️]                    │  bg-[#F8FAFC], text-[#1E293B]  (alternada)
├─────────────────────────────────────────────────────────┤
│  Mostrando 1-20 de 143        [← 1 2 3 ... 8 →]        │  text-gray-400, botón activo: bg-orange-500
└─────────────────────────────────────────────────────────┘
```

**Clases de botones de acción (dentro de la tabla):**

```jsx
// Visualizar
"p-1.5 rounded text-blue-400 hover:bg-blue-400/10 hover:text-blue-300 transition-colors"

// Editar
"p-1.5 rounded text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 transition-colors"

// Eliminar
"p-1.5 rounded text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
```

**Botón de paginación activo:** `bg-orange-500 text-white rounded`
**Botón de paginación inactivo:** `border border-[#2D3748] hover:bg-[#1E2433] text-gray-400`

### 10.6 Barra de Búsqueda (en TablaUniversal)

```jsx
<input
  className="flex-1 px-4 py-2 rounded bg-[#1E2433] text-white placeholder-gray-400
             border border-[#2D3748] focus:outline-none focus:border-orange-500"
  placeholder="🔍 Buscar..."
/>
```

### 10.7 Botones Principales

```jsx
// Botón acción principal (crear, agregar)
"bg-orange-500 hover:bg-[#EA6C0A] text-white px-4 py-2 rounded font-medium transition-colors"

// Botón secundario / cancelar
"border border-[#2D3748] text-slate-300 hover:bg-white/5 px-4 py-2 rounded transition-colors"

// Botón de peligro (eliminar en modal)
"bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
```

### 10.8 Cards / Tarjetas

```jsx
<div className="bg-[#1E2433] rounded-lg border border-[#2D3748] p-6">
  {/* contenido */}
</div>
```

### 10.9 Badges de Estado

```jsx
// Pendiente
"px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400"

// Aprobado
"px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400"

// Recibido / Éxito
"px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400"

// Cancelado / Error
"px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400"

// Stock bajo
"px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400"
```

### 10.10 Inputs de Formulario

```jsx
<label className="block text-sm text-slate-300 mb-1">Nombre del campo</label>
<input
  className="w-full px-3 py-2 bg-[#1E2433] border border-[#2D3748] rounded
             text-white placeholder-gray-500
             focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50"
/>
```

---

## 11. SEGURIDAD

### Autenticación

- Contraseñas: `bcrypt` cost factor 12. Nunca en texto plano.
- `accessToken`: JWT firmado, exp 15m, en memoria JS (nunca localStorage/sessionStorage).
- `refreshToken`: JWT firmado, exp 7d, cookie `HttpOnly; Secure; SameSite=Strict`.
- Hash del refreshToken almacenado en `tokens_refresco` (SHA-256 o bcrypt).
- Verificación siempre: firma + expiración + `revocado = false`.

### Autorización

- Middleware `autenticar.ts`: extrae y verifica JWT en cada request.
- Middleware `autorizar.ts`: verifica rol según la Matriz de Permisos (sección 2.2).
- Implementar como: `autenticar, autorizar(['administrador', 'vendedor'])` en cada ruta.

### Validación de Inputs

- Siempre en backend (nunca confiar solo en frontend).
- Parámetros SQL: siempre `$1, $2, ...` con `pg`. Nunca concatenación de strings.
- Rechazar campos no declarados en el schema del request (evitar mass assignment).
- Validar tipos, longitudes máximas, rangos numéricos.

### Protección contra Ataques Comunes

| Ataque | Mitigación |
|---|---|
| SQL Injection | Parámetros preparados `$1, $2` siempre |
| XSS | accessToken en memoria, helmet headers |
| CSRF | SameSite=Strict en cookie, CORS restringido |
| Brute Force | Bloqueo tras 3 intentos fallidos |
| Enumeración | Mensaje de error genérico en login |
| IDOR | Verificar que el recurso es accesible según rol del JWT |

### Headers de Seguridad

```typescript
import helmet from 'helmet';
app.use(helmet());
// Agrega: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.
```

### Datos Sensibles

- `contrasena_hash` nunca en respuestas API ni en logs ni en tabla `auditoria`.
- Logs nunca contienen tokens JWT completos (solo los primeros 8 chars si necesario para debug).

### Gestión de Secretos

- `JWT_SECRETO`: `openssl rand -hex 64`
- `COOKIE_SECRETO`: `openssl rand -hex 32`
- Solo en `.env`. Archivos `.env` en `.gitignore`. Solo `.env.example` (sin valores) se comitea.

---

## 12. OBSERVABILIDAD

### Logs (Winston)

**Niveles:**
- `error`: Excepciones no controladas, fallos de BD, errores 5xx.
- `warn`: Intentos de auth fallidos, stock bajo detectado, IA no disponible.
- `info`: Arranque del servidor, conexión a BD, cada request HTTP (en producción).
- `debug`: Solo en `NODE_ENV=development`.

**Formato de log de request:**
```
[2026-06-04T10:30:00Z] INFO POST /api/ventas 201 234ms | user:uuid | ip:192.168.1.1
```

**Nunca loguear:** contraseñas, tokens JWT completos, datos de sesión.

### Health Check

```
GET /health
200: { status: "OK", timestamp: string, bd: "OK" | "ERROR", version: string }
503: { status: "ERROR", bd: "ERROR" }
```

La BD se verifica con `SELECT 1`. Si falla → `503`.

### Trazabilidad

- Incluir `request_id` (UUID) en cada request, propagarlo en logs y respuestas de error.
- `numero_venta` y `numero_orden` sirven como IDs de trazabilidad de negocio.

### Monitoreo de IA

- Loguear: timestamp, duración ms, resultado `{ marca, color }`, error si falla.
- Permite detectar degradación del servicio Flask sin afectar el sistema principal.

---

## 13. ESTRATEGIA DE TESTING

### 13.1 Unit Tests (Backend) — Vitest

| Test | Función bajo prueba | Entrada | Resultado Esperado |
|---|---|---|---|
| UT-001 | `calcularSubtotal` | `[{cant:2, precio:50}]` | `100.00` |
| UT-002 | `calcularIva(100, 15)` | subtotal=100, pct=15 | `15.00` |
| UT-003 | `calcularTotal(100, 15)` | subtotal=100, iva=15 | `115.00` |
| UT-004 | `calcularSubtotal([])` | array vacío | `0` |
| UT-005 | `calcularSubtotal` con cantidad negativa | `[{cant:-1, precio:50}]` | Error "cantidad inválida" |
| UT-006 | `validarContrasena("abc")` | string corto | `{ valida: false }` |
| UT-007 | `validarContrasena("Admin2026!")` | string válido | `{ valida: true }` |
| UT-008 | `generarNumeroVenta(2026, 1)` | año, secuencia | `"VTA-2026-00001"` |
| UT-009 | `generarNumeroVenta(2027, 1)` | año nuevo, secuencia reiniciada | `"VTA-2027-00001"` |

### 13.2 Integration Tests (Backend) — Vitest + Supertest

| Test ID | Endpoint | Condición | Resultado Esperado |
|---|---|---|---|
| IT-001 | POST /api/auth/login | Credenciales válidas | 200 + accessToken |
| IT-002 | POST /api/auth/login | Contraseña incorrecta | 401 |
| IT-003 | POST /api/auth/login | 3er intento fallido → 4° intento | 401 → 423 |
| IT-004 | GET /api/repuestos | Sin JWT | 401 |
| IT-005 | GET /api/repuestos | JWT vendedor | 200 |
| IT-006 | POST /api/repuestos | JWT vendedor (crear) | 403 |
| IT-007 | POST /api/repuestos | JWT administrador | 201 |
| IT-008 | POST /api/ventas | Stock suficiente | 201 + numero_venta |
| IT-009 | POST /api/ventas | Stock insuficiente en 1 ítem | 409 |
| IT-010 | POST /api/ventas | Cliente no existe | 404 |
| IT-011 | POST /api/ventas | IVA correcto 15% | `monto_iva == subtotal * 0.15` |
| IT-012 | POST /api/ventas | Rollback verificado | Stock sin cambio tras 409 |
| IT-013 | PUT /api/ordenes/:id/estado | vendedor aprueba | 403 |
| IT-014 | PUT /api/ordenes/:id/estado | comprador aprueba | 403 |
| IT-015 | PUT /api/ordenes/:id/estado | admin aprueba | 200 |
| IT-016 | PUT /api/ordenes/:id/estado | recibida → aprobada (retroceso) | 409 |
| IT-017 | DELETE /api/repuestos/:id | Soft delete | 204, fila aún en BD con eliminado_en |
| IT-018 | POST /api/ventas | Repuesto soft-deleted | 422 |
| IT-019 | GET /api/reportes/ventas-por-mes | JWT vendedor | 403 |
| IT-020 | GET /api/reportes/ventas-por-mes | JWT admin | 200 |
| IT-021 | GET /api/repuestos/:id/historial-precios | Al recibir orden | Registros en historial |

### 13.3 Unit Tests (Frontend) — Vitest + RTL

| Test ID | Componente / Store | Acción | Resultado Esperado |
|---|---|---|---|
| FT-001 | `carritoStore.agregarItem` | Ítem nuevo | `items.length === 1` |
| FT-002 | `carritoStore.agregarItem` | Ítem existente (mismo id) | Cantidad suma, no duplica |
| FT-003 | `carritoStore.obtenerTotal()` | 2 ítems distintos | Correcto (suma + IVA 15%) |
| FT-004 | `carritoStore.vaciar()` | — | `items === []` |
| FT-005 | `carritoStore.disminuirCantidad` | Cantidad = 1 | Queda en 1 (mínimo, no 0) |
| FT-006 | `TablaUniversal` | Render con 0 datos | Muestra "No hay datos" |
| FT-007 | `TablaUniversal` | Render con 3 filas | 3 filas en DOM |
| FT-008 | `TablaUniversal` | Click página 2 | `onCambioPagina(2)` llamado |
| FT-009 | `LoginPage` | Submit sin campos | Errores de validación visibles |
| FT-010 | `servicioIA` | Timeout simulado (Mock) | Retorna error sin bloquear UI |

### 13.4 Tests de Seguridad

| Test | Ataque | Resultado Esperado |
|---|---|---|
| SEC-001 | SQL Injection en búsqueda | 200 con 0 resultados, BD intacta |
| SEC-002 | JWT con payload modificado (firma inválida) | 401 |
| SEC-003 | JWT de otro usuario en recurso propio | 403 |
| SEC-004 | Token expirado (> 15 min) | 401 |
| SEC-005 | refreshToken revocado | 401 en /api/auth/refresh |
| SEC-006 | Vendedor en endpoint de administrador | 403 |
| SEC-007 | Comprador registrando venta | 403 |

### 13.5 Edge Cases Críticos

| EC | Descripción | Comportamiento Esperado |
|---|---|---|
| EC-001 | Mismo repuesto dos veces en carrito | El store suma cantidades (no duplica ítems) |
| EC-002 | Stock = 0 en el momento de confirmar (race condition) | `UPDATE ... WHERE cantidad_stock >= 1` retorna 0 rows → ROLLBACK → 409 |
| EC-003 | IA no disponible | Ventas continúan normalmente sin filtro automático |
| EC-004 | Repuesto eliminado mientras el carrito lo tiene | Backend rechaza con 422 al confirmar |
| EC-005 | refreshToken usado post-logout | 401 (token revocado) |
| EC-006 | Carrito vacío enviado | 400 "items requeridos" |
| EC-007 | Cambio de año (1 ene 2027, primera venta) | `VTA-2027-00001` (no continúa desde 2026) |
| EC-008 | Dos ventas simultáneas que agotan el stock | Solo una pasa, la otra recibe 409 |

### 13.6 Cobertura Objetivo

| Módulo | Backend | Frontend |
|---|---|---|
| Autenticación | 90% | 80% |
| Inventario | 85% | 75% |
| Ventas | 90% | 80% |
| Compras | 85% | 75% |
| Reportes | 75% | 70% |
| **Global mínimo** | **85%** | **75%** |

---

## 14. RIESGOS TÉCNICOS

### R-001: Race Condition en Stock ✅ MITIGADO EN DISEÑO

**Descripción:** Dos vendedores confirman ventas del mismo repuesto simultáneamente.

**Mitigación:** `UPDATE repuestos SET cantidad_stock = cantidad_stock - $1 WHERE id = $2 AND cantidad_stock >= $1` es atómico. Si devuelve 0 rows → error → ROLLBACK.

---

### R-002: Expiración del AccessToken durante Operación Larga ⚠️ REQUIERE IMPLEMENTACIÓN

**Descripción:** El accessToken expira en 15 min mientras el usuario arma un carrito largo.

**Mitigación:** Interceptor HTTP en frontend: al recibir 401, ejecutar refresh automático y reintentar el request original. Implementar en la capa de servicios HTTP.

---

### R-003: Docker IA No Disponible ✅ MITIGADO EN DISEÑO

**Descripción:** Flask :6000 no responde.

**Mitigación:** La IA es auxiliar. Timeout 10s + 3 reintentos con backoff. Si falla: mensaje informativo no bloqueante, ventas continúan sin filtro automático.

---

### R-004: Secretos en Control de Versiones ⚠️ REQUIERE CONFIGURACIÓN DE REPOSITORIO

**Mitigación:**
- `.gitignore` incluye `.env`, `*.env`.
- Solo `.env.example` sin valores reales se comitea.
- GitHub secret scanning activado en el repositorio.

---

### R-005: Migración HTML/CSS → React ✅ MITIGADO CON GUÍA DE ESTILO

**Descripción:** Los errores visuales menores podrían perpetuarse.

**Mitigación:** La Guía de Estilo (sección 10) es la referencia de verdad. Los errores se corrigen durante la migración, no requieren documentación previa.

---

### R-006: Carga de Imágenes sin Validación de Tipo ⚠️ REQUIERE VALIDACIÓN EN FRONTEND

**Descripción:** Usuario podría enviar archivos no imagen al servicio Flask.

**Mitigación:** Validar en frontend antes del envío: solo JPEG/PNG/WEBP, máximo 5MB. Implementar en `servicioIA.ts` antes de llamar a la IA.

---

### R-007: Concurrencia en Tabla Contadores

**Descripción:** Dos inserts simultáneos de ventas podrían generar el mismo número.

**Probabilidad:** Muy baja (sistema interno, equipo pequeño).

**Impacto:** Bajo (la PK de `ventas` y el UNIQUE en `numero_venta` actuarían de barrera).

**Mitigación:** El `INSERT ... ON CONFLICT DO UPDATE RETURNING ultimo_valor` en PostgreSQL es atómico. Garantiza unicidad del número generado incluso bajo concurrencia. ✅ MITIGADO EN DISEÑO.

---

## 15. CHECKLIST DE IMPLEMENTACIÓN

### ✅ Pre-Desarrollo — TODO RESUELTO

- [x] AMB-001: Matriz de permisos definida (sección 2.2)
- [x] AMB-002: Tabla cache_ia eliminada
- [x] AMB-003: Validación de stock solo en backend, stock visible en UI
- [x] AMB-004: Errores visuales se corrigen con la Guía de Estilo
- [x] AMB-005: Filtros de fecha en endpoints de reportes (default 12 meses)
- [x] AMB-006: Color solo se actualiza manualmente, IA solo filtra
- [x] INC-001: Resuelto con eliminación de cache_ia
- [x] INC-002: Contraste dark header + light rows es diseño intencional y oficial
- [x] INC-003: Tabla `contadores` con reset anual implementada
- [x] INC-004: Tabla `historial_precios_costo` implementada
- [ ] Repositorio GitHub creado con ramas `main` y `develop`
- [ ] `.gitignore` configurado (`.env`, `node_modules`, `dist`)
- [ ] Branch protection en `main` (requiere PR + CI verde)
- [ ] GitHub secret scanning activado

### Fase 0: Setup

- [ ] Estructura de carpetas creada
- [ ] Frontend: Vite + React + TypeScript instalado, `npm run build` sin errores
- [ ] Backend: Express + TypeScript instalado, `npm run build` sin errores
- [ ] PostgreSQL: usuario `taller_user` y BD `taller_repuestos` creados
- [ ] Script SQL v2.0 ejecutado (con tabla `contadores`, tabla `historial_precios_costo`, sin `cache_ia`, sin `seq_ventas`)
- [ ] BD de pruebas `taller_pruebas` con mismo script
- [ ] Variables `.env` completadas en cliente y servidor
- [ ] `JWT_SECRETO` y `COOKIE_SECRETO` generados con `openssl rand`
- [ ] Google Fonts (Rajdhani + IBM Plex Sans) importadas en `index.css`
- [ ] CSS variables de paleta definidas en `:root` en `index.css`
- [ ] `docker-compose up` corre sin errores
- [ ] `GET /health` responde 200 con `bd: "OK"`
- [ ] Frontend carga en `:5173` sin errores de consola
- [ ] GitHub Actions CI verde en primera ejecución

### Fase 1: Autenticación

- [ ] `POST /api/auth/login` con bcrypt y JWT doble
- [ ] `POST /api/auth/refresh` verificando revocación
- [ ] `POST /api/auth/logout` revocando token
- [ ] Middleware `autenticar.ts` (JWT)
- [ ] Middleware `autorizar.ts` (roles según Matriz sección 2.2)
- [ ] Bloqueo tras 3 intentos implementado y testeado (IT-003)
- [ ] `LoginPage.tsx` con validaciones y estilos correctos
- [ ] `autenticacionStore.ts` Zustand (accessToken en memoria, nunca localStorage)
- [ ] Interceptor HTTP para refresh automático en 401
- [ ] 90% cobertura en módulo autenticación

### Fase 2: Dashboard + Layout

- [ ] CSS variables y fuentes configuradas
- [ ] `Sidebar.tsx` según especificación de sección 10.4
- [ ] `TablaUniversal.tsx` según layout de sección 10.5
- [ ] `Modal.tsx` reutilizable con overlay oscuro
- [ ] `DashboardPagina.tsx` accesible solo por admin (403 para otros roles)
- [ ] Datos reales del dashboard desde endpoints de reportes

### Fase 3: Módulo Inventario

- [ ] `GET/POST/PUT/DELETE /api/repuestos` con control de roles
- [ ] Soft delete verificado (IT-017, IT-018)
- [ ] Búsqueda GIN (no LIKE) verificada con IT-005
- [ ] `GET /api/marcas` disponible
- [ ] `GET /api/repuestos/alertas-stock` usando vista SQL
- [ ] `GET /api/repuestos/:id/historial-precios` implementado
- [ ] `InventarioPagina.tsx` solo accesible a admin, vendedor y comprador (solo lectura para últimos dos)
- [ ] 85% cobertura

### Fase 4: Módulo Ventas ⭐ CRÍTICO

- [ ] `registrarVentaConTransaccion` con ACID completo
- [ ] Rollback verificado (IT-012, EC-002)
- [ ] `servicioIA.ts` con timeout, reintentos y fallback (EC-003)
- [ ] Validación de archivo en frontend antes de enviar (R-006)
- [ ] `carritoStore.ts` con cálculo correcto de IVA
- [ ] Stock visible junto a repuesto en lista (AMB-003)
- [ ] `VentasPagina.tsx` con flujo completo
- [ ] EC-007 verificado: primera venta 2027 = `VTA-2027-00001`
- [ ] 90% cobertura

### Fase 5: Módulos Compras + Reportes

- [ ] CRUD proveedores implementado
- [ ] Flujo de estados con validación de transiciones
- [ ] Solo admin puede aprobar (IT-013, IT-014, IT-015)
- [ ] Trigger de `historial_precios_costo` verificado (IT-021)
- [ ] Endpoints de reportes con filtros de fecha (AMB-005)
- [ ] 403 para vendedores y compradores en reportes (IT-019, IT-020)
- [ ] `ReportesPagina.tsx` con Recharts

### Fase 6: CI/CD + Deploy

- [ ] Cobertura backend ≥ 85% en CI
- [ ] Cobertura frontend ≥ 75% en CI
- [ ] `tsc --noEmit` sin errores en CI
- [ ] ESLint sin warnings en CI
- [ ] `npm run build` exitoso en CI
- [ ] Merge a `main` solo desde PR con CI verde
- [ ] Dockerfile para backend
- [ ] `docker-compose.yml` de producción con variables externas
- [ ] HTTPS + CORS restringido a dominio real

---

**FIN DE LA ESPECIFICACIÓN v2.0**

---

> **Nota para Desarrolladores:** Este documento en su versión 2.0 no tiene ambigüedades ni inconsistencias abiertas.  
> Todas las decisiones están tomadas y documentadas. Ante cualquier duda de implementación, este documento tiene precedencia.  
> Si surge una nueva situación no cubierta, documentarla como nueva sección antes de asumir comportamiento.