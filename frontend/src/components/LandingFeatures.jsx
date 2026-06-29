function FeatureImages({ feature }) {
  return (
    <div className={feature.stacked ? 'flex flex-col gap-4' : 'flex gap-4'}>
      {feature.images.map((image, index) => (
        <img
          alt={`${feature.title} ${index + 1}`}
          className={`${feature.stacked ? 'rounded-3xl shadow-md' : 'w-1/2 rounded-3xl shadow-lg'}`}
          key={image}
          src={image}
        />
      ))}
    </div>
  )
}

function FeatureRow({ feature }) {
  const text = (
    <div className={feature.reverse ? 'order-1 md:order-2' : ''}>
      <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
    </div>
  )
  const images = (
    <div className={feature.reverse ? 'order-2 md:order-1' : ''}>
      <FeatureImages feature={feature} />
    </div>
  )

  return (
    <div className="grid md:grid-cols-2 gap-20 items-center mb-32 max-w-6xl mx-auto">
      {feature.reverse ? (
        <>
          {images}
          {text}
        </>
      ) : (
        <>
          {text}
          {images}
        </>
      )}
    </div>
  )
}

export function LandingFeatures({ features }) {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-24">AI Thay Đổi Cách Bạn Ăn Mặc</h2>
        {features.map((feature) => (
          <FeatureRow feature={feature} key={feature.title} />
        ))}
      </div>
    </section>
  )
}
