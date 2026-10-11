-- Enum values must commit before the following migration uses them.
alter type public.notification_slot_kind add value if not exists 'room_t_minus_10min';
alter type public.notification_slot_kind add value if not exists 'notice_created';
alter type public.notification_slot_kind add value if not exists 'poll_ended';
