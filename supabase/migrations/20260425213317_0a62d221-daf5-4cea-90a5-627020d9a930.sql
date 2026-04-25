-- Atribui ao usuário nickymenezes14@gmail.com (id 950547b5-2b71-48ab-af7d-b6ea16c569d3)
-- o papel de admin master do app e admin do painel de suporte (SAC).

INSERT INTO public.user_roles (user_id, role)
VALUES ('950547b5-2b71-48ab-af7d-b6ea16c569d3', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.support_agents (user_id, role, is_active, invited_by)
VALUES ('950547b5-2b71-48ab-af7d-b6ea16c569d3', 'admin', true, '950547b5-2b71-48ab-af7d-b6ea16c569d3')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', is_active = true;