
'use client';

import { useState } from 'react';
import { useFileContext } from '@/context/file-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function DownloadButton({ fileUrl, fileName, children, variant, size, className }: { fileUrl: string | undefined, fileName: string, children: React.ReactNode, variant?: any, size?: any, className?: string }) {
    const { getFile } = useFileContext();
    const { toast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (!fileUrl) {
            toast({ title: 'No file to download', variant: 'destructive' });
            return;
        }
        setIsDownloading(true);
        try {
            const file = await getFile(fileUrl);
            if (file) {
                const url = URL.createObjectURL(file);
                const a = document.createElement('a');
                a.href = url;
                // Ensure the file name has a proper extension if missing
                const finalFileName = file.name || fileName;
                a.download = finalFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                toast({ title: 'Download failed', description: 'Could not retrieve the file.', variant: 'destructive' });
            }
        } catch (error) {
             toast({ title: 'Download failed', description: 'An error occurred during download.', variant: 'destructive' });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Button variant={variant} size={size} className={className} onClick={handleDownload} disabled={isDownloading || !fileUrl}>
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
        </Button>
    );
}
