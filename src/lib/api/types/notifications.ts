// API contracts: Notifications (mirrored from the backend service views).
// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push';

export type OutboxItemStatus =
    | 'pending'
    | 'sent'
    | 'failed'
    | 'cancelled'
    | 'retrying';

export interface NotificationTemplateView {
    id: string;
    code: string;
    channel: NotificationChannel;
    subject: string | null;
    body: string;
    variables: string[] | null;
    isActive: boolean;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TemplateListResult {
    items: NotificationTemplateView[];
    total: number;
    page: number;
    pageSize: number;
}

export interface OutboxItemView {
    id: string;
    templateId: string | null;
    channel: NotificationChannel;
    recipient: string;
    subject: string | null;
    body: string;
    status: OutboxItemStatus;
    attempts: number;
    lastError: string | null;
    scheduledFor: string | null;
    sentAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface OutboxListResult {
    items: OutboxItemView[];
    total: number;
    page: number;
    pageSize: number;
}

export interface DeliveryLogEntryView {
    id: string;
    outboxId: string;
    attempt: number;
    status: string;
    providerReference: string | null;
    error: string | null;
    createdAt: string;
}

export type CreateNotificationTemplateInput = {
    code: string;
    channel: NotificationChannel;
    subject?: string | null;
    body: string;
    variables?: string[] | null;
    isActive?: boolean;
};

export type UpdateNotificationTemplateInput = {
    code?: string;
    channel?: NotificationChannel;
    subject?: string | null;
    body?: string;
    variables?: string[] | null;
    isActive?: boolean;
};

export type ListNotificationTemplatesQuery = {
    channel?: NotificationChannel;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type ListOutboxQuery = {
    status?: OutboxItemStatus;
    channel?: NotificationChannel;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
};

export type RetryOutboxInput = Record<string, never>;
export type CancelOutboxInput = { reason?: string };
