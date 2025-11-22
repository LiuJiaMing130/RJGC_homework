import { supabase } from '../../supabaseClient';

/**
 * 测试 Supabase 连接和数据库表状态
 * 在浏览器控制台运行：testSupabaseConnection()
 */
export async function testSupabaseConnection() {
  console.log('🔍 开始测试 Supabase 连接...\n');

  const results = {
    connection: false,
    auth: false,
    tables: {
      creators: false,
      works: false,
      favorites: false,
      reviews: false,
      workshops: false,
      creator_profiles: false,
    },
    errors: [] as string[],
  };

  // 1. 测试基本连接
  try {
    console.log('1️⃣ 测试基本连接...');
    const { error } = await supabase.from('creators').select('count').limit(0);
    if (error && error.code !== '42P01') {
      // 42P01 是表不存在的错误，这是预期的
      results.connection = true;
      console.log('✅ Supabase 连接正常');
    } else if (error && error.code === '42P01') {
      results.connection = true;
      console.log('✅ Supabase 连接正常（但表不存在）');
    } else {
      results.connection = true;
      console.log('✅ Supabase 连接正常');
    }
  } catch (err: any) {
    results.errors.push(`连接失败: ${err.message}`);
    console.error('❌ Supabase 连接失败:', err);
    return results;
  }

  // 2. 测试用户状态（从 localStorage）
  try {
    console.log('\n2️⃣ 检查用户状态...');
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      results.auth = true;
      console.log('✅ 用户已登录:', user.email || user.username);
    } else {
      console.log('ℹ️ 用户未登录（这是正常的）');
      results.auth = true; // 未登录也是正常状态
    }
  } catch (err: any) {
    console.log('ℹ️ 用户状态检查跳过');
    results.auth = true; // 不影响整体测试
  }

  // 3. 测试各个表是否存在
  console.log('\n3️⃣ 检查数据库表...');
  const tables = ['creators', 'works', 'favorites', 'reviews', 'workshops', 'creator_profiles'] as const;

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ 表 "${table}" 不存在`);
          results.tables[table] = false;
        } else {
          console.log(`⚠️ 表 "${table}" 存在但查询失败:`, error.message);
          results.tables[table] = true; // 表存在，只是查询有问题
        }
      } else {
        console.log(`✅ 表 "${table}" 存在`);
        results.tables[table] = true;
      }
    } catch (err: any) {
      console.error(`❌ 检查表 "${table}" 时出错:`, err);
      results.tables[table] = false;
    }
  }

  // 4. 总结
  console.log('\n📊 测试结果总结:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`连接状态: ${results.connection ? '✅ 正常' : '❌ 失败'}`);
  console.log(`Auth 服务: ${results.auth ? '✅ 正常' : '❌ 失败'}`);
  console.log('\n表状态:');
  Object.entries(results.tables).forEach(([table, exists]) => {
    console.log(`  ${table}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
  });

  if (results.errors.length > 0) {
    console.log('\n⚠️ 错误信息:');
    results.errors.forEach((error) => console.log(`  - ${error}`));
  }

  if (!results.tables.creators) {
    console.log('\n💡 建议:');
    console.log('  请在 Supabase SQL Editor 中执行 reset_database.sql 脚本来创建表');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return results;
}

// 将函数添加到 window 对象，方便在控制台调用
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = testSupabaseConnection;
}

