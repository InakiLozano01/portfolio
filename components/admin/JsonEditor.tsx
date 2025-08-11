'use client'

import React, { useState } from 'react'
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

    // Update jsonString when initialJson changes
    React.useEffect(() => {
        setJsonString(JSON.stringify(initialJson, null, 2));
        setError(null);
    }, [initialJson, open]);

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
            <DialogContent className="max-w-4xl max-h-[90vh] bg-white">
                <DialogHeader className="pb-4 border-b border-slate-200">
                    <DialogTitle className="text-slate-900 text-xl font-bold">{title}</DialogTitle>
                    <p className="text-sm text-slate-600 mt-1">Edit the JSON configuration directly</p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Textarea
                            value={jsonString}
                            onChange={(e) => {
                                setJsonString(e.target.value);
                                setError(null);
                            }}
                            placeholder="Enter JSON content..."
                            className="min-h-[450px] font-mono text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 bg-slate-50"
                        />
                        {error && (
                            <div className="absolute top-2 right-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={formatJson}
                            className="border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                            Format JSON
                        </Button>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="border-slate-300 text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={!!error}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 