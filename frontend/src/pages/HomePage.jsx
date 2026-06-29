import { CalendarCard } from "../components/CalendarCard";
import { OutfitSuggestion } from "../components/OutfitSuggestion";
import { Sidebar } from "../components/Sidebar";
import { TopNav } from "../components/TopNav";
import { WeatherCard } from "../components/WeatherCard";
import { LoadingComponent } from "../components/LoadingComponent";
import {
  calendarData,
  outfitData,
  sidebarData,
  topNavData,
  weatherData,
} from "../const/homeData";

export function HomePage() {
  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };

  return (
    <>
      <Sidebar activeKey="home" data={sidebarData} />
      <TopNav data={topNavData} onNotify={handleNotify} />

      <main className="ml-64 pt-24 pb-12 px-gutter max-w-container-max mx-auto">
        <div className="grid grid-cols-12 gap-gutter">
          <div className="col-span-12 lg:col-span-5 space-y-gutter">
            <LoadingComponent delay={500}>
              <WeatherCard weather={weatherData} />
            </LoadingComponent>
            <LoadingComponent delay={700}>
              <CalendarCard calendar={calendarData} />
            </LoadingComponent>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <LoadingComponent delay={600}>
              <OutfitSuggestion outfit={outfitData} />
            </LoadingComponent>
          </div>
        </div>
      </main>
    </>
  );
}
