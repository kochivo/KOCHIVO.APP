create or replace function security_private.push_config() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_config jsonb;
begin
  if to_regclass('vault.decrypted_secrets') is null then return null; end if;
  execute 'select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
    where name in (''push_function_url'', ''push_hook_secret'', ''vapid_public_key'',
      ''vapid_private_key'', ''vapid_subject'', ''sentry_dsn'')' into v_config;
  return v_config;
end;
$$;
