import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function FinancePage() {
  return (
    <ModuleWidgetPage
      title="Finance"
      description="Expenses, budgets, subscriptions, and spending charts."
      moduleName="finance"
      fallbackIcon="savings"
      fallbackMessage="No accounts connected yet - expense tracking is on the roadmap."
    />
  );
}
