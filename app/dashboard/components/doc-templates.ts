// 标准单据模板（HTML，含 {{字段}} 占位符）与占位符字段定义
// 用于「表单打印」中心的可视化编辑与预览打印

export type DocType = 'sale' | 'swap'

// 占位符字段：[占位key, 中文标签]
export const DOC_FIELDS: Record<DocType, [string, string][]> = {
  sale: [
    ['sale_order_no', '销售凭证号'],
    ['space_id', '车位号'],
    ['space_type', '车位类型'],
    ['owner_name', '业主姓名'],
    ['phone', '联系电话'],
    ['house_key', '房屋编号'],
    ['amount', '销售价格'],
    ['receipt_no', '收据编号'],
    ['confirm_no', '确认书编号'],
    ['sale_time', '销售时间'],
    ['remarks', '备注'],
  ],
  swap: [
    ['swap_order_no', '调换单号'],
    ['old_space_id', '原车位号'],
    ['house_key', '楼栋-单元-房号'],
    ['owner_name', '业主姓名'],
    ['phone', '联系电话'],
    ['new_space_id', '变更后车位号'],
    ['new_space_type', '变更后车位类型'],
    ['new_space_price', '变更后车位价格'],
    ['old_space_type', '原车位类型'],
    ['old_space_price', '原车位价格'],
    ['price_difference', '差价'],
    ['receipt_no', '原车位确认单号'],
    ['new_receipt_no', '新车位确认单号'],
    ['change_reason', '变更原因'],
    ['remarks', '备注'],
    ['apply_date', '申请日期'],
  ],
}

export const DOC_TITLES: Record<DocType, string> = {
  sale: '车位销售单',
  swap: '车位变更申请单',
}

const baseStyle = `
  <style>
    .doc-table { width:100%; border-collapse:collapse; table-layout:fixed; }
    .doc-table th, .doc-table td { border:1px solid #000; padding:5px 10px; font-size:18px; text-align:center; }
    .doc-head { font-family:"SimHei","黑体",serif; text-align:center; font-size:22px; font-weight:700; margin:0 0 12px; }
    .doc-sign { height:44px; }
    .field-token { background:#fff3cd; border:1px dashed #d39e00; border-radius:3px; padding:0 4px; color:#856404; font-weight:600; }
  </style>
`

export const DEFAULT_SALE_HTML = `${baseStyle}
<h2 class="doc-head">车位销售单</h2>
<table class="doc-table">
  <colgroup><col style="width:22%"><col style="width:28%"><col style="width:22%"><col style="width:28%"></colgroup>
  <tr><th>车位号</th><td>{{space_id}}</td><th>车位类型</th><td>{{space_type}}</td></tr>
  <tr><th>业主姓名</th><td>{{owner_name}}</td><th>联系电话</th><td>{{phone}}</td></tr>
  <tr><th>房屋编号</th><td>{{house_key}}</td><th>销售价格</th><td>{{amount}}</td></tr>
  <tr><th>收据编号</th><td>{{receipt_no}}</td><th>确认书编号</th><td>{{confirm_no}}</td></tr>
  <tr><th>销售时间</th><td colspan="3">{{sale_time}}</td></tr>
  <tr><th>备注</th><td colspan="3" style="text-align:left">{{remarks}}</td></tr>
  <tr><th colspan="2">业主签字</th><th colspan="2">车位管理签字</th></tr>
  <tr><td class="doc-sign" colspan="2"></td><td class="doc-sign" colspan="2"></td></tr>
</table>
<p style="text-align:right;margin-top:8px;">No. {{sale_order_no}}</p>
`

export const DEFAULT_SWAP_HTML = `${baseStyle}
<h2 class="doc-head">车位变更申请单</h2>
<p style="text-align:right;margin:0 0 12px;font-size:18px;">调换单号：{{swap_order_no}}</p>
<table class="doc-table">
  <colgroup><col style="width:20%"><col style="width:30%"><col style="width:25%"><col style="width:25%"></colgroup>
  <tr><th>原车位号</th><td>{{old_space_id}}</td><th>楼栋-单元-房号</th><td>{{house_key}}</td></tr>
  <tr><th>业主姓名</th><td>{{owner_name}}</td><th>联系电话</th><td>{{phone}}</td></tr>
  <tr><th>原车位价格</th><td>{{old_space_price}}</td><th>原车位类型</th><td>{{old_space_type}}</td></tr>
  <tr><th>变更后车位号</th><td>{{new_space_id}}</td><th>变更后车位类型</th><td>{{new_space_type}}</td></tr>
  <tr><th>变更后车位价格</th><td>{{new_space_price}}</td><th>差价</th><td>{{price_difference}}</td></tr>
  <tr><th>原车位确认单号</th><td>{{receipt_no}}</td><th>新车位确认单号</th><td>{{new_receipt_no}}</td></tr>
  <tr><th>变更原因</th><td colspan="3" style="text-align:left">{{change_reason}}</td></tr>
  <tr><th>备注</th><td colspan="3" style="text-align:left">{{remarks}}</td></tr>
  <tr><th colspan="2">业主签字</th><th colspan="2">车位管理签字</th></tr>
  <tr><td class="doc-sign" colspan="2"></td><td class="doc-sign" colspan="2"></td></tr>
  <tr><th colspan="2">分管领导签字</th><th>申请日期</th><td>{{apply_date}}</td></tr>
  <tr><td class="doc-sign" colspan="2"></td><td class="doc-sign" colspan="2"></td></tr>
</table>
`

// 示例占位值（用于在编辑/预览时查看效果）
export function sampleValues(type: DocType, sample: any): Record<string, string> {
  const s0 = sample?.[0]
  const s1 = sample?.[1] || s0
  if (type === 'sale') {
    return {
      sale_order_no: 'SAMPLE-0001',
      space_id: s0?.space_id || 'A-001',
      space_type: s0?.space_type || '标准车位',
      owner_name: s0?.owner_name || '示例业主',
      phone: s0?.phone || '13800000000',
      house_key: s0?.house_key || 'A-1-101',
      amount: s0?.price != null ? `¥${Number(s0.price).toFixed(0)}` : '¥0',
      receipt_no: 'R-0001',
      confirm_no: 'C-0001',
      sale_time: new Date().toLocaleString('zh-CN'),
      remarks: '团购客户 / 特殊优惠说明',
    }
  }
  return {
    swap_order_no: 'SWAP-0001',
    old_space_id: s0?.space_id || 'A-001',
    house_key: s0?.house_key || 'A-1-101',
    owner_name: s0?.owner_name || '示例业主',
    phone: s0?.phone || '13800000000',
    old_space_price: s0?.price != null ? `¥${Number(s0.price).toFixed(0)}` : '¥0',
    old_space_type: s0?.space_type || '标准车位',
    price_difference: '¥50000',
    new_space_id: s1?.space_id || 'B-002',
    new_space_type: s1?.space_type || '标准车位',
    new_space_price: s1?.price != null ? `¥${Number(s1.price).toFixed(0)}` : '¥0',
    receipt_no: 'R-0001',
    new_receipt_no: 'R-0002',
    change_reason: '车位调换',
    remarks: '原房主备注',
    apply_date: new Date().toLocaleDateString('zh-CN'),
  }
}
