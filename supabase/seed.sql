-- Seed script for MiBalance EC
-- Ensures base categories exist for every existing user.

do $$
declare user_row record;
begin
  for user_row in select id from auth.users loop
    perform public.create_default_categories_for_user(user_row.id);
  end loop;
end$$;

