import { useEffect, useRef, useState } from "react";
import { TrialControlsPanel } from "../components/TrialControlsPanel";
import { TrialShowcase } from "../components/TrialShowcase";
import { LoadingComponent } from "../components/LoadingComponent";
import {
  selectedOutfitData,
  trialActionData,
  trialMetricsData,
  trialShowcaseData,
  trialTipData,
  uploadData,
} from "../const/trialData";
import { TopNav } from "../components/TopNav";
import { topNavData } from "../const/homeData";

export function TrialPage() {
  const [isUploaded, setIsUploaded] = useState(false);
  const [view, setView] = useState("placeholder");
  const timerRef = useRef(null);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  const handleUpload = () => {
    setIsUploaded(true);
  };

  const handleGenerate = () => {
    if (!isUploaded) {
      window.alert(trialActionData.alert);
      return;
    }

    setView("processing");
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setView("result");
    }, 3000);
  };
  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };
  return (
    <>
      <TopNav data={topNavData} onNotify={handleNotify} />{" "}
      <main className="pt-24 pb-12 px-margin-desktop max-w-container-max mx-auto h-full min-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
          <LoadingComponent delay={500} className="md:col-span-4">
            <TrialControlsPanel
              action={trialActionData}
              isUploaded={isUploaded}
              onGenerate={handleGenerate}
              onUpload={handleUpload}
              outfit={selectedOutfitData}
              tip={trialTipData}
              upload={uploadData}
              isGenerating={view === "processing"}
            />
          </LoadingComponent>
          
          <LoadingComponent delay={750} className="md:col-span-8">
            <TrialShowcase
              metrics={trialMetricsData}
              showcase={trialShowcaseData}
              view={view}
            />
          </LoadingComponent>
        </div>
      </main>
    </>
  );
}
