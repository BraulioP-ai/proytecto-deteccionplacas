#!/bin/bash

echo "🎩 Instalación automática para Fedora Linux"
echo "============================================"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Actualizar sistema
echo -e "${GREEN}Actualizando sistema...${NC}"
sudo dnf update -y

# Instalar Node.js
echo -e "${GREEN}Instalando Node.js...${NC}"
sudo dnf install nodejs npm -y

# Instalar MariaDB
echo -e "${GREEN}Instalando MariaDB...${NC}"
sudo dnf install mariadb-server mariadb -y
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Instalar Python y pip
echo -e "${GREEN}Instalando Python...${NC}"
sudo dnf install python3-pip -y

# Instalar Tesseract
echo -e "${GREEN}Instalando Tesseract OCR...${NC}"
sudo dnf install tesseract tesseract-langpack-spa -y

# Instalar OpenCV dependencies
echo -e "${GREEN}Instalando dependencias de OpenCV...${NC}"
sudo dnf install python3-opencv mesa-libGL -y

# Instalar dependencias Python
echo -e "${GREEN}Instalando dependencias Python...${NC}"
pip3 install --user flask flask-cors opencv-python pytesseract pillow numpy

# Configurar firewall
echo -e "${GREEN}Configurando firewall...${NC}"
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --reload

echo -e "${GREEN}✅ Instalación de prerequisitos completada${NC}"
echo ""
echo "Siguiente paso: Configurar MariaDB"
echo "Ejecuta: sudo mysql_secure_installation"
echo ""
echo "Luego crea la base de datos:"
echo "mysql -u root -p < Proyecto_IS_actualizado.sql"
