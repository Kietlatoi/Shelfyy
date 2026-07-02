export function LandingExtension({ data }) {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">{data.title}</h2>
        <p className="text-gray-600 mb-12">{data.description}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {data.cards.map((card) => (
            <article className="bg-white p-8 rounded-2xl shadow-sm text-left" key={card.title}>
              <div className="flex gap-2">
                {card.icons.map((icon) => (
                  <div
                    className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mb-4"
                    key={icon}
                  >
                    {icon}
                  </div>
                ))}
              </div>
              <h4 className="font-bold mb-2">{card.title}</h4>
              <p className="text-sm text-gray-500">{card.description}</p>
            </article>
          ))}
        </div>
        <div className="flex justify-center gap-4">
          <a
            className="bg-[#b83c44] text-white px-8 py-3 rounded-full font-bold hover:bg-pink-600 transition-colors"
            href="#/home"
          >
            {data.action}
          </a>
        </div>
      </div>
    </section>
  )
}
