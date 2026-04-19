const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Creating Department Head...\n');

    // Find or create a department
    let dept = await prisma.department.findFirst();
    if (!dept) {
      dept = await prisma.department.create({ 
        data: { 
          id: crypto.randomUUID(),
          name: 'School of Nursing', 
          code: 'NURS',
          updatedAt: new Date()
        } 
      });
      console.log('✅ Created department:', dept.name);
    } else {
      console.log('✅ Department exists:', dept.name);
    }

    // Check if instructor user exists
    let user = await prisma.user.findUnique({
      where: { institutionalEmail: 'dr.smith@atlas.edu.et' }
    });

    if (!user) {
      const hashed = bcrypt.hashSync('instructor123', 12);
      user = await prisma.user.create({
        data: { 
          id: crypto.randomUUID(),
          name: 'Dr. Sarah Smith', 
          institutionalEmail: 'dr.smith@atlas.edu.et', 
          recoveryEmail: 'smith@gmail.com', 
          password: hashed, 
          role: 'INSTRUCTOR',
          updatedAt: new Date()
        }
      });
      console.log('✅ Created instructor user:', user.institutionalEmail);
    } else {
      console.log('✅ Instructor user exists:', user.institutionalEmail);
    }

    // Check if instructor profile exists
    let instructor = await prisma.instructor.findUnique({
      where: { userId: user.id }
    });

    if (!instructor) {
      instructor = await prisma.instructor.create({
        data: { 
          id: crypto.randomUUID(),
          userId: user.id, 
          employeeId: 'INST001', 
          departmentId: dept.id, 
          title: 'Professor of Nursing',
          updatedAt: new Date()
        }
      });
      console.log('✅ Created instructor profile');
    } else {
      console.log('✅ Instructor profile exists');
    }

    // Make them department head
    await prisma.department.update({ 
      where: { id: dept.id }, 
      data: { headId: instructor.id } 
    });
    console.log('✅ Set as Department Head');

    console.log('\n🎉 Department Head ready!');
    console.log('📝 Login: dr.smith@atlas.edu.et / instructor123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();