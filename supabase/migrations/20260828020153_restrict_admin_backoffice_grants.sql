revoke all on table public.admin_users from service_role;
revoke all on table public.admin_audit_log from service_role;

grant select on table public.admin_users to service_role;
grant select, insert on table public.admin_audit_log to service_role;
