const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const envPath = path.join(__dirname, '..', '.env.local')
const envText = fs.readFileSync(envPath, 'utf8')
const line = envText.split('\n').find((l) => l.startsWith('AIVEN_URL'))
const AIVEN_URL = line ? line.slice('AIVEN_URL='.length).trim() : ''
if (!AIVEN_URL) { console.error('未找到 AIVEN_URL'); process.exit(1) }
const pool = new Pool({ connectionString: AIVEN_URL, ssl: { rejectUnauthorized: false } })
;(async () => {
  try {
    const cols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='parking_space_change_log' ORDER BY ordinal_position`
    )
    console.log('=== 实际列 ===')
    cols.rows.forEach((c) => console.log(`${c.column_name} (${c.data_type})`))
    const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM parking_space_change_log')
    console.log('记录数:', rows[0].cnt)
    if (rows[0].cnt > 0) {
      const sample = await pool.query(
        'SELECT * FROM parking_space_change_log ORDER BY changed_at DESC LIMIT 5'
      )
      console.log(JSON.stringify(sample.rows, null, 2))
    }
  } catch (e) {
    console.error('查询失败:', e.message)
  } finally {
    await pool.end()
  }
})()
