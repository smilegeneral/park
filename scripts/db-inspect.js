// 临时诊断脚本：查看 parking_sales_records 约束 + 业主相关表结构（只读）
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
const m = envText.match(/^AIVEN_URL=(.*)$/m)
const url = (m ? m[1].trim() : '').replace(
  /[?&]sslmode=(verify-full|verify-ca|require|prefer)/, ''
)

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 10000 })

async function main() {
  try {
    // 1. parking_sales_records 所有 CHECK 约束
    const checks = await pool.query(
      `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
       WHERE conrelid = 'parking_sales_records'::regclass AND contype = 'c'`
    )
    console.log('== parking_sales_records CHECK constraints ==')
    console.log(JSON.stringify(checks.rows, null, 2))

    // 2. 表结构
    for (const t of ['parking_sales_records', 'owner_info', 'owner_info_change_log']) {
      const cols = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t])
      console.log(`== ${t} columns ==`)
      console.log(cols.rows.map(r => `${r.column_name}:${r.data_type}`).join(', '))
    }

    // 3. owner_info 现有数据量 + 样例
    try {
      const owners = await pool.query(`SELECT COUNT(*)::int AS n FROM owner_info`)
      console.log('owner_info count:', owners.rows[0].n)
      const sample = await pool.query(`SELECT * FROM owner_info LIMIT 3`)
      console.log('sample owners:', JSON.stringify(sample.rows))
    } catch (e) {
      console.log('owner_info query error:', e.message)
    }

    // 4. 模拟 confirmRetailSale 插入（回滚）
    const sampleSpace = await pool.query(
      `SELECT space_id FROM parking_spaces WHERE status='零售锁定' LIMIT 1`)
    console.log('locked space sample:', JSON.stringify(sampleSpace.rows))
  } catch (e) {
    console.error('DB ERROR:', e.message)
  } finally {
    await pool.end()
  }
}

main()
