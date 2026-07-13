import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Database } from "lucide-react";

export default function UserDatabasePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Database</CardTitle>
        <CardDescription>This page is under construction.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-16 text-center">
        <Database className="w-16 h-16 mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Coming Soon!</h2>
        <p className="text-muted-foreground">We're working hard to bring you the user database section.</p>
      </CardContent>
    </Card>
  );
}
