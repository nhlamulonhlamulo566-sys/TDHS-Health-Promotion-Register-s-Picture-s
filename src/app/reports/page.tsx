
'use client';

import { ReportsView } from '@/components/reports/reports-view';
import { useAppContext } from '@/context/app-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function ReportsPage() {
  const { currentUser } = useAppContext();

  if (!currentUser) {
    return null;
  }

  // Allow all roles, including Health Promoter, to see the reports page.
  // The filtering will be handled within the ReportsView component.
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Reporting & Analytics</h1>
      <ReportsView />
    </div>
  );
}
