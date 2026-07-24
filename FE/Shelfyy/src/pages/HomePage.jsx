import { useEffect, useState } from "react";
import { dailyOutfitApi } from "../api/dailyOutfitApi";
import { calendarApi } from "../api/calendarApi";
import { pageContent } from "../api/apiClient";
import { trialApi } from "../api/trialApi";
import { userApi } from "../api/userApi";
import { weatherApi } from "../api/weatherApi";
import { toCalendarCard, toTopNav, toWeatherCard } from "../api/adapters";
import { CalendarCard } from "../components/CalendarCard";
import { Sidebar } from "../components/Sidebar";
import { HomeTodayOutfitPanel } from "../components/HomeTodayOutfitPanel";
import { TopNav } from "../components/TopNav";
import { WeatherCard } from "../components/WeatherCard";
import { LoadingComponent } from "../components/LoadingComponent";
import {
  calendarData,
  sidebarData,
  topNavData,
  weatherData,
} from "../const/homeData";
import { getCurrentBrowserLocation } from "../utils/geolocation";

export function HomePage() {
  const [weather, setWeather] = useState(weatherData);
  const [calendar, setCalendar] = useState(calendarData);
  const [todayOutfit, setTodayOutfit] = useState(null);
  const [latestTryOn, setLatestTryOn] = useState(null);
  const [nav, setNav] = useState(topNavData);
  const [error, setError] = useState("");
  const [weatherError, setWeatherError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [todayOutfitError, setTodayOutfitError] = useState("");
  const [todayOutfitLoading, setTodayOutfitLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadUserShell() {
      try {
        const profile = await userApi.me().catch(() => null);

        if (ignore) return;
        setNav(toTopNav(profile));
        setError("");
      } catch (err) {
        if (!ignore) setError(err.message || "Không tải được dữ liệu trang chủ");
      }
    }

    async function loadWeather() {
      try {
        const location = await getCurrentBrowserLocation();
        const snapshot = await weatherApi.createSnapshot(location);

        if (ignore) return;
        setWeather(toWeatherCard(snapshot));
        setWeatherError("");
      } catch (err) {
        if (!ignore) {
          setWeather(toWeatherCard(null));
          setWeatherError(err.message || "Không tải được thời tiết hiện tại");
        }
      }
    }

    async function loadCalendar() {
      try {
        const today = await calendarApi.today();

        if (ignore) return;
        setCalendar(toCalendarCard(today));
        setCalendarError("");
      } catch (err) {
        if (!ignore) {
          setCalendar(toCalendarCard(null));
          setCalendarError(err.message || "Không tải được lịch trình hôm nay");
        }
      }
    }

    async function loadTodayOutfit() {
      setTodayOutfitLoading(true);
      try {
        const [today, savedTryOnPage] = await Promise.all([
          dailyOutfitApi.getToday(),
          trialApi.getHistory({ page: 0, size: 1, saved: true }).catch(() => null),
        ]);

        if (ignore) return;
        setTodayOutfit(today);
        setLatestTryOn(pageContent(savedTryOnPage)[0] || null);
        setTodayOutfitError("");
      } catch (err) {
        if (!ignore) {
          setTodayOutfit(null);
          setLatestTryOn(null);
          setTodayOutfitError(err.message || "Không tải được outfit hôm nay");
        }
      } finally {
        if (!ignore) setTodayOutfitLoading(false);
      }
    }

    loadUserShell();
    loadWeather();
    loadCalendar();
    loadTodayOutfit();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCalendarAction = async () => {
    if (calendar.connected) {
      window.location.href = calendar.calendarUrl;
      return;
    }

    setCalendarLoading(true);
    setCalendarError("");
    try {
      const result = await calendarApi.connect();
      if (!result?.authorizationUrl) {
        throw new Error("Nodejs service chưa trả URL kết nối Google Calendar");
      }
      window.location.href = result.authorizationUrl;
    } catch (err) {
      setCalendarLoading(false);
      setCalendarError(err.message || "Không bắt đầu được kết nối Google Calendar");
    }
  };

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
            {weatherError && (
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700" role="alert">
                {weatherError}
              </div>
            )}
            <LoadingComponent delay={500}>
              <WeatherCard weather={weather} />
            </LoadingComponent>
            <LoadingComponent delay={700}>
              <CalendarCard
                calendar={calendar}
                error={calendarError}
                loading={calendarLoading}
                onPrimaryAction={handleCalendarAction}
              />
            </LoadingComponent>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <LoadingComponent delay={600}>
              <HomeTodayOutfitPanel
                dailyOutfit={todayOutfit}
                error={todayOutfitError}
                isLoading={todayOutfitLoading}
                latestTryOn={latestTryOn}
              />
            </LoadingComponent>
          </div>
        </div>
      </main>
    </>
  );
}
