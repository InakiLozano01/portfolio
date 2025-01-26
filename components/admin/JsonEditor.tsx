'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface JsonEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialJson: Record<string, any>;
    onSave: (json: Record<string, any>) => void;
    title?: string;
}

export default function JsonEditor({ open, onOpenChange, initialJson, onSave, title = 'Edit JSON' }: JsonEditorProps) {
    const [jsonString, setJsonString] = useState(JSON.stringify(initialJson, null, 2));
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        try {
            const parsedJson = JSON.parse(jsonString);
            setError(null);
            onSave(parsedJson);
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid JSON format');
        }
    };

    const formatJson = () => {
        try {
            const parsed = JSON.parse(jsonString);
            setJsonString(JSON.stringify(parsed, null, 2));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid JSON format');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea
                        value={jsonString}
                        onChange={(e) => {
                            setJsonString(e.target.value);
                            setError(null);
                        }}
                        className="font-mono min-h-[400px]"
                        placeholder="Enter JSON content..."
                    />
                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={formatJson}
                        >
                            Format JSON
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!!error}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 