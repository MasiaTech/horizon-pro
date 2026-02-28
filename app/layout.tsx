import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Horizon',
  description: 'Suivez vos finances et atteignez la liberté financière.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
