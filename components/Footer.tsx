export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="border-t mt-auto transition-all duration-500"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderColor: 'var(--theme-border)',
        borderWidth: 'var(--theme-border-width)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <div className="text-center sm:text-left" style={{ color: 'var(--theme-text-muted)' }}>
            <p className="mb-1">
              Daniel Luque es abogado y emprendedor radicado en Medellín
            </p>
            <p className="text-xs opacity-70">
              © {currentYear} Daniel Luque. Todos los derechos reservados.
            </p>
          </div>
          <div>
            <a
              href="https://threads.net/@luque_restrepo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-80 active:scale-95"
              style={{
                backgroundColor: 'var(--theme-accent)',
                color: 'var(--theme-bg)',
                borderRadius: 'var(--theme-radius)',
              }}
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12.002 2.005c5.518 0 9.998 4.48 9.998 9.997C22 17.52 17.52 22 12.002 22c-5.517 0-9.997-4.48-9.997-9.998 0-5.517 4.48-9.997 9.997-9.997zm0 1.5c-4.69 0-8.497 3.807-8.497 8.497S7.312 20.5 12.002 20.5s8.498-3.808 8.498-8.497S16.692 3.505 12.002 3.505zM8.715 13.987l8.47-8.47a.75.75 0 011.06 0l.884.884a.75.75 0 010 1.06l-8.47 8.47a.75.75 0 01-1.06 0l-.884-.884a.75.75 0 010-1.06z" />
              </svg>
              Threads @luque_restrepo
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

