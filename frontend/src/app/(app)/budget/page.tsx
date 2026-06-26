"use client";

import { BudgetScreen } from "@/components/tripova/screens/budget-screen";
import { useApp } from "@/components/tripova/app-provider";

export default function BudgetPage() {
  const { t } = useApp();
  return <BudgetScreen t={t} />;
}
