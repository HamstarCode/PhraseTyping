import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhraseTyping",
  description: "シチュエーションに合わせて英会話を練習できるタイピングアプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
