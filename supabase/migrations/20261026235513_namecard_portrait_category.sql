-- Commit the enum addition before using it in the following catalog migration.
alter type public.nameplate_category add value if not exists 'portrait';
