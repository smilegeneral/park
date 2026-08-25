import { Pool, PoolClient } from 'pg'

// Aiven PostgreSQL 连接池
// 免费档连接数有限，max=1 保证不超额
// 注意：pg v8 会把 sslmode=require/verify-ca 当 verify-full 处理，
// 而连接串里未提供 Aiven CA 证书，导致握手失败（self-signed certificate）。
// 因此这里剥离 sslmode 参数，改由下方 ssl 选项控制。
// 安全：生产环境强制校验证书链（防中间人攻击）；
// 仅在显式设置 AIVEN_NO_VERIFY=1 或 NODE_TLS_REJECT_UNAUTHORIZED=0 的开发环境才放宽。
import { readFileSync } from 'fs'
import { join } from 'path'

// AIVEN_CA 提供方式（任意其一即可）：
//   1) 环境变量 AIVEN_CA：直接粘贴完整 PEM 文本（推荐，构建期会写入 ca.pem 供运行时读取）
//   2) 仓库/构建产物中的 ca.pem 文件：构建脚本把 AIVEN_CA 落盘后，运行时从此读取
// 若两者皆无，则回退到 Node 内置根证书校验（rejectUnauthorized=true，仍防中间人）。
// 注：EdgeOne Pages 等 Serverless 平台不支持手动上传文件到运行时，
//     故通过构建期把 AIVEN_CA 写入 ca.pem，再于运行时读取文件来满足"文件读取"需求。
const tlsVerifyDisabled =
  process.env.AIVEN_NO_VERIFY === '1' ||
  process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'

function resolveCa(): string | undefined {
  if (process.env.AIVEN_CA) return process.env.AIVEN_CA
  try {
    return readFileSync(join(process.cwd(), 'ca.pem'), 'utf8')
  } catch {
    return undefined
  }
}

const ca = resolveCa()
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
