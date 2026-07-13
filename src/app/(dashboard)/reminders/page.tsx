import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function RemindersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminders</CardTitle>
        <CardDescription>This page is under construction.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-16 text-center">
        <Clock className="w-16 h-16 mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Coming Soon!</h2>
        <p className="text-muted-foreground">We're working hard to bring you the reminders section.</p>
      </CardContent>
    </Card>
  );
}
