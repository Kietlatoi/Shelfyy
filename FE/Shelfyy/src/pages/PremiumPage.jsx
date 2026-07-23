import { useCallback, useEffect, useState } from "react";
import { subscriptionApi } from "../api/subscriptionApi";
import { paymentApi } from "../api/paymentApi";
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
import { useTopNavUser } from "../hooks/useTopNavUser";
import {
  premiumComparisonData,
  premiumFaqData,
  premiumFooterData,
  premiumHeroData,
  premiumPlans,
  premiumTrustData,
} from "../const/premiumData";

// Sau khi thanh toán VNPay xong, Nodejs payment service redirect trình duyệt về đây kèm
// "#/up-premium?payment=success&plan=PRO" (hoặc payment=failed&reason=...).
function readPaymentResultFromHash() {
  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return null;
  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  const payment = params.get("payment");
  if (!payment) return null;
  return {
    success: payment === "success",
    plan: params.get("plan"),
    reason: params.get("reason"),
  };
}

// Xoá phần "?payment=..." khỏi hash sau khi đã đọc, để refresh trang không
// hiện lại thông báo cũ và URL gọn hơn.
function clearPaymentResultFromHash() {
  const path = (window.location.hash || "").split("?")[0];
  window.history.replaceState(null, "", window.location.pathname + window.location.search + path);
}

const REASON_MESSAGES = {
  invalid_signature: "Dữ liệu trả về từ VNPay không hợp lệ.",
  not_found: "Không tìm thấy giao dịch tương ứng.",
  amount_mismatch: "Số tiền giao dịch không khớp.",
  already_processed: "Giao dịch này đã được xử lý trước đó.",
  activation_failed: "Thanh toán thành công nhưng kích hoạt gói thất bại, vui lòng liên hệ hỗ trợ.",
};

export function PremiumPage() {
  const nav = useTopNavUser();
  const [paymentResult] = useState(() => readPaymentResultFromHash());
  const [plans, setPlans] = useState(premiumPlans);
  const [myPlan, setMyPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [message, setMessage] = useState(() => (
    paymentResult?.success
      ? `Thanh toán thành công! Gói ${paymentResult.plan || ""} đã được kích hoạt.`
      : ""
  ));
  const [error, setError] = useState(() => {
    if (!paymentResult || paymentResult.success) return "";
    const reasonText = REASON_MESSAGES[paymentResult.reason] || "Vui lòng thử lại hoặc dùng phương thức khác.";
    return `Thanh toán không thành công. ${reasonText}`;
  });

  const loadMyPlan = useCallback(() => {
    if (!isAuthenticated()) return;
    subscriptionApi.getMyPlan()
      .then(setMyPlan)
      .catch(() => setMyPlan(null));
  }, []);

  // FIX: sau khi bấm "Nâng cấp", trang chuyển hẳn sang VNPay bằng
  // window.location.href — nếu người dùng đổi ý và bấm nút Back của trình
  // duyệt để quay lại, trình duyệt thường phục hồi trang từ bfcache (bộ nhớ
  // đệm) NGUYÊN TRẠNG lúc rời đi, tức là nút vẫn đứng yên ở trạng thái "Đang
  // chuyển sang VNPay..." (loadingPlan) mãi mãi vì component không re-mount,
  // không có cơ hội chạy lại logic reset nào. Sự kiện "pageshow" với
  // event.persisted === true là cách chuẩn để phát hiện đúng tình huống này
  // và chủ động reset lại state.
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        setLoadingPlan("");
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  useEffect(() => {
    subscriptionApi.getPlans()
      .then((data) => setPlans(toPremiumPlans(data)))
      .catch(() => setPlans(premiumPlans));
    loadMyPlan();
  }, [loadMyPlan]);

  // Đọc kết quả thanh toán VNPay (nếu vừa được redirect về từ cổng thanh toán).
  useEffect(() => {
    if (!paymentResult) return;

    if (paymentResult.success) {
      // Gói vừa được Nodejs kích hoạt xong — load lại để cập nhật trạng thái
      // "đã đăng ký" + hạn dùng ngay, không cần người dùng tự F5 trang.
      loadMyPlan();
    }
    clearPaymentResultFromHash();
  }, [loadMyPlan, paymentResult]);

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
      const { paymentUrl } = await paymentApi.createVnpayPayment(plan.planType);
      // Điều hướng cả trang (không phải SPA route) sang cổng thanh toán VNPay.
      window.location.href = paymentUrl;
    } catch (err) {
      setError(err.message || "Không tạo được giao dịch thanh toán. Vui lòng thử lại.");
      setLoadingPlan("");
    }
  };

  return (
    <>
      <Sidebar activeKey="premium" data={sidebarData} />
      <TopNav data={nav} onNotify={handleNotify} />

      <main className="ml-64 pt-24 pb-16 px-margin-desktop min-h-screen">
        <div className="max-w-container-max mx-auto space-y-12">
          {message && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{message}</p>}
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}
          <LoadingComponent delay={400}>
            <PremiumPricing
              hero={premiumHeroData}
              plans={plans}
              onPlanSelect={handlePlanSelect}
              loadingPlan={loadingPlan}
              myPlan={myPlan}
            />
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
