export default function Footer() {
  return (
    <footer className="w-full py-8 mt-auto">
      <div className="max-w-2xl mx-auto px-5 text-center">
        <p className="text-xs text-slate-400 leading-relaxed">
          © {new Date().getFullYear()} Namoo Pix ·{' '}
          <a
            href="https://github.com/nardinmarcus/image-host"
            className="text-teal-600 hover:text-teal-700 font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
