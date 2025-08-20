-- Update conditional_rules table to support nested condition groups
-- The conditions column already stores JSONB, so it can handle the new nested structure
-- No schema changes needed as JSONB is flexible

-- Add a comment to document the new structure
COMMENT ON COLUMN conditional_rules.conditions IS 'JSONB array supporting nested condition groups with structure: [{id, type, operator?, value?, valueMax?, conditions?, logicalConnectors?}]';

-- Add a comment to document logical connectors
COMMENT ON COLUMN conditional_rules.logical_connectors IS 'JSONB array of logical connectors (AND/OR) for connecting conditions and groups';