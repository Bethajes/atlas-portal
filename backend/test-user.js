const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔐 Hashing password...');
    const hashed = await bcrypt.hash('admin123', 12);
    
    console.log('👤 Creating/updating user...');
    const user = await prisma.user.upsert({
      where: { institutionalEmail: 'admin@atlas.edu.et' },
      update: {
        name: 'Admin User',
        password: hashed,
      },
      create: {
        name: 'Admin User',
        institutionalEmail: 'admin@atlas.edu.et',
        recoveryEmail: 'admin@gmail.com',
        password: hashed,
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    
    console.log('✅ User ready:', user.institutionalEmail);
    console.log('   Password: admin123');
    console.log('   Role:', user.role);
    console.log('   ID:', user.id);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();