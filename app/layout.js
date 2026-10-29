import './globals.css';

export const metadata = {
  title: 'RuangTugas — Kelola tugas dengan tenang',
  description: 'Aplikasi pengelolaan tugas dengan kategori, prioritas, dan tenggat waktu.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
