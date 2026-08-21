import { Pool, PoolClient } from 'pg'

// Aiven PostgreSQL 连接池
// 免费档连接数有限，max=1 保证不超额
// 注意：pg v8 会把 sslmode=require/verify-ca 当 verify-full 处理，
// 而连接串里未提供 Aiven CA 证书，导致握手失败（self-signed certificate）。
// 因此这里剥离 sslmode 参数，改由下方 ssl 选项控制。
// 安全：生产环境强制校验证书链（防中间人攻击）；
// 仅在显式设置 AIVEN_NO_VERIFY=1 或 NODE_TLS_REJECT_UNAUTHORIZED=0 的开发环境才放宽。
// 如提供 Aiven CA 证书，通过 AIVEN_CA 环境变量注入（PEM 文本）。
const tlsVerifyDisabled =
  process.env.AIVEN_NO_VERIFY === '1' ||
  process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'

const pool = new Pool({
  connectionString: (process.env.AIVEN_URL || '').replace(
    /[?&]sslmode=(verify-full|verify-ca|require|prefer)/,
    ''
  ),
  ssl: tlsVerifyDisabled ? { rejectUnauthorized: false } : { ca: process.env.AIVEN_CA },
  max: 1,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
})

// 事务助手：自动 BEGIN / COMMIT / ROLLBACK
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export default pool
