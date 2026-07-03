import { useEffect, useState } from "react";
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

// Sau khi thanh toán VNPay xong, BE redirect trình duyệt về đây kèm
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
  const [plans, setPlans] = useState(premiumPlans);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    subscriptionApi.getPlans()
      .then((data) => setPlans(toPremiumPlans(data)))
      .catch(() => setPlans(premiumPlans));
  }, []);

  // Đọc kết quả thanh toán VNPay (nếu vừa được redirect về từ cổng thanh toán).
  useEffect(() => {
    const result = readPaymentResultFromHash();
    if (!result) return;

    if (result.success) {
      setMessage(`Thanh toán thành công! Gói ${result.plan || ""} đã được kích hoạt.`);
    } else {
      const reasonText = REASON_MESSAGES[result.reason] || "Vui lòng thử lại hoặc dùng phương thức khác.";
      setError(`Thanh toán không thành công. ${reasonText}`);
    }
    clearPaymentResultFromHash();
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
