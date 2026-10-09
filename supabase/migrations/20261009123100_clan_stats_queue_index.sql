-- The transaction id leads the primary key; clan cascades need their own index.
create index clan_stats_refresh_queue_clan_idx on private.clan_stats_refresh_queue(clan_id);
