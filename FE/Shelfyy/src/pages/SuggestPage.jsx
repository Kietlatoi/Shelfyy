import { Sidebar } from "../components/Sidebar";
import { SuggestHero } from "../components/SuggestHero";
import { SuggestInsights } from "../components/SuggestInsights";
import { SuggestOutfitCarousel } from "../components/SuggestOutfitCarousel";
import { TopNav } from "../components/TopNav";
import { LoadingComponent } from "../components/LoadingComponent";
import { sidebarData, topNavData } from "../const/homeData";
import {
  aiInsightData,
  outfitSuggestionsData,
  suggestHeroData,
  trendData,
} from "../const/suggestData";

export function SuggestPage() {
  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };
  return (
    <>
      <Sidebar activeKey="suggestions" data={sidebarData} />
      <TopNav data={topNavData} onNotify={handleNotify} />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="max-w-container-max mx-auto py-12 px-margin-desktop space-y-8">
          <LoadingComponent delay={400}>
            <SuggestHero data={suggestHeroData} />
          </LoadingComponent>
          
          <LoadingComponent delay={600}>
            <SuggestOutfitCarousel data={outfitSuggestionsData} />
          </LoadingComponent>

          <LoadingComponent delay={800}>
            <SuggestInsights insight={aiInsightData} trends={trendData} />
          </LoadingComponent>
        </div>
      </main>
    </>
  );
}
