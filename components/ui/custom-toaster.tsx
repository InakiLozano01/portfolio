'use client'

import { Fragment } from 'react'
import {
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
} from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'

export function CustomToaster() {
    const { toasts, removeToast } = useToast()

    return (
        <Fragment>
            {toasts.map(({ id, title, description, variant }) => (
                <Toast
                    key={id}
                    variant={variant}
                    onOpenChange={(open) => {
                        if (!open) removeToast(id)
                    }}
                >
                    <div className="grid gap-1">
                        {title ? <ToastTitle>{title}</ToastTitle> : null}
                        {description ? (
                            <ToastDescription>{description}</ToastDescription>
                        ) : null}
                    </div>
                    <ToastClose />
                </Toast>
            ))}
        </Fragment>
    )
}

export default CustomToaster


