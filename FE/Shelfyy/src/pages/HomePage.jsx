import { useEffect, useState } from "react";
import { homeApi } from "../api/homeApi";
import { userApi } from "../api/userApi";
import { toCalendarCard, toOutfitSuggestion, toTopNav, toWeatherCard } from "../api/adapters";
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

function getBrowserLocation() {
  if (!navigator.geolocation) return Promise.resolve({});

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: false, timeout: 2500, maximumAge: 300000 }
    );
  });
}

export function HomePage() {
  const [weather, setWeather] = useState(weatherData);
  const [calendar, setCalendar] = useState(calendarData);
  const [outfit, setOutfit] = useState(outfitData);
  const [nav, setNav] = useState(topNavData);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadHome() {
      try {
        const location = await getBrowserLocation();
        const [home, profile] = await Promise.all([
          homeApi.getHome(location),
          userApi.me().catch(() => null),
        ]);

        if (ignore) return;
        setWeather(toWeatherCard(home?.weather));
        setCalendar(toCalendarCard(home?.upcomingEvent));
        setOutfit(toOutfitSuggestion(home?.outfitSuggestion));
        setNav(toTopNav(profile));
        setError("");
      } catch (err) {
        if (!ignore) setError(err.message || "Không tải được dữ liệu trang chủ");
      }
    }

    loadHome();
    return () => {
      ignore = true;
    };
  }, []);

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };

  return (
    <>
      <Sidebar activeKey="home" data={sidebarData} />
      <TopNav data={nav} onNotify={handleNotify} />

      <main className="ml-64 pt-24 pb-12 px-gutter max-w-container-max mx-auto">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        <div className="grid grid-cols-12 gap-gutter">
          <div className="col-span-12 lg:col-span-5 space-y-gutter">
            <LoadingComponent delay={500}>
              <WeatherCard weather={weather} />
            </LoadingComponent>
            <LoadingComponent delay={700}>
              <CalendarCard calendar={calendar} />
            </LoadingComponent>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <LoadingComponent delay={600}>
              <OutfitSuggestion outfit={outfit} />
            </LoadingComponent>
          </div>
        </div>
      </main>
    </>
  );
}
