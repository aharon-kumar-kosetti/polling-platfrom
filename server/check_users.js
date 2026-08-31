const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Only run in development
if (process.env.NODE_ENV === 'production') {
  console.log('Admin seeding is disabled in production.');
  process.exit(0);
}

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Existing users count:', users.length);
  if (users.length > 0) {
    users.forEach(u => console.log(`User: id=${u.id}, name=${u.name}`));
  }

  // Read credentials from environment or use defaults for local dev only
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@quizcore.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
  
  if (!adminEmail || !adminPassword) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set.');
    process.exit(1);
  }

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Admin Organizer'
      }
    });
    console.log('Created default admin user (id:', admin.id, ')');
  } else {
    console.log('Default admin already exists (id:', admin.id, ')');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
