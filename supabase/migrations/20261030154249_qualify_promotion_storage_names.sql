DROP POLICY promotion_image_insert ON storage.objects;
DROP POLICY promotion_image_read ON storage.objects;
DROP POLICY promotion_image_delete ON storage.objects;
CREATE POLICY promotion_image_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(
  bucket_id='clan-promotion-images' AND (storage.foldername(storage.objects.name))[2]=(SELECT auth.uid())::text
  AND EXISTS(SELECT 1 FROM public.clans c WHERE c.id::text=(storage.foldername(storage.objects.name))[1]
    AND c.lifecycle_status='active' AND c.moderation_status='clean' AND public.is_clan_officer_plus(c.id))
);
CREATE POLICY promotion_image_read ON storage.objects FOR SELECT TO authenticated USING(
  bucket_id='clan-promotion-images' AND EXISTS(SELECT 1 FROM public.clans c
    WHERE c.id::text=(storage.foldername(storage.objects.name))[1] AND c.lifecycle_status='active' AND c.moderation_status='clean'
    AND (public.is_clan_officer_plus(c.id) OR EXISTS(SELECT 1 FROM public.board_posts p
      WHERE p.clan_id=c.id AND p.game_id=c.game_id AND p.post_type='promotion'
      AND p.content_blocks @> jsonb_build_array(jsonb_build_object('type','image','path',storage.objects.name)))))
);
-- A failed response must never cause cleanup to erase an already committed photo.
CREATE POLICY promotion_image_delete ON storage.objects FOR DELETE TO authenticated USING(
  bucket_id='clan-promotion-images' AND (storage.foldername(storage.objects.name))[2]=(SELECT auth.uid())::text
  AND EXISTS(SELECT 1 FROM public.clans c WHERE c.id::text=(storage.foldername(storage.objects.name))[1] AND public.is_clan_officer_plus(c.id))
  AND NOT EXISTS(SELECT 1 FROM public.board_posts p WHERE p.clan_id::text=(storage.foldername(storage.objects.name))[1]
    AND p.content_blocks @> jsonb_build_array(jsonb_build_object('type','image','path',storage.objects.name)))
);
