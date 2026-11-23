-- T-426: one enforced source of truth for KO secrets.
--
-- The app signs approval tokens with env KO_APPROVAL_SECRET while the DB
-- verifies them against security_private.ko_approval_config.signing_key,
-- and signs meal receipts with env KO_MEAL_RECEIPT_SECRET while the DB
-- verifies against security_private.app_secrets ('meal_receipt'). Nothing
-- seeded either side or checked they match, so a disagreement silently
-- broke every KO confirmation and skipped meal points. This function
-- proves agreement without ever revealing a secret value: the app HMACs
-- a fixed challenge with its env secret and the DB compares it with an
-- HMAC from its stored key, returning only a boolean. It lives in public
-- like the other ko RPCs: PostgREST only serves exposed schemas and
-- ko_private is deliberately not exposed (T-116), so a ko_private function
-- would be unreachable from the app and KO would fail closed everywhere.
-- Kind 'approval'
-- also covers the usage-warning proof, which is signed with the same
-- approval key (ko_usage_claim_warning).
begin;
create function public.ko_secret_check(p_kind text, p_challenge text, p_mac text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
begin
  if p_kind = 'approval' then
    select signing_key into v_secret from security_private.ko_approval_config where singleton;
  elsif p_kind = 'meal_receipt' then
    select value into v_secret from security_private.app_secrets where name = 'meal_receipt';
  else
    return false;
  end if;
  if v_secret is null or p_challenge is null or p_mac is null then
    return false;
  end if;
  return p_mac = encode(extensions.hmac(convert_to(p_challenge, 'UTF8'), convert_to(v_secret, 'UTF8'), 'sha256'), 'hex');
end;
$$;
revoke all on function public.ko_secret_check(text, text, text) from public, anon, authenticated;
grant execute on function public.ko_secret_check(text, text, text) to authenticated;
commit;
