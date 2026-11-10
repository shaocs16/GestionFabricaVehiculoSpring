# Propuesta de migración completa a Spring Boot

El proyecto actual es una aplicación Java/BlueJ por consola que mantiene todos los datos en memoria mediante `ArrayList`.

La aplicación gestiona:

- Motores, tapicerías y ruedas.
- Stock de componentes.
- Vehículos pendientes y terminados.
- Trabajadores con cuatro perfiles diferentes.
- Tres cadenas de montaje.
- Robots y estaciones de montaje.
- Órdenes de fabricación y reservas de componentes.
- Un sistema de simulación completo, reservado para el nivel advanced.
- Dashboard de eventos.
- Historial y estadísticas.

La migración correcta no consiste solamente en añadir anotaciones JPA a las clases existentes. Hay que sustituir:

- El menú de consola por una API REST.
- Los `ArrayList` por MySQL.
- El patrón observador en memoria por eventos persistidos y, opcionalmente, SSE.
- La creación directa de vehículos por órdenes de fabricación transaccionales.
- Los índices de listas por identificadores persistentes.
- Las modificaciones directas de objetos por servicios transaccionales.

## 1. Configuración de Spring Initializr

Usaría esta configuración:

| Campo | Valor |
|---|---|
| Project | Maven |
| Language | Java |
| Spring Boot | 4.1.2 estable, que es la versión usada por el proyecto |
| Group | `com.practica` |
| Artifact | `gestion-fabrica-vehiculos` |
| Name | `GestionFabricaVehiculos` |
| Description | Backend para la gestión de una fábrica de vehículos |
| Package name | `com.practica.fabricavehiculos` |
| Packaging | Jar |
| Java | 21 |

### Dependencias de Initializr

Selecciona:

- **Spring Web**.
- **Spring Data JPA**.
- **Validation**.
- **MySQL Driver**.
- **Flyway Migration**.
- **Spring Boot DevTools**.

Para centrar el aprendizaje en las clases, los DTO, JPA y los servicios, deja para el final Actuator, Testcontainers, Springdoc, MapStruct y Spring Security. Lombok también es prescindible: escribir constructores, getters y setters manualmente ayuda a comprender las entidades.

### Dependencias que no incluiría inicialmente

No añadiría Spring Security en la primera migración porque el programa actual no tiene usuarios ni autenticación.

En una segunda fase sí sería aconsejable proteger especialmente:

- Reinicio completo del sistema.
- Eliminación de trabajadores.
- Eliminación de stock.
- Confirmación o cancelación de órdenes de fabricación.
- Modificaciones manuales del estado de vehículos.

## 2. Qué debe hacer el backend

La API deberá conservar todo el comportamiento actual.

### 2.1. Gestión de motores

Debe permitir:

- Registrar motores de gasolina, eléctricos e híbridos.
- Consultar todos los motores.
- Consultar solamente motores disponibles.
- Consultar un motor por ID.
- Actualizar cilindrada, potencia y número de cilindros.
- Eliminar un motor si todavía no está instalado.
- Saber si está disponible, reservado o instalado.

### 2.2. Gestión de tapicerías

Debe permitir:

- Registrar tapicerías de tela, cuero y alcántara.
- Consultarlas.
- Actualizar color y metros cuadrados.
- Eliminar una tapicería no instalada.
- Controlar su estado de stock.

### 2.3. Gestión de ruedas

Debe permitir:

- Registrar ruedas normales, deportivas y todoterreno.
- Crear juegos de cuatro ruedas.
- Consultar ruedas individuales.
- Consultar juegos disponibles.
- Actualizar sus propiedades.
- Eliminar ruedas no instaladas.
- Reservar cuatro ruedas para un vehículo.

Cada vehículo necesita exactamente cuatro ruedas.

Al extraer ruedas debe intentarse primero obtener cuatro del mismo tipo. Si se quiere conservar literalmente la lógica actual, se puede permitir como respaldo usar cuatro ruedas mezcladas. No obstante, desde el punto de vista de negocio, recomiendo exigir siempre cuatro del mismo tipo.

### 2.4. Gestión de trabajadores

Debe gestionar los siguientes tipos:

- Operario.
- Mecánico.
- Gestor de planta.
- Administrador de sistema.

Datos comunes:

- Nombre.
- Apellidos.
- DNI.
- Dirección.
- Número de Seguridad Social.
- Salario.
- Fecha de ingreso.
- Tipo de trabajador.

Datos específicos:

- Operario:
  - Montajes realizados.
  - Es eficiente si tiene más de 10.
  - Tarda 1 tick si es eficiente y 3 si no lo es.
- Mecánico:
  - Reparaciones realizadas.
  - Es eficiente si tiene más de 20.
  - Tarda 1 tick si es eficiente y entre 2 y 5 si no.
- Administrador:
  - Restauraciones realizadas.
- Gestor de planta:
  - Coordina altas de vehículos y reparaciones.

El DNI y el número de Seguridad Social deben ser únicos.

### 2.5. Gestión de vehículos

Tipos:

- Biplaza deportivo.
- Turismo.
- Furgoneta.

Datos:

- Tipo.
- Color.
- Número de plazas.
- Peso máximo autorizado.
- Tara.
- Estado de montaje.
- Motor instalado.
- Tapicería instalada.
- Cuatro ruedas.
- Posición en la cola.
- Fecha de creación y finalización.

Estados:

```java
public enum EstadoMontaje {
    CHASIS,
    MOTOR,
    TAPICERIA,
    RUEDAS,
    TERMINADO
}
```

Cada vehículo nuevo debe comenzar en `CHASIS`.

### 2.6. Cadena de montaje

El modelo actual tiene tres listas separadas:

- Biplazas.
- Turismos.
- Furgonetas.

En MySQL no son necesarias tres tablas. Se puede usar una tabla `vehicles` con una columna `vehicle_type`.

La cadena debe permitir:

- Encolar uno o varios vehículos.
- Consultar vehículos pendientes.
- Filtrar por tipo y estado.
- Consultar la posición en la cola.
- Retirar un vehículo que todavía no haya comenzado.
- Purgar conceptualmente los terminados.
- Conservar los vehículos terminados como histórico.

En base de datos no hay que borrar los terminados para “purgarlos”. Basta con consultar:

```sql
WHERE assembly_status <> 'TERMINADO'
```

### 2.7. Comprobación de stock

Antes de confirmar una orden de fabricación debe comprobarse:

- Un motor por vehículo.
- Una tapicería por vehículo.
- Cuatro ruedas por vehículo.

El resultado debe conservar el enum del proyecto:

```java
public enum StockCheckResult {
    OK,
    SIN_MOTORES,
    SIN_TAPICERIAS,
    SIN_RUEDAS
}
```

La operación de reservar stock debe ser transaccional y bloquear los registros seleccionados. De lo contrario, dos peticiones simultáneas podrían utilizar el mismo componente.

### 2.8. Dashboard

Los mensajes actuales de consola deben convertirse en eventos.

Cada evento debería guardar:

- Tipo: `INFO`, `CONFIRMATION`, `WARNING` o `ERROR`.
- Mensaje.
- Fecha.
- Orden de fabricación relacionada.
- Vehículo relacionado.
- Operario y estación relacionados, cuando corresponda.

Se pueden consultar mediante REST:

```text
GET /api/v1/dashboard/events
```

Y opcionalmente emitir en tiempo real mediante Server-Sent Events:

```text
GET /api/v1/dashboard/events/stream
```

### 2.9. Historial

Debe conservar:

- Alta de componentes.
- Actualización de componentes.
- Encolado de vehículos.
- Cambios de estado.
- Componentes instalados.
- Reserva y liberación de componentes.
- Confirmación, inicio y cancelación de órdenes.
- Vehículos terminados.
- Operaciones realizadas en cada estación.

Debe poder consultarse por fecha, intervalo de fechas, tipo de entidad, vehículo y orden de fabricación.

### 2.10. Estadísticas

Debe ofrecer:

- Stock actual.
- Vehículos pendientes por tipo.
- Vehículos terminados por tipo.
- Total de vehículos terminados.
- Operarios eficientes.
- Mecánicos eficientes.
- Operarios ordenados por nombre y apellidos.
- Operarios por productividad mínima.
- Vehículos por tipo de motor.
- Vehículos por tipo de tapicería.
- Vehículos terminados ordenados por tipo.
- Configuraciones más fabricadas.
- Órdenes por estado y porcentaje de progreso.
- Componentes reservados frente a disponibles.
- Historial diario.

## 3. Arquitectura recomendada

Usaría arquitectura por funcionalidades:

```text
src/main/java/com/practica/fabricavehiculos
├── GestionFabricaVehiculosApplication.java
├── common
│   ├── config
│   ├── exception
│   ├── response
│   └── event
├── component
│   ├── motor
│   ├── upholstery
│   ├── wheel
│   └── stock
├── worker
├── vehicle
├── productionorder
├── assembly
├── history
├── dashboard
└── simulation            # advanced, se implementa al final
```

Cada módulo debería contener, cuando corresponda:

```text
controller
dto
entity
mapper
repository
service
```

Ejemplo:

```text
vehicle
├── controller
│   └── VehicleController.java
├── dto
│   ├── CreateVehicleRequest.java
│   ├── VehicleResponse.java
│   └── UpdateVehicleRequest.java
├── entity
│   ├── Vehicle.java
│   ├── VehicleType.java
│   └── AssemblyStatus.java
├── repository
│   └── VehicleRepository.java
├── service
│   └── VehicleService.java
└── mapper
    └── VehicleMapper.java
```

## 4. Entidades JPA recomendadas

No conservaría una clase JPA distinta para cada motor, tapicería o vehículo, porque sus subtipos actuales no tienen atributos exclusivos. Usaría una tabla por concepto y un enum para el tipo.

### `MotorEntity`

```java
Long id;
MotorType type;
BigDecimal displacement;
Integer power;
Integer cylinderCount;
StockStatus stockStatus;
Long version;
Instant createdAt;
Instant updatedAt;
```

### `UpholsteryEntity`

```java
Long id;
UpholsteryType type;
String color;
BigDecimal squareMeters;
StockStatus stockStatus;
Long version;
Instant createdAt;
Instant updatedAt;
```

### `WheelEntity`

```java
Long id;
WheelType type;
Integer width;
Integer rimInches;
Integer loadIndex;
Integer speedCode;
StockStatus stockStatus;
Long version;
Instant createdAt;
Instant updatedAt;
```

### `WorkerEntity`

```java
Long id;
WorkerType workerType;
String firstName;
String lastName;
String dni;
String address;
String socialSecurityNumber;
BigDecimal salary;
LocalDate hireDate;
Integer assemblyCount;
Integer repairCount;
Integer restorationCount;
Long version;
```

### `VehicleEntity`

```java
Long id;
VehicleType vehicleType;
String color;
Integer seats;
BigDecimal maximumAuthorizedWeight;
BigDecimal tareWeight;
AssemblyStatus assemblyStatus;
Long queuePosition;
ProductionOrderLineEntity productionOrderLine;
MotorEntity motor;
UpholsteryEntity upholstery;
Instant createdAt;
Instant completedAt;
Long version;
```

Las cuatro ruedas se relacionan mediante `vehicle_wheels`.

### `ProductionOrderEntity`

```java
Long id;
String orderNumber;
ProductionOrderStatus status;
WorkerEntity plantManager;
List<ProductionOrderLineEntity> lines;
Instant confirmedAt;
Instant startedAt;
Instant completedAt;
Long version;
Instant createdAt;
Instant updatedAt;
```

### `ProductionOrderLineEntity`

```java
Long id;
ProductionOrderEntity order;
VehicleType vehicleType;
Integer quantity;
String color;
Integer seats;
BigDecimal maximumAuthorizedWeight;
BigDecimal tareWeight;
List<VehicleEntity> vehicles;
```

### `ComponentReservationEntity`

```java
Long id;
ProductionOrderEntity order;
MotorEntity motor;
UpholsteryEntity upholstery;
WheelEntity wheel;
ReservationStatus status;
Instant reservedAt;
Instant consumedAt;
Long version;
```

Cada reserva apunta exactamente a un motor, una tapicería o una rueda. La base de datos debe impedir que el mismo componente se reserve dos veces. Al cancelar se eliminan las reservas activas y el historial conserva la liberación; así un componente liberado puede reservarse en otra orden.

### `AssemblyOperationEntity`

```java
Long id;
VehicleEntity vehicle;
WorkerEntity operator;
AssemblyStatus fromStatus;
AssemblyStatus toStatus;
String installedComponentType;
Long installedComponentId;
Instant performedAt;
```

### `AssemblyHistoryEntity`

```java
Long id;
Instant occurredAt;
String entityType;
Long entityId;
String action;
String details;
VehicleEntity vehicle;
ProductionOrderEntity productionOrder;
WorkerEntity worker;
```

### `DashboardEventEntity`

```java
Long id;
EventLevel level;
String message;
Instant createdAt;
VehicleEntity vehicle;
ProductionOrderEntity productionOrder;
```

## 5. Endpoints REST completos

Todos los endpoints usan el prefijo `/api/v1`.

### Motores

| Método | Endpoint | Acción |
|---|---|---|
| `POST` | `/motors` | Crear motor |
| `GET` | `/motors` | Listar motores |
| `GET` | `/motors/{id}` | Obtener motor |
| `PATCH` | `/motors/{id}` | Actualizar motor |
| `DELETE` | `/motors/{id}` | Eliminar motor disponible |

Filtros: `GET /api/v1/motors?type=GASOLINA&status=AVAILABLE`.

### Tapicerías

| Método | Endpoint | Acción |
|---|---|---|
| `POST` | `/upholsteries` | Crear tapicería |
| `GET` | `/upholsteries` | Listar |
| `GET` | `/upholsteries/{id}` | Consultar |
| `PATCH` | `/upholsteries/{id}` | Actualizar |
| `DELETE` | `/upholsteries/{id}` | Eliminar si está disponible |

### Ruedas

| Método | Endpoint | Acción |
|---|---|---|
| `POST` | `/wheels` | Crear una rueda |
| `POST` | `/wheel-sets` | Crear uno o varios juegos de 4 |
| `GET` | `/wheels` | Listar |
| `GET` | `/wheels/{id}` | Consultar |
| `PATCH` | `/wheels/{id}` | Actualizar |
| `DELETE` | `/wheels/{id}` | Eliminar disponible |

Ejemplo de creación de juegos:

```json
{
  "type": "DEPORTIVO",
  "width": 245,
  "rimInches": 19,
  "loadIndex": 95,
  "speedCode": 270,
  "sets": 3
}
```

Esto crea 12 ruedas.

### Stock

| Método | Endpoint | Acción |
|---|---|---|
| `GET` | `/stock` | Resumen completo |
| `GET` | `/stock/check?vehicles=5` | Comprobar stock |
| `GET` | `/stock/motors` | Motores disponibles |
| `GET` | `/stock/upholsteries` | Tapicerías disponibles |
| `GET` | `/stock/wheels` | Ruedas disponibles |

Respuesta:

```json
{
  "availableMotors": 10,
  "availableUpholsteries": 8,
  "availableWheels": 36,
  "manufacturableVehicles": 8
}
```

### Trabajadores

| Método | Endpoint | Acción |
|---|---|---|
| `POST` | `/workers` | Crear trabajador |
| `GET` | `/workers` | Listar |
| `GET` | `/workers/{id}` | Consultar por ID |
| `GET` | `/workers/by-dni/{dni}` | Buscar por DNI |
| `PATCH` | `/workers/{id}` | Actualizar |
| `DELETE` | `/workers/{id}` | Eliminar |
| `GET` | `/workers/operators` | Listar operarios |
| `GET` | `/workers/mechanics` | Listar mecánicos |
| `GET` | `/workers/managers` | Listar gestores |
| `GET` | `/workers/administrators` | Listar administradores |
| `GET` | `/workers/operators/efficient` | Operarios eficientes |
| `GET` | `/workers/mechanics/efficient` | Mecánicos eficientes |

Filtros:

```text
GET /api/v1/workers?type=OPERARIO&name=Ana
GET /api/v1/workers/operators?sort=firstName,asc
GET /api/v1/workers/operators?minimumAssemblies=10&sort=assemblyCount,desc
```

### Vehículos y cadena

| Método | Endpoint | Acción |
|---|---|---|
| `POST` | `/vehicles` | Encolar vehículo |
| `POST` | `/vehicles/batch` | Encolar lote |
| `GET` | `/vehicles` | Listar |
| `GET` | `/vehicles/{id}` | Consultar |
| `PATCH` | `/vehicles/{id}` | Actualizar datos permitidos |
| `DELETE` | `/vehicles/{id}` | Retirar si no ha empezado |
| `GET` | `/assembly-line` | Estado de las cadenas |
| `GET` | `/assembly-line/pending` | Vehículos pendientes |
| `GET` | `/assembly-line/completed` | Vehículos terminados |

Ejemplo:

```json
{
  "vehicleType": "TURISMO",
  "color": "Rojo",
  "seats": 5,
  "maximumAuthorizedWeight": 2000.00,
  "tareWeight": 1450.00
}
```

### Órdenes de fabricación — mid-advanced

| Método | Endpoint | Acción |
|---|---|---|
| `POST` | `/production-orders` | Crear orden en borrador |
| `GET` | `/production-orders` | Listar y filtrar órdenes |
| `GET` | `/production-orders/{id}` | Consultar orden y progreso |
| `PATCH` | `/production-orders/{id}` | Editar cabecera en borrador |
| `POST` | `/production-orders/{id}/lines` | Añadir una línea |
| `PATCH` | `/production-orders/{id}/lines/{lineId}` | Modificar una línea |
| `DELETE` | `/production-orders/{id}/lines/{lineId}` | Eliminar una línea |
| `POST` | `/production-orders/{id}/confirm` | Validar y reservar stock |
| `POST` | `/production-orders/{id}/start` | Crear vehículos e iniciar fabricación |
| `POST` | `/production-orders/{id}/cancel` | Cancelar y liberar reservas |
| `GET` | `/production-orders/{id}/reservations` | Consultar componentes reservados |
| `GET` | `/production-orders/{id}/operations` | Consultar operaciones de montaje |

Petición:

```json
{
  "plantManagerId": 7,
  "lines": [
    {
      "vehicleType": "TURISMO",
      "quantity": 3,
      "color": "Rojo",
      "seats": 5,
      "maximumAuthorizedWeight": 2000.00,
      "tareWeight": 1450.00
    }
  ]
}
```

La creación devuelve `201 Created`. La confirmación devuelve `200 OK` con el resumen de reservas o `409 Conflict` si el stock es insuficiente.

### Operaciones de montaje — mid-advanced

| Método | Endpoint | Acción |
|---|---|---|
| `POST` | `/vehicles/{id}/assembly-operations` | Completar la estación actual |
| `GET` | `/vehicles/{id}/assembly-operations` | Consultar trazabilidad del vehículo |
| `GET` | `/assembly-operations` | Filtrar operaciones por operario, estación o fecha |

### Dashboard e historial

| Método | Endpoint | Acción |
|---|---|---|
| `GET` | `/dashboard/events` | Eventos |
| `GET` | `/dashboard/events/stream` | Eventos en tiempo real |
| `GET` | `/history` | Historial filtrable |
| `GET` | `/history/by-date?date=2026-11-10` | Historial diario |

### Informes

| Método | Endpoint | Acción |
|---|---|---|
| `GET` | `/reports/overview` | Resumen general |
| `GET` | `/reports/operator-productivity` | Productividad |
| `GET` | `/reports/completed-vehicles` | Vehículos terminados |
| `GET` | `/reports/configurations` | Configuraciones más ensambladas |

Filtros:

```text
GET /api/v1/reports/completed-vehicles?motorType=GASOLINA
GET /api/v1/reports/completed-vehicles?upholsteryType=CUERO
GET /api/v1/reports/operator-productivity?minimumAssemblies=10
```

### Administración

```text
DELETE /api/v1/admin/system-data
```

Este endpoint sustituye a `resetSistema()`. Debe estar protegido y exigir confirmación explícita. No conviene exponerlo públicamente sin Spring Security.

## 6. Métodos principales de los servicios

### `MotorService`

```java
MotorResponse create(CreateMotorRequest request);
Page<MotorResponse> findAll(MotorFilter filter, Pageable pageable);
MotorResponse findById(Long id);
MotorResponse update(Long id, UpdateMotorRequest request);
void delete(Long id);
MotorEntity reserveNextAvailable();
```

### `UpholsteryService`

```java
UpholsteryResponse create(CreateUpholsteryRequest request);
Page<UpholsteryResponse> findAll(UpholsteryFilter filter, Pageable pageable);
UpholsteryResponse findById(Long id);
UpholsteryResponse update(Long id, UpdateUpholsteryRequest request);
void delete(Long id);
UpholsteryEntity reserveNextAvailable();
```

### `WheelService`

```java
WheelResponse create(CreateWheelRequest request);
List<WheelResponse> createSets(CreateWheelSetRequest request);
Page<WheelResponse> findAll(WheelFilter filter, Pageable pageable);
WheelResponse update(Long id, UpdateWheelRequest request);
void delete(Long id);
List<WheelEntity> reserveSetOfFour();
```

### `StockService`

```java
StockSummaryResponse getSummary();
StockCheckResponse checkStock(int vehicleCount);
void validateStock(int vehicleCount);
ReservedComponents reserveComponentsForVehicle(Long vehicleId);
```

### `WorkerService`

```java
WorkerResponse create(CreateWorkerRequest request);
Page<WorkerResponse> findAll(WorkerFilter filter, Pageable pageable);
WorkerResponse findById(Long id);
WorkerResponse findByDni(String dni);
WorkerResponse update(Long id, UpdateWorkerRequest request);
void delete(Long id);
List<WorkerResponse> findEfficientOperators();
List<WorkerResponse> findEfficientMechanics();
List<WorkerResponse> findOperatorsByProductivity(int minimum);
void registerAssembly(Long operatorId);
void registerRepair(Long mechanicId);
void registerRestoration(Long administratorId);
```

### `VehicleService`

```java
VehicleResponse enqueue(CreateVehicleRequest request);
List<VehicleResponse> enqueueBatch(CreateVehicleBatchRequest request);
Page<VehicleResponse> findAll(VehicleFilter filter, Pageable pageable);
VehicleResponse findById(Long id);
VehicleResponse update(Long id, UpdateVehicleRequest request);
void removeFromQueue(Long id);
List<VehicleResponse> findPending();
List<VehicleResponse> findCompleted();
void advanceAssemblyStatus(Long vehicleId, AssemblyStatus nextStatus);
void markBrokenDown(Long vehicleId, int repairTime);
void repair(Long vehicleId, Long mechanicId);
```

### `ProductionOrderService`

```java
ProductionOrderResponse create(CreateProductionOrderRequest request);
ProductionOrderResponse findById(Long id);
Page<ProductionOrderSummaryResponse> findAll(
    ProductionOrderFilter filter,
    Pageable pageable
);
ProductionOrderResponse addLine(Long orderId, CreateOrderLineRequest request);
ProductionOrderResponse updateLine(Long orderId, Long lineId, UpdateOrderLineRequest request);
void removeLine(Long orderId, Long lineId);
ProductionOrderResponse confirm(Long orderId);
ProductionOrderResponse start(Long orderId);
ProductionOrderResponse cancel(Long orderId);
ProductionOrderProgressResponse getProgress(Long orderId);
```

### `AssemblyOperationService`

```java
AssemblyOperationResponse completeCurrentStation(
    Long vehicleId,
    CreateAssemblyOperationRequest request
);
List<AssemblyOperationResponse> findByVehicle(Long vehicleId);
Page<AssemblyOperationResponse> search(
    AssemblyOperationFilter filter,
    Pageable pageable
);
```

### `HistoryService`

```java
void register(HistoryCommand command);
Page<HistoryResponse> search(HistoryFilter filter, Pageable pageable);
List<HistoryResponse> findByDate(LocalDate date);
```

### `DashboardEventService`

```java
void publishInfo(String message, EventContext context);
void publishConfirmation(String message, EventContext context);
void publishWarning(String message, EventContext context);
void publishError(String message, EventContext context);
Page<DashboardEventResponse> search(EventFilter filter, Pageable pageable);
```

## 7. Configuración de `application.yml`

```yaml
spring:
  application:
    name: gestion-fabrica-vehiculos

  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:fabrica_vehiculos}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&useUnicode=true&characterEncoding=UTF-8
    username: ${DB_USERNAME:fabrica_app}
    password: ${DB_PASSWORD:fabrica_password}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      pool-name: FabricaHikariPool
      minimum-idle: 2
      maximum-pool-size: 10
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000

  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        format_sql: true
        jdbc:
          time_zone: UTC
          batch_size: 50
        order_inserts: true
        order_updates: true

  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
    validate-on-migrate: true

  jackson:
    default-property-inclusion: non_null
    time-zone: UTC

  mvc:
    problemdetails:
      enabled: true

server:
  port: ${SERVER_PORT:8080}
  servlet:
    context-path: /
  error:
    include-message: always
    include-binding-errors: always
    include-stacktrace: never

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when-authorized
  health:
    db:
      enabled: true

springdoc:
  swagger-ui:
    path: /swagger-ui.html
  api-docs:
    path: /v3/api-docs

app:
  production-orders:
    maximum-lines: ${PRODUCTION_ORDER_MAXIMUM_LINES:20}
    maximum-vehicles-per-line: ${PRODUCTION_ORDER_MAXIMUM_VEHICLES_PER_LINE:100}
    reservation-batch-size: ${PRODUCTION_ORDER_RESERVATION_BATCH_SIZE:50}

logging:
  level:
    root: INFO
    com.practica.fabricavehiculos: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE
```

En producción conviene quitar `org.hibernate.SQL: DEBUG` y `org.hibernate.orm.jdbc.bind: TRACE` porque pueden generar demasiados logs.

## 8. Docker Compose para MySQL

Archivo `compose.yaml`:

```yaml
services:
  mysql:
    image: mysql:8.4
    container_name: fabrica-vehiculos-mysql
    restart: unless-stopped

    environment:
      MYSQL_DATABASE: fabrica_vehiculos
      MYSQL_USER: fabrica_app
      MYSQL_PASSWORD: fabrica_password
      MYSQL_ROOT_PASSWORD: root_password
      TZ: UTC

    ports:
      - "3306:3306"

    volumes:
      - fabrica_mysql_data:/var/lib/mysql

    healthcheck:
      test:
        [
          "CMD-SHELL",
          "mysqladmin ping -h localhost -u root -p$$MYSQL_ROOT_PASSWORD --silent"
        ]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_0900_ai_ci
      - --default-time-zone=+00:00

volumes:
  fabrica_mysql_data:
```

Arranque:

```bash
docker compose up -d
```

Comprobación:

```bash
docker compose ps
```

La aplicación Spring Boot ejecutada desde tu equipo se conectará a `localhost:3306`. Si posteriormente metes también Spring Boot en Docker, el host pasará a ser el nombre del servicio: `DB_HOST=mysql`.

## 9. SQL completo para crear las tablas

Guarda este SQL como `src/main/resources/db/migration/V1__create_initial_schema.sql`. Flyway lo ejecutará automáticamente.

```sql
CREATE DATABASE IF NOT EXISTS fabrica_vehiculos
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE fabrica_vehiculos;

CREATE TABLE workers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    worker_type VARCHAR(30) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    social_security_number VARCHAR(30) NOT NULL,
    salary DECIMAL(12, 2) NOT NULL,
    hire_date DATE NOT NULL,
    assembly_count INT UNSIGNED NOT NULL DEFAULT 0,
    repair_count INT UNSIGNED NOT NULL DEFAULT 0,
    restoration_count INT UNSIGNED NOT NULL DEFAULT 0,
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_workers PRIMARY KEY (id),
    CONSTRAINT uk_workers_dni UNIQUE (dni),
    CONSTRAINT uk_workers_social_security UNIQUE (social_security_number),
    CONSTRAINT chk_workers_type CHECK (worker_type IN ('OPERARIO', 'MECANICO', 'GESTOR_PLANTA', 'ADMINISTRADOR_SISTEMA')),
    CONSTRAINT chk_workers_salary CHECK (salary >= 0)
);

CREATE INDEX idx_workers_type ON workers (worker_type);
CREATE INDEX idx_workers_name ON workers (first_name, last_name);
CREATE INDEX idx_workers_assembly_count ON workers (assembly_count);

CREATE TABLE motors (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    motor_type VARCHAR(20) NOT NULL,
    displacement DECIMAL(10, 2) NOT NULL,
    power INT UNSIGNED NOT NULL,
    cylinder_count INT UNSIGNED NOT NULL,
    stock_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_motors PRIMARY KEY (id),
    CONSTRAINT chk_motors_type CHECK (motor_type IN ('GASOLINA', 'ELECTRICO', 'HIBRIDO')),
    CONSTRAINT chk_motors_stock_status CHECK (stock_status IN ('AVAILABLE', 'RESERVED', 'INSTALLED')),
    CONSTRAINT chk_motors_displacement CHECK (displacement >= 0),
    CONSTRAINT chk_motors_power CHECK (power > 0),
    CONSTRAINT chk_motors_cylinders CHECK (cylinder_count >= 0)
);

CREATE INDEX idx_motors_stock ON motors (stock_status, motor_type);

CREATE TABLE upholsteries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    upholstery_type VARCHAR(20) NOT NULL,
    color VARCHAR(80) NOT NULL,
    square_meters DECIMAL(10, 2) NOT NULL,
    stock_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_upholsteries PRIMARY KEY (id),
    CONSTRAINT chk_upholsteries_type CHECK (upholstery_type IN ('TELA', 'CUERO', 'ALCANTARA')),
    CONSTRAINT chk_upholsteries_stock_status CHECK (stock_status IN ('AVAILABLE', 'RESERVED', 'INSTALLED')),
    CONSTRAINT chk_upholsteries_square_meters CHECK (square_meters > 0)
);

CREATE INDEX idx_upholsteries_stock ON upholsteries (stock_status, upholstery_type);

CREATE TABLE wheels (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    wheel_type VARCHAR(20) NOT NULL,
    width INT UNSIGNED NOT NULL,
    rim_inches INT UNSIGNED NOT NULL,
    load_index INT UNSIGNED NOT NULL,
    speed_code INT UNSIGNED NOT NULL,
    stock_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_wheels PRIMARY KEY (id),
    CONSTRAINT chk_wheels_type CHECK (wheel_type IN ('NORMAL', 'DEPORTIVO', 'TODOTERRENO')),
    CONSTRAINT chk_wheels_stock_status CHECK (stock_status IN ('AVAILABLE', 'RESERVED', 'INSTALLED')),
    CONSTRAINT chk_wheels_width CHECK (width > 0),
    CONSTRAINT chk_wheels_rim_inches CHECK (rim_inches > 0),
    CONSTRAINT chk_wheels_load_index CHECK (load_index > 0),
    CONSTRAINT chk_wheels_speed_code CHECK (speed_code > 0)
);

CREATE INDEX idx_wheels_stock ON wheels (stock_status, wheel_type);

CREATE TABLE vehicles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_type VARCHAR(30) NOT NULL,
    color VARCHAR(80) NOT NULL,
    seats INT UNSIGNED NOT NULL,
    maximum_authorized_weight DECIMAL(12, 2) NOT NULL,
    tare_weight DECIMAL(12, 2) NOT NULL,
    assembly_status VARCHAR(20) NOT NULL DEFAULT 'CHASIS',
    queue_position BIGINT UNSIGNED NOT NULL,
    motor_id BIGINT UNSIGNED NULL,
    upholstery_id BIGINT UNSIGNED NULL,
    completed_at TIMESTAMP(6) NULL,
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_vehicles PRIMARY KEY (id),
    CONSTRAINT uk_vehicles_motor UNIQUE (motor_id),
    CONSTRAINT uk_vehicles_upholstery UNIQUE (upholstery_id),
    CONSTRAINT fk_vehicles_motor FOREIGN KEY (motor_id) REFERENCES motors (id) ON DELETE RESTRICT,
    CONSTRAINT fk_vehicles_upholstery FOREIGN KEY (upholstery_id) REFERENCES upholsteries (id) ON DELETE RESTRICT,
    CONSTRAINT chk_vehicles_type CHECK (vehicle_type IN ('BIPLAZA_DEPORTIVO', 'TURISMO', 'FURGONETA')),
    CONSTRAINT chk_vehicles_status CHECK (assembly_status IN ('CHASIS', 'MOTOR', 'TAPICERIA', 'RUEDAS', 'TERMINADO')),
    CONSTRAINT chk_vehicles_seats CHECK (seats > 0),
    CONSTRAINT chk_vehicles_max_weight CHECK (maximum_authorized_weight > 0),
    CONSTRAINT chk_vehicles_tare CHECK (tare_weight > 0),
    CONSTRAINT chk_vehicles_weights CHECK (maximum_authorized_weight >= tare_weight)
);

CREATE INDEX idx_vehicles_line_queue ON vehicles (vehicle_type, assembly_status, queue_position);
CREATE INDEX idx_vehicles_status ON vehicles (assembly_status);
CREATE INDEX idx_vehicles_completed_at ON vehicles (completed_at);

CREATE TABLE vehicle_wheels (
    vehicle_id BIGINT UNSIGNED NOT NULL,
    wheel_id BIGINT UNSIGNED NOT NULL,
    wheel_position TINYINT UNSIGNED NOT NULL,
    CONSTRAINT pk_vehicle_wheels PRIMARY KEY (vehicle_id, wheel_position),
    CONSTRAINT uk_vehicle_wheels_wheel UNIQUE (wheel_id),
    CONSTRAINT fk_vehicle_wheels_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE,
    CONSTRAINT fk_vehicle_wheels_wheel FOREIGN KEY (wheel_id) REFERENCES wheels (id) ON DELETE RESTRICT,
    CONSTRAINT chk_vehicle_wheels_position CHECK (wheel_position BETWEEN 1 AND 4)
);

CREATE TABLE production_orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_number VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    plant_manager_id BIGINT UNSIGNED NULL,
    confirmed_at TIMESTAMP(6) NULL,
    started_at TIMESTAMP(6) NULL,
    completed_at TIMESTAMP(6) NULL,
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_production_orders PRIMARY KEY (id),
    CONSTRAINT uk_production_orders_number UNIQUE (order_number),
    CONSTRAINT fk_production_orders_manager FOREIGN KEY (plant_manager_id) REFERENCES workers (id) ON DELETE RESTRICT,
    CONSTRAINT chk_production_orders_status CHECK (status IN ('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_production_orders_status ON production_orders (status);
CREATE INDEX idx_production_orders_created_at ON production_orders (created_at);

CREATE TABLE production_order_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    production_order_id BIGINT UNSIGNED NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    color VARCHAR(80) NOT NULL,
    seats INT UNSIGNED NOT NULL,
    maximum_authorized_weight DECIMAL(12, 2) NOT NULL,
    tare_weight DECIMAL(12, 2) NOT NULL,
    CONSTRAINT pk_production_order_lines PRIMARY KEY (id),
    CONSTRAINT fk_order_lines_order FOREIGN KEY (production_order_id) REFERENCES production_orders (id) ON DELETE CASCADE,
    CONSTRAINT chk_order_lines_vehicle_type CHECK (vehicle_type IN ('BIPLAZA_DEPORTIVO', 'TURISMO', 'FURGONETA')),
    CONSTRAINT chk_order_lines_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_lines_seats CHECK (seats > 0),
    CONSTRAINT chk_order_lines_weights CHECK (maximum_authorized_weight >= tare_weight)
);

ALTER TABLE vehicles
    ADD COLUMN production_order_line_id BIGINT UNSIGNED NULL,
    ADD CONSTRAINT fk_vehicles_order_line FOREIGN KEY (production_order_line_id) REFERENCES production_order_lines (id) ON DELETE RESTRICT;

CREATE INDEX idx_vehicles_order_line ON vehicles (production_order_line_id);

CREATE TABLE component_reservations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    production_order_id BIGINT UNSIGNED NOT NULL,
    motor_id BIGINT UNSIGNED NULL,
    upholstery_id BIGINT UNSIGNED NULL,
    wheel_id BIGINT UNSIGNED NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    reserved_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    consumed_at TIMESTAMP(6) NULL,
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT pk_component_reservations PRIMARY KEY (id),
    CONSTRAINT uk_component_reservations_motor UNIQUE (motor_id),
    CONSTRAINT uk_component_reservations_upholstery UNIQUE (upholstery_id),
    CONSTRAINT uk_component_reservations_wheel UNIQUE (wheel_id),
    CONSTRAINT fk_reservations_order FOREIGN KEY (production_order_id) REFERENCES production_orders (id) ON DELETE RESTRICT,
    CONSTRAINT fk_reservations_motor FOREIGN KEY (motor_id) REFERENCES motors (id) ON DELETE RESTRICT,
    CONSTRAINT fk_reservations_upholstery FOREIGN KEY (upholstery_id) REFERENCES upholsteries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_reservations_wheel FOREIGN KEY (wheel_id) REFERENCES wheels (id) ON DELETE RESTRICT,
    CONSTRAINT chk_reservations_status CHECK (status IN ('RESERVED', 'CONSUMED')),
    CONSTRAINT chk_reservations_one_component CHECK (
        (motor_id IS NOT NULL) + (upholstery_id IS NOT NULL) + (wheel_id IS NOT NULL) = 1
    )
);

CREATE INDEX idx_component_reservations_order_status ON component_reservations (production_order_id, status);

CREATE TABLE assembly_operations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    operator_id BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(20) NOT NULL,
    to_status VARCHAR(20) NOT NULL,
    installed_component_type VARCHAR(20) NULL,
    installed_component_id BIGINT UNSIGNED NULL,
    performed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_assembly_operations PRIMARY KEY (id),
    CONSTRAINT fk_assembly_operations_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE RESTRICT,
    CONSTRAINT fk_assembly_operations_operator FOREIGN KEY (operator_id) REFERENCES workers (id) ON DELETE RESTRICT,
    CONSTRAINT chk_assembly_operations_from CHECK (from_status IN ('CHASIS', 'MOTOR', 'TAPICERIA', 'RUEDAS')),
    CONSTRAINT chk_assembly_operations_to CHECK (to_status IN ('MOTOR', 'TAPICERIA', 'RUEDAS', 'TERMINADO')),
    CONSTRAINT chk_assembly_operations_component_type CHECK (installed_component_type IS NULL OR installed_component_type IN ('MOTOR', 'TAPICERIA', 'RUEDA'))
);

CREATE INDEX idx_assembly_operations_vehicle_date ON assembly_operations (vehicle_id, performed_at);
CREATE INDEX idx_assembly_operations_operator_date ON assembly_operations (operator_id, performed_at);

CREATE TABLE assembly_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    action VARCHAR(150) NOT NULL,
    details VARCHAR(2000) NULL,
    vehicle_id BIGINT UNSIGNED NULL,
    production_order_id BIGINT UNSIGNED NULL,
    worker_id BIGINT UNSIGNED NULL,
    CONSTRAINT pk_assembly_history PRIMARY KEY (id),
    CONSTRAINT fk_history_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL,
    CONSTRAINT fk_history_order FOREIGN KEY (production_order_id) REFERENCES production_orders (id) ON DELETE SET NULL,
    CONSTRAINT fk_history_worker FOREIGN KEY (worker_id) REFERENCES workers (id) ON DELETE SET NULL
);

CREATE INDEX idx_history_occurred_at ON assembly_history (occurred_at);
CREATE INDEX idx_history_entity ON assembly_history (entity_type, entity_id);
CREATE INDEX idx_history_vehicle ON assembly_history (vehicle_id);
CREATE INDEX idx_history_order ON assembly_history (production_order_id);

CREATE TABLE dashboard_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_level VARCHAR(20) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    vehicle_id BIGINT UNSIGNED NULL,
    production_order_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_dashboard_events PRIMARY KEY (id),
    CONSTRAINT fk_dashboard_events_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL,
    CONSTRAINT fk_dashboard_events_order FOREIGN KEY (production_order_id) REFERENCES production_orders (id) ON DELETE SET NULL,
    CONSTRAINT chk_dashboard_events_level CHECK (event_level IN ('INFO', 'CONFIRMATION', 'WARNING', 'ERROR'))
);

CREATE INDEX idx_dashboard_events_created_at ON dashboard_events (created_at);
CREATE INDEX idx_dashboard_events_order ON dashboard_events (production_order_id);
```

## 10. Consultas SQL útiles

### Stock disponible

```sql
SELECT
    (SELECT COUNT(*) FROM motors WHERE stock_status = 'AVAILABLE') AS available_motors,
    (SELECT COUNT(*) FROM upholsteries WHERE stock_status = 'AVAILABLE') AS available_upholsteries,
    (SELECT COUNT(*) FROM wheels WHERE stock_status = 'AVAILABLE') AS available_wheels;
```

### Número máximo de vehículos fabricables

```sql
SELECT LEAST(
    (SELECT COUNT(*) FROM motors WHERE stock_status = 'AVAILABLE'),
    (SELECT COUNT(*) FROM upholsteries WHERE stock_status = 'AVAILABLE'),
    FLOOR((SELECT COUNT(*) FROM wheels WHERE stock_status = 'AVAILABLE') / 4)
) AS manufacturable_vehicles;
```

### Vehículos pendientes por tipo

```sql
SELECT vehicle_type, COUNT(*) AS pending_count
FROM vehicles
WHERE assembly_status <> 'TERMINADO'
GROUP BY vehicle_type
ORDER BY vehicle_type;
```

### Vehículos terminados por tipo

```sql
SELECT vehicle_type, COUNT(*) AS completed_count
FROM vehicles
WHERE assembly_status = 'TERMINADO'
GROUP BY vehicle_type
ORDER BY vehicle_type;
```

### Operarios eficientes

```sql
SELECT * FROM workers
WHERE worker_type = 'OPERARIO' AND assembly_count > 10
ORDER BY assembly_count DESC;
```

### Mecánicos eficientes

```sql
SELECT * FROM workers
WHERE worker_type = 'MECANICO' AND repair_count > 20
ORDER BY repair_count DESC;
```

### Buscar trabajador por DNI

```sql
SELECT * FROM workers WHERE dni = ?;
```

### Buscar operarios por nombre

```sql
SELECT * FROM workers
WHERE worker_type = 'OPERARIO'
  AND LOWER(first_name) LIKE LOWER(CONCAT('%', ?, '%'))
ORDER BY first_name, last_name;
```

### Historial por fecha

```sql
SELECT * FROM assembly_history
WHERE occurred_at >= ?
  AND occurred_at < DATE_ADD(?, INTERVAL 1 DAY)
ORDER BY occurred_at;
```

### Vehículos por motor

```sql
SELECT v.id, v.vehicle_type, v.color, v.assembly_status, m.motor_type, m.power
FROM vehicles v
JOIN motors m ON m.id = v.motor_id
WHERE v.assembly_status = 'TERMINADO' AND m.motor_type = ?
ORDER BY v.vehicle_type, v.id;
```

### Vehículos por tapicería

```sql
SELECT v.id, v.vehicle_type, v.color, u.upholstery_type, u.color AS upholstery_color
FROM vehicles v
JOIN upholsteries u ON u.id = v.upholstery_id
WHERE v.assembly_status = 'TERMINADO' AND u.upholstery_type = ?
ORDER BY v.vehicle_type, v.id;
```

### Configuraciones más ensambladas

```sql
SELECT
    v.vehicle_type,
    m.motor_type,
    u.upholstery_type,
    w.wheel_type,
    COUNT(DISTINCT v.id) AS assembled_units
FROM vehicles v
JOIN motors m ON m.id = v.motor_id
JOIN upholsteries u ON u.id = v.upholstery_id
JOIN vehicle_wheels vw ON vw.vehicle_id = v.id
JOIN wheels w ON w.id = vw.wheel_id
WHERE v.assembly_status = 'TERMINADO' AND vw.wheel_position = 1
GROUP BY v.vehicle_type, m.motor_type, u.upholstery_type, w.wheel_type
ORDER BY assembled_units DESC;
```

### Progreso de una orden de fabricación

```sql
SELECT
    po.id,
    po.order_number,
    po.status,
    COUNT(v.id) AS total_vehicles,
    SUM(v.assembly_status = 'TERMINADO') AS completed_vehicles,
    CASE
        WHEN COUNT(v.id) = 0 THEN 0
        ELSE ROUND(SUM(v.assembly_status = 'TERMINADO') * 100.0 / COUNT(v.id), 2)
    END AS progress_percentage
FROM production_orders po
LEFT JOIN production_order_lines pol ON pol.production_order_id = po.id
LEFT JOIN vehicles v ON v.production_order_line_id = pol.id
WHERE po.id = ?
GROUP BY po.id, po.order_number, po.status;
```

### Reservas activas por tipo de componente

```sql
SELECT
    production_order_id,
    SUM(motor_id IS NOT NULL) AS reserved_motors,
    SUM(upholstery_id IS NOT NULL) AS reserved_upholsteries,
    SUM(wheel_id IS NOT NULL) AS reserved_wheels
FROM component_reservations
WHERE status = 'RESERVED'
GROUP BY production_order_id
ORDER BY production_order_id;
```

## 11. Repositorios Spring Data necesarios

### `MotorRepository`

```java
public interface MotorRepository extends JpaRepository<MotorEntity, Long> {
    long countByStockStatus(StockStatus status);

    Page<MotorEntity> findByStockStatus(
        StockStatus status,
        Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select m
        from MotorEntity m
        where m.stockStatus = :status
        order by m.id
    """)
    List<MotorEntity> findAvailableForUpdate(
        @Param("status") StockStatus status,
        Pageable pageable
    );
}
```

Debe hacerse algo equivalente para tapicerías y ruedas.

### `WorkerRepository`

```java
Optional<WorkerEntity> findByDni(String dni);
boolean existsByDni(String dni);
boolean existsBySocialSecurityNumber(String number);
List<WorkerEntity> findByWorkerType(WorkerType type);
List<WorkerEntity> findByWorkerTypeAndFirstNameContainingIgnoreCase(WorkerType type, String name);
List<WorkerEntity> findByWorkerTypeAndAssemblyCountGreaterThanOrderByAssemblyCountDesc(
    WorkerType type,
    int minimum
);
```

### `VehicleRepository`

```java
Page<VehicleEntity> findByAssemblyStatusNot(
    AssemblyStatus status,
    Pageable pageable
);

Page<VehicleEntity> findByAssemblyStatus(
    AssemblyStatus status,
    Pageable pageable
);

long countByVehicleTypeAndAssemblyStatus(
    VehicleType type,
    AssemblyStatus status
);
```

### `ProductionOrderRepository`

```java
Optional<ProductionOrderEntity> findByOrderNumber(String orderNumber);
Page<ProductionOrderEntity> findByStatus(
    ProductionOrderStatus status,
    Pageable pageable
);

@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("""
    select po
    from ProductionOrderEntity po
    where po.id = :id
""")
Optional<ProductionOrderEntity> findByIdForUpdate(@Param("id") Long id);
```

### `ComponentReservationRepository`

```java
List<ComponentReservationEntity> findByProductionOrderIdAndStatus(
    Long orderId,
    ReservationStatus status
);

boolean existsByMotorIdAndStatus(Long motorId, ReservationStatus status);
boolean existsByUpholsteryIdAndStatus(Long upholsteryId, ReservationStatus status);
boolean existsByWheelIdAndStatus(Long wheelId, ReservationStatus status);

void deleteByProductionOrderIdAndStatus(
    Long orderId,
    ReservationStatus status
);
```

## 12. Validaciones necesarias

Los DTO de entrada deben usar Bean Validation.

```java
public record CreateVehicleRequest(
    @NotNull VehicleType vehicleType,

    @NotBlank
    @Size(max = 80)
    String color,

    @NotNull
    @Min(1)
    @Max(20)
    Integer seats,

    @NotNull
    @DecimalMin("1.00")
    BigDecimal maximumAuthorizedWeight,

    @NotNull
    @DecimalMin("1.00")
    BigDecimal tareWeight
) {}
```

Validaciones de negocio adicionales:

- Peso máximo mayor o igual que la tara.
- DNI único.
- Número de Seguridad Social único.
- No modificar componentes instalados.
- No eliminar componentes reservados o instalados.
- Una orden `DRAFT` debe contener al menos una línea antes de confirmarse.
- Solo las órdenes `DRAFT` pueden editar sus líneas.
- Confirmar una orden debe reservar todo el stock o no reservar nada.
- Solo una orden `CONFIRMED` puede iniciarse.
- Solo una orden `DRAFT` o `CONFIRMED` puede cancelarse.
- Cancelar una orden confirmada debe liberar sus componentes.
- Un vehículo solo puede avanzar al estado inmediatamente siguiente.
- El operario de una operación debe tener el perfil `OPERARIO`.
- Un vehículo terminado debe tener un motor, una tapicería y cuatro ruedas.
- Un componente no puede instalarse en dos vehículos.

## 13. Manejo de errores

Debe existir un `@RestControllerAdvice`.

Errores recomendados:

- `ResourceNotFoundException` → `404`.
- `DuplicateResourceException` → `409`.
- `InsufficientStockException` → `409`.
- `InvalidAssemblyTransitionException` → `409`.
- `InvalidProductionOrderTransitionException` → `409`.
- `ComponentAlreadyReservedException` → `409`.
- `ProductionOrderNotEditableException` → `409`.
- Errores de validación → `400`.
- Error inesperado → `500`.

Respuesta usando Problem Details:

```json
{
  "type": "https://api.fabrica/errors/insufficient-stock",
  "title": "Stock insuficiente",
  "status": 409,
  "detail": "No hay suficientes ruedas para fabricar 3 vehículos",
  "instance": "/api/v1/production-orders/15/confirm",
  "stockResult": "SIN_RUEDAS"
}
```

## 14. Aspectos del proyecto actual que deben corregirse

Durante la migración no conviene copiar literalmente algunos comportamientos actuales.

### Datos sin identificador

Las clases actuales no tienen ID. En backend todas las entidades persistentes necesitan un identificador.

### Simulación fuera del alcance mid-advanced

`Planificador.iniciarSimulacion()` bloquea el hilo y hace `Thread.sleep(1000)`. No se copiará en la primera versión del backend. La ruta mid-advanced usa órdenes y operaciones explícitas; la reconstrucción asíncrona del planificador pertenece al nivel advanced descrito en el capítulo 17.

### Concurrencia de stock

Las listas actuales no tienen problemas de peticiones concurrentes porque solo existe una consola. En REST pueden llegar varias peticiones a la vez. La reserva de componentes debe usar `@Transactional`, bloqueo pesimista o una estrategia equivalente y `@Version` para detectar modificaciones simultáneas.

### Búsqueda por DNI inconsistente

El método actual devuelve `"No encontrado"`, pero el menú comprueba si el resultado es `null`. En la API debe devolver `200` con el trabajador o `404` cuando no existe.

### Reinicio del sistema

El `resetSistema()` actual elimina también los observadores. En Spring los servicios y listeners son beans y no se deben eliminar. El reinicio solamente debe borrar datos persistentes de negocio.

### Vehículos terminados duplicados conceptualmente

Actualmente el vehículo terminado queda en la cadena hasta que se ejecuta `purgarTerminados()`, y además se añade a otra lista histórica. En MySQL debe existir un solo registro de vehículo cuyo estado cambia a `TERMINADO`.

### Ruedas del mismo tipo

La búsqueda actual depende parcialmente del orden de la lista. En SQL debe hacerse por tipo:

```sql
SELECT wheel_type
FROM wheels
WHERE stock_status = 'AVAILABLE'
GROUP BY wheel_type
HAVING COUNT(*) >= 4
ORDER BY MIN(id)
LIMIT 1;
```

Después se bloquean cuatro ruedas de ese tipo.

### Dashboard

Los eventos actuales solo se imprimen y se pierden. En backend deben persistirse para que otro cliente pueda consultarlos.

### Tipos de datos monetarios y pesos

En entidades JPA debe usarse `BigDecimal`, no `double`, especialmente para salarios, cilindrada si requiere decimales, metros cuadrados y pesos.

## 15. Orden recomendado de implementación

1. Crear proyecto Spring Boot.
2. Configurar Docker y MySQL.
3. Añadir Flyway y ejecutar el DDL.
4. Crear enums.
5. Crear entidades JPA.
6. Crear repositorios.
7. Crear DTO y validaciones.
8. Implementar trabajadores.
9. Implementar componentes.
10. Implementar stock transaccional.
11. Implementar vehículos y cadena.
12. Implementar historial y dashboard.
13. Implementar informes.
14. Implementar órdenes de fabricación en estado `DRAFT`.
15. Implementar confirmación y reserva transaccional de stock.
16. Implementar inicio, cancelación y liberación de reservas.
17. Implementar operaciones explícitas de montaje.
18. Añadir `@RestControllerAdvice`.
19. Documentar con OpenAPI.
20. Añadir tests unitarios.
21. Añadir tests de integración con Testcontainers.
22. Añadir Spring Security si se va a publicar.
23. Solo después, comenzar el sistema advanced de simulación.

Con este diseño se construye primero un backend persistente, transaccional y comprensible. Las órdenes de fabricación cubren un reto mid-advanced real sin mezclarlo prematuramente con concurrencia temporal y recuperación de procesos.

## 16. Nivel mid-advanced: órdenes de fabricación

La ampliación principal será un sistema de **órdenes de fabricación con reserva transaccional de stock y máquina de estados**. Sustituye a la simulación dentro del alcance mid-advanced y conecta catálogo, inventario, trabajadores, vehículos e historial en un único caso de uso.

### 16.1. Objetivo esperado

El usuario debe poder definir qué vehículos quiere fabricar, confirmar que existen componentes para todos, reservarlos sin riesgo de que otra petición los utilice y controlar el montaje hasta completar la orden.

Por ejemplo, una orden con tres turismos y una furgoneta necesita reservar en una sola operación:

```text
4 motores + 4 tapicerías + 16 ruedas
```

Si solo existen 15 ruedas, la confirmación completa debe fallar. No se conserva ningún motor ni ninguna tapicería parcialmente reservados.

Una orden contiene una o varias líneas. Cada línea indica el tipo de vehículo, la cantidad, el color, las plazas, la tara y el peso autorizado. La orden no crea vehículos ni modifica stock mientras está en borrador.

### 16.2. Modelo funcional

```text
ProductionOrder
├── ProductionOrderLine: 3 x TURISMO rojo
├── ProductionOrderLine: 1 x FURGONETA blanca
├── ComponentReservation: 4 motores
├── ComponentReservation: 4 tapicerías
├── ComponentReservation: 16 ruedas
└── Vehicle: 4 vehículos creados al iniciar
```

La orden es el agregado principal. Sus líneas describen lo que se quiere fabricar, las reservas garantizan los recursos y los vehículos representan las unidades reales en montaje.

### 16.3. Estados y transiciones

```java
public enum ProductionOrderStatus {
    DRAFT,
    CONFIRMED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
}
```

| Estado actual | Operación permitida | Estado resultante |
|---|---|---|
| `DRAFT` | Editar líneas | `DRAFT` |
| `DRAFT` | Confirmar y reservar | `CONFIRMED` |
| `DRAFT` | Cancelar | `CANCELLED` |
| `CONFIRMED` | Iniciar fabricación | `IN_PROGRESS` |
| `CONFIRMED` | Cancelar y liberar reservas | `CANCELLED` |
| `IN_PROGRESS` | Completar todos los vehículos | `COMPLETED` |

No se permiten saltos de estado, reabrir órdenes completadas ni cancelar directamente una orden que ya está en fabricación.

### 16.4. Flujo principal del objetivo

<ol class="order-flow" aria-label="Flujo principal de una orden de fabricación">
  <li><strong>Crear borrador</strong><span>Definir gestor y líneas de vehículos.</span></li>
  <li><strong>Confirmar</strong><span>Calcular necesidades y reservar todo el stock.</span></li>
  <li><strong>Iniciar</strong><span>Crear los vehículos y vincularlos a sus líneas.</span></li>
  <li><strong>Montar</strong><span>Registrar chasis, motor, tapicería y ruedas.</span></li>
  <li><strong>Completar</strong><span>Cerrar cuando todos los vehículos terminen.</span></li>
</ol>

```text
                ┌── stock insuficiente ──→ 409 Conflict ──→ continúa DRAFT
                │
DRAFT ── confirmar ──→ CONFIRMED ── iniciar ──→ IN_PROGRESS
  │                         │                         │
  │                         │                         └── todos terminados ──→ COMPLETED
  │                         │
  └── cancelar              └── cancelar
          │                         │
          └──────────────→ CANCELLED ←── liberar reservas
```

### 16.5. Confirmación transaccional

La confirmación es la operación más importante del nivel. Debe ejecutarse dentro de un único método `@Transactional`:

```java
@Transactional
public ProductionOrderResponse confirm(Long orderId) {
    ProductionOrder order = orderRepository.findByIdForUpdate(orderId)
        .orElseThrow(() -> new ProductionOrderNotFoundException(orderId));

    order.ensureCanBeConfirmed();
    StockRequirements requirements = calculator.calculate(order.getLines());
    reservationService.reserveAll(order, requirements);
    order.confirm();
    historyService.registerOrderConfirmed(order);

    return mapper.toResponse(order);
}
```

`reserveAll` debe bloquear los componentes seleccionados. Si no puede obtener todos los necesarios, lanza `InsufficientStockException`; Spring revierte las reservas y la orden continúa en `DRAFT`.

### 16.6. Inicio y creación de vehículos

Al iniciar una orden confirmada:

1. Se crea exactamente un vehículo por cada unidad solicitada en sus líneas.
2. Cada vehículo queda vinculado a `ProductionOrderLineEntity`.
3. Todos comienzan en `CHASIS`.
4. Los componentes siguen reservados hasta llegar a su estación.
5. La orden cambia a `IN_PROGRESS`.

Esta operación también debe ser idempotente: repetir la petición no puede crear vehículos duplicados.

### 16.7. Consumo y progreso

Cuando un vehículo completa una estación, consume el componente reservado correspondiente. La reserva pasa de `RESERVED` a `CONSUMED` y el componente de `RESERVED` a `INSTALLED`.

El progreso de la orden se calcula desde los vehículos, no se escribe manualmente:

```text
progreso = vehículos terminados / vehículos totales × 100
```

Ejemplo: si una orden tiene cuatro vehículos y uno está terminado, su progreso es `25 %`.

### 16.8. Cancelación

- Una orden `DRAFT` se cancela sin tocar inventario.
- Una orden `CONFIRMED` elimina sus reservas activas y devuelve los componentes a `AVAILABLE`.
- Una orden `IN_PROGRESS` no se cancela directamente porque puede tener componentes consumidos. Su reversión sería otro caso de uso de nivel advanced.
- `COMPLETED` y `CANCELLED` son estados finales.

### 16.9. Secuencia REST mínima

```text
POST /api/v1/production-orders                     → 201 Created, DRAFT
POST /api/v1/production-orders/{id}/lines          → 201 Created
POST /api/v1/production-orders/{id}/confirm        → 200 OK, CONFIRMED
POST /api/v1/production-orders/{id}/start          → 200 OK, IN_PROGRESS
POST /api/v1/vehicles/{id}/assembly-operations     → 201 Created
GET  /api/v1/production-orders/{id}                → progreso actualizado
```

### 16.10. Resultado final esperado

La funcionalidad estará terminada cuando pueda demostrarse que:

- Confirmar reserva exactamente un motor, una tapicería y cuatro ruedas por vehículo.
- El stock insuficiente produce `409 Conflict` sin reservas parciales.
- Dos confirmaciones simultáneas no reservan el mismo componente.
- Iniciar dos veces no crea vehículos duplicados.
- Un vehículo no puede saltarse estaciones.
- Cancelar una orden confirmada libera todo su stock.
- La orden se completa automáticamente cuando termina su último vehículo.
- Cada cambio queda registrado en el historial con fecha, usuario y entidad afectada.

### 16.11. Por qué es mid-advanced

- Modela relaciones `@OneToMany` y `@ManyToOne`.
- Separa entidad, DTO, mapper, repositorio, servicio y controlador.
- Usa `@Transactional` para confirmar o cancelar como una unidad indivisible.
- Usa bloqueos pesimistas para evitar reservas dobles.
- Usa `@Version` para detectar actualizaciones concurrentes.
- Implementa una máquina de estados y rechaza transiciones inválidas.
- Obliga a diseñar respuestas HTTP, validaciones y excepciones de negocio.
- Permite estadísticas reales sin introducir hilos, ticks ni aleatoriedad.

### 16.12. Operaciones de montaje explícitas

El backend no avanza vehículos automáticamente. Un operario o cliente REST registra cada operación:

```text
POST /api/v1/vehicles/{vehicleId}/assembly-operations
```

```json
{
  "station": "MOTOR",
  "operatorId": 12
}
```

El servicio valida el estado actual, instala el componente reservado, incrementa los montajes del operario, cambia el vehículo al estado siguiente y registra el historial dentro de la misma transacción.

## 17. Nivel advanced: sistema completo de simulación

> **Nivel advanced. No forma parte de la primera implementación.** Empieza este capítulo únicamente cuando funcionen las órdenes de fabricación, las reservas, las operaciones de montaje, las excepciones y su persistencia.

La simulación original sigue siendo un objetivo válido, pero exige resolver problemas que van más allá de un CRUD avanzado: ejecución en segundo plano, concurrencia, recuperación tras reinicios, coordinación de recursos y emisión de eventos en tiempo real.

### 17.1. Qué debe simular

- Tres líneas de producción: biplaza, turismo y furgoneta.
- Cuatro estaciones por línea: chasis, motor, tapicería y ruedas.
- Un robot por estación y un vehículo máximo por robot.
- Duración de tareas según la eficiencia del operario.
- Consumo de las reservas creadas por una orden de fabricación.
- Nivel simple sin incidencias.
- Nivel complejo con averías y mecánicos.
- Nivel muy complejo con averías, apagón y administrador.
- Límite configurable de ticks y posibilidad de cancelación.
- Historial persistente de cada transición y cada incidencia.

```java
public enum SimulationType {
    SIMPLE,
    COMPLEX,
    VERY_COMPLEX
}

public enum SimulationStatus {
    PENDING,
    RUNNING,
    PAUSED,
    COMPLETED,
    FAILED,
    CANCELLED
}
```

### 17.2. Arquitectura advanced

No se ejecuta un bucle con `Thread.sleep()` dentro del controlador. El flujo correcto es:

1. `POST /api/v1/simulations` crea una ejecución y devuelve `202 Accepted`.
2. Un `TaskScheduler` o worker procesa un tick fuera del hilo HTTP.
3. Cada tick abre una transacción corta y bloquea únicamente los vehículos y robots que modifica.
4. El estado de robots, incidencias y contadores se guarda en MySQL.
5. Si la aplicación se reinicia, recupera ejecuciones `RUNNING` y continúa desde el último tick confirmado.
6. Los eventos se publican mediante SSE sin convertir SSE en la fuente de verdad.
7. El cliente puede consultar, pausar, reanudar o cancelar la ejecución.

Entidades adicionales:

- `SimulationExecutionEntity`.
- `SimulationRobotEntity`.
- `SimulationMechanicAssignmentEntity`.
- `SimulationIncidentEntity`.
- `SimulationEventEntity`.

### 17.3. API advanced

| Método | Endpoint | Acción |
|---|---|---|
| `POST` | `/simulations` | Crear e iniciar una simulación |
| `GET` | `/simulations` | Listar ejecuciones |
| `GET` | `/simulations/{id}` | Consultar estado y tick |
| `GET` | `/simulations/{id}/robots` | Consultar estaciones y ocupación |
| `GET` | `/simulations/{id}/incidents` | Consultar averías y apagones |
| `GET` | `/simulations/{id}/events` | Consultar eventos persistidos |
| `GET` | `/simulations/{id}/stream` | Recibir eventos por SSE |
| `POST` | `/simulations/{id}/pause` | Pausar de forma segura |
| `POST` | `/simulations/{id}/resume` | Reanudar |
| `POST` | `/simulations/{id}/cancel` | Cancelar |

### 17.4. Reglas advanced

- Solo puede existir una simulación activa para una misma orden.
- Una simulación compleja requiere al menos un mecánico.
- Una simulación muy compleja requiere mecánico y administrador.
- Un robot no puede trabajar sobre dos vehículos.
- Un vehículo averiado no avanza hasta quedar reparado.
- Durante un apagón ninguna estación trabaja.
- Procesar dos veces el mismo tick debe ser idempotente.
- Un fallo a mitad de tick debe revertir todo ese tick.
- Los eventos solo se publican después del commit de la transacción.
- El scheduler no debe depender del estado guardado únicamente en memoria.

### 17.5. Por qué es advanced

- Coordina procesos asíncronos y peticiones HTTP simultáneas.
- Necesita idempotencia, bloqueos y límites transaccionales precisos.
- Debe recuperarse tras detener y arrancar la aplicación.
- Gestiona recursos compartidos: robots, mecánicos, vehículos y stock.
- Combina scheduler, persistencia, eventos y SSE.
- Requiere pruebas con reloj controlable; no conviene depender de segundos reales.

El sistema advanced reutiliza las órdenes de fabricación del nivel mid-advanced. Así no se repite la lógica de stock: la orden decide qué fabricar y reserva los componentes; la simulación decide cuándo progresa cada vehículo.

## 18. Resultado final

El resultado será una API modular para gestionar la fábrica desde la entrada de componentes hasta la finalización de vehículos, con una ampliación advanced para automatizar la cadena mediante simulaciones persistentes.

### 18.1. Arquitectura final esperada

```text
Cliente REST / Swagger / futura interfaz web
                       │
                       ▼
              Spring Web MVC API
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
  Controladores     Servicios       Seguridad
       │               │
       │        reglas y transacciones
       │               │
       └───────────────┼────────────────┐
                       ▼                ▼
                 Spring Data JPA     Eventos
                       │                │
                       ▼                ▼
                    MySQL       Historial / SSE
```

### 18.2. Mapa interactivo de APIs

La gráfica Three.js representa el backend central y sus APIs. Selecciona un módulo para ver sus endpoints, su responsabilidad y el flujo que debe cumplir. Los nodos pequeños representan operaciones HTTP; las conexiones muestran qué módulo las coordina.

<div class="api-graph" data-api-graph>
  <div class="api-graph-heading">
    <p class="api-graph-title">Mapa tridimensional del backend</p>
    <p>Explora la arquitectura y abre cada endpoint para consultar su contrato.</p>
  </div>
  <div class="api-graph-toolbar">
    <label class="api-search"><span>Buscar endpoint</span><input type="search" data-api-search name="api-search" placeholder="Ejemplo: confirm, stock, vehicles…" autocomplete="off"></label>
    <label class="api-method-filter"><span>Método</span><select data-api-method name="api-method"><option value="ALL">Todos</option><option value="GET">GET</option><option value="POST">POST</option><option value="PATCH">PATCH</option><option value="DELETE">DELETE</option></select></label>
    <button type="button" class="api-reset" data-api-reset>Ver arquitectura completa</button>
  </div>
  <div class="api-graph-controls" data-api-controls role="group" aria-label="Seleccionar módulo API"></div>
  <div class="api-graph-layout">
    <div class="api-graph-stage">
      <canvas data-api-canvas role="img" aria-label="Gráfica tridimensional de módulos y endpoints de FactoryFlow"></canvas>
      <p class="api-graph-tooltip" data-api-tooltip hidden></p>
      <div class="api-graph-legend" aria-label="Leyenda de métodos HTTP"><span data-method="GET">GET</span><span data-method="POST">POST</span><span data-method="PATCH">PATCH</span><span data-method="DELETE">DELETE</span></div>
    </div>
    <aside class="api-graph-detail" aria-live="polite" aria-atomic="true">
      <div class="api-module-summary">
        <p class="api-detail-level" data-api-level></p>
        <h3 data-api-title>Selecciona una API</h3>
        <p data-api-purpose>La información del módulo aparecerá aquí.</p>
        <p class="api-detail-flow" data-api-flow></p>
      </div>
      <div class="api-detail-workspace">
        <div class="api-endpoint-list" data-api-endpoints aria-label="Endpoints del módulo"></div>
        <section class="api-contract" data-api-contract aria-labelledby="api-contract-title">
          <header><span data-api-contract-method></span><code data-api-contract-path></code></header>
          <h4 id="api-contract-title" data-api-contract-title>Contrato del endpoint</h4>
          <p data-api-contract-description></p>
          <dl><div><dt>Respuesta correcta</dt><dd data-api-contract-status></dd></div><div><dt>Errores previstos</dt><dd data-api-contract-errors></dd></div></dl>
          <div class="api-contract-code" data-api-request-block><p><span>Petición</span><button type="button" data-api-copy="request">Copiar</button></p><pre><code data-api-contract-request></code></pre></div>
          <div class="api-contract-code"><p><span>Respuesta</span><button type="button" data-api-copy="response">Copiar</button></p><pre><code data-api-contract-response></code></pre></div>
        </section>
      </div>
    </aside>
  </div>
  <p class="api-graph-help">Selecciona módulos y endpoints con el puntero o utiliza los controles de teclado. La vista 3D y el inspector muestran el mismo contrato.</p>
</div>

### 18.3. Responsabilidad de cada API

| API | Nivel | Qué debe hacer | Resultado correcto |
|---|---|---|---|
| Componentes | Fácil-mid | Gestionar motores, tapicerías y juegos de ruedas | Componentes válidos y disponibles para el stock |
| Trabajadores | Fácil-mid | Gestionar operarios, mecánicos, gestores y administradores | Personal identificado por DNI y perfil |
| Stock | Mid | Consultar disponibilidad y controlar estados de componentes | Nunca mostrar como disponible un componente reservado o instalado |
| Vehículos | Mid | Crear, consultar y controlar el estado de montaje | Vehículos persistidos con una transición válida |
| Órdenes | Mid-advanced | Definir lotes de fabricación, confirmar, iniciar y cancelar | Reservar todo el stock o no reservar nada |
| Montaje | Mid-advanced | Registrar cada estación y consumir su reserva | Instalar componentes sin saltos ni duplicados |
| Historial | Mid | Conservar operaciones, responsables y fechas | Trazabilidad completa y consultable |
| Dashboard | Mid-advanced | Exponer eventos y el estado actual de la planta | Información actualizada sin ser la fuente de verdad |
| Informes | Mid-advanced | Calcular stock, productividad, configuraciones y progreso | Métricas derivadas de datos persistidos |
| Administración | Advanced | Proteger operaciones destructivas y configuración | Acciones restringidas, confirmadas y auditadas |
| Simulación | Advanced | Automatizar robots, ticks, averías, apagones y recuperación | Ejecución asíncrona, persistente e idempotente |

### 18.4. Flujos que deben funcionar al finalizar

#### Flujo de inventario

```text
Registrar componente → AVAILABLE → reservar → RESERVED → instalar → INSTALLED
```

#### Flujo de fabricación

```text
Crear orden → confirmar stock → iniciar → crear vehículos
→ completar estaciones → terminar vehículos → completar orden
```

#### Flujo de cancelación

```text
Orden confirmada → cancelar → eliminar reservas activas
→ componentes AVAILABLE → orden CANCELLED
```

#### Flujo advanced

```text
Orden confirmada → iniciar simulación → procesar ticks
→ resolver incidencias → terminar vehículos → publicar eventos
→ persistir resultado → recuperar ejecución si la aplicación se reinicia
```

### 18.5. Criterios de finalización

El proyecto estará completo cuando:

- Todas las APIs de la gráfica tengan controlador, servicio, DTO, repositorio y documentación OpenAPI.
- Las migraciones Flyway puedan crear una base vacía sin intervención manual.
- Docker Compose permita arrancar MySQL y el backend.
- El stock nunca quede negativo ni pueda reservarse dos veces.
- Las órdenes respeten su máquina de estados.
- Los vehículos consuman exactamente un motor, una tapicería y cuatro ruedas.
- El historial permita reconstruir qué ocurrió y quién lo hizo.
- Las operaciones protegidas respeten sus roles.
- La simulación advanced pueda detenerse y continuar sin perder su estado.
- Las pruebas unitarias, de integración y concurrencia pasen en integración continua.
