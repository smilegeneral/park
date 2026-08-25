import { Pool, PoolClient } from 'pg'

// Aiven PostgreSQL 连接池
// 免费档连接数有限，max=1 保证不超额
// 注意：pg v8 会把 sslmode=require/verify-ca 当 verify-full 处理，
// 而连接串里未提供 Aiven CA 证书，导致握手失败（self-signed certificate）。
// 因此这里剥离 sslmode 参数，改由下方 ssl 选项控制。
// 安全：生产环境强制校验证书链（防中间人攻击）；
// 仅在显式设置 AIVEN_NO_VERIFY=1 或 NODE_TLS_REJECT_UNAUTHORIZED=0 的开发环境才放宽。
// AIVEN_CA 为可选：若提供 Aiven CA 证书（PEM 文本）则用它做严格链校验；
// 若未提供，则回退到 Node 内置根证书校验（Aiven 使用公开 CA 签发，可被内置根信任），
// 此时仍保持 rejectUnauthorized=true，不影响传输安全。
const tlsVerifyDisabled =
  process.env.AIVEN_NO_VERIFY === '1' ||
  process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'

const ca = process.env.AIVEN_CA
const sslConfig = tlsVerifyDisabled
  ? { rejectUnauthorized: false }
  : ca
    ? { ca }
    : { rejectUnauthorized: true }

const pool = new Pool({
  connectionString: (process.env.AIVEN_URL || '').replace(
    /[?&]sslmode=(verify-full|verify-ca|require|prefer)/,
    ''
  ),
  ssl: sslConfig,
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
