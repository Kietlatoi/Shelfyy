import { MaterialIcon } from './MaterialIcon'

const PLAN_RANK = { FREE: 0, PRO: 1, PREMIUM: 2 }

function rankOf(planType) {
  return PLAN_RANK[String(planType || '').toUpperCase()] ?? 0
}

function formatDate(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function daysRemaining(isoString) {
  if (!isoString) return null
  const expiry = new Date(isoString)
  if (Number.isNaN(expiry.getTime())) return null
  const diffMs = expiry.getTime() - Date.now()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

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

// Hiển thị "Đã mua ngày X · còn Y ngày · hết hạn Z" cho gói trả phí đang active.
function CurrentPlanStatus({ myPlan }) {
  const started = formatDate(myPlan.planStartedAt)
  const expires = formatDate(myPlan.planExpiresAt)
  const remaining = daysRemaining(myPlan.planExpiresAt)

  return (
    <div className="w-full rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-left">
      <p className="flex items-center gap-2 font-bold text-green-700">
        <MaterialIcon name="check_circle" filled size={18} />
        Gói hiện tại của bạn
      </p>
      <dl className="mt-2 space-y-1 text-xs text-green-700/90">
        {started && (
          <div className="flex justify-between">
            <dt>Ngày mua</dt>
            <dd className="font-semibold">{started}</dd>
          </div>
        )}
        {expires && (
          <div className="flex justify-between">
            <dt>Ngày hết hạn</dt>
            <dd className="font-semibold">{expires}</dd>
          </div>
        )}
        {remaining !== null && (
          <div className="flex justify-between">
            <dt>Còn lại</dt>
            <dd className="font-semibold">
              {remaining > 0 ? `${remaining} ngày` : remaining === 0 ? 'Hết hạn hôm nay' : 'Đã hết hạn'}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function PricingCard({ plan, onPlanSelect, loadingPlan, myPlan }) {
  const isLoading = loadingPlan === plan.planType
  const isFree = plan.planType === 'FREE'

  const currentRank = myPlan ? rankOf(myPlan.currentPlan) : 0
  const cardRank = rankOf(plan.planType)
  const isCurrentPlan = myPlan && myPlan.currentPlan === plan.planType
  // Có gói trả phí đang active thì không cho "hạ" xuống gói thấp hơn (khớp rule
  // SUBSCRIPTION_DOWNGRADE_NOT_ALLOWED bên BE) — disable thay vì cho bấm rồi lỗi.
  const isDowngrade = !isFree && myPlan && currentRank > 0 && cardRank < currentRank && !isCurrentPlan

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

      {isCurrentPlan && !isFree ? (
        <CurrentPlanStatus myPlan={myPlan} />
      ) : (
        <button
          className={
            plan.featured
              ? 'w-full py-4 bg-secondary text-white font-bold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed'
              : 'w-full py-4 border border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed'
          }
          type="button"
          disabled={
            isDowngrade || (!isFree && (isLoading || (loadingPlan && loadingPlan !== plan.planType)))
          }
          title={isDowngrade ? 'Không thể chuyển về gói thấp hơn khi gói hiện tại còn hạn' : undefined}
          onClick={() => {
            if (isFree) {
              window.location.hash = '/home'
              return
            }
            onPlanSelect?.(plan)
          }}
        >
          {isDowngrade
            ? 'Gói hiện tại cao hơn'
            : isLoading
              ? 'Đang chuyển sang VNPay...'
              : isFree && myPlan && myPlan.currentPlan === 'FREE'
                ? 'Đang dùng gói này'
                : plan.action}
        </button>
      )}
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

export function PremiumPricing({ hero, plans, onPlanSelect, loadingPlan, myPlan }) {
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
          <PricingCard
            key={plan.name}
            plan={plan}
            onPlanSelect={onPlanSelect}
            loadingPlan={loadingPlan}
            myPlan={myPlan}
          />
        ))}
      </div>
    </>
  )
}
