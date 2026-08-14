# 部署检查清单

## 数据库侧（Aiven）

- [ ] 在 Aiven Console 创建 PostgreSQL 服务（Free 档）
- [ ] 执行 `sql/init-admin.sql`（建表 + 管理员）
- [ ] 用 DBeaver 导入 7 个 CSV 到对应表
- [ ] 执行 `scripts/init-db.sql`（数据修正 + 验证）
- [ ] 验证：`SELECT status, COUNT(*) FROM parking_spaces GROUP BY status;`
- [ ] 确认输出：未售≈800，已售≈1726，其余为锁定/核销

## 本地开发（Win10）

- [ ] 安装 Node.js LTS（v20+）
- [ ] 安装 Git + VS Code（中文语言包）
- [ ] `git clone` 项目 / 解压 zip
- [ ] `npm install`
- [ ] 复制 `.env.example` → `.env.local`，填入 Aiven 连接串
- [ ] `npm run dev` → 浏览器打开 `http://localhost:3000`
- [ ] 登录 admin / 123456
- [ ] 验证：仪表盘数字正确、销控图显示 2526 个车位
- [ ] 测试：锁定一个车位 → 零售销售确认 → 查看记录

## 部署到 Render.com

- [ ] 推送代码到 GitHub 仓库
- [ ] Render Dashboard → New → Blueprint → 选 `render.yaml`
- [ ] 在 Environment Variables 填入 `AIVEN_URL`
- [ ] 修改 `NEXTAUTH_URL` 为实际部署域名
- [ ] 等待首次 Build（约 2-3 分钟）
- [ ] 访问 `https://xxx.onrender.com`
- [ ] 测试登录 + 基本操作

## 常见坑

| 问题 | 解决 |
|---|---|
| npm 报执行策略错误 | PowerShell 管理员运行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Aiven 连接超时 | 检查连接串 `sslmode=require` 是否带；本地网络能否访问境外 |
| Render 冷启动慢 | 免费档 15min 休眠，首次 30-60s 正常；内部使用可接受 |
| 车位状态显示不对 | 执行 `scripts/init-db.sql` 的验证 SQL 看实际分布 |
| 中文乱码 | 确保 CSV 导入时编码选 UTF-8，不是 GBK |
