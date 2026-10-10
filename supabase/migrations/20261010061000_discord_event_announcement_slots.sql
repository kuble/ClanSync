-- Enum additions are committed before the next migration uses them.
alter type public.notification_slot_kind add value if not exists 'event_created';
alter type public.notification_slot_kind add value if not exists 'event_updated';
