import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function OperationalDashboard({ refreshKey = 0 }) {
  const [prices, setPrices] = useState([]);
  const [sms, setSms] = useState(null);
  /* Load prices*/
  useEffect(() => {
    fetch(`${API}/api/prices`)
      .then((res) => res.json())
      .then(setPrices)
      .catch(() => setPrices([]));
  }, [refreshKey]);
  //Future-ready SMS data
  // This will work once the backend exposes SMS messages/statuses.
  useEffect(() => {
    fetch(`${API}/api/sms/messages`) 
/*  Dashboard expects this endpoint to return SMS messages when task 5 make with real gateway statuses (queued, sent, delivered, failed) 
-If the backend endpoint/path changes, will update this fetch URL accordingly.*/
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setSms)
      .catch(() => setSms(null));
  }, [refreshKey]);
  // Submissions during the last 7 days
  const submissionsWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return prices.filter(
      (p) =>
        p.createdAt &&
        new Date(p.createdAt).getTime() >= weekAgo
    ).length;
  }, [prices]);
/*Future-ready verification lag
-Verification lag is calculated from the backend timestamps..
-Once the backend provides verifiedAt, the dashboard calculatese,as:
 verifiedAt - createdAt.
- The backend will provide verifiedAt when a record is verified.*/
const verificationLag = useMemo(() => {
  const verified = prices.filter(
    (p) =>
      p.isVerified &&
      p.createdAt &&
      p.verifiedAt
  );

  if (!verified.length) return null;

  const totalHours = verified.reduce((sum, p) => {
    const created = new Date(p.createdAt).getTime();
    const verifiedAt = new Date(p.verifiedAt).getTime();

    return (
      sum +
      Math.max(0, verifiedAt - created) / 3600000
    );
  }, 0);

  return totalHours / verified.length;
}, [prices]);

  // 30-day submission chart
  const chartData = useMemo(() => {
    const days = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();

      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);

      days.push({
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        count: 0,
      });
    }

    prices.forEach((price) => {
      if (!price.createdAt) return;

      const created = new Date(price.createdAt);
      const label = `${created.getMonth() + 1}/${created.getDate()}`;

      const day = days.find((d) => d.label === label);

      if (day) day.count++;
    });

    return days;
  }, [prices]);

  const maxCount = Math.max(
    ...chartData.map((d) => d.count),
    1
  );

  // Future-ready SMS delivery calculation
  const deliveryStats = useMemo(() => {
    const messages = Array.isArray(sms)
      ? sms
      : sms?.messages || [];

    const delivered = messages.filter(
      (m) => m.status?.toLowerCase() === "delivered"
    ).length;

    const failed = messages.filter(
      (m) => m.status?.toLowerCase() === "failed"
    ).length;

    const completed = delivered + failed;

    const deliveryRate =
      completed > 0
        ? ((delivered / completed) * 100).toFixed(1)
        : null;

    return {
      delivered,
      failed,
      completed,
      deliveryRate,
    };
  }, [sms]);

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-stone-900 mb-5">
        Operational dashboard
      </h2>

      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="rounded-xl bg-stone-100 p-6">
          <p className="text-sm text-stone-500">
            Submissions / week
          </p>

          <p className="text-3xl font-bold mt-4 text-stone-900">
            {submissionsWeek}
          </p>

          <p className="text-xs text-stone-500 mt-2">
            Based on backend submission timestamps
          </p>
        </div>

        <div className="rounded-xl bg-stone-100 p-6">
          <p className="text-sm text-stone-500">
            Verification lag
          </p>

          <p className="text-3xl font-bold mt-4 text-stone-900">
            {verificationLag === null
              ? "—"
              : `${verificationLag.toFixed(1)} hrs`}
          </p>

          <p className="text-xs text-stone-500 mt-2">
            Average time from submission to verification
          </p>
        </div>

        <div className="rounded-xl bg-stone-100 p-6">
          <p className="text-sm text-stone-500">
            SMS delivery
          </p>

          <p className="text-3xl font-bold mt-4 text-stone-900">
            {deliveryStats.deliveryRate !== null
              ? `${deliveryStats.deliveryRate}%`
              : "—"}
          </p>

          <p className="text-xs text-stone-500 mt-2">
            {deliveryStats.completed > 0
              ? `${deliveryStats.delivered} delivered · ${deliveryStats.failed} failed`
              : "Waiting for confirmed gateway statuses"}
          </p>
        </div>

      </div>

      {/* Charts / health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

       {/* Submission chart */}
<div className="rounded-xl border border-stone-200 bg-white p-6">
  <h3 className="text-lg font-semibold text-stone-900">
    Submission volume, 30 days
  </h3>

  <div className="mt-6 h-56">
    <svg
      viewBox="0 0 600 240"
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      {chartData.length > 1 && (
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-500"
          points={chartData
            .map((day, index) => {
              const x =
                (index / (chartData.length - 1)) * 600;

              const y =
                220 -
                (day.count / maxCount) * 200;

              return `${x},${y}`;
            })
            .join(" ")}
        />
      )}
    </svg>
  </div>
</div>
        {/* SMS health */}
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-stone-900">
            SMS health
          </h3>
<div className="mt-5 space-y-3 text-sm">

  <div className="flex justify-between">
    <span className="text-stone-500">
      Gateway
    </span>

    <span>
      {sms?.gateway ?? "—"}
    </span>
  </div>

  <div className="flex justify-between">
    <span className="text-stone-500">
      Queued
    </span>

    <span>
      {sms?.queued ?? "—"}
    </span>
  </div>

  <div className="flex justify-between">
    <span className="text-stone-500">
      Sent
    </span>

    <span>
      {sms?.sent ?? "—"}
    </span>
  </div>

  <div className="flex justify-between">
    <span className="text-stone-500">
      Delivered
    </span>

    <span>
      {sms ? deliveryStats.delivered : "—"}
    </span>
  </div>

  <div className="flex justify-between">
    <span className="text-stone-500">
      Failed
    </span>

    <span>
      {sms ? deliveryStats.failed : "—"}
    </span>
  </div>

</div>
        </div>

      </div>
    </section>
  );
}