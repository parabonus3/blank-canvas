-- 1. Revogar EXECUTE de anon em funções SECURITY DEFINER que não precisam ser públicas
REVOKE EXECUTE ON FUNCTION public.find_room_by_invite_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_public_rooms_ranking(text, text, text) FROM anon;

-- 2. Fechar listagem do bucket avatars (mantendo getPublicUrl funcionando via CDN público)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Users can list own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);