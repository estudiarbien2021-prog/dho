-- Create table for conditional rules
CREATE TABLE public.conditional_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('1x2', 'btts', 'ou25')),
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  logical_connectors JSONB NOT NULL DEFAULT '[]'::jsonb,
  action TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conditional_rules ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view all conditional rules" 
ON public.conditional_rules 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can create conditional rules" 
ON public.conditional_rules 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update conditional rules" 
ON public.conditional_rules 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can delete conditional rules" 
ON public.conditional_rules 
FOR DELETE 
USING (true);

-- Create index for performance
CREATE INDEX idx_conditional_rules_market ON public.conditional_rules(market);
CREATE INDEX idx_conditional_rules_enabled ON public.conditional_rules(enabled);
CREATE INDEX idx_conditional_rules_priority ON public.conditional_rules(priority);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_conditional_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_conditional_rules_updated_at
  BEFORE UPDATE ON public.conditional_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conditional_rules_updated_at();

-- Insert some default rules
INSERT INTO public.conditional_rules (name, market, conditions, logical_connectors, action, priority, enabled) VALUES
('Vigorish négatif 1X2', '1x2', '[{"id":"cond-1","type":"vigorish","operator":"<","value":0}]', '[]', 'recommend_most_probable', 1, true),
('BTTS haute probabilité', 'btts', '[{"id":"cond-1","type":"probability_btts_yes","operator":">","value":55},{"id":"cond-2","type":"odds_btts_yes","operator":">","value":1.8}]', '["AND"]', 'recommend_btts_yes', 2, true),
('Over 2.5 haute probabilité', 'ou25', '[{"id":"cond-1","type":"probability_over25","operator":">","value":60},{"id":"cond-2","type":"odds_over25","operator":">","value":1.7}]', '["AND"]', 'recommend_over25', 3, true);