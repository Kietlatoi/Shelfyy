import { useEffect, useState } from "react";
import { subscriptionApi } from "../api/subscriptionApi";
import { toPremiumPlans } from "../api/adapters";
import { isAuthenticated } from "../api/tokenStore";
import { PremiumComparison } from "../components/PremiumComparison";
import { PremiumFaq } from "../components/PremiumFaq";
import { PremiumFooter } from "../components/PremiumFooter";
import { PremiumPricing } from "../components/PremiumPricing";
import { PremiumTrust } from "../components/PremiumTrust";
import { Sidebar } from "../components/Sidebar";
import { TopNav } from "../components/TopNav";
import { LoadingComponent } from "../components/LoadingComponent";
import { sidebarData, topNavData } from "../const/homeData";
import {
  premiumComparisonData,
  premiumFaqData,
  premiumFooterData,
  premiumHeroData,
  premiumPlans,
  premiumTrustData,
} from "../const/premiumData";

export function PremiumPage() {
  const [plans, setPlans] = useState(premiumPlans);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    subscriptionApi.getPlans()
      .then((data) => setPlans(toPremiumPlans(data)))
      .catch(() => setPlans(premiumPlans));
  }, []);

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };

  const handlePlanSelect = async (plan) => {
    if (!plan?.planType || plan.planType === "FREE") return;
    if (!isAuthenticated()) {
      window.alert("Vui lòng đăng nhập trước khi nâng cấp gói.");
      window.location.hash = "/";
      return;
    }

    setLoadingPlan(plan.planType);
    setMessage("");
    setError("");
    try {
      await subscriptionApi.upgrade(plan.planType);
      setMessage(`Đã nâng cấp thành công lên ${plan.name}.`);
    } catch (err) {
      setError(err.message || "Nâng cấp gói thất bại");
    } finally {
      setLoadingPlan("");
    }
  };

  return (
    <>
      <Sidebar activeKey="premium" data={sidebarData} />
      <TopNav data={topNavData} onNotify={handleNotify} />

      <main className="ml-64 pt-24 pb-16 px-margin-desktop min-h-screen">
        <div className="max-w-container-max mx-auto space-y-12">
          {message && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{message}</p>}
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}
          <LoadingComponent delay={400}>
            <PremiumPricing hero={premiumHeroData} plans={plans} onPlanSelect={handlePlanSelect} loadingPlan={loadingPlan} />
          </LoadingComponent>

          <LoadingComponent delay={600}>
            <PremiumComparison data={premiumComparisonData} />
          </LoadingComponent>

          <LoadingComponent delay={800}>
            <PremiumTrust data={premiumTrustData} />
            <PremiumFaq data={premiumFaqData} />
          </LoadingComponent>
        </div>
      </main>

      <PremiumFooter data={premiumFooterData} />
    </>
  );
}
