import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';
import 'react-toastify/ReactToastify.min.css';
import 'react-photo-view/dist/react-photo-view.css';
import { GoogleAnalytics } from '@next/third-parties/google'


const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "Namoo Pix — 图床",
  description: "Namoo Pix · 简洁的图片与文件托管",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className={jakarta.className}>{children}</body>
      <GoogleAnalytics gaId="G-JVKEXR5XSG" />
    </html>
  );
}
