# Propuesta de migración completa a Spring Boot

El proyecto actual es una aplicación Java/BlueJ por consola que mantiene todos los datos en memoria mediante `ArrayList`.

La aplicación gestiona:

- Motores, tapicerías y ruedas.
- Stock de componentes.
- Vehículos pendientes y terminados.
- Trabajadores con cuatro perfiles diferentes.
- Tres cadenas de montaje.
- Robots y estaciones de montaje.
- Simulaciones simples, complejas y muy complejas.
- Averías, mecánicos y apagones.
- Dashboard de eventos.
- Historial y estadísticas.

La migración correcta no consiste solamente en añadir anotaciones JPA a las clases existentes. Hay que sustituir:

- El menú de consola por una API REST.
- Los `ArrayList` por MySQL.
- El patrón observador en memoria por eventos persistidos y, opcionalmente, SSE.
- El `Thread.sleep(1000)` por una simulación asíncrona.
- Los índices de listas por identificadores persistentes.
- Las modificaciones directas de objetos por servicios transaccionales.

## 1. Configuración de Spring Initializr

Usaría esta configuración:

| Campo | Valor |
|---|---|
| Project | Maven |
| Language | Java |
| Spring Boot | Última versión estable de Spring Boot 3.5.x |
| Group | `com.practica` |
| Artifact | `gestion-fabrica-vehiculos` |
| Name | `GestionFabricaVehiculos` |
| Description | Backend para la gestión y simulación de una fábrica de vehículos |
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
- **Spring Boot Actuator**.
- **Lombok**.
- **Spring Boot DevTools**.
- **Spring Configuration Processor**.

Para pruebas:

- **Spring Boot Starter Test**.
- **Testcontainers**.
- **Testcontainers MySQL**.

Añadiría manualmente al `pom.xml`:

- `springdoc-openapi-starter-webmvc-ui` para Swagger/OpenAPI.
- `org.testcontainers:mysql`.
- Opcionalmente MapStruct para los mapeos entidad/DTO.

### Dependencias que no incluiría inicialmente

No añadiría Spring Security en la primera migración porque el programa actual no tiene usuarios ni autenticación.

En una segunda fase sí sería aconsejable proteger especialmente:

- Reinicio completo del sistema.
- Eliminación de trabajadores.
- Eliminación de stock.
- Inicio o cancelación de simulaciones.
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
- Averiado.
- Tiempo de reparación restante.
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

Antes de encolar o simular vehículos debe comprobarse:

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

### 2.8. Simulaciones

Tipos:

```java
public enum SimulationType {
    SIMPLE,
    COMPLEJA,
    MUY_COMPLEJA
}
```

Estados de una ejecución:

```java
public enum SimulationStatus {
    PENDING,
    RUNNING,
    COMPLETED,
    FAILED,
    CANCELLED
}
```

#### Simulación simple

- No genera averías.
- Los vehículos avanzan por chasis, motor, tapicería, ruedas y terminado.
- Consume stock.
- Incrementa los montajes de los operarios.
- Registra el historial.

#### Simulación compleja

Además:

- Requiere al menos un mecánico.
- Genera averías.
- Los vehículos averiados quedan detenidos.
- Un mecánico repara el vehículo.
- Se incrementa su contador de reparaciones.
- Si existe gestor de planta, debe participar en el flujo.

#### Simulación muy compleja

Además:

- Requiere un administrador.
- Genera un apagón a partir del tercer tick.
- El sistema de gestión tarda 2 ticks en restaurarse.
- Las cadenas tardan 3 ticks en restaurarse.
- La producción se detiene durante el apagón.
- Se incrementa el contador de restauraciones del administrador.

### 2.9. Ejecución asíncrona

No se debe trasladar directamente esto a un controlador:

```java
Thread.sleep(1000);
```

Una petición HTTP no debería quedar bloqueada hasta 500 segundos.

El flujo recomendado es:

1. `POST /api/v1/simulations`.
2. Validar requisitos.
3. Crear una ejecución con estado `PENDING`.
4. Devolver `202 Accepted` y el ID.
5. Un `TaskScheduler` ejecuta un tick cada segundo.
6. Cada tick usa su propia transacción.
7. El cliente consulta estado, progreso, eventos y vehículos.
8. Cuando termina, la ejecución pasa a `COMPLETED`.

Respuesta inicial de ejemplo:

```json
{
  "simulationId": 15,
  "status": "PENDING",
  "type": "COMPLEJA"
}
```

El tiempo del tick debería ser configurable. Para pruebas puede establecerse en 10 ms y en desarrollo en 1000 ms.

### 2.10. Dashboard

Los mensajes actuales de consola deben convertirse en eventos.

Cada evento debería guardar:

- Tipo: `INFO`, `CONFIRMATION`, `WARNING` o `ERROR`.
- Mensaje.
- Fecha.
- Simulación relacionada.
- Vehículo relacionado.
- Tick de simulación.

Se pueden consultar mediante REST:

```text
GET /api/v1/dashboard/events
```

Y opcionalmente emitir en tiempo real mediante Server-Sent Events:

```text
GET /api/v1/dashboard/events/stream
```

### 2.11. Historial

Debe conservar:

- Alta de componentes.
- Actualización de componentes.
- Encolado de vehículos.
- Cambios de estado.
- Componentes instalados.
- Averías.
- Reparaciones.
- Apagones y restauraciones.
- Vehículos terminados.
- Inicio, cancelación y finalización de simulaciones.

Debe poder consultarse por fecha, intervalo de fechas, tipo de entidad, vehículo y simulación.

### 2.12. Estadísticas

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
├── simulation
├── history
└── dashboard
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
Boolean brokenDown;
Integer repairTimeRemaining;
Long queuePosition;
MotorEntity motor;
UpholsteryEntity upholstery;
Instant createdAt;
Instant completedAt;
Long version;
```

Las cuatro ruedas se relacionan mediante `vehicle_wheels`.

### `SimulationExecutionEntity`

```java
Long id;
SimulationType type;
SimulationStatus status;
Integer currentTick;
Integer maxTicks;
Boolean powerOutage;
Boolean managementSystemBlocked;
Integer managementRepairTimeRemaining;
Integer assemblyLinesRepairTimeRemaining;
Boolean powerOutageGenerated;
WorkerEntity manager;
WorkerEntity administrator;
Instant startedAt;
Instant finishedAt;
String errorMessage;
Long version;
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
SimulationExecutionEntity simulation;
Integer simulationTick;
```

### `DashboardEventEntity`

```java
Long id;
EventLevel level;
String message;
Instant createdAt;
VehicleEntity vehicle;
SimulationExecutionEntity simulation;
Integer simulationTick;
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

### Simulaciones

| Método | Endpoint | Acción |
|---|---|---|
| `POST` | `/simulations` | Iniciar simulación |
| `GET` | `/simulations` | Listar ejecuciones |
| `GET` | `/simulations/{id}` | Consultar estado |
| `GET` | `/simulations/{id}/events` | Consultar eventos |
| `GET` | `/simulations/{id}/robots` | Consultar estaciones |
| `POST` | `/simulations/{id}/cancel` | Cancelar |
| `GET` | `/simulations/{id}/stream` | Eventos SSE opcionales |

Petición:

```json
{
  "type": "MUY_COMPLEJA"
}
```

Debe devolver `202 Accepted`.

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

### `SimulationService`

```java
SimulationResponse start(StartSimulationRequest request);
SimulationResponse findById(Long id);
Page<SimulationResponse> findAll(Pageable pageable);
void cancel(Long id);
void executeTick(Long simulationId);
void resolveIncidents(SimulationExecution simulation);
void processAssemblyLines(SimulationExecution simulation);
void generateEvents(SimulationExecution simulation);
boolean isFinished(Long simulationId);
void complete(Long simulationId);
void fail(Long simulationId, Exception exception);
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
  simulation:
    tick-duration-ms: ${SIMULATION_TICK_DURATION_MS:1000}
    max-ticks: ${SIMULATION_MAX_TICKS:500}
    initial-breakdowns-per-line: 2
    maximum-breakdowns-complex: 2
    maximum-breakdowns-very-complex: 3
    random-breakdown-probability: 0.15
    power-outage-start-tick: 3
    management-recovery-ticks: 2
    assembly-lines-recovery-ticks: 3

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
    broken_down BOOLEAN NOT NULL DEFAULT FALSE,
    repair_time_remaining INT NOT NULL DEFAULT 0,
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
    CONSTRAINT chk_vehicles_weights CHECK (maximum_authorized_weight >= tare_weight),
    CONSTRAINT chk_vehicles_repair_time CHECK (repair_time_remaining >= -1)
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

CREATE TABLE simulation_executions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    simulation_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    current_tick INT UNSIGNED NOT NULL DEFAULT 0,
    max_ticks INT UNSIGNED NOT NULL DEFAULT 500,
    power_outage BOOLEAN NOT NULL DEFAULT FALSE,
    management_system_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    management_repair_time_remaining INT UNSIGNED NOT NULL DEFAULT 0,
    assembly_lines_repair_time_remaining INT UNSIGNED NOT NULL DEFAULT 0,
    power_outage_generated BOOLEAN NOT NULL DEFAULT FALSE,
    manager_id BIGINT UNSIGNED NULL,
    administrator_id BIGINT UNSIGNED NULL,
    started_at TIMESTAMP(6) NULL,
    finished_at TIMESTAMP(6) NULL,
    error_message VARCHAR(1000) NULL,
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_simulation_executions PRIMARY KEY (id),
    CONSTRAINT fk_simulations_manager FOREIGN KEY (manager_id) REFERENCES workers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_simulations_administrator FOREIGN KEY (administrator_id) REFERENCES workers (id) ON DELETE RESTRICT,
    CONSTRAINT chk_simulations_type CHECK (simulation_type IN ('SIMPLE', 'COMPLEJA', 'MUY_COMPLEJA')),
    CONSTRAINT chk_simulations_status CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

CREATE INDEX idx_simulations_status ON simulation_executions (status);
CREATE INDEX idx_simulations_created_at ON simulation_executions (created_at);

CREATE TABLE simulation_mechanics (
    simulation_id BIGINT UNSIGNED NOT NULL,
    mechanic_id BIGINT UNSIGNED NOT NULL,
    assignment_order INT UNSIGNED NOT NULL,
    CONSTRAINT pk_simulation_mechanics PRIMARY KEY (simulation_id, mechanic_id),
    CONSTRAINT uk_simulation_mechanic_order UNIQUE (simulation_id, assignment_order),
    CONSTRAINT fk_simulation_mechanics_simulation FOREIGN KEY (simulation_id) REFERENCES simulation_executions (id) ON DELETE CASCADE,
    CONSTRAINT fk_simulation_mechanics_worker FOREIGN KEY (mechanic_id) REFERENCES workers (id) ON DELETE RESTRICT
);

CREATE TABLE simulation_robots (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    simulation_id BIGINT UNSIGNED NOT NULL,
    line_type VARCHAR(30) NOT NULL,
    station_type VARCHAR(20) NOT NULL,
    robot_name VARCHAR(150) NOT NULL,
    operator_id BIGINT UNSIGNED NULL,
    synthetic_operator_name VARCHAR(200) NULL,
    current_vehicle_id BIGINT UNSIGNED NULL,
    remaining_ticks INT UNSIGNED NOT NULL DEFAULT 0,
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT pk_simulation_robots PRIMARY KEY (id),
    CONSTRAINT uk_simulation_robot_station UNIQUE (simulation_id, line_type, station_type),
    CONSTRAINT fk_simulation_robots_simulation FOREIGN KEY (simulation_id) REFERENCES simulation_executions (id) ON DELETE CASCADE,
    CONSTRAINT fk_simulation_robots_operator FOREIGN KEY (operator_id) REFERENCES workers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_simulation_robots_vehicle FOREIGN KEY (current_vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL,
    CONSTRAINT chk_simulation_robots_line CHECK (line_type IN ('BIPLAZA_DEPORTIVO', 'TURISMO', 'FURGONETA')),
    CONSTRAINT chk_simulation_robots_station CHECK (station_type IN ('CHASIS', 'MOTOR', 'TAPICERIA', 'RUEDAS'))
);

CREATE INDEX idx_simulation_robots_simulation ON simulation_robots (simulation_id);

CREATE TABLE assembly_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    action VARCHAR(150) NOT NULL,
    details VARCHAR(2000) NULL,
    vehicle_id BIGINT UNSIGNED NULL,
    simulation_id BIGINT UNSIGNED NULL,
    simulation_tick INT UNSIGNED NULL,
    CONSTRAINT pk_assembly_history PRIMARY KEY (id),
    CONSTRAINT fk_history_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL,
    CONSTRAINT fk_history_simulation FOREIGN KEY (simulation_id) REFERENCES simulation_executions (id) ON DELETE SET NULL
);

CREATE INDEX idx_history_occurred_at ON assembly_history (occurred_at);
CREATE INDEX idx_history_entity ON assembly_history (entity_type, entity_id);
CREATE INDEX idx_history_vehicle ON assembly_history (vehicle_id);
CREATE INDEX idx_history_simulation ON assembly_history (simulation_id, simulation_tick);

CREATE TABLE dashboard_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_level VARCHAR(20) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    vehicle_id BIGINT UNSIGNED NULL,
    simulation_id BIGINT UNSIGNED NULL,
    simulation_tick INT UNSIGNED NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_dashboard_events PRIMARY KEY (id),
    CONSTRAINT fk_dashboard_events_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL,
    CONSTRAINT fk_dashboard_events_simulation FOREIGN KEY (simulation_id) REFERENCES simulation_executions (id) ON DELETE SET NULL,
    CONSTRAINT chk_dashboard_events_level CHECK (event_level IN ('INFO', 'CONFIRMATION', 'WARNING', 'ERROR'))
);

CREATE INDEX idx_dashboard_events_created_at ON dashboard_events (created_at);
CREATE INDEX idx_dashboard_events_simulation ON dashboard_events (simulation_id, simulation_tick);
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
- No encolar si no hay stock suficiente, si se quiere conservar la regla actual.
- No iniciar simulación sin vehículos pendientes.
- Simulación compleja requiere mecánico.
- Simulación muy compleja requiere mecánico y administrador.
- No permitir dos simulaciones activas sobre los mismos vehículos.
- No cancelar una simulación terminada.
- No modificar manualmente un vehículo en una simulación activa.
- Un vehículo terminado debe tener un motor, una tapicería y cuatro ruedas.
- Un componente no puede instalarse en dos vehículos.

## 13. Manejo de errores

Debe existir un `@RestControllerAdvice`.

Errores recomendados:

- `ResourceNotFoundException` → `404`.
- `DuplicateResourceException` → `409`.
- `InsufficientStockException` → `409`.
- `InvalidAssemblyTransitionException` → `409`.
- `SimulationAlreadyRunningException` → `409`.
- `InvalidSimulationRequirementsException` → `422`.
- Errores de validación → `400`.
- Error inesperado → `500`.

Respuesta usando Problem Details:

```json
{
  "type": "https://api.fabrica/errors/insufficient-stock",
  "title": "Stock insuficiente",
  "status": 409,
  "detail": "No hay suficientes ruedas para fabricar 3 vehículos",
  "instance": "/api/v1/simulations",
  "stockResult": "SIN_RUEDAS"
}
```

## 14. Aspectos del proyecto actual que deben corregirse

Durante la migración no conviene copiar literalmente algunos comportamientos actuales.

### Datos sin identificador

Las clases actuales no tienen ID. En backend todas las entidades persistentes necesitan un identificador.

### Simulación bloqueante

`Planificador.iniciarSimulacion()` bloquea el hilo y hace `Thread.sleep(1000)`. En web debe ejecutarse de manera asíncrona.

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
14. Implementar simulaciones asíncronas.
15. Añadir SSE para seguimiento en tiempo real.
16. Añadir `@RestControllerAdvice`.
17. Documentar con OpenAPI.
18. Añadir tests unitarios.
19. Añadir tests de integración con Testcontainers.
20. Añadir Spring Security si se va a publicar.

Con este diseño se conserva toda la funcionalidad del proyecto de consola, pero el estado pasa a ser persistente, transaccional, consultable mediante API REST y preparado para una futura interfaz web o aplicación móvil.
