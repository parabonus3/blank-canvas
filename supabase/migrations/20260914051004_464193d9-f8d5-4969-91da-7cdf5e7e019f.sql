CREATE POLICY "Service role manages seed entities"
ON public.seed_entities
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role manages seed config"
ON public.seed_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);