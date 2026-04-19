const prisma = require('./src/services/prisma');
const { comparePassword } = require('./src/utils/hash');
const { generateAccessToken, generateRefreshToken } = require('./src/utils/jwt');

async function testAuth() {
  try {
    const email = 'admin@atlas.edu.et';
    const password = 'admin123';
    
    console.log('🔍 Looking for user:', email);
    const user = await prisma.user.findUnique({
      where: { institutionalEmail: email },
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found');
    
    const isValid = await comparePassword(password, user.password);
    console.log('🔐 Password valid:', isValid ? 'YES' : 'NO');
    
    if (isValid) {
      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id);
      
      console.log('✅ Access Token:', accessToken.substring(0, 50) + '...');
      console.log('✅ Refresh Token:', refreshToken.substring(0, 50) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();