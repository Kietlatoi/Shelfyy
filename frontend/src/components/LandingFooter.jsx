export function LandingFooter({ data }) {
  return (
    <footer className="bg-[#0c0c14] text-white pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div>
            <img alt="Acloset" className="h-6 mb-6 brightness-0 invert" src={data.logo} />
            <p className="text-sm text-gray-400 leading-relaxed mb-6">{data.description}</p>
            <div className="flex gap-4">
              {data.badges.map((badge) => (
                <a href="#" key={badge.alt}>
                  <img alt={badge.alt} className="h-8" src={badge.src} />
                </a>
              ))}
            </div>
          </div>
          {data.columns.map((column) => (
            <div key={column.title}>
              <h5 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-500">
                {column.title}
              </h5>
              <ul className="text-sm text-gray-400 space-y-4">
                {column.links.map((link) => (
                  <li key={link}>
                    <a className="hover:text-white" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h5 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-500">
              {data.contact.title}
            </h5>
            <p className="text-sm text-gray-400 mb-2">{data.contact.email}</p>
            <p className="text-xs text-gray-600">{data.contact.address}</p>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-gray-500">{data.copyright}</p>
          <div className="flex gap-6 text-[10px] text-gray-500">
            {data.legal.map((item) => (
              <a className="hover:text-white" href="#" key={item}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
