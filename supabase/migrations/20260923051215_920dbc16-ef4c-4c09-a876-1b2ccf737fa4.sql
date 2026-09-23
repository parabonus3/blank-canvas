REVOKE EXECUTE ON FUNCTION public.get_best_ever_streak(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_best_ever_streak(uuid) TO service_role;