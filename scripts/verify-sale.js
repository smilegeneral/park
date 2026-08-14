// 临时验证脚本：模拟 confirmRetailSale 的 INSERT（事务内执行后回滚）
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
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const res = await client.query(
      `INSERT INTO parking_sales_records
       (sale_order_no, space_no, space_type, house_key, owner_name, phone,
        amount, sale_time, receipt_no, confirmation_no, is_group_buy, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,'否','已确认')
       RETURNING record_id, is_group_buy`,
      ['TEST-' + Date.now(), 'TEST-001', '普通车位', '1-1-999', '测试', '13800000000',
       100000, 'R-999', 'C-999']
    )
    console.log('INSERT OK:', JSON.stringify(res.rows[0]))
    await client.query('ROLLBACK')
    console.log('rolled back (data unchanged)')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('INSERT FAILED:', e.message)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
