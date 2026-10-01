const Footer = () => {
  return (
    <footer className="mt-16 py-8 border-t border-line">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <p className="font-display text-ink-soft italic">Thanks for visiting the island.</p>
        <p className="mt-1 text-sm text-ink-soft">© {new Date().getFullYear()} Vinay Shah. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
