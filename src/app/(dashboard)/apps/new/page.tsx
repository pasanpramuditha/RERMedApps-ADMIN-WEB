import { AppForm } from "../app-form";

export default function NewAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add New App</h1>
        <p className="text-muted-foreground">
          Fill in the details below to add a new application to the dashboard.
        </p>
      </div>
      <AppForm />
    </div>
  );
}
