
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Starting seed...\n');
    const now = new Date();

    // 1. Department
    let dept = await prisma.department.findUnique({ 
      where: { code: 'GEN' } 
    });
    
    if (!dept) {
      dept = await prisma.department.create({
        data: { 
          id: crypto.randomUUID(),
          name: 'General Studies', 
          code: 'GEN',
          updatedAt: now
        }
      });
      console.log('✅ Created department:', dept.code);
    } else {
      console.log('✅ Department exists:', dept.code);
    }

    // 2. Program
    let prog = await prisma.program.findUnique({ 
      where: { code: 'UND' } 
    });
    
    if (!prog) {
      prog = await prisma.program.create({
        data: {
          id: crypto.randomUUID(),
          name: 'Undeclared', 
          code: 'UND', 
          departmentId: dept.id,
          durationYears: 4,
          totalCredits: 120,
          updatedAt: now
        }
      });
      console.log('✅ Created program:', prog.code);
    } else {
      console.log('✅ Program exists:', prog.code);
    }

    // 3. Admin User
    let admin = await prisma.user.findUnique({ 
      where: { institutionalEmail: 'admin@atlas.edu.et' } 
    });
    
    if (!admin) {
      const hashed = await bcrypt.hash('admin123', 12);
      admin = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name: 'System Administrator',
          institutionalEmail: 'admin@atlas.edu.et',
          recoveryEmail: 'admin@gmail.com',
          password: hashed,
          role: 'ADMIN',
          emailVerified: true,
          updatedAt: now
        }
      });
      console.log('✅ Created admin:', admin.institutionalEmail);
    } else {
      console.log('✅ Admin exists:', admin.institutionalEmail);
    }

    // 4. Registrar User
    let registrar = await prisma.user.findUnique({ 
      where: { institutionalEmail: 'registrar@atlas.edu.et' } 
    });
    
    if (!registrar) {
      const hashed = await bcrypt.hash('registrar123', 12);
      registrar = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name: 'College Registrar',
          institutionalEmail: 'registrar@atlas.edu.et',
          recoveryEmail: 'registrar@gmail.com',
          password: hashed,
          role: 'REGISTRAR',
          emailVerified: true,
          updatedAt: now
        }
      });
      console.log('✅ Created registrar:', registrar.institutionalEmail);
    } else {
      console.log('✅ Registrar exists:', registrar.institutionalEmail);
    }

    console.log('\n🎉 Seed complete!');
    console.log('📝 Login credentials:');
    console.log('   Admin: admin@atlas.edu.et / admin123');
    console.log('   Registrar: registrar@atlas.edu.et / registrar123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();