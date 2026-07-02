const screenImg = new URL("../../image/app-screen.png", import.meta.url).href;

export function LandingHero({ data }) {
  return (
    <section className="landing-gradient pt-16 pb-24 overflow-hidden">
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center lg:pl-[150px]">
        <div className="max-w-xl" data-purpose="hero-content">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold mb-6">
            <span>{data.badge}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            {data.title}
          </h1>
          <p className="text-lg text-gray-600 mb-10 leading-relaxed">
            {data.description}
          </p>
        </div>
        <div className="relative flex justify-center items-center">
          <div className="relative w-[300px] md:w-[350px] aspect-[9/19] rounded-[40px] shadow-2xl border-8 border-black overflow-hidden bg-white">
            <img
              src={screenImg}
              alt="App Screen"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
