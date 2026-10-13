import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { SYSTEM_PERMISSIONS } from '../src/domain/staff/enums/permission.enum';
import { SYSTEM_ROLES, SystemRole } from '../src/domain/staff/enums/role.enum';

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:password@127.0.0.1:3306/resto_db';
  try {
    const url = new URL(dbUrl);
    const host = url.hostname === 'localhost' ? '127.0.0.1' : url.hostname;
    const port = url.port ? parseInt(url.port, 10) : 3306;
    const user = decodeURIComponent(url.username || 'root');
    const password = decodeURIComponent(url.password || '');
    const database = url.pathname.replace(/^\//, '');

    const adapter = new PrismaMariaDb({
      host,
      port,
      user,
      password,
      database,
      allowPublicKeyRetrieval: true,
    });
    return new PrismaClient({ adapter });
  } catch {
    return new PrismaClient();
  }
}

const prisma = createPrismaClient();


async function main() {
  console.log('[Seed] Starting production database initialization for Qahwet Cairo...');

  // 1. Seed System Permissions (Idempotent upsert)
  console.log('[Seed] Ensuring system permissions...');
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        category: perm.category,
        description: perm.description,
      },
      create: {
        code: perm.code,
        name: perm.name,
        category: perm.category,
        description: perm.description,
      },
    });
  }

  // 2. Seed System Roles and Capabilities (Idempotent upsert)
  console.log('[Seed] Ensuring system roles & capabilities...');
  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
    });

    const permissions = await prisma.permission.findMany({
      where: { code: { in: roleDef.defaultPermissions } },
    });

    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // 3. Ensure Default Restaurant Settings for Qahwet Cairo
  console.log('[Seed] Initializing Qahwet Cairo restaurant settings...');
  let settings = await prisma.restaurantSetting.findFirst();
  if (!settings) {
    settings = await prisma.restaurantSetting.create({
      data: {
        nameAr: process.env.RESTAURANT_NAME_AR || 'قهوة كايرو',
        nameEn: process.env.RESTAURANT_NAME_EN || 'Qahwet Cairo',
        currency: process.env.RESTAURANT_CURRENCY || 'EGP',
        currencySymbol: process.env.RESTAURANT_CURRENCY_SYMBOL || 'ج.م',
        locale: 'ar-EG',
        taxRatePercent: 14.00,
        deliveryFee: 0,
        phone: process.env.RESTAURANT_PHONE || '01000000000',
        address: 'العاشر من رمضان - ستريب مول',
      },
    });
  } else {
    settings = await prisma.restaurantSetting.update({
      where: { id: settings.id },
      data: {
        nameAr: process.env.RESTAURANT_NAME_AR || 'قهوة كايرو',
        nameEn: process.env.RESTAURANT_NAME_EN || 'Qahwet Cairo',
        address: 'العاشر من رمضان - ستريب مول',
      },
    });
  }

  // 4. Ensure Primary Operational Branch (MAIN-01 at Strip Mall)
  console.log('[Seed] Initializing Strip Mall primary operational branch...');
  let mainBranch = await prisma.branch.findFirst({
    where: { code: 'MAIN-01' },
  });

  if (!mainBranch) {
    mainBranch = await prisma.branch.create({
      data: {
        code: 'MAIN-01',
        nameAr: 'فرع ستريب مول - العاشر من رمضان',
        nameEn: 'Strip Mall Branch - 10th of Ramadan',
        phone: settings.phone || '01000000000',
        address: settings.address || 'العاشر من رمضان - ستريب مول',
        isActive: true,
      },
    });
  } else {
    mainBranch = await prisma.branch.update({
      where: { id: mainBranch.id },
      data: {
        nameAr: 'فرع ستريب مول - العاشر من رمضان',
        nameEn: 'Strip Mall Branch - 10th of Ramadan',
        address: 'العاشر من رمضان - ستريب مول',
      },
    });
  }

  // 5. Ensure Default Dining Tables for Main Branch (T-1 to T-6)
  console.log('[Seed] Ensuring default cafe dining tables...');
  for (let t = 1; t <= 6; t++) {
    const tableNumber = `T-${t}`;
    const existingTable = await prisma.diningTable.findUnique({
      where: {
        branchId_tableNumber: {
          branchId: mainBranch.id,
          tableNumber,
        },
      },
    });
    if (!existingTable) {
      await prisma.diningTable.create({
        data: {
          branchId: mainBranch.id,
          tableNumber,
          capacity: 4,
          status: 'AVAILABLE',
          sortOrder: t,
          isActive: true,
        },
      });
    }
  }

  // 6. Ensure Default Expense Category (مصروفات عامة)
  const defaultCategory = await prisma.expenseCategory.findFirst({
    where: { nameAr: 'مصروفات عامة' },
  });
  if (!defaultCategory) {
    await prisma.expenseCategory.create({
      data: {
        nameAr: 'مصروفات عامة',
        nameEn: 'General Expenses',
        description: 'تصنيف المصروفات النثرية والتشغيلية العامة',
        isActive: true,
      },
    });
  }

  // 7. Ensure Super Admin Account
  console.log('[Seed] Ensuring Super Admin account...');
  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: SystemRole.SUPER_ADMIN },
  });

  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || '123456';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      isActive: true,
      roleId: superAdminRole.id,
    },
    create: {
      username: 'admin',
      fullName: 'المدير العام',
      phone: '01000000000',
      passwordHash,
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  // Ensure Admin is linked to the primary branch
  const userBranch = await prisma.userBranch.findUnique({
    where: {
      userId_branchId: {
        userId: adminUser.id,
        branchId: mainBranch.id,
      },
    },
  });

  if (!userBranch) {
    await prisma.userBranch.create({
      data: {
        userId: adminUser.id,
        branchId: mainBranch.id,
        isDefault: true,
      },
    });
  }

  // 8. Ensure Initial Cafe Menu Catalog for Qahwet Cairo
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    console.log('[Seed] Seeding initial Qahwet Cairo cafe menu items & categories...');

    const menuData = [
      {
        categoryAr: 'القهوة الساخنة والشرقية',
        categoryEn: 'Hot & Oriental Coffee',
        sortOrder: 1,
        items: [
          {
            nameAr: 'قهوة تركي محوج بالهيل',
            nameEn: 'Turkish Coffee with Cardamom',
            description: 'بن محوج فاخر مطحون طازجاً ومحضر على الرمال الساخنة برغوة غنية ونكهة أصيلة.',
            imageUrl: '/storefront/images/cafe/oriental-coffee.jpg',
            isFeatured: true,
            sizes: [
              { nameAr: 'فنجان سنجل', nameEn: 'Single Cup', price: 3500 },
              { nameAr: 'فنجان دبل', nameEn: 'Double Cup', price: 4500 },
            ],
          },
          {
            nameAr: 'قهوة فرنساوي بالحليب',
            nameEn: 'French Coffee with Milk',
            description: 'مزيج القهوة المحمصة مع الحليب الساخن والكريمة الخفيفة لطعم ناعم ومتوازن.',
            imageUrl: '/storefront/images/cafe/specialty-coffee.jpg',
            isFeatured: false,
            sizes: [
              { nameAr: 'كوب وسط', nameEn: 'Regular', price: 4500 },
              { nameAr: 'كوب كبير', nameEn: 'Large', price: 5500 },
            ],
          },
          {
            nameAr: 'قهوة عربي أصيلة بالهيل والزعفران',
            nameEn: 'Traditional Arabic Coffee',
            description: 'تحضير تقليدي مع حبات الهيل والزعفران الأصلي تقدم برائحة زكية لا تُقاوم.',
            imageUrl: '/storefront/images/cafe/oriental-coffee.jpg',
            isFeatured: false,
            sizes: [
              { nameAr: 'دلة صغيرة', nameEn: 'Small Pot', price: 6000 },
            ],
          },
        ],
      },
      {
        categoryAr: 'القهوة المختصة والإسبريسو',
        categoryEn: 'Specialty Coffee & Espresso',
        sortOrder: 2,
        items: [
          {
            nameAr: 'سبانش لاتيه ساخن',
            nameEn: 'Hot Spanish Latte',
            description: 'إسبريسو غني ممزوج بالحليب المبخر والحليب المكثف المحلى لنكهة كريمية ساحرة.',
            imageUrl: '/storefront/images/cafe/specialty-coffee.jpg',
            isFeatured: true,
            sizes: [
              { nameAr: 'Regular', nameEn: 'Regular', price: 6500 },
              { nameAr: 'Large', nameEn: 'Large', price: 8000 },
            ],
          },
          {
            nameAr: 'كابتشينو إيطالي كلاسيك',
            nameEn: 'Italian Cappuccino',
            description: 'طبقة متوازنة من الإسبريسو المركز مع رغوة حليب ناعمة ورشة قرفة أو كاكاو.',
            imageUrl: '/storefront/images/cafe/cozy-corner.jpg',
            isFeatured: true,
            sizes: [
              { nameAr: 'Regular', nameEn: 'Regular', price: 5500 },
              { nameAr: 'Large', nameEn: 'Large', price: 7000 },
            ],
          },
          {
            nameAr: 'فلات وايت دبل شوت',
            nameEn: 'Flat White Double Shot',
            description: 'جرعتان من الإسبريسو المستخلص بعناية مع طبقة ميكروفوم حريرية.',
            imageUrl: '/storefront/images/cafe/specialty-coffee.jpg',
            isFeatured: false,
            sizes: [
              { nameAr: 'كوب 8oz', nameEn: '8oz Cup', price: 6000 },
            ],
          },
          {
            nameAr: 'أمريكانو كلاسيك',
            nameEn: 'Classic Americano',
            description: 'جرعات إسبريسو غنية مخففة بالماء الساخن بنكهة عميقة ومنعشة.',
            imageUrl: '/storefront/images/cafe/cozy-corner.jpg',
            isFeatured: false,
            sizes: [
              { nameAr: 'Regular', nameEn: 'Regular', price: 4500 },
              { nameAr: 'Large', nameEn: 'Large', price: 5500 },
            ],
          },
        ],
      },
      {
        categoryAr: 'المشروبات المثلجة والفرابتشينو',
        categoryEn: 'Iced Coffee & Frappe',
        sortOrder: 3,
        items: [
          {
            nameAr: 'آيس سبانش لاتيه',
            nameEn: 'Iced Spanish Latte',
            description: 'المشروب الأكثر طلباً: قهوة إسبريسو باردة مع مكعبات الثلج ومزيج الحليب السري المنعش.',
            imageUrl: '/storefront/images/cafe/iced-drinks.jpg',
            isFeatured: true,
            sizes: [
              { nameAr: 'Regular', nameEn: 'Regular', price: 7500 },
              { nameAr: 'Large', nameEn: 'Large', price: 9000 },
            ],
          },
          {
            nameAr: 'آيس كراميل ماكياتو',
            nameEn: 'Iced Caramel Macchiato',
            description: 'حليب مثلج بنكهة الفانيليا مع طبقات الإسبريسو ولمسات صوص الكراميل الغني.',
            imageUrl: '/storefront/images/cafe/iced-drinks.jpg',
            isFeatured: true,
            sizes: [
              { nameAr: 'Regular', nameEn: 'Regular', price: 7000 },
              { nameAr: 'Large', nameEn: 'Large', price: 8500 },
            ],
          },
          {
            nameAr: 'فرابتشينو موكا شوكولاتة',
            nameEn: 'Mocha Frappuccino',
            description: 'مخفوق القهوة والثلج مع صوص الشوكولاتة الفاخر يعلوه كريمة الخفق.',
            imageUrl: '/storefront/images/cafe/iced-drinks.jpg',
            isFeatured: false,
            sizes: [
              { nameAr: 'Large', nameEn: 'Large', price: 8500 },
            ],
          },
        ],
      },
      {
        categoryAr: 'الموخيتو والعصائر المنعشة',
        categoryEn: 'Mojitos & Refreshers',
        sortOrder: 4,
        items: [
          {
            nameAr: 'موخيتو بلوبيري بالنعناع',
            nameEn: 'Blueberry Mint Mojito',
            description: 'توت أزرق طازج مع أوراق النعناع وشرائح الليمون والصودا المثلجة.',
            imageUrl: '/storefront/images/cafe/iced-drinks.jpg',
            isFeatured: false,
            sizes: [
              { nameAr: 'كبير 16oz', nameEn: 'Large 16oz', price: 6000 },
            ],
          },
          {
            nameAr: 'ليمون نعناع فريش مثلج',
            nameEn: 'Fresh Lemon Mint Juice',
            description: 'عصير ليمون طازج مع النعناع الأخضر المنعش والثلج المجروش.',
            imageUrl: '/storefront/images/cafe/iced-drinks.jpg',
            isFeatured: false,
            sizes: [
              { nameAr: 'كبير 16oz', nameEn: 'Large 16oz', price: 5000 },
            ],
          },
        ],
      },
      {
        categoryAr: 'المخبوزات والحلويات',
        categoryEn: 'Bakery & Desserts',
        sortOrder: 5,
        items: [
          {
            nameAr: 'مولتن كيك مع آيس كريم فانيليا',
            nameEn: 'Molten Lava Cake with Ice Cream',
            description: 'كيك الشوكولاتة الدافئ بقلب سائل ذائب يقدم مع بولة آيس كريم فانيليا باردة.',
            imageUrl: '/storefront/images/cafe/bakery-sweets.jpg',
            isFeatured: true,
            sizes: [
              { nameAr: 'قطعة', nameEn: 'Piece', price: 8500 },
            ],
          },
          {
            nameAr: 'تشيز كيك توت أزرق نيو يورك',
            nameEn: 'New York Blueberry Cheesecake',
            description: 'طبقة كريمية غنية على قاعدة بسكويت مقرمشة مغطاة بصوص التوت الأزرق الطبيعي.',
            imageUrl: '/storefront/images/cafe/bakery-sweets.jpg',
            isFeatured: true,
            sizes: [
              { nameAr: 'شريحة', nameEn: 'Slice', price: 8000 },
            ],
          },
          {
            nameAr: 'كرواسون زبدة فرنسي سادة',
            nameEn: 'French Butter Croissant',
            description: 'مخبوز طازج يومياً بطبقات هشة ومقرمشة ومذاق الزبدة الطبيعية الغني.',
            imageUrl: '/storefront/images/cafe/bakery-sweets.jpg',
            isFeatured: false,
            sizes: [
              { nameAr: 'قطعة', nameEn: 'Piece', price: 4500 },
            ],
          },
        ],
      },
    ];

    for (const catData of menuData) {
      const category = await prisma.category.create({
        data: {
          nameAr: catData.categoryAr,
          nameEn: catData.categoryEn,
          sortOrder: catData.sortOrder,
          isActive: true,
        },
      });

      for (let i = 0; i < catData.items.length; i++) {
        const item = catData.items[i];
        const product = await prisma.product.create({
          data: {
            categoryId: category.id,
            nameAr: item.nameAr,
            nameEn: item.nameEn,
            description: item.description,
            imageUrl: item.imageUrl,
            isFeatured: item.isFeatured,
            sortOrder: i + 1,
            isActive: true,
          },
        });

        for (let s = 0; s < item.sizes.length; s++) {
          const size = item.sizes[s];
          await prisma.productSize.create({
            data: {
              productId: product.id,
              nameAr: size.nameAr,
              nameEn: size.nameEn,
              price: size.price,
              sortOrder: s + 1,
              isActive: true,
            },
          });
        }
      }
    }
    console.log('[Seed] Seeded initial cafe menu items successfully.');
  }

  console.log('------------------------------------------------------------');
  console.log('✅ Qahwet Cairo database initialization completed!');
  console.log('📍 Location: العاشر من رمضان - ستريب مول (Open 24/7)');
  console.log('🔑 Super Admin Login:');
  console.log('   - Username: admin');
  console.log(`   - Initial Password: ${adminPassword}`);
  console.log('   - Branch: فرع ستريب مول - العاشر من رمضان (MAIN-01)');
  console.log('⚠️  PLEASE CHANGE PASSWORD IMMEDIATELY UPON FIRST LOGIN');
  console.log('------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ [Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
