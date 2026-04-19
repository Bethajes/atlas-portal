const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const email = 'admin@atlas.edu.et';
    const password = 'admin123';
    
    const user = await prisma.user.findUnique({
      where: { institutionalEmail: email },
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.institutionalEmail);
    
    const isValid = await bcrypt.compare(password, user.password);
    console.log('🔐 Password valid:', isValid ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();