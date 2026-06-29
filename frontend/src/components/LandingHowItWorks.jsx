export function LandingHowItWorks({ steps }) {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-20">Cách Hoạt Động</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <article className="text-center group" key={step.title}>
              <div className="relative inline-block mb-10">
                <img
                  alt={step.title}
                  className="w-48 mx-auto rounded-3xl shadow-xl transition-transform group-hover:-translate-y-2"
                  src={step.image}
                />
                <span
                  className={`absolute -top-4 -right-4 w-10 h-10 ${step.badgeClass} text-white rounded-full flex items-center justify-center font-bold text-xl`}
                >
                  {index + 1}
                </span>
              </div>
              <h4 className="font-bold text-lg mb-2">{step.title}</h4>
              <p className="text-sm text-gray-500">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
