import { MaterialIcon } from './MaterialIcon'

function PlanFeature({ feature }) {
  if (feature.premium) {
    return (
      <li className="flex items-start gap-3">
        <MaterialIcon name="stars" filled className="text-secondary text-lg" />
        <span className="font-body-md text-on-surface font-semibold">{feature.label}</span>
      </li>
    )
  }

  return (
    <li className="flex items-start gap-3">
      <MaterialIcon
        name={feature.included ? 'check_circle' : 'cancel'}
        className={`${
          feature.included ? 'text-green-600' : 'text-text-muted opacity-40'
        } text-lg`}
      />
      <span
        className={`font-body-md text-on-surface-variant ${
          feature.included ? '' : 'opacity-60'
        }`}
      >
        {feature.label}
      </span>
    </li>
  )
}

function PricingCard({ plan }) {
  const content = (
    <>
      {plan.badge && (
        <div className="absolute top-0 right-8 -translate-y-1/2 bg-secondary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
          {plan.badge}
        </div>
      )}
      <div className="mb-8">
        <span
          className={`font-label-md ${
            plan.featured ? 'text-secondary' : 'text-text-muted'
          } uppercase tracking-wider`}
        >
          {plan.tier}
        </span>
        <h3 className="font-headline-lg text-headline-lg mt-2">{plan.name}</h3>
        <p className={`${plan.featured ? 'text-secondary' : 'text-primary'} font-bold text-3xl mt-4`}>
          {plan.price}
          <span className="text-sm font-normal text-text-muted">{plan.suffix}</span>
        </p>
      </div>
      <ul className="space-y-4 mb-10 flex-1">
        {plan.features.map((feature) => (
          <PlanFeature feature={feature} key={feature.label} />
        ))}
      </ul>
      <button
        className={
          plan.featured
            ? 'w-full py-4 bg-secondary text-white font-bold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-secondary/20'
            : 'w-full py-4 border border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all'
        }
        type="button"
      >
        {plan.action}
      </button>
    </>
  )

  if (plan.featured) {
    return (
      <article className="pro-gradient rounded-xl p-[2px] shadow-2xl scale-105 relative z-10">
        <div className="bg-white h-full w-full rounded-[10px] p-8 flex flex-col">{content}</div>
      </article>
    )
  }

  return (
    <article className="bg-white border border-border-subtle rounded-xl p-8 flex flex-col h-full hover:shadow-lg hover:-translate-y-2 transition-all">
      {content}
    </article>
  )
}

export function PremiumPricing({ hero, plans }) {
  return (
    <>
      <section className="text-center mb-16">
        <h2 className="font-display-lg text-display-lg text-primary mb-4">{hero.title}</h2>
        <p className="font-body-lg text-body-lg text-text-muted max-w-2xl mx-auto">
          {hero.description}
        </p>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-20">
        {plans.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>
    </>
  )
}
