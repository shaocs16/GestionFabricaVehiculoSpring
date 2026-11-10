const page = (item) => ({
  content: [item],
  page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
});

const endpoint = (
  method,
  path,
  summary,
  {
    description = summary,
    status = 200,
    request = null,
    response = null,
    errors = [],
    requiredRole,
    transactional,
    entities,
    pathParameters,
    queryParameters,
    sideEffects,
    resultingState,
  } = {},
) => ({
  method,
  path,
  summary,
  description,
  status,
  request,
  response,
  errors,
  requiredRole,
  transactional,
  entities,
  pathParameters,
  queryParameters,
  sideEffects,
  resultingState,
});

const crud = (resource, label, sample, createRequest) => [
  endpoint("POST", `/${resource}`, `Crear ${label}`, {
    status: 201,
    request: createRequest,
    response: sample,
    errors: [
      "400 · Datos no válidos",
      "409 · Identificador de negocio duplicado",
    ],
  }),
  endpoint("GET", `/${resource}`, `Listar ${label}`, {
    description: `Devuelve ${label} con paginación, ordenación y filtros.`,
    response: page(sample),
  }),
  endpoint("GET", `/${resource}/{id}`, `Consultar ${label} por ID`, {
    response: sample,
    errors: ["404 · Recurso no encontrado"],
  }),
  endpoint("PATCH", `/${resource}/{id}`, `Actualizar ${label}`, {
    request: createRequest,
    response: sample,
    errors: [
      "400 · Cambio no válido",
      "404 · Recurso no encontrado",
      "409 · Recurso en uso",
    ],
  }),
  endpoint("DELETE", `/${resource}/{id}`, `Eliminar ${label}`, {
    status: 204,
    description: `Elimina ${label} únicamente si no está reservado ni instalado.`,
    errors: [
      "404 · Recurso no encontrado",
      "409 · Recurso reservado o instalado",
    ],
  }),
];

const motor = {
  id: 41,
  type: "HIBRIDO",
  displacement: 1998.0,
  power: 180,
  cylinderCount: 4,
  stockStatus: "AVAILABLE",
};
const upholstery = {
  id: 82,
  type: "ALCANTARA",
  color: "Negro",
  squareMeters: 7.5,
  stockStatus: "AVAILABLE",
};
const wheel = {
  id: 125,
  type: "DEPORTIVO",
  width: 245,
  rimInches: 19,
  loadIndex: 95,
  speedCode: 270,
  stockStatus: "AVAILABLE",
};
const worker = {
  id: 12,
  workerType: "OPERARIO",
  firstName: "Ana",
  lastName: "Santos",
  dni: "12345678Z",
  assemblyCount: 18,
  efficient: true,
};
const vehicle = {
  id: 304,
  vehicleType: "TURISMO",
  color: "Rojo",
  seats: 5,
  assemblyStatus: "MOTOR",
  productionOrderLineId: 32,
};
const order = {
  id: 15,
  orderNumber: "PO-2026-00015",
  status: "CONFIRMED",
  totalVehicles: 4,
  completedVehicles: 0,
  progressPercentage: 0,
};

export const API_MODULES = [
  {
    id: "components",
    name: "Componentes",
    level: "Fácil-mid",
    purpose:
      "Gestiona motores, tapicerías y ruedas antes de entrar en fabricación.",
    flow: "Alta → validación → AVAILABLE → reserva o baja segura",
    endpoints: [
      ...crud("motors", "motor", motor, {
        type: "HIBRIDO",
        displacement: 1998.0,
        power: 180,
        cylinderCount: 4,
      }),
      ...crud("upholsteries", "tapicería", upholstery, {
        type: "ALCANTARA",
        color: "Negro",
        squareMeters: 7.5,
      }),
      ...crud("wheels", "rueda", wheel, {
        type: "DEPORTIVO",
        width: 245,
        rimInches: 19,
        loadIndex: 95,
        speedCode: 270,
      }),
      endpoint("POST", "/wheel-sets", "Crear juegos de cuatro ruedas", {
        status: 201,
        request: {
          type: "DEPORTIVO",
          width: 245,
          rimInches: 19,
          loadIndex: 95,
          speedCode: 270,
          sets: 3,
        },
        response: { createdWheels: 12, setCount: 3 },
        errors: ["400 · El número de juegos debe ser positivo"],
      }),
    ],
  },
  {
    id: "workers",
    name: "Trabajadores",
    level: "Fácil-mid",
    purpose: "Gestiona perfiles humanos, datos laborales y productividad.",
    flow: "Alta → perfil → asignación → contador de actividad",
    endpoints: [
      ...crud("workers", "trabajador", worker, {
        workerType: "OPERARIO",
        firstName: "Ana",
        lastName: "Santos",
        dni: "12345678Z",
        socialSecurityNumber: "28-1234567890",
        salary: 28500.0,
        hireDate: "2026-01-15",
      }),
      endpoint("GET", "/workers/by-dni/{dni}", "Buscar trabajador por DNI", {
        response: worker,
        errors: ["404 · Trabajador no encontrado"],
      }),
      endpoint("GET", "/workers/operators", "Listar operarios", {
        response: page(worker),
      }),
      endpoint("GET", "/workers/mechanics", "Listar mecánicos", {
        response: page({
          ...worker,
          id: 19,
          workerType: "MECANICO",
          repairCount: 8,
        }),
      }),
      endpoint("GET", "/workers/managers", "Listar gestores de planta", {
        response: page({ ...worker, id: 7, workerType: "GESTOR_PLANTA" }),
      }),
      endpoint("GET", "/workers/administrators", "Listar administradores", {
        response: page({
          ...worker,
          id: 2,
          workerType: "ADMINISTRADOR_SISTEMA",
        }),
      }),
      endpoint(
        "GET",
        "/workers/operators/efficient",
        "Listar operarios eficientes",
        {
          response: [worker],
        },
      ),
      endpoint(
        "GET",
        "/workers/mechanics/efficient",
        "Listar mecánicos eficientes",
        {
          response: [
            {
              ...worker,
              id: 23,
              workerType: "MECANICO",
              repairCount: 24,
              efficient: true,
            },
          ],
        },
      ),
    ],
  },
  {
    id: "stock",
    name: "Stock",
    level: "Mid",
    purpose:
      "Calcula disponibilidad y evita que un componente se reserve dos veces.",
    flow: "AVAILABLE → bloqueo → RESERVED → INSTALLED o liberación",
    endpoints: [
      endpoint("GET", "/stock", "Consultar resumen de stock", {
        response: {
          availableMotors: 18,
          availableUpholsteries: 16,
          availableWheels: 72,
          manufacturableVehicles: 16,
        },
      }),
      endpoint(
        "GET",
        "/stock/check?vehicles={quantity}",
        "Comprobar capacidad de fabricación",
        {
          response: {
            requestedVehicles: 4,
            result: "OK",
            missingComponents: [],
          },
          errors: ["400 · Cantidad no válida"],
        },
      ),
      endpoint("GET", "/stock/motors", "Listar motores disponibles", {
        response: page(motor),
      }),
      endpoint("GET", "/stock/upholsteries", "Listar tapicerías disponibles", {
        response: page(upholstery),
      }),
      endpoint("GET", "/stock/wheels", "Listar ruedas disponibles", {
        response: page(wheel),
      }),
    ],
  },
  {
    id: "vehicles",
    name: "Vehículos",
    level: "Mid",
    purpose: "Conserva cada unidad y su estado actual dentro del montaje.",
    flow: "CHASIS → MOTOR → TAPICERIA → RUEDAS → TERMINADO",
    endpoints: [
      endpoint("GET", "/vehicles", "Listar vehículos", {
        response: page(vehicle),
      }),
      endpoint("GET", "/vehicles/{id}", "Consultar vehículo", {
        response: {
          ...vehicle,
          motor,
          upholstery,
          wheels: [
            wheel,
            { ...wheel, id: 126 },
            { ...wheel, id: 127 },
            { ...wheel, id: 128 },
          ],
        },
        errors: ["404 · Vehículo no encontrado"],
      }),
      endpoint("PATCH", "/vehicles/{id}", "Actualizar datos permitidos", {
        request: { color: "Azul", seats: 5 },
        response: { ...vehicle, color: "Azul" },
        errors: ["409 · Vehículo en fabricación o terminado"],
      }),
      endpoint("DELETE", "/vehicles/{id}", "Retirar vehículo no iniciado", {
        status: 204,
        errors: ["409 · El montaje ya ha comenzado"],
      }),
      endpoint("GET", "/assembly-line", "Consultar las tres líneas", {
        response: {
          biplaza: { pending: 2 },
          turismo: { pending: 5 },
          furgoneta: { pending: 1 },
        },
      }),
      endpoint("GET", "/assembly-line/pending", "Listar vehículos pendientes", {
        response: page(vehicle),
      }),
      endpoint(
        "GET",
        "/assembly-line/completed",
        "Listar vehículos terminados",
        {
          response: page({ ...vehicle, id: 280, assemblyStatus: "TERMINADO" }),
        },
      ),
    ],
  },
  {
    id: "orders",
    name: "Órdenes",
    level: "Mid-advanced",
    purpose:
      "Agrupa lo que se fabricará y reserva sus componentes de forma atómica.",
    flow: "DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED",
    endpoints: [
      endpoint("POST", "/production-orders", "Crear orden en borrador", {
        status: 201,
        request: {
          plantManagerId: 7,
          lines: [
            { vehicleType: "TURISMO", quantity: 3, color: "Rojo", seats: 5 },
          ],
        },
        response: { ...order, status: "DRAFT", totalVehicles: 3 },
        errors: ["400 · Línea de fabricación no válida"],
      }),
      endpoint("GET", "/production-orders", "Listar órdenes", {
        response: page(order),
      }),
      endpoint("GET", "/production-orders/{id}", "Consultar orden y progreso", {
        response: order,
        errors: ["404 · Orden no encontrada"],
      }),
      endpoint("PATCH", "/production-orders/{id}", "Editar orden en borrador", {
        request: { plantManagerId: 7 },
        response: { ...order, status: "DRAFT" },
        errors: ["409 · La orden ya no es editable"],
      }),
      endpoint("POST", "/production-orders/{id}/lines", "Añadir línea", {
        status: 201,
        request: {
          vehicleType: "FURGONETA",
          quantity: 1,
          color: "Blanco",
          seats: 3,
        },
        response: {
          id: 33,
          productionOrderId: 15,
          vehicleType: "FURGONETA",
          quantity: 1,
        },
        errors: ["409 · La orden ya no es editable"],
      }),
      endpoint(
        "PATCH",
        "/production-orders/{id}/lines/{lineId}",
        "Modificar línea",
        {
          request: { quantity: 2 },
          response: {
            id: 33,
            productionOrderId: 15,
            vehicleType: "FURGONETA",
            quantity: 2,
          },
          errors: [
            "404 · Línea no encontrada",
            "409 · La orden ya no es editable",
          ],
        },
      ),
      endpoint(
        "DELETE",
        "/production-orders/{id}/lines/{lineId}",
        "Eliminar línea",
        {
          status: 204,
          errors: ["409 · La orden ya no es editable"],
        },
      ),
      endpoint(
        "POST",
        "/production-orders/{id}/confirm",
        "Confirmar y reservar stock",
        {
          response: order,
          errors: [
            "409 · Stock insuficiente",
            "409 · Transición de estado inválida",
          ],
        },
      ),
      endpoint("POST", "/production-orders/{id}/start", "Iniciar fabricación", {
        response: {
          ...order,
          status: "IN_PROGRESS",
          createdVehicleIds: [304, 305, 306, 307],
        },
        errors: ["409 · La orden no está confirmada"],
      }),
      endpoint(
        "POST",
        "/production-orders/{id}/cancel",
        "Cancelar y liberar reservas",
        {
          response: { ...order, status: "CANCELLED", releasedReservations: 24 },
          errors: ["409 · Una orden en progreso no se cancela directamente"],
        },
      ),
      endpoint(
        "GET",
        "/production-orders/{id}/reservations",
        "Consultar reservas",
        {
          response: {
            motors: 4,
            upholsteries: 4,
            wheels: 16,
            status: "RESERVED",
          },
        },
      ),
      endpoint(
        "GET",
        "/production-orders/{id}/operations",
        "Consultar operaciones",
        {
          response: page({
            id: 950,
            vehicleId: 304,
            operatorId: 12,
            fromStatus: "CHASIS",
            toStatus: "MOTOR",
          }),
        },
      ),
    ],
  },
  {
    id: "assembly",
    name: "Montaje",
    level: "Mid-advanced",
    purpose:
      "Instala el componente reservado, registra al operario y avanza el vehículo.",
    flow: "Validar estado → consumir reserva → registrar operación → avanzar",
    endpoints: [
      endpoint(
        "POST",
        "/vehicles/{id}/assembly-operations",
        "Completar estación actual",
        {
          status: 201,
          request: { station: "MOTOR", operatorId: 12 },
          response: {
            id: 951,
            vehicleId: 304,
            operatorId: 12,
            fromStatus: "MOTOR",
            toStatus: "TAPICERIA",
            installedComponentId: 41,
          },
          errors: [
            "409 · Estación incorrecta",
            "409 · Componente reservado no disponible",
          ],
        },
      ),
      endpoint(
        "GET",
        "/vehicles/{id}/assembly-operations",
        "Consultar trazabilidad del vehículo",
        {
          response: [
            {
              id: 950,
              fromStatus: "CHASIS",
              toStatus: "MOTOR",
              operatorId: 12,
            },
          ],
        },
      ),
      endpoint("GET", "/assembly-operations", "Filtrar operaciones", {
        response: page({
          id: 951,
          vehicleId: 304,
          operatorId: 12,
          station: "MOTOR",
          performedAt: "2026-11-10T09:30:00Z",
        }),
      }),
    ],
  },
  {
    id: "history",
    name: "Historial",
    level: "Mid",
    purpose:
      "Permite reconstruir qué ocurrió, sobre qué entidad y quién lo hizo.",
    flow: "Commit de negocio → registro inmutable → consulta filtrada",
    endpoints: [
      endpoint("GET", "/history", "Buscar historial", {
        response: page({
          id: 1802,
          entityType: "PRODUCTION_ORDER",
          entityId: 15,
          action: "CONFIRMED",
          workerId: 7,
          occurredAt: "2026-11-10T09:20:00Z",
        }),
      }),
      endpoint(
        "GET",
        "/history/by-date?date={date}",
        "Consultar historial diario",
        {
          response: [
            {
              id: 1802,
              action: "CONFIRMED",
              occurredAt: "2026-11-10T09:20:00Z",
            },
          ],
        },
      ),
    ],
  },
  {
    id: "dashboard",
    name: "Dashboard",
    level: "Mid-advanced",
    purpose:
      "Expone eventos persistidos y cambios en tiempo real sin sustituir a MySQL.",
    flow: "Commit → evento persistido → REST o SSE → cliente",
    endpoints: [
      endpoint("GET", "/dashboard/events", "Consultar eventos", {
        response: page({
          id: 710,
          level: "INFO",
          message: "Orden PO-2026-00015 confirmada",
          createdAt: "2026-11-10T09:20:00Z",
        }),
      }),
      endpoint("GET", "/dashboard/events/stream", "Abrir flujo SSE", {
        description:
          "Mantiene una conexión text/event-stream y emite eventos después del commit.",
        response: {
          event: "assembly-progress",
          data: { productionOrderId: 15, progressPercentage: 25 },
        },
        errors: ["503 · Flujo temporalmente no disponible"],
      }),
    ],
  },
  {
    id: "reports",
    name: "Informes",
    level: "Mid-advanced",
    purpose:
      "Calcula métricas desde datos persistidos sin almacenar totales duplicados.",
    flow: "Filtros → consulta agregada → proyección → DTO",
    endpoints: [
      endpoint("GET", "/reports/overview", "Obtener resumen general", {
        response: {
          availableComponents: 106,
          pendingVehicles: 8,
          completedVehicles: 42,
          activeOrders: 3,
        },
      }),
      endpoint(
        "GET",
        "/reports/operator-productivity",
        "Consultar productividad",
        {
          response: [
            {
              operatorId: 12,
              name: "Ana Santos",
              assemblyCount: 18,
              efficient: true,
            },
          ],
        },
      ),
      endpoint(
        "GET",
        "/reports/completed-vehicles",
        "Filtrar vehículos terminados",
        {
          response: page({ ...vehicle, id: 280, assemblyStatus: "TERMINADO" }),
        },
      ),
      endpoint("GET", "/reports/configurations", "Rankear configuraciones", {
        response: [
          {
            vehicleType: "TURISMO",
            motorType: "HIBRIDO",
            upholsteryType: "ALCANTARA",
            wheelType: "DEPORTIVO",
            assembledUnits: 9,
          },
        ],
      }),
    ],
  },
  {
    id: "admin",
    name: "Administración",
    level: "Advanced",
    purpose:
      "Protege operaciones destructivas, configuración y observabilidad.",
    flow: "Autenticar → autorizar → confirmar → ejecutar → auditar",
    endpoints: [
      endpoint("DELETE", "/admin/system-data", "Reiniciar datos del sistema", {
        status: 204,
        description:
          "Elimina datos de negocio en orden seguro; requiere rol ADMIN y confirmación.",
        errors: [
          "401 · No autenticado",
          "403 · Rol insuficiente",
          "409 · Procesos activos",
        ],
      }),
      endpoint("GET", "/actuator/health", "Consultar salud", {
        response: { status: "UP", components: { db: { status: "UP" } } },
      }),
      endpoint("GET", "/actuator/metrics", "Listar métricas", {
        response: {
          names: [
            "http.server.requests",
            "jvm.memory.used",
            "hikaricp.connections.active",
          ],
        },
        errors: ["403 · Endpoint no autorizado"],
      }),
    ],
  },
  {
    id: "simulation",
    name: "Simulación",
    level: "Advanced",
    purpose: "Automatiza robots, ticks e incidencias con estado recuperable.",
    flow: "PENDING → RUNNING ⇄ PAUSED → COMPLETED / FAILED / CANCELLED",
    endpoints: [
      endpoint("POST", "/simulations", "Crear simulación", {
        status: 202,
        request: {
          productionOrderId: 15,
          type: "COMPLEX",
          tickDurationMs: 1000,
        },
        response: {
          id: 27,
          status: "PENDING",
          currentTick: 0,
          type: "COMPLEX",
        },
        errors: [
          "409 · La orden ya tiene una simulación activa",
          "422 · Faltan mecánicos",
        ],
      }),
      endpoint("GET", "/simulations", "Listar simulaciones", {
        response: page({ id: 27, status: "RUNNING", currentTick: 18 }),
      }),
      endpoint("GET", "/simulations/{id}", "Consultar ejecución", {
        response: {
          id: 27,
          status: "RUNNING",
          currentTick: 18,
          completedVehicles: 1,
          totalVehicles: 4,
        },
      }),
      endpoint("GET", "/simulations/{id}/robots", "Consultar robots", {
        response: [
          {
            name: "Turismo-Motor",
            station: "MOTOR",
            vehicleId: 304,
            remainingTicks: 1,
          },
        ],
      }),
      endpoint("GET", "/simulations/{id}/incidents", "Consultar incidencias", {
        response: [
          { id: 6, type: "BREAKDOWN", vehicleId: 305, status: "RESOLVED" },
        ],
      }),
      endpoint(
        "GET",
        "/simulations/{id}/events",
        "Consultar eventos persistidos",
        {
          response: page({
            tick: 18,
            type: "STATION_COMPLETED",
            vehicleId: 304,
          }),
        },
      ),
      endpoint("GET", "/simulations/{id}/stream", "Abrir eventos SSE", {
        response: {
          event: "simulation-tick",
          data: { simulationId: 27, tick: 19 },
        },
      }),
      endpoint("POST", "/simulations/{id}/pause", "Pausar simulación", {
        response: { id: 27, status: "PAUSED", currentTick: 18 },
        errors: ["409 · La simulación no está en ejecución"],
      }),
      endpoint("POST", "/simulations/{id}/resume", "Reanudar simulación", {
        response: { id: 27, status: "RUNNING", currentTick: 18 },
        errors: ["409 · La simulación no está pausada"],
      }),
      endpoint("POST", "/simulations/{id}/cancel", "Cancelar simulación", {
        response: { id: 27, status: "CANCELLED", currentTick: 18 },
        errors: ["409 · La simulación ya terminó"],
      }),
    ],
  },
];

const ENTITY_RULES = [
  [
    "production-orders",
    ["ProductionOrder", "ProductionOrderLine", "ComponentReservation"],
  ],
  ["assembly-operations", ["AssemblyOperation", "Vehicle", "Worker"]],
  ["assembly-line", ["Vehicle"]],
  ["vehicles", ["Vehicle"]],
  ["motors", ["Motor"]],
  ["upholsteries", ["Upholstery"]],
  ["wheel", ["Wheel"]],
  ["workers", ["Worker"]],
  ["stock", ["Motor", "Upholstery", "Wheel", "ComponentReservation"]],
  ["history", ["AssemblyHistory"]],
  ["dashboard", ["DashboardEvent"]],
  ["reports", ["Consultas agregadas"]],
  ["simulations", ["Simulation", "SimulationEvent"]],
  ["admin", ["Datos de negocio"]],
  ["actuator", ["Métricas de aplicación"]],
];

const inferRole = (item) => {
  if (item.path.startsWith("/admin")) return "ADMINISTRADOR_SISTEMA";
  if (item.path.includes("assembly-operations") && item.method === "POST")
    return "OPERARIO";
  if (item.path.includes("production-orders") && item.method !== "GET")
    return "GESTOR_PLANTA";
  return "No aplica (seguridad pendiente)";
};

const inferTransaction = (item) => {
  if (item.method === "GET") return "No. Operación de solo lectura.";
  if (item.path.endsWith("/confirm"))
    return "Sí. Todo el stock se reserva o no se reserva nada.";
  if (item.path.includes("assembly-operations") && item.method === "POST")
    return "Sí. Instala, registra y avanza el vehículo de forma atómica.";
  return "Sí. La escritura se completa de forma atómica.";
};

const parameterDescription = (name) => ({
  name,
  type: name.toLowerCase().includes("id") ? "integer" : "string",
  required: true,
});

for (const module of API_MODULES) {
  for (const item of module.endpoints) {
    item.requiredRole ??= inferRole(item);
    item.transactional ??= inferTransaction(item);
    item.entities ??=
      ENTITY_RULES.find(([part]) => item.path.includes(part))?.[1] ?? [];
    item.pathParameters ??= [...item.path.matchAll(/\{([^}]+)\}/g)].map(
      (match) => parameterDescription(match[1]),
    );
    const query = item.path.split("?")[1] || "";
    item.queryParameters ??= query
      ? query.split("&").map((part) => parameterDescription(part.split("=")[0]))
      : [];
    item.sideEffects ??= item.method === "GET" ? [] : [item.description];
    item.resultingState ??= item.response?.status ?? "No aplica";
  }
}

export const HTTP_METHODS = ["ALL", "GET", "POST", "PATCH", "DELETE"];
export const API_LEVELS = [
  "ALL",
  "Fácil-mid",
  "Mid",
  "Mid-advanced",
  "Advanced",
];
