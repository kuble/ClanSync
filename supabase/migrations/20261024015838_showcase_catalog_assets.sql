-- New products can use independent assets without extending the starter sprite atlas.
alter table public.showcase_catalog add column image_path text
check(image_path is null or image_path ~ '^/images/showcase/[a-zA-Z0-9/_-]+\.(png|webp)$');
