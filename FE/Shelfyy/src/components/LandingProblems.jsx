export function LandingProblems({ items }) {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-16">Nghe quen không?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
          {items.map((item) => (
            <article
              className={`p-8 rounded-2xl border border-transparent transition-colors ${item.className}`}
              key={item.title}
            >
              <h3 className="font-bold text-lg mb-3">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
