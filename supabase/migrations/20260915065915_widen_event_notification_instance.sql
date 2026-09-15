-- Recurring occurrence IDs are Unix milliseconds, beyond int32's range.
ALTER TABLE public.notification_log ALTER COLUMN instance_idx TYPE bigint;
-- Recurring occurrence IDs are Unix milliseconds, beyond int32's range.
ALTER TABLE public.notification_log ALTER COLUMN instance_idx TYPE bigint;
