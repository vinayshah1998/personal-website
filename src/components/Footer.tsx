export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <nav className="footer-links" aria-label="Social links">
          <a
            className="footer-link"
            href="https://github.com/vinayshah1998"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a
            className="footer-link"
            href="https://linkedin.com/in/vinay-s-shah"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </nav>
      </div>
    </footer>
  );
}
