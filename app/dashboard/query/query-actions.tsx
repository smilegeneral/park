'use client'

import type { ParkingSpace } from '@/lib/types'

const HEADERS = ['车位号', '区域', '楼栋', '类型', '状态', '业主', '电话', '房屋', '价格']
const COLS: (keyof ParkingSpace)[] = [
  'space_id', 'garage_zone', 'building_no', 'space_type', 'status',
  'owner_name', 'phone', 'house_key', 'price',
]

export default function QueryActions({ rows }: { rows: ParkingSpace[] }) {
  function handlePrint() {
    window.print()
  }

  function handleExport() {
    const escape = (v: any) => String(v ?? '').replace(/[<>]/g, '')
    let html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">' +
      '<head><meta charset="utf-8"></head><body><table border="1" cellspacing="0" cellpadding="4">' +
      '<tr>' + HEADERS.map(h => `<th>${h}</th>`).join('') + '</tr>'
    rows.forEach(r => {
      html += '<tr>' + COLS.map(c => `<td>${escape(r[c])}</td>`).join('') + '</tr>'
    })
    html += '</table></body></html>'

    const blob = new Blob(['﻿' + html], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `车位查询结果_${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="query-no-print flex" style={{ gap: 8, marginBottom: 12 }}>
      <button className="btn-primary" style={{ fontSize: 13 }} onClick={handlePrint} disabled={rows.length === 0}>
        🖨️ 打印查询表格
      </button>
      <button className="btn-secondary" style={{ fontSize: 13 }} onClick={handleExport} disabled={rows.length === 0}>
        📥 导出 Excel
      </button>
    </div>
  )
}
