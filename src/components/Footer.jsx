import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full py-8 mt-auto">
      <div className="max-w-2xl mx-auto px-5 text-center">
        <p className="text-xs text-slate-400 leading-relaxed">
          © {new Date().getFullYear()} Namoo Pix · 请勿上传违反中国法律的图片，违者后果自负 ·
          基于{' '}
          <Link
            href="https://github.com/x-dr/telegraph-Image"
            className="text-teal-600 hover:text-teal-700 font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Telegraph-Image
          </Link>{' '}
         开源
        </p>
      </div>
    </footer>
  );
}
