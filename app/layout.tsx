import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vending Admin',
  description: 'แอดมินจัดการตู้ขายสินค้า',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
