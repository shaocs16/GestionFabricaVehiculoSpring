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
