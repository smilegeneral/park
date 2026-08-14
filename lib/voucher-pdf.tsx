import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

// ============================================================
//  车位销售凭证 PDF 模板
//  使用 @react-pdf/renderer 服务端渲染
// ============================================================

const styles = StyleSheet.create({
  page: {
    width: 210, minHeight: 297, padding: 20,
    fontFamily: 'Helvetica',
    backgroundColor: '#fff',
  },
  header: {
    textAlign: 'center', marginBottom: 12,
    borderBottom: '2 solid #000', paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666' },
  section: { marginBottom: 10 },
  row: { flexDirection: 'row', marginBottom: 5 },
  label: { width: 60, fontSize: 11, color: '#333' },
  value: { flex: 1, fontSize: 11, fontWeight: 'bold' },
  divider: { borderBottom: '1 solid #ccc', marginVertical: 8 },
  stampBox: {
    marginTop: 20, flexDirection: 'row', justifyContent: 'space-between',
  },
  stamp: {
    width: 80, height: 80, border: '2 solid #c00',
    borderRadius: 40, alignItems: 'center', justifyContent: 'center',
  },
  stampText: { fontSize: 10, color: '#c00', fontWeight: 'bold' },
  footer: {
    marginTop: 15, fontSize: 9, color: '#999', textAlign: 'center',
  },
  notice: {
    marginTop: 10, padding: 6, backgroundColor: '#fffbe6',
    border: '1 solid #ffe58f', fontSize: 9, color: '#d48806',
  },
})

export interface VoucherData {
  voucher_no: string
  space_no: string
  space_type: string
  owner_name: string
  phone: string
  house_key: string
  amount: number
  sale_date: string
  receipt_no: string
  confirm_no: string
  is_group_buy?: boolean
  group_company?: string
  operator: string
}

export function SaleVoucherPDF({ data }: { data: VoucherData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 标题 */}
        <View style={styles.header}>
          <Text style={styles.title}>车位购买凭证</Text>
          <Text style={styles.subtitle}>Voucher No: {data.voucher_no}</Text>
        </View>

        {/* 业主信息 */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>业主姓名</Text>
            <Text style={styles.value}>{data.owner_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>联系电话</Text>
            <Text style={styles.value}>{data.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>房屋编号</Text>
            <Text style={styles.value}>{data.house_key}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 车位信息 */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>车位编号</Text>
            <Text style={styles.value}>{data.space_no}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>车位类型</Text>
            <Text style={styles.value}>{data.space_type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>车位金额</Text>
            <Text style={styles.value}>¥ {data.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>销售日期</Text>
            <Text style={styles.value}>{data.sale_date}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 凭证编号 */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>收据编号</Text>
            <Text style={styles.value}>{data.receipt_no}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>确认书号</Text>
            <Text style={styles.value}>{data.confirm_no}</Text>
          </View>
          {data.is_group_buy && (
            <View style={styles.row}>
              <Text style={styles.label}>团购公司</Text>
              <Text style={styles.value}>{data.group_company}</Text>
            </View>
          )}
        </View>

        {/* 提示 */}
        <View style={styles.notice}>
          <Text>本凭证为车位购买有效凭证，请妥善保管。如有疑问请联系开发商。</Text>
        </View>

        {/* 印章区 */}
        <View style={styles.stampBox}>
          <View style={styles.stamp}>
            <Text style={styles.stampText}>开发商</Text>
            <Text style={styles.stampText}>盖章</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, color: '#333' }}>经办人：{data.operator}</Text>
            <Text style={{ fontSize: 10, color: '#333', marginTop: 4 }}>
              日期：{data.sale_date}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          本凭证由车位管理系统自动生成，系统编号 {data.voucher_no}
        </Text>
      </Page>
    </Document>
  )
}
