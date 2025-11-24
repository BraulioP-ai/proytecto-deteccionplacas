import bcrypt from 'bcryptjs';

const passwords = {
  admin: 'admin123',
  supervisor1: 'super123',
  guardia1: 'guardia123'
};

console.log('🔐 Generando hashes bcrypt...\n');

for (const [user, pass] of Object.entries(passwords)) {
  const hash = bcrypt.hashSync(pass, 10);
  console.log(`Usuario: ${user}`);
  console.log(`Contraseña: ${pass}`);
  console.log(`Hash: ${hash}`);
  console.log('');
}

console.log('✅ Copia estos hashes y actualiza la base de datos');
