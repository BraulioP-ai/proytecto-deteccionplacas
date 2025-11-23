-- ************************************************************
-- BASE DE DATOS: Proyecto_IS (versión revisada)
-- ************************************************************

DROP DATABASE IF EXISTS Proyecto_IS;
CREATE DATABASE Proyecto_IS CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE Proyecto_IS;

-- ************************************************************
-- TABLAS
-- ************************************************************

-- T1: RolesPersona
CREATE TABLE RolesPersona (
    RolPersonaID INT AUTO_INCREMENT PRIMARY KEY,
    NombreRol VARCHAR(50) UNIQUE NOT NULL,
    Descripcion VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T2: PermisosSistema
CREATE TABLE PermisosSistema (
    PermisoID INT AUTO_INCREMENT PRIMARY KEY,
    NombrePermiso VARCHAR(50) UNIQUE NOT NULL,
    Descripcion VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T3: UsuariosSistema
CREATE TABLE UsuariosSistema (
    UsuarioID INT AUTO_INCREMENT PRIMARY KEY,
    NombreUsuario VARCHAR(50) UNIQUE NOT NULL,
    ContrasenaHash VARCHAR(255) NOT NULL,
    PermisoID INT NOT NULL,
    Estatus BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (PermisoID) REFERENCES PermisosSistema(PermisoID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T4: Empleados
CREATE TABLE Empleados (
    EmpleadoID VARCHAR(10) PRIMARY KEY,
    RolPersonaID INT NOT NULL,
    Nombre VARCHAR(50) NOT NULL,
    ApellidoPaterno VARCHAR(50) NOT NULL,
    ApellidoMaterno VARCHAR(50) NOT NULL,
    CorreoInstitucional VARCHAR(100) NOT NULL,
    Puesto VARCHAR(50),
    Estatus BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (RolPersonaID) REFERENCES RolesPersona(RolPersonaID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T5: Vehiculos (todas las placas registradas se consideran válidas/autorizadas)
CREATE TABLE Vehiculos (
    Placa VARCHAR(10) PRIMARY KEY,
    EmpleadoID VARCHAR(10) NOT NULL,
    TipoVehiculo VARCHAR(50) NOT NULL,
    Marca VARCHAR(50),
    Modelo VARCHAR(50),
    FechaVencimiento DATE,
    FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T6: RegistrosAcceso (los accesos pueden ser reconocidos, no reconocidos o manuales)
CREATE TABLE RegistrosAcceso (
    RegistroID BIGINT AUTO_INCREMENT PRIMARY KEY,
    Placa VARCHAR(10),
    FechaHora DATETIME NOT NULL DEFAULT NOW(),
    EstadoAutorizacion ENUM('AUTORIZADO', 'NO_RECONOCIDO', 'MANUAL') NOT NULL,
    ModoAcceso VARCHAR(10) NOT NULL,
    UsuarioSistemaID INT,
    FOREIGN KEY (Placa) REFERENCES Vehiculos(Placa),
    FOREIGN KEY (UsuarioSistemaID) REFERENCES UsuariosSistema(UsuarioID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ************************************************************
-- DATOS DE EJEMPLO
-- ************************************************************

-- Roles de Persona
INSERT INTO RolesPersona (NombreRol, Descripcion) VALUES
('Docente', 'Personal académico.'),
('Guardia', 'Personal de seguridad.'),
('RH', 'Personal administrativo de Recursos Humanos.'),
('Institucion', 'Dueño ficticio para vehículos de la universidad.');

-- Permisos de Sistema
INSERT INTO PermisosSistema (NombrePermiso, Descripcion) VALUES
('Administrador', 'Control total del sistema.'),
('RH', 'Gestión de Empleados y Vehículos.'),
('Guardia', 'Acceso a monitoreo y validación manual.');

-- Empleados
INSERT INTO Empleados (EmpleadoID, RolPersonaID, Nombre, ApellidoPaterno, ApellidoMaterno, CorreoInstitucional, Puesto)
VALUES
('367551', 1, 'Maximiliano', 'Carrillo', 'Hinojos', 'a367551@uach.mx', 'Docente'),
('344175', 2, 'Braulio Sebastian', 'Porras', 'Olivas', 'a344175@uach.mx', 'Jefe de Seguridad'),
('INST0000', 4, 'Universidad', 'Autónoma', 'de Chihuahua', 'institucion@uach.mx', 'Control Vehicular'),
('290000', 3, 'Elena', 'Márquez', 'Soto', 'rh@uach.mx', 'Analista de RH');

-- Usuarios del Sistema
INSERT INTO UsuariosSistema (NombreUsuario, ContrasenaHash, PermisoID) VALUES
('Admin_Sistema', 'hash_admin', 1),
('Guardia_Braulio', 'hash_guardia', 3),
('Usuario_RH', 'hash_rh', 2);

-- Vehículos
INSERT INTO Vehiculos (Placa, EmpleadoID, TipoVehiculo, Marca, Modelo, FechaVencimiento) VALUES
('DVL200A', '367551', 'Hatchback', 'Volkswagen', 'Golf', NULL),
('DZA375A', '367551', 'Liftback', 'Acura', 'Integra', NULL),
('INST45A', 'INST0000', 'Autobús', 'Mercedes', 'O500', NULL),
('PRV999', 'INST0000', 'SUV', 'Ford', 'Transit', '2025-10-30');

-- Registros de Acceso
INSERT INTO RegistrosAcceso (Placa, EstadoAutorizacion, ModoAcceso, UsuarioSistemaID) VALUES
('DVL200A', 'AUTORIZADO', 'AUTOMATICO', NULL),
(NULL, 'NO_RECONOCIDO', 'AUTOMATICO', NULL),
('PRV999', 'MANUAL', 'MANUAL', 2);
