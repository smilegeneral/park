# 小区车库车位管理系统

> 基于 Next.js 14 (App Router) + React Server Components + PostgreSQL (Aiven)
> 专为开发商 ↔ 业主 之间的车位销售、调换、团购、核销场景设计

## 功能一览

| 模块 | 说明 |
|---|---|
| 🔐 密码登录 | NextAuth Credentials + bcryptjs，默认 admin/123456 |
| 🗺️ 销控图 | 按区域(A/B/C/D区)展示 2526 个车位，颜色区分状态，点击锁定 |
| 💰 零售销售 | 锁定 → 录入业主(姓名/手机/房屋) → 确认 → 状态变已售 |
| 🔄 车位调换 | 业主间互换 / 换回开发商池，差价可填，全留痕 |
| 🏢 团购管理 | 公司批量锁定车位 → 逐个核销转给最终业主 |
| 📋 销售记录 | 历史销售单查询 |
| 📜 变更日志 | 所有调换/核销操作全审计 |

## 车位状态机

```
未售 ──点击──▶ 零售锁定 ──确认销售──▶ 已售
  ▲                      │
  │                      ▼
  └──── 解除锁定 ◀──── 零售锁定

未售 ──团购下单──▶ 团购锁定 ──核销──▶ 已核销
                                      │
                                      ▼
                                 (业主确权)
```

## 数据库表结构（与 CSV 对齐）

| 表名 | 说明 |
|---|---|
| `parking_spaces` | 车位主表（2526条），核心字段：space_id/status/owner_name/price/house_key |
| `owner_info` | 业主+房屋信息，house_key 为楼栋-单元-房间组合键 |
| `group_buy_company` | 团购公司，含 department/space_list(逗号分隔)/is_paid |
| `parking_sales_records` | 销售记录，含 sale_order_no/receipt_no/confirmation_no |
| `parking_space_change_log` | 调换日志，含 old/new 双组字段 + swap_type + price_difference |
| `owner_info_change_log` | 业主信息变更日志 |
| `group_buy_verify_detail` | 团购核销明细 |
| `admin_user` | 管理员账号，password_hash 为 bcryptjs |

## 快速开始

### 1. 初始化数据库（Aiven Console → SQL Editor）

```bash
# 执行两个 SQL 文件
sql/init-admin.sql      # 建表 + 管理员 admin/123456
# 然后导入 7 个 CSV 到对应表
```

### 2. 本地开发

```bash
cd parking-system
npm install
cp .env.example .env.local
# 编辑 .env.local，填入 Aiven 连接串
npm run dev
# 打开 http://localhost:3000
```

### 3. 部署到 Render.com

1. 推送代码到 GitHub
2. Render Dashboard → New → Blueprint → 选择 `render.yaml`
3. 在 Environment Variables 中填入 `AIVEN_URL`
4. 部署完成后访问 `https://xxx.onrender.com`

## 项目结构

```
parking-system/
├── app/
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 首页 → 重定向到 /dashboard
│   ├── login/page.tsx          # 登录页 (Client)
│   ├── dashboard/
│   │   ├── page.tsx            # 仪表盘 (Server Component)
│   │   ├── sign-out-button.tsx # 退出登录
│   │   ├── spaces/             # 销控图
│   │   │   ├── page.tsx        # 按区域查看
│   │   │   └── space-grid.tsx # 车位网格 (Client)
│   │   ├── sale/               # 零售销售
│   │   │   ├── page.tsx        # 已锁定车位列表
│   │   │   └── sale-form.tsx  # 销售确认表单
│   │   ├── swap/               # 车位调换
│   │   │   ├── page.tsx
│   │   │   └── swap-form.tsx
│   │   ├── group-buy/          # 团购管理
│   │   │   ├── page.tsx
│   │   │   ├── group-buy-panel.tsx
│   │   │   └── verify-panel.tsx
│   │   ├── records/page.tsx    # 销售记录
│   │   └── logs/page.tsx      # 变更日志
│   └── api/auth/[...nextauth]/route.ts
├── lib/
│   ├── db.ts                  # pg 连接池（max=1 防 Aiven 免费档爆连接）
│   ├── auth.ts                # NextAuth 配置
│   ├── types.ts               # TypeScript 类型定义
│   ├── queries.ts             # 所有 SELECT 查询
│   ├── actions.ts             # 所有写操作 (Server Actions + 事务)
│   └── voucher-pdf.tsx       # PDF 凭证模板
├── sql/
│   └── init-admin.sql         # 建表 + 管理员初始化
├── .env.example               # 环境变量模板
├── render.yaml                # Render 一键部署
├── next.config.js
├── tsconfig.json
└── package.json
```

## 技术要点

- **React Server Components**：仪表盘/销控图/记录页全部服务端渲染，零 JS 发往浏览器
- **Server Actions**：所有写操作（锁位/销售/调换/团购/核销）走 `'use server'`，无需手写 API
- **数据库事务**：`withTransaction()` 包裹所有多表操作，保证一致性
- **乐观锁防超卖**：`UPDATE ... WHERE status='未售'` 原子操作
- **Aiven 连接池 max=1**：免费档连接数有限，防泄漏

## 安全说明

- 管理员密码 bcryptjs hash 存储（cost 10）
- NextAuth JWT 会话，无外部 auth 依赖
- 所有写操作走 Server Actions，客户端无法直接调 DB
- 业主手机号等敏感字段建议后续加 AES 加密

## 已知限制

- Aiven 免费档 1GB 存储 / 单节点无备份 → 建议每月 `pg_dump` 备份
- Render 免费档 15min 休眠 → 内部使用可接受
- 车位 > 2500 个时销控图单次渲染较多 DOM，后续可加分页/虚拟滚动
