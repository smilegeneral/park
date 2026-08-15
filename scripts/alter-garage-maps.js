// 临时脚本：garage_maps 表 image_data(TEXT) -> image_url(VARCHAR 512)
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
const m = envText.match(/^AIVEN_URL=(.*)$/m)
const url = (m ? m[1].trim() : '').replace(/[?&]sslmode=(verify-full|verify-ca|require|prefer)/, '')

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 10000 })

async function main() {
  // 若旧列存在则迁移数据
  const hasOld = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='garage_maps' AND column_name='image_data'`
  )
  if (hasOld.rowCount > 0) {
    await pool.query(`ALTER TABLE garage_maps RENAME COLUMN image_data TO image_url`)
    await pool.query(`ALTER TABLE garage_maps ALTER COLUMN image_url TYPE VARCHAR(512) USING image_url::VARCHAR(512)`)
    console.log('已重命名 image_data -> image_url')
  } else {
    await pool.query(`ALTER TABLE garage_maps ADD COLUMN IF NOT EXISTS image_url VARCHAR(512)`)
    console.log('已确保 image_url 列存在')
  }

  const res = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema='public' AND table_name='garage_maps' ORDER BY ordinal_position`
  )
  console.log('garage_maps 列:', res.rows.map(r => `${r.column_name}:${r.data_type}`).join(', '))
}

main()
  .then(() => pool.end())
  .catch((e) => { console.error('❌ 失败:', e.message); return pool.end() })
