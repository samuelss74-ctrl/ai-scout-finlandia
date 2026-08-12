import "./globals.css";

export const metadata = {
  title: "AI Scout – Finlandia P2011",
  description: "Tränarassistent för Finlandia Pallo AIF P2011",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
