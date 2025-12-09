

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/app-context';
import { useFileContext } from '@/context/file-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Timeline, TimelineItem, TimelineConnector, TimelineHeader, TimelineTitle, TimelineIcon, TimelineDescription } from '@/components/ui/timeline';
import { format } from 'date-fns';
import { Check, X, Hourglass, ArrowLeft, ThumbsUp, ThumbsDown, PartyPopper, Loader2, Download, FileCheck, Upload, GitBranchPlus, Calendar, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Document, DocumentHistory, Workflow } from '@/lib/types';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { DownloadButton } from '@/components/download-button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// Client-side only component to prevent hydration mismatch on date formatting
function ClientFormattedDate({ timestamp }: { timestamp: string }) {
    const [formattedDate, setFormattedDate] = useState('');
  
    useEffect(() => {
      try {
        setFormattedDate(format(new Date(timestamp), "MMM d, yyyy - h:mm a"));
      } catch (e) {
        setFormattedDate("Invalid date");
      }
    }, [timestamp]);
  
    if (!formattedDate) {
      return null;
    }
  
    return (<>{formattedDate}</>);
}

export default function DocumentDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { updateDocument, addDocumentHistory, currentUser, workflows, departments } = useAppContext();
    const { storeFile } = useFileContext();
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const docId = Array.isArray(id) ? id[0] : id;

    const docRef = useMemoFirebase(() => {
        if (!firestore || !docId) return null;
        return doc(firestore, 'documents', docId);
    }, [firestore, docId]);

    const { data: document, isLoading: isDocumentLoading } = useDoc<Document>(docRef);

    const workflow = document ? workflows.find(w => w.id === document.workflowId) : undefined;


    if (isDocumentLoading || !currentUser) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!document) {
        return <div>Document not found.</div>;
    }
    
    if (!workflow) {
         // This can happen if the workflow is deleted or not yet assigned.
         // For now, we show a basic view. A better UX would allow assigning a workflow here.
        return (
            <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">{document.name}</h1>
                    <Badge variant="destructive">No Workflow</Badge>
                </div>
                <Card>
                    <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                    <CardContent>{document.content}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                    <CardContent>
                        <p>This document has not been assigned to a workflow.</p>
                         { currentUser.role !== 'Administrator' && (
                            <p className="text-muted-foreground text-sm mt-2">
                                Ask a user with workflow management privileges to assign one.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    const handleUpdateStatus = async (newStatus: 'Approved' | 'Rejected') => {
        if (!notes.trim()) {
            toast({
                title: 'Notes Required',
                description: 'Please provide notes for your action.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const currentStepIndex = document.currentStep;

            const currentStepHistoryUpdate: Partial<DocumentHistory> = {
                status: newStatus,
                timestamp: new Date().toISOString(),
                notes: notes,
            };

            addDocumentHistory(document.id, currentStepHistoryUpdate, false, currentStepIndex, document.history);

            let docUpdates: Partial<Document> = {};
            const nextHistory = [...document.history];
            if (nextHistory[currentStepIndex]) {
              nextHistory[currentStepIndex] = { ...nextHistory[currentStepIndex], ...currentStepHistoryUpdate };
            }

            if (newStatus === 'Approved') {
                const nextStepIndex = currentStepIndex + 1;
                const isWorkflowEnd = nextStepIndex >= workflow.departmentIds.length;
        
                if (isWorkflowEnd) {
                    docUpdates.status = 'Completed';
                    docUpdates.pendingDepartmentId = '';
                    updateDocument(document.id, docUpdates);
                    
                    const completionHistory: DocumentHistory = {
                        departmentId: 'system', 
                        status: 'Completed',
                        timestamp: new Date().toISOString(),
                        notes: 'Workflow finished'
                    };
                    addDocumentHistory(document.id, completionHistory, true, nextStepIndex, nextHistory as DocumentHistory[]); 
                } else {
                    const nextDeptId = workflow.departmentIds[nextStepIndex];
                    docUpdates.currentStep = nextStepIndex;
                    docUpdates.pendingDepartmentId = nextDeptId;
                    updateDocument(document.id, docUpdates);

                    const nextStepHistory: DocumentHistory = {
                        departmentId: nextDeptId,
                        status: 'Pending',
                        timestamp: new Date().toISOString(),
                    };
                    addDocumentHistory(document.id, nextStepHistory, true, nextStepIndex, nextHistory as DocumentHistory[]);
                }
            } else { // 'Rejected'
                docUpdates.status = 'Rejected';
                docUpdates.pendingDepartmentId = '';
                updateDocument(document.id, docUpdates);
            }
            
            toast({
                title: `Document ${newStatus}`,
                description: `The document has been ${newStatus.toLowerCase()}.`,
            });
            
            setNotes('');
            router.push('/dashboard');
        } catch (error) {
             toast({
                title: 'Submission Failed',
                description: 'Could not update the document. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Approved': return <Check className="h-4 w-4" />;
            case 'Rejected': return <X className="h-4 w-4" />;
            case 'Pending': return <Hourglass className="h-4 w-4" />;
            case 'Completed': return <PartyPopper className="h-4 w-4" />;
            default: return <div className="h-2 w-2 rounded-full bg-gray-400" />;
        }
    };
    
    const getStatusColor = (status: DocumentHistory['status'] | 'Upcoming' | 'Completed') => {
        switch (status) {
          case 'Approved':
          case 'Completed': 
            return 'bg-green-500 text-white';
          case 'Pending': return 'bg-yellow-500 text-white';
          case 'Rejected': return 'bg-red-500 text-white';
          default: return 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-300';
        }
    };

    const currentStepInfo = document.history[document.currentStep];
    const canTakeAction = 
        currentUser.role !== 'Administrator' &&
        currentStepInfo?.status === 'Pending' && 
        document.status !== 'Completed' && 
        document.status !== 'Rejected' &&
        workflow.departmentIds[document.currentStep] === currentUser.departmentId;

    const isCompleted = document.status === 'Completed';
    const isRejected = document.status === 'Rejected';
    const initiationDate = document.history?.[0]?.timestamp;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">{document.name}</h1>
                <Badge variant="outline">{document.type}</Badge>
                 {isCompleted && <Badge className="border-transparent bg-green-100 text-green-800">Workflow Completed</Badge>}
                 {document.status === 'Rejected' && <Badge variant="destructive">Workflow Rejected</Badge>}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Document Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold">Initiator:</span>
                                    <span>{document.initiatorName || 'Unknown'}</span>
                                </div>
                                 <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold">Initiated:</span>
                                    <span>{initiationDate ? <ClientFormattedDate timestamp={initiationDate} /> : 'N/A'}</span>
                                </div>
                            </div>
                             <div className="border-t pt-4">
                                <p className="text-muted-foreground">{document.content}</p>
                            </div>
                        </CardContent>
                    </Card>

                   {canTakeAction && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Take Action</CardTitle>
                            <CardDescription>Review and approve or reject the document for the current step.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="space-y-2">
                                <Label>1. Download and Review</Label>
                                <DownloadButton
                                    fileUrl={document.fileUrl}
                                    fileName={`${document.name.replace(/\s/g, '_')}`}
                                    variant="outline"
                                    className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}
                                >
                                    <Download className="mr-2 h-4 w-4"/>
                                    Download Document
                                </DownloadButton>
                                <p className="text-xs text-muted-foreground">Review the current version before taking action.</p>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>2. Add Notes & Action (Required)</Label>
                                <Textarea 
                                    placeholder="Add required notes for your action..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="flex gap-4">
                                <Button onClick={() => handleUpdateStatus('Approved')} className="bg-green-600 hover:bg-green-700" disabled={isSubmitting || !notes.trim()}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ThumbsUp className="mr-2 h-4 w-4"/>} 
                                    {isSubmitting ? 'Submitting...' : 'Approve'}
                                </Button>
                                <Button variant="destructive" onClick={() => handleUpdateStatus('Rejected')} disabled={isSubmitting || !notes.trim()}>
                                     <ThumbsDown className="mr-2 h-4 w-4"/> Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                   )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Workflow History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Timeline>
                                {workflow.departmentIds.map((deptId, index) => {
                                    const dept = departments.find(d => d.id === deptId);
                                    const relevantHistoryItem = document.history[index];
                                    
                                    let status: DocumentHistory['status'] | 'Upcoming' | 'Completed';

                                    if (isCompleted) {
                                        status = 'Completed';
                                    } else if (relevantHistoryItem) {
                                        status = relevantHistoryItem.status;
                                    } else {
                                        status = 'Upcoming';
                                    }

                                    return (
                                        <TimelineItem key={`${deptId}-${index}`}>
                                            <TimelineHeader>
                                                <TimelineIcon className={cn(getStatusColor(status))}>
                                                    {getStatusIcon(status)}
                                                </TimelineIcon>
                                                <TimelineTitle>{dept?.name}</TimelineTitle>
                                            </TimelineHeader>
                                            {index < workflow.departmentIds.length - 1 && <TimelineConnector />}
                                            {relevantHistoryItem?.timestamp && (
                                               <TimelineDescription>
                                                    <ClientFormattedDate timestamp={relevantHistoryItem.timestamp} />
                                                    {relevantHistoryItem.notes && <div className="text-xs italic text-muted-foreground mt-1">"{relevantHistoryItem.notes}"</div>}
                                                    {relevantHistoryItem.fileUrl && (
                                                        <DownloadButton
                                                            fileUrl={relevantHistoryItem.fileUrl}
                                                            fileName={`${document.name.replace(/\s/g, '_')}_v${index + 1}`}
                                                            variant="link"
                                                            size="sm"
                                                            className="h-auto p-0 mt-1"
                                                        >
                                                          View Version
                                                        </DownloadButton>
                                                    )}
                                               </TimelineDescription>
                                            )}
                                        </TimelineItem>
                                    )
                                })}
                                 {isCompleted && document.history.some(h => h.status === "Completed") && (
                                    <TimelineItem>
                                        <TimelineHeader>
                                            <TimelineIcon className={cn(getStatusColor('Completed'))}>
                                                {getStatusIcon('Completed')}
                                            </TimelineIcon>
                                            <TimelineTitle>Workflow Complete</TimelineTitle>
                                        </TimelineHeader>
                                         {document.history.find(h => h.status === 'Completed')?.notes && (
                                            <TimelineDescription>
                                                <div className="text-xs italic text-muted-foreground mt-1">
                                                    "{document.history.find(h => h.status === 'Completed')?.notes}"
                                                </div>
                                            </TimelineDescription>
                                        )}
                                    </TimelineItem>
                                )}
                                 {isRejected && document.history.some(h => h.status === "Rejected") && (
                                    <TimelineItem>
                                        <TimelineHeader>
                                            <TimelineIcon className={cn(getStatusColor('Rejected'))}>
                                                {getStatusIcon('Rejected')}
                                            </TimelineIcon>
                                            <TimelineTitle>Workflow Rejected</TimelineTitle>
                                        </TimelineHeader>
                                         {document.history.find(h => h.status === 'Rejected')?.notes && (
                                            <TimelineDescription>
                                                <div className="text-xs italic text-muted-foreground mt-1">
                                                    "{document.history.find(h => h.status === 'Rejected')?.notes}"
                                                </div>
                                            </TimelineDescription>
                                        )}
                                    </TimelineItem>
                                )}
                            </Timeline>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
