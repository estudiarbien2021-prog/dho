-- Create table for rule configuration history
CREATE TABLE public.rule_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  configuration jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.rule_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage rule configurations" 
ON public.rule_configurations 
FOR ALL 
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_rule_configurations_updated_at
BEFORE UPDATE ON public.rule_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_rule_configurations_created_at ON public.rule_configurations(created_at DESC);
CREATE INDEX idx_rule_configurations_is_active ON public.rule_configurations(is_active);