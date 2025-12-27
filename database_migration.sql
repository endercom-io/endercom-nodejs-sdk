-- Migration: Remove Agent API Keys and Use Frequency API Keys + Agent Names
-- This script transitions from agent API key based authentication to frequency API key + agent name based authentication

-- =============================================================================
-- Step 1: Ensure agents table has proper constraints for names
-- =============================================================================

-- Add unique constraint for agent names within a frequency (if not already exists)
DO $$
BEGIN
    -- Check if the unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'agents_frequency_id_name_unique'
    ) THEN
        -- Add unique constraint for (frequency_id, name) combination
        ALTER TABLE agents
        ADD CONSTRAINT agents_frequency_id_name_unique
        UNIQUE (frequency_id, name);
    END IF;
END $$;

-- Ensure name column is not null (if it can be null currently)
ALTER TABLE agents
ALTER COLUMN name SET NOT NULL;

-- =============================================================================
-- Step 2: Add migration tracking table
-- =============================================================================

CREATE TABLE IF NOT EXISTS migration_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Log this migration
INSERT INTO migration_log (migration_name, notes)
VALUES (
    'remove_agent_api_keys_v1',
    'Migrating from agent API keys to frequency API key + agent name authentication'
);

-- =============================================================================
-- Step 3: Create backup tables (for safety)
-- =============================================================================

-- Backup agent_api_keys table before making changes
CREATE TABLE IF NOT EXISTS agent_api_keys_backup AS
SELECT * FROM agent_api_keys;

-- Log the backup
INSERT INTO migration_log (migration_name, notes)
VALUES (
    'backup_agent_api_keys',
    'Created backup of agent_api_keys table before migration'
);

-- =============================================================================
-- Step 4: Update existing data to ensure unique names
-- =============================================================================

-- Check for duplicate agent names within frequencies and fix them
WITH duplicate_names AS (
    SELECT
        frequency_id,
        name,
        COUNT(*) as count,
        array_agg(id ORDER BY created_at) as agent_ids
    FROM agents
    GROUP BY frequency_id, name
    HAVING COUNT(*) > 1
)
UPDATE agents
SET name = name || '_' || ROW_NUMBER() OVER (
    PARTITION BY agents.frequency_id, agents.name
    ORDER BY agents.created_at
)::text
WHERE EXISTS (
    SELECT 1 FROM duplicate_names
    WHERE duplicate_names.frequency_id = agents.frequency_id
    AND duplicate_names.name = agents.name
) AND agents.id NOT IN (
    SELECT (agent_ids)[1] FROM duplicate_names
    WHERE duplicate_names.frequency_id = agents.frequency_id
    AND duplicate_names.name = agents.name
);

-- Log duplicate name fixes
INSERT INTO migration_log (migration_name, notes)
VALUES (
    'fix_duplicate_agent_names',
    'Updated duplicate agent names within frequencies to ensure uniqueness'
);

-- =============================================================================
-- Step 5: Update application views/functions that depend on agent_api_keys
-- =============================================================================

-- Drop any views that depend on agent_api_keys (if they exist)
-- Note: Add specific view names that exist in your system here
-- DROP VIEW IF EXISTS some_view_that_uses_agent_api_keys;

-- =============================================================================
-- Step 6: Deprecate agent_api_keys table (don't drop yet for safety)
-- =============================================================================

-- Mark the table as deprecated by renaming it
-- This allows for easy rollback if needed
ALTER TABLE agent_api_keys RENAME TO agent_api_keys_deprecated;

-- Add a note about the deprecation
COMMENT ON TABLE agent_api_keys_deprecated IS
'DEPRECATED: This table is no longer used. Authentication now uses frequency API keys with agent names. Table kept for rollback purposes.';

-- Log the deprecation
INSERT INTO migration_log (migration_name, notes)
VALUES (
    'deprecate_agent_api_keys',
    'Renamed agent_api_keys to agent_api_keys_deprecated'
);

-- =============================================================================
-- Step 7: Create indexes for performance with new authentication pattern
-- =============================================================================

-- Create index on (frequency_id, name) for faster agent lookups
CREATE INDEX IF NOT EXISTS idx_agents_frequency_name
ON agents (frequency_id, name);

-- Create index on frequency auth_key for faster authentication
CREATE INDEX IF NOT EXISTS idx_frequencies_auth_key
ON frequencies (auth_key);

-- =============================================================================
-- Step 8: Update Row Level Security policies (if RLS is enabled)
-- =============================================================================

-- Note: Update RLS policies if your system uses them
-- Example of what might need updating:

-- DROP POLICY IF EXISTS agent_api_key_policy ON agents;
-- CREATE POLICY agent_name_policy ON agents
--   FOR ALL USING (
--     -- Policy logic based on frequency API key rather than agent API key
--     frequency_id IN (
--       SELECT id FROM frequencies
--       WHERE auth_key = current_setting('app.current_frequency_key', true)
--     )
--   );

-- =============================================================================
-- Step 9: Verification queries
-- =============================================================================

-- Verify all agents have unique names within their frequencies
SELECT 'Duplicate agent names check' as check_type,
CASE
    WHEN COUNT(*) = 0 THEN 'PASS - No duplicate agent names within frequencies'
    ELSE 'FAIL - ' || COUNT(*) || ' duplicate agent names found'
END as result
FROM (
    SELECT frequency_id, name, COUNT(*) as count
    FROM agents
    GROUP BY frequency_id, name
    HAVING COUNT(*) > 1
) duplicates;

-- Verify all agents have non-null names
SELECT 'Non-null agent names check' as check_type,
CASE
    WHEN COUNT(*) = 0 THEN 'PASS - All agents have names'
    ELSE 'FAIL - ' || COUNT(*) || ' agents without names'
END as result
FROM agents
WHERE name IS NULL OR name = '';

-- Count of agents and frequencies
SELECT
    'Migration summary' as check_type,
    'Total frequencies: ' || (SELECT COUNT(*) FROM frequencies) ||
    ', Total agents: ' || (SELECT COUNT(*) FROM agents) ||
    ', Deprecated API keys: ' || (SELECT COUNT(*) FROM agent_api_keys_deprecated) as result;

-- =============================================================================
-- Step 10: Final migration log entry
-- =============================================================================

INSERT INTO migration_log (migration_name, notes)
VALUES (
    'migration_completed',
    'Successfully completed migration from agent API keys to frequency API key + agent name authentication'
);

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================================================

/*
To rollback this migration if needed:

1. Restore agent_api_keys table:
   ALTER TABLE agent_api_keys_deprecated RENAME TO agent_api_keys;

2. Remove unique constraint:
   ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_frequency_id_name_unique;

3. Remove new indexes:
   DROP INDEX IF EXISTS idx_agents_frequency_name;
   DROP INDEX IF EXISTS idx_frequencies_auth_key;

4. Restore any dropped views/functions

5. Update application code back to use agent API keys

6. Log rollback:
   INSERT INTO migration_log (migration_name, notes)
   VALUES ('rollback_agent_api_keys_migration', 'Rolled back to agent API key based authentication');
*/

-- =============================================================================
-- CLEANUP INSTRUCTIONS (after confirming migration works)
-- =============================================================================

/*
After confirming the new system works properly (recommended to wait 2-4 weeks):

1. Drop the deprecated table:
   DROP TABLE IF EXISTS agent_api_keys_deprecated;

2. Drop backup table:
   DROP TABLE IF EXISTS agent_api_keys_backup;

3. Update any remaining documentation references to agent API keys
*/

COMMIT;