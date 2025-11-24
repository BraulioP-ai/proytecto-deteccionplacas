DROP DATABASE IF EXISTS Proyecto_IS;
CREATE DATABASE Proyecto_IS;
USE Proyecto_IS;

CREATE TABLE PermisosSistema (
    PermisoID INT AUTO_INCREMENT PRIMARY KEY,
    NombrePermiso VARCHAR(50) NOT NULL UNIQUE,
    Descripcion VARCHAR(100)
);

INSERT INTO PermisosSistema (NombrePermiso, Descripcion) VALUES
    ('Administrador', 'Acceso completo al sistema'),
    ('Supervisor', 'Puede gestionar vehículos y ver reportes'),
    ('Guardia', 'Puede registrar accesos manuales');

CREATE TABLE UsuariosSistema (
    UsuarioID INT AUTO_INCREMENT PRIMARY KEY,
    NombreUsuario VARCHAR(50) NOT NULL UNIQUE,
    ContrasenaHash VARCHAR(255) NOT NULL,
    PermisoID INT NOT NULL,
    Estatus TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT FK_UsuariosSistema_Permisos FOREIGN KEY (PermisoID)
        REFERENCES PermisosSistema(PermisoID)
);

INSERT INTO UsuariosSistema (NombreUsuario, ContrasenaHash, PermisoID, Estatus) VALUES
    ('admin', '$2a$10$xQZ9Z9Z9Z9Z9Z9Z9Z9Z9Zu', 1, 1),
    ('supervisor1', '$2a$10$xQZ9Z9Z9Z9Z9Z9Z9Z9Z9Zu', 2, 1),
    ('guardia1', '$2a$10$xQZ9Z9Z9Z9Z9Z9Z9Z9Z9Zu', 3, 1);

CREATE TABLE Empleados (
    EmpleadoID INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    ApellidoPaterno VARCHAR(100) NOT NULL,
    ApellidoMaterno VARCHAR(100) NOT NULL,
    Departamento VARCHAR(100) NOT NULL,
    Puesto VARCHAR(100) DEFAULT NULL,
    Estatus TINYINT(1) NOT NULL DEFAULT 1
);

INSERT INTO Empleados (Nombre, ApellidoPaterno, ApellidoMaterno, Departamento, Puesto, Estatus) VALUES
    ('Juan', 'López', 'Hernández', 'Seguridad', 'Jefe de Seguridad', 1),
    ('María', 'Pérez', 'García', 'Administración', 'Gerente Administrativo', 1),
    ('Carlos', 'Ramírez', 'Martínez', 'Ventas', 'Vendedor Senior', 1),
    ('Ana', 'González', 'López', 'Sistemas', 'Desarrolladora', 1);

CREATE TABLE Vehiculos (
    Placa VARCHAR(10) PRIMARY KEY,
    Marca VARCHAR(50) NOT NULL,
    Modelo VARCHAR(50) NOT NULL,
    TipoVehiculo VARCHAR(50) DEFAULT 'Sedán',
    EmpleadoID INT NOT NULL,
    EsAutorizado TINYINT(1) DEFAULT 1,
    FechaVencimiento DATE DEFAULT NULL,
    CONSTRAINT FK_Vehiculos_Empleados FOREIGN KEY (EmpleadoID)
        REFERENCES Empleados(EmpleadoID)
);

INSERT INTO Vehiculos (Placa, Marca, Modelo, TipoVehiculo, EmpleadoID, EsAutorizado, FechaVencimiento) VALUES
    ('ABC123A', 'Nissan', 'Versa', 'Sedán', 1, 1, '2025-12-31'),
    ('XYZ456B', 'Honda', 'Civic', 'Sedán', 2, 1, '2025-12-31'),
    ('DEF789C', 'Toyota', 'Corolla', 'Sedán', 3, 1, '2026-06-30'),
    ('GHI012D', 'Mazda', 'CX-5', 'SUV', 4, 1, '2026-03-15');

CREATE TABLE RegistrosAcceso (
    RegistroID INT AUTO_INCREMENT PRIMARY KEY,
    Placa VARCHAR(10) NOT NULL,
    FechaHora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    EstadoAutorizacion ENUM('AUTORIZADO', 'NO_RECONOCIDO', 'MANUAL') NOT NULL,
    ModoAcceso VARCHAR(20) NOT NULL,
    UsuarioSistemaID INT DEFAULT NULL,
    CONSTRAINT FK_RegistrosAcceso_UsuariosSistema FOREIGN KEY (UsuarioSistemaID)
        REFERENCES UsuariosSistema(UsuarioID)
);

INSERT INTO RegistrosAcceso (Placa, FechaHora, EstadoAutorizacion, ModoAcceso, UsuarioSistemaID) VALUES
    ('ABC123A', NOW(), 'AUTORIZADO', 'AUTOMATICO', 1),
    ('XYZ456B', NOW(), 'AUTORIZADO', 'AUTOMATICO', 1),
    ('PLT999C', NOW(), 'MANUAL', 'MANUAL', 3),
    ('DEF789C', NOW(), 'AUTORIZADO', 'AUTOMATICO', NULL);
