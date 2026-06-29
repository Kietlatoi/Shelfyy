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
  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };
  return (
    <>
      <Sidebar activeKey="premium" data={sidebarData} />
      <TopNav data={topNavData} onNotify={handleNotify} />

      <main className="ml-64 pt-24 pb-16 px-margin-desktop min-h-screen">
        <div className="max-w-container-max mx-auto space-y-12">
          <LoadingComponent delay={400}>
            <PremiumPricing hero={premiumHeroData} plans={premiumPlans} />
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
