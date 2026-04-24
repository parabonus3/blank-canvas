
-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  category text NOT NULL DEFAULT 'other',
  assigned_to uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Support replies table
CREATE TABLE public.support_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid,
  content text NOT NULL,
  is_agent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Support agents table
CREATE TABLE public.support_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'agent',
  invited_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Security definer function to check if user is a support agent
CREATE OR REPLACE FUNCTION public.is_support_agent(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_agents
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- Security definer function to check if user is admin agent
CREATE OR REPLACE FUNCTION public.is_support_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_agents
    WHERE user_id = _user_id AND is_active = true AND role = 'admin'
  )
$$;

-- RLS for support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Anyone can create a ticket (even non-authenticated for contact form)
CREATE POLICY "Anyone can create tickets"
ON public.support_tickets FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can view own tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_support_agent(auth.uid()));

-- Agents can update tickets
CREATE POLICY "Agents can update tickets"
ON public.support_tickets FOR UPDATE
TO authenticated
USING (is_support_agent(auth.uid()));

-- RLS for support_replies
ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;

-- Users can view replies on own tickets, agents can view all
CREATE POLICY "Users and agents can view replies"
ON public.support_replies FOR SELECT
TO authenticated
USING (
  is_support_agent(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_replies.ticket_id AND user_id = auth.uid()
  )
);

-- Authenticated users can insert replies on own tickets, agents on any
CREATE POLICY "Users and agents can reply"
ON public.support_replies FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND (
    is_support_agent(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = support_replies.ticket_id AND user_id = auth.uid()
    )
  )
);

-- RLS for support_agents
ALTER TABLE public.support_agents ENABLE ROW LEVEL SECURITY;

-- Agents can view all agents
CREATE POLICY "Agents can view agents"
ON public.support_agents FOR SELECT
TO authenticated
USING (is_support_agent(auth.uid()));

-- Only admin agents can insert/update agents
CREATE POLICY "Admin agents can manage agents"
ON public.support_agents FOR INSERT
TO authenticated
WITH CHECK (is_support_admin(auth.uid()));

CREATE POLICY "Admin agents can update agents"
ON public.support_agents FOR UPDATE
TO authenticated
USING (is_support_admin(auth.uid()));

-- Timestamp trigger for support_tickets
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_replies;

-- Seed admin master
INSERT INTO public.support_agents (user_id, role)
VALUES ('307fedc8-c53e-444e-8f8d-baa419aecb5e', 'admin');
