-- The Arabic UI uses Latin digits everywhere (owner decision 2026-11-03), so the starter
-- template catalog that seeds every new captain's copies follows the same rule.
update security_private.starter_templates
set payload = translate(payload::text, '٠١٢٣٤٥٦٧٨٩', '0123456789')::jsonb
where payload::text ~ '[٠-٩]';
