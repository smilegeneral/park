'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SignOutButton from '../sign-out-button'

export type NavItem = {
  href: string
  label: string
  icon: string
  perm: string
  group: string
}

export type SidebarUser = {
  displayName?: string
  name?: string
  role: number
}

export default function Sidebar({
  items,
  user,
}: {
  items: NavItem[]
  user: SidebarUser
}) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // 按分组聚合
  const groups: { name: string; items: NavItem[] }[] = []
  for (const it of items) {
    let g = groups.find(x => x.name === it.group)
    if (!g) { g = { name: it.group, items: [] }; groups.push(g) }
    g.items.push(it)
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const roleLabel =
    user.role === 3 ? '超级管理员'
      : user.role === 2 ? '管理员'
        : user.role === 1 ? '销售员'
          : '访客'

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* 顶部：标题 + 折叠按钮 */}
      <div className="sidebar-head">
        {!collapsed && <span className="sidebar-title">车位管理</span>}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? '展开菜单' : '收起菜单'}
          aria-label={collapsed ? '展开菜单' : '收起菜单'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      {/* 用户信息 */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {(user.displayName || user.name || '?').slice(0, 1)}
        </div>
        {!collapsed && (
          <div className="sidebar-userinfo">
            <div className="sidebar-username">{user.displayName || user.name}</div>
            <div className="sidebar-role">{roleLabel}</div>
          </div>
        )}
      </div>

      {/* 菜单 */}
      <nav className="sidebar-nav">
        {groups.map(g => (
          <div key={g.name} className="sidebar-group">
            {!collapsed && <div className="sidebar-group-title">{g.name}</div>}
            {g.items.map(it => {
              const active = isActive(it.href)
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={collapsed ? it.label : undefined}
                  className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
                >
                  <span className="sidebar-icon">{it.icon}</span>
                  {!collapsed && <span className="sidebar-label">{it.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* 底部：退出 */}
      <div className="sidebar-foot">
        {!collapsed && <SignOutButton />}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="sidebar-toggle"
            title="退出登录"
          >
            ⎋
          </button>
        )}
      </div>
    </aside>
  )
}
