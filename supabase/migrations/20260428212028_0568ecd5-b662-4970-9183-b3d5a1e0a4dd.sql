-- Remover SELECT amplo que estava sobrescrevendo o REVOKE de coluna
REVOKE SELECT ON public.study_rooms FROM anon, authenticated;

-- Conceder SELECT explicitamente em todas as colunas EXCETO invite_code e password_hash
GRANT SELECT (
  id, owner_id, name, description, rules, room_type, slug, country,
  is_public, is_active, max_members, chat_mode, pinned_message,
  goal_hours, goal_label, focus_session_started_by,
  focus_session_start_at, focus_session_end_at, focus_session_duration,
  created_at
) ON public.study_rooms TO anon, authenticated;