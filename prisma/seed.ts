import type { ProductionPlan } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateKgFromBatches, type ProductType } from '../src/shared/constants/production.js';

declare const process: {
  exit: (code: number) => void;
};

const prisma = new PrismaClient({
  log: ['error'],
});

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in correct order to avoid foreign key constraints)
  console.log('🧹 Cleaning existing data...');
  
  // Use a fresh client for cleanup to avoid prepared statement conflicts
  const cleanupClient = new PrismaClient();
  try {
    // Use raw SQL to delete all data safely
    await cleanupClient.$executeRaw`TRUNCATE TABLE IF EXISTS "Batch" CASCADE`;
    await cleanupClient.$executeRaw`TRUNCATE TABLE IF EXISTS "ProductionPlan" CASCADE`;
    await cleanupClient.$executeRaw`TRUNCATE TABLE IF EXISTS "ProductionEntry" CASCADE`;
    await cleanupClient.$executeRaw`TRUNCATE TABLE IF EXISTS "Product" CASCADE`;
    await cleanupClient.$executeRaw`TRUNCATE TABLE IF EXISTS "RefreshToken" CASCADE`;
    await cleanupClient.$executeRaw`TRUNCATE TABLE IF EXISTS "User" CASCADE`;
  } catch (error) {
    console.log('Some tables may not exist yet, continuing...');
  } finally {
    await cleanupClient.$disconnect();
  }

  // Create users
  console.log('👥 Creating users...');
  
  const passwordHash = await bcrypt.hash('123456', SALT_ROUNDS);
  
  const director = await prisma.user.create({
    data: {
      name: 'João Silva',
      email: 'director@sgmi.com',
      passwordHash,
      role: 'DIRECTOR',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Maria Santos',
      email: 'manager@sgmi.com', 
      passwordHash,
      role: 'MANAGER',
    },
  });

  const operator = await prisma.user.create({
    data: {
      name: 'Pedro Oliveira',
      email: 'operator@sgmi.com',
      passwordHash,
      role: 'OPERATOR',
    },
  });

  console.log(`✅ Created users: ${director.name}, ${manager.name}, ${operator.name}`);

  // Create products
  console.log('🍪 Creating products...');

  // Products specified by the user with their types
  const amanteigadoLeite = await prisma.product.create({
    data: {
      name: 'AMANTEIGADO SABOR LEITE',
      unit: 'KG',
      type: 'AMANTEIGADO',
      active: true,
    },
  });

  const amanteigadoMaca = await prisma.product.create({
    data: {
      name: 'AMANTEIGADO SABOR MAÇÃ COM CANELA',
      unit: 'KG',
      type: 'AMANTEIGADO',
      active: true,
    },
  });

  const amanteigadoBanana = await prisma.product.create({
    data: {
      name: 'AMANTEIGADO SABOR BANANA COM CANELA',
      unit: 'KG',
      type: 'AMANTEIGADO',
      active: true,
    },
  });

  const amanteigadoNata = await prisma.product.create({
    data: {
      name: 'AMANTEIGADO SABOR NATA',
      unit: 'KG',
      type: 'AMANTEIGADO',
      active: true,
    },
  });

  const amanteigadoCoco = await prisma.product.create({
    data: {
      name: 'AMANTEIGADO SABOR COCO',
      unit: 'KG',
      type: 'AMANTEIGADO',
      active: true,
    },
  });

  const rosquinhaChocolate = await prisma.product.create({
    data: {
      name: 'ROSQUINHA DE CHOCOLATE',
      unit: 'KG',
      type: 'DOCE',
      active: true,
    },
  });

  const cookieGotas = await prisma.product.create({
    data: {
      name: 'COOKIE COM GOTAS DE CHOCOLATE',
      unit: 'KG',
      type: 'DOCE',
      active: true,
    },
  });

  const cookieIntegral = await prisma.product.create({
    data: {
      name: 'COOKIE INTEGRAL COM GOTAS DE CHOCOLATE',
      unit: 'KG',
      type: 'DOCE',
      active: true,
    },
  });

  const flocosMilho = await prisma.product.create({
    data: {
      name: 'FLOCOS DE MILHO SEM AÇÚCAR',
      unit: 'KG',
      type: 'FLOCO',
      active: true,
    },
  });

  const products = [
    amanteigadoLeite, amanteigadoMaca, amanteigadoBanana, amanteigadoNata, amanteigadoCoco,
    rosquinhaChocolate, cookieGotas, cookieIntegral, flocosMilho
  ];

  console.log(`✅ Created ${products.length} products`);

  // Create production plans with historical data from SGMI mocks
  console.log('📋 Creating production plans...');

  // Historical production plans based on mocked data
  const productionDates = [
    '2025-08-10', '2025-08-11', '2025-08-12', '2025-08-13', '2025-08-14',
    '2025-08-28', '2025-08-29', '2025-08-30', '2025-08-31'
  ];

  const productionPlans: ProductionPlan[] = [];

  for (let i = 0; i < productionDates.length; i++) {
    const date = productionDates[i];
    
    // Create production plan for AMANTEIGADO SABOR LEITE
    const leiteplan = await prisma.productionPlan.create({
      data: {
        productId: amanteigadoLeite.id,
        plannedQuantity: 300,
        plannedDate: new Date(date),
        status: 'COMPLETED',
      },
    });
    productionPlans.push(leiteplan);

    // Create production plan for COOKIE COM GOTAS DE CHOCOLATE
    const cookiePlan = await prisma.productionPlan.create({
      data: {
        productId: cookieGotas.id,
        plannedQuantity: 200,
        plannedDate: new Date(date),
        status: 'COMPLETED',
      },
    });
    productionPlans.push(cookiePlan);

    // Create production plan for ROSQUINHA DE CHOCOLATE
    const rosquinhaPlan = await prisma.productionPlan.create({
      data: {
        productId: rosquinhaChocolate.id,
        plannedQuantity: 150,
        plannedDate: new Date(date),
        status: 'COMPLETED',
      },
    });
    productionPlans.push(rosquinhaPlan);
  }

  console.log(`✅ Created ${productionPlans.length} production plans`);

  // Create batches based on mocked table data from SGMI
  console.log('🏭 Creating batches...');

  const batchesData = [
    // Data extracted from SGMI mock tableRows updated with new products
    { date: '2025-08-10', shift: 'MORNING', product: amanteigadoLeite.id, batches: 12, approxKg: 240 },
    { date: '2025-08-10', shift: 'AFTERNOON', product: cookieGotas.id, batches: 8, approxKg: 160 },
    { date: '2025-08-11', shift: 'NIGHT', product: rosquinhaChocolate.id, batches: 9, approxKg: 180 },
    { date: '2025-08-12', shift: 'MORNING', product: amanteigadoLeite.id, batches: 10, approxKg: 200 },
    { date: '2025-08-12', shift: 'AFTERNOON', product: cookieGotas.id, batches: 7, approxKg: 140 },
    { date: '2025-08-13', shift: 'NIGHT', product: rosquinhaChocolate.id, batches: 9, approxKg: 180 },
    { date: '2025-08-14', shift: 'MORNING', product: amanteigadoLeite.id, batches: 15, approxKg: 300 },
    // Recent dates with batch data
    { date: '2025-08-28', shift: 'MORNING', product: amanteigadoLeite.id, batches: 14, approxKg: 280 },
    { date: '2025-08-28', shift: 'AFTERNOON', product: cookieGotas.id, batches: 9, approxKg: 180 },
    { date: '2025-08-28', shift: 'NIGHT', product: rosquinhaChocolate.id, batches: 8, approxKg: 160 },
    { date: '2025-08-29', shift: 'MORNING', product: amanteigadoLeite.id, batches: 13, approxKg: 260 },
    { date: '2025-08-29', shift: 'AFTERNOON', product: cookieGotas.id, batches: 10, approxKg: 200 },
    { date: '2025-08-29', shift: 'NIGHT', product: rosquinhaChocolate.id, batches: 7, approxKg: 140 },
    { date: '2025-08-30', shift: 'MORNING', product: amanteigadoLeite.id, batches: 16, approxKg: 320 },
    { date: '2025-08-30', shift: 'AFTERNOON', product: cookieGotas.id, batches: 11, approxKg: 220 },
    { date: '2025-08-30', shift: 'NIGHT', product: rosquinhaChocolate.id, batches: 9, approxKg: 180 },
    { date: '2025-08-31', shift: 'MORNING', product: amanteigadoLeite.id, batches: 12, approxKg: 240 },
    { date: '2025-08-31', shift: 'AFTERNOON', product: cookieGotas.id, batches: 8, approxKg: 160 },
    { date: '2025-08-31', shift: 'NIGHT', product: rosquinhaChocolate.id, batches: 10, approxKg: 200 },
  ];

  let totalBatches = 0;

  // Process batches in smaller chunks to avoid prepared statement conflicts
  const BATCH_CHUNK_SIZE = 10;
  
  for (let i = 0; i < batchesData.length; i += BATCH_CHUNK_SIZE) {
    const chunk = batchesData.slice(i, i + BATCH_CHUNK_SIZE);
    
    await prisma.$transaction(async (tx) => {
      for (const batchData of chunk) {
        // Find the corresponding production plan
        const plan = productionPlans.find(p =>
          p.productId === batchData.product &&
          p.plannedDate.toISOString().startsWith(batchData.date)
        );

        if (plan) {
          const kgPerBatch = batchData.approxKg / batchData.batches;

          // Create multiple batches for this production plan
          for (let batchNum = 1; batchNum <= batchData.batches; batchNum++) {
            const startTime = new Date(`${batchData.date}T08:00:00Z`);
            startTime.setHours(startTime.getHours() + (batchNum - 1) * 0.5); // 30 min intervals

            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + 25); // 25 minute batches

            await tx.batch.create({
              data: {
                productionPlanId: plan.id,
                batchNumber: batchNum,
                status: 'COMPLETED',
                startTime,
                endTime,
                pauseDurationMinutes: 0,
                estimatedKg: kgPerBatch,
              },
            });
            totalBatches++;
          }
        }
      }
    });
  }

  console.log(`✅ Created ${totalBatches} batches`);

  // Create some production entries (legacy system entries)
  console.log('📝 Creating production entries...');

  // Calculate production entries using realistic batch counts and calculateKgFromBatches
  const productionEntries = [
    { productId: amanteigadoLeite.id, productType: 'AMANTEIGADO' as ProductType, batches: 2, shift: 'MORNING' }, // 2 * 110 = 220kg
    { productId: amanteigadoMaca.id, productType: 'AMANTEIGADO' as ProductType, batches: 3, shift: 'AFTERNOON' }, // 3 * 110 = 330kg
    { productId: amanteigadoBanana.id, productType: 'AMANTEIGADO' as ProductType, batches: 1, shift: 'NIGHT' }, // 1 * 110 = 110kg
    { productId: amanteigadoNata.id, productType: 'AMANTEIGADO' as ProductType, batches: 2, shift: 'MORNING' }, // 2 * 110 = 220kg
    { productId: amanteigadoCoco.id, productType: 'AMANTEIGADO' as ProductType, batches: 4, shift: 'AFTERNOON' }, // 4 * 110 = 440kg
    { productId: rosquinhaChocolate.id, productType: 'DOCE' as ProductType, batches: 3, shift: 'NIGHT' }, // 3 * 120 = 360kg
    { productId: cookieGotas.id, productType: 'DOCE' as ProductType, batches: 2, shift: 'MORNING' }, // 2 * 120 = 240kg
    { productId: cookieIntegral.id, productType: 'DOCE' as ProductType, batches: 4, shift: 'AFTERNOON' }, // 4 * 120 = 480kg
    { productId: flocosMilho.id, productType: 'FLOCO' as ProductType, batches: 2, shift: 'NIGHT' }, // 2 * 172 = 344kg
  ];

  for (const entry of productionEntries) {
    const calculatedQuantity = calculateKgFromBatches(entry.productType, entry.batches);

    const startTime = new Date();
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 25); // 25 minute batches

    await prisma.productionEntry.create({
      data: {
        productId: entry.productId,
        quantity: calculatedQuantity,
        bateladas: entry.batches,
        startTime,
        endTime,
        duration: 300,
        shift: entry.shift as any,
      },
    });
  }

  console.log(`✅ Created ${productionEntries.length} production entries`);

  // Create current day production plans for testing
  console.log('📅 Creating current day production plans...');

  const today = new Date();

  const currentPlans = [
    {
      productId: amanteigadoLeite.id,
      plannedQuantity: 100,
      status: 'PENDING' as const,
    },
    {
      productId: cookieIntegral.id,
      plannedQuantity: 75,
      status: 'PENDING' as const,
    },
    {
      productId: flocosMilho.id,
      plannedQuantity: 200,
      status: 'PENDING' as const,
    },
  ];

  for (const plan of currentPlans) {
    await prisma.productionPlan.create({
      data: {
        productId: plan.productId,
        plannedQuantity: plan.plannedQuantity,
        plannedDate: today,
        status: plan.status,
      },
    });
  }

  console.log(`✅ Created ${currentPlans.length} current day production plans`);

  console.log('🎉 Database seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   👥 Users: 3 (director, manager, operator)`);
  console.log(`   🍪 Products: ${products.length} (bakery + snacks)`);
  console.log(`   📋 Production Plans: ${productionPlans.length + currentPlans.length}`);
  console.log(`   🏭 Batches: ${totalBatches}`);
  console.log(`   📝 Production Entries: ${productionEntries.length}`);
  console.log('');
  console.log('🔑 Login credentials (all users):');
  console.log('   📧 Email: director@sgmi.com (Director)');
  console.log('   📧 Email: manager@sgmi.com (Manager)');
  console.log('   📧 Email: operator@sgmi.com (Operator)');
  console.log('   🔒 Password: 123456');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
