const Footer = () => {
  return (
    <footer className="mt-16 border-t border-white/10 py-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-1 px-6">
        <p className="text-sm text-white/45">
          © {new Date().getFullYear()} Vinay Shah. All rights reserved.
        </p>
        <p className="text-xs text-white/25">
          Rendered in WebGPU with{' '}
          <a
            href="https://github.com/vercel-labs/vgpu"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/20 underline-offset-2 transition-colors hover:text-white/50"
          >
            vgpu
          </a>
        </p>
      </div>
    </footer>
  )
}

export default Footer
