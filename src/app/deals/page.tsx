import React from "react";
import Link from "next/link";

interface Deal {
  id: string;
  title: string;
  status: string;
  timeline: string[];
}

const deals: Deal[] = [
  { id: "1", title: "Deal A", status: "Pending", timeline: ["Step 1", "Step 2"] },
  { id: "2", title: "Deal B", status: "Completed", timeline: ["Step 1", "Step 2", "Step 3"] },
];

const DealTimeline = ({ steps }: { steps: string[] }) => (
  <div>
    {steps.map((step, index) => (
      <p key={index}>{step}</p>
    ))}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  let badgeClass = "";
  switch (status) {
    case "Pending":
      badgeClass = "bg-yellow-100 text-yellow-800";
      break;
    case "Completed":
      badgeClass = "bg-green-100 text-green-800";
      break;
    default:
      badgeClass = "bg-red-100 text-red-800";
  }
  return <div className={`px-2 py-1 rounded ${badgeClass}`}>{status}</div>;
};

const DealsPage: React.FC = () => {
  return (
    <div className="dark">
      {deals.map((deal) => (
        <div key={deal.id} className="p-4 bg-gray-800 text-white mb-2 rounded">
          <h3>{deal.title}</h3>
          <StatusBadge status={deal.status} />
          <DealTimeline steps={deal.timeline} />
        </div>
      ))}
    </div>
  );
};

export default DealsPage;